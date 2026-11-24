import type { AreaId, Block, BlockLog, DayLog } from '../types'
import { DEFAULT_AREA_KEYS } from '../data/areas'
import { addDays, dayKey, diffDays, parseKey } from './dates'

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

/** Dias ativos entre `from` e `to` (AAAA-MM-DD, inclusive), sem passar de hoje. */
export function activeDaysBetween(logs: Logs, from: string, to: string, today = dayKey()) {
  const end = to < today ? to : today
  return pastKeys(logs, today).filter((k) => k >= from && k <= end && isActiveDay(logs[k])).length
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

/** Maior sequência de dias ativos já alcançada em todo o histórico (não a atual). */
export function bestStreak(logs: Logs, today = dayKey()) {
  const days = pastKeys(logs, today)
    .filter((k) => isActiveDay(logs[k]))
    .sort()
  let best = 0
  let run = 0
  days.forEach((k, i) => {
    run = i > 0 && diffDays(k, days[i - 1]) === 1 ? run + 1 : 1
    best = Math.max(best, run)
  })
  return best
}

/** Semanas (de domingo a sábado) com pelo menos `min` dias ativos. */
export function activeWeeks(logs: Logs, min = 5, today = dayKey()) {
  const perWeek = new Map<string, number>()
  for (const k of pastKeys(logs, today)) {
    if (!isActiveDay(logs[k])) continue
    const week = addDays(k, -parseKey(k).getDay())
    perWeek.set(week, (perWeek.get(week) ?? 0) + 1)
  }
  return [...perWeek.values()].filter((n) => n >= min).length
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

/**
 * Maior número das áreas `areaIds` com pelo menos um bloco concluído dentro de uma mesma
 * janela de 7 dias seguidos (de calendário), em todo o histórico até hoje. 0 sem áreas ou sem registros.
 */
export function bestAreasWindow(logs: Logs, areaIds: AreaId[], today = dayKey()) {
  const wanted = new Set(areaIds)
  if (wanted.size === 0) return 0
  const days = pastKeys(logs, today)
    .sort()
    .map((k) => ({ k, areas: Object.keys(summarizeDay(logs[k]).areas).filter((a) => wanted.has(a)) }))
    .filter((d) => d.areas.length > 0)
  let best = 0
  for (let i = 0; i < days.length; i++) {
    const seen = new Set<string>()
    for (let j = i; j < days.length && diffDays(days[j].k, days[i].k) < 7; j++) days[j].areas.forEach((a) => seen.add(a))
    best = Math.max(best, seen.size)
    if (best === wanted.size) break
  }
  return best
}

/**
 * Houve 7 dias seguidos (uma semana) em que cada uma das áreas da vida (`areaIds`)
 * teve pelo menos um bloco concluído? Vale qualquer janela de 7 dias do histórico.
 * Nunca é verdade sem áreas (nada de `[].every()`) nem com menos áreas que `minAreas`.
 */
export function allAreasInAWeek(logs: Logs, areaIds: AreaId[] = DEFAULT_AREA_KEYS, today = dayKey(), minAreas = 1) {
  const wanted = new Set(areaIds)
  if (wanted.size === 0 || wanted.size < minAreas) return false
  return bestAreasWindow(logs, [...wanted], today) === wanted.size
}

export interface Stats {
  activeDays: number
  currentStreak: number
  /** Maior sequência de dias ativos já alcançada. */
  bestStreak: number
  /** Semanas com pelo menos 5 dias ativos. */
  activeWeeks: number
  blocksDone: number
  daysSinceLastActive: number | null
  /** Blocos concluídos hoje. */
  doneToday: number
  // Por área (id → valor): as áreas atuais, as 8 padrão (mesmo se excluídas, para os troféus)
  // e qualquer área que apareça no histórico. Uma área pode faltar: leia com `?? 0`.
  /** Dias com bloco concluído por área, nos últimos 7. */
  areaDays7: Record<AreaId, number>
  /** Dias com bloco concluído por área, desde sempre. */
  areaDaysTotal: Record<AreaId, number>
  /** Blocos concluídos por área, desde sempre. */
  areaBlocks: Record<AreaId, number>
  /** Alguma semana com todas as áreas concluídas pelo menos uma vez. */
  allAreasWeek: boolean
}

/**
 * Todas as estatísticas de uma vez. `areaIds` = áreas atuais da pessoa
 * (a "semana com todas as áreas" usa só elas).
 */
export function computeStats(logs: Logs, today = dayKey(), areaIds: AreaId[] = DEFAULT_AREA_KEYS): Stats {
  // O histórico continua contando mesmo para áreas excluídas.
  const ids = new Set<AreaId>([...areaIds, ...DEFAULT_AREA_KEYS])
  for (const k of pastKeys(logs, today)) for (const a of Object.keys(summarizeDay(logs[k]).areas)) ids.add(a)
  const byArea = <T,>(fn: (id: AreaId) => T) => Object.fromEntries([...ids].map((id) => [id, fn(id)])) as Record<AreaId, T>
  return {
    activeDays: activeDays(logs, today),
    currentStreak: currentStreak(logs, today),
    bestStreak: bestStreak(logs, today),
    activeWeeks: activeWeeks(logs, 5, today),
    blocksDone: blocksDone(logs, today),
    daysSinceLastActive: daysSinceLastActive(logs, today),
    doneToday: summarizeDay(logs[today]).done,
    areaDays7: byArea((id) => areaDays(logs, id, 7, today)),
    areaDaysTotal: byArea((id) => areaDays(logs, id, Infinity, today)),
    areaBlocks: byArea((id) => areaBlocksDone(logs, id, today)),
    allAreasWeek: allAreasInAWeek(logs, areaIds, today),
  }
}
