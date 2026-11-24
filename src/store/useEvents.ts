import { useEffect, useMemo, useRef } from 'react'
import { useRotina } from './useRotina'
import { useDevOverrides } from './useDevOverrides'
import { usePetPrefs } from './usePetPrefs'
import { usePetEvents } from './usePetEvents'
import { useStats } from './useCompanion'
import { hasDev } from '../lib/devData'
import { activeDaysBetween, type Logs } from '../lib/stats'
import { dayKey, nowInTz, parseKey } from '../lib/dates'
import { isFullMoon, isNight } from '../lib/moon'
import { EVENTS, eventItems, isEventActive, isEventOpen, ownedAt, type DecorId, type EventProgressCtx, type SeasonEvent } from '../data/events'
import type { SceneId } from '../data/scenes'
import type { EventItemMap } from '../types'

/** Dia que vale para os eventos e a lua: o simulado pelo painel dev ou hoje (fuso do usuário). */
export function useEventDay() {
  const simulated = useDevOverrides((s) => s.date)
  return simulated ?? dayKey()
}

/** Itens de evento que a tela mostra (os simulados pelo painel dev, se houver). */
export function useEventItemsView(): EventItemMap {
  const real = useRotina((s) => s.eventItems)
  const dev = useDevOverrides((s) => s.eventItems)
  return dev ?? real
}

/** Eventos acontecendo hoje (ou no dia simulado). */
export function useActiveEvents() {
  const day = useEventDay()
  return useMemo(() => EVENTS.filter((e) => isEventActive(e, day)), [day])
}

/** O que as metas de um evento consultam, a partir dos registros. */
export function eventCtx(logs: Logs, e: SeasonEvent, today: string): EventProgressCtx {
  return {
    activeDays: activeDaysBetween(logs, e.start, e.end, today),
    activeDaysBetween: (from, to) => activeDaysBetween(logs, from, to, today),
  }
}

/** Progresso de cada evento (para a coleção). */
export function useEventCtx(e: SeasonEvent) {
  const logs = useRotina((s) => s.logs)
  const day = useEventDay()
  return useMemo(() => eventCtx(logs, e, day), [logs, e, day])
}

/** Itens que as metas garantem e ainda não estão no mapa. */
export function missingEventItems(map: EventItemMap, logs: Logs, today: string) {
  const out: { eventId: string; itemId: string; kind: 'accessory' | 'trophy' }[] = []
  for (const e of EVENTS) {
    if (!isEventOpen(e, today)) continue
    const ctx = eventCtx(logs, e, today)
    for (const { kind, def } of eventItems(e)) {
      if (ownedAt(map, e.id, def.id)) continue
      const [cur, goal] = def.progress(ctx)
      if (cur >= goal) out.push({ eventId: e.id, itemId: def.id, kind })
    }
  }
  return out
}

/**
 * Libera os itens de evento conquistados (montado uma vez, no App), como os troféus:
 * na primeira conta da sessão libera em silêncio; depois, cada item novo vira uma comemoração.
 * Com dias simulados ou data simulada pelo painel dev, não libera nada de verdade.
 */
export function useEventProgress() {
  const stats = useStats()
  const logs = useRotina((s) => s.logs)
  const hasCompanion = useRotina((s) => !!s.companion.kind)
  const simulatedDay = useDevOverrides((s) => s.date)
  const primed = useRef(false)

  useEffect(() => {
    if (hasDev(logs) || simulatedDay) return
    const { eventItems: map, addEventItems } = useRotina.getState()
    const fresh = missingEventItems(map, logs, dayKey())
    const first = !primed.current
    primed.current = true
    if (!fresh.length) return
    addEventItems(fresh, new Date().toISOString())
    if (first) return
    const { push } = usePetEvents.getState()
    for (const f of fresh) {
      if (f.kind === 'trophy') push({ type: 'event-trophy', eventId: f.eventId })
      else if (hasCompanion) push({ type: 'unlock', accessory: f.itemId as `evt-${string}` })
    }
  }, [stats, logs, hasCompanion, simulatedDay])
}

/** Decorações de época de um cenário agora (vazio se desligadas no Perfil ou fora de evento). */
export function useSeasonDecor(scene: SceneId): DecorId[] {
  const pref = usePetPrefs((s) => s.seasonDecor)
  const forced = useDevOverrides((s) => s.decor)
  const events = useActiveEvents()
  const on = forced ?? pref
  return useMemo(() => (on ? [...new Set(events.flatMap((e) => e.decor[scene]))] : []), [on, events, scene])
}

/**
 * Noite de lua cheia agora (fuso do usuário). Com data simulada no painel dev,
 * vale a lua daquele dia às 22h.
 */
export function useFullMoonNight() {
  const simulated = useDevOverrides((s) => s.date)
  const forced = useDevOverrides((s) => s.fullMoon)
  if (forced) return true
  if (simulated) {
    const at = parseKey(simulated)
    at.setHours(22)
    return isFullMoon(at)
  }
  return isNight(nowInTz().getHours()) && isFullMoon(new Date())
}
