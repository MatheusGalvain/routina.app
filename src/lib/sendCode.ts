import { supabase, redirectTo } from './supabase'
import { logAuth, normalizeEmail } from './otp'

/**
 * Envio do e-mail de acesso (link + código). Único lugar que chama `signInWithOtp`:
 * usado pela /entrar e pelo formulário da landing.
 *
 * A trava e o intervalo ficam aqui, no módulo, e não no estado de cada tela: assim dois
 * eventos seguidos (Enter + clique) ou duas telas (landing → /entrar) nunca mandam dois e-mails.
 */

/** Intervalo mínimo entre e-mails para o mesmo endereço (padrão do Supabase). */
export const RESEND_SECONDS = 60

/** Traduz o erro do Supabase. `wait` = segundos que o servidor pede para esperar. */
export function friendlyAuthError(message: string): { text: string; wait?: number } {
  const m = message.toLowerCase()
  const secs = m.match(/after (\d+) second/)
  if (secs) return { text: 'Por segurança, existe um intervalo entre um e-mail e outro.', wait: Number(secs[1]) }
  if (m.includes('rate limit'))
    return {
      text: 'O limite de e-mails por hora foi atingido. Se você já recebeu um e-mail nosso, use o código que está nele. Se não, tente de novo mais tarde.',
    }
  if (m.includes('invalid') && m.includes('email')) return { text: 'Esse e-mail não parece válido. Confere?' }
  if (m.includes('provider is not enabled')) return { text: 'O login com Google ainda não está ativado.' }
  if (m.includes('error sending'))
    return { text: 'O servidor não conseguiu enviar o e-mail agora. Tente de novo em alguns minutos.' }
  console.error('[auth] erro do Supabase:', message)
  return { text: 'Não foi possível enviar agora. Verifique sua conexão e tente de novo.' }
}

/** Trava síncrona: vale na hora, antes do próximo render de qualquer tela. */
let inFlight = false
/** Até quando (ms) não dá para pedir outro e-mail. */
let blockedUntil = 0

/** Segundos que faltam para poder pedir outro e-mail (0 = pode). */
export function cooldownLeft(): number {
  return Math.max(0, Math.ceil((blockedUntil - Date.now()) / 1000))
}

export type SendCodeResult =
  | { ok: true; email: string }
  /** `busy`: já tem um envio em andamento (nada foi feito). `wait`: segundos até poder tentar de novo. */
  | { ok: false; busy?: true; error?: string; wait?: number }

/** Pede o e-mail com o link e o código. Só roda quando a pessoa aperta um botão. */
export async function sendCode(rawEmail: string): Promise<SendCodeResult> {
  const email = normalizeEmail(rawEmail)
  if (!email) return { ok: false, error: 'Digite o seu e-mail.' }
  if (inFlight) return { ok: false, busy: true }
  const left = cooldownLeft()
  if (left > 0) return { ok: false, error: 'Por segurança, existe um intervalo entre um e-mail e outro.', wait: left }

  inFlight = true
  let message: string | null = null
  try {
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } })
    message = error?.message ?? null
  } catch (err) {
    message = err instanceof Error ? err.message : String(err)
  } finally {
    inFlight = false
  }
  logAuth('signInWithOtp', { email, result: message ? `erro: ${message}` : 'ok' })

  if (message) {
    const f = friendlyAuthError(message)
    if (f.wait) blockedUntil = Date.now() + f.wait * 1000
    return { ok: false, error: f.text, wait: f.wait }
  }
  blockedUntil = Date.now() + RESEND_SECONDS * 1000
  return { ok: true, email }
}
