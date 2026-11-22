import { Suspense, lazy, useState } from 'react'
import { Inicio } from './pages/Inicio'
import { Hoje } from './pages/Hoje'
import { Rotinas } from './pages/Rotinas'
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
import { Logo } from './components/ui/ui'
import { useSession } from './sync/session'
import { SyncNotice } from './components/sync/SyncNotice'
import { LocalImportPrompt } from './components/sync/LocalImportPrompt'
import { NamePrompt } from './components/sync/NamePrompt'
import { Footer } from './components/ui/Footer'

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
  const [routineId, setRoutineId] = useState<string | null>(null)

  const openCollection = () => {
    setPage('pet')
    requestAnimationFrame(() => document.getElementById('colecao')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const openRoutine = (id: string | null) => {
    setRoutineId(id)
    setPage('rotinas')
  }

  return (
    <section className="flex min-h-screen w-full flex-col">
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-6 px-4 pt-6 pb-14 sm:px-6">
        <div className="flex items-center justify-between gap-3">
        <nav aria-label="Seções" className="flex min-w-0 max-w-full gap-1 self-start overflow-x-auto rounded-full border border-line bg-panel p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-current={page === t.id ? 'page' : undefined}
              onClick={() => setPage(t.id)}
              className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold sm:px-4 ${page === t.id ? 'bg-[#1C2436] text-white' : 'text-muted hover:text-soft'}`}
            >
              {t.label}
            </button>
          ))}
        </nav>
          <ProfileButton current={page === 'perfil'} onClick={() => setPage('perfil')} />
        </div>

        {page === 'inicio' && <Inicio goToday={() => setPage('hoje')} openRoutine={openRoutine} />}
        {page === 'hoje' && <Hoje goRoutines={() => openRoutine(null)} />}
        {page === 'historico' && <Historico goToday={() => setPage('hoje')} />}
        {page === 'rotinas' && <Rotinas selectedId={routineId} select={setRoutineId} />}
      {page === 'pet' && <Companheiro />}
      {page === 'perfil' && <Perfil openPrivacy={openPrivacy} openCollection={openCollection} />}
      {page === 'privacidade' && <Privacidade onBack={() => setPage(beforePrivacy)} />}
      <PetCelebration />
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

/** Avatar no topo: o pet favorito, que abre o perfil. */
function ProfileButton({ current, onClick }: { current: boolean; onClick: () => void }) {
  const pet = useShownPet('neutro')
  return (
    <button
      type="button"
      aria-label="Perfil"
      aria-current={current ? 'page' : undefined}
      onClick={onClick}
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border bg-panel ${current ? 'border-[#5AA7FF]' : 'border-line hover:border-[#2A3242]'}`}
    >
      <Pet kind={pet.kind} phase={pet.phase} accessories={pet.accessories} sleeping={pet.sleeping} size={32} interactive={false} float={false} />
    </button>
  )
}
