import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Reorder, useDragControls } from 'framer-motion'
import { areaOf } from '../../data/areas'
import { useAreas } from '../../store/useRotina'
import { Icon } from '../ui/ui'
import type { AreaId, DayTask, TodayItem } from '../../types'

/** Cabeçalho de um grupo da lista (rotina, ou estado no modo automático). */
export interface ListSection {
  key: string
  label: string
  color?: string
}

/** Agrupa pela rotina (o padrão). */
export const byRoutine = (i: TodayItem): ListSection => ({ key: i.routine.id, label: i.routine.name, color: i.routine.color })

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
  /** Abre o modo foco com o pet neste bloco. Sem esta função o botão "Focar" não aparece. */
  onFocus?: (i: TodayItem) => void
  /** Grupos da lista. `null` = sem cabeçalhos (o nome da rotina aparece em cada item). */
  sections?: ((i: TodayItem) => ListSection) | null
  /** "Minha ordem": arrastar os itens (ou mover com as setas no puxador). Recebe os ids na ordem nova. */
  onReorder?: (ids: string[]) => void
  /** Tarefas avulsas: editar e apagar. */
  onEditTask?: (t: DayTask, patch: { name: string; areaId: AreaId | null }) => void
  onDeleteTask?: (t: DayTask) => void
  empty: ReactNode
}

/** Lista de blocos de um dia, agrupada por rotina (ou do jeito escolhido). Usada no Hoje e no Histórico. */
export function DayList({ items, sections = byRoutine, onReorder, empty, ...rest }: Props) {
  // Ordem local durante o arraste (a gravação acontece ao soltar).
  const [ids, setIds] = useState(() => items.map((i) => i.block.id))
  const key = items.map((i) => i.block.id).join('|')
  useEffect(() => setIds(items.map((i) => i.block.id)), [key])

  if (items.length === 0) return <div className="flex flex-col items-start gap-3 p-8">{empty}</div>

  if (onReorder && !rest.readOnly) {
    const byId = new Map(items.map((i) => [i.block.id, i]))
    const ordered = ids.map((id) => byId.get(id)).filter((i): i is TodayItem => !!i)
    const move = (id: string, dir: -1 | 1) => {
      const from = ids.indexOf(id)
      const to = from + dir
      if (from < 0 || to < 0 || to >= ids.length) return
      const next = [...ids]
      ;[next[from], next[to]] = [next[to], next[from]]
      setIds(next)
      onReorder(next)
    }
    return (
      <Reorder.Group as="ol" axis="y" values={ids} onReorder={setIds} className="m-0 list-none p-0" aria-label="Lista do dia na sua ordem">
        {ordered.map((i, idx) => (
          <DraggableRow key={i.block.id} item={i} index={idx} total={ordered.length} onDrop={() => onReorder(ids)} onMove={(dir) => move(i.block.id, dir)} {...rest} />
        ))}
      </Reorder.Group>
    )
  }

  return (
    <ol className="m-0 list-none p-0">
      {items.map((i, idx) => {
        const section = sections?.(i)
        const showSection = !!section && (idx === 0 || sections!(items[idx - 1]).key !== section.key)
        return (
          <li key={i.block.id} id={`bloco-${i.block.id}`} className="scroll-mt-24">
            {showSection && (
              <div className="flex items-center gap-2 border-t border-line px-5 pt-4 pb-2 font-mono text-xs text-muted first:border-t-0">
                {section.color && <span className="h-2 w-2 rounded-full" style={{ background: section.color }} aria-hidden="true" />}
                {section.label}
              </div>
            )}
            <ItemRow item={i} index={idx} showRoutine={!sections || sections !== byRoutine} {...rest} />
          </li>
        )
      })}
    </ol>
  )
}

type RowProps = Omit<Props, 'items' | 'sections' | 'onReorder' | 'empty'> & { item: TodayItem; index: number; showRoutine?: boolean; handle?: ReactNode }

/** Item arrastável do modo "Minha ordem": puxador para arrastar (mouse e toque) e setas do teclado. */
function DraggableRow({ item, index, total, onDrop, onMove, ...rest }: RowProps & { total: number; onDrop: () => void; onMove: (dir: -1 | 1) => void }) {
  const controls = useDragControls()
  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    onMove(e.key === 'ArrowUp' ? -1 : 1)
    // Mantém o foco no puxador depois de mover.
    const el = e.currentTarget
    requestAnimationFrame(() => el.focus())
  }
  return (
    <Reorder.Item
      value={item.block.id}
      id={`bloco-${item.block.id}`}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDrop}
      className="relative scroll-mt-24 list-none border-t border-line bg-ink first:border-t-0"
      whileDrag={{ scale: 1.01, boxShadow: '0 12px 30px rgba(0,0,0,.45)', zIndex: 5 }}
    >
      <ItemRow
        item={item}
        index={index}
        showRoutine
        {...rest}
        handle={
          <button
            type="button"
            onPointerDown={(e) => controls.start(e)}
            onKeyDown={onKey}
            aria-label={`Mover ${item.block.name} (posição ${index + 1} de ${total}). Arraste ou use as setas para cima e para baixo.`}
            className="grid h-11 w-8 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-muted hover:text-soft active:cursor-grabbing sm:h-8"
          >
            <Icon name="grip" />
          </button>
        }
      />
    </Reorder.Item>
  )
}

function ItemRow({ item: i, index: idx, readOnly = false, activeId = null, onToggle, onInc, onSkip, onStart, onFocus, onEditTask, onDeleteTask, showRoutine = false, handle }: RowProps) {
  const areas = useAreas()
  const [editing, setEditing] = useState(false)
  const task = i.dayTask
  const hasArea = !!i.block.areaId
  const area = areaOf(areas, i.block.areaId)
  const active = i.block.id === activeId && !i.done && !i.skipped

  if (editing && task && onEditTask)
    return <TaskEditForm task={task} onSave={(patch) => (onEditTask(task, patch), setEditing(false))} onCancel={() => setEditing(false)} />

  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-2 border-l-2 px-4 py-3 transition-colors sm:px-5 ${active ? 'border-accent bg-accent/10' : 'border-transparent'} ${
        i.skipped ? 'opacity-50' : ''
      }`}
    >
      {handle ?? <span className="hidden w-6 shrink-0 text-right font-mono text-xs text-muted sm:block">{idx + 1}</span>}

      {readOnly ? (
        <StatusBadge item={i} />
      ) : i.block.type === 'contador' ? (
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => onInc?.(i, -1)} aria-label={`Diminuir ${i.block.name}`} className="grid h-11 w-11 place-items-center rounded-lg bg-panel-2 text-soft sm:h-8 sm:w-8">
            <Icon name="minus" size={14} />
          </button>
          <span className={`min-w-[52px] text-center font-mono text-sm sm:min-w-[64px] ${i.done ? 'text-ok' : 'text-soft'}`}>
            {i.log.value ?? 0}/{i.block.target}
          </span>
          <button type="button" onClick={() => onInc?.(i, 1)} aria-label={`Aumentar ${i.block.name}`} className="grid h-11 w-11 place-items-center rounded-lg bg-panel-2 text-soft sm:h-8 sm:w-8">
            <Icon name="plus" size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onToggle?.(i)}
          aria-pressed={i.done}
          aria-label={`${i.done ? 'Desmarcar' : 'Marcar'} ${i.block.name}`}
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 sm:h-8 sm:w-8 ${i.done ? 'border-ok bg-ok text-ink' : 'border-line-strong text-transparent'}`}
        >
          <Icon name="check" size={16} />
        </button>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <span className={`font-semibold [overflow-wrap:anywhere] ${i.done ? 'text-muted line-through' : ''}`}>{i.block.name}</span>
        <span className="flex flex-wrap items-center gap-x-2 font-mono text-[11.5px] text-muted">
          {showRoutine && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: i.routine.color }} aria-hidden="true" />
              {i.routine.name.toLowerCase()}
              {(hasArea || i.block.type !== 'tarefa') && ' ·'}
            </span>
          )}
          {hasArea && <span style={{ color: area.color }}>{area.name.toLowerCase()}</span>}
          {i.block.type === 'tarefa' && !task && <span>· tarefa</span>}
          {task?.carriedFrom && <span>{hasArea ? '· ' : ''}veio de outro dia</span>}
          {i.block.type === 'contador' && i.block.unit && <span>· {i.block.unit}</span>}
          {i.block.minutes ? <span>· {i.block.minutes} min</span> : null}
          {readOnly && i.block.type === 'contador' && (
            <span className={i.done ? 'text-ok' : ''}>
              · {i.log.value ?? 0}/{i.block.target}
            </span>
          )}
        </span>
      </div>

      {!readOnly && (!i.done || (task && (onEditTask || onDeleteTask))) && (
        <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
          {!i.done && onStart && !i.skipped && (
            <button
              type="button"
              onClick={() => onStart(i, active)}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-xs font-bold sm:min-h-0 sm:px-3 sm:py-1.5 ${active ? 'bg-accent/15 text-accent' : 'bg-accent text-ink'}`}
            >
              <Icon name="play" size={11} /> {active ? 'Em andamento' : 'Começar'}
            </button>
          )}
          {!i.done && onFocus && !i.skipped && (
            <button
              type="button"
              onClick={() => onFocus(i)}
              aria-label={`Focar em ${i.block.name}`}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-accent/40 px-4 text-xs font-bold text-accent sm:min-h-0 sm:px-3 sm:py-1.5"
            >
              <Icon name="focus" size={12} /> Focar
            </button>
          )}
          {!i.done && (
            <button
              type="button"
              onClick={() => onSkip?.(i)}
              aria-label={i.skipped ? `Desfazer pulo de ${i.block.name}` : `Pular ${i.block.name}`}
              className="grid h-11 w-11 place-items-center rounded-full bg-panel-2 text-muted sm:h-8 sm:w-8"
            >
              <Icon name={i.skipped ? 'undo' : 'skip'} size={14} />
            </button>
          )}
          {task && onEditTask && (
            <button type="button" onClick={() => setEditing(true)} aria-label={`Editar ${i.block.name}`} className="grid h-11 w-11 place-items-center rounded-full text-muted hover:bg-panel-2 hover:text-soft sm:h-8 sm:w-8">
              <Icon name="edit" size={14} />
            </button>
          )}
          {task && onDeleteTask && (
            <button type="button" onClick={() => onDeleteTask(task)} aria-label={`Apagar ${i.block.name}`} className="grid h-11 w-11 place-items-center rounded-full text-muted hover:bg-panel-2 hover:text-erro sm:h-8 sm:w-8">
              <Icon name="trash" size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/** Editar uma tarefa avulsa no lugar: nome e área (opcional). Enter salva, Esc cancela. */
function TaskEditForm({ task, onSave, onCancel }: { task: DayTask; onSave: (p: { name: string; areaId: AreaId | null }) => void; onCancel: () => void }) {
  const areas = useAreas()
  const [name, setName] = useState(task.name)
  const [areaId, setAreaId] = useState(task.areaId ?? '')
  return (
    <form
      className="flex flex-wrap items-end gap-2 border-l-2 border-accent bg-accent/5 px-4 py-3 sm:px-5"
      onSubmit={(e) => {
        e.preventDefault()
        if (name.trim()) onSave({ name, areaId: areaId || null })
      }}
      onKeyDown={(e) => e.key === 'Escape' && onCancel()}
    >
      <label className="flex min-w-[180px] flex-[2_1_220px] flex-col gap-1 text-xs text-muted">
        Tarefa
        <input autoFocus value={name} maxLength={200} onChange={(e) => setName(e.target.value)} className="min-h-11 rounded-lg border border-line bg-ink px-3 text-sm text-soft" />
      </label>
      <label className="flex min-w-[140px] flex-[1_1_150px] flex-col gap-1 text-xs text-muted">
        Área da vida
        <select value={areaId} onChange={(e) => setAreaId(e.target.value)} className="min-h-11 rounded-lg border border-line bg-ink px-3 text-sm text-soft">
          <option value="">Sem área</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={!name.trim()} className="min-h-11 rounded-full bg-accent px-4 text-sm font-bold text-ink disabled:opacity-40">
          Salvar
        </button>
        <button type="button" onClick={onCancel} className="min-h-11 rounded-full border border-line px-4 text-sm font-semibold text-soft hover:bg-panel-2">
          Cancelar
        </button>
      </div>
    </form>
  )
}

function StatusBadge({ item }: { item: TodayItem }) {
  if (item.done)
    return (
      <span className="grid h-8 w-8 place-items-center rounded-full bg-ok text-ink" aria-label="Feito">
        <Icon name="check" size={16} />
      </span>
    )
  if (item.skipped)
    return (
      <span className="grid h-8 w-8 place-items-center rounded-full bg-panel-2 text-muted" aria-label="Pulado">
        <Icon name="skip" size={14} />
      </span>
    )
  return <span className="h-8 w-8 rounded-full border-2 border-dashed border-line-strong" aria-label="Não feito" />
}
