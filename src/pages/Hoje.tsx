import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useRotina } from '../store/useRotina'
import { computePetState, getTodayItems, petMessage } from '../lib/today'
import { dayKey, formatLong, nowInTz } from '../lib/dates'
import { Panel } from '../components/ui/ui'
import { HelpButton } from '../components/help/HelpButton'
import { DayList } from '../components/day/DayList'
import { Pet } from '../components/pets/Pet'
import { STATE_STYLE, textColor } from '../components/pets/pets'
import { useShownPet } from '../store/useCompanion'
import type { PetState, TodayItem } from '../types'
import type { TodayTarget } from '../lib/navigation'
import { editorPath } from '../lib/slug'

/**
 * Veio do botão principal do Início com um alvo (state.focus): rola até o bloco, ou até a revisão
 * da noite, e leva o foco para ele. Depois limpa o state para não repetir ao voltar.
 */
function useFocusTarget() {
  const location = useLocation()
  const navigate = useNavigate()
  const target = (location.state as { focus?: TodayTarget } | null)?.focus
  useEffect(() => {
    if (!target) return
    const t = window.setTimeout(() => {
      const el = target.review ? document.getElementById('nota') : document.getElementById(`bloco-${target.blockId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        const focusable = target.review ? el : el.querySelector<HTMLElement>('button')
        focusable?.focus({ preventScroll: true })
      }
      navigate('.', { replace: true, state: null })
    }, 80)
    return () => window.clearTimeout(t)
  }, [target])
}

export function Hoje() {
  useFocusTarget()
  const navigate = useNavigate()
  const now = nowInTz()
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

  const pet = useShownPet(flash ?? computePetState(items, activeId, now), !!flash)
  const look = STATE_STYLE[pet.state]
  const message = pet.sleeping
    ? 'Zzz… tirei um cochilo. Quando você concluir um bloco, eu acordo animado.'
    : petMessage(pet.state, items, activeId, now)

  const onToggle = (i: TodayItem) => toggleDone(date, i.block) && setFlash('concluido')
  const onInc = (i: TodayItem, dir: 1 | -1) => {
    const wasDone = i.done
    const reached = increment(date, i.block, dir * (i.block.step ?? 1))
    if (reached && !wasDone) setFlash('concluido')
  }
  const onSkip = (i: TodayItem) => toggleSkip(date, i.block) && setFlash('pulado')

  const counters = items.filter((i) => i.block.type === 'contador')

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="m-0 font-mono text-xs tracking-wider text-muted uppercase">Modo dia</p>
          <div className="mt-1 flex items-center gap-2.5">
            <h1 className="m-0 text-3xl font-extrabold tracking-tight">{formatLong(now)}</h1>
            <HelpButton k="hoje" />
          </div>
        </div>
        <span className="rounded-full border border-line bg-panel px-4 py-2 font-mono text-sm text-soft">
          {done}/{items.length} blocos feitos
        </span>
      </header>

      <div className="flex flex-wrap items-start gap-5">
        {/* Lista do dia, na ordem das rotinas */}
        <section className="min-w-0 flex-[999_1_560px] overflow-hidden rounded-[22px] border border-line bg-ink">
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
                <button type="button" onClick={() => navigate(editorPath(useRotina.getState().createRoutine()))} className="rounded-full bg-ok px-4 py-2 text-sm font-bold text-ink">
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
              <div className="absolute h-[200px] w-[200px] rounded-full border transition-colors duration-500" style={{ borderColor: `${look.color}30` }} />
              <div className="absolute h-[160px] w-[160px] rounded-full border transition-colors duration-500" style={{ borderColor: `${look.color}22` }} />
              <Pet kind={pet.kind} state={pet.state} sleeping={pet.sleeping} phase={pet.phase} accessories={pet.accessories} size={140} play />
            </div>
            <p className="m-0 font-mono text-xs tracking-[0.2em] uppercase transition-colors duration-500" style={{ color: pet.sleeping ? 'var(--color-noite)' : textColor(look.color) }}>
              {pet.name && pet.isCompanion ? `${pet.name} · ` : ''}
              {pet.sleeping ? 'Dormindo' : look.label}
            </p>
            <AnimatePresence mode="wait">
              <motion.p
                key={message}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="m-0 w-full rounded-2xl border border-line-2 bg-panel-2 px-4 py-3 text-sm text-soft"
                aria-live="polite"
              >
                {message}
              </motion.p>
            </AnimatePresence>
          </section>

          {counters.length > 0 && (
            <Panel title="Painel do dia" icon="gauge" help="painel-do-dia">
              <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
                {counters.map((c) => (
                  <div key={c.block.id} className="flex flex-col gap-1 rounded-xl border border-dashed border-line-2 bg-ink p-3">
                    <span className="truncate font-mono text-[11px] text-muted">{c.block.name}</span>
                    <span className={`text-2xl font-extrabold ${c.done ? 'text-ok' : 'text-accent'}`}>
                      {c.log.value ?? 0}
                      <span className="text-sm font-semibold text-muted">/{c.block.target}</span>
                    </span>
                    <span className="font-mono text-[11px] text-muted">{c.block.unit}</span>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          <Panel title="Revisão da noite" icon="note" color="var(--color-noite)" help="revisao">
            <label htmlFor="nota" className="text-sm text-muted">
              Como foi o seu dia?
            </label>
            <textarea
              id="nota"
              value={dayLog?.note ?? ''}
              onChange={(e) => setNote(date, e.target.value)}
              rows={4}
              placeholder="O que funcionou, o que travou, o que mudar amanhã…"
              className="resize-y rounded-xl border border-line bg-ink p-3 font-mono text-sm text-soft placeholder:text-muted"
            />
          </Panel>
        </div>
      </div>
    </div>
  )
}
