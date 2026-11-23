import { canVibrate, usePetPrefs } from '../store/usePetPrefs'

/**
 * Sons e vibração das reações do pet. Os sons são gerados na hora (Web Audio): bipes curtos e baixos,
 * sem arquivos. Só tocam depois de um toque da pessoa (regra dos navegadores) e se estiverem ligados no Perfil.
 */

export type Feedback = 'tap' | 'hop' | 'spin' | 'dizzy' | 'special' | 'pet' | 'heart' | 'thanks' | 'yawn' | 'cycle'

let ctx: AudioContext | null = null
function audio() {
  if (ctx) return ctx
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  ctx = new AC()
  return ctx
}

/** Uma nota: frequência que desliza de `from` a `to`, com ataque e queda suaves. */
function tone(from: number, to: number, ms: number, { delay = 0, type = 'sine', volume = 0.07 }: { delay?: number; type?: OscillatorType; volume?: number } = {}) {
  const a = audio()
  if (!a) return
  if (a.state === 'suspended') void a.resume()
  const t0 = a.currentTime + delay / 1000
  const t1 = t0 + ms / 1000
  const osc = a.createOscillator()
  const gain = a.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(from, t0)
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t1)
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(volume, t0 + Math.min(0.02, ms / 4000))
  gain.gain.exponentialRampToValueAtTime(0.0001, t1)
  osc.connect(gain).connect(a.destination)
  osc.start(t0)
  osc.stop(t1 + 0.02)
}

const SOUNDS: Record<Feedback, () => void> = {
  tap: () => tone(620, 880, 70, { volume: 0.05 }),
  hop: () => tone(420, 900, 170),
  spin: () => {
    tone(500, 1100, 220, { type: 'triangle' })
    tone(1100, 700, 200, { delay: 220, type: 'triangle' })
  },
  dizzy: () => {
    tone(900, 500, 260, { type: 'triangle' })
    tone(700, 380, 260, { delay: 240, type: 'triangle' })
    tone(520, 300, 320, { delay: 480, type: 'triangle' })
  },
  special: () => {
    tone(660, 990, 110)
    tone(990, 1320, 130, { delay: 120 })
  },
  pet: () => tone(300, 340, 380, { type: 'triangle', volume: 0.04 }),
  heart: () => tone(1250, 1500, 60, { volume: 0.025 }),
  thanks: () => {
    tone(780, 1040, 90)
    tone(1040, 1400, 110, { delay: 100 })
  },
  yawn: () => tone(380, 220, 600, { type: 'triangle', volume: 0.035 }),
  // Fim de um ciclo do modo foco: duas notas suaves, como um sininho distante.
  cycle: () => {
    tone(660, 655, 700, { volume: 0.045 })
    tone(880, 875, 900, { delay: 260, volume: 0.035 })
  },
}

const VIBRATION: Partial<Record<Feedback, number | number[]>> = {
  hop: 18,
  special: [14, 40, 14],
  spin: [20, 40, 20],
  dizzy: [30, 50, 30, 50, 60],
  pet: 12,
  thanks: 16,
}

/**
 * Libera o áudio num toque da pessoa (ex.: "Começar" no modo foco), para o som do fim do ciclo
 * poder tocar depois, sem novo toque. Respeita a configuração de sons.
 */
export function primeAudio() {
  if (!usePetPrefs.getState().sound) return
  try {
    const a = audio()
    if (a?.state === 'suspended') void a.resume()
  } catch {
    /* sem áudio */
  }
}

export function petFeedback(kind: Feedback) {
  const { sound, vibrate } = usePetPrefs.getState()
  if (sound) {
    try {
      SOUNDS[kind]()
    } catch {
      /* sem áudio: segue em silêncio */
    }
  }
  const pattern = VIBRATION[kind]
  if (vibrate && pattern !== undefined && canVibrate()) navigator.vibrate(pattern)
}
