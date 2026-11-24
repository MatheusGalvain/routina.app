import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import type { BasePetKind } from '../../types'
import { Icon } from '../ui/ui'
import { Pet } from './Pet'
import { PETS, textColor, type EyeStyle } from './pets'
import { STORIES } from './stories'
import { Deco } from './Deco'
import { useRotina } from '../../store/useRotina'

/** Posições dos enfeites ao redor do pet (em % do palco). */
const DECO_SPOTS = [
  { left: '14%', top: '18%' },
  { left: '80%', top: '22%' },
  { left: '22%', top: '68%' },
  { left: '74%', top: '64%' },
]

/**
 * Tela de historinha interativa de um pet: cenas com texto,
 * toques no pet e escolhas que mudam a reação dele.
 */
export function PetStory({ kind, onClose }: { kind: BasePetKind; onClose: () => void }) {
  const pet = PETS[kind]
  const story = STORIES[kind]
  const accent = textColor(pet.color)

  const markStoryRead = useRotina((s) => s.markStoryRead)
  const alreadyRead = useRotina((s) => !!s.storyReads[kind])
  const [index, setIndex] = useState(0)
  const [taps, setTaps] = useState(0)
  const [choice, setChoice] = useState<number | null>(null)

  const scene = story.scenes[index]
  const action = scene.action

  const tapDone = action.type === 'tap' && taps >= action.times
  const chosen = action.type === 'choice' && choice !== null ? action.options[choice] : null
  const canContinue = action.type === 'next' || tapDone || chosen !== null

  const mood: EyeStyle | undefined = chosen?.mood ?? (tapDone && scene.mood === 'closed' ? 'open' : scene.mood)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const go = (i: number) => {
    setIndex(i)
    setTaps(0)
    setChoice(null)
  }

  const onPoke = () => {
    if (action.type === 'tap' && taps < action.times) setTaps((t) => t + 1)
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={story.title}
        className="flex max-h-full w-full max-w-[520px] flex-col overflow-hidden rounded-[26px] border border-line bg-panel"
        initial={{ y: 30, scale: 0.96 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
          <div className="flex min-w-0 flex-col">
            <span className="flex items-center gap-2 font-mono text-[10.5px] tracking-[0.2em] uppercase" style={{ color: accent }}>
              Historinha · {pet.name}
              {alreadyRead && (
                <span className="inline-flex items-center gap-0.5 font-sans text-[11px] font-semibold tracking-normal text-ok normal-case">
                  <Icon name="check" size={11} /> Lida
                </span>
              )}
            </span>
            <h2 className="m-0 truncate text-lg font-bold">{story.title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar história" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted hover:bg-panel-2 hover:text-soft">
            <Icon name="x" />
          </button>
        </header>

        {/* Palco */}
        <motion.div
          className="relative mx-5 grid h-[230px] shrink-0 place-items-center overflow-hidden rounded-[20px]"
          animate={{ background: `linear-gradient(180deg, ${scene.sky[0]} 0%, ${scene.sky[1]} 100%)` }}
          transition={{ duration: 0.6 }}
        >
          <AnimatePresence>
            {(scene.deco ?? []).map((d, i) => (
              <motion.span
                key={`${index}-${i}`}
                aria-hidden="true"
                className="absolute select-none"
                style={DECO_SPOTS[i % DECO_SPOTS.length]}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: 0.9, scale: 1, y: [0, -6, 0] }}
                exit={{ opacity: 0, scale: 0.4 }}
                transition={{ y: { duration: 2.4 + i * 0.4, repeat: Infinity, ease: 'easeInOut' }, default: { duration: 0.35, delay: i * 0.08 } }}
              >
                <Deco id={d} />
              </motion.span>
            ))}
          </AnimatePresence>

          <Pet kind={kind} size={130} mood={mood} onPoke={onPoke} />

          {action.type === 'tap' && (
            <div className="absolute bottom-3 flex gap-1.5" aria-hidden="true">
              {Array.from({ length: action.times }, (_, i) => (
                <span key={i} className="h-2 w-2 rounded-full transition-colors" style={{ background: i < taps ? accent : 'color-mix(in srgb, var(--color-fg) 20%, transparent)' }} />
              ))}
            </div>
          )}
        </motion.div>

        {/* Texto e interação */}
        <div className="flex min-h-[220px] flex-col gap-4 overflow-y-auto px-5 pt-4 pb-5">
          <AnimatePresence mode="wait">
            <motion.p
              key={index}
              className="m-0 text-[15.5px] leading-relaxed text-soft"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {scene.text}
            </motion.p>
          </AnimatePresence>

          {action.type === 'tap' && (
            <p aria-live="polite" className="m-0 flex items-center gap-1.5 text-sm font-semibold" style={{ color: tapDone ? accent : undefined }}>
              {tapDone ? (
                action.done
              ) : (
                <>
                  <Icon name="hand" size={16} /> {action.hint} ({taps}/{action.times})
                </>
              )}
            </p>
          )}

          {action.type === 'choice' && (
            <div className="flex flex-col gap-2">
              {action.options.map((o, i) => {
                const selected = choice === i
                return (
                  <button
                    key={o.label}
                    type="button"
                    disabled={choice !== null && !selected}
                    onClick={() => setChoice(i)}
                    className="rounded-[14px] border px-4 py-2.5 text-left text-sm font-semibold transition-colors disabled:opacity-35"
                    style={{ borderColor: selected ? accent : 'var(--color-line)', background: selected ? `${pet.color}1f` : 'var(--color-panel-2)' }}
                  >
                    {o.label}
                  </button>
                )
              })}
              <AnimatePresence>
                {chosen && (
                  <motion.p aria-live="polite" className="m-0 text-sm font-semibold" style={{ color: accent }} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                    {chosen.reply}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          )}

          {action.type === 'end' && (
            <div className="rounded-[14px] border px-4 py-3" style={{ borderColor: `${pet.color}55`, background: `${pet.color}14` }}>
              <span className="font-mono text-[10.5px] tracking-[0.2em] uppercase" style={{ color: accent }}>
                Moral da história
              </span>
              <p className="m-0 mt-1 font-semibold">{action.moral}</p>
            </div>
          )}

          {/* Rodapé: progresso + botões */}
          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex gap-1.5" aria-label={`Cena ${index + 1} de ${story.scenes.length}`}>
              {story.scenes.map((_, i) => (
                <span key={i} className="h-1.5 rounded-full transition-all" style={{ width: i === index ? 18 : 6, background: i <= index ? accent : 'var(--color-line-2)' }} />
              ))}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {index > 0 && (
                <button type="button" onClick={() => go(index - 1)} aria-label="Cena anterior" className="grid h-10 w-10 place-items-center rounded-full border border-line text-muted hover:text-soft">
                  <Icon name="chevron-left" />
                </button>
              )}
              {action.type === 'end' ? (
                <>
                  <button type="button" onClick={() => go(0)} className="min-h-10 rounded-full border border-line px-4 text-sm font-semibold text-soft hover:bg-panel-2">
                    Ler de novo
                  </button>
                  {/* Concluir: marca a história como lida e fecha. */}
                  <button
                    type="button"
                    autoFocus
                    onClick={() => {
                      markStoryRead(kind)
                      onClose()
                    }}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm font-bold text-ink"
                    style={{ background: accent }}
                  >
                    <Icon name="check" size={15} /> Concluir
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={!canContinue}
                  onClick={() => go(index + 1)}
                  className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold text-ink transition-opacity disabled:opacity-30"
                  style={{ background: accent }}
                >
                  {action.type === 'next' && action.label ? action.label : 'Continuar'}
                  <Icon name="chevron-right" size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
