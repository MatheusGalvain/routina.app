import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { LATEST_VERSION, formatChangelogDate, unseenEntries, type ChangelogEntry } from '../../data/changelog'
import { setLastSeenVersion, useSession } from '../../sync/session'
import { useShownPet } from '../../store/useCompanion'
import { Pet } from '../pets/Pet'
import { Icon } from '../ui/ui'

/** Lista de itens de uma versão (usada no painel e na página /novidades). */
export function ChangelogItems({ entry }: { entry: ChangelogEntry }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {entry.itens.map((item) => (
        <li key={item} className="flex gap-2.5 text-[14.5px] leading-relaxed text-soft">
          <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

/**
 * Aviso discreto na tela Início quando há versão nova que a pessoa ainda não viu.
 * Abre um painel com o pet apresentando o que mudou; ao fechar, a versão fica marcada como vista no perfil.
 */
export function NewsNotice() {
  const lastSeen = useSession((s) => s.profile?.lastSeenVersion ?? LATEST_VERSION)
  const entries = unseenEntries(lastSeen)
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const close = () => {
    setOpen(false)
    setLastSeenVersion(LATEST_VERSION)
  }

  return (
    <>
      <AnimatePresence>
        {entries.length > 0 && !open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="flex">
            <button
              ref={buttonRef}
              type="button"
              onClick={() => setOpen(true)}
              aria-haspopup="dialog"
              className="group inline-flex min-h-11 items-center gap-2.5 rounded-full border border-noite/30 bg-noite/5 py-1.5 pr-4 pl-2 text-left text-sm text-soft hover:border-noite/60"
            >
              <span className="relative grid h-7 w-7 place-items-center rounded-full bg-noite/15 text-noite">
                <Icon name="sparkle" size={14} />
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-noite" aria-hidden="true" />
              </span>
              <span>
                <strong className="font-semibold">Novidades no Habbit Do</strong>
                <span className="text-muted"> · versão {entries[0].versão}</span>
              </span>
              <Icon name="chevron-right" size={14} className="text-muted group-hover:text-soft" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>{open && <NewsDialog entries={entries} onClose={close} />}</AnimatePresence>
    </>
  )
}

function NewsDialog({ entries, onClose }: { entries: ChangelogEntry[]; onClose: () => void }) {
  const pet = useShownPet('concluido', true)
  const name = pet.isCompanion && pet.name ? pet.name : null

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="novidades-titulo"
        className="flex max-h-full w-full max-w-[520px] flex-col overflow-hidden rounded-[26px] border border-line bg-panel"
        initial={{ y: 24, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 12, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 px-5 pt-5">
          <div className="flex min-w-0 flex-col">
            <span className="font-mono text-[10.5px] tracking-[0.2em] text-noite uppercase">Novidades</span>
            <h2 id="novidades-titulo" className="m-0 text-xl font-extrabold">
              {entries[0].título}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar novidades" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted hover:bg-panel-2 hover:text-soft">
            <Icon name="x" />
          </button>
        </header>

        <div className="flex items-end gap-3 px-5 pt-3">
          <Pet kind={pet.kind} state="concluido" phase={pet.phase} adultDetail={pet.adultDetail} accessories={pet.accessories} size={84} interactive={false} />
          <p className="relative m-0 mb-3 rounded-2xl rounded-bl-md border border-line-2 bg-panel-2 px-4 py-3 text-sm text-soft">
            {name ? `${name} aqui!` : 'Oi!'} Olha só o que mudou no Habbit Do{entries.length > 1 ? ' desde a sua última visita' : ''}.
          </p>
        </div>

        <div className="flex flex-col gap-5 overflow-y-auto px-5 pt-2 pb-5">
          {entries.map((e) => (
            <section key={e.versão} className="flex flex-col gap-2.5">
              <p className="m-0 font-mono text-[11.5px] text-muted">
                Versão {e.versão} · {formatChangelogDate(e.data)}
                {e !== entries[0] && <span className="block font-sans text-sm font-bold text-soft">{e.título}</span>}
              </p>
              <ChangelogItems entry={e} />
            </section>
          ))}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button type="button" autoFocus onClick={onClose} className="min-h-11 rounded-full bg-noite px-5 text-sm font-bold text-ink">
              Entendi
            </button>
            <Link to="/novidades" onClick={onClose} className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-accent hover:underline">
              Ver todas as novidades
            </Link>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
