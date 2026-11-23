import type { ReactNode } from 'react'
import type { Anchor } from './accessories'
import type { SceneId } from './scenes'
import type { EventAccessoryId, EventItemMap, Slot } from '../types'
import { addDays } from '../lib/dates'
import * as art from './eventArt'

/**
 * Eventos sazonais. Cada evento tem datas (AAAA-MM-DD, sempre no fuso do usuário, inclusive),
 * acessórios e um troféu próprios, decoração para cada cenário e uma faixa curta no Início.
 *
 *  - O que for conquistado fica para sempre, com a etiqueta do evento ("Natal 2026") na coleção.
 *  - Fora do evento, o que não foi conquistado some da coleção (sem silhueta).
 *  - As metas contam só o que aconteceu dentro das datas do evento.
 *
 * Para criar um evento: copie um dos modelos comentados no fim de EVENTS, ajuste id, datas e metas.
 * Ids de acessório sempre começam com "evt-"; ids (de evento, acessório e troféu) usam a-z, 0-9 e "-".
 * Desenhos: src/data/eventArt.tsx. Decorações disponíveis: veja DecorId (src/components/scenes/SeasonDecor.tsx).
 */

/** Decorações de cenário (cada uma desenhada em SeasonDecor). */
export type DecorId = 'neve' | 'luzinhas' | 'estrela-guia' | 'fogos' | 'confete' | 'bandeirinhas'

/** O que as metas consultam. */
export interface EventProgressCtx {
  /** Dias ativos dentro das datas do evento (até hoje). */
  activeDays: number
  /** Dias ativos num trecho (AAAA-MM-DD, inclusive), até hoje. */
  activeDaysBetween: (from: string, to: string) => number
}

interface EventGoal {
  /** Como se conquista (coleção e comemoração). */
  hint: string
  /** Progresso: [atual, meta]. Conquista quando atual >= meta. */
  progress: (c: EventProgressCtx) => [number, number]
}

export interface EventAccessoryDef extends EventGoal {
  id: EventAccessoryId
  name: string
  slot: Slot
  draw: (a: Anchor, body: string) => ReactNode
}

export interface EventTrophyDef extends EventGoal {
  id: string
  name: string
  /** Cor do metal. */
  color: string
  draw: () => ReactNode
}

export interface SeasonEvent {
  id: string
  name: string
  year: number
  /** Primeiro e último dia (inclusive), no fuso do usuário. */
  start: string
  end: string
  /** Cor de destaque (faixa e etiqueta). */
  color: string
  /** Faixa curta na tela Início enquanto o evento acontece. */
  banner: string
  accessories: EventAccessoryDef[]
  trophy: EventTrophyDef
  decor: Record<SceneId, DecorId[]>
}

export const EVENTS: SeasonEvent[] = [
  {
    id: 'natal-2026',
    name: 'Natal',
    year: 2026,
    start: '2026-12-01',
    end: '2026-12-26',
    color: '#E5484D',
    banner: 'Está nevando no cantinho! Itens de Natal até 26/12.',
    accessories: [
      {
        id: 'evt-gorro-natal',
        name: 'Gorrinho de Natal',
        slot: 'cabeca',
        hint: '1 dia ativo no Natal',
        progress: (c) => [c.activeDays, 1],
        draw: art.gorroNatal,
      },
      {
        id: 'evt-cachecol-listrado',
        name: 'Cachecol listrado',
        slot: 'pescoco',
        hint: '5 dias ativos no Natal',
        progress: (c) => [c.activeDays, 5],
        draw: art.cachecolListrado,
      },
    ],
    trophy: {
      id: 'floco-de-neve',
      name: 'Floco de neve',
      color: '#BFE3FF',
      hint: '10 dias ativos durante o Natal',
      progress: (c) => [c.activeDays, 10],
      draw: art.trofeuFloco,
    },
    decor: { cosmos: ['neve', 'estrela-guia'], floresta: ['neve', 'luzinhas'] },
  },
  {
    id: 'ano-novo-2027',
    name: 'Ano Novo',
    year: 2027,
    start: '2026-12-27',
    end: '2027-01-06',
    color: '#FFC24B',
    banner: 'Fogos no céu do cantinho! Itens de Ano Novo até 6/1.',
    accessories: [
      {
        id: 'evt-chapeu-festa',
        name: 'Chapéu de festa',
        slot: 'cabeca',
        hint: '1 dia ativo no Ano Novo',
        progress: (c) => [c.activeDays, 1],
        draw: art.chapeuFesta,
      },
    ],
    trophy: {
      id: 'virada',
      name: 'Virada',
      color: '#FFC24B',
      hint: '1 dia ativo entre 31/12 e 1/1',
      progress: (c) => [c.activeDaysBetween('2026-12-31', '2027-01-01'), 1],
      draw: art.trofeuVirada,
    },
    decor: { cosmos: ['fogos'], floresta: ['fogos'] },
  },
  // Carnaval: confira as datas do ano (o Carnaval muda de data) e tire o comentário.
  // {
  //   id: 'carnaval-2027',
  //   name: 'Carnaval',
  //   year: 2027,
  //   start: '2027-02-06',
  //   end: '2027-02-10',
  //   color: '#EC4899',
  //   banner: 'Confete no cantinho! Itens de Carnaval até 10/2.',
  //   accessories: [
  //     { id: 'evt-mascara-carnaval', name: 'Máscara de baile', slot: 'rosto', hint: '2 dias ativos no Carnaval', progress: (c) => [c.activeDays, 2], draw: art.mascaraCarnaval },
  //   ],
  //   trophy: { id: 'serpentina', name: 'Serpentina', color: '#F472B6', hint: '4 dias ativos durante o Carnaval', progress: (c) => [c.activeDays, 4], draw: art.trofeuConfete },
  //   decor: { cosmos: ['confete'], floresta: ['confete', 'bandeirinhas'] },
  // },
  // Festa Junina:
  // {
  //   id: 'junina-2027',
  //   name: 'Festa Junina',
  //   year: 2027,
  //   start: '2027-06-01',
  //   end: '2027-06-30',
  //   color: '#F59E0B',
  //   banner: 'Arraiá no cantinho! Itens juninos até 30/6.',
  //   accessories: [
  //     { id: 'evt-chapeu-palha', name: 'Chapéu de palha', slot: 'cabeca', hint: '3 dias ativos em junho', progress: (c) => [c.activeDays, 3], draw: art.chapeuPalha },
  //   ],
  //   trophy: { id: 'fogueira', name: 'Fogueira', color: '#FB923C', hint: '12 dias ativos durante a Festa Junina', progress: (c) => [c.activeDays, 12], draw: art.trofeuFogueira },
  //   decor: { cosmos: ['bandeirinhas'], floresta: ['bandeirinhas'] },
  // },
]

/** Depois do fim, ainda dá para conquistar por alguns dias (dias concluídos offline sincronizando depois). */
export const GRACE_DAYS = 3

export const EVENT_BY_ID = Object.fromEntries(EVENTS.map((e) => [e.id, e])) as Record<string, SeasonEvent>

/** "Natal 2026": a etiqueta dos itens na coleção. */
export const eventLabel = (e: SeasonEvent) => `${e.name} ${e.year}`

/** O evento está acontecendo neste dia? */
export const isEventActive = (e: SeasonEvent, day: string) => day >= e.start && day <= e.end

/** Ainda dá para conquistar (durante o evento e alguns dias depois)? */
export const isEventOpen = (e: SeasonEvent, day: string) => day >= e.start && day <= addDays(e.end, GRACE_DAYS)

export const activeEvents = (day: string) => EVENTS.filter((e) => isEventActive(e, day))

/** Todos os acessórios de evento, com o evento de cada um. */
export const EVENT_ACCESSORIES = EVENTS.flatMap((e) => e.accessories.map((a) => ({ ...a, event: e.id })))

/** Os itens de um evento (acessórios e o troféu), com o tipo. */
export const eventItems = (e: SeasonEvent) => [
  ...e.accessories.map((a) => ({ kind: 'accessory' as const, def: a })),
  { kind: 'trophy' as const, def: e.trophy },
]

/** Data em que a pessoa conquistou um item de evento (ou null). */
export const ownedAt = (map: EventItemMap, eventId: string, itemId: string) => map[eventId]?.[itemId] ?? null

/** Ids dos acessórios de evento conquistados. */
export const ownedEventAccessories = (map: EventItemMap) =>
  EVENT_ACCESSORIES.filter((a) => ownedAt(map, a.event, a.id)).map((a) => a.id)
