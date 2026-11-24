import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAreas, useRotina } from '../store/useRotina'
import { computePetState, inProgress, pendingFromBefore, petMessage, sortTodayItems } from '../lib/today'
import { dayKey, formatLong, nowInTz, parseKey } from '../lib/dates'
import { Icon, Panel } from '../components/ui/ui'
import { HelpButton } from '../components/help/HelpButton'
import { DayList, byRoutine, type ListSection } from '../components/day/DayList'
import { useTodayItems } from '../store/useTodayItems'
import { setTodaySort, useSession } from '../sync/session'
import { areaOf } from '../data/areas'
import { showToast } from '../components/ui/Toast'
import { Pet } from '../components/pets/Pet'
import { STATE_STYLE, textColor } from '../components/pets/pets'
import { useShownPet } from '../store/useCompanion'
import type { PetState, TodayItem, TodaySort } from '../types'
import type { TodayTarget } from '../lib/navigation'
import { editorPath } from '../lib/slug'
import { useFocus } from '../store/useFocus'

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

const SORTS: { id: TodaySort; label: string; hint: string }[] = [
  { id: 'rotina', label: 'Por rotina', hint: 'Agrupado por rotina, na ordem delas.' },
  { id: 'auto', label: 'Automático', hint: 'O que falta fazer primeiro; concluídos e pulados no fim.' },
  { id: 'manual', label: 'Minha ordem', hint: 'Arraste pelo puxador (ou use as setas) para organizar o dia.' },
]

const STATUS_SECTIONS: Record<number, ListSection> = {
  0: { key: 'pendentes', label: 'Para fazer' },
  1: { key: 'andamento', label: 'Em andamento', color: 'var(--color-accent)' },
  2: { key: 'feitos', label: 'Concluídos', color: 'var(--color-ok)' },
  3: { key: 'pulados', label: 'Pulados', color: 'var(--color-muted)' },
}

/** Seletor da ordem da lista (botões de opção, setas trocam). Fica salvo no perfil. */
function SortPicker({ value }: { value: TodaySort }) {
  const refs = useRef<Record<TodaySort, HTMLButtonElement | null>>({ rotina: null, auto: null, manual: null })
  const hintId = useId()
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = SORTS.findIndex((s) => s.id === value)
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!dir) return
    e.preventDefault()
    const next = SORTS[(i + dir + SORTS.length) % SORTS.length].id
    setTodaySort(next)
    refs.current[next]?.focus()
  }
  return (
    <div className="flex flex-col gap-1.5">
      <div role="radiogroup" aria-label="Ordenar a lista" aria-describedby={hintId} onKeyDown={onKey} className="grid grid-cols-3 gap-1 rounded-full border border-line bg-panel p-1">
        {SORTS.map((s) => {
          const on = s.id === value
          return (
            <button
              key={s.id}
              ref={(el) => {
                refs.current[s.id] = el
              }}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              onClick={() => setTodaySort(s.id)}
              className={`min-h-10 min-w-0 truncate rounded-full px-2 text-[13px] font-semibold transition-colors ${on ? 'bg-accent/15 text-accent' : 'text-muted hover:text-soft'}`}
            >
              {s.label}
            </button>
          )
        })}
      </div>
      <p id={hintId} className="m-0 px-2 text-[12px] text-muted">
        {SORTS.find((s) => s.id === value)?.hint}
      </p>
    </div>
  )
}

/** Campo do topo: tarefa só de hoje (Enter adiciona), com área opcional. */
function AddDayTask({ date }: { date: string }) {
  const areas = useAreas()
  const addDayTask = useRotina((s) => s.addDayTask)
  const [name, setName] = useState('')
  const [areaId, setAreaId] = useState('')
  const inputId = useId()
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim()) return
        addDayTask(date, name, areaId || null)
        setName('')
      }}
    >
      <label htmlFor={inputId} className="sr-only">
        Adicionar tarefa para hoje
      </label>
      <div className="flex min-w-[200px] flex-[3_1_260px] items-center gap-2 rounded-xl border border-line bg-panel px-3 transition-colors focus-within:border-line-2 focus-within:bg-panel-2">
        <Icon name="plus" size={16} className="shrink-0 text-muted" />
        <input
          id={inputId}
          value={name}
          maxLength={200}
          onChange={(e) => setName(e.target.value)}
          placeholder="Adicionar tarefa para hoje"
          enterKeyHint="done"
          autoComplete="off"
          className="min-h-11 w-full min-w-0 bg-transparent text-[15px] text-soft outline-none placeholder:text-muted focus-visible:outline-none"
        />
      </div>
      <label className="flex min-w-[130px] flex-[1_1_140px]">
        <span className="sr-only">Área da vida da tarefa (opcional)</span>
        <select value={areaId} onChange={(e) => setAreaId(e.target.value)} className="min-h-11 w-full rounded-xl border border-line bg-panel px-3 text-sm text-soft">
          <option value="">Sem área</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={!name.trim()} className="min-h-11 rounded-full bg-ok px-4 text-sm font-bold text-ink disabled:opacity-40">
        Adicionar
      </button>
    </form>
  )
}

/** Tarefas avulsas de dias anteriores que ficaram sem fazer: "Levar para hoje?". */
function CarryOver({ date }: { date: string }) {
  const tasks = useRotina((s) => s.dayTasks)
  const logs = useRotina((s) => s.logs)
  const areas = useAreas()
  const resolve = useRotina((s) => s.resolveDayTask)
  const pending = useMemo(() => pendingFromBefore(tasks, logs, date), [tasks, logs, date])
  if (pending.length === 0) return null
  return (
    <section aria-label="Tarefas que ficaram para trás" className="flex flex-col gap-2 rounded-2xl border border-alerta/30 bg-alerta/5 p-3">
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        <AnimatePresence initial={false}>
          {pending.map((t) => {
            const when = parseKey(t.date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })
            return (
              <motion.li
                key={t.id}
                layout
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl bg-panel px-3 py-2.5"
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[12.5px] text-alerta">Levar para hoje?</span>
                  <strong className="text-sm [overflow-wrap:anywhere]">{t.name}</strong>
                  <span className="font-mono text-[11px] text-muted">
                    ficou de {when}
                    {t.areaId ? ` · ${areaOf(areas, t.areaId).name.toLowerCase()}` : ''}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => resolve(t.id, 'levada', date)} aria-label={`Levar ${t.name} para hoje`} className="min-h-11 rounded-full bg-alerta px-4 text-sm font-bold text-ink">
                    Levar
                  </button>
                  <button
                    type="button"
                    onClick={() => resolve(t.id, 'descartada', date)}
                    aria-label={`Descartar ${t.name}`}
                    className="min-h-11 rounded-full border border-line px-4 text-sm font-semibold text-soft hover:bg-panel-2"
                  >
                    Descartar
                  </button>
                </div>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>
    </section>
  )
}

export function Hoje() {
  useFocusTarget()
  const navigate = useNavigate()
  const now = nowInTz()
  const date = dayKey(now)
  const dayLog = useRotina((s) => s.logs[date])
  const activeId = useRotina((s) => s.activeBlockId)
  const sort = useSession((s) => s.profile?.todaySort ?? 'rotina')
  const { toggleDone, increment, toggleSkip, setActive, setNote, setDayOrder, updateDayTask, deleteDayTask } = useRotina.getState()

  const items = useTodayItems()
  const sorted = useMemo(() => sortTodayItems(items, sort, dayLog?.order, activeId), [items, sort, dayLog?.order, activeId])
  const done = items.filter((i) => i.done).length
  const statusRank = (i: TodayItem) => (i.done ? 2 : i.skipped ? 3 : inProgress(i, activeId) ? 1 : 0)

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
        {/* Lista do dia: tarefa avulsa no topo, a ordem escolhida e os blocos */}
        <section aria-label="Lista do dia" className="min-w-0 flex-[999_1_560px] overflow-hidden rounded-[22px] border border-line bg-ink">
          <div className="flex flex-col gap-3 border-b border-line p-3 sm:p-4">
            <AddDayTask date={date} />
            <CarryOver date={date} />
            {items.length > 1 && <SortPicker value={sort} />}
          </div>
          <DayList
            items={sorted}
            sections={sort === 'rotina' ? byRoutine : sort === 'auto' ? (i) => STATUS_SECTIONS[statusRank(i)] : null}
            onReorder={sort === 'manual' ? (ids) => setDayOrder(date, ids) : undefined}
            onEditTask={(t, patch) => updateDayTask(t.id, patch)}
            onDeleteTask={(t) => {
              deleteDayTask(t.id)
              showToast(`"${t.name}" apagada.`)
            }}
            activeId={activeId}
            onToggle={onToggle}
            onInc={onInc}
            onSkip={onSkip}
            onStart={(i, active) => setActive(active ? null : i.block.id)}
            onFocus={(i) => useFocus.getState().start(i.block.id)}
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
              <Pet kind={pet.kind} state={pet.state} sleeping={pet.sleeping} phase={pet.phase} adultDetail={pet.adultDetail} accessories={pet.accessories} size={140} play />
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
