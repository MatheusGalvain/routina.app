import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Row, Table } from './rows'
import { APP_KEY } from '../lib/storageKeys'

/**
 * Fila de gravações no Supabase (atualização otimista).
 * A tela já mudou; aqui as mudanças esperam para subir. Cada linha tem uma chave,
 * e a última mudança da mesma linha substitui a anterior. A fila fica salva no
 * aparelho (por usuário), então nada se perde se a conexão cair ou o app fechar.
 */

type Op = { table: Table; kind: 'upsert' | 'delete'; row: Row; v: number }

/** Colunas que identificam a linha (além de user_id). */
const PK: Record<Table, string[]> = {
  profiles: [],
  routines: ['id'],
  blocks: ['id'],
  day_logs: ['date'],
  block_logs: ['date', 'block_id'],
  completed_tasks: ['block_id'],
  companion: [],
  user_trophies: ['trophy_id', 'tier'],
  corner_slots: ['scene_id', 'slot'],
  user_areas: ['id'],
  user_templates: ['id'],
  user_scene_items: ['item_id'],
  user_event_items: ['event_id', 'item_id'],
}
const CONFLICT: Record<Table, string> = {
  profiles: 'user_id',
  routines: 'id',
  blocks: 'id',
  day_logs: 'user_id,date',
  block_logs: 'user_id,date,block_id',
  completed_tasks: 'user_id,block_id',
  companion: 'user_id',
  user_trophies: 'user_id,trophy_id,tier',
  corner_slots: 'user_id,scene_id,slot',
  user_areas: 'user_id,id',
  user_templates: 'user_id,id',
  user_scene_items: 'user_id,item_id',
  user_event_items: 'user_id,event_id,item_id',
}
// Pais antes dos filhos ao gravar; filhos antes dos pais ao apagar.
const UPSERT_ORDER: Table[] = ['profiles', 'user_areas', 'routines', 'blocks', 'day_logs', 'block_logs', 'completed_tasks', 'companion', 'user_trophies', 'user_scene_items', 'user_event_items', 'corner_slots', 'user_templates']
const DELETE_ORDER: Table[] = ['block_logs', 'completed_tasks', 'blocks', 'day_logs', 'routines', 'corner_slots', 'user_trophies', 'user_scene_items', 'user_event_items', 'user_areas', 'user_templates']

const DEBOUNCE_MS = 600
const BACKOFF_S = [2, 5, 10, 20, 30]

export type SyncState = 'ok' | 'saving' | 'retrying'

interface SyncStatus {
  state: SyncState
  pending: number
  /** Quando será a próxima tentativa (ms desde 1970), se estiver esperando. */
  retryAt: number | null
  /** Quantas mudanças o servidor recusou (dado inválido) e foram descartadas. */
  dropped: number
}

export const useSyncStatus = create<SyncStatus>()(() => ({ state: 'ok', pending: 0, retryAt: null, dropped: 0 }))

let uid: string | null = null
const ops = new Map<string, Op>()
let version = 0
let timer: number | undefined
let flushing: Promise<boolean> | null = null
let attempt = 0

const storageKey = () => `${APP_KEY}-outbox:${uid}`

function save() {
  if (!uid) return
  try {
    if (ops.size) localStorage.setItem(storageKey(), JSON.stringify([...ops.entries()]))
    else localStorage.removeItem(storageKey())
  } catch {
    /* cache cheio ou indisponível: a fila continua em memória */
  }
  useSyncStatus.setState({ pending: ops.size })
}

/** Começa a fila de um usuário, recuperando o que ficou pendente da última vez. */
export function startOutbox(userId: string) {
  uid = userId
  ops.clear()
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey()) ?? '[]') as [string, Op][]
    for (const [k, op] of saved) ops.set(k, { ...op, v: ++version })
  } catch {
    /* fila corrompida: começa vazia */
  }
  attempt = 0
  useSyncStatus.setState({ state: 'ok', pending: ops.size, retryAt: null, dropped: 0 })
  window.addEventListener('online', onOnline)
  document.addEventListener('visibilitychange', onHide)
}

export function stopOutbox() {
  window.clearTimeout(timer)
  window.removeEventListener('online', onOnline)
  document.removeEventListener('visibilitychange', onHide)
  uid = null
  ops.clear()
  useSyncStatus.setState({ state: 'ok', pending: 0, retryAt: null, dropped: 0 })
}

const onOnline = () => void flushNow()
// Ao sair da aba ou fechar o app no celular, tenta mandar o que falta.
const onHide = () => document.visibilityState === 'hidden' && void flushNow()

export function enqueue(table: Table, kind: 'upsert' | 'delete', row: Row) {
  if (!uid) return
  const key = `${table}:${PK[table].map((k) => row[k]).join('|')}`
  // Gravação parcial da mesma linha (ex.: nome e depois fuso no perfil): junta com a pendente,
  // para a segunda não apagar a primeira.
  const prev = ops.get(key)
  const merged = kind === 'upsert' && prev?.kind === 'upsert' ? { ...prev.row, ...row } : row
  ops.set(key, { table, kind, row: { ...merged, user_id: uid }, v: ++version })
  save()
  schedule(DEBOUNCE_MS)
}

function schedule(ms: number) {
  window.clearTimeout(timer)
  timer = window.setTimeout(() => void flushNow(), ms)
}

export const hasPending = () => ops.size > 0

/** Erro do próprio dado (não adianta tentar de novo): violação de regra, tipo inválido, permissão. */
// PGRST205 = tabela inexistente (migration não aplicada): descarta em vez de travar a fila inteira.
const isDataError = (code?: string) => !!code && (/^(22|23|42)/.test(code) || code === 'PGRST204' || code === 'PGRST205')

type SupaError = { code?: string; message: string } | null

async function send(table: Table, kind: 'upsert' | 'delete', rows: Row[]): Promise<SupaError> {
  if (kind === 'upsert') {
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabase.from(table).upsert(rows.slice(i, i + 500), { onConflict: CONFLICT[table] })
      if (error) return error
    }
    return null
  }
  // Apagar: agrupa pelo que identifica a linha.
  if (table === 'block_logs') {
    const byDate = new Map<string, string[]>()
    for (const r of rows) byDate.set(String(r.date), [...(byDate.get(String(r.date)) ?? []), String(r.block_id)])
    for (const [date, ids] of byDate) {
      const { error } = await supabase.from(table).delete().eq('user_id', uid!).eq('date', date).in('block_id', ids)
      if (error) return error
    }
    return null
  }
  // Espaço do cantinho: cenário + número do espaço.
  if (table === 'corner_slots') {
    for (const r of rows) {
      const { error } = await supabase.from(table).delete().eq('user_id', uid!).eq('scene_id', String(r.scene_id)).eq('slot', Number(r.slot))
      if (error) return error
    }
    return null
  }
  if (table === 'user_trophies') {
    for (const r of rows) {
      const { error } = await supabase.from(table).delete().eq('user_id', uid!).eq('trophy_id', String(r.trophy_id)).eq('tier', Number(r.tier))
      if (error) return error
    }
    return null
  }
  const col = table === 'day_logs' ? 'date' : table === 'completed_tasks' ? 'block_id' : table === 'user_scene_items' ? 'item_id' : 'id'
  const { error } = await supabase.from(table).delete().eq('user_id', uid!).in(col, rows.map((r) => String(r[col])))
  return error
}

/** Envia um grupo; se o servidor recusar algum dado, tenta um por um e descarta só o recusado. */
async function sendGroup(table: Table, kind: 'upsert' | 'delete', items: [string, Op][]) {
  const error = await send(table, kind, items.map(([, o]) => o.row))
  if (!error) return
  if (!isDataError(error.code)) throw error
  for (const [key, op] of items) {
    const e = await send(table, kind, [op.row])
    if (!e) continue
    if (!isDataError(e.code)) throw e
    console.warn('[sync] mudança recusada pelo servidor e descartada', table, e.message, op.row)
    if (ops.get(key)?.v === op.v) ops.delete(key)
    useSyncStatus.setState((s) => ({ dropped: s.dropped + 1 }))
  }
}

/** Envia tudo o que está pendente. Devolve true se a fila ficou vazia. */
export function flushNow(): Promise<boolean> {
  if (flushing) return flushing
  if (!uid || ops.size === 0) return Promise.resolve(ops.size === 0)
  window.clearTimeout(timer)
  flushing = (async () => {
    const batch = [...ops.entries()]
    useSyncStatus.setState({ state: 'saving', retryAt: null })
    try {
      for (const t of UPSERT_ORDER) {
        const items = batch.filter(([, o]) => o.table === t && o.kind === 'upsert')
        if (items.length) await sendGroup(t, 'upsert', items)
      }
      for (const t of DELETE_ORDER) {
        const items = batch.filter(([, o]) => o.table === t && o.kind === 'delete')
        if (items.length) await sendGroup(t, 'delete', items)
      }
      // Tira da fila só o que não mudou durante o envio.
      for (const [k, o] of batch) if (ops.get(k)?.v === o.v) ops.delete(k)
      attempt = 0
      save()
      useSyncStatus.setState({ state: 'ok', retryAt: null })
      if (ops.size) schedule(DEBOUNCE_MS)
      return ops.size === 0
    } catch (e) {
      console.warn('[sync] falha ao salvar, tentando de novo', e)
      const wait = BACKOFF_S[Math.min(attempt, BACKOFF_S.length - 1)] * 1000
      attempt++
      useSyncStatus.setState({ state: 'retrying', retryAt: Date.now() + wait })
      schedule(wait)
      return false
    } finally {
      flushing = null
    }
  })()
  return flushing
}
