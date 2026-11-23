import { create } from 'zustand'
import type { AccessoryId, PetPhase } from '../types'
import type { TrophyId, TrophyTier } from '../data/trophies'
import type { SceneItemId } from '../data/scenes'

export type PetEvent = { id: number; type: 'phase'; phase: PetPhase } | { id: number; type: 'unlock'; accessory: AccessoryId } | { id: number; type: 'secret' } | { id: number; type: 'trophy'; trophy: TrophyId; tier: TrophyTier } | { id: number; type: 'item'; item: SceneItemId }

type NewEvent = { type: 'phase'; phase: PetPhase } | { type: 'unlock'; accessory: AccessoryId } | { type: 'secret' } | { type: 'trophy'; trophy: TrophyId; tier: TrophyTier } | { type: 'item'; item: SceneItemId }

let nextId = 1

/** Fila de comemorações do companheiro (nova fase, acessório desbloqueado, alguém novo no cantinho). */
export const usePetEvents = create<{ queue: PetEvent[]; push: (e: NewEvent) => void; shift: () => void }>()((set, get) => ({
  queue: [],
  push: (e) => set({ queue: [...get().queue, { ...e, id: nextId++ } as PetEvent] }),
  shift: () => set({ queue: get().queue.slice(1) }),
}))
