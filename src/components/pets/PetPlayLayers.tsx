import { AnimatePresence, motion } from 'framer-motion'
import type { PetKind } from '../../types'
import { PLAY_SLOW } from './usePetInteraction'
import type { PetColors, SpeciesDef } from './pets'

/**
 * Camadas SVG das brincadeiras (viewBox 0 0 120 120): corações do carinho, estrelinhas de tonto,
 * o "z" do descanso, a boca do bocejo e as reações especiais de cada espécie.
 * As cores são as vivas dos pets (o pet não segue a paleta pastel da interface).
 *
 * Giros em SVG: o framer-motion calcula o ponto de giro pela caixa do próprio elemento
 * (originX/originY de 0 a 1), então cada peça é desenhada para girar a partir de um canto da caixa.
 */

const INK = '#0A0D14'

/** Boca de cada espécie, aproximada (para o bocejo e a língua do sapinho). */
export const MOUTH: Record<PetKind, { x: number; y: number }> = {
  gatinho: { x: 60, y: 79 },
  sapinho: { x: 60, y: 84 },
  polvinho: { x: 60, y: 66 },
  pintinho: { x: 60, y: 74 },
  ourico: { x: 60, y: 84 },
  corujinha: { x: 60, y: 76 },
  coelho: { x: 60, y: 78 },
}

const HEART = 'M0,4 C-7,-1 -4,-8 0,-4.5 C4,-8 7,-1 0,4 Z'
const STAR4 = (r: number) => `M0,${-r} Q0,0 ${r},0 Q0,0 0,${r} Q0,0 ${-r},0 Q0,0 0,${-r} Z`
const STAR5 = 'M0,-5 L1.5,-1.6 L5,-1.4 L2.3,0.9 L3.1,4.4 L0,2.6 L-3.1,4.4 L-2.3,0.9 L-5,-1.4 L-1.5,-1.6 Z'

export function Hearts({ hearts, head }: { hearts: { id: number; x: number }[]; head: { x: number; y: number } }) {
  return (
    <AnimatePresence>
      {hearts.map((h) => (
        <motion.path
          key={h.id}
          d={HEART}
          fill="#FF6FA5"
          initial={{ x: head.x + h.x, y: head.y - 2, opacity: 0, scale: 0.7 }}
          animate={{ y: head.y - 38, opacity: [0, 1, 1, 0], scale: [0.7, 1.8, 1.6, 1.4] }}
          transition={{ duration: 1.3 * PLAY_SLOW, ease: 'easeOut' }}
        />
      ))}
    </AnimatePresence>
  )
}

/** Estrelinhas dando voltas em volta da cabeça (cada uma percorre a elipse, com fases diferentes). */
export function DizzyStars({ head }: { head: { x: number; y: number } }) {
  const cy = head.y - 4
  const steps = 12
  const path = (phase: number) => {
    const xs: number[] = []
    const ys: number[] = []
    const sc: number[] = []
    for (let i = 0; i <= steps; i++) {
      const a = phase + (i / steps) * Math.PI * 2
      xs.push(head.x + Math.cos(a) * 24)
      ys.push(cy + Math.sin(a) * 8)
      // Atrás da cabeça (em cima da elipse) a estrela fica menor.
      sc.push(0.75 + 0.35 * Math.sin(a))
    }
    return { x: xs, y: ys, scale: sc }
  }
  return (
    <>
      {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((phase, i) => (
        <motion.path
          key={i}
          d={STAR5}
          fill="#FFD34D"
          stroke="#B7791F"
          strokeWidth={0.6}
          initial={false}
          animate={path(phase)}
          transition={{ duration: 1.1 * PLAY_SLOW, repeat: Infinity, ease: 'linear' }}
        />
      ))}
    </>
  )
}

/** "z" pequeno do descanso depois de ficar tonto. */
export function RestZ({ head }: { head: { x: number; y: number } }) {
  return (
    <motion.text
      x={head.x + 22}
      y={head.y}
      fontSize={10}
      fontWeight={800}
      fill="#C4B5FD"
      animate={{ opacity: [0, 1, 0], y: [head.y + 4, head.y - 6, head.y - 14] }}
      transition={{ duration: 2 * PLAY_SLOW, repeat: Infinity, ease: 'easeOut' }}
    >
      z
    </motion.text>
  )
}

export function YawnMouth({ kind }: { kind: PetKind }) {
  const m = MOUTH[kind]
  return (
    <motion.ellipse
      cx={m.x}
      cy={m.y}
      rx={4.5}
      fill={INK}
      initial={{ ry: 0 }}
      animate={{ ry: [0, 6, 6, 0] }}
      transition={{ duration: 1.6 * PLAY_SLOW, times: [0, 0.3, 0.75, 1] }}
    />
  )
}

/** Atrás do corpo: o rabo do gatinho, bem para fora do corpo, balançando a partir da base. */
export function SpecialBehind({ kind, colors }: { kind: PetKind; colors: PetColors }) {
  if (kind === 'gatinho')
    return (
      // A base do rabo é o canto de baixo à esquerda da caixa do desenho (originX 0, originY 1).
      <motion.path
        d="M82,96 C100,98 116,86 114,66 C113,58 108,52 104,50"
        fill="none"
        stroke={colors.color}
        strokeWidth={8}
        strokeLinecap="round"
        style={{ originX: 0, originY: 1 }}
        initial={{ opacity: 0, rotate: 0 }}
        animate={{ opacity: [0, 1, 1, 1, 1, 1, 1, 1, 0], rotate: [0, -18, 16, -18, 16, -14, 12, -6, 0] }}
        transition={{ duration: 1.7 * PLAY_SLOW, ease: 'easeInOut', opacity: { duration: 1.7 * PLAY_SLOW, times: [0, 0.08, 0.2, 0.35, 0.5, 0.65, 0.8, 0.92, 1] } }}
      />
    )
  return null
}

/** Na frente do corpo: língua e mosquinha, tinta, asinhas e peninha, rastro de brilho. */
export function SpecialFront({ kind, species }: { kind: PetKind; species: SpeciesDef }) {
  if (kind === 'sapinho') {
    const m = MOUTH.sapinho
    const fly = { x: 114, y: 40 }
    return (
      <>
        {/* Mosquinha: chega zumbindo e some quando a língua pega. */}
        <motion.g
          initial={{ opacity: 0, x: 10, y: -8 }}
          animate={{ opacity: [0, 1, 1, 1, 0], x: [10, 3, -2, 1, 0], y: [-8, -2, 2, -1, 0] }}
          transition={{ duration: 0.9 * PLAY_SLOW, times: [0, 0.2, 0.45, 0.62, 0.66] }}
        >
          <ellipse cx={fly.x - 4} cy={fly.y - 5.5} rx={5.5} ry={3.4} fill="#E5E7EB" opacity={0.9} />
          <ellipse cx={fly.x + 4} cy={fly.y - 5.5} rx={5.5} ry={3.4} fill="#E5E7EB" opacity={0.9} />
          <circle cx={fly.x} cy={fly.y} r={4.6} fill="#1F2937" stroke="#9CA3AF" strokeWidth={0.8} />
        </motion.g>
        <motion.path
          d={`M${m.x + 6},${m.y - 3} Q${fly.x - 6},${m.y - 6} ${fly.x},${fly.y}`}
          fill="none"
          stroke="#FF7B9C"
          strokeWidth={5}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: [0, 0, 1, 1, 0], opacity: [0, 1, 1, 1, 0] }}
          transition={{ duration: 1.2 * PLAY_SLOW, times: [0, 0.4, 0.6, 0.68, 1], ease: 'easeInOut' }}
        />
      </>
    )
  }
  if (kind === 'polvinho')
    return (
      <>
        {[
          [30, 98, 10],
          [50, 106, 12],
          [72, 106, 12],
          [92, 98, 10],
          [40, 116, 8],
          [62, 118, 9],
          [84, 114, 8],
        ].map(([x, y, r], i) => (
          <motion.circle
            key={i}
            cx={x}
            cy={y}
            r={r}
            fill="#4C3A75"
            initial={{ opacity: 0, scale: 0.2 }}
            animate={{ opacity: [0, 0.95, 0.75, 0], scale: [0.2, 1.1, 1.5, 1.9], y: [0, 3, 7, 11] }}
            transition={{ duration: 1.7 * PLAY_SLOW, delay: i * 0.05, ease: 'easeOut' }}
          />
        ))}
      </>
    )
  if (kind === 'pintinho') {
    const n = species.anchors.neck
    const y = n.y - 20
    const half = n.w / 2
    return (
      <>
        {/* Asinhas para fora do corpo, batendo a partir do ombro (lado de dentro da caixa). */}
        <motion.ellipse
          cx={n.x - half - 6}
          cy={y}
          rx={12}
          ry={6.5}
          style={{ fill: species.colors.color, stroke: species.colors.detail, strokeWidth: 1.2, originX: 1, originY: 0.5 }}
          animate={{ rotate: [0, 38, 0, 38, 0, 38, 0] }}
          transition={{ duration: 0.9 * PLAY_SLOW }}
        />
        <motion.ellipse
          cx={n.x + half + 6}
          cy={y}
          rx={12}
          ry={6.5}
          style={{ fill: species.colors.color, stroke: species.colors.detail, strokeWidth: 1.2, originX: 0, originY: 0.5 }}
          animate={{ rotate: [0, -38, 0, -38, 0, -38, 0] }}
          transition={{ duration: 0.9 * PLAY_SLOW }}
        />
        {/* Peninha que cai balançando. */}
        <motion.path
          d="M0,-13 C6,-6 6,6 0,13 C-6,6 -6,-6 0,-13 Z M0,-13 L0,15"
          fill="#FDE68A"
          stroke="#C99A2E"
          strokeWidth={1}
          initial={{ x: 86, y: 40, opacity: 0, rotate: 0 }}
          animate={{ x: [86, 98, 88, 100], y: [40, 66, 90, 114], opacity: [0, 1, 1, 0], rotate: [0, 35, -30, 25] }}
          transition={{ duration: 1.7 * PLAY_SLOW, delay: 0.25 * PLAY_SLOW, ease: 'easeInOut' }}
        />
      </>
    )
  }
  if (kind === 'coelho')
    return (
      <>
        {[
          [36, 108],
          [26, 92],
          [36, 74],
          [50, 60],
          [70, 60],
          [84, 74],
          [94, 92],
          [84, 108],
        ].map(([x, y], i) => (
          <motion.path
            key={i}
            d={STAR4(6.5)}
            fill={i % 2 ? '#FFE58A' : '#E9DDFF'}
            initial={{ x, y, opacity: 0, scale: 0.3 }}
            animate={{ opacity: [0, 1, 0], scale: [0.3, 1.3, 0.5], y: [y, y - 8] }}
            transition={{ duration: 0.9 * PLAY_SLOW, delay: (0.08 + i * 0.07) * PLAY_SLOW }}
          />
        ))}
      </>
    )
  return null
}
