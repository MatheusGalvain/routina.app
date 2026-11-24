import { nowInTz, parseKey } from './dates'
import type { Block, BlockLog, DayLog, DayTask, PetState, PlanEntry, Routine, TodayItem, TodaySort } from '../types'

/** Grupo das tarefas avulsas na lista do dia (e no histórico). */
export const AVULSAS = { id: 'avulsas', name: 'Avulsas', color: '#CDB8FF' } as const

/** Tarefa avulsa no formato de bloco (para marcar, pular e entrar nas estatísticas como os outros). */
export const dayTaskBlock = (t: DayTask): Block => ({ id: t.id, name: t.name, type: 'tarefa', areaId: t.areaId ?? '' })

/** Tarefas avulsas de um dia, na ordem do grupo "Avulsas". */
export function dayTaskItems(tasks: DayTask[], dayLog: DayLog | undefined, dateKey: string): TodayItem[] {
  return tasks
    .filter((t) => t.date === dateKey)
    .sort((a, b) => a.position - b.position)
    .map((t) => {
      const log = dayLog?.blocks[t.id] ?? {}
      return { block: dayTaskBlock(t), routine: AVULSAS, log, done: !!log.done, skipped: !!log.skipped, dayTask: t }
    })
}

/** Tarefas avulsas de dias anteriores que ficaram sem fazer e ainda não foram respondidas ("Levar para hoje?"). */
export function pendingFromBefore(tasks: DayTask[], logs: Record<string, DayLog>, todayKey: string) {
  return tasks.filter((t) => {
    if (t.date >= todayKey || t.resolution) return false
    const log = logs[t.date]?.blocks[t.id]
    return !log?.done && !log?.skipped
  })
}

/** Item "em andamento": o bloco ativo ou um contador começado. */
export const inProgress = (i: TodayItem, activeId: string | null) =>
  !i.done && !i.skipped && (i.block.id === activeId || (i.block.type === 'contador' && (i.log.value ?? 0) > 0))

/**
 * Ordena a lista do Hoje:
 *  - `rotina`: como vem (avulsas e depois as rotinas, na ordem delas);
 *  - `auto`: pendentes, em andamento, concluídos e pulados; dentro de cada grupo, a ordem das rotinas;
 *  - `manual`: a ordem arrastada pela pessoa no dia; o que não estava nela vai para o fim.
 */
export function sortTodayItems(items: TodayItem[], mode: TodaySort, order: string[] | undefined, activeId: string | null): TodayItem[] {
  if (mode === 'auto') {
    const rank = (i: TodayItem) => (i.done ? 2 : i.skipped ? 3 : inProgress(i, activeId) ? 1 : 0)
    return items.map((item, idx) => ({ item, idx })).sort((a, b) => rank(a.item) - rank(b.item) || a.idx - b.idx).map((x) => x.item)
  }
  if (mode === 'manual' && order?.length) {
    const pos = new Map(order.map((id, i) => [id, i]))
    return items
      .map((item, idx) => ({ item, idx, p: pos.get(item.block.id) ?? Number.MAX_SAFE_INTEGER }))
      .sort((a, b) => a.p - b.p || a.idx - b.idx)
      .map((x) => x.item)
  }
  return items
}

export function isDone(type: string, log: BlockLog, target?: number) {
  if (type === 'contador') return (log.value ?? 0) >= (target ?? 1)
  return !!log.done
}

/**
 * Monta a lista do dia: rotinas ativas no dia da semana, na ordem em que estão,
 * com os blocos na ordem definida no editor. Tarefas concluídas em dias anteriores somem.
 */
export function getTodayItems(
  routines: Routine[],
  dayLog: DayLog | undefined,
  completedTasks: Record<string, string>,
  date: Date,
  dateKey: string,
): TodayItem[] {
  // Dia da semana pela própria chave do dia (que já está no fuso do usuário).
  const weekday = parseKey(dateKey).getDay()
  const items: TodayItem[] = []
  for (const routine of routines) {
    if (!routine.days.includes(weekday)) continue
    for (const block of routine.blocks) {
      const doneOn = completedTasks[block.id]
      if (block.type === 'tarefa' && doneOn && doneOn !== dateKey) continue
      const log = dayLog?.blocks[block.id] ?? {}
      items.push({
        block,
        routine,
        log,
        done: isDone(block.type, log, block.target),
        skipped: !!log.skipped,
      })
    }
  }
  return items
}

/** Congela a lista do dia (sem status) para o histórico. */
export function buildPlan(items: TodayItem[]): PlanEntry[] {
  return items.map(({ block, routine }) => ({ block, routine: { id: routine.id, name: routine.name, color: routine.color } }))
}

const withStatus = (plan: PlanEntry[], dayLog: DayLog | undefined): TodayItem[] =>
  plan.map(({ block, routine }) => {
    const log = dayLog?.blocks[block.id] ?? {}
    return { block, routine, log, done: isDone(block.type, log, block.target), skipped: !!log.skipped }
  })

/**
 * Itens de um dia qualquer. Hoje é sempre calculado ao vivo; dias passados usam a lista
 * congelada (`plan`). Registros antigos, sem `plan`, caem nas rotinas atuais.
 */
export function getDayItems(
  routines: Routine[],
  dayLog: DayLog | undefined,
  completedTasks: Record<string, string>,
  date: Date,
  dateKey: string,
  todayKey: string,
  dayTasks: DayTask[] = [],
): TodayItem[] {
  if (dateKey === todayKey) return [...dayTaskItems(dayTasks, dayLog, dateKey), ...getTodayItems(routines, dayLog, completedTasks, date, dateKey)]
  if (dateKey > todayKey || !dayLog) return [] // futuro ou dia sem registro
  if (dayLog.plan) return withStatus(dayLog.plan, dayLog)
  return getTodayItems(routines, dayLog, completedTasks, date, dateKey)
}

export function dayProgress(items: TodayItem[]) {
  const done = items.filter((i) => i.done).length
  return { done, total: items.length, pct: items.length ? done / items.length : 0 }
}

export function computePetState(items: TodayItem[], activeId: string | null, now = nowInTz()): PetState {
  if (items.length === 0) return 'neutro'
  const pending = items.filter((i) => !i.done && !i.skipped)
  if (pending.length === 0) return 'descanso'
  const active = pending.find((i) => i.block.id === activeId)
  if (active) {
    if (active.block.type === 'contador' && (active.log.value ?? 0) > 0) return 'atencao'
    return 'foco'
  }
  if (now.getHours() >= 21) return 'atencao'
  return 'neutro'
}

export function petMessage(state: PetState, items: TodayItem[], activeId: string | null, now = nowInTz()) {
  const pending = items.filter((i) => !i.done && !i.skipped)
  const active = items.find((i) => i.block.id === activeId)
  switch (state) {
    case 'foco':
      return `Estou com você em "${active?.block.name}". Um passo de cada vez.`
    case 'concluido':
      return 'Feito! Mais um bloco no seu dia.'
    case 'pulado':
      return 'Pulou esse? Tudo bem, a gente tenta de novo amanhã.'
    case 'atencao':
      if (active && active.block.type === 'contador')
        return `Falta pouco em "${active.block.name}": ${active.log.value ?? 0} de ${active.block.target} ${active.block.unit ?? ''}.`
      return `Já é ${now.getHours()}h e ainda faltam ${pending.length} ${pending.length === 1 ? 'bloco' : 'blocos'}. Escolhe o mais importante.`
    case 'descanso':
      return 'Dia completo. Hora de desacelerar.'
    default:
      return items.length === 0
        ? 'Oi! Eu sou seu guia. Crie uma rotina para começarmos.'
        : `Oi! Próximo bloco: "${pending[0]?.block.name}". Aperte Começar quando quiser.`
  }
}
