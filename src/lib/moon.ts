/**
 * Fase da lua por cálculo (sem API): idade da lua desde uma lua nova conhecida,
 * dividida pelo mês sinódico médio. Erro de algumas horas, o que basta para "noite de lua cheia".
 */

/** Mês sinódico médio, em dias. */
export const SYNODIC = 29.530588853
/** Lua nova de referência: 6 de janeiro de 2000, 18:14 UTC. */
const NEW_MOON_REF = Date.UTC(2000, 0, 6, 18, 14)
const DAY_MS = 86_400_000

/** Idade da lua em dias (0 = nova, ~14,77 = cheia). */
export function moonAge(at: Date) {
  const days = (at.getTime() - NEW_MOON_REF) / DAY_MS
  return ((days % SYNODIC) + SYNODIC) % SYNODIC
}

/** Parte iluminada, de 0 (nova) a 1 (cheia). */
export const moonIllumination = (at: Date) => (1 - Math.cos((2 * Math.PI * moonAge(at)) / SYNODIC)) / 2

/** Lua cheia: até ~1 dia antes ou depois do pico (iluminação acima de 97%). */
export const isFullMoon = (at: Date) => moonIllumination(at) >= 0.97

/** Noite: das 18h às 6h, pelo relógio do fuso do usuário (`localHour`). */
export const isNight = (localHour: number) => localHour >= 18 || localHour < 6

/** Próximo instante de lua cheia a partir de `from` (para o painel dev). */
export function nextFullMoon(from: Date) {
  const left = (SYNODIC / 2 - moonAge(from) + SYNODIC) % SYNODIC
  return new Date(from.getTime() + left * DAY_MS)
}
