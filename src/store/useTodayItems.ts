import { useMemo } from 'react'
import { useRotina } from './useRotina'
import { dayTaskItems, getTodayItems } from '../lib/today'
import { dayKey, nowInTz } from '../lib/dates'

/**
 * A lista de hoje: as tarefas avulsas (grupo "Avulsas") e depois os blocos das rotinas do dia.
 * É a mesma em todo o app (progresso, pet, Início e histórico), na ordem "por rotina".
 */
export function useTodayItems() {
  const now = nowInTz()
  const date = dayKey(now)
  const routines = useRotina((s) => s.routines)
  const dayLog = useRotina((s) => s.logs[date])
  const completedTasks = useRotina((s) => s.completedTasks)
  const dayTasks = useRotina((s) => s.dayTasks)
  return useMemo(
    () => [...dayTaskItems(dayTasks, dayLog, date), ...getTodayItems(routines, dayLog, completedTasks, now, date)],
    [routines, dayLog, completedTasks, dayTasks, date],
  )
}
