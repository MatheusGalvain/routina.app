import type { Area, AreaId, DefaultAreaKey } from '../types'

/** As 8 áreas com que toda conta começa (o id é a chave original, usada pelos troféus). */
export const DEFAULT_AREAS: Area[] = (
  [
    ['sono', 'Sono', '#CDB8FF'],
    ['corpo', 'Corpo', '#F4B4B4'],
    ['foco', 'Foco', '#A9BFFF'],
    ['casa', 'Casa', '#FFC9A8'],
    ['financas', 'Finanças', '#A8E6B8'],
    ['estudo', 'Estudo', '#A6E3DA'],
    ['mente', 'Mente', '#D9C9FF'],
    ['social', 'Social', '#F7B8D6'],
  ] as [DefaultAreaKey, string, string][]
).map(([id, name, color], position) => ({ id, name, color, position, isDefault: true }))

export const DEFAULT_AREA_KEYS = DEFAULT_AREAS.map((a) => a.id) as DefaultAreaKey[]

/**
 * Paleta das áreas criadas pela pessoa: 12 tons pastel com a mesma luminância relativa (0,62),
 * gerados em OKLCH (croma 0,075, um tom a cada 30°). Todos dão 11,7:1 sobre o fundo #141414.
 * As 8 cores padrão acima também continuam valendo (ver AREA_ALLOWED).
 */
export const AREA_COLORS: { color: string; name: string }[] = [
  { color: '#FEBEC6', name: 'Rosa' },
  { color: '#FDC1AC', name: 'Salmão' },
  { color: '#F0C89A', name: 'Pêssego' },
  { color: '#D9D097', name: 'Areia' },
  { color: '#BDD7A3', name: 'Limão' },
  { color: '#A1DCBB', name: 'Verde' },
  { color: '#91DCD6', name: 'Menta' },
  { color: '#94D9EE', name: 'Água' },
  { color: '#A9D2FE', name: 'Céu' },
  { color: '#C6CBFF', name: 'Azul' },
  { color: '#E0C4F6', name: 'Lavanda' },
  { color: '#F5BFE2', name: 'Lilás' },
]
export const AREA_PALETTE = AREA_COLORS.map((c) => c.color)
/** Cores aceitas numa área: a paleta e as 8 padrão. */
export const AREA_ALLOWED = [...AREA_PALETTE, ...DEFAULT_AREAS.map((a) => a.color)]

/**
 * Identidade antiga (cores vivas) → pastel. Aplicado ao ler os dados (conta e cache),
 * para áreas, rotinas e modelos salvos antes da troca de paleta.
 */
const OLD_AREA_COLORS: Record<string, string> = {
  '#8B5CF6': '#CDB8FF', '#F43F5E': '#F4B4B4', '#1E88FF': '#A9BFFF', '#FFB020': '#FFC9A8',
  '#22C55E': '#A8E6B8', '#2DD4BF': '#A6E3DA', '#A78BFA': '#D9C9FF', '#FB7185': '#F7B8D6',
  '#F97316': '#FDC1AC', '#38BDF8': '#94D9EE', '#A3E635': '#BDD7A3', '#E879F9': '#E0C4F6',
}
const OLD_ROUTINE_COLORS: Record<string, string> = {
  '#FFB020': '#FFD59E', '#1E88FF': '#A9BFFF', '#22C55E': '#A8E6B8', '#F43F5E': '#F4B4B4', '#8B5CF6': '#CDB8FF', '#2DD4BF': '#A6E3DA',
}
export const pastelArea = (c: string) => OLD_AREA_COLORS[c.toUpperCase()] ?? c
export const pastelRoutine = (c: string) => OLD_ROUTINE_COLORS[c.toUpperCase()] ?? c

/** Limites (iguais aos da tabela user_areas). */
export const MAX_AREAS = 12
export const AREA_NAME_MAX = 30

/** Área removida que ainda aparece no histórico. */
const REMOVED = { name: 'Área removida', color: '#A3A09B' }

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

/** Cores de rotina e modelo: os tons de atenção, destaque, concluído, pulado, descanso e Estudo. */
export const ROUTINE_COLORS = ['#FFD59E', '#A9BFFF', '#A8E6B8', '#F4B4B4', '#CDB8FF', '#A6E3DA']

export const WEEKDAYS = [
  { short: 'D', long: 'Domingo' },
  { short: 'S', long: 'Segunda' },
  { short: 'T', long: 'Terça' },
  { short: 'Q', long: 'Quarta' },
  { short: 'Q', long: 'Quinta' },
  { short: 'S', long: 'Sexta' },
  { short: 'S', long: 'Sábado' },
]
