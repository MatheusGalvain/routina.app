import { useState } from 'react'
import { Inicio } from './pages/Inicio'
import { Hoje } from './pages/Hoje'
import { Rotinas } from './pages/Rotinas'

type Page = 'inicio' | 'hoje' | 'rotinas'

const TABS: { id: Page; label: string }[] = [
  { id: 'inicio', label: 'Início' },
  { id: 'hoje', label: 'Hoje' },
  { id: 'rotinas', label: 'Rotinas' },
]

export default function App() {
  const [page, setPage] = useState<Page>('inicio')
  const [routineId, setRoutineId] = useState<string | null>(null)

  const openRoutine = (id: string | null) => {
    setRoutineId(id)
    setPage('rotinas')
  }

  return (
    <div className="mx-auto flex max-w-[1320px] flex-col gap-6 px-4 pt-6 pb-14 sm:px-6">
      <nav aria-label="Seções" className="flex gap-1 self-start rounded-full border border-line bg-panel p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-current={page === t.id ? 'page' : undefined}
            onClick={() => setPage(t.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${page === t.id ? 'bg-[#1C2436] text-white' : 'text-muted hover:text-soft'}`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {page === 'inicio' && <Inicio goToday={() => setPage('hoje')} openRoutine={openRoutine} />}
      {page === 'hoje' && <Hoje goRoutines={() => openRoutine(null)} />}
      {page === 'rotinas' && <Rotinas selectedId={routineId} select={setRoutineId} />}
    </div>
  )
}
