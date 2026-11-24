import type { PetAppearance, PetKind, PetPhase, PetUnlockId } from '../types'
import { LEGACY_GROWTH, PET_GROWTH } from '../data/pets'

/** Marca do coelho de cristal na lista de desbloqueios (fica para sempre, como os acessórios). */
export const SECRET_UNLOCK: PetUnlockId = 'pet:coelho-cristal'

/** Marca antiga, de quando o pet secreto era o coelho (vira SECRET_UNLOCK ao carregar). */
export const LEGACY_SECRET_UNLOCK = 'pet:coelho'

/** Dias ativos que trazem o coelho de cristal (ou uma semana com todas as áreas). */
export const SECRET_DAYS = 30

export const PHASE_LIST: { id: PetPhase; name: string }[] = [
  { id: 'filhote', name: 'Filhote' },
  { id: 'jovem', name: 'Jovem' },
  { id: 'adulto', name: 'Adulto' },
]

/** Fases de uma espécie, com os dias ativos mínimos de cada uma (src/data/pets.ts). */
export function phasesOf(kind: PetKind | null): { id: PetPhase; name: string; min: number }[] {
  const g = (kind && PET_GROWTH[kind]) || LEGACY_GROWTH
  return [
    { id: 'filhote', name: 'Filhote', min: 0 },
    { id: 'jovem', name: 'Jovem', min: g.jovem },
    { id: 'adulto', name: 'Adulto', min: g.adulto },
  ]
}

/** Nome e ordem das fases (sem os dias, que mudam por espécie). */
export const PHASES = PHASE_LIST

export const phaseIndex = (p: PetPhase) => PHASE_LIST.findIndex((x) => x.id === p)
export const phaseName = (p: PetPhase) => PHASE_LIST[phaseIndex(p)].name
export const maxPhase = (a: PetPhase, b: PetPhase | undefined) => (b && phaseIndex(b) > phaseIndex(a) ? b : a)

/** Fase pela regra atual da espécie (sem olhar o que já foi conquistado). */
export function phaseFor(kind: PetKind | null, activeDays: number): PetPhase {
  let phase: PetPhase = 'filhote'
  for (const p of phasesOf(kind)) if (activeDays >= p.min) phase = p.id
  return phase
}

/** Fase pela regra antiga (7/21 para todos). */
export const legacyPhase = (activeDays: number): PetPhase =>
  activeDays >= LEGACY_GROWTH.adulto ? 'adulto' : activeDays >= LEGACY_GROWTH.jovem ? 'jovem' : 'filhote'

/** Fase conquistada: a da regra atual ou a já guardada, a que for maior (nunca regride). */
export const conqueredPhase = (kind: PetKind | null, activeDays: number, stored?: Partial<Record<PetKind, PetPhase>>) =>
  maxPhase(phaseFor(kind, activeDays), kind ? stored?.[kind] : undefined)

/**
 * Fase que aparece: a escolhida, se já foi conquistada; 'auto' (ou uma escolha ainda não conquistada)
 * segue a fase conquistada.
 */
export function shownPhase(conquered: PetPhase, appearance: PetAppearance): PetPhase {
  if (appearance === 'auto') return conquered
  return phaseIndex(appearance) <= phaseIndex(conquered) ? appearance : conquered
}

/** Dias ativos que faltam para a espécie chegar numa fase (0 se já conquistou). */
export function daysToPhase(kind: PetKind | null, phase: PetPhase, activeDays: number, conquered: PetPhase) {
  if (phaseIndex(conquered) >= phaseIndex(phase)) return 0
  return Math.max(0, phasesOf(kind)[phaseIndex(phase)].min - activeDays)
}

/** Próxima fase depois da conquistada e quantos dias ativos faltam (null se já é adulto). */
export function nextPhase(kind: PetKind | null, activeDays: number, conquered: PetPhase) {
  const list = phasesOf(kind)
  const next = list[phaseIndex(conquered) + 1]
  return next ? { ...next, remaining: Math.max(1, next.min - activeDays) } : null
}
