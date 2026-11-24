import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { WEEKDAYS } from '../../data/areas'
import { dayKey } from '../../lib/dates'
import { beyondWeek, dayMonth, dayMonthLong, next7, shortDay, weekdayOf } from '../../lib/routines'
import { Icon } from '../ui/ui'

export interface SchedulePatch {
  days?: number[]
  repeat?: 'weekly' | 'once'
  onceDate?: string | null
}

const dayBtn = 'grid place-items-center rounded-full text-sm font-bold transition-colors'

/**
 * Dias da rotina no editor.
 *  - Semanal: 7 botões (Dom, Seg, Ter…) de marcar vários; repete toda semana.
 *  - "Somente esse dia" (só rotinas, nunca modelos): escolha única entre os próximos 7 dias
 *    ("Ter 24", "Qua 25"…), com hoje pré-selecionado, ou "Outra data" (seletor de data) para mais longe.
 *    Desligar volta para o semanal com o dia da semana daquela data marcado.
 */
export function ScheduleField({
  value,
  allowOnce,
  onChange,
}: {
  value: { days: number[]; repeat?: 'weekly' | 'once'; onceDate?: string | null }
  allowOnce: boolean
  onChange: (patch: SchedulePatch) => void
}) {
  const today = dayKey()
  const once = allowOnce && value.repeat === 'once' && !!value.onceDate
  const onceDate = once ? value.onceDate! : null
  const [picking, setPicking] = useState(false)
  const dateRef = useRef<HTMLInputElement>(null)
  const legendId = useId()
  const radios = useRef<(HTMLButtonElement | null)[]>([])

  const toggleDay = (d: number) => onChange({ days: value.days.includes(d) ? value.days.filter((x) => x !== d) : [...value.days, d].sort() })
  const pickDate = (date: string) => onChange({ repeat: 'once', onceDate: date, days: [weekdayOf(date)] })

  const setOnce = (on: boolean) => {
    setPicking(false)
    if (on) pickDate(today)
    else onChange({ repeat: 'weekly', onceDate: null, days: [weekdayOf(onceDate ?? today)] })
  }

  const week = next7(today)
  const chip = onceDate && beyondWeek(onceDate, today) ? onceDate : null

  // Setas movem a escolha no grupo de rádio (como um rádio nativo).
  const onRadioKey = (e: KeyboardEvent, i: number) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const j = (i + step + week.length) % week.length
    pickDate(week[j])
    radios.current[j]?.focus()
  }

  return (
    <fieldset className="m-0 flex w-full min-w-0 flex-col gap-2.5 border-0 p-0 sm:w-auto">
      <legend id={legendId} className="mb-2 text-xs text-muted">
        {once ? 'Dia da rotina' : 'Dias da semana'}
      </legend>

      {!once ? (
        <div className="grid grid-cols-7 gap-1.5 sm:flex">
          {WEEKDAYS.map((w, d) => {
            const on = value.days.includes(d)
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                aria-label={w.long}
                onClick={() => toggleDay(d)}
                className={`${dayBtn} min-h-10 w-full px-0.5 text-[12.5px] sm:h-10 sm:w-12 ${on ? 'bg-accent text-ink' : 'bg-panel-2 text-muted hover:text-soft'}`}
              >
                {w.abbr}
              </button>
            )
          })}
        </div>
      ) : chip ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex min-h-10 items-center gap-2 rounded-full bg-accent py-1 pr-1.5 pl-3.5 text-sm font-bold text-ink">
            <Icon name="calendar" size={14} />
            <span aria-label={dayMonthLong(chip)}>{dayMonth(chip)}</span>
            <button
              type="button"
              onClick={() => pickDate(today)}
              aria-label="Tirar essa data e voltar para os próximos 7 dias"
              className="grid h-7 w-7 place-items-center rounded-full bg-ink/15 hover:bg-ink/25"
            >
              <Icon name="x" size={13} />
            </button>
          </span>
        </div>
      ) : (
        <div role="radiogroup" aria-labelledby={legendId} className="grid grid-cols-4 gap-1.5 min-[420px]:grid-cols-7 sm:flex">
          {week.map((date, i) => {
            const on = onceDate === date
            return (
              <button
                key={date}
                ref={(el) => {
                  radios.current[i] = el
                }}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={`${i === 0 ? 'Hoje, ' : ''}${dayMonthLong(date)}`}
                tabIndex={on || (!week.includes(onceDate ?? '') && i === 0) ? 0 : -1}
                onClick={() => pickDate(date)}
                onKeyDown={(e) => onRadioKey(e, i)}
                className={`${dayBtn} min-h-10 px-1 text-[12.5px] whitespace-nowrap sm:h-10 sm:min-w-[58px] ${on ? 'bg-accent text-ink' : 'bg-panel-2 text-muted hover:text-soft'}`}
              >
                {shortDay(date)}
              </button>
            )
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {allowOnce && (
          <button
            type="button"
            aria-pressed={once}
            onClick={() => setOnce(!once)}
            className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-[13px] font-semibold transition-colors ${
              once ? 'border-accent/60 bg-accent/15 text-soft' : 'border-line bg-panel-2 text-muted hover:text-soft'
            }`}
          >
            <span className={`relative h-4 w-7 rounded-full transition-colors ${once ? 'bg-accent' : 'bg-line-2'}`} aria-hidden="true">
              <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-ink transition-[left] ${once ? 'left-[14px]' : 'left-0.5'}`} />
            </span>
            Somente esse dia
          </button>
        )}
        {once && (
          <>
            <button
              type="button"
              aria-expanded={picking}
              onClick={() => {
                setPicking(!picking)
                if (!picking) window.setTimeout(() => dateRef.current?.showPicker?.(), 0)
              }}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-panel-2 px-3 text-[13px] font-semibold text-muted hover:text-soft"
            >
              <Icon name="calendar" size={14} /> Outra data
            </button>
            {picking && (
              <label className="flex items-center gap-2 text-[13px] text-muted">
                <span className="sr-only">Escolher outra data</span>
                <input
                  ref={dateRef}
                  type="date"
                  min={today}
                  value={onceDate ?? ''}
                  onChange={(e) => {
                    if (!e.target.value || e.target.value < today) return
                    pickDate(e.target.value)
                    setPicking(false)
                  }}
                  className="min-h-9 rounded-lg border border-line bg-ink px-2.5 font-mono text-[13px] text-soft [color-scheme:dark]"
                />
              </label>
            )}
          </>
        )}
      </div>
      {once && <p className="m-0 text-[12px] text-muted">Aparece no Hoje só nesse dia. Depois, vai sozinha para "Arquivadas" (o que você fez continua contando).</p>}
    </fieldset>
  )
}
