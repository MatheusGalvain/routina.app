import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useRotina } from '../store/useRotina'
import { computePetState, getTodayItems, petMessage } from '../lib/today'
import { dayKey, formatLong } from '../lib/dates'
import { Panel } from '../components/ui/ui'
import { DayList } from '../components/day/DayList'
import { Pet } from '../components/pets/Pet'
import { PETS, PET_BY_STATE } from '../components/pets/pets'
import type { PetState, TodayItem } from '../types'

export function Hoje({ goRoutines }: { goRoutines: () => void }) {
  const now = new Date()
  const date = dayKey(now)
  const routines = useRotina((s) => s.routines)
  const dayLog = useRotina((s) => s.logs[date])
  const completedTasks = useRotina((s) => s.completedTasks)
  const activeId = useRotina((s) => s.activeBlockId)
  const { toggleDone, increment, toggleSkip, setActive, setNote } = useRotina.getState()

  const items = useMemo(() => getTodayItems(routines, dayLog, completedTasks, now, date), [routines, dayLog, completedTasks, date])
  const done = items.filter((i) => i.done).length

  // Reação rápida do pet (comemorar / bravinho) antes de voltar ao estado normal.
  const [flash, setFlash] = useState<PetState | null>(null)
  useEffect(() => {
    if (!flash) return
    const t = window.setTimeout(() => setFlash(null), 2600)
    return () => window.clearTimeout(t)
  }, [flash])

  const petState = flash ?? computePetState(items, activeId, now)
  const pet = PETS[PET_BY_STATE[petState]]
  const message = petMessage(petState, items, activeId, now)

  const onToggle = (i: TodayItem) => toggleDone(date, i.block) && setFlash('concluido')
  const onInc = (i: TodayItem, dir: 1 | -1) => {
    const wasDone = i.done
    const reached = increment(date, i.block, dir * (i.block.step ?? 1))
    if (reached && !wasDone) setFlash('concluido')
  }
  const onSkip = (i: TodayItem) => toggleSkip(date, i.block.id) && setFlash('pulado')

  const counters = items.filter((i) => i.block.type === 'contador')

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="m-0 font-mono text-xs tracking-wider text-muted uppercase">Modo dia</p>
          <h1 className="m-0 mt-1 text-3xl font-extrabold tracking-tight">{formatLong(now)}</h1>
        </div>
        <span className="rounded-full border border-line bg-panel px-4 py-2 font-mono text-sm text-soft">
          {done}/{items.length} blocos feitos
        </span>
      </header>

      <div className="flex flex-wrap items-start gap-5">
        {/* Lista do dia, na ordem das rotinas */}
        <section className="min-w-0 flex-[999_1_560px] overflow-hidden rounded-[22px] border border-line bg-[#0B0E15]">
          <DayList
            items={items}
            activeId={activeId}
            onToggle={onToggle}
            onInc={onInc}
            onSkip={onSkip}
            onStart={(i, active) => setActive(active ? null : i.block.id)}
            empty={
              <>
                <p className="m-0 text-muted">Nenhum bloco para hoje.</p>
                <button type="button" onClick={goRoutines} className="rounded-full bg-ok px-4 py-2 text-sm font-bold text-[#06210F]">
                  Criar uma rotina
                </button>
              </>
            }
          />
        </section>

        {/* Pet, painel e revisão */}
        <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-5">
          <section className="flex flex-col items-center gap-4 rounded-[22px] border border-line bg-panel p-6">
            <div className="relative grid h-[220px] w-full place-items-center">
              <div className="absolute h-[200px] w-[200px] rounded-full border" style={{ borderColor: `${pet.color}30` }} />
              <div className="absolute h-[160px] w-[160px] rounded-full border" style={{ borderColor: `${pet.color}22` }} />
              <Pet kind={pet.kind} size={140} />
            </div>
            <p className="m-0 font-mono text-xs tracking-[0.2em] uppercase" style={{ color: pet.color === '#F1F3F6' ? '#C9CED8' : pet.color }}>
              {pet.label}
            </p>
            <AnimatePresence mode="wait">
              <motion.p
                key={message}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="m-0 w-full rounded-2xl border border-[#2A3242] bg-panel-2 px-4 py-3 text-sm text-soft"
                aria-live="polite"
              >
                {message}
              </motion.p>
            </AnimatePresence>
          </section>

          {counters.length > 0 && (
            <Panel title="Painel do dia" icon="gauge">
              <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
                {counters.map((c) => (
                  <div key={c.block.id} className="flex flex-col gap-1 rounded-xl border border-dashed border-[#2B3A55] bg-[#0F1520] p-3">
                    <span className="truncate font-mono text-[11px] text-muted">{c.block.name}</span>
                    <span className={`text-2xl font-extrabold ${c.done ? 'text-ok' : 'text-[#5AA7FF]'}`}>
                      {c.log.value ?? 0}
                      <span className="text-sm font-semibold text-muted">/{c.block.target}</span>
                    </span>
                    <span className="font-mono text-[11px] text-muted">{c.block.unit}</span>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          <Panel title="Revisão da noite" icon="note" color="#A78BFA">
            <label htmlFor="nota" className="text-sm text-muted">
              Como foi o seu dia?
            </label>
            <textarea
              id="nota"
              value={dayLog?.note ?? ''}
              onChange={(e) => setNote(date, e.target.value)}
              rows={4}
              placeholder="O que funcionou, o que travou, o que mudar amanhã…"
              className="resize-y rounded-xl border border-line bg-[#0B0E15] p-3 font-mono text-sm text-soft placeholder:text-[#6F788A]"
            />
          </Panel>
        </div>
      </div>
    </div>
  )
}
