import { enqueue } from './outbox'

/**
 * Sessões do modo foco: uma por ciclo de foco (completo ou encerrado antes).
 * Só sobem para o Supabase (tabela focus_sessions, migration 012), pela mesma fila das outras
 * gravações; ficam guardadas para estatísticas futuras e entram no "baixar meus dados".
 */
export interface FocusSession {
  id: string
  /** Bloco em foco (`null` = foco livre). */
  blockId: string | null
  /** Nome do bloco naquele momento (sobrevive se o bloco for apagado). */
  blockName: string | null
  /** Dia (AAAA-MM-DD, fuso do usuário). */
  date: string
  startedAt: string
  endedAt: string
  /** Duração planejada do ciclo. */
  plannedSeconds: number
  /** Tempo de foco de fato (sem as pausas). */
  focusSeconds: number
  /** Tempo fora do app (aba escondida) durante o foco. */
  awaySeconds: number
  /** Quantas vezes saiu do app ou trocou de aba durante o foco. */
  interruptions: number
  /** Quantas vezes apertou pausar. */
  pauses: number
  /** Chegou ao fim do ciclo. */
  completed: boolean
}

export function saveFocusSession(s: FocusSession) {
  enqueue('focus_sessions', 'upsert', {
    id: s.id,
    block_id: s.blockId,
    block_name: s.blockName ? s.blockName.slice(0, 120) : null,
    date: s.date,
    started_at: s.startedAt,
    ended_at: s.endedAt,
    planned_seconds: Math.round(s.plannedSeconds),
    focus_seconds: Math.round(s.focusSeconds),
    away_seconds: Math.round(s.awaySeconds),
    interruptions: s.interruptions,
    pauses: s.pauses,
    completed: s.completed,
  })
}
