import { create } from 'zustand'
import type { AreaId, PetKind, PetPhase, PetState } from '../types'

export type ForcedState = PetState | 'dormindo'
export type CornerStage = 0 | 1 | 2 | 3

interface DevOverrides {
  phase: PetPhase | null
  state: ForcedState | null
  species: PetKind | null
  unlockAll: boolean
  corner: Partial<Record<AreaId, CornerStage>>
  set: (patch: Partial<Omit<DevOverrides, 'set' | 'setCorner'>>) => void
  setCorner: (area: AreaId, stage: CornerStage | null) => void
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
  corner: {},
  set: (patch) => set(patch),
  setCorner: (area, stage) => {
    const corner = { ...get().corner }
    if (stage === null) delete corner[area]
    else corner[area] = stage
    set({ corner })
  },
}))
