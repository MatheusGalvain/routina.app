import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { APP_KEY } from '../lib/storageKeys'
import { useRotina } from './useRotina'
import type { Block } from '../types'
import { dayTaskBlock } from '../lib/today'

/**
 * Modo foco com o pet: qual bloco está em foco (a tela cheia fica em src/components/focus/FocusMode.tsx)
 * e as durações escolhidas (padrão pomodoro: 25 min de foco e 5 de pausa).
 */

interface FocusState {
  open: boolean
  /** Bloco em foco (`null` = foco livre, sem bloco). */
  blockId: string | null
  start: (blockId: string | null) => void
  close: () => void
}

export const useFocus = create<FocusState>()((set) => ({
  open: false,
  blockId: null,
  start: (blockId) => {
    if (blockId) useRotina.getState().setActive(blockId)
    set({ open: true, blockId })
  },
  close: () => set({ open: false }),
}))

export const FOCUS_LIMITS = { focus: [5, 90], pause: [1, 30] } as const

interface FocusPrefs {
  focusMin: number
  pauseMin: number
  set: (patch: Partial<Pick<FocusPrefs, 'focusMin' | 'pauseMin'>>) => void
}

/** Durações do modo foco. Ficam neste aparelho, como as outras preferências. */
export const useFocusPrefs = create<FocusPrefs>()(
  persist(
    (set) => ({
      focusMin: 25,
      pauseMin: 5,
      set: (patch) => set(patch),
    }),
    { name: `${APP_KEY}-foco`, partialize: (s) => ({ focusMin: s.focusMin, pauseMin: s.pauseMin }) },
  ),
)

/** Contador de pomodoros: um contador cuja unidade (ou nome) fala em pomodoro. */
export const isPomodoroCounter = (b: Block) => b.type === 'contador' && /pomodoro/i.test(`${b.unit ?? ''} ${b.name}`)

/** Procura o bloco nas rotinas atuais (ou nas tarefas avulsas). */
export function findBlock(blockId: string | null): Block | null {
  if (!blockId) return null
  const { routines, dayTasks } = useRotina.getState()
  for (const r of routines) {
    const b = r.blocks.find((x) => x.id === blockId)
    if (b) return b
  }
  const t = dayTasks.find((x) => x.id === blockId)
  return t ? dayTaskBlock(t) : null
}
