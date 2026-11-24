import { useRotina } from '../store/useRotina'
import { useDevOverrides } from '../store/useDevOverrides'
import { useCompanionView } from '../store/useCompanion'
import { Bar, Icon, Panel } from '../components/ui/ui'
import { Pet } from '../components/pets/Pet'
import { ALL_PETS, PETS, SECRET_PET, SPECIES, textColor as light } from '../components/pets/pets'
import { PHASES, daysToPhase, nextPhase, phaseIndex, phasesOf } from '../lib/companion'
import { Switch } from '../components/ui/Switch'
import type { PetAppearance } from '../types'
import { ACCESSORIES, EVENT_ACCESSORY_LIST, SLOT_NAMES } from '../data/accessories'
import { EVENT_ACCESSORIES, EVENT_BY_ID, eventLabel, isEventActive, ownedAt } from '../data/events'
import { eventCtx, useEventDay, useEventItemsView } from '../store/useEvents'
import { EventCollection, EventTag, hasEventsToShow } from '../components/pets/EventCollection'
import { allStoriesRead, chooseFavorite, unlockStats } from '../store/useCompanion'
import { PetCorner } from '../components/pets/PetCorner'
import { TrophyCollection } from '../components/pets/TrophyCollection'
import { SceneCollection } from '../components/pets/SceneCollection'
import { useId, useMemo, useState, type KeyboardEvent } from 'react'
import { SECRET_DAYS, SECRET_MIN_AREAS, secretProgress } from '../lib/unlock'

/** Aba "Pet": escolher o favorito, dar um nome e cuidar dos acessórios. */
export function Companheiro() {
  const companion = useRotina((s) => s.companion)
  const { setCompanionName } = useRotina.getState()
  const view = useCompanionView()

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="m-0 font-mono text-xs tracking-wider text-muted uppercase">Companheiro</p>
        <h1 className="m-0 mt-1 text-3xl font-extrabold tracking-tight">{companion.name || (view.kind ? PETS[view.kind].name : 'Seu pet')}</h1>
      </header>

      <Panel title="Escolha seu favorito" icon="paw" color="var(--color-area-social)" help="favorito">
        <label className="flex max-w-[360px] flex-col gap-1.5">
          <span className="text-sm text-muted">Nome do seu pet</span>
          <input
            value={companion.name}
            onChange={(e) => setCompanionName(e.target.value.slice(0, 24))}
            placeholder={view.kind ? `Ex.: ${PETS[view.kind].name}` : 'Escolha um pet primeiro'}
            disabled={!companion.kind}
            className="rounded-xl border border-line bg-ink px-3 py-2.5 text-soft placeholder:text-muted disabled:opacity-50"
          />
        </label>
        <p className="m-0 text-sm text-muted">Ele vai te acompanhar em todos os estados do dia, mudando de cor e de expressão.</p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-3">
          {ALL_PETS.map((k) => {
            if (k === SECRET_PET && !view.secretUnlocked) return <UnknownPet key={k} />
            // O que aparece na tela (inclui a espécie forçada pelo painel dev).
            const selected = view.kind === k
            return (
              <button
                key={k}
                type="button"
                aria-pressed={selected}
                onClick={() => chooseFavorite(selected ? null : k)}
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
      </Panel>

      {view.kind && <PhaseCard />}
      {view.kind && <AppearancePicker />}

      <div id="cantinho" className="scroll-mt-4">
        <Panel title="Cantinho" icon="sparkle" color="var(--color-noite)" help="cantinho">
          <PetCorner autoState="neutro" legend={false} editable />
        </Panel>
      </div>

      <div id="colecao" className="scroll-mt-4">
      <Panel title="Coleção" icon="box" color="var(--color-alerta)" help="colecao">
        <CollectionTabs />
      </Panel>
      </div>

      <Accessories />
    </div>
  )
}

/**
 * Alguém que ainda não apareceu: a silhueta, "???" e um botão de dica que abre como chegar
 * (com o progresso dos dois caminhos e uma pista do caminho secreto da lua).
 */
function UnknownPet() {
  const [open, setOpen] = useState(false)
  const logs = useRotina((s) => s.logs)
  const areas = useRotina((s) => s.areas)
  const p = useMemo(() => secretProgress(logs, areas.map((a) => a.id)), [logs, areas])
  const hintId = useId()

  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line-2 bg-panel-2 px-3 pt-3 pb-3.5 text-center">
      <span role="img" aria-label="Pet secreto, ainda escondido">
        <Pet kind={SECRET_PET} size={72} interactive={false} float={false} silhouette />
      </span>
      <span className="text-sm font-semibold text-muted">???</span>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={hintId}
        onClick={() => setOpen(!open)}
        className="inline-flex min-h-8 items-center gap-1 rounded-full border border-noite/35 bg-noite/10 px-2.5 font-mono text-[10.5px] tracking-wider text-noite uppercase"
      >
        <Icon name="sparkle" size={12} /> {open ? 'Fechar dica' : 'Como chegar'}
      </button>
      {open && (
        <div id={hintId} className="flex w-full flex-col gap-2.5 pt-1 text-left text-[12px] leading-snug text-soft">
          <p className="m-0 text-muted">Ele aparece por um destes caminhos:</p>
          <div className="flex flex-col gap-1">
            <span>
              {SECRET_DAYS} dias ativos <span className="font-mono text-muted">({p.days}/{SECRET_DAYS})</span>
            </span>
            <Bar pct={p.days / SECRET_DAYS} color="var(--color-noite)" label={`${p.days} de ${SECRET_DAYS} dias ativos`} />
          </div>
          <div className="flex flex-col gap-1">
            <span>
              Todas as suas áreas numa mesma semana{' '}
              <span className="font-mono text-muted">
                ({p.bestAreas}/{p.areasTotal})
              </span>
            </span>
            {p.enoughAreas ? (
              <Bar pct={p.areasTotal ? p.bestAreas / p.areasTotal : 0} color="var(--color-noite)" label={`${p.bestAreas} de ${p.areasTotal} áreas numa semana`} />
            ) : (
              <span className="text-muted">Vale a partir de {SECRET_MIN_AREAS} áreas da vida (você tem {p.areasTotal}).</span>
            )}
          </div>
          <p className="m-0 text-muted italic">Dizem que, nas noites de lua cheia, algo brilha no céu do cantinho…</p>
        </div>
      )}
    </div>
  )
}

/**
 * Progresso: a fase CONQUISTADA (pelos dias ativos, nunca regride) e quanto falta para a próxima.
 * O pet aparece com a aparência escolhida (ver AppearancePicker).
 */
function PhaseCard() {
  const view = useCompanionView()
  const kind = view.kind!
  // Cada espécie cresce no seu ritmo (src/data/pets.ts). Se a regra mudou e a fase guardada é maior,
  // a barra começa do dia em que a fase atual começa pela regra nova (sem regredir).
  const steps = phasesOf(kind)
  const next = nextPhase(kind, view.activeDays, view.conqueredPhase)
  const current = steps[phaseIndex(view.conqueredPhase)]
  const prevMin = Math.min(current.min, view.activeDays)
  const pct = next ? Math.min(1, Math.max(0, (view.activeDays - prevMin) / (next.min - prevMin))) : 1

  return (
    <section className="flex flex-wrap items-center gap-6 rounded-[22px] border border-line bg-panel p-6">
      <div className="relative grid h-[170px] w-[170px] shrink-0 place-items-center">
        <div className="absolute h-[160px] w-[160px] rounded-full border border-fg/15" />
        <Pet kind={kind} state={view.forcedState && view.forcedState !== 'dormindo' ? view.forcedState : 'neutro'} phase={view.phase} adultDetail={view.adultDetail} sleeping={view.sleeping} accessories={view.accessories} size={130} play />
      </div>
      <div className="flex min-w-[220px] flex-1 flex-col gap-3">
        <div className="flex items-center gap-2" role="list" aria-label="Fases">
          {PHASES.map((p, i) => {
            const reached = i <= phaseIndex(view.conqueredPhase)
            return (
              <span
                key={p.id}
                role="listitem"
                aria-current={p.id === view.conqueredPhase ? 'step' : undefined}
                className="rounded-full border px-3 py-1 font-mono text-[11px] tracking-wider uppercase"
                style={{ borderColor: reached ? 'color-mix(in srgb, var(--color-ok) 40%, transparent)' : 'var(--color-line)', color: reached ? 'var(--color-ok)' : 'var(--color-muted)', background: p.id === view.conqueredPhase ? 'color-mix(in srgb, var(--color-ok) 10%, transparent)' : undefined }}
              >
                {p.name}
              </span>
            )
          })}
        </div>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <strong className="text-2xl font-extrabold">
            {current.name} · {view.activeDays} {view.activeDays === 1 ? 'dia ativo' : 'dias ativos'}
          </strong>
          <span className="text-sm text-muted">dias com pelo menos metade dos blocos feitos</span>
        </div>
        <Bar pct={pct} color="var(--color-ok)" />
        <p className="m-0 text-sm text-soft">
          {next
            ? `Faltam ${next.remaining} ${next.remaining === 1 ? 'dia ativo' : 'dias ativos'} para virar ${next.name.toLowerCase()}.`
            : `Fase máxima! ${SPECIES[kind].name} adulto ganhou ${SPECIES[kind].adultDetail}.`}
          {next && ` ${SPECIES[kind].name} vira jovem com ${steps[1].min} e adulto com ${steps[2].min} dias ativos.`}
          {view.phase !== view.conqueredPhase && ` Aparência escolhida: ${PHASES[phaseIndex(view.phase)].name.toLowerCase()}.`}
        </p>
        {view.sleeping && <p className="m-0 text-sm text-noite">Está tirando um cochilo. Conclua um bloco hoje e ele acorda.</p>}
        <p className="m-0 text-[12.5px] text-muted">Os dias ativos só aumentam: a fase conquistada nunca volta. A aparência você escolhe logo abaixo.</p>
      </div>
    </section>
  )
}

const APPEARANCE_HINT: Record<PetAppearance, string> = {
  auto: 'Muda sozinho a cada fase nova.',
  filhote: 'Pequenininho, de olhos grandes.',
  jovem: 'O tamanho de sempre.',
  adulto: 'Crescido de vez.',
}

const daysText = (n: number, word = 'dia') => `${n} ${n === 1 ? word : `${word}s`}`

/**
 * Aparência: qualquer fase já conquistada (ou "Acompanhar a evolução"). As outras aparecem em
 * silhueta com quanto falta. O detalhe de adulto vira um enfeite, depois de conquistar a fase adulto.
 * A fase forçada pelo painel dev continua valendo por cima da escolha.
 */
function AppearancePicker() {
  const view = useCompanionView()
  const kind = view.kind!
  const { setAppearance, setShowAdultDetail } = useRotina.getState()
  const conquered = phaseIndex(view.conqueredPhase)
  const adultReached = view.conqueredPhase === 'adulto'
  const detail = SPECIES[kind].adultDetail
  const card = (on: boolean) =>
    `flex min-w-0 flex-col items-center gap-1.5 rounded-2xl border-2 px-2 pt-3 pb-3 text-center transition-colors ${on ? 'border-accent bg-accent/10' : 'border-line bg-panel-2 hover:border-line-2'}`
  const autoOn = view.appearance === 'auto'
  const devPhase = useDevOverrides((s) => s.phase)

  return (
    <div id="aparencia" className="scroll-mt-4">
      <Panel title="Aparência" icon="sparkle" color="var(--color-noite)">
        <p className="m-0 text-sm text-muted">Escolha como {view.name || SPECIES[kind].name} aparece em todo o app. As fases conquistadas ficam liberadas para sempre.</p>
        {devPhase && (
          <p role="status" className="m-0 rounded-xl border border-noite/40 bg-noite/10 px-3 py-2 text-[13px] text-noite">
            O painel dev está forçando a fase {PHASES[phaseIndex(devPhase)].name.toLowerCase()}, então a escolha daqui não aparece. Volte a "Fase do pet" para Auto no painel (Shift + D).
          </p>
        )}
        <div role="radiogroup" aria-label="Aparência do pet" className="flex flex-col gap-3">
          <button
            type="button"
            role="radio"
            aria-checked={autoOn}
            onClick={() => setAppearance('auto')}
            className={`flex min-h-11 items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-colors ${autoOn ? 'border-accent bg-accent/10' : 'border-line bg-panel-2 hover:border-line-2'}`}
          >
            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${autoOn ? 'border-accent' : 'border-line-strong'}`} aria-hidden="true">
              {autoOn && <span className="h-2.5 w-2.5 rounded-full bg-accent" />}
            </span>
            <span className="flex min-w-0 flex-col">
              <strong className="text-sm">Acompanhar a evolução</strong>
              <span className="text-[12.5px] text-muted">
                {APPEARANCE_HINT.auto} Hoje: {PHASES[conquered].name.toLowerCase()}.
              </span>
            </span>
          </button>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {PHASES.map((p, i) => {
              const unlocked = i <= conquered
              const on = view.appearance === p.id
              const left = daysToPhase(kind, p.id, view.activeDays, view.conqueredPhase)
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={!unlocked}
                  aria-label={unlocked ? p.name : `${p.name}: faltam ${daysText(left, 'dia ativo').replace('dia ativos', 'dias ativos')}`}
                  onClick={() => setAppearance(p.id)}
                  className={`${card(on)} disabled:cursor-not-allowed disabled:hover:border-line`}
                >
                  <Pet
                    kind={kind}
                    state="neutro"
                    phase={p.id}
                    adultDetail={view.adultDetail}
                    accessories={view.accessories}
                    size={84}
                    interactive={false}
                    float={unlocked}
                    silhouette={!unlocked}
                  />
                  <strong className={`text-[13px] ${unlocked ? '' : 'text-muted'}`}>{p.name}</strong>
                  <span className="text-[11.5px] leading-tight text-muted">{unlocked ? APPEARANCE_HINT[p.id] : `faltam ${daysText(left)}`}</span>
                </button>
              )
            })}
          </div>
        </div>
        <div className="border-t border-line pt-4">
          <Switch
            id="detalhe-adulto"
            label="Mostrar detalhe de adulto"
            hint={
              adultReached
                ? `${detail[0].toUpperCase()}${detail.slice(1)}, em qualquer aparência.`
                : `Liberado na fase adulto (faltam ${daysText(daysToPhase(kind, 'adulto', view.activeDays, view.conqueredPhase))} ativos): ${detail}.`
            }
            checked={adultReached && view.showAdultDetail}
            disabled={!adultReached}
            onChange={setShowAdultDetail}
          />
        </div>
      </Panel>
    </div>
  )
}

/** Grade de acessórios: prévia no seu pet, cadeado e dica nos bloqueados, equipar ou tirar. */
function Accessories() {
  const view = useCompanionView()
  const equipped = useRotina((s) => s.companion.equipped)
  const equip = useRotina((s) => s.equip)
  const kind = view.kind ?? 'coelho'
  const phases = useRotina((s) => s.petProgress.phases)
  const reads = useRotina((s) => s.storyReads)
  const u = unlockStats(view.stats, view.activeDays, !!view.kind, view.kind, phases, allStoriesRead(reads))
  // Acessórios de evento: aparecem se conquistados, ou (bloqueados) enquanto o evento acontece.
  const day = useEventDay()
  const eventMap = useEventItemsView()
  const logs = useRotina((s) => s.logs)
  const eventList = EVENT_ACCESSORY_LIST.filter((a) => {
    const e = EVENT_BY_ID[a.event!]
    return !!e && (!!ownedAt(eventMap, e.id, a.id) || isEventActive(e, day) || view.unlockedIds.includes(a.id))
  })

  return (
    <Panel title="Acessórios" icon="sparkle" color="var(--color-alerta)" help="acessorios">
      <p className="m-0 text-sm text-muted">
        {view.kind ? 'Um item por parte do corpo. Novos itens aparecem conforme você cuida da rotina.' : 'Escolha um favorito para ele poder usar os acessórios.'}
      </p>
      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 p-0">
        {[...ACCESSORIES, ...eventList].map((a) => {
          const unlocked = view.unlockedIds.includes(a.id)
          const isOn = equipped[a.slot] === a.id
          const ev = a.event ? EVENT_BY_ID[a.event] : null
          const evDef = ev ? EVENT_ACCESSORIES.find((x) => x.id === a.id) : null
          const [cur, goal] = ev && evDef ? evDef.progress(eventCtx(logs, ev, day)) : (a.progress?.(u) ?? [0, 0])
          return (
            <li
              key={a.id}
              className="flex flex-col items-center gap-2 rounded-2xl border bg-panel-2 px-3 pt-3 pb-3.5 text-center"
              style={{ borderColor: isOn ? 'color-mix(in srgb, var(--color-alerta) 55%, transparent)' : 'var(--color-line)' }}
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
              {ev && <EventTag label={eventLabel(ev)} color={ev.color} />}
              {unlocked ? (
                <button
                  type="button"
                  disabled={!view.kind}
                  aria-pressed={isOn}
                  onClick={() => equip(a.slot, isOn ? null : a.id)}
                  className={`mt-auto rounded-full px-3.5 py-1.5 text-[12.5px] font-bold disabled:opacity-40 ${isOn ? 'border border-alerta/55 text-alerta' : 'bg-alerta text-ink'}`}
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

type CollectionTab = 'trofeus' | 'cenarios' | 'eventos'
const COLLECTION_TABS: { id: CollectionTab; label: string }[] = [
  { id: 'trofeus', label: 'Troféus' },
  { id: 'cenarios', label: 'Cenários' },
  { id: 'eventos', label: 'Eventos' },
]

/** Coleção em abas (role tablist; setas trocam de aba): troféus e itens de cenário. */
function CollectionTabs() {
  const [tab, setTab] = useState<CollectionTab>('trofeus')
  // A aba Eventos só aparece com evento acontecendo ou algum item de evento conquistado.
  const day = useEventDay()
  const eventMap = useEventItemsView()
  const tabs = COLLECTION_TABS.filter((t) => t.id !== 'eventos' || hasEventsToShow(eventMap, day))
  const current = tabs.some((t) => t.id === tab) ? tab : 'trofeus'
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const i = tabs.findIndex((t) => t.id === current)
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length].id
    setTab(next)
    document.getElementById(`colecao-aba-${next}`)?.focus()
  }
  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Coleção" className="flex gap-1 self-start rounded-full border border-line bg-ink p-1" onKeyDown={onKey}>
        {tabs.map((t) => (
          <button
            key={t.id}
            id={`colecao-aba-${t.id}`}
            type="button"
            role="tab"
            aria-selected={current === t.id}
            aria-controls="colecao-painel"
            tabIndex={current === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            className={`min-h-10 rounded-full px-4 text-[13px] font-semibold ${current === t.id ? 'bg-accent text-ink' : 'text-muted hover:text-soft'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div id="colecao-painel" role="tabpanel" aria-labelledby={`colecao-aba-${current}`} className="flex flex-col gap-3">
        {current === 'eventos' ? (
          <>
            <p className="m-0 text-sm text-muted">Itens de época. O que você conquista durante um evento fica para sempre, com o nome do evento.</p>
            <EventCollection />
          </>
        ) : current === 'trofeus' ? (
          <>
            <p className="m-0 text-sm text-muted">Cada troféu tem 4 níveis. Os que você conquista ficam para sempre, e você escolhe quais expor no cantinho.</p>
            <TrophyCollection />
          </>
        ) : (
          <>
            <p className="m-0 text-sm text-muted">
              Cada cenário tem 6 itens. Os de área chegam com 10 dias cuidando daquela área; você coloca no cantinho em "Editar cantinho".
            </p>
            <SceneCollection />
          </>
        )}
      </div>
    </div>
  )
}
