/**
 * Botão principal da tela Início: o texto e a ação mudam conforme o momento da pessoa.
 * Função pura (sem store, sem data atual): recebe tudo o que precisa em `PrimaryInput`.
 * Testes em primaryAction.test.ts (`npm test`).
 *
 * Só imports de tipo aqui: o arquivo roda direto no Node nos testes.
 */

/** Um item da lista de hoje, só com o que importa para decidir. */
export interface PrimaryItem {
  id: string
  name: string
  done: boolean
  skipped: boolean
}

export interface PrimaryInput {
  hasFavoritePet: boolean
  routineCount: number
  /** Dias desde o último dia ativo (`null` = nunca houve dia ativo). */
  daysSinceLastActive: number | null
  /** A pessoa já acordou o pet hoje. */
  wokeToday: boolean
  /** Blocos de hoje, na ordem do dia. */
  items: PrimaryItem[]
  /** Bloco em andamento, se houver. */
  activeId: string | null
  /** Hora local (0–23). */
  hour: number
  /** Já escreveu a revisão da noite hoje. */
  hasReview: boolean
}

export type PrimaryActionType =
  | { type: 'onboarding'; step: 1 | 2 }
  | { type: 'wakePet' }
  | { type: 'quickTask' }
  | { type: 'startDay'; blockId: string }
  | { type: 'continue'; blockId: string }
  | { type: 'review' }
  | { type: 'daySummary' }

export type PrimaryState = 'adotar' | 'primeira-rotina' | 'acordar' | 'dia-vazio' | 'comecar' | 'continuar' | 'revisao' | 'resumo'

export interface PrimaryAction {
  state: PrimaryState
  label: string
  petMessage: string
  action: PrimaryActionType
}

/** A partir das 19h o botão sugere a revisão da noite. */
export const REVIEW_HOUR = 19
const LABEL_NAME_MAX = 24

/** Corta com reticências se passar de 24 caracteres. */
export const clipName = (name: string, max = LABEL_NAME_MAX) => (name.length > max ? `${name.slice(0, max - 1).trimEnd()}…` : name)

export function getPrimaryAction(s: PrimaryInput): PrimaryAction {
  if (!s.hasFavoritePet)
    return { state: 'adotar', label: 'Conhecer meu pet', petMessage: 'Oi! Ainda não fomos apresentados. Vem me conhecer?', action: { type: 'onboarding', step: 1 } }

  if (s.routineCount === 0)
    return {
      state: 'primeira-rotina',
      label: 'Montar minha primeira rotina',
      petMessage: 'Vamos montar sua primeira rotina juntos? Leva só um minutinho.',
      action: { type: 'onboarding', step: 2 },
    }

  const done = s.items.filter((i) => i.done).length
  const pending = s.items.filter((i) => !i.done && !i.skipped)

  if (s.daysSinceLastActive !== null && s.daysSinceLastActive >= 2 && !s.wokeToday && done === 0)
    return { state: 'acordar', label: 'Acordar meu pet', petMessage: 'Zzz… faz uns dias que eu cochilo por aqui. Me acorda?', action: { type: 'wakePet' } }

  if (s.items.length === 0)
    return { state: 'dia-vazio', label: 'Adicionar algo para hoje', petMessage: 'Hoje está livre. Que tal uma coisinha só para a gente cuidar?', action: { type: 'quickTask' } }

  if (pending.length > 0) {
    if (done === 0)
      return { state: 'comecar', label: 'Começar meu dia', petMessage: 'Bom dia! Começamos pelo primeiro bloco?', action: { type: 'startDay', blockId: pending[0].id } }
    // O bloco em andamento tem prioridade; senão, o próximo da lista.
    const next = pending.find((i) => i.id === s.activeId) ?? pending[0]
    return {
      state: 'continuar',
      label: `Continuar: ${clipName(next.name)}`,
      petMessage: `Estamos indo bem! ${done} ${done === 1 ? 'feito' : 'feitos'}, bora pro próximo.`,
      action: { type: 'continue', blockId: next.id },
    }
  }

  if (s.hour >= REVIEW_HOUR && !s.hasReview)
    return { state: 'revisao', label: 'Fazer a revisão da noite', petMessage: 'Dia fechado! Me conta como foi antes de dormir?', action: { type: 'review' } }

  return { state: 'resumo', label: 'Ver como foi o dia', petMessage: 'Tudo feito por hoje. Que orgulho de você!', action: { type: 'daySummary' } }
}
