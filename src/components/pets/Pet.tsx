import { AnimatePresence, motion, useAnimationControls } from 'framer-motion'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { AccessoryId, PetKind, PetPhase, PetState } from '../../types'
import { ACCESSORY_BY_ID, SLOT_ORDER } from '../../data/accessories'
import { SPECIES, STATE_STYLE, type EyeStyle } from './pets'

const INK = '#0A0D14'

/** Brilho da pupila: bolinha branca ou, com `star`, uma estrelinha de 4 pontas e um pontinho de luz embaixo. */
function Shine({ x, y, star, bottom }: { x: number; y: number; star: boolean; bottom: number }) {
  if (!star) return <circle cx={x} cy={y} r={1.7} fill="#fff" />
  const r = 2.9
  return (
    <>
      <path d={`M${x},${y - r} Q${x},${y} ${x + r},${y} Q${x},${y} ${x},${y + r} Q${x},${y} ${x - r},${y} Q${x},${y} ${x},${y - r} Z`} fill="#fff" />
      <circle cx={x - 2.4} cy={bottom} r={0.9} fill="#E9DDFF" opacity={0.9} />
    </>
  )
}

function Eye({ cx, cy, style, side, blink, scale, star = false }: { cx: number; cy: number; style: EyeStyle; side: number; blink: boolean; scale: number; star?: boolean }) {
  let shape
  if (style === 'happy') shape = <path d={`M${cx - 7},${cy + 3} Q${cx},${cy - 6} ${cx + 7},${cy + 3}`} fill="none" stroke={INK} strokeWidth={3.5} strokeLinecap="round" />
  else if (style === 'closed') shape = <path d={`M${cx - 6},${cy} Q${cx},${cy + 5} ${cx + 6},${cy}`} fill="none" stroke={INK} strokeWidth={3.5} strokeLinecap="round" />
  else if (style === 'meh')
    // Sem graça: pálpebra reta caída sobre o olho, sem sobrancelha franzida.
    shape = (
      <g>
        <motion.g animate={{ scaleY: blink ? 0.1 : 1 }} transition={{ duration: 0.07 }}>
          <rect x={cx - 4.5} y={cy - 3} width={9} height={10} rx={4.5} fill={INK} />
          {star ? <Shine x={cx + 1.2} y={cy + 1} star bottom={cy + 5} /> : <circle cx={cx + 1.4} cy={cy + 0.5} r={1.5} fill="#fff" />}
        </motion.g>
        <path d={`M${cx - 6.5},${cy - 3} H${cx + 6.5}`} stroke={INK} strokeWidth={3} strokeLinecap="round" />
      </g>
    )
  else {
    const h = style === 'squint' ? 9 : style === 'angry' ? 12 : 18
    const brow = side === 0 ? `M${cx - 8},${cy - 13} L${cx + 5},${cy - 8}` : `M${cx + 8},${cy - 13} L${cx - 5},${cy - 8}`
    shape = (
      <g>
        {style === 'angry' && <path d={brow} stroke={INK} strokeWidth={4} strokeLinecap="round" />}
        <motion.g animate={{ scaleY: blink ? 0.1 : 1 }} transition={{ duration: 0.07 }}>
          <rect x={cx - 4.5} y={cy - h / 2} width={9} height={h} rx={4.5} fill={INK} />
          <Shine x={cx + 1.4} y={cy - h / 2 + (star ? 3.8 : 3.2)} star={star} bottom={cy + h / 2 - 3.4} />
        </motion.g>
      </g>
    )
  }
  // Filhote: olhos proporcionalmente maiores, crescendo a partir do próprio centro.
  return scale === 1 ? shape : <g transform={`translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})`}>{shape}</g>
}

type Emotion = 'star' | 'z' | 'drop' | 'bulb'

const EMOTION: Partial<Record<PetState, Emotion>> = { concluido: 'star', descanso: 'z', atencao: 'drop', foco: 'bulb' }

const EMOTION_ICON: Record<Emotion, ReactNode> = {
  star: <path d="M0,-7 L2.1,-2.3 L7,-2 L3.2,1.3 L4.3,6.2 L0,3.6 L-4.3,6.2 L-3.2,1.3 L-7,-2 L-2.1,-2.3 Z" fill="#FFD34D" />,
  z: <path d="M-4.5,-4.5 H4.5 L-4.5,4.5 H4.5" fill="none" stroke="#C4B5FD" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />,
  drop: <path d="M0,-7 C3.5,-1.5 5,1 5,3 A5,5 0 0 1 -5,3 C-5,1 -3.5,-1.5 0,-7 Z" fill="#7DD3FC" />,
  bulb: (
    <>
      <path d="M0,-7.5 A5.5,5.5 0 0 1 3.2,2.5 V4 H-3.2 V2.5 A5.5,5.5 0 0 1 0,-7.5 Z" fill="#FFD34D" />
      <rect x={-3} y={4.8} width={6} height={2.6} rx={1} fill="#9AA3B5" />
    </>
  ),
}

/** Balão de emoção acima da cabeça, à esquerda (longe dos "z" do sono, das orelhas e da ponta do chapéu). */
function EmotionBubble({ x, y, emotion, ring }: { x: number; y: number; emotion: Emotion; ring: string }) {
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.3, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.6, y: -6 }}
      transition={{ type: 'spring', stiffness: 420, damping: 18 }}
      style={{ transformBox: 'fill-box', transformOrigin: '100% 100%' }}
    >
      <circle cx={x + 9} cy={y + 10} r={2.4} fill="#151A25" stroke={ring} strokeWidth={1.2} />
      <circle cx={x + 13} cy={y + 15} r={1.4} fill="#151A25" stroke={ring} strokeWidth={1} />
      <circle cx={x} cy={y} r={11} fill="#151A25" stroke={ring} strokeWidth={1.5} />
      <g transform={`translate(${x} ${y})`}>{EMOTION_ICON[emotion]}</g>
    </motion.g>
  )
}

interface PetProps {
  kind: PetKind
  /** Estado que a espécie "veste": expressão, aura e ritmo. O corpo mantém a cor da espécie. */
  state?: PetState
  /** Sobrescreve a expressão dos olhos (ex.: em histórias). */
  mood?: EyeStyle
  /** Dormindo: olhos fechados e "z" flutuando. */
  sleeping?: boolean
  phase?: PetPhase
  /** Acessórios a desenhar (no máximo um por slot). */
  accessories?: AccessoryId[]
  size?: number
  /** Flutuar parado no lugar. */
  float?: boolean
  /** Chamado depois do toque (além da animação de cutucar). */
  onPoke?: () => void
  /** false = só desenho (para usar dentro de outro botão). */
  interactive?: boolean
  /** Nome falado por leitores de tela. */
  label?: string
  /** Só a forma escura, com um brilho leve em volta (pet ainda desconhecido). */
  silhouette?: boolean
  className?: string
}

/**
 * Pet animado: flutua, respira, pisca sozinho e reage ao clique.
 * O corpo tem sempre a cor da espécie. O estado aparece na expressão, na aura (drop-shadow),
 * num balão de emoção de ~2 s quando muda e no ritmo: pulinho ao concluir,
 * flutuar lento no descanso e balanço leve no foco.
 * Trocar de espécie (`kind`) faz a troca com o efeito de sumir e aparecer.
 */
export function Pet({
  kind,
  state,
  mood,
  sleeping = false,
  phase = 'jovem',
  accessories = [],
  size = 120,
  float = true,
  onPoke,
  interactive = true,
  label,
  silhouette = false,
  className = '',
}: PetProps) {
  const species = SPECIES[kind]
  const current = state ?? species.homeState
  const look = STATE_STYLE[current]
  const eyeStyle: EyeStyle = sleeping ? 'closed' : (mood ?? look.eyeStyle)
  const [blink, setBlink] = useState(false)
  const controls = useAnimationControls()
  const hopControls = useAnimationControls()
  const hops = species.idle === 'hop' && float && !sleeping && !silhouette

  // Pulinho curto de vez em quando, no lugar do flutuar.
  useEffect(() => {
    if (!hops) return
    let timer: number
    const schedule = () => {
      timer = window.setTimeout(() => {
        void hopControls.start({
          y: [0, 0, -size * 0.13, 0, -size * 0.035, 0],
          scaleY: [1, 0.9, 1.06, 0.94, 1.02, 1],
          scaleX: [1, 1.06, 0.95, 1.05, 0.99, 1],
          transition: { duration: 0.85, times: [0, 0.14, 0.42, 0.66, 0.82, 1], ease: 'easeOut' },
        })
        schedule()
      }, 2800 + Math.random() * 4200)
    }
    schedule()
    return () => window.clearTimeout(timer)
  }, [hops, size])

  useEffect(() => {
    let timer: number
    const schedule = () => {
      timer = window.setTimeout(() => {
        setBlink(true)
        window.setTimeout(() => setBlink(false), 140)
        schedule()
      }, 2200 + Math.random() * 3500)
    }
    schedule()
    return () => window.clearTimeout(timer)
  }, [])

  // Balão de emoção e pulinho quando o estado (ou o sono) muda — não na primeira renderização.
  const emotionKey = sleeping ? 'dormindo' : current
  const prevKey = useRef(emotionKey)
  const [bubble, setBubble] = useState<{ emotion: Emotion; id: number } | null>(null)
  useEffect(() => {
    if (prevKey.current === emotionKey) return
    prevKey.current = emotionKey
    if (emotionKey === 'concluido') controls.start({ y: [0, -12, 0, -5, 0], transition: { duration: 0.7, ease: 'easeOut' } })
    const emotion = sleeping ? 'z' : EMOTION[current]
    if (!emotion) {
      setBubble(null)
      return
    }
    setBubble({ emotion, id: Date.now() })
    const t = window.setTimeout(() => setBubble(null), 2000)
    return () => window.clearTimeout(t)
  }, [emotionKey])

  const poke = () => {
    controls.start({ scale: [1, 1.14, 0.9, 1.04, 1], rotate: [0, -6, 5, 0, 0], transition: { duration: 0.55 } })
    onPoke?.()
  }

  const items = SLOT_ORDER.flatMap((slot) => {
    const id = accessories.find((a) => ACCESSORY_BY_ID[a]?.slot === slot)
    return id ? [ACCESSORY_BY_ID[id]] : []
  })
  const anchorOf = { cabeca: species.anchors.head, rosto: species.anchors.eyes, pescoco: species.anchors.neck, mao: species.anchors.hand }
  // A coroinha do sapinho adulto sai quando ele usa algo na cabeça.
  const adult = phase === 'adulto' && !(kind === 'sapinho' && items.some((i) => i.slot === 'cabeca'))
  const baby = phase === 'filhote'
  const { head } = species.anchors

  // Ritmo por estado.
  const resting = sleeping || current === 'descanso'
  const swaying = !sleeping && current === 'foco'
  const floatDuration = sleeping ? 5.5 : resting ? 5 : 3.2

  const Wrapper = interactive ? 'button' : 'div'
  return (
    <Wrapper
      {...(interactive
        ? { type: 'button' as const, onClick: poke, 'aria-label': label ?? `${species.name}: ${sleeping ? 'dormindo' : look.title}` }
        : { 'aria-hidden': true })}
      className={`relative shrink-0 rounded-full bg-transparent p-0 ${interactive ? 'cursor-pointer' : ''} ${className}`}
      style={{ width: size, height: size }}
    >
      <motion.div
        className="h-full w-full"
        style={{ transformOrigin: '50% 88%' }}
        animate={{ y: float && !hops ? [0, -size * 0.05, 0] : 0, rotate: swaying ? [-3, 3, -3] : 0 }}
        transition={{
          y: { duration: floatDuration, repeat: float && !hops ? Infinity : 0, ease: 'easeInOut' },
          rotate: swaying ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.5 },
        }}
      >
       <motion.div className="h-full w-full" style={{ transformOrigin: '50% 90%' }} animate={hopControls}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.svg
            key={kind}
            viewBox="0 0 120 120"
            width={size}
            height={size}
            aria-hidden="true"
            initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.5, opacity: 0, rotate: 10 }}
            transition={{ type: 'spring', stiffness: 320, damping: 18 }}
            // Aura: a cor do estado vai para o brilho, com transição suave.
            style={{
              overflow: 'visible',
              filter: silhouette
                ? `brightness(0) drop-shadow(0 0 ${Math.max(3, Math.round(size * 0.07))}px rgba(196,181,253,.55))`
                : `drop-shadow(0 0 ${Math.round(size * 0.12)}px ${look.glow})`,
              transition: 'filter .6s ease',
            }}
          >
            <motion.g animate={controls}>
              {/* Filhote: 80% do tamanho, apoiado na mesma base. */}
              <g transform={baby ? 'translate(12 21.6) scale(0.8)' : undefined}>
                {!silhouette && species.behind?.()}
                <motion.g
                  animate={{ scaleY: [1, resting ? 1.05 : 1.035, 1], scaleX: [1, 0.985, 1] }}
                  transition={{ duration: resting ? 4 : 2.6, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ originY: 1 }}
                >
                  {species.body(species.colors, adult)}
                  {species.eyes.map(([cx, cy], i) => (
                    <Eye key={i} cx={cx} cy={cy} side={i} style={eyeStyle} blink={blink} scale={baby ? 1.3 : 1} star={species.starEyes} />
                  ))}
                  {items.map((it) => (
                    <g key={it.id}>{it.draw(anchorOf[it.slot], species.colors.color)}</g>
                  ))}
                </motion.g>
                <AnimatePresence>
                  {bubble && !silhouette && <EmotionBubble key={bubble.id} x={head.x - 22} y={head.y - 30} emotion={bubble.emotion} ring={look.color} />}
                </AnimatePresence>
              </g>
            </motion.g>
            {sleeping &&
              [0, 1, 2].map((i) => (
                <motion.text
                  key={i}
                  x={head.x + 24 + i * 7}
                  y={head.y - 2 - i * 9}
                  fontSize={9 + i * 3}
                  fontWeight={800}
                  fill="#C4B5FD"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: [0, 1, 0], y: [6, -4, -14] }}
                  transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.7, ease: 'easeOut' }}
                >
                  z
                </motion.text>
              ))}
          </motion.svg>
        </AnimatePresence>
       </motion.div>
      </motion.div>
    </Wrapper>
  )
}
