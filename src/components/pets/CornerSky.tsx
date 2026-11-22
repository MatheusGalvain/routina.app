import { useId } from 'react'
import type { Area, AreaId, DefaultAreaKey } from '../../types'

/**
 * Céu do cantinho (viewBox 0 0 400 240): fundo escuro, halo atrás do pet, estrelinhas neutras
 * e uma constelação por área (só as 4 mais ativas da semana). Cada dia com a área concluída
 * nos últimos 7 acende uma parte das estrelas dela; as acesas piscam devagar (CSS, `.twinkle`,
 * desligado com prefers-reduced-motion).
 */

export const SCENE = { W: 400, H: 240, FLOOR: 186 }

type Constellation = { stars: [number, number][]; edges: [number, number][] }

/** Constelações em caixas de 70 × 44. `edges` liga os índices de `stars`. */
const CONSTELLATIONS: Record<DefaultAreaKey, Constellation> = {
  sono: { stars: [[8, 30], [22, 12], [44, 8], [62, 20]], edges: [[0, 1], [1, 2], [2, 3]] },
  corpo: { stars: [[6, 36], [20, 20], [34, 30], [48, 10], [64, 24]], edges: [[0, 1], [1, 2], [2, 3], [3, 4]] },
  foco: { stars: [[10, 34], [36, 8], [62, 34]], edges: [[0, 1], [1, 2], [2, 0]] },
  casa: { stars: [[12, 38], [12, 18], [35, 4], [58, 18], [58, 38]], edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]] },
  financas: { stars: [[35, 4], [60, 22], [35, 40], [10, 22]], edges: [[0, 1], [1, 2], [2, 3], [3, 0]] },
  estudo: { stars: [[8, 10], [30, 14], [52, 10], [30, 38]], edges: [[0, 1], [1, 2], [1, 3]] },
  mente: { stars: [[14, 30], [35, 10], [56, 30]], edges: [[0, 1], [1, 2]] },
  social: { stars: [[8, 22], [24, 8], [35, 24], [46, 8], [62, 22]], edges: [[0, 1], [1, 2], [2, 3], [3, 4]] },
}

/** Regiões do céu para as constelações, da área mais ativa para a menos (o meio fica livre para o pet). */
const REGIONS: [number, number][] = [
  [26, 18],
  [304, 16],
  [44, 96],
  [286, 100],
]

/** Estrelas acesas: proporcional aos dias (7 dias = todas). Pelo menos uma se houve algum dia. */
export const litStars = (days: number, total: number) => (days <= 0 ? 0 : Math.min(total, Math.ceil((days * total) / 7)))

// Estrelinhas neutras de fundo, sempre no mesmo lugar.
const DUST = Array.from({ length: 44 }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1
  return { x: r(1) * 400, y: r(2) * 176, r: 0.45 + r(3) * 0.6, o: 0.12 + r(4) * 0.2 }
})

const SHAPES = Object.values(CONSTELLATIONS)

/** Forma da constelação: a própria nas áreas padrão; nas criadas pela pessoa, uma das 8, sempre a mesma para o mesmo id. */
export function constellationOf(id: AreaId): Constellation {
  if (id in CONSTELLATIONS) return CONSTELLATIONS[id as DefaultAreaKey]
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return SHAPES[h % SHAPES.length]
}

export function CornerSky({ areas, days, aura, shadows = [] }: { areas: Area[]; days: Record<AreaId, number>; aura: string; shadows?: number[] }) {
  const id = useId().replace(/:/g, '')
  const { W, H, FLOOR } = SCENE
  return (
    <>
      <defs>
        <linearGradient id={`sky-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--color-ink)' }} />
          <stop offset="1" style={{ stopColor: 'var(--color-panel)' }} />
        </linearGradient>
        <radialGradient id={`halo-${id}`}>
          <stop offset="0" stopOpacity=".2" style={{ stopColor: aura, transition: 'stop-color .6s ease' }} />
          <stop offset="1" stopOpacity="0" style={{ stopColor: aura, transition: 'stop-color .6s ease' }} />
        </radialGradient>
        <radialGradient id={`shadow-${id}`}>
          <stop offset="0" stopColor="black" stopOpacity=".6" />
          <stop offset="1" stopColor="black" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width={W} height={H} fill={`url(#sky-${id})`} />
      {DUST.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} style={{ fill: 'var(--color-fg)' }} opacity={d.o} />
      ))}
      <ellipse cx="200" cy="140" rx="118" ry="88" fill={`url(#halo-${id})`} />

      {areas.slice(0, REGIONS.length).map((a, i) => {
        const c = constellationOf(a.id)
        const color = a.color
        const lit = litStars(days[a.id] ?? 0, c.stars.length)
        const [ox, oy] = REGIONS[i]
        return (
          <g key={a.id} transform={`translate(${ox} ${oy})`}>
            {c.edges.map(([p, q]) => {
              const on = p < lit && q < lit
              return (
                <line
                  key={`${p}-${q}`}
                  x1={c.stars[p][0]}
                  y1={c.stars[p][1]}
                  x2={c.stars[q][0]}
                  y2={c.stars[q][1]}
                  stroke={color}
                  strokeWidth={0.8}
                  strokeOpacity={on ? 0.35 : 0.1}
                  strokeLinecap="round"
                />
              )
            })}
            {c.stars.map(([x, y], s) =>
              s < lit ? (
                <g key={s} className="twinkle" style={{ animationDelay: `${(s * 0.9 + i * 0.6) % 4}s` }}>
                  <circle cx={x} cy={y} r={4.5} fill={color} opacity={0.18} />
                  <circle cx={x} cy={y} r={1.9} fill={color} />
                  <circle cx={x} cy={y} r={0.8} style={{ fill: 'var(--color-fg)' }} opacity={0.85} />
                </g>
              ) : (
                <circle key={s} cx={x} cy={y} r={1.4} fill={color} opacity={0.12} />
              ),
            )}
          </g>
        )
      })}

      {/* Chão: só uma linha fina e a sombra do pet. */}
      <path d={`M0,${FLOOR} H${W}`} style={{ stroke: 'var(--color-line-2)' }} strokeWidth="1" />
      <ellipse cx="200" cy={FLOOR + 1} rx="44" ry="5" fill={`url(#shadow-${id})`} />
      {shadows.map((x) => (
        <ellipse key={x} cx={x} cy={FLOOR + 1} rx="17" ry="3" fill={`url(#shadow-${id})`} />
      ))}
    </>
  )
}
