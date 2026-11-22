import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { create } from 'zustand'
import { HELP, TOUR } from '../../data/help'
import { Icon } from '../ui/ui'
import { HelpPet, useIsMobile } from './HelpButton'

/** Tour pelos "?" principais (Perfil → "Rever o tour"). `index` = parada atual; `null` = fechado. */
export const useTour = create<{ index: number | null; start: () => void; go: (i: number) => void; stop: () => void }>()((set) => ({
  index: null,
  start: () => set({ index: 0 }),
  go: (index) => set({ index }),
  stop: () => set({ index: null }),
}))

type Rect = { top: number; left: number; width: number; height: number }
const PAD = 8
const CARD_W = 340

/**
 * Passeio de 5 paradas pela tela Início. Escurece a tela, destaca o "?" da parada
 * e mostra o pet apontando para ele, com o texto de src/data/help.ts.
 */
export function Tour() {
  const index = useTour((s) => s.index)
  const { go, stop } = useTour.getState()
  const mobile = useIsMobile()
  const cardRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const [rect, setRect] = useState<Rect | null>(null)
  const [cardH, setCardH] = useState(0)

  const stopAt = index === null ? null : TOUR[index]

  // Acha o "?" da parada, rola até ele e acompanha a posição.
  useEffect(() => {
    if (!stopAt) return
    setRect(null)
    let el: HTMLElement | null = null
    const measure = () => {
      if (!el) return
      const r = el.getBoundingClientRect()
      setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 })
    }
    // A tela Início pode estar acabando de abrir: espera um pouco pelo botão.
    const find = window.setTimeout(() => {
      el = document.querySelector<HTMLElement>(`[data-help="${stopAt.key}"]`)
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      measure()
      window.setTimeout(measure, 400)
    }, 120)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.clearTimeout(find)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [stopAt?.key])

  useEffect(() => {
    if (index === null) return
    cardRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') stop()
      if (e.key === 'ArrowRight' && index < TOUR.length - 1) go(index + 1)
      if (e.key === 'ArrowLeft' && index > 0) go(index - 1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [index])

  useLayoutEffect(() => {
    if (cardRef.current) setCardH(cardRef.current.offsetHeight)
  }, [index, rect, mobile])

  if (index === null || !stopAt) return null
  const last = index === TOUR.length - 1

  // Cartão: no celular fica embaixo; no computador, embaixo do "?" ou em cima se não couber.
  let cardStyle: CSSProperties = {}
  let pointUp = true
  if (!mobile && rect) {
    const w = Math.min(CARD_W, window.innerWidth - 32)
    const left = Math.min(Math.max(16, rect.left + rect.width / 2 - w / 2), window.innerWidth - w - 16)
    const below = rect.top + rect.height + 12
    const fitsBelow = below + cardH < window.innerHeight - 16
    pointUp = fitsBelow
    cardStyle = { width: w, left, top: fitsBelow ? below : Math.max(16, rect.top - 12 - cardH) }
  } else if (rect) {
    pointUp = rect.top < window.innerHeight / 2
  }

  return (
    <div className="fixed inset-0 z-[85]" aria-live="polite">
      {/* Fundo escuro com um "furo" no "?" da parada. */}
      <button type="button" aria-label="Sair do tour" tabIndex={-1} onClick={stop} className="absolute inset-0 cursor-default" />
      {rect && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-full ring-2 ring-accent"
          initial={false}
          animate={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
          transition={{ type: 'spring', stiffness: 300, damping: 32 }}
          style={{ boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.62)' }}
        />
      )}
      {!rect && <div aria-hidden="true" className="absolute inset-0 bg-black/60" />}

      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          ref={cardRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className={`absolute flex flex-col gap-3 border border-line-2 bg-panel-2 p-4 shadow-[0_16px_48px_rgba(0,0,0,.55)] outline-none ${
            mobile ? 'inset-x-0 bottom-0 rounded-t-[24px] border-b-0 pb-6' : 'rounded-2xl'
          }`}
          style={mobile ? undefined : { ...cardStyle, ...(rect ? {} : { top: -9999 }) }}
          initial={{ opacity: 0, y: mobile ? 24 : 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div className="flex items-start gap-3">
            <span className="relative shrink-0">
              <HelpPet size={52} />
              {/* O pet apontando para o "?". */}
              <motion.span
                aria-hidden="true"
                className="absolute -right-2 text-accent"
                style={{ [pointUp ? 'top' : 'bottom']: -6, rotate: pointUp ? 0 : 180 }}
                animate={{ y: pointUp ? [0, -4, 0] : [0, 4, 0] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
              >
                <Icon name="hand" size={18} />
              </motion.span>
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="font-mono text-[11px] tracking-wider text-muted uppercase">
                {index + 1} de {TOUR.length}
              </span>
              <h2 id={titleId} className="m-0 text-[15px] font-bold">
                {HELP[stopAt.key].title}
              </h2>
              <p className="m-0 text-[13.5px] leading-snug text-soft">{stopAt.text}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button type="button" onClick={stop} className="min-h-11 rounded-full px-3 text-sm font-semibold text-muted hover:text-soft">
              Sair
            </button>
            <div className="flex gap-2">
              {index > 0 && (
                <button type="button" onClick={() => go(index - 1)} className="min-h-11 rounded-full border border-line px-4 text-sm font-semibold text-soft hover:bg-panel">
                  Voltar
                </button>
              )}
              <button type="button" onClick={() => (last ? stop() : go(index + 1))} className="min-h-11 rounded-full bg-accent px-5 text-sm font-bold text-ink">
                {last ? 'Concluir' : 'Próximo'}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
