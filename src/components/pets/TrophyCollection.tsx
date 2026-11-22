import { useStats } from '../../store/useCompanion'
import { useTrophyView } from '../../store/useTrophies'
import { TIERS, TIER_LIST, TROPHIES, Trophy, remaining } from '../../data/trophies'
import { Bar } from '../ui/ui'

const date = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')

/**
 * Coleção: todos os troféus e níveis. Conquistados aparecem coloridos, com a data;
 * bloqueados, como silhueta com quanto falta. O cristal bloqueado é só a silhueta, sem meta.
 */
export function TrophyCollection() {
  const stats = useStats()
  const { trophies } = useTrophyView()

  return (
    <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-3 p-0">
      {TROPHIES.map((t) => {
        const owned = new Map((trophies[t.id] ?? []).map((u) => [u.tier, u]))
        return (
          <li key={t.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-panel-2 p-4">
            <header>
              <h3 className="m-0 text-base font-bold">{t.name}</h3>
              <p className="m-0 text-[12.5px] text-muted">{t.hint}</p>
            </header>
            <div className="grid grid-cols-4 gap-2">
              {TIER_LIST.map((tier) => {
                const u = owned.get(tier)
                if (u)
                  return (
                    <div key={tier} className="flex min-w-0 flex-col items-center gap-1 text-center">
                      <Trophy id={t.id} tier={tier} size={44} />
                      <span className="text-[11.5px] font-semibold capitalize" style={{ color: tier === 4 ? 'var(--color-noite)' : TIERS[tier].color }}>
                        {TIERS[tier].name}
                      </span>
                      <span className="font-mono text-[10px] text-muted">{date(u.unlockedAt)}</span>
                    </div>
                  )
                // Cristal bloqueado: só a silhueta, para manter o mistério.
                if (tier === 4)
                  return (
                    <div key={tier} className="flex min-w-0 flex-col items-center gap-1" aria-label="Bloqueado" role="img">
                      <Trophy id={t.id} tier={tier} size={44} silhouette />
                    </div>
                  )
                const r = remaining(t.id, tier, stats)
                return (
                  <div key={tier} className="flex min-w-0 flex-col items-center gap-1 text-center">
                    <Trophy id={t.id} tier={tier} size={44} silhouette />
                    <span className="text-[11.5px] text-muted capitalize">{TIERS[tier].name}</span>
                    <span className="text-[10.5px] leading-tight text-soft">{r.text}</span>
                    <div className="w-full max-w-[56px]">
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
