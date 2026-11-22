import type { Area, AreaId, DefaultAreaKey } from '../types'

/** As 8 áreas com que toda conta começa (o id é a chave original, usada pelos troféus). */
export const DEFAULT_AREAS: Area[] = (
  [
    ['sono', 'Sono', '#8B5CF6'],
    ['corpo', 'Corpo', '#F43F5E'],
    ['foco', 'Foco', '#1E88FF'],
    ['casa', 'Casa', '#FFB020'],
    ['financas', 'Finanças', '#22C55E'],
    ['estudo', 'Estudo', '#2DD4BF'],
    ['mente', 'Mente', '#A78BFA'],
    ['social', 'Social', '#FB7185'],
  ] as [DefaultAreaKey, string, string][]
).map(([id, name, color], position) => ({ id, name, color, position, isDefault: true }))

export const DEFAULT_AREA_KEYS = DEFAULT_AREAS.map((a) => a.id) as DefaultAreaKey[]

/** Paleta fixa das áreas: 12 cores pensadas para o fundo escuro (sem seletor de cor livre). */
export const AREA_COLORS: { color: string; name: string }[] = [
  { color: '#8B5CF6', name: 'Roxo' },
  { color: '#F43F5E', name: 'Vermelho' },
  { color: '#1E88FF', name: 'Azul' },
  { color: '#FFB020', name: 'Âmbar' },
  { color: '#22C55E', name: 'Verde' },
  { color: '#2DD4BF', name: 'Turquesa' },
  { color: '#A78BFA', name: 'Lilás' },
  { color: '#FB7185', name: 'Rosa' },
  { color: '#F97316', name: 'Laranja' },
  { color: '#38BDF8', name: 'Céu' },
  { color: '#A3E635', name: 'Lima' },
  { color: '#E879F9', name: 'Magenta' },
]
export const AREA_PALETTE = AREA_COLORS.map((c) => c.color)

/** Limites (iguais aos da tabela user_areas). */
export const MAX_AREAS = 12
export const AREA_NAME_MAX = 30

/** Área removida que ainda aparece no histórico. */
const REMOVED = { name: 'Área removida', color: '#6F788A' }

/**
 * Acha a área pelo id. Se ela foi excluída, usa o nome e a cor originais (áreas padrão)
 * ou um cinza neutro, para o histórico continuar legível.
 */
export function areaOf(areas: Area[], id: AreaId): Area {
  return (
    areas.find((a) => a.id === id) ??
    DEFAULT_AREAS.find((a) => a.id === id) ?? { id, ...REMOVED, position: Number.MAX_SAFE_INTEGER, isDefault: false }
  )
}

/** Nome comparável: sem acento, sem espaços nas pontas e em minúsculas ("Finanças" = "financas"). */
export const sameName = (a: string, b: string) => {
  const n = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase()
  return n(a) === n(b)
}

/** Áreas padrão que a pessoa excluiu (podem ser restauradas com a chave original). */
export const removedDefaults = (areas: Area[]) => DEFAULT_AREAS.filter((d) => !areas.some((a) => a.id === d.id))

/** Ordena e renumera as posições (0, 1, 2…). */
export const normalizeAreas = (areas: Area[]) => [...areas].sort((a, b) => a.position - b.position).map((a, position) => (a.position === position ? a : { ...a, position }))

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
