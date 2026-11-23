import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase, GOOGLE_ENABLED, redirectTo } from '../lib/supabase'
import { Logo } from '../components/ui/ui'
import { Pet } from '../components/pets/Pet'
import { URL_ERROR } from '../lib/authUrl'
import { Footer } from '../components/ui/Footer'
import { OTP_LENGTH, cleanCode, logAuth, normalizeEmail } from '../lib/otp'

/** Intervalo mínimo entre e-mails para o mesmo endereço (padrão do Supabase). */
const RESEND_SECONDS = 60

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

/**
 * /entrar: link mágico no e-mail e, se ativado, Google.
 * Com `?token_hash=…` (o link do e-mail), mostra só o botão "Entrar" (ver ConfirmLink).
 */
export function Entrar() {
  const [params] = useSearchParams()
  const tokenHash = params.get('token_hash')
  return tokenHash ? <ConfirmLink tokenHash={tokenHash} type={params.get('type') === 'magiclink' ? 'magiclink' : 'email'} /> : <EntrarForm />
}

/**
 * Link do e-mail. O acesso só é gasto quando a pessoa aperta "Entrar": o Gmail, antivírus e
 * outros robôs que abrem links sozinhos não gastam mais o acesso antes dela. Também funciona em
 * qualquer navegador ou aparelho (o link não depende de onde o e-mail foi pedido).
 */
function ConfirmLink({ tokenHash, type }: { tokenHash: string; type: 'email' | 'magiclink' }) {
  const navigate = useNavigate()
  const [entering, setEntering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const enteringRef = useRef(false)

  const enter = async () => {
    if (enteringRef.current) return
    enteringRef.current = true
    setEntering(true)
    setError(null)
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    logAuth('verifyOtp', { type: `${type} (link)`, result: error ? `erro: ${error.message}` : 'ok' })
    enteringRef.current = false
    setEntering(false)
    // Deu certo: a sessão chega pelo useAuth e o PublicOnly leva para o app.
    if (error)
      setError(
        error.message.toLowerCase().includes('expired') || error.message.toLowerCase().includes('invalid')
          ? 'Esse link expirou ou já foi usado. Peça um acesso novo.'
          : 'Não deu para entrar agora. Verifique sua conexão e tente de novo.',
      )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto flex w-full max-w-[440px] flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
        <div className="flex items-center gap-3">
          <Logo size={40} />
          <h1 className="m-0 text-[34px] leading-none font-extrabold tracking-tight">
            Habbit <span className="text-accent">Do</span>
          </h1>
        </div>
        <section className="flex w-full flex-col items-center gap-5 rounded-[26px] border border-line bg-panel px-6 pt-7 pb-6 text-center">
          <Pet kind="gatinho" state="neutro" size={110} label="Gatinho esperando você entrar" />
          <h2 className="m-0 text-lg font-bold">Tudo pronto para entrar</h2>
          <p className="m-0 text-sm text-muted">Aperte o botão para abrir sua conta neste navegador.</p>
          <button
            type="button"
            onClick={() => void enter()}
            disabled={entering}
            className="w-full rounded-full bg-accent px-5 py-3 text-[15px] font-bold text-ink shadow-[0_0_24px_color-mix(in_srgb,var(--color-accent)_30%,transparent)] disabled:opacity-60"
          >
            {entering ? 'Entrando…' : 'Entrar'}
          </button>
          {error && (
            <>
              <p role="alert" className="m-0 w-full rounded-xl border border-erro/40 bg-erro/10 px-3.5 py-2.5 text-sm text-erro">
                {error}
              </p>
              <button type="button" onClick={() => navigate('/entrar', { replace: true })} className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-soft hover:bg-panel-2">
                Pedir um acesso novo
              </button>
            </>
          )}
        </section>
      </main>
      <Footer />
    </div>
  )
}

function EntrarForm() {
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(URL_ERROR)
  const [cooldown, setCooldown] = useState(0)
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  /** A verificação falhou: mostra "Pedir um código novo" (nada é reenviado sozinho). */
  const [codeFailed, setCodeFailed] = useState(false)
  // Travas síncronas: o estado do React só atualiza no próximo render, então dois eventos seguidos
  // (Enter + clique, colar + digitar) passariam pelo `sending`/`verifying`. O ref barra na hora.
  const sendingRef = useRef(false)
  const verifyingRef = useRef(false)
  /** Códigos já verificados desde o último envio: cada código vai ao servidor uma vez só. */
  const triedRef = useRef(new Set<string>())

  useEffect(() => {
    if (cooldown <= 0) return
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => window.clearTimeout(t)
  }, [cooldown])

  /** Único lugar que pede e-mail. Só roda quando a pessoa aperta um botão. */
  const sendLink = async (e?: FormEvent) => {
    e?.preventDefault()
    const target = normalizeEmail(sentTo ?? email)
    if (!target || sendingRef.current || cooldown > 0) return
    sendingRef.current = true
    setSending(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({ email: target, options: { emailRedirectTo: redirectTo() } })
    logAuth('signInWithOtp', { email: target, result: error ? `erro: ${error.message}` : 'ok' })
    sendingRef.current = false
    setSending(false)
    if (error) {
      const f = friendly(error.message)
      setError(f.text)
      if (f.wait) setCooldown(f.wait)
      return
    }
    setSentTo(target)
    setCode('')
    setCodeFailed(false)
    triedRef.current.clear()
    setCooldown(RESEND_SECONDS)
  }

  /**
   * Código do e-mail: funciona em qualquer aparelho (lê no celular, digita no PC).
   * Única função que chama verifyOtp: usada pelo envio automático (ao completar os dígitos) e
   * pelo botão. Tenta `email` e, se o servidor disser que o código é inválido, uma vez `signup`
   * (o primeiro e-mail de uma conta nova é a confirmação de cadastro).
   */
  const verifyCode = async (raw: string) => {
    const token = cleanCode(raw)
    if (!sentTo || token.length !== OTP_LENGTH || verifyingRef.current) return
    if (triedRef.current.has(token)) {
      setError('Esse código já foi testado e não funcionou. Confira os números ou peça um código novo.')
      setCodeFailed(true)
      return
    }
    verifyingRef.current = true
    triedRef.current.add(token)
    setVerifying(true)
    setError(null)
    setCodeFailed(false)

    let { error } = await supabase.auth.verifyOtp({ email: sentTo, token, type: 'email' })
    logAuth('verifyOtp', { email: sentTo, codeLength: token.length, type: 'email', result: error ? `erro: ${error.message}` : 'ok' })
    if (error && /invalid|expired/i.test(error.message)) {
      ;({ error } = await supabase.auth.verifyOtp({ email: sentTo, token, type: 'signup' }))
      logAuth('verifyOtp', { email: sentTo, codeLength: token.length, type: 'signup', result: error ? `erro: ${error.message}` : 'ok' })
    }

    verifyingRef.current = false
    setVerifying(false)
    // Deu certo: a sessão chega pelo useAuth e o PublicOnly leva para o app.
    if (error) {
      setCodeFailed(true)
      setError(
        /expired|invalid/i.test(error.message)
          ? 'Esse código não funcionou: ele pode ter expirado ou ser de um e-mail anterior. Confira os números no e-mail mais recente ou peça um código novo.'
          : 'Não deu para entrar agora. Verifique sua conexão e tente de novo.',
      )
    }
  }

  /** Digitar e colar passam só por aqui (colar dispara um único onChange). */
  const changeCode = (value: string) => {
    const next = cleanCode(value)
    setCode(next)
    if (next.length === OTP_LENGTH) void verifyCode(next)
  }

  const google = async () => {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo() } })
    if (error) setError(friendly(error.message).text)
  }

  const bubble = sentTo ? 'Prontinho! Agora é só abrir o seu e-mail.' : 'Oi! Que bom te ver por aqui. Vamos organizar o seu dia?'

  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto flex w-full max-w-[440px] flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
        <div className="flex items-center gap-3">
          <Logo size={40} />
          <h1 className="m-0 text-[34px] leading-none font-extrabold tracking-tight">
            Habbit <span className="text-accent">Do</span>
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
                className="relative m-0 rounded-2xl border border-line-2 bg-panel-2 px-4 py-2.5 text-center text-sm text-soft"
                aria-live="polite"
              >
                {bubble}
                <span aria-hidden="true" className="absolute -bottom-[7px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-r border-b border-line-2 bg-panel-2" />
              </motion.p>
            </AnimatePresence>
            <div className="relative grid h-[150px] w-[150px] place-items-center">
              <div className="absolute h-[140px] w-[140px] rounded-full border border-fg/15" />
              <Pet kind="gatinho" state={sentTo ? 'concluido' : 'neutro'} size={120} label="Gatinho dando boas-vindas" />
            </div>
          </div>

          {sentTo ? (
            <div className="flex w-full flex-col gap-3 text-center">
              <h2 className="m-0 text-lg font-bold">Confira seu e-mail</h2>
              <p className="m-0 text-sm text-muted">
                Enviamos um e-mail para <strong className="text-soft">{sentTo}</strong>. Abra o link ou digite aqui o código de {OTP_LENGTH} dígitos. Use
                sempre o e-mail <strong className="text-soft">mais recente</strong>: cada envio novo cancela o anterior.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  void verifyCode(code)
                }}
                className="flex flex-col items-center gap-2"
              >
                <label htmlFor="otp" className="sr-only">
                  Código de {OTP_LENGTH} dígitos do e-mail
                </label>
                <input
                  id="otp"
                  value={code}
                  onChange={(e) => changeCode(e.target.value)}
                  maxLength={OTP_LENGTH}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder={'0'.repeat(OTP_LENGTH)}
                  className="w-[200px] rounded-xl border border-line bg-ink px-3 py-3 text-center font-mono text-2xl tracking-[0.35em] text-soft placeholder:text-muted"
                />
                <button
                  type="submit"
                  disabled={code.length !== OTP_LENGTH || verifying}
                  className="rounded-full bg-accent px-6 py-2.5 text-sm font-bold text-ink shadow-[0_0_24px_color-mix(in_srgb,var(--color-accent)_30%,transparent)] disabled:opacity-40 disabled:shadow-none"
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
                className="rounded-xl border border-line bg-ink px-3.5 py-3 text-soft placeholder:text-muted"
              />
              <button
                type="submit"
                disabled={sending || cooldown > 0}
                className="rounded-full bg-accent px-5 py-3 text-[15px] font-bold text-ink shadow-[0_0_24px_color-mix(in_srgb,var(--color-accent)_30%,transparent)] disabled:opacity-60"
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
                    className="flex items-center justify-center gap-2.5 rounded-full border border-line bg-panel-2 px-5 py-3 text-[15px] font-semibold text-soft hover:bg-line"
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
            <p role="alert" className="m-0 w-full rounded-xl border border-erro/40 bg-erro/10 px-3.5 py-2.5 text-sm text-erro">
              {error}
            </p>
          )}
          {sentTo && codeFailed && (
            <button
              type="button"
              onClick={() => void sendLink()}
              disabled={sending || cooldown > 0}
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-ink disabled:opacity-50"
            >
              {cooldown > 0 ? `Pedir um código novo em ${cooldown}s` : sending ? 'Enviando…' : 'Pedir um código novo'}
            </button>
          )}
        </section>

        <p className="m-0 text-center text-xs text-muted">
          Ao entrar, suas rotinas ficam salvas na sua conta e sincronizadas entre aparelhos.
        </p>
      </main>
      <Footer />
    </div>
  )
}
