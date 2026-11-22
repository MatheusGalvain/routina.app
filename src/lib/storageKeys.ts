/**
 * Prefixo de tudo que o app guarda no localStorage:
 *  - "habbit-do"                   dados antigos (antes das contas)
 *  - "habbit-do:<usuário>"         cache por usuário (Zustand persist)
 *  - "habbit-do-outbox:<usuário>"  fila de gravações pendentes
 *  - "habbit-do-legacy-imported"   marca de que os dados antigos foram levados para a conta
 *  - "habbit-do-legacy-backup"     cópia dos dados antigos depois da importação
 */
export const APP_KEY = 'habbit-do'

/** Prefixo usado quando o app se chamava rotina.app. */
const OLD_PREFIX = 'rotina-app'

/**
 * Renomeia as chaves antigas ("rotina-app…") para as novas ("habbit-do…"), uma vez.
 * Se a chave nova já existir, ela é mais recente e fica; a antiga é apagada do mesmo jeito.
 * Roda antes de qualquer leitura do storage (é o primeiro import do main.tsx).
 */
export function migrateStorageKeys() {
  try {
    const old = Object.keys(localStorage).filter((k) => k.startsWith(OLD_PREFIX))
    for (const key of old) {
      const next = APP_KEY + key.slice(OLD_PREFIX.length)
      const value = localStorage.getItem(key)
      if (value !== null && localStorage.getItem(next) === null) localStorage.setItem(next, value)
      // Só apaga a antiga se a nova ficou gravada (cache cheio, por exemplo, mantém a antiga para a próxima tentativa).
      if (localStorage.getItem(next) !== null) localStorage.removeItem(key)
    }
  } catch {
    /* sem acesso ao storage: nada para migrar */
  }
}

migrateStorageKeys()
