import type { AccessoryId, Area, Block, UserTemplate, BlockLog, Companion, CornerLayout, CornerLayouts, DayLog, EventItemMap, PetProgress, PetPhase, Placed, Routine, SceneItemMap, Slot, TrophyMap, UnlockId } from '../types'
import { TROPHY_BY_ID, type TrophyId, type TrophyTier } from '../data/trophies'
import { EMPTY_LAYOUTS } from '../lib/corner'
import { DEFAULT_SCENE, isItemId, isSceneId, type SceneId } from '../data/scenes'
import { AREA_NAME_MAX, DEFAULT_AREAS, normalizeAreas, pastelArea, pastelRoutine } from '../data/areas'

/**
 * Conversão entre o store (formato do app) e as linhas das tabelas do Supabase.
 * Tudo puro: recebe dados e devolve dados.
 */

export type Table =
  | 'profiles'
  | 'routines'
  | 'blocks'
  | 'day_logs'
  | 'block_logs'
  | 'completed_tasks'
  | 'companion'
  | 'user_trophies'
  | 'corner_slots'
  | 'user_areas'
  | 'user_templates'
  | 'user_scene_items'
  | 'user_event_items'
export type Row = Record<string, unknown>

const clip = (s: string | undefined | null, max: number) => (s ?? '').slice(0, max)
const positive = (n: number | undefined) => (typeof n === 'number' && n > 0 ? n : null)

export const routineRow = (uid: string, r: Routine, position: number): Row => ({
  id: r.id,
  user_id: uid,
  name: clip(r.name.trim(), 120) || 'Sem nome',
  color: r.color,
  days: r.days,
  position,
})

export const blockRow = (uid: string, routineId: string, b: Block, position: number): Row => ({
  id: b.id,
  user_id: uid,
  routine_id: routineId,
  name: clip(b.name.trim(), 200) || 'Sem nome',
  type: b.type,
  area_id: b.areaId,
  minutes: typeof b.minutes === 'number' ? Math.min(1440, Math.max(0, Math.round(b.minutes))) : null,
  target: positive(b.target),
  unit: b.unit ? clip(b.unit, 40) : null,
  step: positive(b.step),
  position,
})

export const dayRow = (uid: string, date: string, d: DayLog): Row => ({
  user_id: uid,
  date,
  note: d.note ? clip(d.note, 10000) : null,
  plan: d.plan ?? null,
})

export const blockLogRow = (uid: string, date: string, blockId: string, l: BlockLog): Row => ({
  user_id: uid,
  date,
  block_id: blockId,
  done: !!l.done,
  skipped: !!l.skipped,
  value: typeof l.value === 'number' ? Math.max(0, l.value) : null,
  area_id: l.areaId ?? null,
  type: l.type ?? null,
})

export const taskRow = (uid: string, blockId: string, date: string): Row => ({ user_id: uid, block_id: blockId, date })

/**
 * Sem `withProgress`, só espécie, nome, acessórios e aparência (o progresso fica como está no servidor).
 * `withLook`: inclui aparência e detalhe de adulto (colunas da migration 010). Só vai quando a pessoa
 * mexeu nisso, para quem ainda não rodou a migration não perder a gravação do resto do pet.
 */
export const companionRow = (uid: string, c: Companion, p: PetProgress, withProgress: boolean, withLook = true): Row => ({
  user_id: uid,
  kind: c.kind,
  name: clip(c.name, 24),
  equipped: c.equipped,
  ...(withLook ? { appearance: c.appearance, show_adult_detail: c.showAdultDetail } : {}),
  ...(withProgress
    ? { peak_active_days: p.peakActiveDays, seen_phase: p.seenPhase, unlocked: p.unlocked, progress_initialized: p.initialized }
    : {}),
})

/** Um registro por nível de troféu conquistado, com a chave "id|nível". */
export function trophyRows(uid: string, map: TrophyMap) {
  const out = new Map<string, Row>()
  for (const [id, list] of Object.entries(map)) {
    for (const u of list ?? []) out.set(`${id}|${u.tier}`, { user_id: uid, trophy_id: id, tier: u.tier, unlocked_at: u.unlockedAt })
  }
  return out
}

export const areaRow = (uid: string, a: Area): Row => ({
  user_id: uid,
  id: a.id,
  name: clip(a.name.trim(), AREA_NAME_MAX) || 'Sem nome',
  color: a.color,
  icon: a.icon ?? null,
  position: a.position,
  is_default: a.isDefault,
})

/** Bloco de um modelo, como vai no jsonb (mesmos limites da tabela blocks). */
const templateBlock = (b: Block): Row => {
  const { routine_id: _r, user_id: _u, position: _p, ...rest } = blockRow('', '', b, 0)
  return rest
}

export const templateRow = (uid: string, t: UserTemplate, position: number): Row => ({
  id: t.id,
  user_id: uid,
  name: clip(t.name.trim(), 120) || 'Sem nome',
  color: t.color,
  days: t.days,
  blocks: t.blocks.slice(0, 100).map(templateBlock),
  position,
})

export const templateRows = (uid: string, templates: UserTemplate[]) => new Map(templates.map((t, i) => [t.id, templateRow(uid, t, i)]))

/** Uma linha por área, com o id como chave. */
export const areaRows = (uid: string, areas: Area[]) => new Map(areas.map((a) => [a.id, areaRow(uid, a)]))

/** Um espaço do cantinho de um cenário: troféu (id + nível) ou item. */
export const slotRow = (uid: string, scene: SceneId, slot: number, p: Placed): Row => ({
  user_id: uid,
  scene_id: scene,
  slot,
  trophy_id: p.kind === 'trophy' ? p.id : null,
  tier: p.kind === 'trophy' ? p.tier : null,
  item_id: p.kind === 'item' ? p.id : null,
})

/** Um registro por item de cenário desbloqueado. */
export function sceneItemRows(uid: string, map: SceneItemMap) {
  const out = new Map<string, Row>()
  for (const [id, u] of Object.entries(map)) if (u) out.set(id, { user_id: uid, item_id: id, unlocked_at: u.unlockedAt })
  return out
}

/** Um registro por item de evento conquistado (chave: evento/item). */
export function eventItemRows(uid: string, map: EventItemMap) {
  const out = new Map<string, Row>()
  for (const [eventId, items] of Object.entries(map))
    for (const [itemId, at] of Object.entries(items ?? {}))
      out.set(`${eventId}/${itemId}`, { user_id: uid, event_id: eventId, item_id: itemId, kind: itemId.startsWith('evt-') ? 'accessory' : 'trophy', unlocked_at: at })
  return out
}

/** Rotinas e blocos (com a ordem) a partir do store. Rotinas do painel dev ficam de fora. */
export function structureRows(uid: string, routines: Routine[]) {
  const routinesOut = new Map<string, Row>()
  const blocksOut = new Map<string, Row>()
  routines
    .filter((r) => !r.dev)
    .forEach((r, i) => {
      routinesOut.set(r.id, routineRow(uid, r, i))
      r.blocks.forEach((b, j) => blocksOut.set(b.id, blockRow(uid, r.id, b, j)))
    })
  return { routines: routinesOut, blocks: blocksOut }
}

// ---------------------------------------------------------------------
// Do Supabase para o store
// ---------------------------------------------------------------------

export interface RemoteData {
  profile: {
    timezone: string
    local_import_answered: boolean
    display_name: string | null
    /** Falta se a migration 007 não foi aplicada. */
    onboarding_done?: boolean
    /** Falta se a migration 009 não foi aplicada. */
    scene?: string | null
    created_at: string
    updated_at: string
  } | null
  routines: Row[]
  blocks: Row[]
  dayLogs: Row[]
  blockLogs: Row[]
  tasks: Row[]
  companion: Row | null
  /** `null` = não deu para ler (ex.: migration 003 ainda não aplicada): o store mantém o que tem. */
  trophies: Row[] | null
  slots: Row[] | null
  /** `null` = não deu para ler (migration 005 não aplicada). Lista vazia = conta nova (recebe as 8 padrão). */
  areas: Row[] | null
  /** `null` = não deu para ler (migration 006 não aplicada): o store mantém o que tem. */
  templates: Row[] | null
  /** `null` = não deu para ler (migration 009 não aplicada): o store mantém o que tem. */
  sceneItems: Row[] | null
  /** `null` = não deu para ler (migration 011 não aplicada): o store mantém o que tem. */
  eventItems: Row[] | null
}

const num = (v: unknown) => (v === null || v === undefined ? undefined : Number(v))

/** Linha de bloco (tabela blocks ou jsonb de um modelo) → bloco do app. */
function blockFromRow(b: Row): Block {
  const block: Block = { id: String(b.id), name: String(b.name), type: b.type as Block['type'], areaId: b.area_id as Block['areaId'] }
  if (b.minutes != null) block.minutes = num(b.minutes)
  if (b.target != null) block.target = num(b.target)
  if (b.unit != null) block.unit = String(b.unit)
  if (b.step != null) block.step = num(b.step)
  return block
}

export function toStore(r: RemoteData) {
  const byRoutine = new Map<string, Block[]>()
  for (const b of [...r.blocks].sort((a, c) => Number(a.position) - Number(c.position))) {
    const block = blockFromRow(b)
    const list = byRoutine.get(String(b.routine_id)) ?? []
    list.push(block)
    byRoutine.set(String(b.routine_id), list)
  }

  const routines: Routine[] = [...r.routines]
    .sort((a, c) => Number(a.position) - Number(c.position))
    .map((x) => ({ id: String(x.id), name: String(x.name), color: pastelRoutine(String(x.color)), days: (x.days as number[]).map(Number), blocks: byRoutine.get(String(x.id)) ?? [] }))

  const logs: Record<string, DayLog> = {}
  for (const d of r.dayLogs) {
    const day: DayLog = { blocks: {} }
    if (d.note !== null) day.note = String(d.note)
    if (d.plan !== null)
      day.plan = (d.plan as NonNullable<DayLog['plan']>).map((p) => ({ ...p, routine: { ...p.routine, color: pastelRoutine(p.routine.color) } }))
    logs[String(d.date)] = day
  }
  for (const l of r.blockLogs) {
    const day = (logs[String(l.date)] ??= { blocks: {} })
    const log: BlockLog = {}
    if (l.done) log.done = true
    if (l.skipped) log.skipped = true
    if (l.value !== null) log.value = num(l.value)
    if (l.area_id !== null) log.areaId = l.area_id as BlockLog['areaId']
    if (l.type !== null) log.type = l.type as BlockLog['type']
    day.blocks[String(l.block_id)] = log
  }

  const completedTasks: Record<string, string> = {}
  for (const t of r.tasks) completedTasks[String(t.block_id)] = String(t.date)

  const c = r.companion
  const companion: Companion = c
    ? {
        kind: (c.kind as Companion['kind']) ?? null,
        name: String(c.name ?? ''),
        equipped: (c.equipped as Partial<Record<Slot, AccessoryId>>) ?? {},
        // Sem as colunas (migration 010 não aplicada): segue a fase e mostra o detalhe.
        appearance: (['auto', 'filhote', 'jovem', 'adulto'] as const).find((a) => a === c.appearance) ?? 'auto',
        showAdultDetail: c.show_adult_detail !== false,
      }
    : { kind: null, name: '', equipped: {}, appearance: 'auto', showAdultDetail: true }
  const petProgress: PetProgress = c
    ? {
        initialized: !!c.progress_initialized,
        peakActiveDays: Number(c.peak_active_days ?? 0),
        seenPhase: (c.seen_phase as PetPhase) ?? 'filhote',
        unlocked: (c.unlocked as UnlockId[]) ?? [],
      }
    : { initialized: false, peakActiveDays: 0, seenPhase: 'filhote', unlocked: [] }

  // Troféus de ids que o app não conhece mais são ignorados.
  const extra: { trophies?: TrophyMap; cornerLayouts?: CornerLayouts; areas?: Area[]; templates?: UserTemplate[]; sceneItems?: SceneItemMap; eventItems?: EventItemMap; scene?: SceneId } = {}
  if (r.templates) {
    extra.templates = [...r.templates]
      .sort((a, c) => Number(a.position) - Number(c.position))
      .map((t) => ({
        id: String(t.id),
        name: String(t.name),
        color: pastelRoutine(String(t.color)),
        days: (t.days as number[]).map(Number),
        blocks: ((t.blocks as Row[] | null) ?? []).map(blockFromRow),
      }))
  }
  if (r.areas) {
    extra.areas = r.areas.length
      ? normalizeAreas(
          r.areas.map((a) => ({
            id: String(a.id),
            name: String(a.name),
            color: pastelArea(String(a.color)),
            ...(a.icon ? { icon: String(a.icon) } : {}),
            position: Number(a.position),
            isDefault: !!a.is_default,
          })),
        )
      : DEFAULT_AREAS
  }
  if (r.trophies) {
    const trophies: TrophyMap = {}
    for (const t of r.trophies) {
      const id = String(t.trophy_id) as TrophyId
      if (!TROPHY_BY_ID[id]) continue
      trophies[id] = [...(trophies[id] ?? []), { tier: Number(t.tier) as TrophyTier, unlockedAt: String(t.unlocked_at) }].sort((a, b) => a.tier - b.tier)
    }
    extra.trophies = trophies
  }
  if (r.slots) {
    // Sem a coluna scene_id (migration 009 não aplicada), tudo é do Cosmos (o cenário padrão).
    const layouts: CornerLayouts = { cosmos: [...EMPTY_LAYOUTS.cosmos] as CornerLayout, floresta: [...EMPTY_LAYOUTS.floresta] as CornerLayout }
    for (const s of r.slots) {
      const scene: SceneId = isSceneId(s.scene_id) ? s.scene_id : DEFAULT_SCENE
      const i = Number(s.slot)
      if (!(i >= 0 && i < 4)) continue
      const trophy = s.trophy_id ? (String(s.trophy_id) as TrophyId) : null
      if (trophy && TROPHY_BY_ID[trophy] && s.tier != null) layouts[scene][i] = { kind: 'trophy', id: trophy, tier: Number(s.tier) as TrophyTier }
      else if (isItemId(s.item_id)) layouts[scene][i] = { kind: 'item', id: s.item_id }
    }
    extra.cornerLayouts = layouts
  }
  if (r.sceneItems) {
    const items: SceneItemMap = {}
    for (const it of r.sceneItems) if (isItemId(it.item_id)) items[it.item_id] = { unlockedAt: String(it.unlocked_at) }
    extra.sceneItems = items
  }
  if (r.eventItems) {
    // Itens de eventos que o app não conhece mais também ficam (são da pessoa).
    const events: EventItemMap = {}
    for (const it of r.eventItems) {
      const e = String(it.event_id)
      events[e] = { ...events[e], [String(it.item_id)]: String(it.unlocked_at) }
    }
    extra.eventItems = events
  }
  if (r.profile && isSceneId(r.profile.scene)) extra.scene = r.profile.scene

  return { routines, logs, completedTasks, companion, petProgress, ...extra }
}
