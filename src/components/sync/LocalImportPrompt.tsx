import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { answerLocalImport, importLegacy, useSession } from '../../sync/session'
import { readLegacy } from '../../sync/legacy'
import { Pet } from '../pets/Pet'

type Step = 'ask' | 'sending' | 'done' | 'queued'

/**
 * No primeiro login, se este aparelho tem dados do formato antigo, pergunta se a pessoa
 * quer levar para a conta. A resposta fica salva na conta: não pergunta de novo.
 */
export function LocalImportPrompt() {
  const profile = useSession((s) => s.profile)
  const legacy = useMemo(() => (profile && !profile.localImportAnswered ? readLegacy() : null), [profile])
  const [step, setStep] = useState<Step>('ask')
  const [closed, setClosed] = useState(false)

  if (!legacy || closed) return null
  const routines = legacy.routines.length
  const days = Object.keys(legacy.logs).length

  const accept = async () => {
    setStep('sending')
    const ok = await importLegacy(legacy)
    setStep(ok ? 'done' : 'queued')
  }

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[85] grid place-items-center bg-black/75 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-title"
          className="flex w-full max-w-[420px] flex-col items-center gap-4 rounded-[26px] border border-line bg-panel px-6 pt-6 pb-6 text-center"
          initial={{ scale: 0.92, y: 16 }}
          animate={{ scale: 1, y: 0 }}
        >
          <Pet kind="gatinho" state={step === 'done' ? 'concluido' : step === 'sending' ? 'foco' : 'neutro'} size={96} interactive={false} />

          {step === 'ask' || step === 'sending' ? (
            <>
              <h2 id="import-title" className="m-0 text-lg font-extrabold">
                Encontramos rotinas salvas neste aparelho. Quer levar para a sua conta?
              </h2>
              <p className="m-0 text-sm text-muted">
                {routines} {routines === 1 ? 'rotina' : 'rotinas'} e {days} {days === 1 ? 'dia' : 'dias'} de registros
                {legacy.companion.kind ? ', além do seu pet favorito' : ''}. O que já está na sua conta não é apagado.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  autoFocus
                  disabled={step === 'sending'}
                  onClick={accept}
                  className="rounded-full bg-ok px-5 py-2.5 text-sm font-bold text-ink disabled:opacity-60"
                >
                  {step === 'sending' ? 'Enviando…' : 'Levar para a minha conta'}
                </button>
                <button
                  type="button"
                  disabled={step === 'sending'}
                  onClick={() => {
                    answerLocalImport()
                    setClosed(true)
                  }}
                  className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-soft hover:bg-panel-2 disabled:opacity-60"
                >
                  Agora não
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 id="import-title" className="m-0 text-lg font-extrabold">
                {step === 'done' ? 'Pronto! Está tudo na sua conta.' : 'Quase lá!'}
              </h2>
              <p className="m-0 text-sm text-muted">
                {step === 'done'
                  ? 'Agora suas rotinas aparecem em qualquer aparelho em que você entrar.'
                  : 'Seus dados já estão no app e vão subir para a conta assim que a conexão voltar.'}
              </p>
              <button type="button" autoFocus onClick={() => setClosed(true)} className="rounded-full bg-ok px-5 py-2.5 text-sm font-bold text-ink">
                Continuar
              </button>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
