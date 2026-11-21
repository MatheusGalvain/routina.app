import { useEffect, useMemo } from 'react'
import { useRotina } from './useRotina'
import { useDevOverrides } from './useDevOverrides'
import { usePetEvents } from './usePetEvents'
import { computeStats } from '../lib/stats'
import { phaseFor, phaseIndex } from '../lib/companion'
import { dayKey } from '../lib/dates'
import { PET_BY_STATE } from '../components/pets/pets'
import { ACCESSORIES, type UnlockStats } from '../data/accessories'
import type { Stats } from '../lib/stats'
import type { AccessoryId, PetState } from '../types'

/** Estatísticas atuais, recalculadas quando os registros mudam. */
export function useStats() {
  const logs = useRotina((s) => s.logs)
  const today = dayKey()
  return useMemo(() => computeStats(logs, today), [logs, today])
}

export function unlockStats(stats: Stats, activeDays: number, hasCompanion: boolean): UnlockStats {
  return {
    activeDays,
    phase: phaseFor(activeDays),
    currentStreak: stats.currentStreak,
    blocksDone: stats.blocksDone,
    areaBlocks: stats.areaBlocks,
    areaDaysTotal: stats.areaDaysTotal,
    hasCompanion,
  }
}

/**
 * Mantém o progresso do companheiro (montado uma vez, no App):
 * guarda o maior número de dias ativos, libera acessórios (para sempre)
 * e enfileira as comemorações de nova fase e de acessório novo.
 * Na primeira vez só registra o estado atual, sem comemorar o passado.
 */
export function useCompanionProgress() {
  const stats = useStats()
  const hasCompanion = useRotina((s) => !!s.companion.kind)

  useEffect(() => {
    const { petProgress: p, updateProgress } = useRotina.getState()
    const peak = Math.max(p.peakActiveDays, stats.activeDays)
    const phase = phaseFor(peak)
    const u = unlockStats(stats, peak, hasCompanion)
    const fresh = ACCESSORIES.filter((a) => !p.unlocked.includes(a.id) && a.unlock(u)).map((a) => a.id)
    const unlocked = [...p.unlocked, ...fresh]

    if (!p.initialized) {
      updateProgress({ initialized: true, peakActiveDays: peak, seenPhase: phase, unlocked })
      return
    }

    const { push } = usePetEvents.getState()
    const patch: Partial<typeof p> = {}
    if (peak !== p.peakActiveDays) patch.peakActiveDays = peak
    if (phaseIndex(phase) > phaseIndex(p.seenPhase)) {
      patch.seenPhase = phase
      if (hasCompanion) push({ type: 'phase', phase })
    }
    if (fresh.length) {
      patch.unlocked = unlocked
      if (hasCompanion) fresh.forEach((accessory) => push({ type: 'unlock', accessory }))
    }
    if (Object.keys(patch).length) updateProgress(patch)
  }, [stats, hasCompanion])
}

/** O que mostrar do companheiro agora, já com as sobrescritas do painel dev. */
export function useCompanionView() {
  const companion = useRotina((s) => s.companion)
  const progress = useRotina((s) => s.petProgress)
  const dev = useDevOverrides()
  const stats = useStats()

  const activeDays = Math.max(progress.peakActiveDays, stats.activeDays)
  const kind = dev.species ?? companion.kind
  const phase = dev.phase ?? phaseFor(activeDays)
  const unlocked = dev.unlockAll ? null : new Set(progress.unlocked)
  const accessories = Object.values(companion.equipped).filter((id): id is AccessoryId => !!id && (!unlocked || unlocked.has(id)))
  // Dorme depois de 2+ dias sem dia ativo, até concluir um bloco hoje.
  const sleepy = stats.daysSinceLastActive !== null && stats.daysSinceLastActive >= 2 && stats.doneToday === 0

  const unlockedIds = dev.unlockAll ? ACCESSORIES.map((a) => a.id) : progress.unlocked
  const sleeping = dev.state ? dev.state === 'dormindo' : sleepy

  return { kind, name: companion.name, phase, activeDays, accessories, unlockedIds, sleepy, sleeping, stats, forcedState: dev.state }
}

/**
 * O pet que aparece num estado do dia. Com favorito, é sempre ele vestindo o estado
 * (e dormindo se andou parado); sem favorito, o pet de cada estado, como antes.
 * `reacting` = reação rápida em andamento (concluiu/pulou), que acorda o pet.
 */
export function useShownPet(autoState: PetState, reacting = false) {
  const view = useCompanionView()
  const forced = view.forcedState
  const state: PetState = forced && forced !== 'dormindo' ? forced : autoState
  const isCompanion = !!view.kind
  const sleeping = forced ? forced === 'dormindo' : isCompanion && view.sleepy && !reacting
  return {
    ...view,
    isCompanion,
    kind: view.kind ?? PET_BY_STATE[state],
    state,
    sleeping,
    phase: isCompanion ? view.phase : ('jovem' as const),
    accessories: isCompanion ? view.accessories : [],
  }
}
