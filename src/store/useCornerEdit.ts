import { create } from 'zustand'

/** Modo "Editar cantinho": se está editando e qual espaço está com a gaveta aberta. */
export const useCornerEdit = create<{ editing: boolean; slot: number | null; set: (p: { editing?: boolean; slot?: number | null }) => void }>()((set) => ({
  editing: false,
  slot: null,
  set: (p) => set(p),
}))
