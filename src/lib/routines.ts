/**
 * Rotinas semanais e de um dia só. Funções puras (testadas em routines.test.ts, `npm test`).
 *
 *  - Semanal (`repeat` ausente ou 'weekly'): aparece nos dias da semana de `days`, toda semana.
 *  - De um dia só (`repeat: 'once'`): aparece só em `onceDate`. Depois que a data passa, vai sozinha
 *    para "Arquivadas" (sem gravar nada: é calculado). Os registros daquele dia continuam valendo.
 *  - Arquivada à mão (`archivedAt`): sai do Hoje, do Início e da lista principal até desarquivar.
 */
import type { Routine } from '../types'
import { addDays, parseKey } from './dates'

type Schedule = Pick<Routine, 'days' | 'repeat' | 'onceDate' | 'archivedAt'>

/** Rotina de um dia só (com a data definida). */
export const isOnce = (r: Schedule): r is Schedule & { onceDate: string } => r.repeat === 'once' && !!r.onceDate

/** Arquivada: à mão, ou de um dia só cuja data já passou. `today` = AAAA-MM-DD no fuso da pessoa. */
export const isArchived = (r: Schedule, today: string) => !!r.archivedAt || (isOnce(r) && r.onceDate < today)

/** Arquivada sozinha porque a data passou (não à mão). */
export const isExpired = (r: Schedule, today: string) => !r.archivedAt && isOnce(r) && r.onceDate < today

/** A rotina aparece na lista deste dia? Arquivadas à mão não aparecem. */
export function runsOn(r: Schedule, dateKey: string) {
  if (r.archivedAt) return false
  if (r.repeat === 'once') return r.onceDate === dateKey
  return r.days.includes(parseKey(dateKey).getDay())
}

/** Dia da semana (0 = domingo) de uma data AAAA-MM-DD. */
export const weekdayOf = (dateKey: string) => parseKey(dateKey).getDay()

/** Divide em ativas e arquivadas, mantendo a ordem. */
export function splitArchived<T extends Schedule>(routines: T[], today: string) {
  const active: T[] = []
  const archived: T[] = []
  for (const r of routines) (isArchived(r, today) ? archived : active).push(r)
  return { active, archived }
}

const WEEK_ABBR = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const WEEK_LONG = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const MONTHS_LONG = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/** "Ter 24" (para os botões dos próximos 7 dias). */
export const shortDay = (dateKey: string) => `${WEEK_ABBR[weekdayOf(dateKey)]} ${parseKey(dateKey).getDate()}`

/** "qui, 26 nov" */
export const dayMonth = (dateKey: string) => {
  const d = parseKey(dateKey)
  return `${WEEK_ABBR[d.getDay()].toLowerCase()}, ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/** "quinta, 26 de novembro" (para leitor de tela). */
export const dayMonthLong = (dateKey: string) => {
  const d = parseKey(dateKey)
  return `${WEEK_LONG[d.getDay()]}, ${d.getDate()} de ${MONTHS_LONG[d.getMonth()]}`
}

/** "Só em qui, 26 nov" (no lugar das letrinhas dos dias). */
export const onceLabel = (dateKey: string) => `Só em ${dayMonth(dateKey)}`

/** Os próximos 7 dias a partir de hoje (inclusive), em AAAA-MM-DD. */
export const next7 = (today: string) => Array.from({ length: 7 }, (_, i) => addDays(today, i))

/** A data está fora dos próximos 7 dias (vira um chip em vez dos botões). */
export const beyondWeek = (dateKey: string, today: string) => !next7(today).includes(dateKey)

/**
 * A próxima rotina de um dia só ainda por vir (depois de hoje), para o botão principal do Início.
 * `null` se não houver.
 */
export function nextOnce<T extends Schedule & { name: string }>(routines: T[], today: string): T | null {
  return (
    routines
      .filter((r) => !r.archivedAt && isOnce(r) && r.onceDate > today)
      .sort((a, b) => (a.onceDate! < b.onceDate! ? -1 : 1))[0] ?? null
  )
}
