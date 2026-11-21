import type { ReactNode } from 'react'
import { areaById } from '../../data/areas'
import { Icon } from '../ui/ui'
import type { TodayItem } from '../../types'

interface Props {
  items: TodayItem[]
  /** Só exibe o status, sem botões. */
  readOnly?: boolean
  activeId?: string | null
  onToggle?: (i: TodayItem) => void
  onInc?: (i: TodayItem, dir: 1 | -1) => void
  onSkip?: (i: TodayItem) => void
  /** Sem esta função o botão "Começar" não aparece (ex.: dias passados). */
  onStart?: (i: TodayItem, active: boolean) => void
  empty: ReactNode
}

/** Lista de blocos de um dia, agrupada por rotina. Usada no Hoje e no Histórico. */
export function DayList({ items, readOnly = false, activeId = null, onToggle, onInc, onSkip, onStart, empty }: Props) {
  if (items.length === 0) return <div className="flex flex-col items-start gap-3 p-8">{empty}</div>

  return (
    <ol className="m-0 list-none p-0">
      {items.map((i, idx) => {
        const area = areaById(i.block.areaId)
        const active = i.block.id === activeId && !i.done && !i.skipped
        const showRoutine = idx === 0 || items[idx - 1].routine.id !== i.routine.id
        return (
          <li key={i.block.id}>
            {showRoutine && (
              <div className="flex items-center gap-2 border-t border-line px-5 pt-4 pb-2 font-mono text-xs text-muted first:border-t-0">
                <span className="h-2 w-2 rounded-full" style={{ background: i.routine.color }} />
                {i.routine.name}
              </div>
            )}
            <div
              className={`flex flex-wrap items-center gap-3 border-l-2 px-5 py-3 transition-colors ${
                active ? 'border-foco bg-[#0F1C33]' : 'border-transparent'
              } ${i.skipped ? 'opacity-50' : ''}`}
            >
              <span className="w-6 text-right font-mono text-xs text-[#6F788A]">{idx + 1}</span>

              {readOnly ? (
                <StatusBadge item={i} />
              ) : i.block.type === 'contador' ? (
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => onInc?.(i, -1)} aria-label={`Diminuir ${i.block.name}`} className="grid h-8 w-8 place-items-center rounded-lg bg-panel-2 text-soft">
                    <Icon name="minus" size={14} />
                  </button>
                  <span className={`min-w-[64px] text-center font-mono text-sm ${i.done ? 'text-ok' : 'text-soft'}`}>
                    {i.log.value ?? 0}/{i.block.target}
                  </span>
                  <button type="button" onClick={() => onInc?.(i, 1)} aria-label={`Aumentar ${i.block.name}`} className="grid h-8 w-8 place-items-center rounded-lg bg-panel-2 text-soft">
                    <Icon name="plus" size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onToggle?.(i)}
                  aria-pressed={i.done}
                  aria-label={`${i.done ? 'Desmarcar' : 'Marcar'} ${i.block.name}`}
                  className={`grid h-8 w-8 place-items-center rounded-full border-2 ${i.done ? 'border-ok bg-ok text-[#06210F]' : 'border-[#3A4254] text-transparent'}`}
                >
                  <Icon name="check" size={16} />
                </button>
              )}

              <div className="flex min-w-0 flex-1 flex-col">
                <span className={`font-semibold ${i.done ? 'text-muted line-through' : ''}`}>{i.block.name}</span>
                <span className="flex flex-wrap items-center gap-2 font-mono text-[11.5px] text-muted">
                  <span style={{ color: area.color }}>{area.name.toLowerCase()}</span>
                  {i.block.type === 'tarefa' && <span>· tarefa</span>}
                  {i.block.type === 'contador' && i.block.unit && <span>· {i.block.unit}</span>}
                  {i.block.minutes ? <span>· {i.block.minutes} min</span> : null}
                  {readOnly && i.block.type === 'contador' && (
                    <span className={i.done ? 'text-ok' : ''}>
                      · {i.log.value ?? 0}/{i.block.target}
                    </span>
                  )}
                </span>
              </div>

              {!readOnly && !i.done && (
                <div className="flex items-center gap-2">
                  {onStart && !i.skipped && (
                    <button
                      type="button"
                      onClick={() => onStart(i, active)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${active ? 'bg-[#1A2B4A] text-[#9CC8FF]' : 'bg-foco-strong text-white'}`}
                    >
                      <Icon name="play" size={11} /> {active ? 'Em andamento' : 'Começar'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onSkip?.(i)}
                    aria-label={i.skipped ? `Desfazer pulo de ${i.block.name}` : `Pular ${i.block.name}`}
                    className="grid h-8 w-8 place-items-center rounded-full bg-panel-2 text-muted"
                  >
                    <Icon name={i.skipped ? 'undo' : 'skip'} size={14} />
                  </button>
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function StatusBadge({ item }: { item: TodayItem }) {
  if (item.done)
    return (
      <span className="grid h-8 w-8 place-items-center rounded-full bg-ok text-[#06210F]" aria-label="Feito">
        <Icon name="check" size={16} />
      </span>
    )
  if (item.skipped)
    return (
      <span className="grid h-8 w-8 place-items-center rounded-full bg-panel-2 text-muted" aria-label="Pulado">
        <Icon name="skip" size={14} />
      </span>
    )
  return <span className="h-8 w-8 rounded-full border-2 border-dashed border-[#3A4254]" aria-label="Não feito" />
}
