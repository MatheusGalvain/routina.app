import { useRotina } from '../store/useRotina'
import { useDevOverrides } from '../store/useDevOverrides'
import { useCompanionView } from '../store/useCompanion'
import { Bar, Icon, Panel } from '../components/ui/ui'
import { Pet } from '../components/pets/Pet'
import { ALL_PETS, PETS, SECRET_PET, SPECIES, textColor as light } from '../components/pets/pets'
import { PHASES, daysToPhase, nextPhase, phaseIndex } from '../lib/companion'
import { Switch } from '../components/ui/Switch'
import type { PetAppearance } from '../types'
import { ACCESSORIES, SLOT_NAMES } from '../data/accessories'
import { chooseFavorite, unlockStats } from '../store/useCompanion'
import { PetCorner } from '../components/pets/PetCorner'
import { TrophyCollection } from '../components/pets/TrophyCollection'
import { SceneCollection } from '../components/pets/SceneCollection'
import { useState, type KeyboardEvent } from 'react'

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

/** Alguém que ainda não apareceu: só a silhueta e "???". Sem nome e sem dica. */
function UnknownPet() {
  return (
    <div role="img" aria-label="???" className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-panel-2 px-3 pt-3 pb-3.5 text-center">
      <Pet kind={SECRET_PET} size={72} interactive={false} float={false} silhouette />
      <span className="text-sm font-semibold text-muted">???</span>
      {/* Mantém a mesma altura dos outros cartões. */}
      <span aria-hidden="true" className="invisible font-mono text-[10.5px] tracking-wider uppercase">
        ?
      </span>
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
  const next = nextPhase(view.activeDays)
  const current = PHASES[phaseIndex(view.conqueredPhase)]
  const prevMin = current.min
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
              const left = daysToPhase(p.id, view.activeDays)
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
                : `Liberado na fase adulto (faltam ${daysText(daysToPhase('adulto', view.activeDays))} ativos): ${detail}.`
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
  const kind = view.kind ?? 'gatinho'
  const u = unlockStats(view.stats, view.activeDays, !!view.kind)

  return (
    <Panel title="Acessórios" icon="sparkle" color="var(--color-alerta)" help="acessorios">
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

type CollectionTab = 'trofeus' | 'cenarios'
const COLLECTION_TABS: { id: CollectionTab; label: string }[] = [
  { id: 'trofeus', label: 'Troféus' },
  { id: 'cenarios', label: 'Cenários' },
]

/** Coleção em abas (role tablist; setas trocam de aba): troféus e itens de cenário. */
function CollectionTabs() {
  const [tab, setTab] = useState<CollectionTab>('trofeus')
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const next = tab === 'trofeus' ? 'cenarios' : 'trofeus'
    setTab(next)
    document.getElementById(`colecao-aba-${next}`)?.focus()
  }
  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Coleção" className="flex gap-1 self-start rounded-full border border-line bg-ink p-1" onKeyDown={onKey}>
        {COLLECTION_TABS.map((t) => (
          <button
            key={t.id}
            id={`colecao-aba-${t.id}`}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls="colecao-painel"
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            className={`min-h-10 rounded-full px-4 text-[13px] font-semibold ${tab === t.id ? 'bg-accent text-ink' : 'text-muted hover:text-soft'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div id="colecao-painel" role="tabpanel" aria-labelledby={`colecao-aba-${tab}`} className="flex flex-col gap-3">
        {tab === 'trofeus' ? (
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
