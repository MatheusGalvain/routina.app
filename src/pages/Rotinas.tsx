import { useState, type ReactNode } from 'react'
import { Reorder, useDragControls } from 'framer-motion'
import { useAreas, useRotina } from '../store/useRotina'
import { BLOCK_TYPES, ROUTINE_COLORS, WEEKDAYS, areaOf } from '../data/areas'
import { Icon, Panel } from '../components/ui/ui'
import { HelpButton } from '../components/help/HelpButton'
import type { AreaId, Block, BlockType, Routine, UserTemplate } from '../types'

const inputCls = 'w-full rounded-lg border border-line bg-ink px-3 py-2.5 text-sm text-soft placeholder:text-muted'

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
  const areas = useAreas()
  // Bloco novo começa em Foco (se existir) ou na primeira área da pessoa.
  const [d, setD] = useState<Draft>(() =>
    initial ? toDraft(initial) : { ...emptyDraft, areaId: areas.some((a) => a.id === 'foco') ? 'foco' : (areas[0]?.id ?? 'foco') },
  )
  // Área do bloco que foi excluída: aparece na lista até a pessoa escolher outra.
  const options = areas.some((a) => a.id === d.areaId) ? areas : [...areas, areaOf(areas, d.areaId)]
  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }))
  const valid = d.name.trim() !== '' && (d.type !== 'contador' || Number(d.target) > 0)

  return (
    <form
      className="flex flex-col gap-3 rounded-2xl border border-accent/25 bg-accent/5 p-3 sm:p-4"
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
        <legend className="mb-1.5 flex items-center gap-2 text-xs text-muted">
          Tipo <HelpButton k="tipos" />
        </legend>
        <div className="grid grid-cols-3 gap-2">
          {BLOCK_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={d.type === t.id}
              onClick={() => set({ type: t.id })}
              className={`flex min-w-0 flex-col items-start gap-0.5 rounded-lg border px-2.5 py-2 text-left sm:px-3 ${
                d.type === t.id ? 'border-accent bg-accent/15' : 'border-line bg-panel-2'
              }`}
            >
              <span className="text-sm font-semibold">{t.name}</span>
              <span className="text-[11px] leading-tight text-muted [overflow-wrap:anywhere]">{t.hint}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted">
          Área da vida
          <select className={inputCls} value={d.areaId} onChange={(e) => set({ areaId: e.target.value as AreaId })}>
            {options.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted">
          Duração (min, opcional)
          <input className={inputCls} inputMode="numeric" value={d.minutes} onChange={(e) => set({ minutes: e.target.value })} placeholder="—" />
        </label>
      </div>

      {d.type === 'contador' && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted">
            Meta
            <input className={inputCls} inputMode="decimal" value={d.target} onChange={(e) => set({ target: e.target.value })} placeholder="8" />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted">
            Unidade
            <input className={inputCls} value={d.unit} onChange={(e) => set({ unit: e.target.value })} placeholder="copos" />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted">
            Passo do +
            <input className={inputCls} inputMode="decimal" value={d.step} onChange={(e) => set({ step: e.target.value })} placeholder="1" />
          </label>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={!valid} className="rounded-full bg-ok px-4 py-2 text-sm font-bold text-ink disabled:opacity-40">
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

/**
 * O que o editor edita: uma rotina ou um modelo da pessoa. Os dois têm nome, cor, dias e blocos;
 * as funções dizem onde gravar.
 */
interface EditorTarget {
  kind: 'routine' | 'template'
  value: { id: string; name: string; color: string; days: number[]; blocks: Block[] }
  update: (patch: { name?: string; color?: string; days?: number[] }) => void
  setBlocks: (blocks: Block[]) => void
}

const newId = () => crypto.randomUUID()

function BlockRow({ target, block, index }: { target: EditorTarget; block: Block; index: number }) {
  const controls = useDragControls()
  const [editing, setEditing] = useState(false)
  const area = areaOf(useAreas(), block.areaId)
  const typeName = BLOCK_TYPES.find((t) => t.id === block.type)?.name
  const blocks = target.value.blocks

  return (
    <Reorder.Item value={block} dragListener={false} dragControls={controls} className="list-none">
      {editing ? (
        <BlockForm
          initial={block}
          onSave={(b) => {
            target.setBlocks(blocks.map((x) => (x.id === block.id ? { ...x, ...b } : x)))
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
            className="cursor-grab touch-none text-muted active:cursor-grabbing"
          >
            <Icon name="grip" />
          </button>
          <span className="w-5 font-mono text-xs text-muted">{index + 1}</span>
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
          <button
            type="button"
            onClick={() => target.setBlocks(blocks.filter((x) => x.id !== block.id))}
            aria-label={`Remover ${block.name}`}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:text-erro"
          >
            <Icon name="trash" size={16} />
          </button>
        </div>
      )}
    </Reorder.Item>
  )
}

function Editor({ target, footer }: { target: EditorTarget; footer: ReactNode }) {
  const v = target.value
  const isTemplate = target.kind === 'template'
  const toggleDay = (d: number) => target.update({ days: v.days.includes(d) ? v.days.filter((x) => x !== d) : [...v.days, d].sort() })

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 rounded-[22px] border border-line bg-panel p-4 sm:p-6">
        {isTemplate && (
          <p className="m-0 flex flex-wrap items-center gap-2 font-mono text-xs tracking-wider text-alerta uppercase">
            <Icon name="box" size={14} /> Modelo
            <span className="font-sans text-[12.5px] tracking-normal text-muted normal-case">Mudar o modelo não altera as rotinas já criadas com ele.</span>
          </p>
        )}
        <label className="flex flex-col gap-1.5 text-xs text-muted">
          {isTemplate ? 'Nome do modelo' : 'Nome da rotina'}
          <input className={`${inputCls} text-lg font-bold`} value={v.name} onChange={(e) => target.update({ name: e.target.value })} />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <fieldset className="m-0 w-full border-0 p-0 sm:w-auto">
            <legend className="mb-2 text-xs text-muted">Dias da semana</legend>
            <div className="grid grid-cols-7 gap-1.5 sm:flex">
              {WEEKDAYS.map((w, d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={v.days.includes(d)}
                  aria-label={w.long}
                  onClick={() => toggleDay(d)}
                  className={`grid aspect-square w-full max-w-10 place-items-center rounded-full text-sm font-bold sm:h-10 sm:w-10 ${
                    v.days.includes(d) ? 'bg-accent text-ink' : 'bg-panel-2 text-muted'
                  }`}
                >
                  {w.short}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="m-0 border-0 p-0">
            <legend className="mb-2 text-xs text-muted">Cor</legend>
            <div className="flex flex-wrap gap-2">
              {ROUTINE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Cor ${c}`}
                  aria-pressed={v.color === c}
                  onClick={() => target.update({ color: c })}
                  className={`h-8 w-8 rounded-full ${v.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-panel' : ''}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </fieldset>
        </div>
      </div>

      <Panel title="Blocos, na ordem do dia" icon="calendar" color={v.color} help="editor" action={<span className="font-mono text-xs text-muted">arraste para reordenar</span>}>
        {v.blocks.length === 0 ? (
          <p className="m-0 text-sm text-muted">Nenhum bloco ainda. Adicione o primeiro abaixo.</p>
        ) : (
          <Reorder.Group axis="y" values={v.blocks} onReorder={target.setBlocks} className="m-0 flex flex-col gap-2 p-0">
            {v.blocks.map((b, i) => (
              <BlockRow key={b.id} target={target} block={b} index={i} />
            ))}
          </Reorder.Group>
        )}
        <BlockForm onSave={(b) => target.setBlocks([...v.blocks, { ...b, id: newId() }])} />
      </Panel>

      <div className="flex flex-wrap items-center gap-3">{footer}</div>
    </div>
  )
}

const ghostBtn = 'min-h-11 rounded-full border border-line px-4 text-sm font-semibold text-soft hover:bg-panel-2'
const dangerBtn = 'min-h-11 rounded-full border border-erro/40 px-4 text-sm font-semibold text-erro'

function RoutineEditor({ routine, onDeleted, openTemplate }: { routine: Routine; onDeleted: () => void; openTemplate: (id: string) => void }) {
  const { updateRoutine, deleteRoutine, setBlocks, saveAsTemplate } = useRotina.getState()
  const [saved, setSaved] = useState<string | null>(null)
  const target: EditorTarget = {
    kind: 'routine',
    value: routine,
    update: (patch) => updateRoutine(routine.id, patch),
    setBlocks: (blocks) => setBlocks(routine.id, blocks),
  }

  return (
    <Editor
      target={target}
      footer={
        <>
          <button type="button" onClick={() => setSaved(saveAsTemplate(routine.id) ?? null)} className={`inline-flex items-center gap-2 ${ghostBtn}`}>
            <Icon name="box" size={15} /> Salvar como modelo
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Excluir a rotina "${routine.name}"?`)) {
                deleteRoutine(routine.id)
                onDeleted()
              }
            }}
            className={dangerBtn}
          >
            Excluir rotina
          </button>
          <p className="m-0 w-full text-sm text-muted" aria-live="polite">
            {saved && (
              <>
                Modelo salvo em Rotinas prontas.{' '}
                <button type="button" onClick={() => openTemplate(saved)} className="font-semibold text-accent underline underline-offset-2">
                  Editar o modelo
                </button>
              </>
            )}
          </p>
        </>
      }
    />
  )
}

function TemplateEditor({ template, onDeleted, onUsed }: { template: UserTemplate; onDeleted: () => void; onUsed: (routineId: string) => void }) {
  const { updateTemplate, deleteTemplate, addTemplate } = useRotina.getState()
  const target: EditorTarget = {
    kind: 'template',
    value: template,
    update: (patch) => updateTemplate(template.id, patch),
    setBlocks: (blocks) => updateTemplate(template.id, { blocks }),
  }

  return (
    <Editor
      target={target}
      footer={
        <>
          <button
            type="button"
            onClick={() => {
              const id = addTemplate(template.id)
              if (id) onUsed(id)
            }}
            className="min-h-11 rounded-full bg-ok px-4 text-sm font-bold text-ink"
          >
            Usar este modelo
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Excluir o modelo "${template.name}"? As rotinas criadas com ele continuam.`)) {
                deleteTemplate(template.id)
                onDeleted()
              }
            }}
            className={dangerBtn}
          >
            Excluir modelo
          </button>
        </>
      }
    />
  )
}

/** O que está aberto no editor. `null` = a primeira rotina. */
export type Selection = { kind: 'routine' | 'template'; id: string } | null

function SideItem({ name, color, count, current, onClick }: { name: string; color: string; count: number; current: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={current ? 'true' : undefined}
      className={`flex min-h-11 items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${current ? 'bg-accent/15' : 'hover:bg-panel-2'}`}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
        <span className="[overflow-wrap:anywhere]">{name || 'Sem nome'}</span>
      </span>
      <span className="font-mono text-xs font-normal text-muted">{count}</span>
    </button>
  )
}

export function Rotinas({ selected, select }: { selected: Selection; select: (s: Selection) => void }) {
  const routines = useRotina((s) => s.routines)
  const templates = useRotina((s) => s.templates)
  const createRoutine = useRotina((s) => s.createRoutine)
  const createTemplate = useRotina((s) => s.createTemplate)
  const template = selected?.kind === 'template' ? templates.find((t) => t.id === selected.id) : undefined
  const routine = template ? undefined : (routines.find((r) => selected?.kind === 'routine' && r.id === selected.id) ?? routines[0])
  const openTemplate = (id: string) => select({ kind: 'template', id })

  return (
    <div className="flex flex-wrap items-start gap-5">
      <aside className="flex min-w-0 flex-[1_1_260px] flex-col gap-4 rounded-[22px] border border-line bg-panel p-4">
        <nav aria-labelledby="lista-rotinas" className="flex flex-col gap-2">
          <div className="flex items-center gap-2.5 px-2 pb-1">
            <h2 id="lista-rotinas" className="m-0 text-lg font-bold">
              Rotinas
            </h2>
            <HelpButton k="rotinas" />
          </div>
          {routines.map((r) => (
            <SideItem key={r.id} name={r.name} color={r.color} count={r.blocks.length} current={routine?.id === r.id} onClick={() => select({ kind: 'routine', id: r.id })} />
          ))}
          <button type="button" onClick={() => select({ kind: 'routine', id: createRoutine() })} className="mt-1 self-start rounded-full bg-ok px-4 py-2 text-[13px] font-bold text-ink">
            + Nova rotina
          </button>
        </nav>

        <nav aria-labelledby="lista-modelos" className="flex flex-col gap-2 border-t border-line pt-4">
          <div className="flex items-center gap-2.5 px-2 pb-1">
            <h2 id="lista-modelos" className="m-0 text-lg font-bold">
              Meus modelos
            </h2>
            <HelpButton k="meus-modelos" />
          </div>
          {templates.length === 0 && <p className="m-0 px-2 text-[13px] text-muted">Salve uma rotina como modelo ou crie um do zero.</p>}
          {templates.map((t) => (
            <SideItem key={t.id} name={t.name} color={t.color} count={t.blocks.length} current={template?.id === t.id} onClick={() => openTemplate(t.id)} />
          ))}
          <button type="button" onClick={() => openTemplate(createTemplate())} className="mt-1 self-start rounded-full border border-line px-4 py-2 text-[13px] font-bold text-soft hover:bg-panel-2">
            + Novo modelo
          </button>
        </nav>
      </aside>

      <div className="min-w-0 flex-[999_1_560px]">
        {template ? (
          <TemplateEditor key={template.id} template={template} onDeleted={() => select(null)} onUsed={(id) => select({ kind: 'routine', id })} />
        ) : routine ? (
          <RoutineEditor key={routine.id} routine={routine} onDeleted={() => select(null)} openTemplate={openTemplate} />
        ) : (
          <div className="rounded-[22px] border border-line bg-panel p-8 text-muted">Crie sua primeira rotina para começar.</div>
        )}
      </div>
    </div>
  )
}
