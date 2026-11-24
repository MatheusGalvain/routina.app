import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

/**
 * Decorações de época dos cenários (viewBox 640 × 320, o mesmo do SceneStage) e o coelho da lua cheia.
 * As animações usam as classes sc-* (index.css): com movimento reduzido a neve e o confete param
 * onde estão, e os fogos somem (só aparecem animando).
 * O SceneStage escolhe a camada de profundidade de cada peça (src/data/events.ts diz quais peças).
 */

const W = 640
const H = 320

function rng(seed: number) {
  let a = seed || 1
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Pontos ao longo de uma curva quadrática (de `a` a `b`, com controle `c`). */
function along(a: [number, number], c: [number, number], b: [number, number], n: number) {
  return Array.from({ length: n }, (_, i) => {
    const t = (i + 0.5) / n
    const u = 1 - t
    return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]] as const
  })
}

const vars = (v: Record<string, string>) => v as CSSProperties

// ---------------------------------------------------------------------
// Queda (neve e confete)
// ---------------------------------------------------------------------

/** Neve caindo devagar, por cima de tudo. Parada, fica espalhada pelo céu. */
export function Snow({ seed, preview }: { seed: number; preview: boolean }) {
  const flakes = useMemo(() => {
    const r = rng(seed ^ 0x5e0e)
    return Array.from({ length: preview ? 28 : 70 }, () => {
      const y = r() * H
      const d = 12 + r() * 10
      return {
        x: r() * W,
        y,
        r: 0.7 + r() * 1.7,
        o: 0.45 + r() * 0.45,
        style: vars({ '--from': `${-(y + 8)}px`, '--to': `${H + 8 - y}px`, '--x': `${(r() - 0.5) * 36}px`, '--d': `${d}s`, '--dl': `${-r() * d}s` }),
      }
    })
  }, [seed, preview])
  return (
    <g>
      {flakes.map((f, i) => (
        <circle key={i} className="sc-anim sc-fall" cx={f.x} cy={f.y} r={f.r} fill="#F8FAFC" opacity={f.o} style={f.style} />
      ))}
    </g>
  )
}

const CONFETTI = ['#F472B6', '#FDE68A', '#5EEAD4', '#A78BFA', '#FB923C', '#7DD3FC']

/** Confete caindo e girando (Carnaval). */
export function Confetti({ seed, preview }: { seed: number; preview: boolean }) {
  const bits = useMemo(() => {
    const r = rng(seed ^ 0xc0f3)
    return Array.from({ length: preview ? 22 : 54 }, (_, i) => {
      const y = r() * H
      const d = 9 + r() * 7
      return {
        x: r() * W,
        y,
        w: 2 + r() * 2.5,
        fill: CONFETTI[i % CONFETTI.length],
        style: vars({ '--from': `${-(y + 8)}px`, '--to': `${H + 8 - y}px`, '--x': `${(r() - 0.5) * 50}px`, '--d': `${d}s`, '--dl': `${-r() * d}s`, '--rot': `${r() > 0.5 ? 540 : -540}deg` }),
      }
    })
  }, [seed, preview])
  return (
    <g>
      {bits.map((b, i) => (
        <rect key={i} className="sc-anim sc-fall sc-spin" x={b.x} y={b.y} width={b.w} height={b.w * 1.6} rx={0.6} fill={b.fill} opacity={0.85} style={b.style} />
      ))}
    </g>
  )
}

// ---------------------------------------------------------------------
// Céu
// ---------------------------------------------------------------------

/** Estrela-guia (cosmos): grande, com halo e um raio comprido para baixo. */
export function GuideStar() {
  const x = 96
  const y = 50
  const ray = (len: number, w: number) => `M${x},${y - len} L${x + w},${y - w} L${x + len * 0.55},${y} L${x + w},${y + w} L${x},${y + len * 1.6} L${x - w},${y + w} L${x - len * 0.55},${y} L${x - w},${y - w} Z`
  return (
    <g>
      <circle cx={x} cy={y} r={30} fill="#FFF3C4" opacity=".12" filter="url(#hd-blur6)" />
      <path d={`M${x},${y + 8} L${x},${y + 70}`} stroke="#FFF3C4" strokeOpacity=".18" strokeWidth="1.2" strokeLinecap="round" />
      <g className="sc-anim sc-glowpulse">
        <path d={ray(16, 3)} fill="#FFF3C4" filter="url(#hd-glow)" />
      </g>
      <path d={ray(9, 1.8)} fill="#FFFFFF" />
    </g>
  )
}

const BURSTS = [
  { x: 150, y: 70, color: '#FDE68A', dl: 0 },
  { x: 470, y: 52, color: '#F9A8D4', dl: 3.4 },
  { x: 330, y: 92, color: '#93C5FD', dl: 6.6 },
  { x: 560, y: 120, color: '#86EFAC', dl: 8.2 },
]

/** Fogos de artifício de vez em quando (cada estouro a cada ~10 s, desencontrados). */
export function Fireworks({ preview }: { preview: boolean }) {
  const list = preview ? BURSTS.slice(0, 2) : BURSTS
  return (
    <g>
      {list.map((b, i) => (
        <g key={i} className="sc-anim sc-burst" style={vars({ '--dl': `${b.dl}s`, '--d': '10s' })}>
          {Array.from({ length: 12 }, (_, k) => {
            const a = (k / 12) * Math.PI * 2
            const c = Math.cos(a)
            const s = Math.sin(a)
            return (
              <g key={k}>
                <line x1={b.x + c * 5} y1={b.y + s * 5} x2={b.x + c * 17} y2={b.y + s * 17} stroke={b.color} strokeWidth="1.4" strokeLinecap="round" opacity=".85" />
                <circle cx={b.x + c * 21} cy={b.y + s * 21} r={1.6} fill={b.color} />
              </g>
            )
          })}
          <circle cx={b.x} cy={b.y} r={3} fill="#FFFFFF" opacity=".9" />
        </g>
      ))}
    </g>
  )
}

// ---------------------------------------------------------------------
// Fios (luzinhas e bandeirinhas)
// ---------------------------------------------------------------------

type Wire = { a: [number, number]; c: [number, number]; b: [number, number]; n: number }

/** Fios de luzinhas nas árvores da floresta: dois nas árvores do meio e um comprido ao fundo. */
export const LIGHT_WIRES: { front: Wire[]; back: Wire[] } = {
  front: [
    { a: [14, 150], c: [70, 196], b: [148, 166], n: 9 },
    { a: [488, 166], c: [560, 204], b: [634, 150], n: 9 },
  ],
  back: [{ a: [-10, 176], c: [320, 236], b: [650, 172], n: 22 }],
}

const BULBS = ['#FF6B6B', '#FDE68A', '#6EE7B7', '#93C5FD', '#F9A8D4']

/** Um ou mais fios de luzinhas piscando. `small` = fio do fundo (menor e mais fraco). */
export function Lights({ wires, small = false }: { wires: Wire[]; small?: boolean }) {
  const k = small ? 0.7 : 1
  return (
    <g opacity={small ? 0.75 : 1}>
      {wires.map((w, i) => (
        <g key={i}>
          <path d={`M${w.a[0]},${w.a[1]} Q${w.c[0]},${w.c[1]} ${w.b[0]},${w.b[1]}`} fill="none" stroke="#0B1612" strokeWidth={0.9 * k} />
          {along(w.a, w.c, w.b, w.n).map(([x, y], j) => {
            const color = BULBS[(j + i) % BULBS.length]
            return (
              <g key={j} className="sc-anim sc-tw" style={vars({ '--d': `${2.2 + ((j * 7) % 5) * 0.35}s`, '--dl': `${((j * 3 + i) % 6) * 0.4}s` })}>
                <circle cx={x} cy={y + 3 * k} r={6 * k} fill={color} opacity=".22" />
                <ellipse cx={x} cy={y + 3 * k} rx={2.1 * k} ry={2.8 * k} fill={color} />
              </g>
            )
          })}
        </g>
      ))}
    </g>
  )
}

const FLAGS = ['#F87171', '#FDE68A', '#60A5FA', '#34D399', '#F472B6', '#FB923C']

/** Bandeirinhas (Festa Junina): dois varais no alto do céu. */
export function Bunting() {
  const wires: Wire[] = [
    { a: [-10, 24], c: [170, 70], b: [340, 30], n: 14 },
    { a: [300, 34], c: [480, 78], b: [650, 26], n: 14 },
  ]
  return (
    <g>
      {wires.map((w, i) => (
        <g key={i}>
          <path d={`M${w.a[0]},${w.a[1]} Q${w.c[0]},${w.c[1]} ${w.b[0]},${w.b[1]}`} fill="none" stroke="#CBD5E1" strokeOpacity=".55" strokeWidth=".8" />
          {along(w.a, w.c, w.b, w.n).map(([x, y], j) => (
            <path key={j} d={`M${x - 5},${y} L${x + 5},${y} L${x},${y + 10} Z`} fill={FLAGS[(j + i * 3) % FLAGS.length]} opacity=".85" />
          ))}
        </g>
      ))}
    </g>
  )
}

// ---------------------------------------------------------------------
// Coelho da lua cheia
// ---------------------------------------------------------------------

/** Já passou nesta visita ao app (a passagem natural acontece uma vez a cada abertura). */
let bunnyPassed = false

/** Duração da passagem (s): cruzando o céu, ou parada num canto com movimento reduzido. */
const PASS_S = 4
const STILL_S = 6

/**
 * Silhueta do coelho de cristal cruzando o céu numa noite de lua cheia, uma vez por abertura do app.
 * Durante a passagem ela é um botão ("Algo brilhou no céu"): tocar antes de sumir chama `onCatch`.
 * Com movimento reduzido, fica parada num canto do céu por 6 s.
 *  - `natural`: pode passar sozinha (lua cheia de verdade e coelho ainda não desbloqueado).
 *  - `trigger`: muda quando o painel dev dispara a passagem; tocar nessa passagem é só visual (`onCatch(true)`).
 * `top` = altura do chão da silhueta, em % da altura do cenário.
 */
export function MoonBunnyPass({
  top,
  reduced,
  trigger,
  natural,
  onCatch,
}: {
  top: number
  reduced: boolean
  trigger: number
  natural: boolean
  onCatch: (simulated: boolean) => void
}) {
  const [run, setRun] = useState<{ id: number; simulated: boolean } | null>(null)

  // Passagem natural: alguns segundos depois de abrir, uma vez só.
  useEffect(() => {
    if (!natural || bunnyPassed) return
    const t = window.setTimeout(() => {
      bunnyPassed = true
      setRun({ id: Date.now(), simulated: false })
    }, 3000 + Math.random() * 5000)
    return () => window.clearTimeout(t)
  }, [natural])

  // Painel dev: passa na hora a cada toque (não repete ao montar de novo com o mesmo número).
  const mountedWith = useRef(trigger)
  useEffect(() => {
    if (!trigger || trigger === mountedWith.current) return
    setRun({ id: trigger, simulated: true })
  }, [trigger])

  useEffect(() => {
    if (!run) return
    const t = window.setTimeout(() => setRun(null), (reduced ? STILL_S : PASS_S) * 1000)
    return () => window.clearTimeout(t)
  }, [run, reduced])

  return (
    <AnimatePresence>
      {run && (
        <motion.button
          key={run.id}
          type="button"
          aria-label="Algo brilhou no céu"
          onClick={() => {
            const simulated = run.simulated
            setRun(null)
            onCatch(simulated)
          }}
          className="absolute z-10 grid -translate-x-1/2 -translate-y-[80%] cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0"
          style={{ top: reduced ? '24%' : `${top}%`, width: 'max(48px, 8%)', aspectRatio: '1' }}
          initial={reduced ? { left: '86%', opacity: 0 } : { left: '-8%', opacity: 1 }}
          animate={reduced ? { left: '86%', opacity: 1 } : { left: '108%', opacity: 1 }}
          exit={{ opacity: 0, scale: 1.4, transition: { duration: 0.35 } }}
          transition={reduced ? { duration: 0.5 } : { left: { duration: PASS_S, ease: 'linear' } }}
        >
          <motion.svg
            viewBox="-24 -40 48 48"
            className="h-full w-full overflow-visible"
            aria-hidden="true"
            animate={reduced ? undefined : { y: [0, -9, 0] }}
            transition={reduced ? undefined : { duration: 0.5, repeat: Infinity, ease: 'easeOut' }}
          >
            <defs>
              <radialGradient id="hd-moonBunnyGlow">
                <stop offset="0" stopColor="#E6DCFF" stopOpacity=".55" />
                <stop offset="1" stopColor="#CDB8FF" stopOpacity="0" />
              </radialGradient>
            </defs>
            {/* Brilho suave: é o "algo brilhou" que convida a tocar. */}
            <motion.circle
              cx="2"
              cy="-14"
              r="20"
              fill="url(#hd-moonBunnyGlow)"
              animate={reduced ? undefined : { opacity: [0.5, 1, 0.5] }}
              transition={reduced ? undefined : { duration: 1.2, repeat: Infinity }}
            />
            <g fill="#05070C" stroke="#CDB8FF" strokeOpacity=".7" strokeWidth=".9">
              <ellipse cx="0" cy="-8" rx="11" ry="7.5" />
              <circle cx="10" cy="-15" r="6" />
              <ellipse cx="8" cy="-27" rx="2.2" ry="7.5" transform="rotate(-14 8 -27)" />
              <ellipse cx="12.5" cy="-26" rx="2.2" ry="7" transform="rotate(12 12.5 -26)" />
              <circle cx="-11" cy="-10" r="3.2" />
              <ellipse cx="5" cy="-1" rx="5" ry="2.4" />
            </g>
          </motion.svg>
        </motion.button>
      )}
    </AnimatePresence>
  )
}
