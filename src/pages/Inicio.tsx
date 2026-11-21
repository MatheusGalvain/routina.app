import { useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useRotina } from '../store/useRotina'
import { getTodayItems } from '../lib/today'
import { dayKey, greeting } from '../lib/dates'
import { AREAS, WEEKDAYS } from '../data/areas'
import { TEMPLATES } from '../data/templates'
import { Bar, Icon, Logo, Panel, ProgressRing } from '../components/ui/ui'
import { Pet } from '../components/pets/Pet'
import { PETS, PET_ORDER } from '../components/pets/pets'
import { PetStory } from '../components/pets/PetStory'
import type { PetKind } from '../types'

const daysLabel = (days: number[]) =>
  days.length === 7 ? 'todo dia' : days.length === 0 ? 'nenhum dia' : days.map((d) => WEEKDAYS[d].long.slice(0, 3).toLowerCase()).join(' · ')

export function Inicio({ goToday, openRoutine }: { goToday: () => void; openRoutine: (id: string) => void }) {
  const now = new Date()
  const date = dayKey(now)
  const routines = useRotina((s) => s.routines)
  const dayLog = useRotina((s) => s.logs[date])
  const completedTasks = useRotina((s) => s.completedTasks)
  const createRoutine = useRotina((s) => s.createRoutine)
  const addTemplate = useRotina((s) => s.addTemplate)
  const [storyPet, setStoryPet] = useState<PetKind | null>(null)

  const items = useMemo(() => getTodayItems(routines, dayLog, completedTasks, now, date), [routines, dayLog, completedTasks, date])
  const done = items.filter((i) => i.done).length
  const next = items.find((i) => !i.done && !i.skipped)

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <Logo />
          <div className="flex flex-col gap-1">
            <h1 className="m-0 text-[44px] leading-none font-extrabold tracking-tight">
              rotina<span className="text-[#5AA7FF]">.app</span>
            </h1>
            <p className="m-0 text-muted">{greeting(now)}! Pronto para organizar o seu dia?</p>
          </div>
        </div>
        <button
          type="button"
          onClick={goToday}
          className="inline-flex items-center gap-2.5 rounded-full bg-foco-strong px-5 py-3.5 text-[15px] font-bold text-white shadow-[0_0_24px_rgba(30,136,255,.35)]"
        >
          <Icon name="play" size={14} /> Continuar de onde parei
        </button>
      </header>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5">
        <Panel title="Hoje" icon="trend">
          <div className="flex items-center gap-5">
            <ProgressRing pct={items.length ? done / items.length : 0}>{items.length ? Math.round((done / items.length) * 100) : 0}%</ProgressRing>
            <div className="flex flex-col gap-1.5">
              <strong className="text-lg">
                {done} de {items.length} blocos
              </strong>
              <span className="text-sm text-muted">{next ? `Próximo: ${next.block.name}` : items.length ? 'Tudo feito por hoje' : 'Nenhum bloco para hoje'}</span>
              {next && <span className="text-[13px] font-semibold text-[#5AA7FF]">{next.routine.name}</span>}
            </div>
          </div>
          <button type="button" onClick={goToday} className="mt-auto self-start rounded-full bg-foco-strong px-4 py-2 text-[13px] font-bold text-white">
            Abrir o dia
          </button>
        </Panel>

        <Panel title="Minhas rotinas" icon="calendar" color="#3EDC7E">
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
            className="mt-auto self-start rounded-full bg-ok px-4 py-2 text-[13px] font-bold text-[#06210F]"
          >
            + Nova rotina
          </button>
        </Panel>

        <Panel title="Rotinas prontas" icon="box" color="#FFB020">
          {TEMPLATES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                const id = addTemplate(t.key)
                if (id) openRoutine(id)
              }}
              className="flex flex-col gap-1 rounded-xl border border-[#4A3A12] bg-[#17140C] px-4 py-3.5 text-left"
            >
              <strong className="text-sm">{t.name}</strong>
              <span className="text-[12.5px] text-[#B5AC96]">{t.description}</span>
            </button>
          ))}
        </Panel>
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <Panel title="Áreas da vida" icon="grid" color="#A78BFA" className="min-w-0 flex-[999_1_640px]">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3">
            {AREAS.map((a) => {
              const list = items.filter((i) => i.block.areaId === a.id)
              const ok = list.filter((i) => i.done).length
              return (
                <div key={a.id} className="flex flex-col gap-3 rounded-xl bg-panel-2 p-3.5">
                  <div className="flex items-center justify-between">
                    <strong className="flex items-center gap-2 text-sm">
                      <span className="h-2 w-2 rounded-[3px]" style={{ background: a.color }} />
                      {a.name}
                    </strong>
                    {list.length > 0 && ok === list.length && (
                      <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-ok text-[#06210F]" aria-label="Concluído hoje">
                        <Icon name="check" size={12} />
                      </span>
                    )}
                  </div>
                  <Bar pct={list.length ? ok / list.length : 0} color={a.color} />
                  <span className="font-mono text-[11.5px] text-muted">{list.length ? `${ok}/${list.length} hoje` : 'nada hoje'}</span>
                </div>
              )
            })}
          </div>
        </Panel>

        <Panel title="Os pets" icon="paw" color="#FB7185" className="min-w-0 flex-[1_1_320px]">
          <div className="grid grid-cols-3 gap-y-4">
            {PET_ORDER.map((k) => (
              <div key={k} className="flex flex-col items-center gap-1.5 text-center">
                <Pet kind={k} size={64} onPoke={() => setStoryPet(k)} />
                <span className="text-[13px] font-semibold">{PETS[k].name}</span>
                <span className="font-mono text-[10.5px] tracking-wider uppercase" style={{ color: PETS[k].color === '#F1F3F6' ? '#C9CED8' : PETS[k].color }}>
                  {PETS[k].label.split(' / ')[1]}
                </span>
                <button type="button" onClick={() => setStoryPet(k)} className="mt-0.5 rounded-full border border-line px-2.5 py-0.5 text-[11px] font-semibold text-muted hover:text-soft">
                  📖 História
                </button>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <AnimatePresence>{storyPet && <PetStory key={storyPet} kind={storyPet} onClose={() => setStoryPet(null)} />}</AnimatePresence>
    </div>
  )
}
