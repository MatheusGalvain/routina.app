import { Suspense, lazy, useEffect, type ReactNode } from 'react'
import { Navigate, Outlet, useLocation, useMatches } from 'react-router-dom'
import { useAuth } from './store/useAuth'
import { peekPending, rememberPending } from './lib/authUrl'
import { withReload } from './lib/staleBuild'
import { BunnyMark } from './components/ui/BunnyMark'
import { prefersReducedMotion } from './lib/motion'
import { HOME } from './lib/navigation'
import type { RouteHandle } from './router'

/*
 * Parte leve do roteamento: é o que vai no arquivo inicial do site.
 * Quem chega pela landing baixa só isto + a landing; o app inteiro (App.tsx, stores, pets,
 * cenários) só carrega depois do login.
 */

/** O app logado (dados da conta, janelas por cima das páginas) e a landing, cada um no seu arquivo. */
const AuthedApp = lazy(withReload(() => import('./App').then((m) => ({ default: m.AuthedApp }))))
const Landing = lazy(withReload(() => import('./pages/landing/Landing').then((m) => ({ default: m.Landing }))))
// Sem sessão, a política e as novidades também abrem (links do rodapé da landing e da tela de entrada).
const PrivacidadePublica = lazy(withReload(() => import('./pages/Privacidade').then((m) => ({ default: m.PrivacidadePublica }))))
const NovidadesPublica = lazy(withReload(() => import('./pages/Novidades').then((m) => ({ default: m.NovidadesPublica }))))

/** Carregamento antes do app: o símbolo do coelho piscando devagar (sem os pets, que ficam no app). */
export function BootLoader({ text = 'Carregando…' }: { text?: string }) {
  return (
    <div className="grid min-h-screen place-items-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3">
        <div className="motion-safe:animate-pulse">
          <BunnyMark size={72} label={null} />
        </div>
        <span className="text-sm text-muted">{text}</span>
      </div>
    </div>
  )
}

/**
 * Raiz de todas as rotas: título da aba, rolar para o topo ao trocar de página
 * (ou até a âncora, como /pet#colecao) e o carregamento das páginas.
 */
export function RootLayout() {
  const { pathname, search, hash, state } = useLocation()
  const matches = useMatches()
  // Renomear a rotina troca a URL (/rotinas/<nome>) a cada tecla: aí não rola para o topo.
  const renaming = !!(state as { rename?: boolean } | null)?.rename
  const handle = [...matches].reverse().find((m) => {
    const h = m.handle as RouteHandle | undefined
    return h?.title || h?.documentTitle
  })?.handle as RouteHandle | undefined

  useEffect(() => {
    document.title = handle?.documentTitle ?? (handle?.title ? `${handle.title} · Habbit Do` : 'Habbit Do')
  }, [handle?.title, handle?.documentTitle])

  useEffect(() => {
    if (renaming) return
    // Sem `return window.scrollTo(...)`: no Chrome ele devolve uma Promise, e o React
    // trataria isso como a limpeza do efeito ("l is not a function" ao trocar de página).
    if (!hash) {
      window.scrollTo({ top: 0 })
      return
    }
    // A página pode estar carregando: procura a âncora por até 2 s.
    let tries = 0
    const timer = window.setInterval(() => {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)))
      if (el || ++tries > 20) window.clearInterval(timer)
      el?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
    }, 100)
    return () => window.clearInterval(timer)
  }, [pathname, search, hash])

  return (
    <Suspense fallback={<BootLoader />}>
      <Outlet />
    </Suspense>
  )
}

/**
 * Tem sessão guardada neste navegador (ou um login com Google voltando)? O cliente do Supabase
 * guarda tudo em chaves `sb-<projeto>-auth-token…`. Ler isso é instantâneo, então quem não tem
 * conta vê a landing na hora, sem esperar o Supabase responder.
 */
function mayHaveSession() {
  try {
    for (let i = 0; i < localStorage.length; i++) if (/^sb-.+-auth-token/.test(localStorage.key(i) ?? '')) return true
  } catch {
    /* sem armazenamento: não tem sessão guardada */
  }
  return false
}

/** "/": quem já está logado vai para o Início; quem não está vê a landing. */
export function Home() {
  const status = useAuth((s) => s.status)
  if (status === 'signedIn') return <Navigate to={HOME} replace />
  if (status === 'loading' && mayHaveSession()) return <BootLoader />
  return <Landing />
}

/** /entrar: com sessão, volta para a rota que a pessoa tentou abrir (ou para o início). */
export function PublicOnly({ children }: { children: ReactNode }) {
  const status = useAuth((s) => s.status)
  const location = useLocation()
  if (status === 'loading') return <BootLoader />
  if (status === 'signedIn') {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from ?? peekPending() ?? HOME} replace />
  }
  return <>{children}</>
}

/** Sem sessão: vai para /entrar guardando a rota pedida (menos quando a pessoa acabou de sair da conta). */
function ToLogin() {
  const { pathname, search, hash } = useLocation()
  const signedOutNow = useAuth((s) => s.hadSession)
  const from = pathname + search + hash
  useEffect(() => {
    if (!signedOutNow) rememberPending(from)
  }, [from, signedOutNow])
  return <Navigate to="/entrar" replace state={signedOutNow ? null : { from }} />
}

/** Protege o app: espera o login; com sessão, carrega o app (que espera os dados da conta). */
export function RequireAuth() {
  const status = useAuth((s) => s.status)
  const { pathname } = useLocation()

  if (status === 'signedOut') {
    if (pathname === '/privacidade') return <PrivacidadePublica />
    if (pathname === '/novidades') return <NovidadesPublica />
    return <ToLogin />
  }
  if (status === 'loading') return <BootLoader />
  return <AuthedApp />
}
