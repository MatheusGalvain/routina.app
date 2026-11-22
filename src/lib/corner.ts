import type { CornerSlot, CornerSlots, TrophyMap } from '../types'
import type { TrophyId, TrophyTier } from '../data/trophies'

/**
 * Operações puras nos 4 espaços do cantinho. Um troféu fica em um espaço só:
 * colocar um troféu que já está exposto troca os dois de lugar.
 */

export const EMPTY_SLOTS: CornerSlots = [null, null, null, null]

/** Coloca um troféu (num nível) no espaço `i`. Se ele já estava em outro espaço, troca de lugar. */
export function placeTrophy(slots: CornerSlots, i: number, trophyId: TrophyId, tier: TrophyTier): CornerSlots {
  const next = [...slots] as CornerSlots
  const from = slots.findIndex((s) => s?.trophyId === trophyId)
  if (from >= 0 && from !== i) next[from] = slots[i]
  next[i] = { trophyId, tier }
  return next
}

/** Troca o conteúdo de dois espaços (arrastar de um para outro). */
export function moveSlot(slots: CornerSlots, from: number, to: number): CornerSlots {
  if (from === to) return slots
  const next = [...slots] as CornerSlots
  next[to] = slots[from]
  next[from] = slots[to]
  return next
}

export function clearSlot(slots: CornerSlots, i: number): CornerSlots {
  const next = [...slots] as CornerSlots
  next[i] = null
  return next
}

/**
 * "Expor no cantinho": se o troféu já está exposto, atualiza o nível ali;
 * senão vai para o primeiro espaço vazio; sem vazio, substitui o último.
 */
export function exposeTrophy(slots: CornerSlots, trophyId: TrophyId, tier: TrophyTier): CornerSlots {
  const at = slots.findIndex((s) => s?.trophyId === trophyId)
  const empty = slots.findIndex((s) => !s)
  return placeTrophy(slots, at >= 0 ? at : empty >= 0 ? empty : slots.length - 1, trophyId, tier)
}

/** Níveis desbloqueados de um troféu, em ordem. */
export const tiersOf = (map: TrophyMap, id: TrophyId) => (map[id] ?? []).map((u) => u.tier).sort()

/** Só mantém nos espaços o que a pessoa realmente tem. */
export const validSlots = (slots: CornerSlots, map: TrophyMap): CornerSlots =>
  slots.map((s: CornerSlot | null) => (s && tiersOf(map, s.trophyId).includes(s.tier) ? s : null)) as CornerSlots
