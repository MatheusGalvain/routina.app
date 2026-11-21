import { create } from 'zustand'
import type { AccessoryId, PetPhase } from '../types'

export type PetEvent = { id: number; type: 'phase'; phase: PetPhase } | { id: number; type: 'unlock'; accessory: AccessoryId }

type NewEvent = { type: 'phase'; phase: PetPhase } | { type: 'unlock'; accessory: AccessoryId }

let nextId = 1

/** Fila de comemorações do companheiro (nova fase, acessório desbloqueado). */
export const usePetEvents = create<{ queue: PetEvent[]; push: (e: NewEvent) => void; shift: () => void }>()((set, get) => ({
  queue: [],
  push: (e) => set({ queue: [...get().queue, { ...e, id: nextId++ } as PetEvent] }),
  shift: () => set({ queue: get().queue.slice(1) }),
}))
