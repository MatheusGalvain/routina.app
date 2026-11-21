import { Suspense, lazy, useState } from 'react'
import { Inicio } from './pages/Inicio'
import { Hoje } from './pages/Hoje'
import { Rotinas } from './pages/Rotinas'
import { Historico } from './pages/Historico'
import { Companheiro } from './pages/Companheiro'
import { useSyncTodayPlan } from './store/useSyncTodayPlan'
import { useCompanionProgress } from './store/useCompanion'
import { PetCelebration } from './components/pets/PetCelebration'

// Só existe no modo dev: em produção a condição vira `false` e o import some do build.
const DevPanel = import.meta.env.DEV ? lazy(() => import('./dev/DevPanel')) : null

type Page = 'inicio' | 'hoje' | 'historico' | 'rotinas' | 'pet'

const TABS: { id: Page; label: string }[] = [
  { id: 'inicio', label: 'Início' },
  { id: 'hoje', label: 'Hoje' },
  { id: 'historico', label: 'Histórico' },
  { id: 'rotinas', label: 'Rotinas' },
  { id: 'pet', label: 'Pet' },
]

export default function App() {
  useSyncTodayPlan()
  useCompanionProgress()
  const [page, setPage] = useState<Page>('inicio')
  const [routineId, setRoutineId] = useState<string | null>(null)

  const openRoutine = (id: string | null) => {
    setRoutineId(id)
    setPage('rotinas')
  }

  return (
    <section className="w-full">
      <div className="mx-auto flex flex-col max-w-[1320px] gap-6 px-4 pt-6 pb-14 sm:px-6">
        <nav aria-label="Seções" className="flex max-w-full gap-1 self-start overflow-x-auto rounded-full border border-line bg-panel p-1">
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

        {page === 'inicio' && <Inicio goToday={() => setPage('hoje')} openRoutine={openRoutine} />}
        {page === 'hoje' && <Hoje goRoutines={() => openRoutine(null)} />}
        {page === 'historico' && <Historico goToday={() => setPage('hoje')} />}
        {page === 'rotinas' && <Rotinas selectedId={routineId} select={setRoutineId} />}
      {page === 'pet' && <Companheiro />}
      <PetCelebration />

      {DevPanel && (
        <Suspense fallback={null}>
          <DevPanel />
        </Suspense>
      )}
      </div>

      <footer className="flex w-full gap-1 py-5 bg-panel p-1 justify-center items-center">
        <div className='font-extralight'>
          © 2026 / Matheus Galvain
        </div>
      </footer>
    </section>
  )
}
