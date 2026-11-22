import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useAreas, useRotina } from '../../store/useRotina'
import { AREA_COLORS, AREA_NAME_MAX, MAX_AREAS, removedDefaults, sameName } from '../../data/areas'
import { trophyNameForArea } from '../../data/trophies'
import { Icon } from '../ui/ui'
import type { Area, AreaId, DefaultAreaKey } from '../../types'

const colorName = (c: string) => AREA_COLORS.find((x) => x.color === c)?.name ?? c

/** Quantos blocos de rotinas e de modelos usam cada área (rotinas do painel dev ficam de fora). */
function useBlockCounts() {
  const routines = useRotina((s) => s.routines)
  const templates = useRotina((s) => s.templates)
  const counts = new Map<AreaId, number>()
  const add = (id: AreaId) => counts.set(id, (counts.get(id) ?? 0) + 1)
  for (const r of routines) if (!r.dev) r.blocks.forEach((b) => add(b.areaId))
  for (const t of templates) t.blocks.forEach((b) => add(b.areaId))
  return counts
}

/** Paleta de 12 cores (botões com aria-pressed). */
function Palette({ value, onPick, label }: { value: string; onPick: (c: string) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="grid grid-cols-6 gap-2 sm:grid-cols-12">
      {AREA_COLORS.map(({ color, name }) => (
        <button
          key={color}
          type="button"
          aria-label={name}
          aria-pressed={value === color}
          onClick={() => onPick(color)}
          className={`aspect-square w-full max-w-9 justify-self-center rounded-full ${value === color ? 'ring-2 ring-white ring-offset-2 ring-offset-panel' : ''}`}
          style={{ background: color }}
        />
      ))}
    </div>
  )
}

function AreaRow({ area, index, total, blocks, others }: { area: Area; index: number; total: number; blocks: number; others: Area[] }) {
  const { updateArea, moveArea, deleteArea } = useRotina.getState()
  const [name, setName] = useState(area.name)
  const [palette, setPalette] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [moveTo, setMoveTo] = useState<AreaId>(others[0]?.id ?? '')
  const paletteId = useId()
  // Se a área escolhida sumiu da lista, usa a primeira das outras.
  const target = others.some((a) => a.id === moveTo) ? moveTo : (others[0]?.id ?? '')

  // Nome mudou em outro lugar (ex.: outro aparelho): acompanha.
  useEffect(() => setName(area.name), [area.name])

  return (
    <li className="flex flex-col gap-3 rounded-xl bg-panel-2 p-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Cor de ${area.name}: ${colorName(area.color)}. Trocar`}
          aria-expanded={palette}
          aria-controls={paletteId}
          onClick={() => setPalette((v) => !v)}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-[#232A38]"
        >
          <span className="h-5 w-5 rounded-full" style={{ background: area.color }} />
        </button>
        <input
          aria-label="Nome da área"
          value={name}
          maxLength={AREA_NAME_MAX}
          onChange={(e) => {
            setName(e.target.value)
            if (e.target.value.trim()) updateArea(area.id, { name: e.target.value.trim() })
          }}
          onBlur={() => setName(area.name)}
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-line bg-[#0B0E15] px-3 text-sm font-semibold text-soft"
        />
        <div className="flex shrink-0 items-center">
          <button
            type="button"
            aria-label={`Mover ${area.name} para cima`}
            disabled={index === 0}
            onClick={() => moveArea(area.id, -1)}
            className="grid h-11 w-9 place-items-center rounded-lg text-muted hover:text-soft disabled:opacity-30"
          >
            <Icon name="chevron-up" size={16} />
          </button>
          <button
            type="button"
            aria-label={`Mover ${area.name} para baixo`}
            disabled={index === total - 1}
            onClick={() => moveArea(area.id, 1)}
            className="grid h-11 w-9 place-items-center rounded-lg text-muted hover:text-soft disabled:opacity-30"
          >
            <Icon name="chevron-down" size={16} />
          </button>
          <button
            type="button"
            aria-label={`Excluir ${area.name}`}
            aria-expanded={confirm}
            disabled={total <= 1}
            onClick={() => setConfirm((v) => !v)}
            className="grid h-11 w-9 place-items-center rounded-lg text-muted hover:text-erro disabled:opacity-30"
          >
            <Icon name="trash" size={16} />
          </button>
        </div>
      </div>

      {palette && (
        <div id={paletteId}>
          <Palette label={`Cor de ${area.name}`} value={area.color} onPick={(color) => updateArea(area.id, { color })} />
        </div>
      )}

      {confirm && (
        <div role="group" aria-label={`Excluir ${area.name}`} className="flex flex-col gap-3 rounded-xl border border-[#4A1A26] bg-[#1A0F14] p-3">
          {blocks > 0 ? (
            <label className="flex flex-col gap-1.5 text-sm text-soft">
              {blocks === 1 ? '1 bloco usa' : `${blocks} blocos usam`} {area.name}. Para qual área {blocks === 1 ? 'ele vai' : 'eles vão'}?
              <select
                value={target}
                onChange={(e) => setMoveTo(e.target.value)}
                className="min-h-11 rounded-lg border border-line bg-[#0B0E15] px-3 text-sm text-soft"
              >
                {others.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="m-0 text-sm text-soft">Excluir {area.name}?</p>
          )}
          <p className="m-0 text-[12.5px] text-muted">
            O histórico continua contando nas estatísticas.
            {area.isDefault && trophyNameForArea(area.id)
              ? ` O troféu ${trophyNameForArea(area.id)} fica com o que você já conquistou, mas para de avançar até você restaurar a área.`
              : area.isDefault
                ? ' Dá para restaurar esta área depois.'
                : ''}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => deleteArea(area.id, blocks > 0 ? target : null)}
              className="min-h-11 rounded-full bg-[#F43F5E] px-4 text-sm font-bold text-white"
            >
              {blocks > 0 ? 'Mover e excluir' : 'Excluir'}
            </button>
            <button type="button" onClick={() => setConfirm(false)} className="min-h-11 rounded-full bg-panel px-4 text-sm font-semibold text-soft">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </li>
  )
}

function NewArea({ areas }: { areas: Area[] }) {
  const addArea = useRotina((s) => s.addArea)
  const firstFree = () => AREA_COLORS.find((c) => !areas.some((a) => a.color === c.color))?.color ?? AREA_COLORS[0].color
  const [name, setName] = useState('')
  const [color, setColor] = useState(firstFree)
  const full = areas.length >= MAX_AREAS
  const original = name.trim() ? removedDefaults(areas).find((d) => sameName(d.name, name)) : undefined
  const trophy = original ? trophyNameForArea(original.id) : null

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (full || !name.trim()) return
    addArea(name, color)
    setName('')
    setColor(AREA_COLORS.find((c) => c.color !== color && !areas.some((a) => a.color === c.color))?.color ?? color)
  }

  if (full) return <p className="m-0 rounded-xl bg-panel-2 px-4 py-3 text-sm text-muted">Você chegou ao limite de {MAX_AREAS} áreas. Exclua uma para criar outra.</p>

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl border border-[#24304A] bg-[#0D1422] p-3 sm:p-4">
      <label className="flex flex-col gap-1.5 text-xs text-muted">
        Nova área
        <input
          value={name}
          maxLength={AREA_NAME_MAX}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Família, Música, Projetos"
          className="min-h-11 w-full rounded-lg border border-line bg-[#0B0E15] px-3 text-sm text-soft placeholder:text-[#6F788A]"
        />
      </label>
      {original && (
        <p className="m-0 text-[12.5px] text-[#9CC8FF]" aria-live="polite">
          {original.name} volta como a área original, com o histórico{trophy ? ` e o progresso do troféu ${trophy}` : ''}.
        </p>
      )}
      <Palette label="Cor da nova área" value={color} onPick={setColor} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[11.5px] text-muted">
          {areas.length}/{MAX_AREAS} áreas
        </span>
        <button type="submit" disabled={!name.trim()} className="min-h-11 rounded-full bg-ok px-4 text-sm font-bold text-[#06210F] disabled:opacity-40">
          + Adicionar área
        </button>
      </div>
    </form>
  )
}

/** Áreas padrão excluídas: restaurar com a chave original, ou juntar com uma área de mesmo nome. */
function RemovedAreas({ areas }: { areas: Area[] }) {
  const restoreArea = useRotina((s) => s.restoreArea)
  const removed = removedDefaults(areas)
  if (removed.length === 0) return null
  const full = areas.length >= MAX_AREAS

  return (
    <section aria-labelledby="removed-title" className="flex flex-col gap-2">
      <div>
        <h3 id="removed-title" className="m-0 text-sm font-bold">
          Áreas originais removidas
        </h3>
        <p className="m-0 text-[12.5px] text-muted">Ao restaurar, o histórico e o progresso dos troféus voltam a contar.</p>
      </div>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {removed.map((d) => {
          const twin = areas.find((a) => !a.isDefault && sameName(a.name, d.name))
          const trophy = trophyNameForArea(d.id)
          return (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-line px-3 py-2">
              <span className="flex min-w-0 flex-col">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: d.color }} aria-hidden="true" />
                  {d.name}
                </span>
                <span className="text-[12px] text-muted">
                  {[trophy && `troféu ${trophy}`, twin && `junta com a sua área "${twin.name}"`].filter(Boolean).join(' · ') || 'sem troféu'}
                </span>
              </span>
              <button
                type="button"
                disabled={!twin && full}
                onClick={() => restoreArea(d.id as DefaultAreaKey, twin?.id)}
                className="min-h-11 rounded-full border border-line px-4 text-[13px] font-semibold text-soft hover:bg-panel-2 disabled:opacity-40"
              >
                {twin ? 'Juntar com a original' : 'Restaurar'}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** Gerenciar áreas da vida: renomear, recolorir, reordenar, criar (até 12) e excluir. */
export function AreaManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  const areas = useAreas()
  const counts = useBlockCounts()
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[75] flex items-end justify-center bg-black/60 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="areas-title"
            className="flex max-h-[88vh] w-full max-w-[600px] flex-col overflow-hidden rounded-t-[24px] border border-b-0 border-line bg-panel sm:rounded-[24px] sm:border-b"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between gap-3 px-4 pt-4 pb-2 sm:px-6 sm:pt-5">
              <div>
                <h2 id="areas-title" className="m-0 text-lg font-bold">
                  Áreas da vida
                </h2>
                <p className="m-0 text-[12.5px] text-muted">Renomeie, troque a cor, mude a ordem ou crie as suas.</p>
              </div>
              <button ref={closeRef} type="button" onClick={onClose} aria-label="Fechar" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted hover:bg-panel-2 hover:text-soft">
                <Icon name="x" />
              </button>
            </header>

            <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-5 sm:px-6 sm:pb-6">
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {areas.map((a, i) => (
                  <AreaRow key={a.id} area={a} index={i} total={areas.length} blocks={counts.get(a.id) ?? 0} others={areas.filter((x) => x.id !== a.id)} />
                ))}
              </ul>
              <NewArea areas={areas} />
              <RemovedAreas areas={areas} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
