import { useEffect, useMemo } from 'react'
import { useRotina } from './useRotina'
import { useDevOverrides } from './useDevOverrides'
import { usePetEvents } from './usePetEvents'
import { computeStats } from '../lib/stats'
import { SECRET_DAYS, SECRET_UNLOCK, phaseFor, phaseIndex, shownPhase } from '../lib/companion'
import { dayKey } from '../lib/dates'
import { DEFAULT_PET } from '../components/pets/pets'
import { ACCESSORIES, EVENT_ACCESSORY_LIST, type UnlockStats } from '../data/accessories'
import { ownedEventAccessories } from '../data/events'
import type { Stats } from '../lib/stats'
import type { AccessoryId, PetKind, PetState, UnlockId } from '../types'

/** Estatísticas atuais, recalculadas quando os registros mudam. */
export function useStats() {
  const logs = useRotina((s) => s.logs)
  const areas = useRotina((s) => s.areas)
  const today = dayKey()
  return useMemo(() => computeStats(logs, today, areas.map((a) => a.id)), [logs, today, areas])
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
 * O coelho chega com 30 dias ativos ou uma semana com todas as áreas concluídas.
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
    const secret = !p.unlocked.includes(SECRET_UNLOCK) && (peak >= SECRET_DAYS || stats.allAreasWeek)
    const unlocked: UnlockId[] = [...p.unlocked, ...fresh, ...(secret ? [SECRET_UNLOCK] : [])]

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
    if (fresh.length || secret) patch.unlocked = unlocked
    if (fresh.length && hasCompanion) fresh.forEach((accessory) => push({ type: 'unlock', accessory }))
    if (secret) push({ type: 'secret' })
    if (Object.keys(patch).length) updateProgress(patch)
  }, [stats, hasCompanion])
}

/**
 * Escolhe (ou tira, com `null`) o favorito.
 *  - Coelho liberado só pelo painel dev: vira sobrescrita visual, nada vai para o Supabase.
 *  - Qualquer outra escolha limpa a sobrescrita de espécie do painel dev, para a escolha aparecer.
 */
export function chooseFavorite(kind: PetKind | null) {
  const dev = useDevOverrides.getState()
  const reallyUnlocked = useRotina.getState().petProgress.unlocked.includes(SECRET_UNLOCK)
  if (kind === 'coelho' && !reallyUnlocked) {
    dev.set({ species: 'coelho' })
    return
  }
  if (dev.species) {
    dev.set({ species: null })
    if (kind === null) return // estava desmarcando o favorito simulado
  }
  useRotina.getState().setCompanionKind(kind)
}

/** O que mostrar do companheiro agora, já com as sobrescritas do painel dev. */
export function useCompanionView() {
  const companion = useRotina((s) => s.companion)
  const progress = useRotina((s) => s.petProgress)
  const dev = useDevOverrides()
  const stats = useStats()

  const activeDays = Math.max(progress.peakActiveDays, stats.activeDays)
  const kind = dev.species ?? companion.kind
  // Fase conquistada (pelos dias ativos, nunca regride) x aparência escolhida.
  // A fase forçada pelo painel dev vale por cima da escolha.
  const conqueredPhase = phaseFor(activeDays)
  const phase = dev.phase ?? shownPhase(conqueredPhase, companion.appearance)
  const adultDetail = dev.phase ? dev.phase === 'adulto' : conqueredPhase === 'adulto' && companion.showAdultDetail
  // Acessórios de evento conquistados (ou simulados pelo painel dev) contam como liberados.
  const realEventItems = useRotina((s) => s.eventItems)
  const eventItems = dev.eventItems ?? realEventItems
  const eventOwned = ownedEventAccessories(eventItems)
  const unlocked = dev.unlockAll ? null : new Set<string>([...progress.unlocked, ...eventOwned])
  const accessories = Object.values(companion.equipped).filter((id): id is AccessoryId => !!id && (!unlocked || unlocked.has(id)))
  // Dorme depois de 2+ dias sem dia ativo, até concluir um bloco hoje (ou ser acordado pelo botão do Início).
  const woke = useRotina((s) => s.wokenOn === dayKey())
  const sleepy = stats.daysSinceLastActive !== null && stats.daysSinceLastActive >= 2 && stats.doneToday === 0 && !woke

  const unlockedIds: string[] = dev.unlockAll ? [...ACCESSORIES, ...EVENT_ACCESSORY_LIST].map((a) => a.id) : [...progress.unlocked, ...eventOwned]
  const secretUnlocked = dev.secretPet || progress.unlocked.includes(SECRET_UNLOCK)
  const sleeping = dev.state ? dev.state === 'dormindo' : sleepy

  return {
    kind,
    name: companion.name,
    phase,
    conqueredPhase,
    appearance: companion.appearance,
    showAdultDetail: companion.showAdultDetail,
    adultDetail,
    activeDays,
    accessories,
    unlockedIds,
    secretUnlocked,
    sleepy,
    sleeping,
    stats,
    forcedState: dev.state,
  }
}

/**
 * O pet que aparece num estado do dia: o favorito vestindo o estado (e dormindo se andou parado).
 * Sem favorito, é sempre o mesmo (DEFAULT_PET) em todo lugar, para o cantinho e o Início não
 * mostrarem pets diferentes.
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
    kind: view.kind ?? DEFAULT_PET,
    state,
    sleeping,
    phase: isCompanion ? view.phase : ('jovem' as const),
    adultDetail: isCompanion ? view.adultDetail : false,
    accessories: isCompanion ? view.accessories : [],
  }
}
