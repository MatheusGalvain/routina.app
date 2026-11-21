import type { Logs } from './stats'

/**
 * Marcas dos dados simulados pelo painel de desenvolvimento (`dev: true`).
 * Fica fora de src/dev para o app poder filtrar esses dados sem carregar o painel.
 */

export const hasDev = (logs: Logs) => Object.values(logs).some((d) => d.dev || Object.values(d.blocks).some((b) => b.dev))

/** Remove só o que é simulado; dias reais substituídos voltam. */
export function clearDev(logs: Logs): Logs {
  const out: Logs = {}
  for (const [k, day] of Object.entries(logs)) {
    const base = day.dev ? day.real : day
    if (!base) continue
    const blocks = Object.fromEntries(Object.entries(base.blocks).filter(([, b]) => !b.dev))
    out[k] = { ...base, blocks }
  }
  return out
}
