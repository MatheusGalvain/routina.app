import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { flushNow, useSyncStatus } from '../../sync/outbox'
import { useSession } from '../../sync/session'

/**
 * Aviso discreto no canto da tela quando uma gravação falhou (e será tentada de novo),
 * quando o app abriu sem conexão ou quando o servidor recusou alguma mudança.
 */
export function SyncNotice() {
  const { state, retryAt, pending, dropped } = useSyncStatus()
  const offline = useSession((s) => s.offline)
  const [now, setNow] = useState(Date.now())
  const [hideDropped, setHideDropped] = useState(0)

  useEffect(() => {
    if (state !== 'retrying') return
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [state])

  let text: string | null = null
  if (state === 'retrying') {
    const secs = retryAt ? Math.max(0, Math.ceil((retryAt - now) / 1000)) : 0
    text = `Não deu para salvar ${pending === 1 ? '1 mudança' : `${pending} mudanças`} na sua conta. Elas estão guardadas aqui; tentando de novo${secs ? ` em ${secs}s` : ''}.`
  } else if (offline && pending > 0) text = 'Sem conexão com a sua conta. Suas mudanças ficam guardadas aqui e sobem quando a conexão voltar.'
  else if (offline) text = 'Sem conexão: mostrando os dados salvos neste aparelho.'
  else if (dropped > hideDropped) text = 'Uma mudança não pôde ser salva porque tinha um dado inválido.'

  return (
    <AnimatePresence>
      {text && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className="fixed bottom-3 left-3 z-[55] flex max-w-[min(420px,calc(100vw-90px))] items-center gap-3 rounded-2xl border border-[#4A3A12] bg-[#17140C]/95 px-3.5 py-2.5 text-[12.5px] text-[#F5DFA6] shadow-[0_8px_24px_rgba(0,0,0,.4)] backdrop-blur"
        >
          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-alerta" />
          <span className="flex-1">{text}</span>
          {state === 'retrying' || (offline && pending > 0) ? (
            <button type="button" onClick={() => void flushNow()} className="shrink-0 rounded-full border border-[#6B5420] px-2.5 py-1 font-semibold hover:bg-[#2A2210]">
              Tentar agora
            </button>
          ) : dropped > hideDropped ? (
            <button type="button" onClick={() => setHideDropped(dropped)} className="shrink-0 rounded-full border border-[#6B5420] px-2.5 py-1 font-semibold hover:bg-[#2A2210]">
              Ok
            </button>
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
