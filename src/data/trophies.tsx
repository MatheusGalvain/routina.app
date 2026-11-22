import { useId, type CSSProperties, type ReactNode } from 'react'
import { useReducedMotion } from 'framer-motion'
import type { DefaultAreaKey } from '../types'
import type { Stats } from '../lib/stats'
import { crescent } from './accessories'

/**
 * Troféus do cantinho. Cada um tem 4 níveis (bronze, prata, ouro, cristal) e um desenho
 * (viewBox 0 0 40 48, apoiado em y = 47) em que:
 *  - o metal usa `var(--t)` (cor do nível; no cristal, um gradiente perolado);
 *  - as partes neutras usam `var(--n)` (#2A3142).
 *
 * Para criar um troféu novo, basta incluir um item em TROPHIES. Para uma área da vida,
 * use `areaTrophy(...)` (metas de 7 / 30 / 90 / 200 dias com a área concluída).
 */

export type TrophyTier = 1 | 2 | 3 | 4

export const TIERS: Record<TrophyTier, { name: string; color: string }> = {
  1: { name: 'bronze', color: '#C98A5B' },
  2: { name: 'prata', color: '#C9CED8' },
  3: { name: 'ouro', color: '#FFC24B' },
  4: { name: 'cristal', color: '#E4D6FF' },
}
export const TIER_LIST: TrophyTier[] = [1, 2, 3, 4]

export const NEUTRAL = '#2A3142'

/** O que os troféus consultam (tudo vem de src/lib/stats.ts). */
export type TrophyStats = Pick<Stats, 'bestStreak' | 'blocksDone' | 'activeWeeks' | 'areaDaysTotal'>

interface TrophyDef<I extends string = string> {
  id: I
  name: string
  /** Metas de cada nível: bronze, prata, ouro, cristal. */
  goals: readonly [number, number, number, number]
  /** Valor atual para as metas. */
  value: (s: TrophyStats) => number
  /** Unidade da meta, no singular e no plural ("faltam 4 dias"). */
  unit: readonly [string, string]
  /** Como se conquista (para a coleção). */
  hint: string
  /** Troféu de área: a chave da área padrão que ele acompanha. */
  area?: DefaultAreaKey
  draw: () => ReactNode
}

const T: CSSProperties = { fill: 'var(--t)' }
const N: CSSProperties = { fill: 'var(--n)' }
const SHINE = { fill: 'none', stroke: '#FFFFFF', strokeOpacity: 0.35, strokeWidth: 1.6, strokeLinecap: 'round' as const }

/** Base comum dos troféus de pé. */
const Base = () => <rect x="10" y="41" width="20" height="6" rx="2" style={N} />

function starPath(cx: number, cy: number, R: number, r: number) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rad = i % 2 ? r : R
    return `${(cx + Math.cos(a) * rad).toFixed(2)},${(cy + Math.sin(a) * rad).toFixed(2)}`
  })
  return `M${pts.join(' L')} Z`
}

/**
 * Troféu de uma área da vida: dias com bloco da área concluído (7 / 30 / 90 / 200).
 * Fica preso à chave original da área padrão (ex.: "sono"), mesmo se a pessoa renomear.
 * Se a área for excluída, o que já foi conquistado fica e o progresso para de avançar
 * (os blocos dela passam para outra área, então não entram dias novos nessa chave).
 */
function areaTrophy<I extends string>(id: I, area: DefaultAreaKey, name: string, areaName: string, draw: () => ReactNode): TrophyDef<I> {
  return {
    id,
    name,
    goals: [7, 30, 90, 200],
    value: (s) => s.areaDaysTotal[area] ?? 0,
    unit: ['dia', 'dias'],
    hint: `Dias com bloco de ${areaName} concluído`,
    area,
    draw,
  }
}

export const TROPHIES = [
  {
    id: 'taca',
    name: 'Taça',
    goals: [3, 7, 21, 60],
    value: (s) => s.bestStreak,
    unit: ['dia', 'dias'],
    hint: 'Maior sequência de dias ativos',
    draw: () => (
      <>
        <Base />
        <rect x="13.5" y="37" width="13" height="4.5" rx="1.5" style={N} />
        <rect x="18" y="28" width="4" height="10" style={T} />
        <path d="M8.5,10 C2,10 2,21 10,22 M31.5,10 C38,10 38,21 30,22" fill="none" strokeWidth="2.6" strokeLinecap="round" style={{ stroke: 'var(--t)' }} />
        <path d="M8,7 H32 V13 C32,23 27,29.5 20,29.5 C13,29.5 8,23 8,13 Z" style={T} />
        <path d="M12.5,10.5 V14 C12.5,18 14,21 16,23" {...SHINE} />
      </>
    ),
  },
  {
    id: 'medalha',
    name: 'Medalha',
    goals: [25, 100, 300, 1000],
    value: (s) => s.blocksDone,
    unit: ['bloco', 'blocos'],
    hint: 'Blocos concluídos',
    draw: () => (
      <>
        <rect x="11" y="42" width="18" height="5" rx="2" style={N} />
        <path d="M11,3 H18 L24,19 L18,21.5 Z M29,3 H22 L16,19 L22,21.5 Z" style={N} />
        <circle cx="20" cy="31" r="11" style={T} />
        <circle cx="20" cy="31" r="7" fill="none" stroke="#FFFFFF" strokeOpacity=".28" strokeWidth="1.3" />
        <path d="M14.5,26.5 A7.5,7.5 0 0 1 19,23.6" {...SHINE} />
      </>
    ),
  },
  {
    id: 'estrela',
    name: 'Estrela',
    goals: [1, 4, 12, 26],
    value: (s) => s.activeWeeks,
    unit: ['semana', 'semanas'],
    hint: 'Semanas com pelo menos 5 dias ativos',
    draw: () => (
      <>
        <Base />
        <rect x="18.5" y="32" width="3" height="10" style={N} />
        <path d={starPath(20, 19, 15.5, 6.8)} style={T} strokeLinejoin="round" />
        <path d="M17,10.5 L15.2,15" {...SHINE} />
      </>
    ),
  },
  areaTrophy('lua', 'sono', 'Lua', 'Sono', () => (
    <>
      <Base />
      <rect x="18.5" y="34" width="3" height="8" style={N} />
      <path d={crescent(22, 19, 15)} style={T} />
      <path d={starPath(32, 9, 3.4, 1.4)} style={N} />
      <path d="M10.5,14 A11,11 0 0 1 14,8.5" {...SHINE} />
    </>
  )),
  areaTrophy('planta', 'corpo', 'Planta', 'Corpo', () => (
    <>
      <path d="M19,27 C8,25 5,14 10,8 C17,11 19,18 19,27 Z M21,27 C30,22 34,10 29,4 C22,8 21,17 21,27 Z M20,27 C18,20 18.5,15 20,11 C21.5,15 22,20 20,27 Z" style={T} />
      <rect x="9.5" y="27" width="21" height="4.5" rx="2" style={N} />
      <path d="M11.5,31 H28.5 L26.8,45.6 Q26.6,47 25.2,47 H14.8 Q13.4,47 13.2,45.6 Z" style={N} />
    </>
  )),
  areaTrophy('livros', 'estudo', 'Livros', 'Estudo', () => (
    <>
      <rect x="6" y="39" width="28" height="8" rx="2" style={N} />
      <rect x="8.5" y="30.5" width="25" height="8" rx="2" style={T} />
      <rect x="6.5" y="22" width="26" height="8" rx="2" style={T} />
      <path d="M11,34.5 H29 M10,26 H28" stroke="#FFFFFF" strokeOpacity=".3" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M26,22 V15 L28,17 L30,15 V22 Z" style={N} />
    </>
  )),
  // Próximas áreas: areaTrophy('id', 'foco' | 'casa' | 'financas' | 'mente' | 'social', 'Nome', 'Área', () => <>...</>),
] as const satisfies readonly TrophyDef[]

export type TrophyId = (typeof TROPHIES)[number]['id']

export const TROPHY_BY_ID = Object.fromEntries(TROPHIES.map((t) => [t.id, t])) as Record<TrophyId, TrophyDef<TrophyId>>

/** Nome do troféu que acompanha uma área padrão (ex.: "estudo" → "Livros"), se houver. */
export const trophyNameForArea = (key: string) => (TROPHIES as readonly TrophyDef[]).find((t) => t.area === key)?.name ?? null

/** Maior nível alcançado (0 = nenhum). */
export function earnedTier(id: TrophyId, s: TrophyStats): 0 | TrophyTier {
  const t = TROPHY_BY_ID[id]
  const v = t.value(s)
  return t.goals.filter((g) => v >= g).length as 0 | TrophyTier
}

/** Quanto falta para um nível ("faltam 4 dias") e o progresso de 0 a 1. */
export function remaining(id: TrophyId, tier: TrophyTier, s: TrophyStats) {
  const t = TROPHY_BY_ID[id]
  const goal = t.goals[tier - 1]
  const v = Math.min(goal, t.value(s))
  const left = goal - v
  return { left, pct: goal ? v / goal : 0, text: `${left === 1 ? 'falta' : 'faltam'} ${left} ${left === 1 ? t.unit[0] : t.unit[1]}` }
}

export const trophyTitle = (id: TrophyId, tier: TrophyTier) => `${TROPHY_BY_ID[id].name} de ${TIERS[tier].name}`

// Perolado → lilás → azul-claro → rosa, como o coelho.
const CRYSTAL_STOPS = [
  { o: 0, v: ['#F7F2FF', '#FFE9F5', '#EAF5FF', '#F7F2FF'] },
  { o: 0.45, v: ['#DCCBFF', '#C9E6FF', '#FFD6EC', '#DCCBFF'] },
  { o: 1, v: ['#C6E3FF', '#FFD3EA', '#D9C8FF', '#C6E3FF'] },
]
const SPARKS: [number, number, number][] = [
  [-3, 10, 2.6],
  [43, 6, 2],
  [44, 32, 2.4],
  [-4, 36, 1.8],
]

/**
 * Um troféu num nível. `silhouette` = forma escura, sem cor (bloqueado).
 * `size` = altura em px (a largura sai da proporção 40 × 48).
 */
export function Trophy({ id, tier, size = 48, silhouette = false, className = '' }: { id: TrophyId; tier: TrophyTier; size?: number; silhouette?: boolean; className?: string }) {
  const gid = `crystal-${useId().replace(/:/g, '')}`
  const reduce = useReducedMotion()
  const crystal = tier === 4 && !silhouette
  const vars = {
    '--t': silhouette ? '#161B27' : crystal ? `url(#${gid})` : TIERS[tier].color,
    '--n': silhouette ? '#11151F' : NEUTRAL,
  } as CSSProperties

  return (
    <svg
      viewBox="-6 -2 52 50"
      width={(size * 52) / 50}
      height={size}
      aria-hidden="true"
      className={className}
      style={{ ...vars, overflow: 'visible', filter: silhouette ? 'drop-shadow(0 0 3px rgba(154,163,181,.18))' : undefined }}
    >
      {crystal && (
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            {CRYSTAL_STOPS.map((s) => (
              <stop key={s.o} offset={s.o} stopColor={s.v[0]}>
                {!reduce && <animate attributeName="stop-color" values={s.v.join(';')} dur="12s" repeatCount="indefinite" />}
              </stop>
            ))}
          </linearGradient>
        </defs>
      )}
      {TROPHY_BY_ID[id].draw()}
      {crystal &&
        SPARKS.map(([x, y, r], i) => (
          <path key={i} className="twinkle" style={{ animationDelay: `${i * 0.9}s` }} d={starPath(x, y, r, r * 0.35)} fill="#F4EEFF" opacity=".8" />
        ))}
    </svg>
  )
}
