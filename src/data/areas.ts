import type { AreaId } from '../types'

export const AREAS: { id: AreaId; name: string; color: string }[] = [
  { id: 'sono', name: 'Sono', color: '#8B5CF6' },
  { id: 'corpo', name: 'Corpo', color: '#F43F5E' },
  { id: 'foco', name: 'Foco', color: '#1E88FF' },
  { id: 'casa', name: 'Casa', color: '#FFB020' },
  { id: 'financas', name: 'Finanças', color: '#22C55E' },
  { id: 'estudo', name: 'Estudo', color: '#2DD4BF' },
  { id: 'mente', name: 'Mente', color: '#A78BFA' },
  { id: 'social', name: 'Social', color: '#FB7185' },
]

export const areaById = (id: AreaId) => AREAS.find((a) => a.id === id) ?? AREAS[0]

export const BLOCK_TYPES = [
  { id: 'habito', name: 'Hábito', hint: 'marca feito ou não, todo dia' },
  { id: 'contador', name: 'Contador', hint: 'soma até uma meta (água, páginas…)' },
  { id: 'tarefa', name: 'Tarefa', hint: 'some depois de feita' },
] as const

export const ROUTINE_COLORS = ['#FFB020', '#1E88FF', '#22C55E', '#F43F5E', '#8B5CF6', '#2DD4BF']

export const WEEKDAYS = [
  { short: 'D', long: 'Domingo' },
  { short: 'S', long: 'Segunda' },
  { short: 'T', long: 'Terça' },
  { short: 'Q', long: 'Quarta' },
  { short: 'Q', long: 'Quinta' },
  { short: 'S', long: 'Sexta' },
  { short: 'S', long: 'Sábado' },
]
