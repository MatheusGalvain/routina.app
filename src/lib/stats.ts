import type { AreaId, Block, BlockLog, DayLog } from '../types'
import { AREAS } from '../data/areas'
import { addDays, dayKey, diffDays } from './dates'

/**
 * Estatísticas do companheiro. Todas as funções são puras: recebem `logs`
 * (e a chave de hoje, para dar para testar com qualquer data) e não leem o store.
 */

export type Logs = Record<string, DayLog>

export interface DaySummary {
  /** Blocos do dia (lista congelada; sem ela, os blocos registrados). */
  total: number
  done: number
  /** Blocos concluídos por área. */
  areas: Partial<Record<AreaId, number>>
}

/** Um registro conta como concluído? Com a lista congelada, a meta do contador vem dela. */
function entryDone(log: BlockLog, planBlock?: Block) {
  if (planBlock?.type === 'contador') return (log.value ?? 0) >= (planBlock.target ?? 1)
  return !!log.done
}

export function summarizeDay(day: DayLog | undefined): DaySummary {
  const res: DaySummary = { total: 0, done: 0, areas: {} }
  if (!day) return res

  const planById = new Map<string, Block>((day.plan ?? []).map((p) => [p.block.id, p.block]))
  const ids = new Set(planById.keys())
  for (const [id, log] of Object.entries(day.blocks)) {
    // Sem lista congelada, os registros são a lista. Com ela, só somamos registros concluídos fora dela.
    if (planById.size === 0 || entryDone(log)) ids.add(id)
  }

  for (const id of ids) {
    const log = day.blocks[id] ?? {}
    const planBlock = planById.get(id)
    res.total++
    if (!entryDone(log, planBlock)) continue
    res.done++
    const area = log.areaId ?? planBlock?.areaId
    if (area) res.areas[area] = (res.areas[area] ?? 0) + 1
  }
  return res
}

/** Dia ativo: pelo menos 50% dos blocos do dia concluídos. */
export function isActiveDay(day: DayLog | undefined) {
  const s = summarizeDay(day)
  return s.total > 0 && s.done * 2 >= s.total
}

/** Chaves de dias até hoje (ignora registros no futuro). */
const pastKeys = (logs: Logs, today: string) => Object.keys(logs).filter((k) => k <= today)

/** Total de dias ativos. */
export function activeDays(logs: Logs, today = dayKey()) {
  return pastKeys(logs, today).filter((k) => isActiveDay(logs[k])).length
}

/**
 * Dias ativos seguidos até hoje. Se hoje ainda não está ativo, a sequência
 * conta até ontem (o dia ainda não acabou, então não quebra).
 */
export function currentStreak(logs: Logs, today = dayKey()) {
  let d = isActiveDay(logs[today]) ? today : addDays(today, -1)
  let n = 0
  while (isActiveDay(logs[d])) {
    n++
    d = addDays(d, -1)
  }
  return n
}

/** Total de blocos concluídos. */
export function blocksDone(logs: Logs, today = dayKey()) {
  return pastKeys(logs, today).reduce((sum, k) => sum + summarizeDay(logs[k]).done, 0)
}

/** Total de blocos concluídos numa área. */
export function areaBlocksDone(logs: Logs, areaId: AreaId, today = dayKey()) {
  return pastKeys(logs, today).reduce((sum, k) => sum + (summarizeDay(logs[k]).areas[areaId] ?? 0), 0)
}

/** Em quantos dos últimos N dias (contando hoje) houve bloco concluído na área. `Infinity` = desde sempre. */
export function areaDays(logs: Logs, areaId: AreaId, nDays: number, today = dayKey()) {
  return pastKeys(logs, today).filter((k) => diffDays(today, k) < nDays && (summarizeDay(logs[k]).areas[areaId] ?? 0) > 0).length
}

/** Dias desde o último dia ativo (0 = hoje está ativo). `null` se nunca houve dia ativo. */
export function daysSinceLastActive(logs: Logs, today = dayKey()) {
  const last = pastKeys(logs, today)
    .filter((k) => isActiveDay(logs[k]))
    .sort()
    .pop()
  return last ? diffDays(today, last) : null
}

export interface Stats {
  activeDays: number
  currentStreak: number
  blocksDone: number
  daysSinceLastActive: number | null
  /** Blocos concluídos hoje. */
  doneToday: number
  /** Dias com bloco concluído por área, nos últimos 7. */
  areaDays7: Record<AreaId, number>
  /** Dias com bloco concluído por área, desde sempre. */
  areaDaysTotal: Record<AreaId, number>
  /** Blocos concluídos por área, desde sempre. */
  areaBlocks: Record<AreaId, number>
}

/** Todas as estatísticas de uma vez. */
export function computeStats(logs: Logs, today = dayKey()): Stats {
  const byArea = <T,>(fn: (id: AreaId) => T) => Object.fromEntries(AREAS.map((a) => [a.id, fn(a.id)])) as Record<AreaId, T>
  return {
    activeDays: activeDays(logs, today),
    currentStreak: currentStreak(logs, today),
    blocksDone: blocksDone(logs, today),
    daysSinceLastActive: daysSinceLastActive(logs, today),
    doneToday: summarizeDay(logs[today]).done,
    areaDays7: byArea((id) => areaDays(logs, id, 7, today)),
    areaDaysTotal: byArea((id) => areaDays(logs, id, Infinity, today)),
    areaBlocks: byArea((id) => areaBlocksDone(logs, id, today)),
  }
}
