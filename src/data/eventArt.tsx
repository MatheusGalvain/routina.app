import type { CSSProperties, ReactNode } from 'react'
import type { Anchor } from './accessories'
import { edge, pick } from '../lib/color'

/**
 * Desenhos dos eventos sazonais (src/data/events.ts): acessórios (no ponto de ancoragem do slot,
 * como em accessories.tsx) e troféus (viewBox 0 0 40 48, apoiados em y = 47, como em trophies.tsx).
 * Os de Carnaval e Festa Junina já estão aqui, prontos para quando os eventos forem ligados.
 */

const SNOW = '#F8FAFC'

// ---------------------------------------------------------------------
// Acessórios
// ---------------------------------------------------------------------

/** Gorrinho de Natal: cone vermelho caído para o lado, barra branca e pompom. */
export function gorroNatal({ x, y, w }: Anchor, body: string): ReactNode {
  const white = edge(SNOW, body, '#94A3B8')
  return (
    <g>
      <path
        d={`M${x - w * 0.46},${y + 1} Q${x - w * 0.22},${y - 27} ${x + w * 0.16},${y - 31} Q${x + w * 0.4},${y - 32} ${x + w * 0.55},${y - 19} Q${x + w * 0.28},${y - 15} ${x + w * 0.46},${y + 1} Z`}
        fill="#E5484D"
      />
      <path d={`M${x - w * 0.1},${y - 22} Q${x + w * 0.12},${y - 27} ${x + w * 0.3},${y - 25}`} fill="none" stroke="#FFFFFF" strokeOpacity=".3" strokeWidth={2} strokeLinecap="round" />
      <circle cx={x + w * 0.56} cy={y - 17} r={5.2} fill={SNOW} {...white} />
      <rect x={x - w * 0.56} y={y - 4.5} width={w * 1.12} height={9.5} rx={4.75} fill={SNOW} {...white} />
    </g>
  )
}

/** Cachecol listrado (vermelho e branco), com a ponta caindo. */
export function cachecolListrado({ x, y, w }: Anchor, body: string): ReactNode {
  const red = pick(body, '#E5484D', '#9F1239')
  return (
    <g>
      <g transform={`rotate(-8 ${x + w * 0.12} ${y})`}>
        <rect x={x + w * 0.12} y={y - 2} width={11} height={22} rx={4} fill={red} />
        {[4, 10, 16].map((dy) => (
          <rect key={dy} x={x + w * 0.12} y={y - 2 + dy} width={11} height={3} fill={SNOW} />
        ))}
      </g>
      <rect x={x - w / 2} y={y - 6} width={w} height={12} rx={6} fill={red} />
      {[-0.34, -0.14, 0.06, 0.26].map((f) => (
        <rect key={f} x={x + w * f} y={y - 6} width={4.5} height={12} fill={SNOW} />
      ))}
    </g>
  )
}

/** Chapéu de festa: cone listrado com pompom e elástico. */
export function chapeuFesta({ x, y, w }: Anchor, body: string): ReactNode {
  const cone = pick(body, '#8B5CF6', '#5B21B6')
  const half = w * 0.3
  const top = y - 36
  // Faixas diagonais: segmentos entre as duas laterais do cone.
  const at = (t: number, side: -1 | 1) => [x + side * half * (1 - t) + 2 * t, y + 2 + (top - y - 2) * t] as const
  return (
    <g>
      <path d={`M${x - half},${y + 2} L${x + 2},${top} L${x + half},${y + 2} Z`} fill={cone} />
      {[0.22, 0.5, 0.76].map((t) => {
        const [x1, y1] = at(t, -1)
        const [x2, y2] = at(t + 0.1, 1)
        return <path key={t} d={`M${x1},${y1} L${x2},${y2}`} stroke="#FDE68A" strokeWidth={3} strokeLinecap="round" />
      })}
      <circle cx={x + 2} cy={top - 2} r={4.6} fill="#FB7185" />
      <path d={`M${x - half},${y + 2} Q${x},${y + 6} ${x + half},${y + 2}`} fill="none" stroke="#FDE68A" strokeWidth={2.4} strokeLinecap="round" />
    </g>
  )
}

/** (Carnaval) Máscara de baile: cobre os dois olhos, com brilhos. */
export function mascaraCarnaval({ x, y, w }: Anchor, body: string): ReactNode {
  const l = x - w / 2
  const r = x + w / 2
  const fill = pick(body, '#EC4899', '#9D174D')
  return (
    <g>
      <path
        d={`M${l - 15},${y - 2} Q${l - 12},${y - 14} ${l},${y - 12} Q${x},${y - 6} ${r},${y - 12} Q${r + 12},${y - 14} ${r + 15},${y - 2} Q${r + 10},${y + 12} ${r},${y + 9} Q${x},${y + 2} ${l},${y + 9} Q${l - 10},${y + 12} ${l - 15},${y - 2} Z`}
        fill={fill}
      />
      <ellipse cx={l} cy={y} rx={7} ry={5.5} fill="#0A0D14" fillOpacity={0.55} />
      <ellipse cx={r} cy={y} rx={7} ry={5.5} fill="#0A0D14" fillOpacity={0.55} />
      <circle cx={r + 13} cy={y - 12} r={2.2} fill="#FDE68A" />
      <circle cx={l - 12} cy={y - 11} r={1.6} fill="#5EEAD4" />
    </g>
  )
}

/** (Festa Junina) Chapéu de palha com remendo. */
export function chapeuPalha({ x, y, w }: Anchor): ReactNode {
  return (
    <g>
      <ellipse cx={x} cy={y} rx={w * 0.72} ry={6} fill="#E3B867" />
      <path d={`M${x - w * 0.34},${y} Q${x - w * 0.3},${y - 20} ${x},${y - 21} Q${x + w * 0.3},${y - 20} ${x + w * 0.34},${y} Z`} fill="#D9A84E" />
      <rect x={x - w * 0.34} y={y - 6} width={w * 0.68} height={4} fill="#B45309" />
      <rect x={x + w * 0.08} y={y - 16} width={7} height={6} rx={1} fill="#F59E0B" transform={`rotate(12 ${x + w * 0.1} ${y - 13})`} />
    </g>
  )
}

// ---------------------------------------------------------------------
// Troféus (um nível só; o metal usa var(--t), as partes neutras var(--n))
// ---------------------------------------------------------------------

const T: CSSProperties = { fill: 'var(--t)' }
const N: CSSProperties = { fill: 'var(--n)' }
const Base = () => <rect x="10" y="41" width="20" height="6" rx="2" style={N} />

/** Floco de neve de seis pontas num pedestal. */
export function trofeuFloco(): ReactNode {
  const arms = [0, 60, 120, 180, 240, 300]
  return (
    <>
      <Base />
      <rect x="18.5" y="33" width="3" height="9" style={N} />
      <g transform="translate(20 18)">
        {arms.map((a) => (
          <g key={a} transform={`rotate(${a})`}>
            <rect x="-1.6" y="-15" width="3.2" height="15" rx="1.6" style={T} />
            <path d="M0,-10 L-4.5,-14 M0,-10 L4.5,-14 M0,-5 L-3.5,-8 M0,-5 L3.5,-8" stroke="var(--t)" strokeWidth="2.2" strokeLinecap="round" />
          </g>
        ))}
        <circle r="3.4" style={N} />
      </g>
    </>
  )
}

/** Virada: relógio marcando meia-noite, com faíscas. */
export function trofeuVirada(): ReactNode {
  return (
    <>
      <Base />
      <rect x="18.5" y="34" width="3" height="8" style={N} />
      <circle cx="20" cy="20" r="14" style={T} />
      <circle cx="20" cy="20" r="10.5" style={N} />
      {[0, 90, 180, 270].map((a) => (
        <rect key={a} x="19.2" y="10.5" width="1.6" height="3" style={T} transform={`rotate(${a} 20 20)`} />
      ))}
      <path d="M20,20 V12.5 M20,20 L21.5,13" stroke="var(--t)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="20" cy="20" r="1.6" style={T} />
      <path d="M35,5 l1.2,3 3,1.2 -3,1.2 -1.2,3 -1.2,-3 -3,-1.2 3,-1.2 Z M5,6 l.9,2.2 2.2,.9 -2.2,.9 -.9,2.2 -.9,-2.2 -2.2,-.9 2.2,-.9 Z" style={T} />
    </>
  )
}

/** (Carnaval) Confete: serpentina em espiral num pedestal. */
export function trofeuConfete(): ReactNode {
  return (
    <>
      <Base />
      <rect x="18.5" y="32" width="3" height="10" style={N} />
      <path d="M20,32 C8,30 8,20 18,19 C28,18 28,10 18,8 C12,7 10,4 13,2" fill="none" stroke="var(--t)" strokeWidth="3.4" strokeLinecap="round" />
      <rect x="27" y="22" width="4" height="4" rx="1" style={T} transform="rotate(20 29 24)" />
      <rect x="6" y="12" width="3.5" height="3.5" rx="1" style={T} transform="rotate(-15 8 14)" />
    </>
  )
}

/** (Festa Junina) Fogueira: lenha cruzada e chama. */
export function trofeuFogueira(): ReactNode {
  return (
    <>
      <rect x="6" y="38" width="28" height="5" rx="2.5" style={N} transform="rotate(-12 20 40)" />
      <rect x="6" y="38" width="28" height="5" rx="2.5" style={N} transform="rotate(12 20 40)" />
      <path d="M20,38 C9,36 10,24 16,18 C16,24 19,25 20,22 C20,15 23,9 27,6 C26,13 32,18 31,27 C30,34 26,37 20,38 Z" style={T} />
      <path d="M20,36 C15,35 15,29 18,26 C19,30 21,29 22,27 C24,30 25,34 20,36 Z" fill="#FFFFFF" fillOpacity=".35" />
    </>
  )
}

/**
 * Troféu de evento. `color` = cor do metal; `silhouette` = forma escura (ainda não conquistado).
 * Mesmo tamanho e proporção do <Trophy> (40 × 48 + folga para os brilhos).
 */
export function EventTrophyArt({ draw, color, size = 48, silhouette = false, className = '' }: { draw: () => ReactNode; color: string; size?: number; silhouette?: boolean; className?: string }) {
  const vars = { '--t': silhouette ? '#161B27' : color, '--n': silhouette ? '#11151F' : '#3A3A3A' } as CSSProperties
  return (
    <svg
      viewBox="-6 -2 52 50"
      width={(size * 52) / 50}
      height={size}
      aria-hidden="true"
      className={className}
      style={{ ...vars, overflow: 'visible', filter: silhouette ? 'drop-shadow(0 0 3px rgba(154,163,181,.18))' : `drop-shadow(0 0 6px ${color}55)` }}
    >
      {draw()}
    </svg>
  )
}
