import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { Inicio } from './pages/Inicio'
import { Hoje } from './pages/Hoje'
import { Rotinas, type Selection } from './pages/Rotinas'
import { Historico } from './pages/Historico'
import { Companheiro } from './pages/Companheiro'
import { Privacidade } from './pages/Privacidade'
import { Perfil } from './pages/Perfil'
import { Pet } from './components/pets/Pet'
import { useShownPet } from './store/useCompanion'
import { useSyncTodayPlan } from './store/useSyncTodayPlan'
import { useCompanionProgress } from './store/useCompanion'
import { useTrophyProgress } from './store/useTrophies'
import { PetCelebration } from './components/pets/PetCelebration'
import { Entrar } from './pages/Entrar'
import { useAuth } from './store/useAuth'
import { Icon, Logo } from './components/ui/ui'
import { useSession } from './sync/session'
import { SyncNotice } from './components/sync/SyncNotice'
import { LocalImportPrompt } from './components/sync/LocalImportPrompt'
import { NamePrompt } from './components/sync/NamePrompt'
import { Footer } from './components/ui/Footer'
import { Onboarding } from './components/onboarding/Onboarding'
import { Tour, useTour } from './components/help/Tour'
import { useOnboarding } from './store/useOnboarding'
import { useRotina } from './store/useRotina'
import { setOnboardingDone } from './sync/session'
import { readLegacy } from './sync/legacy'
import type { TodayTarget } from './components/home/PrimaryAction'
import { div } from 'framer-motion/client'

// Só existe no modo dev: em produção a condição vira `false` e o import some do build.
const DevPanel = import.meta.env.DEV ? lazy(() => import('./dev/DevPanel')) : null

type Page = 'inicio' | 'hoje' | 'historico' | 'rotinas' | 'pet' | 'perfil' | 'privacidade'

const TABS: { id: Page; label: string }[] = [
  { id: 'inicio', label: 'Início' },
  { id: 'hoje', label: 'Hoje' },
  { id: 'historico', label: 'Histórico' },
  { id: 'rotinas', label: 'Rotinas' },
  { id: 'pet', label: 'Pet' },
]

/** Sem sessão: tela de entrada. Com sessão: o app. */
export default function App() {
  const status = useAuth((s) => s.status)
  const data = useSession((s) => s.status)
  if (status === 'signedOut') return <Entrar />
  // Espera o login e os dados da conta antes de mostrar o app.
  if (status === 'loading' || data !== 'ready')
    return (
      <div className="grid min-h-screen place-items-center" role="status">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-pulse">
            <Logo size={44} />
          </div>
          <span className="text-sm text-muted">{status === 'signedIn' ? 'Carregando suas rotinas…' : 'Carregando…'}</span>
        </div>
      </div>
    )
  return <AppShell />
}

function AppShell() {
  useSyncTodayPlan()
  useCompanionProgress()
  useTrophyProgress()
  const [page, setPage] = useState<Page>('inicio')
  // A política abre por cima da página atual e o "Voltar" retorna para ela.
  const [beforePrivacy, setBeforePrivacy] = useState<Page>('inicio')
  const openPrivacy = () => {
    if (page !== 'privacidade') setBeforePrivacy(page)
    setPage('privacidade')
    window.scrollTo({ top: 0 })
  }
  const [selection, setSelection] = useState<Selection>(null)

  const openCollection = () => {
    setPage('pet')
    requestAnimationFrame(() => document.getElementById('colecao')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const openRoutine = (id: string | null) => {
    setSelection(id ? { kind: 'routine', id } : null)
    setPage('rotinas')
  }
  const openTemplate = (id: string) => {
    setSelection({ kind: 'template', id })
    setPage('rotinas')
  }

  /** Abre o Hoje; com alvo, rola até o bloco (e leva o foco para ele) ou até a revisão da noite. */
  const goToday = (target?: TodayTarget) => {
    setPage('hoje')
    if (!target) return window.scrollTo({ top: 0 })
    window.setTimeout(() => {
      const el = target.review ? document.getElementById('nota') : document.getElementById(`bloco-${target.blockId}`)
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const focusable = target.review ? el : el.querySelector<HTMLElement>('button')
      focusable?.focus({ preventScroll: true })
    }, 80)
  }

  useFirstAccessOnboarding()

  return (
    <section className="flex min-h-screen w-full flex-col">
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-6 px-4 pt-6 pb-14 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <SectionNav page={page} onSelect={setPage} />
          <ProfileButton current={page === 'perfil'} onClick={() => setPage('perfil')} />
        </div>

        {page === 'inicio' && <Inicio goToday={goToday} openRoutine={openRoutine} openTemplate={openTemplate} />}
        {page === 'hoje' && <Hoje goRoutines={() => openRoutine(null)} />}
        {page === 'historico' && <Historico goToday={() => goToday()} />}
        {page === 'rotinas' && <Rotinas selected={selection} select={setSelection} />}
      {page === 'pet' && <Companheiro />}
      {page === 'perfil' && <Perfil
          openPrivacy={openPrivacy}
          openCollection={openCollection}
          startTour={() => {
            setPage('inicio')
            window.scrollTo({ top: 0 })
            useTour.getState().start()
          }}
        />}
      {page === 'privacidade' && <Privacidade onBack={() => setPage(beforePrivacy)} />}
      <PetCelebration />
      <Onboarding onFinish={() => setPage('inicio')} />
      <Tour />
      <SyncNotice />
      <LocalImportPrompt />
      <NamePrompt />

      {DevPanel && (
        <Suspense fallback={null}>
          <DevPanel />
        </Suspense>
      )}
      </div>

      <Footer onPrivacy={openPrivacy} />
    </section>
  )
}

/** Navegação das seções: abas a partir de 768px; abaixo disso, menu hambúrguer. */
function SectionNav({ page, onSelect }: { page: Page; onSelect: (p: Page) => void }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const current = TABS.find((t) => t.id === page)

  const close = () => {
    setOpen(false)
    buttonRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    // Leva o foco para a opção atual (ou a primeira) ao abrir.
    const items = listRef.current?.querySelectorAll<HTMLButtonElement>('button')
    const target = Array.from(items ?? []).find((b) => b.getAttribute('aria-current') === 'page') ?? items?.[0]
    target?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    const onPointer = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) close()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  const tabClass = (active: boolean) => (active ? 'bg-[#1C2436] text-white' : 'text-muted hover:text-soft')

  return (
    <>
      <nav aria-label="Seções" className="hidden min-w-0 max-w-full gap-1 self-start rounded-full border border-line bg-panel p-1 md:flex">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-current={page === t.id ? 'page' : undefined}
            onClick={() => onSelect(t.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${tabClass(page === t.id)}`}
          >
            {t.label}
          </button>
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
                <li key={t.id}>
                  <button
                    type="button"
                    aria-current={page === t.id ? 'page' : undefined}
                    onClick={() => {
                      onSelect(t.id)
                      close()
                    }}
                    className={`flex min-h-11 w-full items-center rounded-xl px-4 text-left text-[15px] font-semibold ${tabClass(page === t.id)}`}
                  >
                    {t.label}
                  </button>
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
 * Abre o onboarding na conta nova, uma vez por sessão, depois das perguntas de nome e de dados antigos.
 * Quem já tem pet e rotina (ex.: usava o app antes) só fica marcado como concluído.
 */
function useFirstAccessOnboarding() {
  const profile = useSession((s) => s.profile)
  const checked = useRef(false)
  useEffect(() => {
    if (checked.current || !profile || profile.onboardingDone) return
    if (profile.displayName === null) return // ainda perguntando o nome
    if (!profile.localImportAnswered && readLegacy()) return // ainda perguntando dos dados antigos
    checked.current = true
    const { companion, routines } = useRotina.getState()
    const hasRoutines = routines.some((r) => !r.dev)
    if (companion.kind && hasRoutines) return setOnboardingDone()
    useOnboarding.getState().show(companion.kind ? 2 : 1)
  }, [profile])
}

/** Avatar no topo: o pet favorito, que abre o perfil. */
function ProfileButton({ current, onClick }: { current: boolean; onClick: () => void }) {
  const pet = useShownPet('neutro')
  return (
    <a aria-current={current ? 'page' : undefined}  onClick={onClick} className='flex justify-center text-soft" items-center gap-4 cursor-pointer'>
       Meu Perfil
       <button
          type="button"
          aria-label="Perfil"
          aria-current={current ? 'page' : undefined}
          onClick={onClick}
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full cursor-pointer border bg-panel ${current ? 'border-[#5AA7FF]' : 'border-line hover:border-[#2A3242]'}`}
        >
      <Pet kind={pet.kind} phase={pet.phase} accessories={pet.accessories} sleeping={pet.sleeping} size={32} interactive={false} float={false} />
    </button>
   </a>
   
  )
}
