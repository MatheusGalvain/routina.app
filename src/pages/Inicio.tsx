import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAreas, useRotina } from '../store/useRotina'
import { computePetState, getTodayItems } from '../lib/today'
import { dayKey, greeting, nowInTz } from '../lib/dates'
import { WEEKDAYS } from '../data/areas'
import { AreaManager } from '../components/areas/AreaManager'
import { TEMPLATES } from '../data/templates'
import { Bar, Icon, Logo, Panel, ProgressRing } from '../components/ui/ui'
import { Pet } from '../components/pets/Pet'
import { PETS, PET_ORDER, textColor } from '../components/pets/pets'
import { PetStory } from '../components/pets/PetStory'
import { PetCorner } from '../components/pets/PetCorner'
import { PrimaryActionButton } from '../components/home/PrimaryAction'
import { EventBanner } from '../components/home/EventBanner'
import { useGoToday } from '../lib/navigation'
import { editorPath } from '../lib/slug'
import { useNavigate } from 'react-router-dom'
import { HelpButton } from '../components/help/HelpButton'
import type { BasePetKind } from '../types'

const daysLabel = (days: number[]) =>
  days.length === 7 ? 'todo dia' : days.length === 0 ? 'nenhum dia' : days.map((d) => WEEKDAYS[d].long.slice(0, 3).toLowerCase()).join(' · ')

type TemplateTab = 'sugestoes' | 'meus'

const TEMPLATE_TABS: { id: TemplateTab; label: string; on: string }[] = [
  { id: 'sugestoes', label: 'Sugestões', on: 'bg-alerta/15 text-alerta' },
  { id: 'meus', label: 'Meus modelos', on: 'bg-accent/15 text-accent' },
]

/**
 * "Rotinas prontas" em duas abas: as sugestões do app (src/data/templates.ts) e os modelos da pessoa.
 * Abas acessíveis (role tablist): setas, Home e End trocam de aba.
 */
function TemplatesPanel({ apply, openTemplate }: { apply: (keyOrId: string) => void; openTemplate: (id: string) => void }) {
  const templates = useRotina((s) => s.templates)
  const createTemplate = useRotina((s) => s.createTemplate)
  // Quem já tem modelos começa vendo os seus.
  const [tab, setTab] = useState<TemplateTab>(() => (useRotina.getState().templates.length ? 'meus' : 'sugestoes'))
  const tabRefs = useRef<Record<TemplateTab, HTMLButtonElement | null>>({ sugestoes: null, meus: null })
  const baseId = useId()
  const count: Record<TemplateTab, number> = { sugestoes: TEMPLATES.length, meus: templates.length }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = TEMPLATE_TABS.findIndex((t) => t.id === tab)
    const n = TEMPLATE_TABS.length
    const next =
      e.key === 'ArrowRight'
        ? TEMPLATE_TABS[(i + 1) % n]
        : e.key === 'ArrowLeft'
          ? TEMPLATE_TABS[(i - 1 + n) % n]
          : e.key === 'Home'
            ? TEMPLATE_TABS[0]
            : e.key === 'End'
              ? TEMPLATE_TABS[n - 1]
              : null
    if (!next) return
    e.preventDefault()
    setTab(next.id)
    tabRefs.current[next.id]?.focus()
  }

  return (
    <>
      <div role="tablist" aria-label="Tipo de modelo" onKeyDown={onKeyDown} className="grid grid-cols-2 gap-1 rounded-full border border-line bg-ink p-1">
        {TEMPLATE_TABS.map((t) => {
          const selected = tab === t.id
          return (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[t.id] = el
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setTab(t.id)}
              className={`flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-full px-2 text-[13px] font-semibold transition-colors ${selected ? t.on : 'text-muted hover:text-soft'}`}
            >
              <span className="truncate">{t.label}</span>
              <span className={`shrink-0 rounded-full px-1.5 font-mono text-[11px] ${selected ? 'bg-black/25' : 'bg-panel-2'}`}>{count[t.id]}</span>
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          role="tabpanel"
          id={`${baseId}-panel-${tab}`}
          aria-labelledby={`${baseId}-tab-${tab}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.16 }}
          className="flex min-w-0 flex-col gap-2.5"
        >
          {tab === 'sugestoes' ? (
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {TEMPLATES.map((t) => (
                <li key={t.key}>
                  <button
                    type="button"
                    onClick={() => apply(t.key)}
                    className="flex w-full flex-col gap-1 rounded-xl border border-alerta/30 bg-alerta/5 px-4 py-3.5 text-left hover:border-alerta/50"
                  >
                    <strong className="text-sm [overflow-wrap:anywhere]">{t.name}</strong>
                    <span className="text-[12.5px] text-muted">{t.description}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <>
              {templates.length === 0 ? (
                <p className="m-0 rounded-xl border border-dashed border-line-2 px-4 py-3.5 text-[13px] text-muted">
                  Você ainda não tem modelos. Crie um do zero ou use "Salvar como modelo" no editor de uma rotina.
                </p>
              ) : (
                <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                  {templates.map((t) => (
                    <li key={t.id} className="flex items-stretch rounded-xl border border-accent/25 bg-accent/5 hover:border-accent/50">
                      <button type="button" onClick={() => apply(t.id)} className="flex min-w-0 flex-1 flex-col gap-1 px-4 py-3.5 text-left">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: t.color }} aria-hidden="true" />
                          <strong className="min-w-0 text-sm [overflow-wrap:anywhere]">{t.name}</strong>
                        </span>
                        <span className="text-[12.5px] text-muted">
                          {t.blocks.length} {t.blocks.length === 1 ? 'bloco' : 'blocos'} · {daysLabel(t.days)}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openTemplate(t.id)}
                        aria-label={`Editar o modelo ${t.name}`}
                        className="grid w-11 shrink-0 place-items-center rounded-r-xl border-l border-accent/15 text-muted hover:bg-accent/10 hover:text-soft"
                      >
                        <Icon name="edit" size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={() => openTemplate(createTemplate())}
                className="min-h-10 self-start rounded-full border border-line px-4 text-[13px] font-semibold text-soft hover:bg-panel-2"
              >
                + Criar modelo
              </button>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </>
  )
}

export function Inicio() {
  const navigate = useNavigate()
  const goToday = useGoToday()
  const openRoutine = (id: string) => navigate(editorPath(id))
  const openTemplate = openRoutine
  const now = nowInTz()
  const date = dayKey(now)
  const routines = useRotina((s) => s.routines)
  const dayLog = useRotina((s) => s.logs[date])
  const completedTasks = useRotina((s) => s.completedTasks)
  const createRoutine = useRotina((s) => s.createRoutine)
  const addTemplate = useRotina((s) => s.addTemplate)
  // Usar um modelo cria uma rotina nova e independente e abre o editor nela.
  const applyTemplate = (keyOrId: string) => {
    const id = addTemplate(keyOrId)
    if (id) openRoutine(id)
  }
  const activeId = useRotina((s) => s.activeBlockId)
  const companion = useRotina((s) => s.companion)
  const areas = useAreas()
  const [storyPet, setStoryPet] = useState<BasePetKind | null>(null)
  const [editAreas, setEditAreas] = useState(false)
  const editAreasRef = useRef<HTMLButtonElement>(null)
  const closeAreas = () => {
    setEditAreas(false)
    editAreasRef.current?.focus()
  }

  const items = useMemo(() => getTodayItems(routines, dayLog, completedTasks, now, date), [routines, dayLog, completedTasks, date])
  const done = items.filter((i) => i.done).length
  /**
   * Áreas organizadas pelo dia: primeiro as que ainda têm algo para fazer hoje (mais pendências antes),
   * depois as que já fecharam o dia e por último as sem nada hoje. Empates seguem a ordem da pessoa.
   */
  const areaCards = useMemo(() => {
    const group = (c: { total: number; pending: number }) => (c.pending > 0 ? 0 : c.total > 0 ? 1 : 2)
    return areas
      .map((area, position) => {
        const list = items.filter((i) => i.block.areaId === area.id)
        return {
          area,
          position,
          total: list.length,
          ok: list.filter((i) => i.done).length,
          pending: list.filter((i) => !i.done && !i.skipped).length,
        }
      })
      .sort((x, y) => group(x) - group(y) || y.pending - x.pending || x.position - y.position)
  }, [areas, items])
  const next = items.find((i) => !i.done && !i.skipped)

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <Logo />
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <h1 className="m-0 lg:text-[45px] text-[35px] leading-none font-extrabold tracking-tight">
                Habbit <span className="text-accent">Do</span>
              </h1>
              <HelpButton k="inicio" />
            </div>
            <p className="m-0 text-muted">{greeting(now)}! Pronto para organizar o seu dia?</p>
          </div>
        </div>
        <PrimaryActionButton items={items} />
      </header>

      <EventBanner />

      <Panel title={companion.kind ? `Cantinho ${companion.name ? `de ${companion.name}` : 'do seu pet'}` : 'Cantinho do pet'} icon="paw" color="var(--color-accent)" help="cantinho">
        <PetCorner autoState={computePetState(items, activeId, now)} />
      </Panel>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5">
        <Panel title="Hoje" icon="trend" help="resumo-hoje">
          <div className="flex items-center gap-5">
            <ProgressRing pct={items.length ? done / items.length : 0}>{items.length ? Math.round((done / items.length) * 100) : 0}%</ProgressRing>
            <div className="flex flex-col gap-1.5">
              <strong className="text-lg">
                {done} de {items.length} blocos
              </strong>
              <span className="text-sm text-muted">{next ? `Próximo: ${next.block.name}` : items.length ? 'Tudo feito por hoje' : 'Nenhum bloco para hoje'}</span>
              {next && <span className="text-[13px] font-semibold text-accent">{next.routine.name}</span>}
            </div>
          </div>
          <button type="button" onClick={() => goToday()} className="mt-auto self-start rounded-full bg-accent px-4 py-2 text-[13px] font-bold text-ink">
            Abrir o dia
          </button>
        </Panel>

        <Panel title="Minhas rotinas" icon="calendar" color="var(--color-ok)" help="minhas-rotinas">
          {routines.length === 0 ? (
            <p className="m-0 text-sm text-muted">Você ainda não tem rotinas. Crie uma do zero ou comece por um modelo pronto.</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {routines.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => openRoutine(r.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-[10px] bg-panel-2 px-3.5 py-3 text-left text-sm font-semibold"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />
                      {r.name}
                    </span>
                    <span className="font-mono text-xs font-normal text-muted">
                      {r.blocks.length} blocos · {daysLabel(r.days)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => openRoutine(createRoutine())}
            className="mt-auto self-start rounded-full bg-ok px-4 py-2 text-[13px] font-bold text-ink"
          >
            + Nova rotina
          </button>
        </Panel>

        <Panel title="Os pets" icon="paw" color="var(--color-area-social)" help="os-pets">
          <div className="grid grid-cols-3 gap-y-4">
            {PET_ORDER.map((k) => (
              <div key={k} className="flex flex-col items-center gap-1.5 text-center">
                <Pet kind={k} size={64} onPoke={() => setStoryPet(k)} />
                <span className="text-[13px] font-semibold">{PETS[k].name}</span>
                <span className="font-mono text-[10.5px] tracking-wider uppercase" style={{ color: textColor(PETS[k].color) }}>
                  {PETS[k].label.split(' / ')[1]}
                </span>
                <button type="button" onClick={() => setStoryPet(k)} className="mt-0.5 flex items-center gap-1 rounded-full border border-line px-2.5 py-0.5 text-[11px] font-semibold text-muted hover:text-soft">
                  <Icon name="book" size={12} /> História
                </button>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Áreas e modelos lado a lado com a mesma altura; no celular, uma coluna. */}
      <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel
          title="Áreas da vida"
          help="areas"
          icon="grid"
          color="var(--color-noite)"
          className="min-w-0"
          action={
            <button
              ref={editAreasRef}
              type="button"
              onClick={() => setEditAreas(true)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line px-3.5 text-[13px] font-semibold text-soft hover:bg-panel-2"
            >
              <Icon name="edit" size={14} /> Editar
            </button>
          }
        >
          <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3">
            {areaCards.map(({ area: a, total, ok, pending }) => (
              <motion.div
                key={a.id}
                layout
                transition={{ type: 'spring', stiffness: 140, damping: 24 }}
                className="flex flex-col gap-3 rounded-xl border-2 bg-panel-2 p-3.5"
                // Com algo para fazer hoje: contorno e um fundo bem leve na cor da área.
                style={
                  pending
                    ? {
                        borderColor: a.color,
                        background: `color-mix(in srgb, ${a.color} 7%, var(--color-panel-2))`,
                        boxShadow: `0 0 18px color-mix(in srgb, ${a.color} 18%, transparent)`,
                      }
                    : { borderColor: 'transparent' }
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <strong className="flex min-w-0 items-center gap-2 text-sm [overflow-wrap:anywhere]">
                    <span className="h-2 w-2 shrink-0 rounded-[3px]" style={{ background: a.color }} />
                    {a.name}
                  </strong>
                  {total > 0 && pending === 0 && (
                    <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-ok text-ink" aria-label="Concluído hoje">
                      <Icon name="check" size={12} />
                    </span>
                  )}
                </div>
                <Bar pct={total ? ok / total : 0} color={a.color} />
                <span className="flex flex-wrap items-center justify-between gap-x-2 font-mono text-[11.5px] text-muted">
                  <span>{total ? `${ok}/${total} hoje` : 'nada hoje'}</span>
                  {pending > 0 && (
                    <span className="font-sans text-[12px] font-semibold text-soft">
                      {pending === 1 ? '1 para fazer' : `${pending} para fazer`}
                    </span>
                  )}
                </span>
              </motion.div>
            ))}
          </div>
        </Panel>

        <Panel title="Rotinas prontas" icon="box" color="var(--color-alerta)" className="min-w-0" help="modelos">
          <TemplatesPanel apply={applyTemplate} openTemplate={openTemplate} />
        </Panel>
      </div>
      <AreaManager open={editAreas} onClose={closeAreas} />
      <AnimatePresence>{storyPet && <PetStory key={storyPet} kind={storyPet} onClose={() => setStoryPet(null)} />}</AnimatePresence>
    </div>
  )
}
