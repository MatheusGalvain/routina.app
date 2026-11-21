import { useRotina } from '../store/useRotina'
import { useCompanionView } from '../store/useCompanion'
import { Bar, Icon, Panel } from '../components/ui/ui'
import { Pet } from '../components/pets/Pet'
import { PETS, PET_ORDER, SPECIES, textColor as light } from '../components/pets/pets'
import { PHASES, nextPhase, phaseIndex } from '../lib/companion'
import { ACCESSORIES, SLOT_NAMES } from '../data/accessories'
import { unlockStats } from '../store/useCompanion'

/** Aba "Pet": escolher o favorito, dar um nome e cuidar dos acessórios. */
export function Companheiro() {
  const companion = useRotina((s) => s.companion)
  const { setCompanionKind, setCompanionName } = useRotina.getState()
  const view = useCompanionView()

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="m-0 font-mono text-xs tracking-wider text-muted uppercase">Companheiro</p>
        <h1 className="m-0 mt-1 text-3xl font-extrabold tracking-tight">{companion.name || (view.kind ? PETS[view.kind].name : 'Seu pet')}</h1>
      </header>

      {view.kind && <PhaseCard />}

      <Panel title="Escolha seu favorito" icon="paw" color="#FB7185">
        <p className="m-0 text-sm text-muted">Ele vai te acompanhar em todos os estados do dia, mudando de cor e de expressão.</p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-3">
          {PET_ORDER.map((k) => {
            const selected = companion.kind === k
            return (
              <button
                key={k}
                type="button"
                aria-pressed={selected}
                onClick={() => setCompanionKind(selected ? null : k)}
                className="flex flex-col items-center gap-2 rounded-2xl border bg-panel-2 px-3 pt-3 pb-3.5 text-center transition-colors"
                style={{ borderColor: selected ? light(PETS[k].color) : 'var(--color-line)', background: selected ? `${PETS[k].color}14` : undefined }}
              >
                <Pet kind={k} size={72} interactive={false} />
                <span className="text-sm font-semibold">{PETS[k].name}</span>
                <span className="flex items-center gap-1 font-mono text-[10.5px] tracking-wider uppercase" style={{ color: selected ? light(PETS[k].color) : 'var(--color-muted)' }}>
                  {selected ? (
                    <>
                      <Icon name="check" size={12} /> Favorito
                    </>
                  ) : (
                    'Escolher'
                  )}
                </span>
              </button>
            )
          })}
        </div>

        <label className="flex max-w-[360px] flex-col gap-1.5">
          <span className="text-sm text-muted">Nome do seu pet</span>
          <input
            value={companion.name}
            onChange={(e) => setCompanionName(e.target.value.slice(0, 24))}
            placeholder={view.kind ? `Ex.: ${PETS[view.kind].name}` : 'Escolha um pet primeiro'}
            disabled={!companion.kind}
            className="rounded-xl border border-line bg-[#0B0E15] px-3 py-2.5 text-soft placeholder:text-[#6F788A] disabled:opacity-50"
          />
        </label>
      </Panel>

      <Accessories />
    </div>
  )
}

/** Fase atual, dias ativos e quanto falta para a próxima. */
function PhaseCard() {
  const view = useCompanionView()
  const kind = view.kind!
  const next = nextPhase(view.activeDays)
  const current = PHASES[phaseIndex(view.phase)]
  const prevMin = current.min
  const pct = next ? Math.min(1, Math.max(0, (view.activeDays - prevMin) / (next.min - prevMin))) : 1

  return (
    <section className="flex flex-wrap items-center gap-6 rounded-[22px] border border-line bg-panel p-6">
      <div className="relative grid h-[170px] w-[170px] shrink-0 place-items-center">
        <div className="absolute h-[160px] w-[160px] rounded-full border border-[#F1F3F622]" />
        <Pet kind={kind} state={view.forcedState && view.forcedState !== 'dormindo' ? view.forcedState : 'neutro'} phase={view.phase} sleeping={view.sleeping} accessories={view.accessories} size={130} />
      </div>
      <div className="flex min-w-[220px] flex-1 flex-col gap-3">
        <div className="flex items-center gap-2" role="list" aria-label="Fases">
          {PHASES.map((p, i) => {
            const reached = i <= phaseIndex(view.phase)
            return (
              <span
                key={p.id}
                role="listitem"
                aria-current={p.id === view.phase ? 'step' : undefined}
                className="rounded-full border px-3 py-1 font-mono text-[11px] tracking-wider uppercase"
                style={{ borderColor: reached ? '#22C55E66' : 'var(--color-line)', color: reached ? '#4ADE80' : 'var(--color-muted)', background: p.id === view.phase ? '#22C55E1A' : undefined }}
              >
                {p.name}
              </span>
            )
          })}
        </div>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <strong className="text-2xl font-extrabold">{view.activeDays} {view.activeDays === 1 ? 'dia ativo' : 'dias ativos'}</strong>
          <span className="text-sm text-muted">dias com pelo menos metade dos blocos feitos</span>
        </div>
        <Bar pct={pct} color="#22C55E" />
        <p className="m-0 text-sm text-soft">
          {next
            ? `Faltam ${next.remaining} ${next.remaining === 1 ? 'dia ativo' : 'dias ativos'} para virar ${next.name.toLowerCase()}.`
            : `Fase máxima! ${SPECIES[kind].name} adulto ganhou ${SPECIES[kind].adultDetail}.`}
        </p>
        {view.sleeping && <p className="m-0 text-sm text-[#C4B5FD]">Está tirando um cochilo. Conclua um bloco hoje e ele acorda.</p>}
        <p className="m-0 text-[12.5px] text-muted">Os dias ativos só aumentam: seu pet nunca volta de fase.</p>
      </div>
    </section>
  )
}

/** Grade de acessórios: prévia no seu pet, cadeado e dica nos bloqueados, equipar ou tirar. */
function Accessories() {
  const view = useCompanionView()
  const equipped = useRotina((s) => s.companion.equipped)
  const equip = useRotina((s) => s.equip)
  const kind = view.kind ?? 'gatinho'
  const u = unlockStats(view.stats, view.activeDays, !!view.kind)

  return (
    <Panel title="Acessórios" icon="sparkle" color="#FFB020">
      <p className="m-0 text-sm text-muted">
        {view.kind ? 'Um item por parte do corpo. Novos itens aparecem conforme você cuida da rotina.' : 'Escolha um favorito para ele poder usar os acessórios.'}
      </p>
      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 p-0">
        {ACCESSORIES.map((a) => {
          const unlocked = view.unlockedIds.includes(a.id)
          const isOn = equipped[a.slot] === a.id
          const [cur, goal] = a.progress?.(u) ?? [0, 0]
          return (
            <li
              key={a.id}
              className="flex flex-col items-center gap-2 rounded-2xl border bg-panel-2 px-3 pt-3 pb-3.5 text-center"
              style={{ borderColor: isOn ? '#FFB02088' : 'var(--color-line)' }}
            >
              <div className={`relative ${unlocked ? '' : 'opacity-40 grayscale'}`}>
                <Pet kind={kind} state="neutro" accessories={[a.id]} size={78} interactive={false} float={false} />
                {!unlocked && (
                  <span className="absolute right-0 bottom-0 grid h-7 w-7 place-items-center rounded-full border border-line bg-panel text-soft">
                    <Icon name="lock" size={14} />
                  </span>
                )}
              </div>
              <strong className="text-sm">{a.name}</strong>
              <span className="font-mono text-[10.5px] tracking-wider text-muted uppercase">{SLOT_NAMES[a.slot]}</span>
              {unlocked ? (
                <button
                  type="button"
                  disabled={!view.kind}
                  aria-pressed={isOn}
                  onClick={() => equip(a.slot, isOn ? null : a.id)}
                  className={`mt-auto rounded-full px-3.5 py-1.5 text-[12.5px] font-bold disabled:opacity-40 ${isOn ? 'border border-[#FFB02088] text-[#FFC857]' : 'bg-alerta text-[#2A1A00]'}`}
                >
                  {isOn ? 'Tirar' : 'Usar'}
                </button>
              ) : (
                <span className="mt-auto flex flex-col items-center gap-1 text-[12px] text-soft">
                  <span className="flex items-center gap-1">
                    <Icon name="lock" size={12} /> {a.hint}
                  </span>
                  {goal > 0 && (
                    <span className="font-mono text-[11px] text-muted">
                      {Math.min(cur, goal)}/{goal}
                    </span>
                  )}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
