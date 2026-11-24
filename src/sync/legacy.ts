import { LEGACY_KEY, migrate, type RotinaState } from '../store/useRotina'
import { clearDev } from '../lib/devData'
import { phaseIndex } from '../lib/companion'
import type { DayLog, Routine } from '../types'

/**
 * Dados do formato antigo (antes das contas), salvos em localStorage['habbit-do'] (antes, 'rotina-app').
 * Depois de levados para uma conta, a chave é renomeada para não serem oferecidos de novo.
 */

export const LEGACY_DONE_KEY = `${LEGACY_KEY}-legacy-imported`

export type LegacyData = Pick<RotinaState, 'routines' | 'logs' | 'completedTasks' | 'companion' | 'petProgress'>

/** Lê os dados antigos deste aparelho, já no formato atual e sem simulações do painel dev. */
export function readLegacy(): LegacyData | null {
  try {
    if (localStorage.getItem(LEGACY_DONE_KEY)) return null
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { state?: Partial<RotinaState>; version?: number }
    const s = migrate(parsed.state ?? {}, parsed.version ?? 1)
    const data: LegacyData = {
      routines: (s.routines ?? []).filter((r) => !r.dev),
      logs: clearDev(s.logs ?? {}),
      completedTasks: s.completedTasks ?? {},
      companion: s.companion ?? { kind: null, name: '', equipped: {} },
      petProgress: s.petProgress ?? { initialized: false, peakActiveDays: 0, seenPhase: 'filhote', unlocked: [] },
    }
    const hasData = data.routines.length > 0 || Object.keys(data.logs).length > 0 || !!data.companion.kind
    return hasData ? data : null
  } catch {
    return null
  }
}

/** Marca os dados antigos como levados para a conta (mantém uma cópia, mas não pergunta mais). */
export function markLegacyImported(uid: string) {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (raw) localStorage.setItem(`${LEGACY_KEY}-legacy-backup`, raw)
    localStorage.removeItem(LEGACY_KEY)
    localStorage.setItem(LEGACY_DONE_KEY, uid)
  } catch {
    /* sem acesso ao storage: tudo bem, a conta já tem a resposta */
  }
}

/**
 * Junta os dados antigos aos da conta. Em conflito, a conta vence
 * (o que já está lá não é sobrescrito); o que só existe no aparelho é acrescentado.
 */
export function mergeLegacy(account: LegacyData, local: LegacyData): LegacyData {
  const ids = new Set(account.routines.map((r) => r.id))
  const routines: Routine[] = [...account.routines, ...local.routines.filter((r) => !ids.has(r.id))]

  const logs: Record<string, DayLog> = { ...account.logs }
  for (const [date, day] of Object.entries(local.logs)) {
    const acc = account.logs[date]
    if (!acc) {
      logs[date] = day
      continue
    }
    logs[date] = {
      ...acc,
      note: acc.note || day.note,
      plan: acc.plan ?? day.plan,
      blocks: { ...day.blocks, ...acc.blocks },
    }
  }

  const completedTasks = { ...local.completedTasks, ...account.completedTasks }

  const companion = account.companion.kind ? account.companion : local.companion
  const a = account.petProgress
  const l = local.petProgress
  const petProgress = {
    initialized: a.initialized || l.initialized,
    peakActiveDays: Math.max(a.peakActiveDays, l.peakActiveDays),
    seenPhase: phaseIndex(l.seenPhase) > phaseIndex(a.seenPhase) ? l.seenPhase : a.seenPhase,
    unlocked: [...new Set([...a.unlocked, ...l.unlocked])],
    phases: { ...l.phases, ...a.phases },
  }

  return { routines, logs, completedTasks, companion, petProgress }
}
