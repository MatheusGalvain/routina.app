import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { HELP, type HelpEntry, type HelpKey } from '../../data/help'
import { useShownPet } from '../../store/useCompanion'
import { Pet } from '../pets/Pet'

/** Celular: abaixo de 640px o balão vira gaveta. */
export function useIsMobile() {
  const query = '(max-width: 639px)'
  const [mobile, setMobile] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setMobile(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return mobile
}

/** O pet que explica: o favorito acordado, ou o gatinho sem favorito. */
export function HelpPet({ size = 48 }: { size?: number }) {
  const pet = useShownPet('neutro', true)
  return <Pet kind={pet.kind} state="neutro" phase={pet.phase} accessories={pet.accessories} size={size} interactive={false} />
}

/** Corpo do balão: o pet, o texto e os exemplos (tipos de bloco). */
export function HelpContent({ entry, titleId }: { entry: HelpEntry; titleId: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="shrink-0">
        <HelpPet />
      </span>
      <div className="flex min-w-0 flex-col gap-1.5">
        <h2 id={titleId} className="m-0 text-[15px] font-bold">
          {entry.title}
        </h2>
        {entry.text.map((t) => (
          <p key={t} className="m-0 text-[13.5px] leading-snug text-soft">
            {t}
          </p>
        ))}
        {entry.examples && (
          <ul className="m-0 mt-1 flex list-none flex-col gap-1.5 p-0">
            {entry.examples.map((e) => (
              <li key={e.type} className="rounded-xl bg-ink px-3 py-2 text-[13px] leading-snug">
                <strong className="mr-1.5 font-mono text-[11px] tracking-wider text-accent uppercase">{e.name}</strong>
                <span className="text-soft">{e.example}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

const WIDTH = 320
const GAP = 10

/** Balão ancorado no botão "?" (computador) ou gaveta (celular). Fecha com Esc, tocando fora ou em "Entendi". */
function HelpBubble({ entry, anchor, onClose }: { entry: HelpEntry; anchor: RefObject<HTMLButtonElement | null>; onClose: () => void }) {
  const mobile = useIsMobile()
  const boxRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  // Posição: embaixo do botão, ou em cima se não couber; sempre dentro da tela.
  const place = () => {
    const a = anchor.current?.getBoundingClientRect()
    const box = boxRef.current
    if (!a || !box) return
    const w = Math.min(WIDTH, window.innerWidth - 32)
    const h = box.offsetHeight
    const left = Math.min(Math.max(16, a.left + a.width / 2 - w / 2), window.innerWidth - w - 16)
    const below = a.bottom + GAP
    const top = below + h > window.innerHeight - 16 && a.top - GAP - h > 16 ? a.top - GAP - h : below
    setPos({ top, left })
  }

  useLayoutEffect(() => {
    if (!mobile) place()
  }, [mobile])

  useEffect(() => {
    boxRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (boxRef.current?.contains(t) || anchor.current?.contains(t)) return
      onClose()
    }
    const onMove = () => !mobile && place()
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('resize', onMove)
    window.addEventListener('scroll', onMove, true)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('resize', onMove)
      window.removeEventListener('scroll', onMove, true)
    }
  }, [mobile])

  const body = (
    <>
      <HelpContent entry={entry} titleId={titleId} />
      <button type="button" onClick={onClose} className="min-h-11 self-end rounded-full bg-accent px-5 text-sm font-bold text-ink">
        Entendi
      </button>
    </>
  )

  if (mobile)
    return createPortal(
      <motion.div className="fixed inset-0 z-[80] flex items-end bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div
          ref={boxRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="flex max-h-[80vh] w-full flex-col gap-4 overflow-y-auto rounded-t-[24px] border border-b-0 border-line bg-panel px-4 pt-3 pb-6 outline-none"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 38 }}
        >
          <div className="mx-auto h-1 w-10 rounded-full bg-line-2" aria-hidden="true" />
          {body}
        </motion.div>
      </motion.div>,
      document.body,
    )

  return createPortal(
    <motion.div
      ref={boxRef}
      role="dialog"
      aria-labelledby={titleId}
      tabIndex={-1}
      className="fixed z-[80] flex flex-col gap-3 rounded-2xl border border-line-2 bg-panel-2 p-4 shadow-[0_16px_48px_rgba(0,0,0,.55)] outline-none"
      style={{ width: Math.min(WIDTH, window.innerWidth - 32), top: pos?.top ?? -9999, left: pos?.left ?? 0 }}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.14 }}
    >
      {body}
    </motion.div>,
    document.body,
  )
}

/** Botãozinho "?" ao lado de um título. Os textos vêm de src/data/help.ts. */
export function HelpButton({ k, className = '' }: { k: HelpKey; className?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)
  const close = () => {
    setOpen(false)
    ref.current?.focus()
  }
  return (
    <>
      <button
        ref={ref}
        type="button"
        data-help={k}
        aria-label="O que é isso?"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => (open ? close() : setOpen(true))}
        className={`relative inline-grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line-2 text-[12px] font-bold text-muted transition-colors before:absolute before:-inset-2.5 before:content-[''] hover:border-accent hover:text-accent ${open ? 'border-accent text-accent' : ''} ${className}`}
      >
        ?
      </button>
      <AnimatePresence>{open && <HelpBubble entry={HELP[k]} anchor={ref} onClose={close} />}</AnimatePresence>
    </>
  )
}
