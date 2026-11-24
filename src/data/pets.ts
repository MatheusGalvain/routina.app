import type { PetKind } from '../types'

/**
 * Crescimento de cada espécie: quantos dias ativos levam até cada fase.
 * Ajuste à vontade. A fase já conquistada nunca regride: se um número aumentar e alguém
 * já estiver numa fase maior, ele continua nela (ver `petProgress.phases`).
 */
export const PET_GROWTH: Record<PetKind, { jovem: number; adulto: number }> = {
  gatinho: { jovem: 7, adulto: 21 },
  sapinho: { jovem: 5, adulto: 18 },
  polvinho: { jovem: 8, adulto: 24 },
  pintinho: { jovem: 4, adulto: 14 },
  ourico: { jovem: 9, adulto: 28 },
  corujinha: { jovem: 10, adulto: 30 },
  coelho: { jovem: 7, adulto: 21 },
  // Secreto.
  'coelho-cristal': { jovem: 12, adulto: 40 },
}

/** A regra antiga, igual para todas as espécies (usada só para não regredir quem já tinha a fase). */
export const LEGACY_GROWTH = { jovem: 7, adulto: 21 }
