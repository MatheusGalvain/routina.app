import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useBlocker } from 'react-router-dom'
import { flushNow, useSyncStatus } from '../../sync/outbox'
import { Icon } from '../ui/ui'

export type SaveState = 'saving' | 'saved' | 'error'

/**
 * Estado do salvamento automático, a partir da fila de sincronização (sync/outbox):
 * algo esperando ou subindo = "saving"; falhou e vai tentar de novo = "error"; fila vazia = "saved".
 */
export function useSaveState(): SaveState {
  const state = useSyncStatus((s) => s.state)
  const pending = useSyncStatus((s) => s.pending)
  if (state === 'retrying') return 'error'
  return state === 'saving' || pending > 0 ? 'saving' : 'saved'
}

/** Espera a fila esvaziar. Devolve false se o servidor falhou (a fila continua tentando sozinha). */
export async function waitForSave() {
  for (let i = 0; i < 5; i++) {
    if (await flushNow()) return true
    if (useSyncStatus.getState().state === 'retrying') return false
  }
  return useSyncStatus.getState().pending === 0
}

/** Selo no topo do editor: "Salvando…", "Salvo" ou o erro com "Tentar agora". */
export function SaveStatus({ state }: { state: SaveState }) {
  return (
    <div className="flex min-h-9 items-center gap-2 text-[13px] font-semibold">
      {state === 'saving' && (
        <span className="inline-flex items-center gap-2 text-muted">
          <motion.span
            aria-hidden="true"
            className="h-2 w-2 rounded-full bg-accent"
            animate={{ opacity: [1, 0.25, 1], scale: [1, 0.8, 1] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
          />
          Salvando…
        </span>
      )}
      {state === 'saved' && (
        <span className="inline-flex items-center gap-1.5 text-ok">
          <Icon name="check" size={15} /> Salvo
        </span>
      )}
      {state === 'error' && (
        <span className="inline-flex flex-wrap items-center gap-2 text-alerta">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-alerta" />
          Não foi possível salvar. Tentando de novo…
          <button type="button" onClick={() => void flushNow()} className="min-h-8 rounded-full border border-alerta/40 px-3 text-[12.5px] hover:bg-alerta/10">
            Tentar agora
          </button>
        </span>
      )}
      {/* Leitores de tela: só o erro é anunciado (o "Salvando…/Salvo" muda a cada tecla). */}
      <span className="sr-only" role="status">
        {state === 'error' ? 'Não foi possível salvar. Tentando de novo.' : ''}
      </span>
    </div>
  )
}

/** Quanto esperar o salvamento terminar antes de mostrar o aviso (quase sempre termina antes). */
const GRACE_MS = 1500
/** Com o aviso aberto e tudo salvo: tempo do "Tudo salvo" antes de sair. */
const DONE_MS = 900

export type LeavePhase = 'idle' | 'dialog' | 'done'

/**
 * Protege a saída do editor enquanto há algo salvando. Links e o botão voltar são segurados
 * (bloqueio do React Router) e o app manda salvar na hora:
 *  - terminou em até 1,5 s: sai direto, sem aviso;
 *  - não terminou: abre o aviso dentro do app; se terminar com ele aberto, mostra "Tudo salvo" e sai.
 * Fechar ou recarregar a aba usa o aviso do navegador.
 * `bypass.current = true` libera uma saída de propósito (ex.: excluir a rotina). Renomear troca a URL sem bloquear.
 */
export function useLeaveGuard(busy: boolean) {
  const bypass = useRef(false)
  const [phase, setPhase] = useState<LeavePhase>('idle')
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      busy && !bypass.current && !(nextLocation.state as { rename?: boolean } | null)?.rename && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (blocker.state !== 'blocked') {
      setPhase('idle')
      return
    }
    if (busy) {
      void flushNow() // sem esperar o intervalo normal da fila
      if (phase !== 'idle') return
      const t = window.setTimeout(() => setPhase('dialog'), GRACE_MS)
      return () => window.clearTimeout(t)
    }
    if (phase === 'idle') return blocker.proceed()
    if (phase === 'dialog') return setPhase('done')
    const t = window.setTimeout(() => blocker.proceed(), DONE_MS)
    return () => window.clearTimeout(t)
  }, [blocker.state, busy, phase])

  useEffect(() => {
    if (!busy) return
    const onUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [busy])

  return { blocker, bypass, phase }
}

/** Aviso ao sair com mudanças ainda salvando. */
export function LeaveDialog({ done, error, onStay, onLeave }: { done: boolean; error: boolean; onStay: () => void; onLeave: () => void }) {
  const stayRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    stayRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onStay()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      opener?.focus?.()
    }
  }, [])

  return (
    <motion.div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onStay}>
      <motion.div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="sair-titulo"
        aria-describedby="sair-texto"
        className="flex w-full max-w-[420px] flex-col gap-4 rounded-t-[24px] border border-b-0 border-line bg-panel px-5 pt-5 pb-6 sm:rounded-[24px] sm:border-b"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 36 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="sair-titulo" className={`m-0 flex items-center gap-2 text-lg font-bold ${done ? 'text-ok' : ''}`}>
          {done && <Icon name="check" size={18} />}
          {done ? 'Tudo salvo' : 'Ainda salvando'}
        </h2>
        <p id="sair-texto" className="m-0 text-sm text-soft" aria-live="polite">
          {done
            ? 'Pronto, suas mudanças foram salvas. Saindo…'
            : error
              ? 'Não conseguimos salvar na sua conta agora. Sair mesmo assim?'
              : 'Ainda estamos salvando suas mudanças. Sair mesmo assim?'}
        </p>
        {!done && <p className="m-0 text-[13px] text-muted">Se sair, elas continuam guardadas neste aparelho e sobem quando a conexão permitir.</p>}
        <div className={`flex flex-wrap gap-2 ${done ? 'hidden' : ''}`}>
          <button ref={stayRef} type="button" onClick={onStay} className="min-h-11 rounded-full bg-accent px-5 text-sm font-bold text-ink">
            Continuar aqui
          </button>
          <button type="button" onClick={onLeave} className="min-h-11 rounded-full border border-line px-5 text-sm font-semibold text-soft hover:bg-panel-2">
            Sair mesmo assim
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
