import type { BlockLog, DayLog, PetState, PlanEntry, Routine, TodayItem } from '../types'

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
  const weekday = date.getDay()
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
): TodayItem[] {
  if (dateKey === todayKey) return getTodayItems(routines, dayLog, completedTasks, date, dateKey)
  if (dateKey > todayKey || !dayLog) return [] // futuro ou dia sem registro
  if (dayLog.plan) return withStatus(dayLog.plan, dayLog)
  return getTodayItems(routines, dayLog, completedTasks, date, dateKey)
}

export function dayProgress(items: TodayItem[]) {
  const done = items.filter((i) => i.done).length
  return { done, total: items.length, pct: items.length ? done / items.length : 0 }
}

export function computePetState(items: TodayItem[], activeId: string | null, now = new Date()): PetState {
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

export function petMessage(state: PetState, items: TodayItem[], activeId: string | null, now = new Date()) {
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
