import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useAreas, useRotina } from '../../store/useRotina'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { chooseFavorite } from '../../store/useCompanion'
import { setOnboardingDone } from '../../sync/session'
import { TEMPLATES } from '../../data/templates'
import { areaOf } from '../../data/areas'
import { dayKey } from '../../lib/dates'
import { Pet } from '../pets/Pet'
import { PETS, PET_ORDER } from '../pets/pets'
import { Icon } from '../ui/ui'
import type { BasePetKind, Block } from '../../types'

type OnboardingStep = 1 | 2 | 3

const PET_NAME_MAX = 24
/** O bloco da primeira vitória "do zero". Vai para Corpo (ou a primeira área, se Corpo foi excluída). */
function water(): Omit<Block, 'id'> {
  const areas = useRotina.getState().areas
  const areaId = areas.some((a) => a.id === 'corpo') ? 'corpo' : (areas[0]?.id ?? 'corpo')
  return { name: "Beber um copo d'água", type: 'habito', areaId, minutes: 1 }
}

/** Bloco mais fácil da rotina: hábito, depois tarefa, depois contador; entre eles, o mais curto. */
function easiestBlock(blocks: Block[]) {
  const weight = { habito: 0, tarefa: 1, contador: 2 } as const
  return [...blocks].sort((a, b) => weight[a.type] - weight[b.type] || (a.minutes ?? 99) - (b.minutes ?? 99))[0]
}

/** Barrinha "1 de 3". */
function Progress({ step }: { step: OnboardingStep }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1.5" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <span key={n} className={`h-1.5 w-8 rounded-full transition-colors ${n <= step ? 'bg-accent' : 'bg-line'}`} />
        ))}
      </div>
      <span className="font-mono text-xs text-muted">{step} de 3</span>
    </div>
  )
}

function StepAdopt({ onNext }: { onNext: () => void }) {
  const companion = useRotina((s) => s.companion)
  const setCompanionName = useRotina((s) => s.setCompanionName)
  const [kind, setKind] = useState<BasePetKind | null>(companion.kind && companion.kind !== 'coelho-cristal' ? companion.kind : null)
  const [name, setName] = useState(companion.name)

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault()
        if (!kind) return
        chooseFavorite(kind)
        setCompanionName(name.trim().slice(0, PET_NAME_MAX))
        onNext()
      }}
    >
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-3 text-sm text-muted">Escolha quem vai te acompanhar</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
          {PET_ORDER.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={`flex min-w-0 flex-col items-center gap-1 rounded-2xl border px-1 pt-3 pb-2.5 transition-colors ${
                kind === k ? 'border-accent bg-accent/15' : 'border-line bg-panel-2 hover:border-line-2'
              }`}
            >
              <Pet kind={k} state={kind === k ? 'concluido' : 'neutro'} size={64} interactive={false} />
              <span className="text-[13px] font-semibold">{PETS[k].name}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-muted">Que nome você quer dar? (opcional)</span>
        <input
          value={name}
          maxLength={PET_NAME_MAX}
          onChange={(e) => setName(e.target.value)}
          placeholder={kind ? PETS[kind].name : 'Ex.: Pipoca'}
          className="min-h-11 rounded-xl border border-line bg-ink px-3 text-soft placeholder:text-muted"
        />
      </label>

      <button type="submit" disabled={!kind} className="min-h-12 rounded-full bg-accent px-6 text-[15px] font-bold text-ink disabled:opacity-40 sm:self-start">
        Adotar {kind ? (name.trim() || PETS[kind].name) : ''}
      </button>
    </form>
  )
}

function StepStart({ onPicked }: { onPicked: (routineId: string) => void }) {
  const { addTemplate, createRoutine, addBlock } = useRotina.getState()
  const templates = useRotina((s) => s.templates)
  const [mode, setMode] = useState<'modelo' | null>(null)

  const option = 'flex min-h-11 flex-col gap-1 rounded-2xl border px-4 py-4 text-left transition-colors'
  const fromTemplate = (keyOrId: string) => {
    const id = addTemplate(keyOrId)
    if (id) onPicked(id)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          aria-expanded={mode === 'modelo'}
          onClick={() => setMode(mode === 'modelo' ? null : 'modelo')}
          className={`${option} ${mode === 'modelo' ? 'border-alerta bg-alerta/5' : 'border-line bg-panel-2 hover:border-line-2'}`}
        >
          <span className="flex items-center gap-2 font-bold">
            <Icon name="box" size={16} /> Usar um modelo
          </span>
          <span className="text-[13px] text-muted">Começa com uma rotina pronta. Dá para mudar tudo depois.</span>
        </button>
        <button
          type="button"
          onClick={() => {
            const id = createRoutine('Minha rotina')
            addBlock(id, water())
            onPicked(id)
          }}
          className={`${option} border-line bg-panel-2 hover:border-line-2`}
        >
          <span className="flex items-center gap-2 font-bold">
            <Icon name="plus" size={16} /> Montar do zero
          </span>
          <span className="text-[13px] text-muted">Uma rotina só sua, começando por um bloco bem simples.</span>
        </button>
      </div>

      {mode === 'modelo' && (
        <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Modelos">
          {templates.map((t) => (
            <li key={t.id}>
              <button type="button" onClick={() => fromTemplate(t.id)} className="flex w-full flex-col gap-0.5 rounded-xl border border-accent/25 bg-accent/5 px-4 py-3 text-left">
                <strong className="text-sm [overflow-wrap:anywhere]">{t.name}</strong>
                <span className="text-[12.5px] text-muted">
                  Seu modelo · {t.blocks.length} {t.blocks.length === 1 ? 'bloco' : 'blocos'}
                </span>
              </button>
            </li>
          ))}
          {TEMPLATES.map((t) => (
            <li key={t.key}>
              <button type="button" onClick={() => fromTemplate(t.key)} className="flex w-full flex-col gap-0.5 rounded-xl border border-alerta/30 bg-alerta/5 px-4 py-3 text-left">
                <strong className="text-sm">{t.name}</strong>
                <span className="text-[12.5px] text-muted">{t.description}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function StepFirstWin({ routineId, petKind, onDone }: { routineId: string | null; petKind: BasePetKind; onDone: () => void }) {
  const routine = useRotina((s) => s.routines.find((r) => r.id === routineId))
  const areas = useAreas()
  const [won, setWon] = useState(false)

  // Rotina sem blocos (ex.: modelo vazio): entra o copo d'água.
  useEffect(() => {
    if (routine && routine.blocks.length === 0) useRotina.getState().addBlock(routine.id, water())
  }, [routine?.id, routine?.blocks.length])

  const block = routine ? easiestBlock(routine.blocks) : undefined
  useEffect(() => {
    if (!won) return
    const t = window.setTimeout(onDone, 2200)
    return () => window.clearTimeout(t)
  }, [won])

  if (!block) return <p className="m-0 text-muted">Preparando o primeiro bloco…</p>
  const area = areaOf(areas, block.areaId)

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <Pet kind={petKind} state={won ? 'concluido' : 'foco'} size={120} play label={`${PETS[petKind].name}: toque, toque várias vezes ou segure para fazer carinho`} />
      <div className="flex w-full max-w-[420px] items-center gap-3 rounded-2xl border border-line bg-panel-2 px-4 py-3.5 text-left">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 ${won ? 'border-ok bg-ok text-ink' : 'border-line-strong text-transparent'}`} aria-hidden="true">
          <Icon name="check" size={18} />
        </span>
        <span className="flex min-w-0 flex-col">
          <strong className={`[overflow-wrap:anywhere] ${won ? 'text-muted line-through' : ''}`}>{block.name}</strong>
          <span className="font-mono text-[11.5px]" style={{ color: area.color }}>
            {area.name.toLowerCase()}
            {routine ? <span className="text-muted"> · {routine.name}</span> : null}
          </span>
        </span>
      </div>
      <p className="m-0 text-sm text-soft" aria-live="polite">
        {won ? 'Primeira vitória! Isso já acende uma estrela no nosso céu.' : 'Faz agora, que é rapidinho. Eu espero aqui.'}
      </p>
      {!won && (
        <button
          type="button"
          onClick={() => {
            useRotina.getState().toggleDone(dayKey(), block)
            setWon(true)
          }}
          className="inline-flex min-h-12 items-center gap-2 rounded-full bg-ok px-6 text-[15px] font-bold text-ink"
        >
          <Icon name="check" size={16} /> Marcar como feito
        </button>
      )}
    </div>
  )
}

const TITLES: Record<OnboardingStep, { title: string; sub: string }> = {
  1: { title: 'Adote seu pet', sub: 'Ele cresce junto com você e comemora cada bloco que você conclui.' },
  2: { title: 'Como você quer começar?', sub: 'Uma rotina é a sua lista do dia, na ordem que fizer sentido.' },
  3: { title: 'Sua primeira vitória', sub: 'Vamos marcar um bloco fácil agora mesmo.' },
}

const parseStep = (v: string | null): OnboardingStep => (v === '2' ? 2 : v === '3' ? 3 : 1)

/**
 * Rota /bem-vindo: onboarding de primeiro acesso, em tela cheia (sem o header do app).
 * O passo fica na URL (?passo=1|2|3, e &rotina=<id> no 3), então recarregar não perde o lugar.
 * &completo=1 (painel dev) passa pelos 3 passos mesmo se a pessoa já tem rotina.
 * "Pular por enquanto" em todos os passos; pulando ou concluindo, fica salvo no perfil e não volta sozinho.
 */
export function BemVindo() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const kind = useRotina((s) => s.companion.kind)
  const hasRoutines = useRotina((s) => s.routines.some((r) => !r.dev))
  const titleRef = useRef<HTMLHeadingElement>(null)

  const asked = parseStep(params.get('passo'))
  const routineId = params.get('rotina')
  const full = params.get('completo') === '1'
  // Sem pet, começa pelo passo 1; o passo 3 precisa da rotina escolhida no 2.
  const step: OnboardingStep = !kind ? 1 : asked === 3 && !routineId ? 2 : asked

  const goTo = (next: OnboardingStep, rotina?: string) => {
    const p = new URLSearchParams({ passo: String(next) })
    if (rotina) p.set('rotina', rotina)
    if (full) p.set('completo', '1')
    setParams(p)
  }

  useEffect(() => {
    titleRef.current?.focus()
  }, [step])

  const end = () => {
    setOnboardingDone()
    navigate('/', { replace: true })
  }
  const petKind: BasePetKind = kind && kind !== 'coelho-cristal' ? kind : 'coelho'
  const t = TITLES[step]

  return (
    <motion.div className="min-h-screen bg-ink" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <main className="mx-auto flex min-h-full w-full max-w-[640px] flex-col gap-6 px-4 pt-5 pb-10 sm:px-6 sm:pt-8">
        <div className="flex items-center justify-between gap-3">
          <Progress step={step} />
          <button type="button" onClick={end} className="min-h-11 rounded-full px-3 text-sm font-semibold text-muted hover:text-soft">
            Pular por enquanto
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            className="flex flex-col gap-6"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
          >
            {step === 1 && (
              // Quem dá as boas-vindas é o coelho, o mascote do Habbit Do.
              <div className="flex items-center gap-3">
                <Pet kind="coelho" state="concluido" size={72} label="Coelho dando boas-vindas" />
                <p className="relative m-0 rounded-2xl border border-line-2 bg-panel-2 px-4 py-3 text-sm text-soft">
                  Oi! Eu sou o Coelho e vou te ajudar a começar. Primeiro, escolha quem vai te acompanhar.
                </p>
              </div>
            )}
            <header className="flex flex-col gap-1.5">
              <h1 ref={titleRef} tabIndex={-1} className="m-0 text-[28px] leading-tight font-extrabold tracking-tight outline-none sm:text-[34px]">
                {t.title}
              </h1>
              <p className="m-0 text-muted">{t.sub}</p>
            </header>

            {step === 1 && <StepAdopt onNext={() => (hasRoutines && !full ? end() : goTo(2))} />}
            {step === 2 && <StepStart onPicked={(id) => goTo(3, id)} />}
            {step === 3 && <StepFirstWin routineId={routineId} petKind={petKind} onDone={end} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </motion.div>
  )
}
