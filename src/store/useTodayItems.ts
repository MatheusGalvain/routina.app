import { useMemo } from 'react'
import { useRotina } from './useRotina'
import { dayTaskItems, getTodayItems } from '../lib/today'
import { addDays, dayKey, nowInTz } from '../lib/dates'
import { isArchived } from '../lib/routines'
import { useDevOverrides } from './useDevOverrides'

/**
 * "Hoje" para decidir o que está arquivado. O painel dev pode adiantar dias (só visual)
 * para testar o arquivamento das rotinas de um dia só.
 */
export function useRoutineDay() {
  const shift = useDevOverrides((s) => s.dayShift)
  const today = dayKey()
  return shift ? addDays(today, shift) : today
}

/** Rotinas que não estão arquivadas (as que aparecem no Início e na lista principal). */
export function useActiveRoutines() {
  const routines = useRotina((s) => s.routines)
  const day = useRoutineDay()
  return useMemo(() => routines.filter((r) => !isArchived(r, day)), [routines, day])
}

/**
 * A lista de hoje: as tarefas avulsas (grupo "Avulsas") e depois os blocos das rotinas do dia.
 * É a mesma em todo o app (progresso, pet, Início e histórico), na ordem "por rotina".
 */
export function useTodayItems() {
  const now = nowInTz()
  const date = dayKey(now)
  // Com dias adiantados pelo painel dev, a de um dia só que "já passou" sai daqui também (só visual).
  const routines = useActiveRoutines()
  const dayLog = useRotina((s) => s.logs[date])
  const completedTasks = useRotina((s) => s.completedTasks)
  const dayTasks = useRotina((s) => s.dayTasks)
  return useMemo(
    () => [...dayTaskItems(dayTasks, dayLog, date), ...getTodayItems(routines, dayLog, completedTasks, now, date)],
    [routines, dayLog, completedTasks, dayTasks, date],
  )
}
