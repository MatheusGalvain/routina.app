import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FOCUS_LIMITS, findBlock, isPomodoroCounter, useFocus, useFocusPrefs } from '../../store/useFocus'
import { useRotina } from '../../store/useRotina'
import { useShownPet } from '../../store/useCompanion'
import { useDevOverrides } from '../../store/useDevOverrides'
import { petFeedback, primeAudio } from '../../lib/petFeedback'
import { dayKey } from '../../lib/dates'
import { isDone } from '../../lib/today'
import { saveFocusSession } from '../../sync/focusSessions'
import { FocusPet, type FocusPose } from './FocusPet'
import { Icon } from '../ui/ui'

/**
 * Modo foco com o pet (tela cheia, escura e calma). Montado uma vez no App; abre com useFocus().start(bloco).
 *  - Ciclos estilo pomodoro (padrão 25 min de foco e 5 de pausa, ajustável). O timer usa a hora de término,
 *    então continua certo mesmo com a aba escondida.
 *  - Saiu do app durante o foco: o pet senta olhando para a porta; ao voltar, comemora de leve e diz quanto tempo foi.
 *  - Fim do foco: som suave (se os sons estiverem ligados), +1 no contador de pomodoros ou "Marcar como feito?".
 *  - Pede para a tela não apagar (wake lock), se o aparelho deixar.
 *  - Cada ciclo de foco vira uma sessão salva (sync/focusSessions).
 */

type Phase = 'ready' | 'focus' | 'pause' | 'between'

interface Timer {
  phase: Phase
  /** Duração total da fase atual (ms). */
  total: number
  /** Quando termina (ms desde 1970); `null` = pausado. */
  endsAt: number | null
  /** Quanto falta, guardado ao pausar (ms). */
  left: number
}

interface SessionTrack {
  id: string
  startedAt: string
  pauses: number
  interruptions: number
  awayMs: number
  awaySince: number | null
}

const BREAK_TIPS = ['Levanta um pouquinho e estica as costas comigo.', 'Que tal beber um copo d’água agora?', 'Olha para longe da tela por uns segundos. Descansa os olhos.']

const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

const awayText = (ms: number) => {
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s} s`
  const m = Math.floor(s / 60)
  return s % 60 ? `${m} min ${s % 60} s` : `${m} min`
}

/** Pede para a tela não apagar enquanto `active`; tenta de novo ao voltar para a aba. Recusa = segue sem. */
function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    type Lock = { release: () => Promise<void> }
    const api = (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<Lock> } }).wakeLock
    if (!api) return
    let lock: Lock | null = null
    let alive = true
    const request = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const l = await api.request('screen')
        if (alive) lock = l
        else void l.release().catch(() => {})
      } catch {
        /* recusado (bateria, permissão, aba em segundo plano): segue sem */
      }
    }
    void request()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void request()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      alive = false
      document.removeEventListener('visibilitychange', onVisible)
      if (lock) void lock.release().catch(() => {})
    }
  }, [active])
}

export function FocusMode() {
  const open = useFocus((s) => s.open)
  return <AnimatePresence>{open && <FocusScreen key="foco" />}</AnimatePresence>
}

function FocusScreen() {
  const blockId = useFocus((s) => s.blockId)
  const close = useFocus((s) => s.close)
  const prefs = useFocusPrefs()
  const test = useDevOverrides((s) => s.focusTest)
  const pet = useShownPet('foco')
  const block = findBlock(blockId)
  // Re-renderiza se o bloco mudar (ex.: renomeado em outro aparelho).
  useRotina((s) => s.routines)
  const date = dayKey()
  const log = useRotina((s) => (blockId ? s.logs[date]?.blocks[blockId] : undefined))

  const focusMs = test ? 10_000 : prefs.focusMin * 60_000
  const pauseMs = test ? 5_000 : prefs.pauseMin * 60_000

  const [timer, setTimer] = useState<Timer>({ phase: 'ready', total: focusMs, endsAt: null, left: focusMs })
  const [now, setNow] = useState(Date.now())
  const [away, setAway] = useState(false)
  const [back, setBack] = useState<number | null>(null)
  const [ask, setAsk] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [tip, setTip] = useState(0)
  const session = useRef<SessionTrack | null>(null)
  const timerRef = useRef(timer)
  timerRef.current = timer

  const running = timer.endsAt !== null
  const left = running ? Math.max(0, timer.endsAt! - now) : timer.left

  useWakeLock(timer.phase === 'focus' || timer.phase === 'pause')

  // Antes de começar, o timer acompanha as durações escolhidas.
  useEffect(() => {
    if (timer.phase === 'ready') setTimer({ phase: 'ready', total: focusMs, endsAt: null, left: focusMs })
  }, [focusMs])

  // Relógio da tela (o tempo de verdade vem de endsAt).
  useEffect(() => {
    if (!running) return
    const t = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(t)
  }, [running])

  // Rolagem da página travada por baixo da tela cheia.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  /** Guarda a sessão do ciclo de foco atual (no modo de teste do painel dev, não guarda). */
  const saveSession = (completed: boolean) => {
    const s = session.current
    const t = timerRef.current
    session.current = null
    if (!s || t.phase !== 'focus') return
    const elapsed = t.total - (t.endsAt !== null ? Math.max(0, t.endsAt - Date.now()) : t.left)
    const awayMs = s.awayMs + (s.awaySince ? Date.now() - s.awaySince : 0)
    if (test || elapsed < 1000) return
    saveFocusSession({
      id: s.id,
      blockId: block?.id ?? null,
      blockName: block?.name ?? null,
      date,
      startedAt: s.startedAt,
      endedAt: new Date().toISOString(),
      plannedSeconds: t.total / 1000,
      focusSeconds: Math.min(t.total, elapsed) / 1000,
      awaySeconds: awayMs / 1000,
      interruptions: s.interruptions,
      pauses: s.pauses,
      completed,
    })
  }

  const startFocus = () => {
    primeAudio()
    session.current = { id: crypto.randomUUID(), startedAt: new Date().toISOString(), pauses: 0, interruptions: 0, awayMs: 0, awaySince: null }
    setAsk(false)
    setNote(null)
    setNow(Date.now())
    setTimer({ phase: 'focus', total: focusMs, endsAt: Date.now() + focusMs, left: focusMs })
  }

  /** Fim do ciclo de foco: som, sessão, contador ou pergunta, e começa a pausa. */
  const finishFocus = () => {
    petFeedback('cycle')
    saveSession(true)
    const b = findBlock(blockId)
    if (b) {
      const { increment, logs } = useRotina.getState()
      const today = dayKey()
      if (isPomodoroCounter(b)) {
        increment(today, b, 1)
        setNote(`+1 em “${b.name}”.`)
      } else if (b.type !== 'contador' && !isDone(b.type, logs[today]?.blocks[b.id] ?? {}, b.target)) setAsk(true)
    }
    setTip((n) => (n + 1) % BREAK_TIPS.length)
    setNow(Date.now())
    setTimer({ phase: 'pause', total: pauseMs, endsAt: Date.now() + pauseMs, left: pauseMs })
  }

  // Fim de uma fase (também ao voltar para a aba depois do fim).
  useEffect(() => {
    if (!running || left > 0) return
    if (timer.phase === 'focus') finishFocus()
    else if (timer.phase === 'pause') {
      petFeedback('cycle')
      setTimer({ phase: 'between', total: focusMs, endsAt: null, left: focusMs })
    }
  }, [running, left, timer.phase])

  // Saiu do app ou trocou de aba durante o foco: o pet olha para a porta. Voltou: comemora e diz o tempo fora.
  useEffect(() => {
    const onVisibility = () => {
      const s = session.current
      const inFocus = timerRef.current.phase === 'focus'
      if (document.visibilityState === 'hidden') {
        if (!inFocus || !s) return
        s.interruptions++
        s.awaySince = Date.now()
        setAway(true)
        setBack(null)
        return
      }
      setNow(Date.now())
      setAway(false)
      if (s?.awaySince) {
        const ms = Date.now() - s.awaySince
        s.awayMs += ms
        s.awaySince = null
        setBack(ms)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  // A comemoração da volta dura alguns segundos.
  useEffect(() => {
    if (back === null) return
    const t = window.setTimeout(() => setBack(null), 5000)
    return () => window.clearTimeout(t)
  }, [back])

  const togglePause = () => {
    if (running) {
      if (timer.phase === 'focus' && session.current) session.current.pauses++
      setTimer({ ...timer, endsAt: null, left })
    } else {
      setNow(Date.now())
      setTimer({ ...timer, endsAt: Date.now() + timer.left })
    }
  }

  const end = () => {
    saveSession(false)
    close()
  }

  const markDone = () => {
    const b = findBlock(blockId)
    if (b) {
      const { toggleDone, logs } = useRotina.getState()
      const today = dayKey()
      if (!isDone(b.type, logs[today]?.blocks[b.id] ?? {}, b.target)) toggleDone(today, b)
      setNote(`“${b.name}” marcado como feito.`)
    }
    setAsk(false)
  }

  const pose: FocusPose = away ? 'door' : back !== null ? 'cheer' : timer.phase === 'pause' ? 'stretch' : 'typing'
  const paused = !running && (timer.phase === 'focus' || timer.phase === 'pause')
  const name = block?.name ?? null
  const bubble =
    back !== null
      ? `Oba, você voltou! Ficou fora ${awayText(back)}. O timer continuou contando.`
      : timer.phase === 'ready'
        ? name
          ? `Vamos focar em “${name}”? Eu fico aqui digitando do seu lado.`
          : 'Vamos focar? Eu fico aqui digitando do seu lado.'
        : timer.phase === 'pause'
          ? paused
            ? 'Pausa parada. Quando quiser, a gente continua.'
            : BREAK_TIPS[tip]
          : timer.phase === 'between'
            ? 'Pausa encerrada. Mais um ciclo?'
            : paused
              ? 'Pausado. Quando quiser, a gente continua.'
              : 'Um passo de cada vez. Estou aqui.'
  const done = block ? isDone(block.type, log ?? {}, block.target) : false
  const petSize = 'min(46vw, 240px)'

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Modo foco"
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center overflow-y-auto px-4 py-8 text-center"
      style={{ background: 'radial-gradient(ellipse at 50% 38%, #10172A 0%, #070A12 62%, #04060B 100%)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* A "porta" para onde o pet olha enquanto a pessoa está fora. */}
      <AnimatePresence>
        {away && (
          <motion.svg key="porta" viewBox="0 0 60 110" className="pointer-events-none absolute top-1/2 left-[6%] h-[38vh] -translate-y-1/2" aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}>
            <rect x="4" y="4" width="52" height="102" rx="3" fill="none" stroke="#3A4357" strokeWidth="2" />
            <rect x="9" y="9" width="42" height="94" rx="2" fill="#0B0F1A" />
            <circle cx="44" cy="58" r="2.4" fill="#566079" />
            <rect x="9" y="102" width="42" height="3" fill="#FDE68A" opacity=".35" />
          </motion.svg>
        )}
      </AnimatePresence>

      <p className="m-0 font-mono text-[11px] tracking-[0.25em] text-muted uppercase">
        {timer.phase === 'pause' ? 'Pausa' : 'Modo foco'}
        {test && ' · teste 10 s'}
      </p>
      <h2 className="m-0 mt-2 max-w-[640px] text-lg font-bold text-soft [overflow-wrap:anywhere] sm:text-xl">
        {name ?? 'Foco livre'}
        {done && <span className="ml-2 align-middle text-[12px] font-semibold text-ok">feito</span>}
      </h2>

      <div className="my-4 grid place-items-center" style={{ width: petSize, height: petSize }}>
        <ResponsivePet>
          {(size) => <FocusPet kind={pet.kind} phase={pet.phase} adultDetail={pet.adultDetail} accessories={pet.accessories} pose={pose} size={size} />}
        </ResponsivePet>
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={bubble}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="m-0 max-w-[420px] rounded-2xl border border-line-2 bg-panel/60 px-4 py-2.5 text-sm text-soft"
          aria-live="polite"
        >
          {bubble}
        </motion.p>
      </AnimatePresence>

      <div
        className={`mt-5 font-mono leading-none font-bold tracking-tight tabular-nums ${paused ? 'text-muted' : timer.phase === 'pause' ? 'text-noite' : 'text-fg'}`}
        style={{ fontSize: 'clamp(64px, 17vw, 132px)' }}
        role="timer"
        aria-label={`${timer.phase === 'pause' ? 'Pausa' : 'Foco'}: faltam ${clock(left)}`}
      >
        {clock(left)}
      </div>
      <div className="mt-3 h-1 w-[min(320px,70vw)] overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${(1 - left / timer.total) * 100}%`, background: timer.phase === 'pause' ? 'var(--color-noite)' : 'var(--color-accent)' }} />
      </div>

      {note && <p className="m-0 mt-4 text-sm font-semibold text-ok">{note}</p>}

      {ask && block && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-line bg-panel/70 px-4 py-3">
          <span className="text-sm font-semibold">Marcar como feito?</span>
          <button type="button" onClick={markDone} className="min-h-10 rounded-full bg-ok px-4 text-sm font-bold text-ink">
            Marcar
          </button>
          <button type="button" onClick={() => setAsk(false)} className="min-h-10 rounded-full border border-line px-4 text-sm font-semibold text-soft">
            Ainda não
          </button>
        </div>
      )}

      {timer.phase === 'ready' && (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Stepper label="Foco" value={prefs.focusMin} step={5} limits={FOCUS_LIMITS.focus} onChange={(v) => prefs.set({ focusMin: v })} />
          <Stepper label="Pausa" value={prefs.pauseMin} step={1} limits={FOCUS_LIMITS.pause} onChange={(v) => prefs.set({ pauseMin: v })} />
        </div>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {timer.phase === 'ready' || timer.phase === 'between' ? (
          <button type="button" autoFocus onClick={startFocus} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-accent px-7 text-[15px] font-bold text-ink">
            <Icon name="play" size={15} /> {timer.phase === 'between' ? 'Começar outro ciclo' : 'Começar'}
          </button>
        ) : (
          <button type="button" autoFocus onClick={togglePause} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-line bg-panel px-6 text-[15px] font-bold text-soft hover:bg-panel-2">
            <Icon name={running ? 'pause' : 'play'} size={15} /> {running ? 'Pausar' : 'Continuar'}
          </button>
        )}
        <button type="button" onClick={end} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-line px-6 text-[15px] font-semibold text-muted hover:text-soft">
          <Icon name="stop" size={14} /> Encerrar
        </button>
      </div>
    </motion.div>
  )
}

/** Mede o espaço disponível para o pet (ele usa tamanho em px). */
function ResponsivePet({ children }: { children: (size: number) => ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState(200)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSize(Math.round(Math.min(e.contentRect.width, e.contentRect.height))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={ref} className="grid h-full w-full place-items-center">
      {children(size)}
    </div>
  )
}

function Stepper({ label, value, step, limits, onChange }: { label: string; value: number; step: number; limits: readonly [number, number]; onChange: (v: number) => void }) {
  const [min, max] = limits
  const set = (v: number) => onChange(Math.min(max, Math.max(min, v)))
  return (
    <div className="flex items-center gap-2 rounded-full border border-line bg-panel/60 px-2 py-1.5" role="group" aria-label={`${label}: ${value} minutos`}>
      <button type="button" onClick={() => set(value - step)} disabled={value <= min} aria-label={`Menos tempo de ${label.toLowerCase()}`} className="grid h-9 w-9 place-items-center rounded-full text-soft hover:bg-panel-2 disabled:opacity-30">
        <Icon name="minus" size={14} />
      </button>
      <span className="min-w-[92px] text-sm">
        <span className="text-muted">{label}</span> <strong className="font-mono">{value} min</strong>
      </span>
      <button type="button" onClick={() => set(value + step)} disabled={value >= max} aria-label={`Mais tempo de ${label.toLowerCase()}`} className="grid h-9 w-9 place-items-center rounded-full text-soft hover:bg-panel-2 disabled:opacity-30">
        <Icon name="plus" size={14} />
      </button>
    </div>
  )
}
