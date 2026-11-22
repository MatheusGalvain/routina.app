import { useEffect, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase, GOOGLE_ENABLED, redirectTo } from '../lib/supabase'
import { Logo } from '../components/ui/ui'
import { Pet } from '../components/pets/Pet'
import { Privacidade } from './Privacidade'
import { Footer } from '../components/ui/Footer'

/** Intervalo mínimo entre e-mails para o mesmo endereço (padrão do Supabase). */
const RESEND_SECONDS = 60

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

// Lido uma única vez, quando o app abre: a função limpa a URL, então chamá-la de novo
// (o React chama inicializadores duas vezes no modo dev) apagaria a mensagem.
const URL_ERROR = readUrlError()

/** Traduz o erro do Supabase. `wait` = segundos que o servidor pede para esperar. */
function friendly(message: string): { text: string; wait?: number } {
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
  console.error('[Entrar] erro do Supabase:', message)
  return { text: 'Não foi possível enviar agora. Verifique sua conexão e tente de novo.' }
}

/** Tela de entrada: link mágico no e-mail e, se ativado, Google. */
export function Entrar() {
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(URL_ERROR)
  const [cooldown, setCooldown] = useState(0)
  const [privacy, setPrivacy] = useState(false)
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => window.clearTimeout(t)
  }, [cooldown])

  const sendLink = async (e?: FormEvent) => {
    e?.preventDefault()
    const target = (sentTo ?? email).trim()
    if (!target || sending || cooldown > 0) return
    setSending(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({ email: target, options: { emailRedirectTo: redirectTo() } })
    setSending(false)
    if (error) {
      const f = friendly(error.message)
      setError(f.text)
      if (f.wait) setCooldown(f.wait)
      return
    }
    setSentTo(target)
    setCode('')
    setCooldown(RESEND_SECONDS)
  }

  // Código de 6 dígitos do e-mail: funciona em qualquer aparelho (lê no celular, digita no PC).
  const verifyCode = async (e: FormEvent) => {
    e.preventDefault()
    const token = code.replace(/\D/g, '')
    if (!sentTo || token.length < 6 || verifying) return
    setVerifying(true)
    setError(null)
    const { error } = await supabase.auth.verifyOtp({ email: sentTo, token, type: 'email' })
    setVerifying(false)
    if (error)
      setError(error.message.toLowerCase().includes('expired') ? 'Esse código expirou. Peça um novo e-mail.' : 'Código incorreto. Confira os números e tente de novo.')
  }

  const google = async () => {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo() } })
    if (error) setError(friendly(error.message).text)
  }

  if (privacy)
    return (
      <div className="flex min-h-screen flex-col">
        <main className="flex-1 px-4 py-8">
          <Privacidade onBack={() => setPrivacy(false)} />
        </main>
        <Footer onPrivacy={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
      </div>
    )

  const bubble = sentTo ? 'Prontinho! Agora é só abrir o seu e-mail.' : 'Oi! Que bom te ver por aqui. Vamos organizar o seu dia?'

  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto flex w-full max-w-[440px] flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
        <div className="flex items-center gap-3">
          <Logo size={40} />
          <h1 className="m-0 text-[34px] leading-none font-extrabold tracking-tight">
            Habbit <span className="text-[#5AA7FF]">Do</span>
          </h1>
        </div>

        <section className="flex w-full flex-col items-center gap-5 rounded-[26px] border border-line bg-panel px-6 pt-7 pb-6">
          {/* Gatinho dando boas-vindas */}
          <div className="flex w-full flex-col items-center gap-3">
            <AnimatePresence mode="wait">
              <motion.p
                key={bubble}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="relative m-0 rounded-2xl border border-[#2A3242] bg-panel-2 px-4 py-2.5 text-center text-sm text-soft"
                aria-live="polite"
              >
                {bubble}
                <span aria-hidden="true" className="absolute -bottom-[7px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-r border-b border-[#2A3242] bg-panel-2" />
              </motion.p>
            </AnimatePresence>
            <div className="relative grid h-[150px] w-[150px] place-items-center">
              <div className="absolute h-[140px] w-[140px] rounded-full border border-[#F1F3F622]" />
              <Pet kind="gatinho" state={sentTo ? 'concluido' : 'neutro'} size={120} label="Gatinho dando boas-vindas" />
            </div>
          </div>

          {sentTo ? (
            <div className="flex w-full flex-col gap-3 text-center">
              <h2 className="m-0 text-lg font-bold">Confira seu e-mail</h2>
              <p className="m-0 text-sm text-muted">
                Enviamos um e-mail para <strong className="text-soft">{sentTo}</strong>. Abra o link <strong className="text-soft">neste aparelho</strong>{' '}
                ou digite aqui o código de 6 dígitos. Dá para ler o e-mail no celular e digitar o código no computador.
              </p>
              <form onSubmit={verifyCode} className="flex flex-col items-center gap-2">
                <label htmlFor="otp" className="sr-only">
                  Código de 6 dígitos do e-mail
                </label>
                <input
                  id="otp"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  className="w-[200px] rounded-xl border border-line bg-[#0B0E15] px-3 py-3 text-center font-mono text-2xl tracking-[0.35em] text-soft placeholder:text-[#3A4256]"
                />
                <button
                  type="submit"
                  disabled={code.length < 6 || verifying}
                  className="rounded-full bg-foco-strong px-6 py-2.5 text-sm font-bold text-white shadow-[0_0_24px_rgba(30,136,255,.35)] disabled:opacity-40 disabled:shadow-none"
                >
                  {verifying ? 'Entrando…' : 'Entrar com o código'}
                </button>
              </form>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => sendLink()}
                  disabled={sending || cooldown > 0}
                  className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-soft hover:bg-panel-2 disabled:opacity-50"
                >
                  {cooldown > 0 ? `Reenviar em ${cooldown}s` : sending ? 'Enviando…' : 'Reenviar e-mail'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSentTo(null)
                    setError(null)
                    setCode('')
                  }}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-muted hover:text-soft"
                >
                  Usar outro e-mail
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={sendLink} className="flex w-full flex-col gap-3">
              <label htmlFor="email" className="text-sm text-muted">
                Entre com seu e-mail. Você recebe um link e um código, sem senha.
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
                className="rounded-xl border border-line bg-[#0B0E15] px-3.5 py-3 text-soft placeholder:text-[#6F788A]"
              />
              <button
                type="submit"
                disabled={sending || cooldown > 0}
                className="rounded-full bg-foco-strong px-5 py-3 text-[15px] font-bold text-white shadow-[0_0_24px_rgba(30,136,255,.35)] disabled:opacity-60"
              >
                {sending ? 'Enviando…' : cooldown > 0 ? `Aguarde ${cooldown}s` : 'Receber link de acesso'}
              </button>

              {GOOGLE_ENABLED && (
                <>
                  <div className="flex items-center gap-3 text-xs text-muted" aria-hidden="true">
                    <span className="h-px flex-1 bg-line" /> ou <span className="h-px flex-1 bg-line" />
                  </div>
                  <button
                    type="button"
                    onClick={google}
                    className="flex items-center justify-center gap-2.5 rounded-full border border-line bg-panel-2 px-5 py-3 text-[15px] font-semibold text-soft hover:bg-[#1C2436]"
                  >
                    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
                      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
                    </svg>
                    Entrar com Google
                  </button>
                </>
              )}
            </form>
          )}

          {error && (
            <p role="alert" className="m-0 w-full rounded-xl border border-[#5A1C2A] bg-[#2A0F16] px-3.5 py-2.5 text-sm text-[#FDA4AF]">
              {error}
            </p>
          )}
        </section>

        <p className="m-0 text-center text-xs text-muted">
          Ao entrar, suas rotinas ficam salvas na sua conta e sincronizadas entre aparelhos.
        </p>
      </main>
      <Footer
        onPrivacy={() => {
          setPrivacy(true)
          window.scrollTo({ top: 0 })
        }}
      />
    </div>
  )
}
