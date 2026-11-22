import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { NAME_MAX, nameFromEmail, setDisplayName, useSession } from '../../sync/session'
import { readLegacy } from '../../sync/legacy'
import { useAuth } from '../../store/useAuth'
import { Pet } from '../pets/Pet'

/**
 * No primeiro login, sem nome de exibição: "Como quer ser chamado?", com opção de pular.
 * Pulando, fica a parte do e-mail antes do @ (e não pergunta de novo, em nenhum aparelho).
 * Espera a pergunta de importar dados antigos, se ela estiver aberta.
 */
export function NamePrompt() {
  const profile = useSession((s) => s.profile)
  const email = useAuth((s) => s.session?.user.email)
  const importOpen = useMemo(() => !!profile && !profile.localImportAnswered && !!readLegacy(), [profile])
  const [name, setName] = useState('')

  const open = !!profile && profile.displayName === null && !importOpen
  const fallback = nameFromEmail(email)

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[84] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.form
            role="dialog"
            aria-modal="true"
            aria-labelledby="name-title"
            className="flex w-full max-w-[380px] flex-col items-center gap-4 rounded-[26px] border border-line bg-panel px-6 pt-6 pb-6 text-center"
            initial={{ scale: 0.94, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0 }}
            onSubmit={(e) => {
              e.preventDefault()
              setDisplayName(name)
            }}
          >
            <Pet kind="gatinho" state="neutro" size={84} interactive={false} />
            <h2 id="name-title" className="m-0 text-xl font-extrabold">
              Como quer ser chamado?
            </h2>
            <label className="flex w-full flex-col gap-1.5 text-left">
              <span className="text-sm text-muted">Seu nome</span>
              <input
                autoFocus
                value={name}
                maxLength={NAME_MAX}
                onChange={(e) => setName(e.target.value)}
                placeholder={fallback}
                autoComplete="nickname"
                className="min-h-11 rounded-xl border border-line bg-ink px-3 text-soft placeholder:text-muted"
              />
            </label>
            <div className="flex w-full flex-wrap justify-center gap-2">
              <button type="submit" disabled={!name.trim()} className="min-h-11 rounded-full bg-accent px-5 text-sm font-bold text-ink disabled:opacity-40">
                Salvar
              </button>
              <button type="button" onClick={() => setDisplayName('')} className="min-h-11 rounded-full border border-line px-5 text-sm font-semibold text-soft hover:bg-panel-2">
                Pular
              </button>
            </div>
            <p className="m-0 text-[12.5px] text-muted">Dá para mudar depois, no seu perfil.</p>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
