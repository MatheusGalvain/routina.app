import { useState } from 'react'
import { Reorder, useDragControls } from 'framer-motion'
import { useRotina } from '../store/useRotina'
import { AREAS, BLOCK_TYPES, ROUTINE_COLORS, WEEKDAYS, areaById } from '../data/areas'
import { Icon, Panel } from '../components/ui/ui'
import type { AreaId, Block, BlockType, Routine } from '../types'

const inputCls = 'w-full rounded-lg border border-line bg-[#0B0E15] px-3 py-2.5 text-sm text-soft placeholder:text-[#6F788A]'

type Draft = { name: string; type: BlockType; areaId: AreaId; minutes: string; target: string; unit: string; step: string }
const emptyDraft: Draft = { name: '', type: 'habito', areaId: 'foco', minutes: '', target: '', unit: '', step: '1' }

const toDraft = (b: Block): Draft => ({
  name: b.name,
  type: b.type,
  areaId: b.areaId,
  minutes: b.minutes ? String(b.minutes) : '',
  target: b.target ? String(b.target) : '',
  unit: b.unit ?? '',
  step: String(b.step ?? 1),
})

function fromDraft(d: Draft): Omit<Block, 'id'> {
  const num = (s: string) => (s.trim() === '' ? undefined : Number(s.replace(',', '.')))
  const base: Omit<Block, 'id'> = { name: d.name.trim(), type: d.type, areaId: d.areaId, minutes: num(d.minutes) }
  if (d.type === 'contador') return { ...base, target: num(d.target) ?? 1, unit: d.unit.trim() || undefined, step: num(d.step) ?? 1 }
  return base
}

function BlockForm({ initial, onSave, onCancel }: { initial?: Block; onSave: (b: Omit<Block, 'id'>) => void; onCancel?: () => void }) {
  const [d, setD] = useState<Draft>(initial ? toDraft(initial) : emptyDraft)
  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }))
  const valid = d.name.trim() !== '' && (d.type !== 'contador' || Number(d.target) > 0)

  return (
    <form
      className="flex flex-col gap-3 rounded-2xl border border-[#24304A] bg-[#0D1422] p-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (!valid) return
        onSave(fromDraft(d))
        if (!initial) setD({ ...emptyDraft, type: d.type, areaId: d.areaId })
      }}
    >
      <label className="flex flex-col gap-1.5 text-xs text-muted">
        Nome do bloco
        <input className={inputCls} value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ex.: Beber água, Ler, Pagar a internet" />
      </label>

      <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
        <legend className="mb-1.5 text-xs text-muted">Tipo</legend>
        <div className="grid grid-cols-3 gap-2">
          {BLOCK_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={d.type === t.id}
              onClick={() => set({ type: t.id })}
              className={`flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left ${
                d.type === t.id ? 'border-foco bg-[#12284A]' : 'border-line bg-panel-2'
              }`}
            >
              <span className="text-sm font-semibold">{t.name}</span>
              <span className="text-[11px] leading-tight text-muted">{t.hint}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-xs text-muted">
          Área da vida
          <select className={inputCls} value={d.areaId} onChange={(e) => set({ areaId: e.target.value as AreaId })}>
            {AREAS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-muted">
          Duração (min, opcional)
          <input className={inputCls} inputMode="numeric" value={d.minutes} onChange={(e) => set({ minutes: e.target.value })} placeholder="—" />
        </label>
      </div>

      {d.type === 'contador' && (
        <div className="grid grid-cols-3 gap-3">
          <label className="flex flex-col gap-1.5 text-xs text-muted">
            Meta
            <input className={inputCls} inputMode="decimal" value={d.target} onChange={(e) => set({ target: e.target.value })} placeholder="8" />
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-muted">
            Unidade
            <input className={inputCls} value={d.unit} onChange={(e) => set({ unit: e.target.value })} placeholder="copos" />
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-muted">
            Passo do +
            <input className={inputCls} inputMode="decimal" value={d.step} onChange={(e) => set({ step: e.target.value })} placeholder="1" />
          </label>
        </div>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={!valid} className="rounded-full bg-ok px-4 py-2 text-sm font-bold text-[#06210F] disabled:opacity-40">
          {initial ? 'Salvar bloco' : '+ Adicionar bloco'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-full bg-panel-2 px-4 py-2 text-sm font-semibold text-soft">
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}

function BlockRow({ routine, block, index }: { routine: Routine; block: Block; index: number }) {
  const controls = useDragControls()
  const [editing, setEditing] = useState(false)
  const { updateBlock, removeBlock } = useRotina.getState()
  const area = areaById(block.areaId)
  const typeName = BLOCK_TYPES.find((t) => t.id === block.type)?.name

  return (
    <Reorder.Item value={block} dragListener={false} dragControls={controls} className="list-none">
      {editing ? (
        <BlockForm
          initial={block}
          onSave={(b) => {
            updateBlock(routine.id, block.id, b)
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <div className="flex items-center gap-3 rounded-xl bg-panel-2 px-3 py-2.5">
          <button
            type="button"
            onPointerDown={(e) => controls.start(e)}
            aria-label={`Arrastar ${block.name}`}
            className="cursor-grab touch-none text-[#6F788A] active:cursor-grabbing"
          >
            <Icon name="grip" />
          </button>
          <span className="w-5 font-mono text-xs text-[#6F788A]">{index + 1}</span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold">{block.name}</span>
            <span className="font-mono text-[11.5px] text-muted">
              <span style={{ color: area.color }}>{area.name.toLowerCase()}</span> · {typeName?.toLowerCase()}
              {block.type === 'contador' && ` · meta ${block.target} ${block.unit ?? ''}`}
              {block.minutes ? ` · ${block.minutes} min` : ''}
            </span>
          </div>
          <button type="button" onClick={() => setEditing(true)} aria-label={`Editar ${block.name}`} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:text-soft">
            <Icon name="edit" size={16} />
          </button>
          <button type="button" onClick={() => removeBlock(routine.id, block.id)} aria-label={`Remover ${block.name}`} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:text-erro">
            <Icon name="trash" size={16} />
          </button>
        </div>
      )}
    </Reorder.Item>
  )
}

function RoutineEditor({ routine, onDeleted }: { routine: Routine; onDeleted: () => void }) {
  const { updateRoutine, deleteRoutine, addBlock, setBlocks } = useRotina.getState()

  const toggleDay = (d: number) =>
    updateRoutine(routine.id, { days: routine.days.includes(d) ? routine.days.filter((x) => x !== d) : [...routine.days, d].sort() })

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 rounded-[22px] border border-line bg-panel p-6">
        <label className="flex flex-col gap-1.5 text-xs text-muted">
          Nome da rotina
          <input className={`${inputCls} text-lg font-bold`} value={routine.name} onChange={(e) => updateRoutine(routine.id, { name: e.target.value })} />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <fieldset className="m-0 border-0 p-0">
            <legend className="mb-2 text-xs text-muted">Dias da semana</legend>
            <div className="flex gap-1.5">
              {WEEKDAYS.map((w, d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={routine.days.includes(d)}
                  aria-label={w.long}
                  onClick={() => toggleDay(d)}
                  className={`grid h-10 w-10 place-items-center rounded-full text-sm font-bold ${
                    routine.days.includes(d) ? 'bg-foco-strong text-white' : 'bg-panel-2 text-muted'
                  }`}
                >
                  {w.short}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="m-0 border-0 p-0">
            <legend className="mb-2 text-xs text-muted">Cor</legend>
            <div className="flex gap-2">
              {ROUTINE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Cor ${c}`}
                  aria-pressed={routine.color === c}
                  onClick={() => updateRoutine(routine.id, { color: c })}
                  className={`h-8 w-8 rounded-full ${routine.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-panel' : ''}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </fieldset>
        </div>
      </div>

      <Panel
        title="Blocos, na ordem do dia"
        icon="calendar"
        color={routine.color}
        action={<span className="font-mono text-xs text-muted">arraste para reordenar</span>}
      >
        {routine.blocks.length === 0 ? (
          <p className="m-0 text-sm text-muted">Nenhum bloco ainda. Adicione o primeiro abaixo.</p>
        ) : (
          <Reorder.Group axis="y" values={routine.blocks} onReorder={(b) => setBlocks(routine.id, b)} className="m-0 flex flex-col gap-2 p-0">
            {routine.blocks.map((b, i) => (
              <BlockRow key={b.id} routine={routine} block={b} index={i} />
            ))}
          </Reorder.Group>
        )}
        <BlockForm onSave={(b) => addBlock(routine.id, b)} />
      </Panel>

      <button
        type="button"
        onClick={() => {
          if (window.confirm(`Excluir a rotina "${routine.name}"?`)) {
            deleteRoutine(routine.id)
            onDeleted()
          }
        }}
        className="self-start rounded-full border border-[#4A1A26] px-4 py-2 text-sm font-semibold text-[#FB7185]"
      >
        Excluir rotina
      </button>
    </div>
  )
}

export function Rotinas({ selectedId, select }: { selectedId: string | null; select: (id: string | null) => void }) {
  const routines = useRotina((s) => s.routines)
  const createRoutine = useRotina((s) => s.createRoutine)
  const current = routines.find((r) => r.id === selectedId) ?? routines[0]

  return (
    <div className="flex flex-wrap items-start gap-5">
      <aside className="flex min-w-0 flex-[1_1_260px] flex-col gap-2 rounded-[22px] border border-line bg-panel p-4">
        <h2 className="m-0 px-2 pb-2 text-lg font-bold">Rotinas</h2>
        {routines.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => select(r.id)}
            aria-current={current?.id === r.id}
            className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${
              current?.id === r.id ? 'bg-[#16203A]' : 'hover:bg-panel-2'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />
              {r.name || 'Sem nome'}
            </span>
            <span className="font-mono text-xs font-normal text-muted">{r.blocks.length}</span>
          </button>
        ))}
        <button type="button" onClick={() => select(createRoutine())} className="mt-2 self-start rounded-full bg-ok px-4 py-2 text-[13px] font-bold text-[#06210F]">
          + Nova rotina
        </button>
      </aside>

      <div className="min-w-0 flex-[999_1_560px]">
        {current ? (
          <RoutineEditor key={current.id} routine={current} onDeleted={() => select(null)} />
        ) : (
          <div className="rounded-[22px] border border-line bg-panel p-8 text-muted">Crie sua primeira rotina para começar.</div>
        )}
      </div>
    </div>
  )
}
