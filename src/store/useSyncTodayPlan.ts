import { useEffect } from 'react'
import { useRotina } from './useRotina'
import { buildPlan, getTodayItems } from '../lib/today'
import { dayKey } from '../lib/dates'

/**
 * Enquanto o app está aberto, mantém salva a lista planejada de hoje.
 * Quando o dia vira, a última versão fica congelada e é ela que o histórico mostra.
 */
export function useSyncTodayPlan() {
  const routines = useRotina((s) => s.routines)
  const completedTasks = useRotina((s) => s.completedTasks)
  const hasLog = useRotina((s) => !!s.logs[dayKey()])

  useEffect(() => {
    const now = new Date()
    const date = dayKey(now)
    const { logs, setPlan } = useRotina.getState()
    const plan = buildPlan(getTodayItems(routines, logs[date], completedTasks, now, date))
    if (plan.length === 0 && !logs[date]) return
    setPlan(date, plan)
  }, [routines, completedTasks, hasLog])
}
