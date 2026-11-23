import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAreas, useRotina } from '../store/useRotina'
import { Link, useNavigate } from 'react-router-dom'
import { usePetCommand, type PetCommand } from '../components/pets/usePetInteraction'
import { reloadFromServer } from '../sync/session'
import { flushNow } from '../sync/outbox'
import { useDevOverrides, type ForcedState } from '../store/useDevOverrides'
import { usePetEvents } from '../store/usePetEvents'
import { useStats } from '../store/useCompanion'
import { ACCESSORIES } from '../data/accessories'
import { ALL_PETS, PETS } from '../components/pets/pets'
import { PHASES, phaseFor } from '../lib/companion'
import { dayKey } from '../lib/dates'
import { Icon } from '../components/ui/ui'
import { APP_KEY } from '../lib/storageKeys'
import { TIERS, TIER_LIST, TROPHIES, trophyTitle, type TrophyId, type TrophyTier } from '../data/trophies'
import { EMPTY_LAYOUT, EMPTY_LAYOUTS, tiersOf } from '../lib/corner'
import type { CornerLayout, SceneItemMap, TrophyMap } from '../types'
import { ITEM_BY_ID, SCENES, SCENE_ITEMS, type SceneItemId } from '../data/scenes'
import type { AreaId } from '../types'
import { clearDev, simulateActiveDays, simulateArea, simulateIdle, simulateStreak, testRoutine } from './simulate'

const STATES: { id: ForcedState; label: string }[] = [
  { id: 'neutro', label: 'Neutro' },
  { id: 'foco', label: 'Foco' },
  { id: 'concluido', label: 'Concluído' },
  { id: 'atencao', label: 'Atenção' },
  { id: 'pulado', label: 'Pulado' },
  { id: 'descanso', label: 'Descanso' },
  { id: 'dormindo', label: 'Dormindo' },
]

/**
 * As simulações ficam só neste aparelho: tudo leva `dev: true` e a sincronização ignora.
 * Os dados reais continuam na conta, então "limpar" é recarregar da conta.
 */
async function discardSimulation(onStatus: (s: string) => void) {
  try {
    await reloadFromServer()
    onStatus('Dados simulados removidos. Recarregado da sua conta.')
  } catch {
    // Sem conexão: limpa localmente e o servidor nunca soube da simulação.
    const { logs, routines } = useRotina.getState()
    useRotina.setState({ logs: clearDev(logs), routines: routines.filter((r) => !r.dev) })
    onStatus('Sem conexão: simulação removida deste aparelho.')
  }
}

/** Garante rotinas com blocos (e com a área pedida); senão cria a rotina de teste. */
function ensureRoutines(area?: AreaId) {
  const { routines } = useRotina.getState()
  const blocks = routines.flatMap((r) => r.blocks)
  if (blocks.length && (!area || blocks.some((b) => b.areaId === area))) return routines
  const next = [...routines, testRoutine(useRotina.getState().areas)]
  useRotina.setState({ routines: next })
  return next
}

/**
 * Painel de desenvolvimento: simula histórico e força o que aparece na tela.
 * Só é carregado com `import.meta.env.DEV` (import dinâmico no App).
 */
export default function DevPanel() {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return
      if (e.shiftKey && e.key.toLowerCase() === 'd') setOpen((o) => !o)
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Abrir painel de desenvolvimento (Shift + D)"
        aria-expanded={open}
        className="fixed right-3 bottom-3 z-[60] rounded-full border border-noite/40 bg-panel px-3 py-1.5 font-mono text-[11px] font-bold tracking-wider text-noite shadow-[0_0_18px_color-mix(in_srgb,var(--color-noite)_30%,transparent)]"
      >
        DEV
      </button>
      <AnimatePresence>
        {open && (
          <motion.aside
            aria-label="Painel de desenvolvimento"
            className="fixed top-0 right-0 bottom-0 z-[70] flex w-[min(400px,100vw)] flex-col border-l border-line bg-ink/97 shadow-[-20px_0_40px_rgba(0,0,0,.5)] backdrop-blur"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
          >
            <header className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <p className="m-0 font-mono text-[10.5px] tracking-[0.2em] text-noite uppercase">Modo dev · Shift + D</p>
                <h2 className="m-0 text-base font-bold">Painel de desenvolvimento</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar painel" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-panel-2 hover:text-soft">
                <Icon name="x" />
              </button>
            </header>
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-4">
              <DevLinks onNavigate={() => setOpen(false)} />
              <PetPlay />
              <StatsReadout />
              <Simulation onStatus={setStatus} />
              <Overrides />
              <Trophies onStatus={setStatus} />
              <Scenes onStatus={setStatus} />
              <Safety onStatus={setStatus} />
            </div>
            <p aria-live="polite" className="m-0 min-h-[38px] border-t border-line px-4 py-2.5 font-mono text-[11.5px] text-soft">
              {status}
            </p>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}

/** Dispara as brincadeiras em todos os pets interativos da tela (Início, Hoje, Perfil, Pet, onboarding). */
function PetPlay() {
  const send = usePetCommand((s) => s.send)
  const reactions: { id: PetCommand; label: string }[] = [
    { id: 'squash', label: '1 toque' },
    { id: 'hop', label: '3 toques' },
    { id: 'special', label: 'Especial da espécie' },
    { id: 'spin', label: '5 toques (giro)' },
    { id: 'dizzy', label: '8 toques (tonto)' },
    { id: 'pet', label: 'Carinho (2 s)' },
  ]
  const idle: { id: PetCommand; label: string }[] = [
    { id: 'yawn', label: 'Bocejar' },
    { id: 'look', label: 'Olhar para os lados' },
    { id: 'blink2', label: 'Piscar duas vezes' },
  ]
  return (
    <Section title="Brincadeiras do pet">
      <p className="m-0 text-[11.5px] text-muted">Para ver o especial de outra espécie, troque a espécie nos atalhos de visualização.</p>
      <Row>
        {reactions.map((r) => (
          <Btn key={r.id} onClick={() => send(r.id)}>
            {r.label}
          </Btn>
        ))}
      </Row>
      <Row>
        {idle.map((r) => (
          <Btn key={r.id} onClick={() => send(r.id)}>
            {r.label}
          </Btn>
        ))}
      </Row>
    </Section>
  )
}

/** Páginas só de desenvolvimento (rotas /dev/...). */
function DevLinks({ onNavigate }: { onNavigate: () => void }) {
  const link = 'rounded-full border border-line px-3 py-1.5 text-[12px] font-semibold text-soft hover:bg-panel-2'
  return (
    <Section title="Páginas dev">
      <Row>
        <Link to="/dev" onClick={onNavigate} className={link}>Índice</Link>
        <Link to="/dev/cantinho" onClick={onNavigate} className={link}>Cantinho</Link>
        <Link to="/dev/pets" onClick={onNavigate} className={link}>Pets e estados</Link>
      </Row>
    </Section>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h3 className="m-0 font-mono text-[11px] tracking-[0.18em] text-muted uppercase">{title}</h3>
      {children}
    </section>
  )
}

function Btn({ children, onClick, tone = 'default', disabled, pressed }: { children: ReactNode; onClick: () => void; tone?: 'default' | 'danger'; disabled?: boolean; pressed?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      className={`rounded-lg border px-2.5 py-1.5 text-[12.5px] font-semibold transition-colors disabled:opacity-40 ${
        tone === 'danger'
          ? 'border-erro/40 bg-erro/10 text-erro hover:bg-erro/15'
          : pressed
            ? 'border-accent bg-accent/15 text-fg'
            : 'border-line bg-panel-2 text-soft hover:bg-line'
      }`}
    >
      {children}
    </button>
  )
}

function NumberField({ label, value, onChange, min = 1, max = 365 }: { label: string; value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  return (
    <input
      type="number"
      aria-label={label}
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || 0)))}
      className="w-16 rounded-lg border border-line bg-panel px-2 py-1.5 font-mono text-[12.5px] text-soft"
    />
  )
}

function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>
}

function StatsReadout() {
  const stats = useStats()
  const peak = useRotina((s) => s.petProgress.peakActiveDays)
  const areas = useAreas()
  const best = Math.max(peak, stats.activeDays)
  const items: [string, ReactNode][] = [
    ['Dias ativos', stats.activeDays],
    ['Maior já alcançado', `${best} · ${PHASES.find((p) => p.id === phaseFor(best))?.name}`],
    ['Sequência atual', stats.currentStreak],
    ['Blocos concluídos', stats.blocksDone],
    ['Dias desde o último ativo', stats.daysSinceLastActive ?? '—'],
    ['Concluídos hoje', stats.doneToday],
  ]
  return (
    <Section title="Estatísticas (src/lib/stats.ts)">
      <dl className="m-0 grid grid-cols-2 gap-2">
        {items.map(([k, v]) => (
          <div key={k} className="rounded-lg border border-line bg-panel px-2.5 py-2">
            <dt className="text-[11px] text-muted">{k}</dt>
            <dd className="m-0 font-mono text-sm font-bold">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="grid grid-cols-4 gap-1.5">
        {areas.map((a) => (
          <div key={a.id} className="flex flex-col items-center rounded-lg bg-panel px-1 py-1.5">
            <span className="text-[10.5px] text-muted">{a.name}</span>
            <span className="font-mono text-sm font-bold" style={{ color: a.color }}>
              {stats.areaDays7[a.id] ?? 0}/7
            </span>
          </div>
        ))}
      </div>
    </Section>
  )
}

function Simulation({ onStatus }: { onStatus: (s: string) => void }) {
  const [active, setActive] = useState(10)
  const [streak, setStreak] = useState(5)
  const [idle, setIdle] = useState(3)
  const areas = useAreas()
  const [area, setArea] = useState<AreaId>(() => areas.find((a) => a.id === 'corpo')?.id ?? areas[0]?.id ?? 'corpo')
  const [areaK, setAreaK] = useState(5)

  const run = (label: string, fn: (today: string) => void) => {
    fn(dayKey())
    onStatus(`${label}: feito.`)
  }
  const setLogs = (logs: ReturnType<typeof clearDev>) => useRotina.setState({ logs })

  return (
    <Section title="Simular histórico">
      <Row>
        <NumberField label="Quantidade de dias ativos" value={active} onChange={setActive} />
        <Btn onClick={() => run(`${active} dias ativos`, (t) => setLogs(simulateActiveDays(useRotina.getState().logs, ensureRoutines(), active, t)))}>
          Simular dias ativos
        </Btn>
      </Row>
      <Row>
        <NumberField label="Tamanho da sequência" value={streak} onChange={setStreak} />
        <Btn onClick={() => run(`Sequência de ${streak}`, (t) => setLogs(simulateStreak(useRotina.getState().logs, ensureRoutines(), streak, t)))}>
          Simular sequência (até ontem)
        </Btn>
      </Row>
      <Row>
        <NumberField label="Dias parado" value={idle} onChange={setIdle} />
        <Btn onClick={() => run(`${idle} dias parado`, (t) => setLogs(simulateIdle(useRotina.getState().logs, idle, t)))}>Simular dias parado (até ontem)</Btn>
      </Row>
      <Row>
        <select
          aria-label="Área para focar"
          value={area}
          onChange={(e) => setArea(e.target.value as AreaId)}
          className="rounded-lg border border-line bg-panel px-2 py-1.5 text-[12.5px] text-soft"
        >
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <NumberField label="Dias com a área concluída" value={areaK} onChange={setAreaK} min={0} max={6} />
        <Btn onClick={() => run(`${areas.find((a) => a.id === area)?.name} em ${areaK} dias`, (t) => setLogs(simulateArea(useRotina.getState().logs, ensureRoutines(area), area, areaK, t)))}>
          Focar numa área
        </Btn>
      </Row>
      <p className="m-0 text-[11.5px] text-muted">Os 6 dias antes de hoje. Hoje continua com seus dados reais e também conta nos "últimos 7".</p>
      <Row>
        <Btn onClick={() => void discardSimulation(onStatus)}>Limpar dados simulados</Btn>
      </Row>
    </Section>
  )
}

function Segmented<T extends string | number>({ label, value, options, onChange }: { label: string; value: T | null; options: { id: T; label: string }[]; onChange: (v: T | null) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] text-muted">{label}</span>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
        <Btn pressed={value === null} onClick={() => onChange(null)}>
          Auto
        </Btn>
        {options.map((o) => (
          <Btn key={String(o.id)} pressed={value === o.id} onClick={() => onChange(o.id)}>
            {o.label}
          </Btn>
        ))}
      </div>
    </div>
  )
}

function Overrides() {
  const dev = useDevOverrides()
  const push = usePetEvents((s) => s.push)
  const [acc, setAcc] = useState(ACCESSORIES[0].id)
  const skyDays = [0, 1, 3, 5, 7]
  const areas = useAreas()

  return (
    <Section title="Atalhos de visualização (não mexem nos dados)">
      <Segmented label="Fase do pet" value={dev.phase} options={PHASES.map((p) => ({ id: p.id, label: p.name }))} onChange={(phase) => dev.set({ phase })} />
      <Segmented label="Estado" value={dev.state} options={STATES} onChange={(state) => dev.set({ state })} />
      <Segmented label="Espécie do favorito" value={dev.species} options={ALL_PETS.map((k) => ({ id: k, label: PETS[k].name }))} onChange={(species) => dev.set({ species })} />
      <Row>
        <Btn pressed={dev.unlockAll} onClick={() => dev.set({ unlockAll: !dev.unlockAll })}>
          {dev.unlockAll ? 'Todos os acessórios liberados' : 'Desbloquear todos os acessórios'}
        </Btn>
      </Row>
      <Row>
        <Btn pressed={dev.secretPet} onClick={() => dev.set({ secretPet: !dev.secretPet })}>
          {dev.secretPet ? 'Coelho desbloqueado (só visual)' : 'Desbloquear coelho'}
        </Btn>
        <Btn onClick={() => push({ type: 'secret' })}>Disparar chegada do coelho</Btn>
      </Row>
      <div className="flex flex-col gap-1.5">
        <span className="text-[12px] text-muted">Dias por área na semana (constelações do cosmos e vaga-lumes da floresta)</span>
        {areas.map((a) => (
          <div key={a.id} className="flex items-center gap-2">
            <span className="w-16 text-[12px]" style={{ color: a.color }}>
              {a.name}
            </span>
            <div className="flex flex-wrap gap-1" role="group" aria-label={`Dias no céu: ${a.name}`}>
              <Btn pressed={dev.corner[a.id] === undefined} onClick={() => dev.setCorner(a.id, null)}>
                Auto
              </Btn>
              {skyDays.map((d) => (
                <Btn key={d} pressed={dev.corner[a.id] === d} onClick={() => dev.setCorner(a.id, d)}>
                  {d}
                </Btn>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Row>
        <Btn onClick={() => push({ type: 'phase', phase: dev.phase && dev.phase !== 'filhote' ? dev.phase : 'jovem' })}>Disparar celebração de nova fase</Btn>
      </Row>
      <Row>
        <select
          aria-label="Acessório do aviso"
          value={acc}
          onChange={(e) => setAcc(e.target.value as typeof acc)}
          className="rounded-lg border border-line bg-panel px-2 py-1.5 text-[12.5px] text-soft"
        >
          {ACCESSORIES.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <Btn onClick={() => push({ type: 'unlock', accessory: acc })}>Disparar aviso de acessório</Btn>
      </Row>
    </Section>
  )
}

/** Troféus que a tela mostra agora (os simulados, se houver; senão os reais). */
const shownTrophies = (): TrophyMap => useDevOverrides.getState().trophies ?? useRotina.getState().trophies

/** Acrescenta níveis aos troféus simulados (partindo dos reais na primeira vez). */
function withTiers(base: TrophyMap, add: [TrophyId, TrophyTier][]): TrophyMap {
  const out: TrophyMap = { ...base }
  const at = new Date().toISOString()
  for (const [id, tier] of add) if (!tiersOf(out, id).includes(tier)) out[id] = [...(out[id] ?? []), { tier, unlockedAt: at }].sort((a, b) => a.tier - b.tier)
  return out
}

/**
 * Troféus simulados: ficam só em useDevOverrides (sem persist, somem ao recarregar).
 * Enquanto houver simulação, o cantinho e a coleção mostram e editam a cópia simulada.
 */
function Trophies({ onStatus }: { onStatus: (s: string) => void }) {
  const dev = useDevOverrides()
  const push = usePetEvents((s) => s.push)
  const [id, setId] = useState<TrophyId>(TROPHIES[0].id)
  const [tier, setTier] = useState<TrophyTier>(2)
  const simulating = !!(dev.trophies || dev.layouts)
  const select = 'rounded-lg border border-line bg-panel px-2 py-1.5 text-[12.5px] text-soft'

  return (
    <Section title="Troféus (só neste aparelho)">
      <p className="m-0 text-[11.5px] text-muted">
        {simulating ? 'Simulando: o cantinho e a coleção mostram os troféus de teste. Nada disso vai para o Supabase.' : 'Mostrando os troféus reais.'}
      </p>
      <Row>
        <Btn
          onClick={() => {
            dev.set({ trophies: withTiers({}, TROPHIES.flatMap((t) => TIER_LIST.map((n) => [t.id, n] as [TrophyId, TrophyTier]))) })
            onStatus('Todos os troféus desbloqueados (simulado).')
          }}
        >
          Desbloquear todos
        </Btn>
        <Btn
          onClick={() => {
            dev.set({ trophies: {}, layouts: EMPTY_LAYOUTS })
            onStatus('Troféus limpos (simulado).')
          }}
        >
          Limpar troféus
        </Btn>
      </Row>
      <Row>
        <select aria-label="Troféu" value={id} onChange={(e) => setId(e.target.value as TrophyId)} className={select}>
          {TROPHIES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select aria-label="Nível" value={tier} onChange={(e) => setTier(Number(e.target.value) as TrophyTier)} className={select}>
          {TIER_LIST.map((n) => (
            <option key={n} value={n}>
              {TIERS[n].name}
            </option>
          ))}
        </select>
      </Row>
      <Row>
        <Btn
          onClick={() => {
            dev.set({ trophies: withTiers(shownTrophies(), [[id, tier]]) })
            onStatus(`${trophyTitle(id, tier)} desbloqueado (simulado).`)
          }}
        >
          Desbloquear este nível
        </Btn>
        <Btn
          onClick={() => {
            // O aviso tem "Expor no cantinho": liga a simulação antes, para não gravar nos espaços reais.
            dev.set({ trophies: withTiers(shownTrophies(), [[id, tier]]) })
            push({ type: 'trophy', trophy: id, tier })
          }}
        >
          Disparar aviso de troféu novo
        </Btn>
      </Row>
      <Row>
        <Btn
          onClick={() => {
            let map = shownTrophies()
            if (!TROPHIES.some((t) => tiersOf(map, t.id).length)) map = withTiers({}, TROPHIES.flatMap((t) => TIER_LIST.map((n) => [t.id, n] as [TrophyId, TrophyTier])))
            const owned = TROPHIES.filter((t) => tiersOf(map, t.id).length).sort(() => Math.random() - 0.5)
            const layout = EMPTY_LAYOUT.map((_, i) => {
              const t = owned[i]
              if (!t) return null
              const tiers = tiersOf(map, t.id)
              return { kind: 'trophy', id: t.id, tier: tiers[Math.floor(Math.random() * tiers.length)] }
            }) as CornerLayout
            const scene = dev.scene ?? useRotina.getState().scene
            dev.set({ trophies: map, layouts: { ...(dev.layouts ?? useRotina.getState().cornerLayouts), [scene]: layout } })
            onStatus('Espaços preenchidos com uma combinação aleatória (simulado).')
          }}
        >
          Preencher os 4 espaços (aleatório)
        </Btn>
        <Btn
          disabled={!simulating}
          onClick={() => {
            dev.set({ trophies: null, layouts: null })
            onStatus('De volta aos troféus reais.')
          }}
        >
          Voltar aos reais
        </Btn>
      </Row>
    </Section>
  )
}

/** Todos os itens de cenário, desbloqueados agora (simulado). */
const allItems = (): SceneItemMap => Object.fromEntries(SCENE_ITEMS.map((i) => [i.id, { unlockedAt: new Date().toISOString() }]))

/**
 * Cenários e itens simulados: ficam só em useDevOverrides (sem persist). Enquanto houver simulação,
 * o cantinho, a gaveta e a coleção mostram e editam a cópia simulada; nada vai para o Supabase.
 * Os dias por área (constelações e vaga-lumes) ficam em "Atalhos de visualização".
 */
function Scenes({ onStatus }: { onStatus: (s: string) => void }) {
  const dev = useDevOverrides()
  const push = usePetEvents((s) => s.push)
  const realScene = useRotina((s) => s.scene)
  const [item, setItem] = useState<SceneItemId>(SCENE_ITEMS[0].id)
  const simulating = !!(dev.scene || dev.sceneItems || dev.layouts)
  const select = 'rounded-lg border border-line bg-panel px-2 py-1.5 text-[12.5px] text-soft'
  const scene = dev.scene ?? realScene

  return (
    <Section title="Cenários e itens (só neste aparelho)">
      <p className="m-0 text-[11.5px] text-muted">
        {simulating ? 'Simulando: o cantinho e a coleção mostram o cenário e os itens de teste.' : 'Mostrando o cenário e os itens reais.'}
      </p>
      <div className="flex flex-col gap-1.5">
        <span className="text-[12px] text-muted">Cenário</span>
        <Row>
          {SCENES.map((s) => (
            <Btn key={s.id} pressed={scene === s.id} onClick={() => dev.set({ scene: s.id })}>
              {s.name}
            </Btn>
          ))}
        </Row>
      </div>
      <Row>
        <Btn
          onClick={() => {
            dev.set({ sceneItems: allItems() })
            onStatus('Todos os itens de cenário desbloqueados (simulado).')
          }}
        >
          Desbloquear todos os itens
        </Btn>
        <Btn
          onClick={() => {
            dev.set({ sceneItems: {}, layouts: EMPTY_LAYOUTS })
            onStatus('Itens de cenário limpos (simulado).')
          }}
        >
          Limpar itens
        </Btn>
      </Row>
      <Row>
        <select aria-label="Item do aviso" value={item} onChange={(e) => setItem(e.target.value as SceneItemId)} className={select}>
          {SCENES.map((s) => (
            <optgroup key={s.id} label={s.name}>
              {SCENE_ITEMS.filter((i) => i.scene === s.id).map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <Btn
          onClick={() => {
            // O aviso tem "Colocar no cantinho": liga a simulação antes, para não gravar na montagem real.
            const base = dev.sceneItems ?? useRotina.getState().sceneItems
            dev.set({ sceneItems: { ...base, [item]: base[item] ?? { unlockedAt: new Date().toISOString() } } })
            push({ type: 'item', item })
            onStatus(`Aviso de item novo: ${ITEM_BY_ID[item].name}.`)
          }}
        >
          Disparar aviso de item novo
        </Btn>
      </Row>
      <Row>
        <Btn
          disabled={!simulating}
          onClick={() => {
            dev.set({ scene: null, sceneItems: null, layouts: null })
            onStatus('De volta ao cenário e aos itens reais.')
          }}
        >
          Voltar aos reais
        </Btn>
      </Row>
    </Section>
  )
}

function Safety({ onStatus }: { onStatus: (s: string) => void }) {
  const [confirming, setConfirming] = useState(false)
  const navigate = useNavigate()

  return (
    <Section title="Segurança">
      <p className="m-0 text-[11.5px] text-muted">
        Simulações nunca vão para o Supabase: tudo que o painel gera fica só neste aparelho. Seus dados reais estão na conta.
      </p>
      <Row>
        <Btn onClick={() => void discardSimulation(onStatus)}>Restaurar dados reais (recarregar da conta)</Btn>
        <Btn onClick={() => navigate('/bem-vindo?passo=1&completo=1')}>Refazer o onboarding</Btn>
        {!confirming ? (
          <Btn tone="danger" onClick={() => setConfirming(true)}>
            Resetar tudo neste aparelho
          </Btn>
        ) : (
          <>
            <span className="text-[12px] text-erro">Apagar o cache local do app? A conta não é afetada.</span>
            <Btn
              tone="danger"
              onClick={async () => {
                await flushNow() // não perde mudanças reais que ainda não subiram
                Object.keys(localStorage)
                  .filter((k) => k.startsWith(APP_KEY))
                  .forEach((k) => localStorage.removeItem(k))
                location.reload()
              }}
            >
              Sim, apagar
            </Btn>
            <Btn onClick={() => setConfirming(false)}>Cancelar</Btn>
          </>
        )}
      </Row>
    </Section>
  )
}
