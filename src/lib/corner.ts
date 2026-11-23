import type { CornerLayout, CornerLayouts, Placed, SceneItemMap, TrophyMap } from '../types'
import type { TrophyId } from '../data/trophies'
import { ITEM_BY_ID, type SceneId } from '../data/scenes'

/**
 * Operações puras nos 4 espaços do cantinho. Cada espaço tem um troféu ou um item do cenário.
 * Uma mesma coisa fica em um espaço só: colocar o que já está exposto troca os dois de lugar.
 */

export const EMPTY_LAYOUT: CornerLayout = [null, null, null, null]
export const EMPTY_LAYOUTS: CornerLayouts = { cosmos: EMPTY_LAYOUT, floresta: EMPTY_LAYOUT }

/** Mesma coisa (mesmo troféu, em qualquer nível; ou mesmo item). */
export const sameThing = (a: Placed | null, b: Placed | null) => !!a && !!b && a.kind === b.kind && a.id === b.id

/** Coloca no espaço `i`. Se já estava em outro espaço, troca de lugar. */
export function place(layout: CornerLayout, i: number, p: Placed): CornerLayout {
  const next = [...layout] as CornerLayout
  const from = layout.findIndex((s) => sameThing(s, p))
  if (from >= 0 && from !== i) next[from] = layout[i]
  next[i] = p
  return next
}

/** Troca o conteúdo de dois espaços (arrastar de um para outro). */
export function moveSlot(layout: CornerLayout, from: number, to: number): CornerLayout {
  if (from === to) return layout
  const next = [...layout] as CornerLayout
  next[to] = layout[from]
  next[from] = layout[to]
  return next
}

export function clearSlot(layout: CornerLayout, i: number): CornerLayout {
  const next = [...layout] as CornerLayout
  next[i] = null
  return next
}

/**
 * "Expor/Colocar no cantinho": se já está exposto, atualiza ali (ex.: nível do troféu);
 * senão vai para o primeiro espaço vazio; sem vazio, substitui o último.
 */
export function expose(layout: CornerLayout, p: Placed): CornerLayout {
  const at = layout.findIndex((s) => sameThing(s, p))
  const empty = layout.findIndex((s) => !s)
  return place(layout, at >= 0 ? at : empty >= 0 ? empty : layout.length - 1, p)
}

/** Níveis desbloqueados de um troféu, em ordem. */
export const tiersOf = (map: TrophyMap, id: TrophyId) => (map[id] ?? []).map((u) => u.tier).sort()

/** Só mantém o que a pessoa realmente tem; itens só no próprio cenário. */
export const validLayout = (layout: CornerLayout, scene: SceneId, trophies: TrophyMap, items: SceneItemMap): CornerLayout =>
  layout.map((s) => {
    if (!s) return null
    if (s.kind === 'trophy') return tiersOf(trophies, s.id).includes(s.tier) ? s : null
    return items[s.id] && ITEM_BY_ID[s.id]?.scene === scene ? s : null
  }) as CornerLayout
