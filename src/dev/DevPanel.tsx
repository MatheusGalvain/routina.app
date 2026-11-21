import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useRotina, DEFAULT_PROGRESS } from '../store/useRotina'
import { useDevOverrides, type CornerStage, type ForcedState } from '../store/useDevOverrides'
import { usePetEvents } from '../store/usePetEvents'
import { useStats } from '../store/useCompanion'
import { AREAS } from '../data/areas'
import { ACCESSORIES } from '../data/accessories'
import { PETS, PET_ORDER } from '../components/pets/pets'
import { PHASES, phaseFor } from '../lib/companion'
import { dayKey } from '../lib/dates'
import { Icon } from '../components/ui/ui'
import type { AreaId, PetProgress } from '../types'
import { BACKUP_KEY, STORE_KEY, clearDev, hasDev, simulateActiveDays, simulateArea, simulateIdle, simulateStreak, testRoutine } from './simulate'

const STATES: { id: ForcedState; label: string }[] = [
  { id: 'neutro', label: 'Neutro' },
  { id: 'foco', label: 'Foco' },
  { id: 'concluido', label: 'Concluído' },
  { id: 'atencao', label: 'Atenção' },
  { id: 'pulado', label: 'Pulado' },
  { id: 'descanso', label: 'Descanso' },
  { id: 'dormindo', label: 'Dormindo' },
]

/** Salva os dados reais antes da primeira simulação (se ainda não há nada simulado). */
function backupIfReal() {
  if (hasDev(useRotina.getState().logs)) return
  const raw = localStorage.getItem(STORE_KEY)
  if (raw) localStorage.setItem(BACKUP_KEY, raw)
}

function backupProgress(): PetProgress | null {
  try {
    const raw = localStorage.getItem(BACKUP_KEY)
    return raw ? (JSON.parse(raw).state?.petProgress ?? null) : null
  } catch {
    return null
  }
}

/** Garante rotinas com blocos (e com a área pedida); senão cria a rotina de teste. */
function ensureRoutines(area?: AreaId) {
  const { routines } = useRotina.getState()
  const blocks = routines.flatMap((r) => r.blocks)
  if (blocks.length && (!area || blocks.some((b) => b.areaId === area))) return routines
  const next = [...routines, testRoutine()]
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
        className="fixed right-3 bottom-3 z-[60] rounded-full border border-[#3B2A6B] bg-[#1A1430] px-3 py-1.5 font-mono text-[11px] font-bold tracking-wider text-[#C4B5FD] shadow-[0_0_18px_rgba(139,92,246,.35)]"
      >
        DEV
      </button>
      <AnimatePresence>
        {open && (
          <motion.aside
            aria-label="Painel de desenvolvimento"
            className="fixed top-0 right-0 bottom-0 z-[70] flex w-[min(400px,100vw)] flex-col border-l border-line bg-[#0B0E15]/97 shadow-[-20px_0_40px_rgba(0,0,0,.5)] backdrop-blur"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
          >
            <header className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <p className="m-0 font-mono text-[10.5px] tracking-[0.2em] text-[#C4B5FD] uppercase">Modo dev · Shift + D</p>
                <h2 className="m-0 text-base font-bold">Painel de desenvolvimento</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar painel" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-panel-2 hover:text-soft">
                <Icon name="x" />
              </button>
            </header>
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-4">
              <StatsReadout />
              <Simulation onStatus={setStatus} />
              <Overrides />
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
          ? 'border-[#5A1C2A] bg-[#2A0F16] text-[#FDA4AF] hover:bg-[#3A1420]'
          : pressed
            ? 'border-[#5AA7FF] bg-[#10233F] text-white'
            : 'border-line bg-panel-2 text-soft hover:bg-[#1C2436]'
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
        {AREAS.map((a) => (
          <div key={a.id} className="flex flex-col items-center rounded-lg bg-panel px-1 py-1.5">
            <span className="text-[10.5px] text-muted">{a.name}</span>
            <span className="font-mono text-sm font-bold" style={{ color: a.color }}>
              {stats.areaDays7[a.id]}/7
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
  const [area, setArea] = useState<AreaId>('corpo')
  const [areaK, setAreaK] = useState(5)

  const run = (label: string, fn: (today: string) => void) => {
    backupIfReal()
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
          {AREAS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <NumberField label="Dias com a área concluída" value={areaK} onChange={setAreaK} min={0} max={6} />
        <Btn onClick={() => run(`${AREAS.find((a) => a.id === area)?.name} em ${areaK} dias`, (t) => setLogs(simulateArea(useRotina.getState().logs, ensureRoutines(area), area, areaK, t)))}>
          Focar numa área
        </Btn>
      </Row>
      <p className="m-0 text-[11.5px] text-muted">Os 6 dias antes de hoje. Hoje continua com seus dados reais e também conta nos "últimos 7".</p>
      <Row>
        <Btn
          onClick={() => {
            const { logs, routines } = useRotina.getState()
            useRotina.setState({
              logs: clearDev(logs),
              routines: routines.filter((r) => !r.dev),
              petProgress: backupProgress() ?? DEFAULT_PROGRESS,
            })
            onStatus('Dados simulados removidos. Os reais continuam.')
          }}
        >
          Limpar dados simulados
        </Btn>
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
  const stages: { id: CornerStage; label: string }[] = [0, 1, 2, 3].map((n) => ({ id: n as CornerStage, label: String(n) }))

  return (
    <Section title="Atalhos de visualização (não mexem nos dados)">
      <Segmented label="Fase do pet" value={dev.phase} options={PHASES.map((p) => ({ id: p.id, label: p.name }))} onChange={(phase) => dev.set({ phase })} />
      <Segmented label="Estado" value={dev.state} options={STATES} onChange={(state) => dev.set({ state })} />
      <Segmented label="Espécie do favorito" value={dev.species} options={PET_ORDER.map((k) => ({ id: k, label: PETS[k].name }))} onChange={(species) => dev.set({ species })} />
      <Row>
        <Btn pressed={dev.unlockAll} onClick={() => dev.set({ unlockAll: !dev.unlockAll })}>
          {dev.unlockAll ? 'Todos os acessórios liberados' : 'Desbloquear todos os acessórios'}
        </Btn>
      </Row>
      <div className="flex flex-col gap-1.5">
        <span className="text-[12px] text-muted">Estágio do cantinho por área</span>
        {AREAS.map((a) => (
          <div key={a.id} className="flex items-center gap-2">
            <span className="w-16 text-[12px]" style={{ color: a.color }}>
              {a.name}
            </span>
            <div className="flex flex-wrap gap-1" role="group" aria-label={`Estágio do cantinho: ${a.name}`}>
              <Btn pressed={dev.corner[a.id] === undefined} onClick={() => dev.setCorner(a.id, null)}>
                Auto
              </Btn>
              {stages.map((s) => (
                <Btn key={s.id} pressed={dev.corner[a.id] === s.id} onClick={() => dev.setCorner(a.id, s.id)}>
                  {s.label}
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

function Safety({ onStatus }: { onStatus: (s: string) => void }) {
  const [confirming, setConfirming] = useState(false)
  const [hasBackup, setHasBackup] = useState(() => !!localStorage.getItem(BACKUP_KEY))
  const logs = useRotina((s) => s.logs)

  useEffect(() => setHasBackup(!!localStorage.getItem(BACKUP_KEY)), [logs])

  return (
    <Section title="Segurança">
      <Row>
        <Btn
          disabled={!hasBackup}
          onClick={async () => {
            const raw = localStorage.getItem(BACKUP_KEY)
            if (!raw) return
            localStorage.setItem(STORE_KEY, raw)
            await useRotina.persist.rehydrate()
            onStatus('Backup restaurado.')
          }}
        >
          Restaurar backup
        </Btn>
        {!confirming ? (
          <Btn tone="danger" onClick={() => setConfirming(true)}>
            Resetar tudo
          </Btn>
        ) : (
          <>
            <span className="text-[12px] text-[#FDA4AF]">Apagar todos os dados do app?</span>
            <Btn
              tone="danger"
              onClick={() => {
                Object.keys(localStorage)
                  .filter((k) => k.startsWith(STORE_KEY))
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
      <p className="m-0 text-[11.5px] text-muted">O backup é salvo automaticamente antes da primeira simulação, enquanto os dados ainda são reais.</p>
    </Section>
  )
}
