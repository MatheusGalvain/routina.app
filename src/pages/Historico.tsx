import { useMemo, useState } from 'react'
import { useRotina } from '../store/useRotina'
import { dayProgress, getDayItems } from '../lib/today'
import { dayKey, formatLong, formatMonth, nowInTz } from '../lib/dates'
import { WEEKDAYS } from '../data/areas'
import { Icon, Panel, ProgressRing } from '../components/ui/ui'
import { DayList } from '../components/day/DayList'
import type { TodayItem } from '../types'

interface DayCell {
  date: Date
  key: string
  items: TodayItem[]
  pct: number
  done: number
  total: number
  /** Há algo registrado nesse dia (abriu o app ou marcou algo). */
  recorded: boolean
  future: boolean
}

/** Verde proporcional à conclusão; cinza para dias com registro e nada feito. */
function cellStyle(c: DayCell) {
  if (c.future || !c.recorded || c.total === 0) return undefined
  if (c.done === 0) return { background: 'var(--color-panel-2)' }
  // Dois trechos para o número do dia passar 4.5:1: abaixo de 50% o verde fica escuro (número claro);
  // a partir de 50% ele clareia de uma vez (número escuro).
  const strength = c.pct < 0.5 ? 0.14 + 0.52 * c.pct : 0.55 + 0.9 * (c.pct - 0.5)
  return { background: `color-mix(in srgb, var(--color-ok) ${Math.round(strength * 100)}%, var(--color-panel-2))`, color: c.pct >= 0.5 ? 'var(--color-ink)' : undefined }
}

export function Historico({ goToday }: { goToday: () => void }) {
  const today = nowInTz()
  const todayKey = dayKey(today)
  const routines = useRotina((s) => s.routines)
  const logs = useRotina((s) => s.logs)
  const completedTasks = useRotina((s) => s.completedTasks)
  const { toggleDone, increment, toggleSkip, setNote } = useRotina.getState()

  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState(todayKey)
  const [editing, setEditing] = useState(false)

  const isCurrentMonth = month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth()

  const cells = useMemo<DayCell[]>(() => {
    const year = month.getFullYear()
    const m = month.getMonth()
    const count = new Date(year, m + 1, 0).getDate()
    return Array.from({ length: count }, (_, idx) => {
      const date = new Date(year, m, idx + 1)
      const key = dayKey(date)
      const items = getDayItems(routines, logs[key], completedTasks, date, key, todayKey)
      return { date, key, items, ...dayProgress(items), recorded: key === todayKey || !!logs[key], future: key > todayKey }
    })
  }, [month, routines, logs, completedTasks, todayKey])

  const summary = useMemo(() => {
    const tracked = cells.filter((c) => c.recorded && !c.future && c.total > 0)
    const avg = tracked.length ? tracked.reduce((s, c) => s + c.pct, 0) / tracked.length : 0
    return { days: tracked.length, avg, perfect: tracked.filter((c) => c.pct === 1).length }
  }, [cells])

  const selDate = useMemo(() => {
    const [y, m, d] = selected.split('-').map(Number)
    return new Date(y, m - 1, d)
  }, [selected])
  const selItems = useMemo(
    () => getDayItems(routines, logs[selected], completedTasks, selDate, selected, todayKey),
    [routines, logs, completedTasks, selDate, selected, todayKey],
  )
  const sel = dayProgress(selItems)
  const selNote = logs[selected]?.note
  const isToday = selected === todayKey

  const changeMonth = (delta: number) => {
    setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1))
    setEditing(false)
  }
  const select = (key: string) => {
    setSelected(key)
    setEditing(false)
  }

  // Espaços vazios antes do dia 1 para alinhar com o dia da semana.
  const offset = month.getDay()

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="m-0 font-mono text-xs tracking-wider text-muted uppercase">Histórico</p>
          <h1 className="m-0 mt-1 text-3xl font-extrabold tracking-tight">{formatMonth(month)}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => changeMonth(-1)} aria-label="Mês anterior" className="grid h-10 w-10 place-items-center rounded-full border border-line bg-panel text-soft hover:text-fg">
            <Icon name="chevron-left" size={16} />
          </button>
          {!isCurrentMonth && (
            <button
              type="button"
              onClick={() => {
                setMonth(new Date(today.getFullYear(), today.getMonth(), 1))
                select(todayKey)
              }}
              className="rounded-full border border-line bg-panel px-4 py-2 text-sm font-semibold text-soft hover:text-fg"
            >
              Mês atual
            </button>
          )}
          <button
            type="button"
            onClick={() => changeMonth(1)}
            disabled={isCurrentMonth}
            aria-label="Próximo mês"
            className="grid h-10 w-10 place-items-center rounded-full border border-line bg-panel text-soft hover:text-fg disabled:opacity-30"
          >
            <Icon name="chevron-right" size={16} />
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-start gap-5">
        {/* Calendário do mês */}
        <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-5">
          <Panel title="Mês" icon="calendar" help="mes">
            <div className="grid grid-cols-3 gap-3">
              <Stat label="dias registrados" value={String(summary.days)} />
              <Stat label="média feita" value={`${Math.round(summary.avg * 100)}%`} />
              <Stat label="dias completos" value={String(summary.perfect)} />
            </div>

            <div className="grid grid-cols-7 gap-1.5" role="group" aria-label={`Dias de ${formatMonth(month)}`}>
              {WEEKDAYS.map((w, i) => (
                <span key={i} className="pb-1 text-center font-mono text-[11px] text-muted" title={w.long}>
                  {w.short}
                </span>
              ))}
              {Array.from({ length: offset }, (_, i) => (
                <span key={`e${i}`} />
              ))}
              {cells.map((c) => {
                const isSel = c.key === selected
                const label = c.future
                  ? formatLong(c.date)
                  : `${formatLong(c.date)}: ${c.recorded && c.total ? `${c.done} de ${c.total} blocos` : 'sem registro'}`
                return (
                  <button
                    key={c.key}
                    type="button"
                    disabled={c.future}
                    onClick={() => select(c.key)}
                    aria-label={label}
                    aria-pressed={isSel}
                    title={label}
                    style={cellStyle(c)}
                    className={`relative grid aspect-square place-items-center rounded-lg border font-mono text-sm transition-shadow disabled:cursor-default disabled:opacity-25 ${
                      isSel ? 'border-fg shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-fg)_25%,transparent)]' : 'border-line'
                    } ${c.recorded && c.total ? '' : 'text-muted'}`}
                  >
                    {c.date.getDate()}
                    {c.key === todayKey && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-accent" aria-hidden="true" />}
                  </button>
                )
              })}
            </div>

            <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-[3px] border border-line" /> sem registro
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-[3px] bg-panel-2" /> nada feito
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-[3px]" style={{ background: 'color-mix(in srgb, var(--color-ok) 30%, var(--color-panel-2))' }} />
                <span className="h-3 w-3 rounded-[3px]" style={{ background: 'color-mix(in srgb, var(--color-ok) 60%, var(--color-panel-2))' }} />
                <span className="h-3 w-3 rounded-[3px]" style={{ background: 'color-mix(in srgb, var(--color-ok) 90%, var(--color-panel-2))' }} /> mais completo
              </span>
            </div>
          </Panel>
        </div>

        {/* Detalhe do dia selecionado */}
        <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-5">
          <section className="overflow-hidden rounded-[22px] border border-line bg-ink">
            <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-4">
              <div className="flex items-center gap-4">
                <ProgressRing pct={sel.pct} size={56} stroke={5} color="var(--color-ok)">
                  <span className="text-xs">{Math.round(sel.pct * 100)}%</span>
                </ProgressRing>
                <div className="flex flex-col">
                  <strong className="text-lg">{formatLong(selDate)}</strong>
                  <span className="font-mono text-xs text-muted">
                    {sel.total ? `${sel.done}/${sel.total} blocos feitos` : 'sem registro'}
                  </span>
                </div>
              </div>
              {isToday ? (
                <button type="button" onClick={goToday} className="rounded-full bg-accent px-4 py-2 text-xs font-bold text-ink">
                  Abrir no Hoje
                </button>
              ) : (
                sel.total > 0 && (
                  <button
                    type="button"
                    onClick={() => setEditing(!editing)}
                    aria-pressed={editing}
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold ${editing ? 'bg-ok text-ink' : 'bg-panel-2 text-soft'}`}
                  >
                    <Icon name={editing ? 'check' : 'edit'} size={12} /> {editing ? 'Concluir edição' : 'Corrigir dia'}
                  </button>
                )
              )}
            </header>

            <DayList
              items={selItems}
              readOnly={!editing || isToday}
              onToggle={(i) => toggleDone(selected, i.block)}
              onInc={(i, dir) => increment(selected, i.block, dir * (i.block.step ?? 1))}
              onSkip={(i) => toggleSkip(selected, i.block)}
              empty={<p className="m-0 text-muted">Nada registrado neste dia.</p>}
            />
          </section>

          {(selNote || editing) && (
            <Panel title="Revisão da noite" icon="note" color="var(--color-noite)" help="revisao">
              {editing ? (
                <textarea
                  value={selNote ?? ''}
                  onChange={(e) => setNote(selected, e.target.value)}
                  rows={4}
                  aria-label="Nota do dia"
                  placeholder="Como foi esse dia?"
                  className="resize-y rounded-xl border border-line bg-ink p-3 font-mono text-sm text-soft placeholder:text-muted"
                />
              ) : (
                <p className="m-0 font-mono text-sm whitespace-pre-wrap text-soft">{selNote}</p>
              )}
            </Panel>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl bg-panel-2 p-3">
      <span className="text-xl font-extrabold">{value}</span>
      <span className="font-mono text-[11px] text-muted">{label}</span>
    </div>
  )
}
