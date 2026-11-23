import { create } from 'zustand'
import type { AreaId, CornerLayouts, EventItemMap, PetKind, PetPhase, PetState, SceneItemMap, TrophyMap } from '../types'
import type { SceneId } from '../data/scenes'

export type ForcedState = PetState | 'dormindo'

interface DevOverrides {
  phase: PetPhase | null
  state: ForcedState | null
  species: PetKind | null
  unlockAll: boolean
  /** Mostra o coelho como desbloqueado (só visual, não grava nada). */
  secretPet: boolean
  /** Troféus de mentira (só neste aparelho). `null` = os reais. */
  trophies: TrophyMap | null
  /** Montagens do cantinho de mentira. `null` = as reais. */
  layouts: CornerLayouts | null
  /** Cenário de mentira. `null` = o real. */
  scene: SceneId | null
  /** Itens de cenário de mentira. `null` = os reais. */
  sceneItems: SceneItemMap | null
  /** Itens de evento de mentira. `null` = os reais. */
  eventItems: EventItemMap | null
  /** Data simulada (AAAA-MM-DD) para eventos e lua cheia (sempre "à noite"). `null` = hoje de verdade. */
  date: string | null
  /** Decorações de época: forçar ligadas/desligadas. `null` = segue o Perfil. */
  decor: boolean | null
  /** Modo foco de teste: ciclos de 10 s de foco e 5 s de pausa (sessões não são salvas). */
  focusTest: boolean
  /** Dias (0–7) por área no céu do cantinho. */
  corner: Partial<Record<AreaId, number>>
  set: (patch: Partial<Omit<DevOverrides, 'set' | 'setCorner'>>) => void
  setCorner: (area: AreaId, days: number | null) => void
}

/**
 * Sobrescritas visuais do painel de desenvolvimento. Sem persist: somem ao recarregar.
 * Fora do modo dev ninguém escreve aqui, então tudo fica no automático.
 */
export const useDevOverrides = create<DevOverrides>()((set, get) => ({
  phase: null,
  state: null,
  species: null,
  unlockAll: false,
  secretPet: false,
  trophies: null,
  layouts: null,
  scene: null,
  sceneItems: null,
  eventItems: null,
  date: null,
  decor: null,
  focusTest: false,
  corner: {},
  set: (patch) => set(patch),
  setCorner: (area, days) => {
    const corner = { ...get().corner }
    if (days === null) delete corner[area]
    else corner[area] = days
    set({ corner })
  },
}))
