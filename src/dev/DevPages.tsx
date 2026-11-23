import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Panel } from '../components/ui/ui'
import { Pet } from '../components/pets/Pet'
import { PetCorner } from '../components/pets/PetCorner'
import { TrophyCollection } from '../components/pets/TrophyCollection'
import { ALL_PETS, PETS, STATE_STYLE, textColor } from '../components/pets/pets'
import { PHASES } from '../lib/companion'
import type { PetPhase, PetState } from '../types'
import { usePetCommand, type PetCommand } from '../components/pets/usePetInteraction'

/** Páginas só do modo dev (rotas /dev/...). Em produção, as rotas e este arquivo não existem. */

const STATES = Object.keys(STATE_STYLE) as PetState[]

function DevHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <header className="flex flex-col gap-1">
      <p className="m-0 font-mono text-xs tracking-wider text-noite uppercase">
        <Link to="/dev" className="hover:underline">
          Modo dev
        </Link>
      </p>
      <h1 className="m-0 text-3xl font-extrabold tracking-tight">{title}</h1>
      <p className="m-0 text-muted">{sub}</p>
    </header>
  )
}

export function DevIndex() {
  const pages = [
    { to: '/dev/cantinho', name: 'Cantinho', text: 'O cantinho do pet em cada estado, com a coleção de troféus.' },
    { to: '/dev/pets', name: 'Pets e estados', text: 'Todas as espécies em todos os estados e fases.' },
    { to: '/bem-vindo?passo=1&completo=1', name: 'Onboarding', text: 'Os 3 passos do primeiro acesso, mesmo com rotinas.' },
    { to: '/uma-rota-que-nao-existe', name: 'Página 404', text: 'O pet confuso.' },
  ]
  return (
    <div className="flex flex-col gap-5">
      <DevHeader title="Páginas dev" sub="Atalhos para testar telas. O painel (Shift + D) continua valendo em todas." />
      <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
        {pages.map((p) => (
          <li key={p.to}>
            <Link to={p.to} className="flex h-full flex-col gap-1 rounded-2xl border border-line bg-panel p-4 hover:border-line-2">
              <strong>{p.name}</strong>
              <span className="text-sm text-muted">{p.text}</span>
              <span className="font-mono text-[11.5px] text-noite">{p.to}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function StatePicker({ value, onChange }: { value: PetState; onChange: (s: PetState) => void }) {
  return (
    <div role="group" aria-label="Estado do pet" className="flex flex-wrap gap-1.5">
      {STATES.map((s) => (
        <button
          key={s}
          type="button"
          aria-pressed={value === s}
          onClick={() => onChange(s)}
          className={`min-h-9 rounded-full border px-3 text-[13px] font-semibold ${value === s ? 'border-accent bg-accent/15 text-fg' : 'border-line text-muted hover:text-soft'}`}
        >
          {STATE_STYLE[s].title}
        </button>
      ))}
    </div>
  )
}

export function DevCantinho() {
  const [state, setState] = useState<PetState>('neutro')
  return (
    <div className="flex flex-col gap-5">
      <DevHeader title="Cantinho" sub="O mesmo cantinho do Início, com o estado escolhido aqui." />
      <StatePicker value={state} onChange={setState} />
      <Panel title="Cantinho do pet" icon="paw" color="var(--color-accent)">
        <PetCorner autoState={state} editable />
      </Panel>
      <Panel title="Coleção" icon="box" color="var(--color-alerta)">
        <TrophyCollection />
      </Panel>
    </div>
  )
}

export function DevPets() {
  const send = usePetCommand((s) => s.send)
  const [phase, setPhase] = useState<PetPhase>('jovem')
  const [sleeping, setSleeping] = useState(false)
  return (
    <div className="flex flex-col gap-5">
      <DevHeader title="Pets e estados" sub="Todos aqui são brincáveis. Os botões do painel (Shift + D → Brincadeiras do pet) disparam a reação em todos ao mesmo tempo." />
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ['special', 'Especial de cada espécie'],
            ['hop', 'Pulinho'],
            ['spin', 'Giro'],
            ['dizzy', 'Tonto'],
            ['pet', 'Carinho'],
            ['yawn', 'Bocejar'],
            ['look', 'Olhar para os lados'],
            ['blink2', 'Piscar duas vezes'],
          ] as [PetCommand, string][]
        ).map(([id, label]) => (
          <button key={id} type="button" onClick={() => send(id)} className="min-h-9 rounded-full border border-noite/40 px-3 text-[13px] font-semibold text-noite hover:bg-noite/10">
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {PHASES.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={phase === p.id}
            onClick={() => setPhase(p.id)}
            className={`min-h-9 rounded-full border px-3 text-[13px] font-semibold ${phase === p.id ? 'border-accent bg-accent/15 text-fg' : 'border-line text-muted hover:text-soft'}`}
          >
            {p.name}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={sleeping}
          onClick={() => setSleeping((s) => !s)}
          className={`min-h-9 rounded-full border px-3 text-[13px] font-semibold ${sleeping ? 'border-noite bg-noite/15 text-fg' : 'border-line text-muted hover:text-soft'}`}
        >
          Dormindo
        </button>
      </div>
      {ALL_PETS.map((k) => (
        <Panel key={k} title={PETS[k].name} icon="paw" color={PETS[k].color}>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-3">
            {STATES.map((s) => (
              <div key={s} className="flex flex-col items-center gap-1.5 rounded-xl bg-panel-2 p-3">
                <Pet kind={k} state={s} phase={phase} sleeping={sleeping} size={80} play />
                <span className="font-mono text-[11px] tracking-wider uppercase" style={{ color: textColor(STATE_STYLE[s].color) }}>
                  {STATE_STYLE[s].title}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      ))}
    </div>
  )
}
