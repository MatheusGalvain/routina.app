import { create } from 'zustand'
import { useReducedMotion } from 'framer-motion'
import { persist } from 'zustand/middleware'
import { APP_KEY } from '../lib/storageKeys'

/**
 * Animações do app: seguir o aparelho (prefers-reduced-motion, ex.: "Efeitos de animação" do Windows),
 * sempre animar, ou sempre reduzir.
 */
export type MotionPref = 'sistema' | 'sempre' | 'reduzir'

interface PetPrefs {
  motion: MotionPref
  /** Sons curtos quando o pet reage (toques, carinho, combos). */
  sound: boolean
  /** Vibração curta nos combos, se o aparelho tiver. */
  vibrate: boolean
  /** Decorações de época no cantinho (neve, luzinhas, fogos…) durante os eventos. */
  seasonDecor: boolean
  set: (patch: Partial<Pick<PetPrefs, 'sound' | 'vibrate' | 'motion' | 'seasonDecor'>>) => void
}

/** Preferências deste aparelho (Perfil → Sons e vibração). Não vão para a conta. */
export const usePetPrefs = create<PetPrefs>()(
  persist(
    (set) => ({
      sound: true,
      vibrate: true,
      motion: 'sistema',
      seasonDecor: true,
      set: (patch) => set(patch),
    }),
    { name: `${APP_KEY}-preferencias`, partialize: (s) => ({ sound: s.sound, vibrate: s.vibrate, motion: s.motion, seasonDecor: s.seasonDecor }) },
  ),
)

/** Valor para o <MotionConfig reducedMotion> do framer-motion. */
export const MOTION_CONFIG: Record<MotionPref, 'user' | 'never' | 'always'> = { sistema: 'user', sempre: 'never', reduzir: 'always' }

/** Movimento reduzido agora, juntando a escolha do Perfil com a do aparelho. */
export function useReducedMotionPref() {
  const pref = usePetPrefs((s) => s.motion)
  const system = useReducedMotion()
  return pref === 'sempre' ? false : pref === 'reduzir' ? true : !!system
}

export const canVibrate = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
