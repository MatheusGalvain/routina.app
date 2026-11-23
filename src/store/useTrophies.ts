import { useEffect, useRef } from 'react'
import { useRotina } from './useRotina'
import { useDevOverrides } from './useDevOverrides'
import { usePetEvents } from './usePetEvents'
import { useStats } from './useCompanion'
import { hasDev } from '../lib/devData'
import { TROPHIES, earnedTier, type TrophyId, type TrophyTier } from '../data/trophies'
import type { TrophyMap, TrophyUnlock } from '../types'

/** Troféus que a tela mostra (os simulados pelo painel dev, se houver). */
export function useTrophyView() {
  const real = useRotina((s) => s.trophies)
  const dev = useDevOverrides((s) => s.trophies)
  return { trophies: dev ?? real, simulated: !!dev }
}

/** Níveis que as estatísticas já garantem mas ainda não estão no mapa. */
export function missingUnlocks(map: TrophyMap, stats: Parameters<typeof earnedTier>[1], at: string) {
  const out: { id: TrophyId; unlock: TrophyUnlock }[] = []
  for (const t of TROPHIES) {
    const earned = earnedTier(t.id, stats)
    const have = new Set((map[t.id] ?? []).map((u) => u.tier))
    for (let tier = 1; tier <= earned; tier++) if (!have.has(tier as TrophyTier)) out.push({ id: t.id, unlock: { tier: tier as TrophyTier, unlockedAt: at } })
  }
  return out
}

/**
 * Libera os níveis conquistados (montado uma vez, no App).
 *  - Na primeira conta da sessão (logo depois de entrar) libera em silêncio o que já era merecido.
 *  - Depois, cada nível novo vira um aviso (só o maior nível novo de cada troféu).
 *  - Com dias simulados pelo painel dev, não libera nada de verdade.
 * Um nível liberado nunca é tirado.
 */
export function useTrophyProgress() {
  const stats = useStats()
  const logs = useRotina((s) => s.logs)
  const primed = useRef(false)

  useEffect(() => {
    if (hasDev(logs)) return
    const { trophies, addTrophies } = useRotina.getState()
    const fresh = missingUnlocks(trophies, stats, new Date().toISOString())
    const first = !primed.current
    primed.current = true
    if (!fresh.length) return
    addTrophies(fresh)
    if (first) return
    const top = new Map<TrophyId, TrophyTier>()
    for (const f of fresh) top.set(f.id, Math.max(top.get(f.id) ?? 0, f.unlock.tier) as TrophyTier)
    const { push } = usePetEvents.getState()
    top.forEach((tier, trophy) => push({ type: 'trophy', trophy, tier }))
  }, [stats, logs])
}
