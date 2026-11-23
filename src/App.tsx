import { Suspense, lazy, useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, Navigate, Outlet, useLocation, useMatches, useNavigate } from 'react-router-dom'
import { Pet } from './components/pets/Pet'
import { useShownPet } from './store/useCompanion'
import { useSyncTodayPlan } from './store/useSyncTodayPlan'
import { useCompanionProgress } from './store/useCompanion'
import { useTrophyProgress } from './store/useTrophies'
import { PetCelebration } from './components/pets/PetCelebration'
import { useAuth } from './store/useAuth'
import { Icon } from './components/ui/ui'
import { useSession } from './sync/session'
import { SyncNotice } from './components/sync/SyncNotice'
import { LocalImportPrompt } from './components/sync/LocalImportPrompt'
import { NamePrompt } from './components/sync/NamePrompt'
import { Footer } from './components/ui/Footer'
import { PetLoader } from './components/ui/PetLoader'
import { Toaster } from './components/ui/Toast'
import { Tour } from './components/help/Tour'
import { useRotina } from './store/useRotina'
import { setOnboardingDone } from './sync/session'
import { readLegacy } from './sync/legacy'
import { peekPending, rememberPending, takePending } from './lib/authUrl'
import type { RouteHandle } from './router'

// Só existe no modo dev: em produção a condição vira `false` e o import some do build.
const DevPanel = import.meta.env.DEV ? lazy(() => import('./dev/DevPanel')) : null
// A política também abre sem sessão (link no rodapé da tela de entrada).
const Privacidade = lazy(() => import('./pages/Privacidade').then((m) => ({ default: m.Privacidade })))

const TABS: { to: string; label: string }[] = [
  { to: '/', label: 'Início' },
  { to: '/hoje', label: 'Hoje' },
  { to: '/rotinas', label: 'Rotinas' },
  { to: '/pet', label: 'Pets' },
  { to: '/historico', label: 'Histórico' },
]

/** A rota atual pertence a esta aba? ("/" só na raiz; "/rotinas" também em "/rotinas/:id".) */
const tabActive = (to: string, pathname: string) => (to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`))

/**
 * Raiz de todas as rotas: título da aba, rolar para o topo ao trocar de página
 * (ou até a âncora, como /pet#colecao) e o carregamento das páginas.
 */
export function RootLayout() {
  const { pathname, search, hash, state } = useLocation()
  const matches = useMatches()
  // Renomear a rotina troca a URL (/rotinas/<nome>) a cada tecla: aí não rola para o topo.
  const renaming = !!(state as { rename?: boolean } | null)?.rename
  const title = [...matches].reverse().find((m) => (m.handle as RouteHandle | undefined)?.title)?.handle as RouteHandle | undefined

  useEffect(() => {
    document.title = title?.title ? `${title.title} · Habbit Do` : 'Habbit Do'
  }, [title?.title])

  useEffect(() => {
    if (renaming) return
    if (!hash) return window.scrollTo({ top: 0 })
    // A página pode estar carregando: procura a âncora por até 2 s.
    let tries = 0
    const timer = window.setInterval(() => {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)))
      if (el || ++tries > 20) window.clearInterval(timer)
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
    return () => window.clearInterval(timer)
  }, [pathname, search, hash])

  return (
    <Suspense fallback={<PetLoader full />}>
      <Outlet />
    </Suspense>
  )
}

/** /entrar: com sessão, volta para a rota que a pessoa tentou abrir (ou para o início). */
export function PublicOnly({ children }: { children: ReactNode }) {
  const status = useAuth((s) => s.status)
  const location = useLocation()
  if (status === 'loading') return <PetLoader full />
  if (status === 'signedIn') {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from ?? peekPending() ?? '/'} replace />
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

/** Protege o app: espera o login e os dados da conta antes de mostrar qualquer página. */
export function RequireAuth() {
  const status = useAuth((s) => s.status)
  const data = useSession((s) => s.status)
  const { pathname } = useLocation()
  const navigate = useNavigate()

  if (status === 'signedOut') {
    if (pathname === '/privacidade')
      return (
        <div className="flex min-h-screen flex-col">
          <main className="flex-1 px-4 py-8">
            <Suspense fallback={<PetLoader />}>
              <Privacidade onBack={() => navigate('/entrar')} />
            </Suspense>
          </main>
          <Footer />
        </div>
      )
    return <ToLogin />
  }
  if (status === 'loading' || data !== 'ready') return <PetLoader full text={status === 'signedIn' ? 'Carregando suas rotinas…' : 'Carregando…'} />
  return <SignedIn />
}

/** Com sessão e dados prontos: o que roda em todas as páginas e as janelas por cima delas. */
function SignedIn() {
  useSyncTodayPlan()
  useCompanionProgress()
  useTrophyProgress()
  useReturnAfterLogin()
  useFirstAccessOnboarding()

  return (
    <>
      <Outlet />
      <PetCelebration />
      <Toaster />
      <Tour />
      <SyncNotice />
      <LocalImportPrompt />
      <NamePrompt />
      {DevPanel && (
        <Suspense fallback={null}>
          <DevPanel />
        </Suspense>
      )}
    </>
  )
}

/** Link do e-mail aberto em outra aba: o app abre na raiz e volta para a rota que a pessoa tinha pedido. */
function useReturnAfterLogin() {
  const navigate = useNavigate()
  const { pathname, search, hash } = useLocation()
  useEffect(() => {
    const pending = takePending()
    if (pending && pending !== pathname + search + hash) navigate(pending, { replace: true })
  }, [])
}

/** Header, página e rodapé. As páginas carregam aqui dentro, sem esconder o header. */
export function AppShell() {
  return (
    <section className="flex min-h-screen w-full flex-col">
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-6 px-4 pt-6 pb-14 sm:px-6">
        <header className="flex items-center justify-between gap-3">
          <SectionNav />
          <ProfileButton />
        </header>
        <main className="flex flex-col">
          <Suspense fallback={<PetLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <Footer />
    </section>
  )
}

const tabClass = (active: boolean) => (active ? 'bg-accent/15 text-fg' : 'text-muted hover:text-soft')

/** Navegação das seções: abas a partir de 768px; abaixo disso, menu hambúrguer. */
function SectionNav() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const current = TABS.find((t) => tabActive(t.to, pathname))

  const close = (focusButton = true) => {
    setOpen(false)
    if (focusButton) buttonRef.current?.focus()
  }

  // Trocou de página (por um link do menu ou não): fecha o menu.
  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return
    // Leva o foco para a opção atual (ou a primeira) ao abrir.
    const items = listRef.current?.querySelectorAll<HTMLAnchorElement>('a')
    const target = Array.from(items ?? []).find((b) => b.getAttribute('aria-current') === 'page') ?? items?.[0]
    target?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    const onPointer = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) close(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  return (
    <>
      <nav aria-label="Seções" className="hidden min-w-0 max-w-full gap-1 self-start rounded-full border border-line bg-panel p-1 md:flex">
        {/* NavLink marca a aba atual com aria-current="page". */}
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.to === '/'} className={({ isActive }) => `shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${tabClass(isActive)}`}>
            {t.label}
          </NavLink>
        ))}
      </nav>

      <div ref={wrapRef} className="relative md:hidden">
        <button
          ref={buttonRef}
          type="button"
          aria-label="Abrir menu"
          aria-expanded={open}
          aria-controls="menu-secoes"
          onClick={() => (open ? close() : setOpen(true))}
          className="inline-flex h-11 items-center gap-2.5 rounded-full border border-line bg-panel px-4 text-sm font-semibold text-soft"
        >
          <Icon name={open ? 'x' : 'menu'} size={18} />
          {current?.label ?? 'Menu'}
        </button>
        {open && (
          <nav id="menu-secoes" aria-label="Seções" className="absolute top-[calc(100%+8px)] left-0 z-40 w-56 rounded-2xl border border-line bg-panel p-1.5 shadow-[0_12px_40px_rgba(0,0,0,.5)]">
            <ul ref={listRef} className="m-0 flex list-none flex-col gap-0.5 p-0">
              {TABS.map((t) => (
                <li key={t.to}>
                  <NavLink
                    to={t.to}
                    end={t.to === '/'}
                    onClick={() => close(false)}
                    className={({ isActive }) => `flex min-h-11 w-full items-center rounded-xl px-4 text-left text-[15px] font-semibold ${tabClass(isActive)}`}
                  >
                    {t.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </>
  )
}

/**
 * Leva a conta nova para o onboarding (/bem-vindo), uma vez por sessão, depois das perguntas de nome e de dados antigos.
 * Quem já tem pet e rotina (ex.: usava o app antes) só fica marcado como concluído.
 */
function useFirstAccessOnboarding() {
  const profile = useSession((s) => s.profile)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const checked = useRef(false)
  useEffect(() => {
    if (checked.current || !profile || profile.onboardingDone) return
    if (profile.displayName === null) return // ainda perguntando o nome
    if (!profile.localImportAnswered && readLegacy()) return // ainda perguntando dos dados antigos
    checked.current = true
    const { companion, routines } = useRotina.getState()
    const hasRoutines = routines.some((r) => !r.dev)
    if (companion.kind && hasRoutines) return setOnboardingDone()
    if (pathname !== '/bem-vindo') navigate(`/bem-vindo?passo=${companion.kind ? 2 : 1}`)
  }, [profile])
}

/** Avatar no topo: o pet favorito, que abre o perfil. */
function ProfileButton() {
  const pet = useShownPet('neutro')
  return (
    <NavLink to="/perfil" className="group flex shrink-0 items-center gap-3 rounded-full text-sm font-semibold text-soft hover:text-fg">
      {({ isActive }) => (
        <>
          <span className="hidden sm:inline">Meu perfil</span>
          <span
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border bg-panel ${isActive ? 'border-accent' : 'border-line group-hover:border-line-2'}`}
          >
            <span className="sr-only sm:hidden">Meu perfil</span>
            <Pet kind={pet.kind} phase={pet.phase} accessories={pet.accessories} sleeping={pet.sleeping} size={32} interactive={false} float={false} />
          </span>
        </>
      )}
    </NavLink>
  )
}
