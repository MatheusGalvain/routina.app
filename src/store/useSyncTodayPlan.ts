import { useEffect } from 'react'
import { useRotina } from './useRotina'
import { buildPlan, dayTaskItems, getTodayItems } from '../lib/today'
import { dayKey, nowInTz } from '../lib/dates'

/**
 * Enquanto o app está aberto, mantém salva a lista planejada de hoje.
 * Quando o dia vira, a última versão fica congelada e é ela que o histórico mostra.
 */
export function useSyncTodayPlan() {
  const routines = useRotina((s) => s.routines)
  const completedTasks = useRotina((s) => s.completedTasks)
  const dayTasks = useRotina((s) => s.dayTasks)
  const hasLog = useRotina((s) => !!s.logs[dayKey()])

  useEffect(() => {
    const now = nowInTz()
    const date = dayKey(now)
    const { logs, setPlan } = useRotina.getState()
    // As tarefas avulsas entram na lista congelada (grupo "Avulsas"): contam no progresso e no histórico.
    const plan = buildPlan([...dayTaskItems(dayTasks, logs[date], date), ...getTodayItems(routines, logs[date], completedTasks, now, date)])
    if (plan.length === 0 && !logs[date]) return
    setPlan(date, plan)
  }, [routines, completedTasks, dayTasks, hasLog])
}
