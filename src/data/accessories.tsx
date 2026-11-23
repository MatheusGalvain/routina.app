import type { ReactNode } from 'react'
import type { AccessoryId, AreaId, PetPhase, Slot } from '../types'
import { edge, pick } from '../lib/color'
import { EVENT_ACCESSORIES } from './events'

/** Ponto de ancoragem de uma espécie (viewBox 0 0 120 120). `w` = largura útil ali. */
export interface Anchor {
  x: number
  y: number
  w: number
}

/** O que os acessórios consultam para saber se estão liberados. */
export interface UnlockStats {
  activeDays: number
  phase: PetPhase
  currentStreak: number
  blocksDone: number
  areaBlocks: Record<AreaId, number>
  areaDaysTotal: Record<AreaId, number>
  hasCompanion: boolean
}

export interface Accessory {
  id: AccessoryId
  name: string
  slot: Slot
  unlock: (s: UnlockStats) => boolean
  hint: string
  /** Progresso para a dica (atual / meta). */
  progress?: (s: UnlockStats) => [number, number]
  /** Desenha no ponto de ancoragem. `body` = cor do corpo da espécie, para escolher tons legíveis. */
  draw: (a: Anchor, body: string) => ReactNode
  /** Acessório de evento sazonal: o id do evento (src/data/events.ts). Não libera por estatística. */
  event?: string
}

export const SLOT_NAMES: Record<Slot, string> = { cabeca: 'Cabeça', rosto: 'Rosto', pescoco: 'Pescoço', mao: 'Mão' }

/** Ordem de desenho: o que fica por cima vem por último. */
export const SLOT_ORDER: Slot[] = ['mao', 'pescoco', 'rosto', 'cabeca']

const INK = '#0A0D14'

/** Lua crescente (aberta para a direita). */
export const crescent = (cx: number, cy: number, r: number) => `M${cx},${cy - r} A${r} ${r} 0 0 0 ${cx},${cy + r} A${r * 0.55} ${r} 0 0 1 ${cx},${cy - r} Z`

const star = (cx: number, cy: number, r: number) =>
  `M${cx},${cy - r} L${cx + r * 0.3},${cy - r * 0.3} L${cx + r},${cy} L${cx + r * 0.3},${cy + r * 0.3} L${cx},${cy + r} L${cx - r * 0.3},${cy + r * 0.3} L${cx - r},${cy} L${cx - r * 0.3},${cy - r * 0.3} Z`

export const ACCESSORIES: Accessory[] = [
  {
    id: 'laco',
    name: 'Laço',
    slot: 'pescoco',
    hint: 'Escolha seu favorito',
    unlock: (s) => s.hasCompanion,
    draw: ({ x, y }, body) => {
      const bow = pick(body, '#FB7185', '#9D174D', '#FBCFE8')
      const knot = bow === '#9D174D' ? '#FB7185' : '#E11D48'
      return (
        <g>
          <path d={`M${x},${y} L${x - 13},${y - 8} Q${x - 16},${y} ${x - 13},${y + 8} Z`} fill={bow} />
          <path d={`M${x},${y} L${x + 13},${y - 8} Q${x + 16},${y} ${x + 13},${y + 8} Z`} fill={bow} />
          <circle cx={x} cy={y} r={4} fill={knot} />
        </g>
      )
    },
  },
  {
    id: 'chapeu-mago',
    name: 'Chapéu de mago',
    slot: 'cabeca',
    hint: '7 dias ativos',
    unlock: (s) => s.activeDays >= 7,
    progress: (s) => [s.activeDays, 7],
    draw: ({ x, y, w }) => (
      <g>
        <path d={`M${x - w * 0.42},${y} Q${x - 2},${y - 22} ${x + 8},${y - 38} Q${x + 6},${y - 20} ${x + w * 0.42},${y} Z`} fill="#6D4AE8" />
        <path d={star(x + 1, y - 14, 4)} fill="#FDE68A" />
        <circle cx={x + 8} cy={y - 38} r={3} fill="#FDE68A" />
        <ellipse cx={x} cy={y} rx={w * 0.62} ry={4.5} fill="#4C32B8" />
      </g>
    ),
  },
  {
    id: 'coroa',
    name: 'Coroa',
    slot: 'cabeca',
    hint: 'Chegue à fase adulto',
    unlock: (s) => s.phase === 'adulto',
    progress: (s) => [Math.min(s.activeDays, 21), 21],
    draw: ({ x, y }, body) => (
      <g>
        <path
          d={`M${x - 14},${y + 1} L${x - 15},${y - 13} L${x - 7},${y - 6} L${x},${y - 17} L${x + 7},${y - 6} L${x + 15},${y - 13} L${x + 14},${y + 1} Z`}
          fill="#FFD34D"
          {...edge('#FFD34D', body, '#92400E')}
        />
        <rect x={x - 14} y={y - 3} width={28} height={4} rx={1.5} fill="#F5B60A" />
        <circle cx={x} cy={y - 8} r={2.4} fill="#F43F5E" />
      </g>
    ),
  },
  {
    id: 'fones',
    name: 'Fones de ouvido',
    slot: 'cabeca',
    hint: '20 blocos da área Foco',
    unlock: (s) => (s.areaBlocks.foco ?? 0) >= 20,
    progress: (s) => [s.areaBlocks.foco ?? 0, 20],
    draw: ({ x, y, w }) => {
      const hw = w / 2 + 10
      return (
        <g>
          <path d={`M${x - hw},${y + 18} Q${x},${y - 16} ${x + hw},${y + 18}`} fill="none" stroke="#64748B" strokeWidth={4.5} strokeLinecap="round" />
          {[-1, 1].map((side) => (
            <g key={side}>
              <rect x={x + side * hw - 6} y={y + 14} width={12} height={16} rx={5} fill="#1E2533" stroke="#64748B" strokeWidth={1.5} />
              <rect x={x + side * hw - 3.5} y={y + 17} width={7} height={10} rx={3} fill="#5AA7FF" />
            </g>
          ))}
        </g>
      )
    },
  },
  {
    id: 'oculos',
    name: 'Óculos de leitura',
    slot: 'rosto',
    hint: '5 dias com Estudo concluído',
    unlock: (s) => (s.areaDaysTotal.estudo ?? 0) >= 5,
    progress: (s) => [s.areaDaysTotal.estudo ?? 0, 5],
    draw: ({ x, y, w }) => {
      const l = x - w / 2
      const r = x + w / 2
      return (
        <g>
          <circle cx={l} cy={y} r={11.5} fill="#fff" fillOpacity={0.16} stroke={INK} strokeWidth={3} />
          <circle cx={r} cy={y} r={11.5} fill="#fff" fillOpacity={0.16} stroke={INK} strokeWidth={3} />
          <path d={`M${l + 11},${y - 2} Q${x},${y - 7} ${r - 11},${y - 2}`} fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />
        </g>
      )
    },
  },
  {
    id: 'cachecol',
    name: 'Cachecol',
    slot: 'pescoco',
    hint: 'Sequência de 5 dias',
    unlock: (s) => s.currentStreak >= 5,
    progress: (s) => [s.currentStreak, 5],
    draw: ({ x, y, w }, body) => {
      const tone = pick(body, '#2DD4BF', '#0F766E', '#99F6E4')
      const [main, tail, stripe] =
        tone === '#2DD4BF' ? ['#2DD4BF', '#14B8A6', '#0F766E'] : tone === '#99F6E4' ? ['#99F6E4', '#5EEAD4', '#0F766E'] : ['#0F766E', '#115E59', '#5EEAD4']
      return (
        <g>
          <rect x={x + w * 0.12} y={y - 2} width={11} height={22} rx={4} fill={tail} transform={`rotate(-8 ${x + w * 0.12} ${y})`} />
          <rect x={x - w / 2} y={y - 6} width={w} height={12} rx={6} fill={main} />
          {[-0.3, -0.05, 0.2].map((f) => (
            <rect key={f} x={x + w * f} y={y - 6} width={4} height={12} fill={stripe} opacity={0.6} />
          ))}
        </g>
      )
    },
  },
  {
    id: 'tiara-lua',
    name: 'Tiara de lua',
    slot: 'cabeca',
    hint: '7 dias com Sono concluído',
    unlock: (s) => (s.areaDaysTotal.sono ?? 0) >= 7,
    progress: (s) => [s.areaDaysTotal.sono ?? 0, 7],
    draw: ({ x, y, w }, body) => (
      <g>
        <path d={`M${x - w / 2 - 3},${y + 7} Q${x},${y - 9} ${x + w / 2 + 3},${y + 7}`} fill="none" stroke={pick(body, '#C4B5FD', '#5B21B6')} strokeWidth={3.5} strokeLinecap="round" />
        <path d={crescent(x - 2, y - 7, 8)} fill="#FDE68A" {...edge('#FDE68A', body, '#B45309')} />
        <circle cx={x + 9} cy={y - 10} r={1.8} fill="#FDE68A" />
      </g>
    ),
  },
  {
    id: 'cartinha',
    name: 'Cartinha',
    slot: 'mao',
    hint: '50 blocos concluídos',
    unlock: (s) => s.blocksDone >= 50,
    progress: (s) => [s.blocksDone, 50],
    draw: ({ x, y }, body) => {
      const line = pick(body, '#9AA3B5', '#334155')
      return (
      <g transform={`rotate(-14 ${x} ${y})`}>
        <rect x={x - 11} y={y - 8} width={22} height={16} rx={2.5} fill="#F1F3F6" stroke={line} strokeWidth={line === '#334155' ? 2 : 1.5} />
        <path d={`M${x - 11},${y - 7} L${x},${y + 1} L${x + 11},${y - 7}`} fill="none" stroke={line} strokeWidth={1.5} />
        <path d={`M${x},${y + 5} C${x - 5},${y + 1} ${x - 3},${y - 3} ${x},${y} C${x + 3},${y - 3} ${x + 5},${y + 1} ${x},${y + 5} Z`} fill="#F43F5E" />
      </g>
      )
    },
  },
]

/** Acessórios de evento no mesmo formato (liberados por src/store/useEvents.ts, não por `unlock`). */
export const EVENT_ACCESSORY_LIST: Accessory[] = EVENT_ACCESSORIES.map(({ id, name, slot, hint, draw, event }) => ({ id, name, slot, hint, draw, event, unlock: () => false }))

/** Todos os acessórios, inclusive os de evento (para desenhar e equipar). */
export const ACCESSORY_BY_ID = Object.fromEntries([...ACCESSORIES, ...EVENT_ACCESSORY_LIST].map((a) => [a.id, a])) as Record<AccessoryId, Accessory>
