import { useEffect, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase, GOOGLE_ENABLED, redirectTo } from '../lib/supabase'
import { Logo } from '../components/ui/ui'
import { Pet } from '../components/pets/Pet'
import { Privacidade } from './Privacidade'
import { Footer } from '../components/ui/Footer'

const RESEND_SECONDS = 60

/** Erro que volta na URL quando o link mágico expirou ou já foi usado. */
function readUrlError() {
  const params = new URLSearchParams(window.location.hash.slice(1) || window.location.search)
  const code = params.get('error_code')
  if (!params.get('error') && !code) return null
  // Limpa a URL para o erro não reaparecer ao recarregar.
  window.history.replaceState(null, '', window.location.pathname)
  if (code === 'otp_expired') return 'Esse link expirou ou já foi usado. Peça um novo abaixo.'
  return 'Não deu para entrar com esse link. Tente pedir outro.'
}

function friendly(message: string) {
  const m = message.toLowerCase()
  if (m.includes('rate limit') || m.includes('security purposes')) return 'Muitos pedidos seguidos. Espere um minutinho e tente de novo.'
  if (m.includes('invalid') && m.includes('email')) return 'Esse e-mail não parece válido. Confere?'
  if (m.includes('provider is not enabled')) return 'O login com Google ainda não está ativado.'
  return 'Não foi possível enviar agora. Verifique sua conexão e tente de novo.'
}

/** Tela de entrada: link mágico no e-mail e, se ativado, Google. */
export function Entrar() {
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(() => readUrlError())
  const [cooldown, setCooldown] = useState(0)
  const [privacy, setPrivacy] = useState(false)

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
    if (error) return setError(friendly(error.message))
    setSentTo(target)
    setCooldown(RESEND_SECONDS)
  }

  const google = async () => {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo() } })
    if (error) setError(friendly(error.message))
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
            rotina<span className="text-[#5AA7FF]">.app</span>
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
                Enviamos um link de acesso para <strong className="text-soft">{sentTo}</strong>. Abra o link neste mesmo navegador para entrar.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => sendLink()}
                  disabled={sending || cooldown > 0}
                  className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-soft hover:bg-panel-2 disabled:opacity-50"
                >
                  {cooldown > 0 ? `Reenviar em ${cooldown}s` : sending ? 'Enviando…' : 'Reenviar link'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSentTo(null)
                    setError(null)
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
                Entre com seu e-mail. Você recebe um link, sem senha.
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
