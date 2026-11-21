import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { usePetEvents, type PetEvent } from '../../store/usePetEvents'
import { useCompanionView } from '../../store/useCompanion'
import { useRotina } from '../../store/useRotina'
import { ACCESSORY_BY_ID } from '../../data/accessories'
import { PHASES } from '../../lib/companion'
import { Pet } from './Pet'
import { SPECIES, STATE_STYLE, textColor } from './pets'

const PARTICLES = Array.from({ length: 18 }, (_, i) => {
  const angle = (i / 18) * Math.PI * 2 + (i % 2) * 0.2
  const dist = 110 + (i % 3) * 30
  return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, size: 5 + (i % 4) * 2, star: i % 3 === 0, delay: (i % 5) * 0.04 }
})

const COLORS = ['#FFD34D', '#22C55E', '#5AA7FF', '#FB7185', '#C4B5FD']

/** Comemorações do companheiro: nova fase e acessório desbloqueado. Uma por vez, da fila. */
export function PetCelebration() {
  const event = usePetEvents((s) => s.queue[0])
  const shift = usePetEvents((s) => s.shift)
  return <AnimatePresence>{event && <Celebration key={event.id} event={event} onClose={shift} />}</AnimatePresence>
}

function Celebration({ event, onClose }: { event: PetEvent; onClose: () => void }) {
  const view = useCompanionView()
  const kind = view.kind ?? 'gatinho'
  const species = SPECIES[kind]
  const name = view.name || species.name
  const look = STATE_STYLE.concluido

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  let kicker: string
  let title: string
  let message: string
  let accessories = view.accessories
  let phase = view.phase
  const item = event.type === 'unlock' ? ACCESSORY_BY_ID[event.accessory] : null

  if (event.type === 'phase') {
    phase = event.phase
    const phaseName = PHASES.find((p) => p.id === event.phase)?.name ?? ''
    kicker = 'Nova fase'
    title = `${name} agora é ${phaseName.toLowerCase()}!`
    message =
      event.phase === 'adulto'
        ? `Virei adulto e ganhei ${species.adultDetail}! A gente chegou longe juntos.`
        : event.phase === 'jovem'
          ? 'Olha só, cresci! Obrigado por cuidar de mim todos esses dias.'
          : 'Oi! Vamos crescer juntos, um dia de cada vez.'
  } else {
    kicker = 'Acessório desbloqueado'
    title = item!.name
    message = `Olha como ficou! Ganhei por: ${item!.hint.toLowerCase()}.`
    // Mostra o pet já usando o item (substituindo o que estiver no mesmo slot).
    accessories = [...view.accessories.filter((a) => ACCESSORY_BY_ID[a].slot !== item!.slot), item!.id]
  }

  return (
    <motion.div
      className="fixed inset-0 z-[80] grid place-items-center bg-black/75 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="celebration-title"
        className="relative flex w-full max-w-[400px] flex-col items-center gap-3 overflow-hidden rounded-[26px] border border-line bg-panel px-6 pt-6 pb-6 text-center"
        initial={{ scale: 0.85, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative grid h-[210px] w-full place-items-center">
          {/* Brilho */}
          <motion.div
            aria-hidden="true"
            className="absolute h-[200px] w-[200px] rounded-full"
            style={{ background: `radial-gradient(circle, ${look.glow} 0%, transparent 68%)` }}
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: [0.2, 1.25, 1], opacity: [0, 1, 0.85] }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
          />
          <motion.div
            aria-hidden="true"
            className="absolute h-[170px] w-[170px] rounded-full border-2"
            style={{ borderColor: '#FFD34D66' }}
            initial={{ scale: 0.4, opacity: 1 }}
            animate={{ scale: 1.6, opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut', repeat: 2, repeatDelay: 0.6 }}
          />
          {/* Partículas */}
          <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox="-175 -105 350 210">
            {PARTICLES.map((p, i) => (
              <motion.path
                key={i}
                d={
                  p.star
                    ? `M0,${-p.size} L${p.size * 0.3},${-p.size * 0.3} L${p.size},0 L${p.size * 0.3},${p.size * 0.3} L0,${p.size} L${-p.size * 0.3},${p.size * 0.3} L${-p.size},0 L${-p.size * 0.3},${-p.size * 0.3} Z`
                    : `M0,0 m${-p.size / 2},0 a${p.size / 2},${p.size / 2} 0 1,0 ${p.size},0 a${p.size / 2},${p.size / 2} 0 1,0 ${-p.size},0`
                }
                fill={COLORS[i % COLORS.length]}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0.3 }}
                animate={{ x: p.x, y: p.y, opacity: [0, 1, 0], scale: [0.3, 1, 0.6] }}
                transition={{ duration: 1.4, delay: 0.15 + p.delay, ease: 'easeOut' }}
              />
            ))}
          </svg>
          <motion.div initial={{ scale: 0.6 }} animate={{ scale: [0.6, 1.12, 1] }} transition={{ duration: 0.7, delay: 0.1 }}>
            <Pet kind={kind} state="concluido" phase={phase} accessories={accessories} size={150} interactive={false} />
          </motion.div>
        </div>

        <p className="m-0 font-mono text-[11px] tracking-[0.2em] uppercase" style={{ color: textColor('#FFD34D') }}>
          {kicker}
        </p>
        <h2 id="celebration-title" className="m-0 text-xl font-extrabold">
          {title}
        </h2>
        <p className="m-0 w-full rounded-2xl border border-[#2A3242] bg-panel-2 px-4 py-3 text-sm text-soft">{message}</p>

        <div className="mt-1 flex flex-wrap justify-center gap-2">
          {item && view.kind ? (
            <>
              <button
                type="button"
                autoFocus
                onClick={() => {
                  useRotina.getState().equip(item.slot, item.id)
                  onClose()
                }}
                className="rounded-full bg-ok px-5 py-2.5 text-sm font-bold text-[#06210F]"
              >
                Usar agora
              </button>
              <button type="button" onClick={onClose} className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-soft hover:bg-panel-2">
                Depois
              </button>
            </>
          ) : (
            <button type="button" autoFocus onClick={onClose} className="rounded-full bg-ok px-5 py-2.5 text-sm font-bold text-[#06210F]">
              Oba!
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
