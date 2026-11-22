import { create } from 'zustand'

export type OnboardingStep = 1 | 2 | 3

interface OnboardingState {
  open: boolean
  step: OnboardingStep
  /** Rotina escolhida no passo 2 (de onde sai o bloco da primeira vitória). */
  routineId: string | null
  /** Passa pelos 3 passos mesmo se a pessoa já tem rotina (painel dev). */
  full: boolean
  show: (step?: OnboardingStep, full?: boolean) => void
  goTo: (step: OnboardingStep, routineId?: string | null) => void
  close: () => void
}

/** Onboarding de primeiro acesso (tela cheia). Abre sozinho na conta nova ou pelo botão do Início. */
export const useOnboarding = create<OnboardingState>()((set) => ({
  open: false,
  step: 1,
  routineId: null,
  full: false,
  show: (step = 1, full = false) => set({ open: true, step, routineId: null, full }),
  goTo: (step, routineId) => set((s) => ({ step, routineId: routineId === undefined ? s.routineId : routineId })),
  close: () => set({ open: false }),
}))
