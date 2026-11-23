import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent, type RefObject } from 'react'
import { create } from 'zustand'
import { petFeedback, type Feedback } from '../../lib/petFeedback'

/**
 * Brincadeiras com o pet grande (Início, Hoje, Perfil, Pet, onboarding).
 *
 * Toques seguidos formam um combo (cada toque até COMBO_GAP depois do anterior, o combo
 * inteiro em ~1,2 s no ritmo normal): 1 = aperta e volta; 3 = pulinho (ou, 1 em 4, a reação
 * especial da espécie); 5 = pulo com giro; 8 = fica tonto 2 s e depois descansa 4 s ignorando toques.
 * Segurar por mais de 500 ms = carinho (olhos felizes, inclina para o toque, corações); ao soltar, pulinho de obrigado.
 * Parado, a cada 20–40 s: bocejar, olhar para os lados ou piscar duas vezes. No computador, os olhos seguem o mouse.
 * Enter e Espaço contam como toque (o pet é um <button>).
 */

export type PetReaction = 'squash' | 'hop' | 'spin' | 'special' | 'dizzy' | 'thanks'
export type IdleAct = 'yawn' | 'look' | 'blink2'

/** Ritmo das brincadeiras: 1 = original; maior = mais lento. Todas as durações do pet usam este número. */
export const PLAY_SLOW = 1.6

const COMBO_GAP = 450
const LONG_PRESS = 500
const DIZZY_MS = 2000 * PLAY_SLOW
const REST_MS = 4000
const HEART_EVERY = 380 * PLAY_SLOW
const HEART_LIFE = 1400 * PLAY_SLOW
const IDLE_MIN = 20000
const IDLE_MAX = 40000

export const REACTION_MS: Record<PetReaction, number> = { squash: 550 * PLAY_SLOW, hop: 800 * PLAY_SLOW, spin: 900 * PLAY_SLOW, special: 1800 * PLAY_SLOW, dizzy: DIZZY_MS, thanks: 650 * PLAY_SLOW }
export const IDLE_MS: Record<IdleAct, number> = { yawn: 1800 * PLAY_SLOW, look: 2200 * PLAY_SLOW, blink2: 700 * PLAY_SLOW }

export interface PetPlay {
  reaction: { type: PetReaction; id: number } | null
  idle: { type: IdleAct; id: number } | null
  petting: boolean
  /** Para que lado inclinar no carinho: -1 (esquerda) a 1 (direita). */
  lean: number
  hearts: { id: number; x: number }[]
  dizzy: boolean
  /** Descanso depois de ficar tonto: ignora toques. */
  resting: boolean
  /** Para onde os olhos olham (unidades do desenho, viewBox 120). */
  look: { x: number; y: number }
}

const INITIAL: PetPlay = { reaction: null, idle: null, petting: false, lean: 0, hearts: [], dizzy: false, resting: false, look: { x: 0, y: 0 } }

/** Comandos do painel dev: disparam a reação em todos os pets interativos da tela. */
export type PetCommand = PetReaction | IdleAct | 'pet'
export const usePetCommand = create<{ cmd: { type: PetCommand; id: number } | null; send: (type: PetCommand) => void }>()((set) => ({
  cmd: null,
  send: (type) => set({ cmd: { type, id: Date.now() } }),
}))

let seq = 0
const nextId = () => ++seq

const FEEDBACK: Partial<Record<PetReaction, Feedback>> = { hop: 'hop', spin: 'spin', special: 'special', dizzy: 'dizzy', thanks: 'thanks' }

interface Options {
  enabled: boolean
  /** Dormindo ou silhueta: sem brincadeiras nem comportamentos parados. */
  paused: boolean
  reduced: boolean
  ref: RefObject<HTMLElement | null>
  onTap?: () => void
}

export function usePetInteraction({ enabled, paused, reduced, ref, onTap }: Options) {
  const [play, setPlay] = useState<PetPlay>(INITIAL)
  const state = useRef(play)
  state.current = play
  const set = (patch: Partial<PetPlay> | ((s: PetPlay) => Partial<PetPlay>)) =>
    setPlay((s) => {
      const next = { ...s, ...(typeof patch === 'function' ? patch(s) : patch) }
      state.current = next
      return next
    })

  const taps = useRef(0)
  const timers = useRef<Record<string, number>>({})
  const heartTimer = useRef<number | undefined>(undefined)
  const pressTimer = useRef<number | undefined>(undefined)
  const swallowClick = useRef(false)
  const lastActivity = useRef(Date.now())
  const pointerX = useRef<number | null>(null)

  const later = (key: string, ms: number, fn: () => void) => {
    window.clearTimeout(timers.current[key])
    timers.current[key] = window.setTimeout(fn, ms)
  }

  useEffect(
    () => () => {
      Object.values(timers.current).forEach((t) => window.clearTimeout(t))
      window.clearTimeout(pressTimer.current)
      window.clearInterval(heartTimer.current)
    },
    [],
  )

  const react = (type: PetReaction) => {
    const id = nextId()
    set({ reaction: { type, id }, idle: null })
    const fb = FEEDBACK[type]
    if (fb) petFeedback(fb)
    later('reaction', REACTION_MS[type], () => set((s) => (s.reaction?.id === id ? { reaction: null } : {})))
  }

  const getDizzy = () => {
    taps.current = 0
    window.clearTimeout(timers.current.combo)
    set({ dizzy: true })
    react('dizzy')
    later('dizzy', DIZZY_MS, () => {
      set({ dizzy: false, resting: true })
      later('rest', REST_MS, () => set({ resting: false }))
    })
  }

  const resolveCombo = () => {
    const n = taps.current
    taps.current = 0
    if (n >= 8) return getDizzy()
    if (n >= 5) return react('spin')
    if (n >= 3) return react(Math.random() < 0.25 ? 'special' : 'hop')
  }

  const busy = () => state.current.dizzy || state.current.resting

  const tap = () => {
    lastActivity.current = Date.now()
    onTap?.()
    if (!enabled || busy()) return
    taps.current++
    // O aperto de cada toque não atropela um pulo que já está no ar.
    const r = state.current.reaction?.type
    if (!r || r === 'squash') react('squash')
    petFeedback('tap')
    if (taps.current >= 8) return getDizzy()
    later('combo', COMBO_GAP, resolveCombo)
  }

  const leanFrom = (clientX: number) => {
    const el = ref.current
    if (!el) return 0
    const r = el.getBoundingClientRect()
    return Math.max(-1, Math.min(1, (clientX - (r.left + r.width / 2)) / (r.width / 2)))
  }

  const startPetting = () => {
    if (!enabled || busy() || state.current.petting) return
    taps.current = 0
    window.clearTimeout(timers.current.combo)
    set({ petting: true, idle: null, reaction: null, lean: pointerX.current === null ? 0 : leanFrom(pointerX.current) })
    petFeedback('pet')
    window.clearInterval(heartTimer.current)
    heartTimer.current = window.setInterval(() => {
      const id = nextId()
      set((s) => ({ hearts: [...s.hearts.slice(-6), { id, x: Math.round((Math.random() - 0.5) * 28) }] }))
      petFeedback('heart')
      window.setTimeout(() => set((s) => ({ hearts: s.hearts.filter((h) => h.id !== id) })), HEART_LIFE)
    }, HEART_EVERY)
  }

  const stopPetting = () => {
    if (!state.current.petting) return
    window.clearInterval(heartTimer.current)
    set({ petting: false, lean: 0 })
    lastActivity.current = Date.now()
    react('thanks')
  }

  const bind = enabled
    ? {
        onClick: (e: MouseEvent) => {
          // O clique que vem depois de um carinho não conta como toque.
          if (swallowClick.current) {
            swallowClick.current = false
            e.preventDefault()
            return
          }
          tap()
        },
        onKeyDown: (e: KeyboardEvent) => {
          // Segurar Enter/Espaço repete a tecla: só o primeiro aperto conta.
          if ((e.key === 'Enter' || e.key === ' ') && e.repeat) e.preventDefault()
        },
        onPointerDown: (e: PointerEvent) => {
          if (e.button !== 0) return
          pointerX.current = e.clientX
          swallowClick.current = false
          window.clearTimeout(pressTimer.current)
          pressTimer.current = window.setTimeout(() => {
            swallowClick.current = true
            startPetting()
          }, LONG_PRESS)
        },
        onPointerMove: (e: PointerEvent) => {
          pointerX.current = e.clientX
          if (state.current.petting) set({ lean: leanFrom(e.clientX) })
        },
        onPointerUp: () => {
          window.clearTimeout(pressTimer.current)
          stopPetting()
        },
        onPointerCancel: () => {
          window.clearTimeout(pressTimer.current)
          stopPetting()
        },
        onPointerLeave: () => {
          window.clearTimeout(pressTimer.current)
          stopPetting()
        },
        // Segurar o dedo no celular não abre o menu do navegador.
        onContextMenu: (e: MouseEvent) => e.preventDefault(),
      }
    : {}

  // Comportamentos parados, a cada 20–40 s, se ninguém mexeu no pet nos últimos segundos.
  useEffect(() => {
    if (!enabled || paused) return
    let t: number
    const schedule = () => {
      t = window.setTimeout(
        () => {
          const s = state.current
          if (Date.now() - lastActivity.current > 5000 && !s.reaction && !s.petting && !s.dizzy && !s.resting) {
            const acts: IdleAct[] = ['yawn', 'look', 'blink2']
            doIdle(acts[Math.floor(Math.random() * acts.length)])
          }
          schedule()
        },
        IDLE_MIN + Math.random() * (IDLE_MAX - IDLE_MIN),
      )
    }
    schedule()
    return () => window.clearTimeout(t)
  }, [enabled, paused])

  const doIdle = (type: IdleAct) => {
    const id = nextId()
    set({ idle: { type, id } })
    if (type === 'yawn') petFeedback('yawn')
    later('idle', IDLE_MS[type], () => set((s) => (s.idle?.id === id ? { idle: null } : {})))
  }

  // No computador (mouse), os olhos acompanham o ponteiro de leve.
  useEffect(() => {
    if (!enabled || paused || reduced) return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    let frame = 0
    let last = { x: 0, y: 0 }
    const onMove = (e: globalThis.PointerEvent) => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const el = ref.current
        if (!el) return
        const r = el.getBoundingClientRect()
        const dx = e.clientX - (r.left + r.width / 2)
        const dy = e.clientY - (r.top + r.height * 0.45)
        const dist = Math.hypot(dx, dy) || 1
        const k = Math.min(1, dist / 280)
        const next = { x: Math.round((dx / dist) * k * 2.6 * 10) / 10, y: Math.round((dy / dist) * k * 1.8 * 10) / 10 }
        if (Math.abs(next.x - last.x) + Math.abs(next.y - last.y) < 0.3) return
        last = next
        set({ look: next })
      })
    }
    window.addEventListener('pointermove', onMove)
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(frame)
    }
  }, [enabled, paused, reduced])

  // Painel dev.
  const cmd = usePetCommand((s) => s.cmd)
  useEffect(() => {
    if (!cmd || !enabled || paused) return
    lastActivity.current = Date.now()
    const t = cmd.type
    if (t === 'yawn' || t === 'look' || t === 'blink2') return doIdle(t)
    if (t === 'pet') {
      // Carinho de mentira por 2 s.
      set({ dizzy: false, resting: false })
      pointerX.current = null
      startPetting()
      later('devpet', 2000, stopPetting)
      return
    }
    if (t === 'dizzy') return getDizzy()
    set({ dizzy: false, resting: false })
    react(t)
  }, [cmd?.id])

  return { play, bind }
}
