import { useStats } from '../../store/useCompanion'
import { useCornerView } from '../../store/useCorner'
import { useAreas } from '../../store/useRotina'
import { useDevOverrides } from '../../store/useDevOverrides'
import { SCENES, SceneItem, itemRemaining, itemsOf, type SceneItemId } from '../../data/scenes'
import { SceneStage } from '../scenes/SceneStage'
import { topAreas, useSceneSeed } from './PetCorner'
import { Bar } from '../ui/ui'
import type { AreaId } from '../../types'

const date = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')

/**
 * Coleção → Cenários: cada cenário com uma prévia pequena e a grade dos seus itens.
 * Desbloqueados aparecem coloridos, com a data; bloqueados, em silhueta com quanto falta.
 */
export function SceneCollection() {
  const stats = useStats()
  const { items, scene } = useCornerView()
  const areas = useAreas()
  const forced = useDevOverrides((s) => s.corner)
  const seed = useSceneSeed()
  const days = Object.fromEntries(areas.map((a) => [a.id, forced[a.id] ?? stats.areaDays7[a.id] ?? 0])) as Record<AreaId, number>
  const shown = topAreas(areas, days)

  return (
    <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,340px),1fr))] gap-3 p-0">
      {SCENES.map((s) => {
        const list = itemsOf(s.id)
        const have = list.filter((i) => items[i.id as SceneItemId]).length
        return (
          <li key={s.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-panel-2 p-4">
            <div className="overflow-hidden rounded-xl border border-line">
              <SceneStage scene={s.id} areas={shown} days={days} seed={seed} preview label={`Prévia do cenário ${s.name}`} />
            </div>
            <header className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="m-0 flex items-center gap-2 text-base font-bold">
                  {s.name}
                  {scene === s.id && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">no cantinho</span>}
                </h3>
                <p className="m-0 text-[12.5px] text-muted">{s.title}</p>
              </div>
              <span className="font-mono text-[12px] text-soft">
                {have} de {list.length} itens
              </span>
            </header>
            <div className="w-full">
              <Bar pct={have / list.length} color="var(--color-noite)" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {list.map((it) => {
                const id = it.id as SceneItemId
                const u = items[id]
                if (u)
                  return (
                    <div key={id} className="flex min-w-0 flex-col items-center gap-1 rounded-xl bg-panel px-1 pt-2 pb-2 text-center">
                      <SceneItem id={id} size={48} />
                      <span className="text-[12px] leading-tight font-semibold">{it.name}</span>
                      <span className="font-mono text-[10px] text-muted">{date(u.unlockedAt)}</span>
                    </div>
                  )
                const r = itemRemaining(id, stats)
                return (
                  <div key={id} className="flex min-w-0 flex-col items-center gap-1 rounded-xl bg-panel px-1 pt-2 pb-2 text-center">
                    <SceneItem id={id} size={48} silhouette />
                    <span className="text-[12px] leading-tight text-muted">{it.name}</span>
                    <span className="text-[10.5px] leading-tight text-soft">{it.hint}</span>
                    <span className="text-[10.5px] leading-tight text-muted">{r.text}</span>
                    <div className="w-full max-w-[64px]">
                      <Bar pct={r.pct} color="var(--color-line-strong)" />
                    </div>
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
