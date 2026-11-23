import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePetEvents, type PetEvent } from '../../store/usePetEvents'
import { chooseFavorite, useCompanionView } from '../../store/useCompanion'
import { useRotina } from '../../store/useRotina'
import { ACCESSORY_BY_ID } from '../../data/accessories'
import { PHASES } from '../../lib/companion'
import { Pet } from './Pet'
import { TIERS, Trophy, trophyTitle, type TrophyId, type TrophyTier } from '../../data/trophies'
import { expose } from '../../lib/corner'
import { chooseScene, currentLayout, currentScene, writeLayout } from '../../store/useCorner'
import { ITEM_BY_ID, SCENE_BY_ID, SceneItem, type SceneItemId } from '../../data/scenes'
import { SPECIES, STATE_STYLE, textColor } from './pets'
import { EVENT_BY_ID, eventLabel } from '../../data/events'
import { EventTrophyArt } from '../../data/eventArt'

const PARTICLES = Array.from({ length: 18 }, (_, i) => {
  const angle = (i / 18) * Math.PI * 2 + (i % 2) * 0.2
  const dist = 110 + (i % 3) * 30
  return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, size: 5 + (i % 4) * 2, star: i % 3 === 0, delay: (i % 5) * 0.04 }
})

const COLORS = ['var(--color-alerta)', 'var(--color-ok)', 'var(--color-accent)', 'var(--color-area-social)', 'var(--color-noite)']

/** Comemorações do companheiro: nova fase e acessório desbloqueado. Uma por vez, da fila. */
export function PetCelebration() {
  const event = usePetEvents((s) => s.queue[0])
  const shift = usePetEvents((s) => s.shift)
  return (
    <AnimatePresence>
      {event &&
        (event.type === 'secret' ? (
          <SecretArrival key={event.id} onClose={shift} />
        ) : event.type === 'trophy' ? (
          <TrophyArrival key={event.id} trophy={event.trophy} tier={event.tier} onClose={shift} />
        ) : event.type === 'item' ? (
          <ItemArrival key={event.id} item={event.item} onClose={shift} />
        ) : event.type === 'event-trophy' ? (
          <EventTrophyArrival key={event.id} eventId={event.eventId} onClose={shift} />
        ) : (
          <Celebration key={event.id} event={event} onClose={shift} />
        ))}
    </AnimatePresence>
  )
}

/** Aviso de troféu novo: o troféu entra caindo devagar, com um brilho na cor do nível. */
function TrophyArrival({ trophy, tier, onClose }: { trophy: TrophyId; tier: TrophyTier; onClose: () => void }) {
  const color = TIERS[tier].color

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

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
        aria-labelledby="trophy-title"
        className="relative flex w-full max-w-[380px] flex-col items-center gap-3 overflow-hidden rounded-[26px] border border-line bg-panel px-6 pt-6 pb-6 text-center"
        initial={{ scale: 0.9, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative grid h-[170px] w-full place-items-center">
          <motion.div
            aria-hidden="true"
            className="absolute h-[160px] w-[160px] rounded-full"
            style={{ background: `radial-gradient(circle, ${color}40 0%, transparent 68%)` }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.35, ease: 'easeOut' }}
          />
          <motion.div
            initial={{ y: -90, opacity: 0, rotate: -12, scale: 0.7 }}
            animate={{ y: 0, opacity: 1, rotate: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 170, damping: 13, delay: 0.15 }}
          >
            <Trophy id={trophy} tier={tier} size={120} />
          </motion.div>
          <motion.div
            aria-hidden="true"
            className="absolute bottom-[14px] h-[8px] w-[90px] rounded-[50%] bg-black/50 blur-[3px]"
            initial={{ scaleX: 0.3, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.35 }}
          />
        </div>
        <h2 id="trophy-title" className="m-0 text-xl font-extrabold">
          Novo troféu: {trophyTitle(trophy, tier)}
        </h2>
        <div className="mt-1 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            autoFocus
            onClick={() => {
              writeLayout(expose(currentLayout(), { kind: 'trophy', id: trophy, tier }))
              onClose()
            }}
            className="min-h-11 rounded-full px-5 py-2.5 text-sm font-bold text-ink"
            style={{ background: tier === 4 ? 'var(--color-noite)' : color }}
          >
            Expor no cantinho
          </button>
          <button type="button" onClick={onClose} className="min-h-11 rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-soft hover:bg-panel-2">
            Depois
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/** Aviso de troféu de evento (um nível só): entra caindo, com um brilho na cor do evento. */
function EventTrophyArrival({ eventId, onClose }: { eventId: string; onClose: () => void }) {
  const navigate = useNavigate()
  const ev = EVENT_BY_ID[eventId]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!ev) return null
  const t = ev.trophy
  return (
    <motion.div className="fixed inset-0 z-[80] grid place-items-center bg-black/75 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-trophy-title"
        className="relative flex w-full max-w-[380px] flex-col items-center gap-3 overflow-hidden rounded-[26px] border border-line bg-panel px-6 pt-6 pb-6 text-center"
        initial={{ scale: 0.9, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative grid h-[170px] w-full place-items-center">
          <motion.div
            aria-hidden="true"
            className="absolute h-[160px] w-[160px] rounded-full"
            style={{ background: `radial-gradient(circle, ${t.color}40 0%, transparent 68%)` }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.35, ease: 'easeOut' }}
          />
          <motion.div initial={{ y: -90, opacity: 0, rotate: -12, scale: 0.7 }} animate={{ y: 0, opacity: 1, rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 170, damping: 13, delay: 0.15 }}>
            <EventTrophyArt draw={t.draw} color={t.color} size={120} />
          </motion.div>
        </div>
        <p className="m-0 font-mono text-[11px] tracking-[0.2em] uppercase" style={{ color: ev.color }}>
          {eventLabel(ev)}
        </p>
        <h2 id="event-trophy-title" className="m-0 text-xl font-extrabold">
          Novo troféu: {t.name}
        </h2>
        <p className="m-0 text-sm text-muted">Fica na sua coleção para sempre.</p>
        <div className="mt-1 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            autoFocus
            onClick={() => {
              onClose()
              navigate('/pet#colecao')
            }}
            className="min-h-11 rounded-full px-5 py-2.5 text-sm font-bold text-ink"
            style={{ background: t.color }}
          >
            Ver na coleção
          </button>
          <button type="button" onClick={onClose} className="min-h-11 rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-soft hover:bg-panel-2">
            Depois
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/**
 * Aviso de item de cenário novo (mesmo jeito do troféu): o item entra caindo, com um brilho.
 * "Colocar no cantinho" põe o item no cenário dele e mostra esse cenário.
 */
function ItemArrival({ item, onClose }: { item: SceneItemId; onClose: () => void }) {
  const def = ITEM_BY_ID[item]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

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
        aria-labelledby="item-title"
        aria-describedby="item-desc"
        className="relative flex w-full max-w-[380px] flex-col items-center gap-3 overflow-hidden rounded-[26px] border border-line bg-panel px-6 pt-6 pb-6 text-center"
        initial={{ scale: 0.9, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative grid h-[170px] w-full place-items-center">
          <motion.div
            aria-hidden="true"
            className="absolute h-[160px] w-[160px] rounded-full"
            style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--color-noite) 30%, transparent) 0%, transparent 68%)' }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.35, ease: 'easeOut' }}
          />
          <motion.div
            initial={{ y: -90, opacity: 0, rotate: -12, scale: 0.7 }}
            animate={{ y: 0, opacity: 1, rotate: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 170, damping: 13, delay: 0.15 }}
          >
            <SceneItem id={item} size={120} />
          </motion.div>
          <motion.div
            aria-hidden="true"
            className="absolute bottom-[14px] h-[8px] w-[90px] rounded-[50%] bg-black/50 blur-[3px]"
            initial={{ scaleX: 0.3, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.35 }}
          />
        </div>
        <h2 id="item-title" className="m-0 text-xl font-extrabold">
          Novo item: {def.name}
        </h2>
        <p id="item-desc" className="m-0 text-sm text-muted">
          Do cenário {SCENE_BY_ID[def.scene].name}. {def.hint}.
        </p>
        <div className="mt-1 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            autoFocus
            onClick={() => {
              writeLayout(expose(currentLayout(def.scene), { kind: 'item', id: item }), def.scene)
              if (currentScene() !== def.scene) chooseScene(def.scene)
              onClose()
            }}
            className="min-h-11 rounded-full bg-noite px-5 py-2.5 text-sm font-bold text-ink"
          >
            Colocar no cantinho
          </button>
          <button type="button" onClick={onClose} className="min-h-11 rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-soft hover:bg-panel-2">
            Depois
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// Poeira de estrela que se espalha devagar quando a silhueta acende.
const DUST = Array.from({ length: 16 }, (_, i) => {
  const angle = (i / 16) * Math.PI * 2 + (i % 3) * 0.15
  const dist = 80 + (i % 4) * 22
  return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist * 0.8, size: 2.5 + (i % 3) * 1.5, star: i % 2 === 0, delay: (i % 6) * 0.06 }
})
const DUST_COLORS = ['var(--color-fg)', 'var(--color-area-mente)', 'var(--color-accent)', 'var(--color-area-social)']

/**
 * Chegada do coelho: a silhueta acende, a poeira de estrela se espalha e ele dá um pulinho.
 * Tom calmo e sem rótulos ("raro", "lendário"...): a pessoa percebe sozinha.
 */
function SecretArrival({ onClose }: { onClose: () => void }) {
  const hasCompanion = useRotina((s) => !!s.companion.kind)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <motion.div
      className="fixed inset-0 z-[80] grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="secret-title"
        className="relative flex w-full max-w-[400px] flex-col items-center gap-3 overflow-hidden rounded-[26px] border border-line bg-panel px-6 pt-6 pb-6 text-center"
        initial={{ scale: 0.94, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative grid h-[220px] w-full place-items-center">
          <motion.div
            aria-hidden="true"
            className="absolute h-[210px] w-[210px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(220,203,255,.38) 0%, rgba(199,227,255,.14) 45%, transparent 70%)' }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: [0, 0.35, 1], scale: [0.6, 0.8, 1] }}
            transition={{ duration: 1.6, delay: 0.4, times: [0, 0.4, 1], ease: 'easeOut' }}
          />
          <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox="-175 -110 350 220">
            {DUST.map((p, i) => (
              <motion.path
                key={i}
                d={
                  p.star
                    ? `M0,${-p.size * 1.6} Q0,0 ${p.size * 1.6},0 Q0,0 0,${p.size * 1.6} Q0,0 ${-p.size * 1.6},0 Q0,0 0,${-p.size * 1.6} Z`
                    : `M0,0 m${-p.size / 2},0 a${p.size / 2},${p.size / 2} 0 1,0 ${p.size},0 a${p.size / 2},${p.size / 2} 0 1,0 ${-p.size},0`
                }
                fill={DUST_COLORS[i % DUST_COLORS.length]}
                style={{ filter: 'drop-shadow(0 0 3px rgba(228,214,255,.9))' }}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
                animate={{ x: p.x, y: p.y - 10, opacity: [0, 1, 0.8, 0], scale: [0.4, 1, 0.9, 0.6] }}
                transition={{ duration: 2.4, delay: 1.5 + p.delay, ease: 'easeOut' }}
              />
            ))}
          </svg>
          {/* A silhueta acende e, já iluminado, ele dá um pulinho. */}
          <motion.div
            initial={{ filter: 'brightness(0) drop-shadow(0 0 8px rgba(196,181,253,0.55))', y: 0, scaleY: 1 }}
            animate={{
              filter: ['brightness(0) drop-shadow(0 0 8px rgba(196,181,253,0.55))', 'brightness(1) drop-shadow(0 0 16px rgba(220,203,255,0.7))'],
              y: [0, 0, 0, -26, 0, -7, 0],
              scaleY: [1, 1, 0.9, 1.07, 0.94, 1.02, 1],
            }}
            transition={{
              filter: { duration: 1.4, delay: 0.5, ease: 'easeInOut' },
              y: { duration: 1, delay: 1.8, times: [0, 0.05, 0.15, 0.45, 0.7, 0.85, 1], ease: 'easeOut' },
              scaleY: { duration: 1, delay: 1.8, times: [0, 0.05, 0.15, 0.45, 0.7, 0.85, 1], ease: 'easeOut' },
            }}
            style={{ transformOrigin: '50% 90%' }}
          >
            <Pet kind="coelho" size={150} interactive={false} float={false} />
          </motion.div>
        </div>

        <motion.div className="flex w-full flex-col items-center gap-3" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 2.2 }}>
          <h2 id="secret-title" className="m-0 text-xl font-extrabold">
            Alguém novo apareceu no seu cantinho.
          </h2>
          <p className="m-0 w-full rounded-2xl border border-line-2 bg-panel-2 px-4 py-3 text-sm text-soft">
            Um coelho veio fazer companhia. Ele fica por aqui, e você pode escolhê-lo como favorito quando quiser.
          </p>
          <div className="mt-1 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              autoFocus
              onClick={() => {
                chooseFavorite('coelho')
                onClose()
              }}
              className="rounded-full bg-noite px-5 py-2.5 text-sm font-bold text-ink"
            >
              {hasCompanion ? 'Trocar para o coelho' : 'Escolher como favorito'}
            </button>
            <button type="button" onClick={onClose} className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-soft hover:bg-panel-2">
              Depois
            </button>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

function Celebration({ event, onClose }: { event: Extract<PetEvent, { type: 'phase' | 'unlock' }>; onClose: () => void }) {
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
  let adultDetail = view.adultDetail
  const item = event.type === 'unlock' ? ACCESSORY_BY_ID[event.accessory] : null
  // Nova fase: a celebração mostra a fase nova; o pet do app segue a aparência escolhida.
  const fixed = event.type === 'phase' && view.appearance !== 'auto'
  const previous = event.type === 'phase' ? PHASES[Math.max(0, PHASES.findIndex((p) => p.id === event.phase) - 1)] : null
  const navigate = useNavigate()

  if (event.type === 'phase') {
    phase = event.phase
    if (event.phase === 'adulto') adultDetail = view.showAdultDetail
    const phaseName = PHASES.find((p) => p.id === event.phase)?.name ?? ''
    kicker = 'Nova fase'
    title = `${name} agora é ${phaseName.toLowerCase()}!`
    message =
      event.phase === 'adulto'
        ? `Virei adulto e ganhei ${species.adultDetail}! A gente chegou longe juntos.`
        : event.phase === 'jovem'
          ? 'Olha só, cresci! Obrigado por cuidar de mim todos esses dias.'
          : 'Oi! Vamos crescer juntos, um dia de cada vez.'
    if (fixed) message += ` Você escolheu me deixar ${PHASES.find((p) => p.id === view.appearance)?.name.toLowerCase()}, então continuo assim.`
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
            style={{ borderColor: 'color-mix(in srgb, var(--color-alerta) 40%, transparent)' }}
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
            <Pet kind={kind} state="concluido" phase={phase} adultDetail={adultDetail} accessories={accessories} size={150} interactive={false} />
          </motion.div>
        </div>

        <p className="m-0 font-mono text-[11px] tracking-[0.2em] uppercase" style={{ color: 'var(--color-alerta)' }}>
          {kicker}
        </p>
        <h2 id="celebration-title" className="m-0 text-xl font-extrabold">
          {title}
        </h2>
        <p className="m-0 w-full rounded-2xl border border-line-2 bg-panel-2 px-4 py-3 text-sm text-soft">{message}</p>

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
                className="rounded-full bg-ok px-5 py-2.5 text-sm font-bold text-ink"
              >
                Usar agora
              </button>
              <button type="button" onClick={onClose} className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-soft hover:bg-panel-2">
                Depois
              </button>
            </>
          ) : event.type === 'phase' && view.kind ? (
            <>
              {/* Ver como ficou: passa a acompanhar a evolução e abre a aparência na aba Pet. */}
              <button
                type="button"
                autoFocus
                onClick={() => {
                  if (fixed) useRotina.getState().setAppearance('auto')
                  onClose()
                  navigate('/pet#aparencia')
                }}
                className="min-h-11 rounded-full bg-ok px-5 py-2.5 text-sm font-bold text-ink"
              >
                Ver como ficou
              </button>
              {/* Manter como estava: fixa a aparência anterior (se ainda acompanhava a evolução). */}
              <button
                type="button"
                onClick={() => {
                  if (!fixed && previous) useRotina.getState().setAppearance(previous.id)
                  onClose()
                }}
                className="min-h-11 rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-soft hover:bg-panel-2"
              >
                Manter como estava
              </button>
            </>
          ) : (
            <button type="button" autoFocus onClick={onClose} className="rounded-full bg-ok px-5 py-2.5 text-sm font-bold text-ink">
              Oba!
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
