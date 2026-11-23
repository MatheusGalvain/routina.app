// O cliente do Supabase precisa ler a URL (sessão do link mágico / Google) antes de qualquer limpeza.
import './supabase'
import { APP_KEY } from './storageKeys'

/**
 * Lê o que voltou na URL ao abrir o link do e-mail sem conseguir entrar:
 * link expirado/usado, ou link aberto em OUTRO aparelho (o acesso fica preso ao
 * navegador que pediu; nesse caso, o código de 6 dígitos resolve).
 */
function readUrlError() {
  const hash = new URLSearchParams(window.location.hash.slice(1))
  const query = new URLSearchParams(window.location.search)
  const errorCode = hash.get('error_code') ?? query.get('error_code')
  const hasError = !!(errorCode || hash.get('error') || query.get('error'))
  const strayCode = query.has('code')
  if (!hasError && !strayCode) return null
  // Limpa a URL para a mensagem não reaparecer ao recarregar.
  window.history.replaceState(null, '', window.location.pathname)
  if (errorCode === 'otp_expired')
    return 'Esse link expirou ou já foi usado. Use o código de 6 dígitos do e-mail mais recente, ou peça um novo acesso abaixo.'
  if (strayCode)
    return 'Esse link foi aberto em um aparelho diferente de onde você pediu o acesso. No outro aparelho, digite o código de 6 dígitos do e-mail. Ou peça um acesso novo aqui.'
  return 'Não deu para entrar com esse link. Tente pedir outro.'
}

/**
 * Lido uma única vez, quando o app abre (antes do roteador redirecionar para /entrar,
 * que apagaria o que veio na URL).
 */
export const URL_ERROR = readUrlError()

/**
 * Rota que a pessoa tentou abrir sem sessão. Fica no localStorage porque o link do e-mail
 * pode abrir em outra aba; depois do login, o app volta para ela.
 */
const PENDING_KEY = `${APP_KEY}-depois-do-login`

/** Vale por 1 hora: depois disso, entrar leva para o início. */
const PENDING_TTL = 60 * 60 * 1000

export function rememberPending(path: string) {
  try {
    if (path && path !== '/' && !path.startsWith('/entrar')) localStorage.setItem(PENDING_KEY, JSON.stringify({ path, at: Date.now() }))
  } catch {
    /* sem armazenamento: volta para o início */
  }
}

/** A rota guardada, sem apagar. */
export function peekPending(): string | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    if (!raw) return null
    const { path, at } = JSON.parse(raw) as { path?: unknown; at?: unknown }
    if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) return null
    return typeof at === 'number' && Date.now() - at < PENDING_TTL ? path : null
  } catch {
    return null
  }
}

/** Devolve (e apaga) a rota guardada. */
export function takePending(): string | null {
  const path = peekPending()
  try {
    localStorage.removeItem(PENDING_KEY)
  } catch {
    /* nada */
  }
  return path
}
