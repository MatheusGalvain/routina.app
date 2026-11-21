import type { AccessoryId, Block, BlockLog, Companion, DayLog, PetProgress, PetPhase, Routine, Slot } from '../types'

/**
 * Conversão entre o store (formato do app) e as linhas das tabelas do Supabase.
 * Tudo puro: recebe dados e devolve dados.
 */

export type Table = 'profiles' | 'routines' | 'blocks' | 'day_logs' | 'block_logs' | 'completed_tasks' | 'companion'
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

/** Sem `withProgress`, só espécie, nome e acessórios (o progresso fica como está no servidor). */
export const companionRow = (uid: string, c: Companion, p: PetProgress, withProgress: boolean): Row => ({
  user_id: uid,
  kind: c.kind,
  name: clip(c.name, 24),
  equipped: c.equipped,
  ...(withProgress
    ? { peak_active_days: p.peakActiveDays, seen_phase: p.seenPhase, unlocked: p.unlocked, progress_initialized: p.initialized }
    : {}),
})

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
  profile: { timezone: string; local_import_answered: boolean; created_at: string; updated_at: string } | null
  routines: Row[]
  blocks: Row[]
  dayLogs: Row[]
  blockLogs: Row[]
  tasks: Row[]
  companion: Row | null
}

const num = (v: unknown) => (v === null || v === undefined ? undefined : Number(v))

export function toStore(r: RemoteData) {
  const byRoutine = new Map<string, Block[]>()
  for (const b of [...r.blocks].sort((a, c) => Number(a.position) - Number(c.position))) {
    const block: Block = { id: String(b.id), name: String(b.name), type: b.type as Block['type'], areaId: b.area_id as Block['areaId'] }
    if (b.minutes !== null) block.minutes = num(b.minutes)
    if (b.target !== null) block.target = num(b.target)
    if (b.unit !== null) block.unit = String(b.unit)
    if (b.step !== null) block.step = num(b.step)
    const list = byRoutine.get(String(b.routine_id)) ?? []
    list.push(block)
    byRoutine.set(String(b.routine_id), list)
  }

  const routines: Routine[] = [...r.routines]
    .sort((a, c) => Number(a.position) - Number(c.position))
    .map((x) => ({ id: String(x.id), name: String(x.name), color: String(x.color), days: (x.days as number[]).map(Number), blocks: byRoutine.get(String(x.id)) ?? [] }))

  const logs: Record<string, DayLog> = {}
  for (const d of r.dayLogs) {
    const day: DayLog = { blocks: {} }
    if (d.note !== null) day.note = String(d.note)
    if (d.plan !== null) day.plan = d.plan as DayLog['plan']
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
    ? { kind: (c.kind as Companion['kind']) ?? null, name: String(c.name ?? ''), equipped: (c.equipped as Partial<Record<Slot, AccessoryId>>) ?? {} }
    : { kind: null, name: '', equipped: {} }
  const petProgress: PetProgress = c
    ? {
        initialized: !!c.progress_initialized,
        peakActiveDays: Number(c.peak_active_days ?? 0),
        seenPhase: (c.seen_phase as PetPhase) ?? 'filhote',
        unlocked: (c.unlocked as AccessoryId[]) ?? [],
      }
    : { initialized: false, peakActiveDays: 0, seenPhase: 'filhote', unlocked: [] }

  return { routines, logs, completedTasks, companion, petProgress }
}
