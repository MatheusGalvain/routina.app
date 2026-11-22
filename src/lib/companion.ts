import type { PetPhase, PetUnlockId } from '../types'

/** Marca do coelho na lista de desbloqueios (fica para sempre, como os acessórios). */
export const SECRET_UNLOCK: PetUnlockId = 'pet:coelho'

/** Dias ativos que trazem o coelho (ou uma semana com todas as áreas). */
export const SECRET_DAYS = 30

export const PHASES: { id: PetPhase; name: string; min: number }[] = [
  { id: 'filhote', name: 'Filhote', min: 0 },
  { id: 'jovem', name: 'Jovem', min: 7 },
  { id: 'adulto', name: 'Adulto', min: 21 },
]

export const phaseIndex = (p: PetPhase) => PHASES.findIndex((x) => x.id === p)

/** Fase pelos dias ativos: filhote (0–6), jovem (7–20), adulto (21+). */
export function phaseFor(activeDays: number): PetPhase {
  let phase: PetPhase = 'filhote'
  for (const p of PHASES) if (activeDays >= p.min) phase = p.id
  return phase
}

/** Próxima fase e quantos dias ativos faltam (null se já é adulto). */
export function nextPhase(activeDays: number) {
  const next = PHASES.find((p) => p.min > activeDays)
  return next ? { ...next, remaining: next.min - activeDays } : null
}
