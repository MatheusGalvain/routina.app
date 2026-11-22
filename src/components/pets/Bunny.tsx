import { motion, useAnimationControls } from 'framer-motion'
import { useEffect, useId } from 'react'

/**
 * O coelho. Desenho próprio (viewBox 0 0 120 120, como os outros pets):
 *  - corpo perolado com gradiente iridescente que gira e troca de tom devagar (SMIL, sem custo de React);
 *  - orelhas longas, cada uma com o seu tremido em horários aleatórios;
 *  - poeira de estrela em volta (camada `behind`, desenhada atrás do corpo).
 * Os olhos com brilho de estrela e o pulinho parado ficam no Pet.tsx (`starEyes` e `idle: 'hop'`).
 */

const INK = '#0A0D14'

// Perolado → lilás → azul-claro → rosa. Cada parada passeia pelos tons vizinhos.
const STOPS: { offset: number; values: string[] }[] = [
  { offset: 0, values: ['#F7F2FF', '#FFE9F5', '#EAF5FF', '#F7F2FF'] },
  { offset: 0.38, values: ['#DCCBFF', '#C9E6FF', '#FFD6EC', '#DCCBFF'] },
  { offset: 0.7, values: ['#C6E3FF', '#FFD3EA', '#D9C8FF', '#C6E3FF'] },
  { offset: 1, values: ['#FFD3EA', '#DCCBFF', '#CFEAFF', '#FFD3EA'] },
]

function Ear({ x, tilt, delay, gradient, inner }: { x: number; tilt: number; delay: number; gradient: string; inner: string }) {
  const controls = useAnimationControls()
  useEffect(() => {
    let timer: number
    const schedule = (first = false) => {
      timer = window.setTimeout(
        () => {
          const s = Math.sign(tilt)
          void controls.start({ rotate: [0, s * 10, -s * 5, s * 3, 0], transition: { duration: 0.6, ease: 'easeInOut' } })
          schedule()
        },
        (first ? delay : 0) + 2600 + Math.random() * 6500,
      )
    }
    schedule(true)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <g transform={`rotate(${tilt} ${x} 46)`}>
      <motion.g animate={controls} style={{ transformBox: 'fill-box', originX: 0.5, originY: 1 }}>
        <ellipse cx={x} cy={24} rx={9} ry={22} fill={`url(#${gradient})`} />
        <ellipse cx={x} cy={27} rx={4.2} ry={15} fill={`url(#${inner})`} opacity={0.85} />
      </motion.g>
    </g>
  )
}

export function BunnyBody({ adult }: { adult: boolean }) {
  const id = useId().replace(/:/g, '')
  const body = `bunny-body-${id}`
  const inner = `bunny-inner-${id}`
  const sheen = `bunny-sheen-${id}`

  return (
    <>
      <defs>
        <linearGradient id={body} x1="0" y1="0" x2="1" y2="1">
          {STOPS.map((s) => (
            <stop key={s.offset} offset={s.offset} stopColor={s.values[0]}>
              <animate attributeName="stop-color" values={s.values.join(';')} dur="14s" repeatCount="indefinite" />
            </stop>
          ))}
          <animateTransform attributeName="gradientTransform" type="rotate" values="0 .5 .5;360 .5 .5" dur="22s" repeatCount="indefinite" />
        </linearGradient>
        <linearGradient id={inner} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFC4E1" />
          <stop offset="1" stopColor="#D7C2FF" />
        </linearGradient>
        <radialGradient id={sheen} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity=".75" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>

      <Ear x={47} tilt={-12} delay={0} gradient={body} inner={inner} />
      <Ear x={73} tilt={12} delay={1800} gradient={body} inner={inner} />

      {/* Pezinhos, depois cabeça e corpo numa forma só */}
      <ellipse cx="45" cy="102" rx="9" ry="5" fill={`url(#${body})`} />
      <ellipse cx="75" cy="102" rx="9" ry="5" fill={`url(#${body})`} />
      <path d="M60,38 C84,38 96,56 95,74 C94,94 80,104 60,104 C40,104 26,94 25,74 C24,56 36,38 60,38 Z" fill={`url(#${body})`} />
      <ellipse cx="60" cy="93" rx="17" ry="9" fill="#FFFFFF" opacity=".32" />
      <ellipse cx="43" cy="50" rx="13" ry="7" fill={`url(#${sheen})`} transform="rotate(-28 43 50)" />

      <ellipse cx="39" cy="76" rx="5.5" ry="3.2" fill="#FF9EC7" opacity=".5" />
      <ellipse cx="81" cy="76" rx="5.5" ry="3.2" fill="#FF9EC7" opacity=".5" />
      <path d="M57.2,76.4 Q60,74.8 62.8,76.4 Q61.6,79.2 60,79.6 Q58.4,79.2 57.2,76.4 Z" fill="#F59BC4" />
      <path d="M60,79.6 Q58.6,82.6 55.6,81.6 M60,79.6 Q61.4,82.6 64.4,81.6" fill="none" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />

      {adult && (
        // Adulto: uma florzinha na base da orelha.
        <g transform="translate(79 41)">
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="0" cy="-4" rx="2.6" ry="3.6" fill="#FFF4FB" transform={`rotate(${a})`} />
          ))}
          <circle r="2.4" fill="#FFD34D" />
        </g>
      )}
    </>
  )
}

const DUST = [
  { x: 14, y: 42, r: 3, d: 0, t: 4.2, star: true, c: '#FFFFFF' },
  { x: 106, y: 34, r: 2.2, d: 1.1, t: 3.6, star: false, c: '#E4D6FF' },
  { x: 8, y: 78, r: 1.8, d: 2.3, t: 4.8, star: false, c: '#CDE9FF' },
  { x: 110, y: 72, r: 3.2, d: 0.6, t: 5.2, star: true, c: '#FFE3F1' },
  { x: 26, y: 12, r: 2, d: 3.1, t: 4, star: false, c: '#FFFFFF' },
  { x: 96, y: 8, r: 2.6, d: 1.9, t: 4.6, star: true, c: '#DCCBFF' },
  { x: 104, y: 104, r: 1.8, d: 2.8, t: 3.8, star: false, c: '#FFD9EC' },
  { x: 14, y: 106, r: 2.6, d: 0.3, t: 5, star: true, c: '#CDE9FF' },
]

const sparkle = (r: number) => `M0,${-r} Q0,0 ${r},0 Q0,0 0,${r} Q0,0 ${-r},0 Q0,0 0,${-r} Z`

/** Partículas de luz pequenas, bem sutis, que aparecem e somem em volta do coelho. */
export function Stardust() {
  return (
    <g aria-hidden="true">
      {DUST.map((p, i) => (
        <g key={i} transform={`translate(${p.x} ${p.y})`}>
          <motion.path
            d={p.star ? sparkle(p.r * 1.4) : `M0,0 m${-p.r / 2},0 a${p.r / 2},${p.r / 2} 0 1,0 ${p.r},0 a${p.r / 2},${p.r / 2} 0 1,0 ${-p.r},0`}
            fill={p.c}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.85, 0], y: [2, -5], scale: [0.6, 1, 0.7] }}
            transition={{ duration: p.t, delay: p.d, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformBox: 'fill-box', originX: 0.5, originY: 0.5, filter: `drop-shadow(0 0 2px ${p.c})` }}
          />
        </g>
      ))}
    </g>
  )
}
