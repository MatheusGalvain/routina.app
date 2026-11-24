import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { useRotina, setStorageUser, type RotinaState } from '../store/useRotina'
import { useAuth } from '../store/useAuth'
import { deviceTimeZone, setAppTimeZone } from '../lib/dates'
import type { DayLog, TodaySort } from '../types'
import { LATEST_VERSION } from '../data/changelog'
import { areaRow, toStore, type RemoteData, type Row } from './rows'
import { DEFAULT_AREAS } from '../data/areas'
import { diff } from './diff'
import { markLegacyImported, mergeLegacy, type LegacyData } from './legacy'
import { APP_KEY } from '../lib/storageKeys'
import { enqueue, flushNow, hasPending, startOutbox, stopOutbox } from './outbox'

/**
 * Sessão de dados de um usuário logado.
 *  - Ao entrar: carrega o cache deste aparelho, envia o que ficou pendente e carrega a conta do Supabase.
 *  - Enquanto usa: o Zustand continua sendo a fonte da tela; cada mudança vira gravação na fila.
 *  - Dados do painel de desenvolvimento (`dev: true`) nunca sobem.
 */

export interface Profile {
  timezone: string
  localImportAnswered: boolean
  /** Como a pessoa quer ser chamada. `null` = ainda não respondeu (o app pergunta). */
  displayName: string | null
  /** Quando a conta foi criada (ISO). */
  createdAt: string
  /** Já concluiu (ou pulou) o onboarding de primeiro acesso. */
  onboardingDone: boolean
  /** Como a lista do Hoje é ordenada. */
  todaySort: TodaySort
  /** Última versão das novidades que a pessoa viu (`null` = nenhuma). */
  lastSeenVersion: string | null
}

const SORTS: TodaySort[] = ['rotina', 'auto', 'manual']

/** Limite do nome de exibição (igual ao da tabela profiles). */
export const NAME_MAX = 30

/** Nome padrão: a parte do e-mail antes do @. */
export const nameFromEmail = (email: string | null | undefined) => (email?.split('@')[0] || 'Você').slice(0, NAME_MAX)

interface SessionState {
  status: 'idle' | 'loading' | 'ready'
  /** Está usando o cache porque não conseguiu falar com o servidor. */
  offline: boolean
  profile: Profile | null
}

export const useSession = create<SessionState>()(() => ({ status: 'idle', offline: false, profile: null }))

let currentUid: string | null = null
let unsubscribe: (() => void) | null = null
let applyingRemote = false
let lastFetch = 0

// ---------------------------------------------------------------------
// Carregar do Supabase
// ---------------------------------------------------------------------

async function fetchAll(table: string, uid: string): Promise<Row[]> {
  const out: Row[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select('*').eq('user_id', uid).range(from, from + 999)
    if (error) throw error
    out.push(...(data as Row[]))
    if (data.length < 1000) return out
  }
}

/** Lê uma tabela nova sem derrubar o resto: se ela ainda não existir no servidor, devolve null. */
async function fetchOptional(table: string, uid: string): Promise<Row[] | null> {
  try {
    return await fetchAll(table, uid)
  } catch (e) {
    console.warn(`[sync] não deu para ler ${table} (a migration foi aplicada?)`, e)
    return null
  }
}

async function loadRemote(uid: string): Promise<RemoteData> {
  const [profile, routines, blocks, dayLogs, blockLogs, tasks, companion, trophies, slots, areas, templates, sceneItems, eventItems, dayTasks, storyReads] = await Promise.all([
    // select('*'): uma coluna nova que ainda não existe no servidor não derruba o carregamento.
    supabase.from('profiles').select('*').eq('user_id', uid).maybeSingle(),
    fetchAll('routines', uid),
    fetchAll('blocks', uid),
    fetchAll('day_logs', uid),
    fetchAll('block_logs', uid),
    fetchAll('completed_tasks', uid),
    supabase.from('companion').select('*').eq('user_id', uid).maybeSingle(),
    fetchOptional('user_trophies', uid),
    fetchOptional('corner_slots', uid),
    fetchOptional('user_areas', uid),
    fetchOptional('user_templates', uid),
    fetchOptional('user_scene_items', uid),
    fetchOptional('user_event_items', uid),
    fetchOptional('day_tasks', uid),
    fetchOptional('user_story_reads', uid),
  ])
  if (profile.error) throw profile.error
  if (companion.error) throw companion.error
  return { profile: profile.data, routines, blocks, dayLogs, blockLogs, tasks, companion: companion.data, trophies, slots, areas, templates, sceneItems, eventItems, dayTasks, storyReads }
}

/** Conta sem áreas no servidor (primeiro login): grava as 8 padrão. Os ids fixos tornam isso seguro em dois aparelhos. */
function seedAreas(uid: string, remote: RemoteData) {
  if (remote.areas && remote.areas.length === 0) for (const a of DEFAULT_AREAS) enqueue('user_areas', 'upsert', areaRow(uid, a))
}

/** Troca o store pelos dados da conta, mantendo as simulações locais do painel dev. */
function applyRemote(remote: RemoteData) {
  const next = toStore(remote)
  const local = useRotina.getState()
  const logs: Record<string, DayLog> = { ...next.logs }
  for (const [date, day] of Object.entries(local.logs)) {
    if (!day.dev) continue
    const real = next.logs[date]
    logs[date] = { ...day, ...(real ? { real } : { real: undefined }) }
  }
  applyingRemote = true
  useRotina.setState({
    ...next,
    logs,
    routines: [...next.routines, ...local.routines.filter((r) => r.dev)],
    // Com simulação ativa, o progresso local segue o simulado; o da conta não é tocado.
    petProgress: Object.values(local.logs).some((d) => d.dev) ? local.petProgress : next.petProgress,
  })
  applyingRemote = false
  lastFetch = Date.now()
}

async function applyProfile(uid: string, p: RemoteData['profile']) {
  const device = deviceTimeZone()
  let timezone = p?.timezone ?? device
  // Perfil recém-criado (nunca alterado): adota o fuso deste aparelho.
  if (!p || p.created_at === p.updated_at) {
    if (timezone !== device) {
      timezone = device
      enqueue('profiles', 'upsert', { user_id: uid, timezone })
    }
  }
  setAppTimeZone(timezone)
  useSession.setState({
    profile: {
      timezone,
      localImportAnswered: !!p?.local_import_answered,
      displayName: p?.display_name?.trim() || null,
      createdAt: p?.created_at ?? new Date().toISOString(),
      // Sem a coluna (migration 007 não aplicada), não mostra o onboarding para ninguém.
      onboardingDone: p ? p.onboarding_done !== false : false,
      todaySort: SORTS.find((x) => x === p?.today_sort) ?? 'rotina',
      // Sem a coluna (migration 013 não aplicada): considera tudo visto, para o aviso não voltar a cada visita.
      lastSeenVersion: p && 'last_seen_version' in p ? (p.last_seen_version ?? null) : LATEST_VERSION,
    },
  })
}

// ---------------------------------------------------------------------
// Mudanças do store → fila de gravação
// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// Início e fim da sessão
// ---------------------------------------------------------------------

export async function startSession(uid: string) {
  currentUid = uid
  useSession.setState({ status: 'loading', offline: false, profile: null })

  // Cache deste usuário neste aparelho + gravações que ficaram pendentes.
  setStorageUser(uid)
  await useRotina.persist.rehydrate()
  startOutbox(uid)

  let offline = false
  try {
    // Primeiro sobe o que estava pendente, para não ser sobrescrito pelo servidor.
    const flushed = await flushNow()
    if (!flushed) throw new Error('pendências não enviadas')
    const remote = await loadRemote(uid)
    if (currentUid !== uid) return
    applyRemote(remote)
    seedAreas(uid, remote)
    await applyProfile(uid, remote.profile)
  } catch (e) {
    console.warn('[sync] usando o cache deste aparelho', e)
    offline = true
  }
  if (currentUid !== uid) return

  unsubscribe = useRotina.subscribe((next, prev) => {
    if (!applyingRemote && currentUid) diff(currentUid, prev, next, enqueue)
  })
  document.addEventListener('visibilitychange', refreshOnReturn)
  useSession.setState({ status: 'ready', offline })
}

export function endSession() {
  unsubscribe?.()
  unsubscribe = null
  document.removeEventListener('visibilitychange', refreshOnReturn)
  stopOutbox()
  currentUid = null
  setStorageUser(null)
  // Limpa a tela sem gravar no cache de ninguém (sem usuário, o storage ignora gravações).
  useRotina.setState(useRotina.getInitialState(), true)
  useSession.setState({ status: 'idle', offline: false, profile: null })
}

/** Recarrega da conta (descarta o que é só local, inclusive simulações do painel dev). */
export async function reloadFromServer() {
  const uid = currentUid
  if (!uid) return
  if (!(await flushNow())) return
  const remote = await loadRemote(uid)
  if (currentUid !== uid) return
  applyingRemote = true
  useRotina.setState(toStore(remote))
  applyingRemote = false
  seedAreas(uid, remote)
  lastFetch = Date.now()
  useSession.setState({ offline: false })
}

/** Ao voltar para a aba, busca o que mudou em outro aparelho (se não houver nada pendente aqui). */
async function refreshOnReturn() {
  const uid = currentUid
  if (!uid || document.visibilityState !== 'visible' || Date.now() - lastFetch < 30_000 || hasPending()) return
  try {
    const remote = await loadRemote(uid)
    if (currentUid !== uid || hasPending()) return
    applyRemote(remote)
    seedAreas(uid, remote)
    useSession.setState({ offline: false })
  } catch {
    /* sem conexão: segue com o que tem */
  }
}

/** Atualiza o nome de exibição (otimista: a tela muda já e a gravação vai para a fila). Vazio = parte do e-mail. */
export function setDisplayName(name: string) {
  if (!currentUid) return
  const display_name = name.trim().slice(0, NAME_MAX) || nameFromEmail(useAuth.getState().session?.user.email)
  enqueue('profiles', 'upsert', { user_id: currentUid, display_name })
  useSession.setState((s) => ({ profile: s.profile ? { ...s.profile, displayName: display_name } : s.profile }))
}

/** Marca o onboarding como concluído (ou pulado): não aparece de novo em nenhum aparelho. */
export function setOnboardingDone() {
  if (!currentUid) return
  enqueue('profiles', 'upsert', { user_id: currentUid, onboarding_done: true })
  useSession.setState((s) => ({ profile: s.profile ? { ...s.profile, onboardingDone: true } : s.profile }))
  // Conta nova: as novidades antigas não fazem sentido (tudo já é novo).
  if (useSession.getState().profile?.lastSeenVersion === null) setLastSeenVersion(LATEST_VERSION)
}

/** Ordem da lista do Hoje (preferência do perfil, vale em todos os aparelhos). */
export function setTodaySort(today_sort: TodaySort) {
  if (!currentUid) return
  enqueue('profiles', 'upsert', { user_id: currentUid, today_sort })
  useSession.setState((s) => ({ profile: s.profile ? { ...s.profile, todaySort: today_sort } : s.profile }))
}

/** Guarda a última versão das novidades que a pessoa viu. */
export function setLastSeenVersion(last_seen_version: string) {
  if (!currentUid) return
  enqueue('profiles', 'upsert', { user_id: currentUid, last_seen_version })
  useSession.setState((s) => ({ profile: s.profile ? { ...s.profile, lastSeenVersion: last_seen_version } : s.profile }))
}

/** Atualiza o fuso do perfil. */
export function setProfileTimezone(timezone: string) {
  if (!currentUid) return
  setAppTimeZone(timezone)
  enqueue('profiles', 'upsert', { user_id: currentUid, timezone })
  useSession.setState((s) => ({ profile: s.profile ? { ...s.profile, timezone } : s.profile }))
}

// Liga a sessão de dados ao login.
let sessionUid: string | null = null
useAuth.subscribe((s) => {
  const uid = s.session?.user.id ?? null
  if (uid === sessionUid) return
  if (sessionUid) endSession()
  sessionUid = uid
  if (uid) void startSession(uid)
})

// ---------------------------------------------------------------------
// Dados antigos deste aparelho (etapa 4)
// ---------------------------------------------------------------------

/** Registra na conta que a pergunta já foi respondida (não pergunta de novo em nenhum aparelho). */
export function answerLocalImport() {
  if (!currentUid) return
  enqueue('profiles', 'upsert', { user_id: currentUid, local_import_answered: true })
  useSession.setState((s) => ({ profile: s.profile ? { ...s.profile, localImportAnswered: true } : s.profile }))
}

/**
 * Leva os dados antigos para a conta: junta com o que já existe (a conta vence nos conflitos)
 * e a sincronização normal envia tudo. Devolve true se já subiu tudo.
 */
export async function importLegacy(data: LegacyData) {
  const uid = currentUid
  if (!uid) return false
  const s = useRotina.getState()
  const merged = mergeLegacy({ routines: s.routines, logs: s.logs, completedTasks: s.completedTasks, companion: s.companion, petProgress: s.petProgress }, data)
  useRotina.setState(merged) // a assinatura do store transforma isso em gravações
  markLegacyImported(uid)
  answerLocalImport()
  return flushNow()
}

// ---------------------------------------------------------------------
// Privacidade (etapa 5)
// ---------------------------------------------------------------------

/** Tudo o que a conta guarda, em JSON, para a pessoa baixar. */
export async function exportMyData() {
  const uid = currentUid
  if (!uid) throw new Error('sem sessão')
  await flushNow()
  const remote = await loadRemote(uid)
  const email = useAuth.getState().session?.user.email ?? null
  const strip = (rows: Row[]) => rows.map(({ user_id: _u, ...rest }) => rest)
  const data = {
    exportado_em: new Date().toISOString(),
    app: 'Habbit Do',
    conta: { email, ...(remote.profile ? strip([remote.profile as Row])[0] : {}) },
    rotinas: strip(remote.routines),
    blocos: strip(remote.blocks),
    dias: strip(remote.dayLogs),
    registros_dos_blocos: strip(remote.blockLogs),
    tarefas_concluidas: strip(remote.tasks),
    pet: remote.companion ? strip([remote.companion])[0] : null,
    trofeus: remote.trophies ? strip(remote.trophies) : [],
    cantinho: remote.slots ? strip(remote.slots) : [],
    itens_de_cenario: remote.sceneItems ? strip(remote.sceneItems) : [],
    itens_de_eventos: remote.eventItems ? strip(remote.eventItems) : [],
    sessoes_de_foco: strip((await fetchOptional('focus_sessions', uid)) ?? []),
    areas_da_vida: remote.areas ? strip(remote.areas) : [],
    modelos_de_rotina: remote.templates ? strip(remote.templates) : [],
    tarefas_avulsas: remote.dayTasks ? strip(remote.dayTasks) : [],
    historias_lidas: remote.storyReads ? strip(remote.storyReads) : [],
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `habbit-do-meus-dados-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
}

/**
 * Exclui a conta e todos os dados pela Edge Function `delete-account`
 * (a chave de serviço fica só no servidor). Depois limpa o cache deste aparelho.
 */
export async function deleteAccount() {
  const uid = currentUid
  if (!uid) throw new Error('sem sessão')
  const { error } = await supabase.functions.invoke('delete-account', { body: { confirm: 'EXCLUIR' } })
  if (error) throw error
  endSession()
  for (const key of [`${APP_KEY}:${uid}`, `${APP_KEY}-outbox:${uid}`]) localStorage.removeItem(key)
  await supabase.auth.signOut({ scope: 'local' })
}
