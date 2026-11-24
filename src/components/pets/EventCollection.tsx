import { useRotina } from '../../store/useRotina'
import { useCompanionView } from '../../store/useCompanion'
import { eventCtx, useEventDay, useEventItemsView } from '../../store/useEvents'
import { EVENTS, eventItems, eventLabel, isEventActive, ownedAt, type SeasonEvent } from '../../data/events'
import { EventTrophyArt } from '../../data/eventArt'
import { parseKey } from '../../lib/dates'
import type { EventItemMap } from '../../types'
import { Pet } from './Pet'
import { Bar } from '../ui/ui'

const date = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')
const short = (key: string) => parseKey(key).toLocaleDateString('pt-BR', { day: 'numeric', month: 'numeric' })

/** Etiqueta do evento de um item ("Natal 2026"). */
export function EventTag({ label, color }: { label: string; color: string }) {
  return (
    <span className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}>
      {label}
    </span>
  )
}

const hasOwned = (map: EventItemMap, e: SeasonEvent) => Object.keys(map[e.id] ?? {}).length > 0

/** Eventos que a coleção mostra: acontecendo agora ou com algum item conquistado. */
const visibleEvents = (map: EventItemMap, day: string) => EVENTS.filter((e) => isEventActive(e, day) || hasOwned(map, e))

export const hasEventsToShow = (map: EventItemMap, day: string) => visibleEvents(map, day).length > 0

/**
 * Coleção → Eventos. Conquistados aparecem coloridos, com a etiqueta e a data (para sempre).
 * Enquanto o evento acontece, os que faltam aparecem em silhueta com o progresso;
 * depois que ele acaba, os não conquistados somem (sem silhueta).
 */
export function EventCollection() {
  const day = useEventDay()
  const map = useEventItemsView()
  const logs = useRotina((s) => s.logs)
  const view = useCompanionView()
  const kind = view.kind ?? 'coelho'

  return (
    <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-3 p-0">
      {visibleEvents(map, day).map((e) => {
        const active = isEventActive(e, day)
        const ctx = eventCtx(logs, e, day)
        const items = eventItems(e).filter(({ def }) => active || ownedAt(map, e.id, def.id))
        return (
          <li key={e.id} className="flex flex-col gap-3 rounded-2xl border bg-panel-2 p-4" style={{ borderColor: `color-mix(in srgb, ${e.color} 35%, var(--color-line))` }}>
            <header className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="m-0 text-base font-bold">{eventLabel(e)}</h3>
                <p className="m-0 text-[12.5px] text-muted">
                  {short(e.start)} a {short(e.end)}
                </p>
              </div>
              {active && <EventTag label="acontecendo agora" color={e.color} />}
            </header>
            <div className="grid grid-cols-3 gap-2">
              {items.map(({ kind: itemKind, def }) => {
                const at = ownedAt(map, e.id, def.id)
                const [cur, goal] = def.progress(ctx)
                const art =
                  itemKind === 'trophy' ? (
                    <EventTrophyArt draw={e.trophy.draw} color={e.trophy.color} size={48} silhouette={!at} />
                  ) : (
                    <div className={at ? '' : 'opacity-40 grayscale'}>
                      <Pet kind={kind} state="neutro" accessories={[def.id as `evt-${string}`]} size={56} interactive={false} float={false} silhouette={!at} />
                    </div>
                  )
                return (
                  <div key={def.id} className="flex min-w-0 flex-col items-center gap-1 rounded-xl bg-panel px-1 pt-2 pb-2 text-center">
                    <div className="grid h-[58px] place-items-center">{art}</div>
                    <span className={`text-[12px] leading-tight ${at ? 'font-semibold' : 'text-muted'}`}>{def.name}</span>
                    {at ? (
                      <>
                        <EventTag label={eventLabel(e)} color={e.color} />
                        <span className="font-mono text-[10px] text-muted">{date(at)}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-[10.5px] leading-tight text-soft">{def.hint}</span>
                        <span className="font-mono text-[10.5px] text-muted">
                          {Math.min(cur, goal)}/{goal}
                        </span>
                        <div className="w-full max-w-[64px]">
                          <Bar pct={Math.min(1, cur / goal)} color="var(--color-line-strong)" />
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
