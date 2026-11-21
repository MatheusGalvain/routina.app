import { AnimatePresence, motion, useAnimationControls } from 'framer-motion'
import { useEffect, useState } from 'react'
import type { PetKind } from '../../types'
import { PETS, type EyeStyle } from './pets'

const INK = '#0A0D14'

function Eye({ cx, cy, style, side, blink }: { cx: number; cy: number; style: EyeStyle; side: number; blink: boolean }) {
  if (style === 'happy')
    return <path d={`M${cx - 7},${cy + 3} Q${cx},${cy - 6} ${cx + 7},${cy + 3}`} fill="none" stroke={INK} strokeWidth={3.5} strokeLinecap="round" />
  if (style === 'closed')
    return <path d={`M${cx - 6},${cy} Q${cx},${cy + 5} ${cx + 6},${cy}`} fill="none" stroke={INK} strokeWidth={3.5} strokeLinecap="round" />

  const h = style === 'squint' ? 9 : style === 'angry' ? 12 : 18
  const brow = side === 0 ? `M${cx - 8},${cy - 13} L${cx + 5},${cy - 8}` : `M${cx + 8},${cy - 13} L${cx - 5},${cy - 8}`
  return (
    <g>
      {style === 'angry' && <path d={brow} stroke={INK} strokeWidth={4} strokeLinecap="round" />}
      <motion.g animate={{ scaleY: blink ? 0.1 : 1 }} transition={{ duration: 0.07 }}>
        <rect x={cx - 4.5} y={cy - h / 2} width={9} height={h} rx={4.5} fill={INK} />
        <circle cx={cx + 1.4} cy={cy - h / 2 + 3.2} r={1.7} fill="#fff" />
      </motion.g>
    </g>
  )
}

interface PetProps {
  kind: PetKind
  size?: number
  /** Flutuar parado no lugar. */
  float?: boolean
  /** Sobrescreve o estilo de olho padrão do pet (ex.: em histórias). */
  mood?: EyeStyle
  /** Chamado depois do toque (além da animação de cutucar). */
  onPoke?: () => void
  className?: string
}

/**
 * Pet animado: flutua, respira, pisca sozinho, reage ao clique
 * e troca de forma com uma transição quando `kind` muda.
 */
export function Pet({ kind, size = 120, float = true, mood, onPoke, className = '' }: PetProps) {
  const def = PETS[kind]
  const eyeStyle = mood ?? def.eyeStyle
  const [blink, setBlink] = useState(false)
  const controls = useAnimationControls()

  useEffect(() => {
    let timer: number
    const schedule = () => {
      timer = window.setTimeout(() => {
        setBlink(true)
        window.setTimeout(() => setBlink(false), 140)
        schedule()
      }, 2200 + Math.random() * 3500)
    }
    schedule()
    return () => window.clearTimeout(timer)
  }, [])

  const poke = () => {
    controls.start({ scale: [1, 1.14, 0.9, 1.04, 1], rotate: [0, -6, 5, 0, 0], transition: { duration: 0.55 } })
    onPoke?.()
  }

  return (
    <button
      type="button"
      onClick={poke}
      aria-label={`${def.name}: ${def.title}`}
      className={`relative shrink-0 cursor-pointer rounded-full bg-transparent p-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <motion.div
        className="h-full w-full"
        animate={float ? { y: [0, -size * 0.05, 0] } : undefined}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.svg
            key={kind}
            viewBox="0 0 120 120"
            width={size}
            height={size}
            aria-hidden="true"
            initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.5, opacity: 0, rotate: 10 }}
            transition={{ type: 'spring', stiffness: 320, damping: 18 }}
            style={{ overflow: 'visible', filter: `drop-shadow(0 0 ${Math.round(size * 0.12)}px ${def.glow})` }}
          >
            <motion.g animate={controls}>
              <motion.g
                animate={{ scaleY: [1, 1.035, 1], scaleX: [1, 0.985, 1] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                style={{ originY: 1 }}
              >
                {def.body}
                {def.eyes.map(([cx, cy], i) => (
                  <Eye key={i} cx={cx} cy={cy} side={i} style={eyeStyle} blink={blink} />
                ))}
              </motion.g>
            </motion.g>
          </motion.svg>
        </AnimatePresence>
      </motion.div>
    </button>
  )
}
