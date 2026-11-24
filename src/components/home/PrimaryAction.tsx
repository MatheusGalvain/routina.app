import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAreas, useRotina } from '../../store/useRotina'
import { useNavigate } from 'react-router-dom'
import { useGoToday } from '../../lib/navigation'
import { useShownPet, useStats } from '../../store/useCompanion'
import { getPrimaryAction, type PrimaryActionType } from '../../lib/primaryAction'
import { dayKey, nowInTz } from '../../lib/dates'
import { areaOf } from '../../data/areas'
import { Pet } from '../pets/Pet'
import { Icon, ProgressRing } from '../ui/ui'
import type { TodayItem } from '../../types'
import { useRoutineDay } from '../../store/useTodayItems'
import { dayMonth, nextOnce, splitArchived } from '../../lib/routines'

export type { TodayTarget } from '../../lib/navigation'

/** Janela simples (gaveta no celular, centralizada no computador). Fecha com Esc ou tocando fora. */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      opener?.focus?.()
    }
  }, [])
  return (
    <motion.div className="fixed inset-0 z-[75] flex items-end justify-center bg-black/60 sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pa-modal-title"
        className="flex max-h-[88vh] w-full max-w-[460px] flex-col gap-4 overflow-y-auto rounded-t-[24px] border border-b-0 border-line bg-panel px-4 pt-4 pb-6 sm:rounded-[24px] sm:border-b sm:px-6"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 38 }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3">
          <h2 id="pa-modal-title" className="m-0 text-lg font-bold">
            {title}
          </h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Fechar" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted hover:bg-panel-2 hover:text-soft">
            <Icon name="x" />
          </button>
        </header>
        {children}
      </motion.div>
    </motion.div>
  )
}

function QuickTask({ onClose }: { onClose: () => void }) {
  const areas = useAreas()
  const addDayTask = useRotina((s) => s.addDayTask)
  const [name, setName] = useState('')
  const [areaId, setAreaId] = useState('')
  return (
    <Modal title="Algo para hoje" onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim()) return
          addDayTask(dayKey(), name, areaId || null)
          onClose()
        }}
      >
        <p className="m-0 text-sm text-muted">Uma tarefa só de hoje: aparece no grupo Avulsas, na tela Hoje.</p>
        <label className="flex flex-col gap-1.5 text-xs text-muted">
          O que você quer fazer?
          <input
            autoFocus
            value={name}
            maxLength={200}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Ligar para a vó, pagar a conta de luz"
            className="min-h-11 w-full rounded-lg border border-line bg-ink px-3 text-sm text-soft placeholder:text-muted"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-muted">
          Área da vida (opcional)
          <select value={areaId} onChange={(e) => setAreaId(e.target.value)} className="min-h-11 w-full rounded-lg border border-line bg-ink px-3 text-sm text-soft">
            <option value="">Sem área</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={!name.trim()} className="min-h-11 rounded-full bg-ok px-5 text-sm font-bold text-ink disabled:opacity-40 sm:self-start">
          + Adicionar para hoje
        </button>
      </form>
    </Modal>
  )
}

function DaySummary({ items, onClose, openToday }: { items: TodayItem[]; onClose: () => void; openToday: () => void }) {
  const areas = useAreas()
  const note = useRotina((s) => s.logs[dayKey()]?.note?.trim())
  const pet = useShownPet('concluido', true)
  const done = items.filter((i) => i.done)
  const skipped = items.filter((i) => i.skipped && !i.done).length
  const byArea = new Map<string, number>()
  for (const i of done) byArea.set(i.block.areaId, (byArea.get(i.block.areaId) ?? 0) + 1)

  return (
    <Modal title="Como foi o dia" onClose={onClose}>
      <div className="flex flex-col items-center gap-2 text-center">
        <Pet kind={pet.kind} state="concluido" phase={pet.phase} adultDetail={pet.adultDetail} accessories={pet.accessories} size={110} interactive={false} />
        <p className="m-0 text-sm text-soft">{pet.name && pet.isCompanion ? `${pet.name} está comemorando com você!` : 'Que dia bom!'}</p>
      </div>
      <div className="flex items-center gap-4 rounded-2xl bg-panel-2 p-4">
        <ProgressRing pct={items.length ? done.length / items.length : 0} size={72} stroke={7}>
          <span className="text-base">{items.length ? Math.round((done.length / items.length) * 100) : 0}%</span>
        </ProgressRing>
        <div className="flex min-w-0 flex-col gap-1">
          <strong>
            {done.length} de {items.length} blocos feitos
          </strong>
          {skipped > 0 && <span className="text-[13px] text-muted">{skipped === 1 ? '1 pulado' : `${skipped} pulados`}, e tudo bem.</span>}
        </div>
      </div>
      {byArea.size > 0 && (
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label="Blocos feitos por área">
          {[...byArea].map(([id, n]) => {
            const a = areaOf(areas, id)
            return (
              <li key={id} className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-[13px]">
                <span className="h-2 w-2 rounded-full" style={{ background: a.color }} aria-hidden="true" />
                {a.name} <span className="font-mono text-[11.5px] text-muted">{n}</span>
              </li>
            )
          })}
        </ul>
      )}
      {note && <blockquote className="m-0 rounded-xl border-l-2 border-noite bg-panel-2 px-4 py-3 text-sm text-soft [overflow-wrap:anywhere]">{note}</blockquote>}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onClose} className="min-h-11 rounded-full bg-accent px-5 text-sm font-bold text-ink">
          Fechar
        </button>
        <button
          type="button"
          onClick={() => {
            onClose()
            openToday()
          }}
          className="min-h-11 rounded-full border border-line px-5 text-sm font-semibold text-soft hover:bg-panel-2"
        >
          Abrir o dia
        </button>
      </div>
    </Modal>
  )
}

/**
 * Botão principal do Início, com um balão do pet em cima. O texto e a ação vêm de
 * getPrimaryAction (src/lib/primaryAction.ts), conforme o momento da pessoa.
 */
export function PrimaryActionButton({ items }: { items: TodayItem[] }) {
  const navigate = useNavigate()
  const goToday = useGoToday()
  const now = nowInTz()
  const date = dayKey(now)
  const hasFavoritePet = useRotina((s) => !!s.companion.kind)
  const allRoutines = useRotina((s) => s.routines)
  const routineDay = useRoutineDay()
  const { routineCount, archivedCount, upcoming } = useMemo(() => {
    const real = allRoutines.filter((r) => !r.dev)
    const { active, archived } = splitArchived(real, routineDay)
    const next = nextOnce(active, routineDay)
    return { routineCount: active.length, archivedCount: archived.length, upcoming: next ? { name: next.name, when: dayMonth(next.onceDate!) } : null }
  }, [allRoutines, routineDay])
  const activeId = useRotina((s) => s.activeBlockId)
  const wokeToday = useRotina((s) => s.wokenOn === date)
  const hasReview = useRotina((s) => !!s.logs[date]?.note?.trim())
  const stats = useStats()
  const [waking, setWaking] = useState(false)
  const [modal, setModal] = useState<'quick' | 'summary' | null>(null)

  const primary = useMemo(
    () =>
      getPrimaryAction({
        hasFavoritePet,
        routineCount,
        archivedCount,
        nextOnce: upcoming,
        daysSinceLastActive: stats.daysSinceLastActive,
        wokeToday,
        items: items.map((i) => ({ id: i.block.id, name: i.block.name, done: i.done, skipped: i.skipped })),
        activeId,
        hour: now.getHours(),
        hasReview,
      }),
    [hasFavoritePet, routineCount, archivedCount, upcoming, stats.daysSinceLastActive, wokeToday, items, activeId, now.getHours(), hasReview],
  )

  const pet = useShownPet(waking ? 'concluido' : 'neutro', waking)

  // Acordar: o pet espreguiça (animação curta) e só então o botão passa para o estado seguinte.
  useEffect(() => {
    if (!waking) return
    const t = window.setTimeout(() => {
      useRotina.getState().wakePet(date)
      setWaking(false)
    }, 1100)
    return () => window.clearTimeout(t)
  }, [waking])

  const run = (a: PrimaryActionType) => {
    switch (a.type) {
      case 'onboarding':
        // Onboarding não concluído: abre /bem-vindo no passo que falta.
        return navigate(`/bem-vindo?passo=${a.step}`)
      case 'wakePet':
        return setWaking(true)
      case 'quickTask':
        return setModal('quick')
      case 'startDay':
        useRotina.getState().setActive(a.blockId)
        return goToday({ blockId: a.blockId })
      case 'continue':
        return goToday({ blockId: a.blockId })
      case 'review':
        return goToday({ review: true })
      case 'daySummary':
        return setModal('summary')
      case 'routines':
        return navigate('/rotinas')
    }
  }

  const message = waking ? 'Aaah… bom dia! Prontinho, acordei.' : primary.petMessage

  return (
    <div className="flex w-full flex-col items-stretch gap-2.5 sm:w-auto sm:max-w-[380px] sm:items-end">
      <div className="relative flex items-center gap-2.5 rounded-2xl border border-line-2 bg-panel-2 py-2 pr-4 pl-2">
        <motion.span
          className="shrink-0"
          animate={waking ? { y: [0, -10, 0, -4, 0], rotate: [0, -8, 8, 0] } : { y: 0, rotate: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        >
          <Pet kind={pet.kind} state={pet.state} sleeping={pet.sleeping} phase={pet.phase} adultDetail={pet.adultDetail} accessories={pet.accessories} size={40} interactive={false} float={false} />
        </motion.span>
        <AnimatePresence mode="wait">
          <motion.p
            key={message}
            className="m-0 min-w-0 text-[13.5px] leading-snug text-soft"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            aria-live="polite"
          >
            {message}
          </motion.p>
        </AnimatePresence>
        {/* Biquinho do balão, apontando para o botão. */}
        <span aria-hidden="true" className="absolute -bottom-[7px] right-10 h-3 w-3 rotate-45 border-r border-b border-line-2 bg-panel-2" />
      </div>
      <button
        type="button"
        disabled={waking}
        onClick={() => run(primary.action)}
        className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-full bg-accent px-5 py-3.5 text-[15px] font-bold text-ink shadow-[0_0_24px_color-mix(in_srgb,var(--color-accent)_30%,transparent)] disabled:opacity-70"
      >
        <Icon name="play" size={14} /> <span className="min-w-0 truncate">{primary.label}</span>
      </button>

      <AnimatePresence>
        {modal === 'quick' && <QuickTask key="quick" onClose={() => setModal(null)} />}
        {modal === 'summary' && <DaySummary key="summary" items={items} onClose={() => setModal(null)} openToday={() => goToday()} />}
      </AnimatePresence>
    </div>
  )
}
