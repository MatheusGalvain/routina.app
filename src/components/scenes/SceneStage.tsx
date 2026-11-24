import { AnimatePresence, motion, useSpring, useTransform, type MotionValue } from 'framer-motion'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { Area, AreaId } from '../../types'
import { constellationOf, litStars, type SceneId } from '../../data/scenes'
import { useReducedMotionPref } from '../../store/usePetPrefs'
import { useFullMoonNight, useSeasonDecor } from '../../store/useEvents'
import { useRotina } from '../../store/useRotina'
import { useDevOverrides } from '../../store/useDevOverrides'
import { SECRET_UNLOCK } from '../../lib/companion'
import type { DecorId } from '../../data/events'
import { Bunting, Confetti, Fireworks, GuideStar, LIGHT_WIRES, Lights, MoonBunnyPass, Snow } from './SeasonDecor'
import { catchMoonBunny } from '../../store/useCompanion'

/**
 * Motor de cena do cantinho, em camadas de profundidade (viewBox 640 × 320, proporção 2:1).
 *  - Cada camada tem `depth`: com o mouse (computador) ou inclinando o celular (depois de um toque,
 *    se o aparelho permitir), as camadas se deslocam na proporção da profundidade, com mola.
 *    A mais próxima (depth 28) anda no máximo ~16 unidades.
 *  - Elementos gerados (estrelas, árvores, grama, vaga-lumes) usam um sorteio com semente fixa
 *    por pessoa: a cena é sempre igual para ela. Gerados uma vez (useMemo), até ~250 por cena.
 *  - Desfoque só nas camadas de fundo; granulação (feTurbulence) e névoa por cima.
 *  - Com movimento reduzido: sem paralaxe e sem animações de ambiente.
 * Desenhos e gradientes: <SceneDefs /> (src/data/scenes.tsx), da referência src/docs/referencias/cenarios.html.
 */

export const SCENE_W = 640
export const SCENE_H = 320
/** Linha do chão (onde apoiam o pet e os itens). */
export const FLOOR_Y = 256
/** Centro de cada espaço do chão: 2 à esquerda e 2 à direita do pet. */
export const SLOT_X = [150, 224, 416, 490]
export const PET_X = 320
/** Profundidade da camada do chão (o pet e os itens andam junto com ela). */
export const GROUND_DEPTH: Record<SceneId, number> = { cosmos: 18, floresta: 20 }

const MAX_DEPTH = 28
const MAX_SHIFT = 16

// ---------------------------------------------------------------------
// Sorteio com semente (mulberry32): mesma semente, mesma cena.
// ---------------------------------------------------------------------

export function seedFrom(text: string) {
  let h = 2166136261
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return h >>> 0
}

function rng(seed: number) {
  let a = seed || 1
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------------------------------------------------------------------
// Paralaxe
// ---------------------------------------------------------------------

type Tilt = { x: MotionValue<number>; y: MotionValue<number> }

/** Mouse no computador; no celular, inclinação (pedida no primeiro toque). Devolve a posição de -0,5 a 0,5. */
function useParallax(enabled: boolean) {
  const x = useSpring(0, { stiffness: 45, damping: 14, mass: 0.8 })
  const y = useSpring(0, { stiffness: 45, damping: 14, mass: 0.8 })
  const ref = useRef<HTMLDivElement>(null)
  const listening = useRef(false)

  useEffect(() => {
    if (!enabled) {
      x.set(0)
      y.set(0)
      return
    }
    const el = ref.current
    if (!el) return
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const r = el.getBoundingClientRect()
      x.set((e.clientX - r.left) / r.width - 0.5)
      y.set((e.clientY - r.top) / r.height - 0.5)
    }
    const onLeave = () => {
      x.set(0)
      y.set(0)
    }
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return
      const clamp = (v: number) => Math.max(-0.5, Math.min(0.5, v))
      x.set(clamp(e.gamma / 50))
      y.set(clamp((e.beta - 45) / 60))
    }
    // Inclinar o celular: só depois de um toque (o iPhone pede permissão nesse momento).
    const onTap = async () => {
      if (listening.current || fine || typeof DeviceOrientationEvent === 'undefined') return
      listening.current = true
      const req = (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission
      try {
        if (req && (await req()) !== 'granted') return
      } catch {
        return
      }
      window.addEventListener('deviceorientation', onOrient)
    }
    if (fine) {
      el.addEventListener('pointermove', onMove)
      el.addEventListener('pointerleave', onLeave)
    } else el.addEventListener('pointerdown', onTap)
    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
      el.removeEventListener('pointerdown', onTap)
      window.removeEventListener('deviceorientation', onOrient)
      listening.current = false
    }
  }, [enabled])

  return { ref, tilt: { x, y } as Tilt }
}

/** Deslocamento de uma profundidade, em unidades da cena. */
const shiftOf = (depth: number) => (depth / MAX_DEPTH) * MAX_SHIFT

function Layer({ depth, tilt, children, style }: { depth: number; tilt: Tilt; children: ReactNode; style?: CSSProperties }) {
  const x = useTransform(tilt.x, (v) => v * shiftOf(depth))
  const y = useTransform(tilt.y, (v) => v * shiftOf(depth) * 0.5)
  return <motion.g style={{ x, y, ...style }}>{children}</motion.g>
}

// ---------------------------------------------------------------------
// Cena
// ---------------------------------------------------------------------

export interface SceneStageProps {
  scene: SceneId
  /** Áreas que aparecem (as 4 mais ativas da semana) e os dias de cada uma nos últimos 7. */
  areas: Area[]
  days: Record<AreaId, number>
  seed: number
  /** Prévia pequena: menos elementos, sem paralaxe nem granulação. */
  preview?: boolean
  label?: string
  className?: string
  /** O que fica sobre o chão (pet, itens, espaços). Recebe a largura em px e anda junto com a camada do chão. */
  overlay?: (ctx: { width: number; scale: number }) => ReactNode
}

export function SceneStage({ scene, areas, days, seed, preview = false, label, className = '', overlay }: SceneStageProps) {
  const reduced = useReducedMotionPref()
  const still = reduced || preview
  const { ref, tilt } = useParallax(!still)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const scale = width / SCENE_W
  const groundDepth = GROUND_DEPTH[scene]
  const gx = useTransform(tilt.x, (v) => v * shiftOf(groundDepth) * scale)
  const gy = useTransform(tilt.y, (v) => v * shiftOf(groundDepth) * 0.5 * scale)
  // A ilhota do cosmos flutua devagar; o que está em cima dela flutua junto.
  const floats = scene === 'cosmos' && !still
  // Decorações de época (src/data/events.ts) e o coelho de cristal que passa nas noites de lua cheia
  // (só para quem ainda não o desbloqueou). Tocar na silhueta durante a passagem desbloqueia na hora.
  // A passagem disparada pelo painel dev aparece sempre e é só visual.
  const decor = useSeasonDecor(scene)
  const fullMoon = useFullMoonNight()
  const secretKnown = useRotina((s) => s.petProgress.unlocked.includes(SECRET_UNLOCK))
  const secretDev = useDevOverrides((s) => s.secretPet)
  const moonPass = useDevOverrides((s) => s.moonPass)
  const bunny = !preview && ((fullMoon && !secretKnown && !secretDev) || moonPass > 0)

  return (
    <div
      ref={ref}
      role={label ? 'img' : undefined}
      aria-label={label}
      className={`relative w-full overflow-hidden ${className}`}
      style={{ aspectRatio: `${SCENE_W} / ${SCENE_H}`, touchAction: 'pan-y' }}
    >
      {/* Fundo e chão: troca de cenário com um fade entre as camadas. */}
      <AnimatePresence initial={false}>
        <motion.svg
          key={scene}
          viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        >
          {scene === 'cosmos' ? (
            <CosmosBack areas={areas} days={days} seed={seed} tilt={tilt} preview={preview} floats={floats} decor={decor} />
          ) : (
            <ForestBack areas={areas} days={days} seed={seed} tilt={tilt} preview={preview} decor={decor} />
          )}
        </motion.svg>
      </AnimatePresence>

      {/* Pet e itens, andando com a camada do chão. */}
      {overlay && width > 0 && (
        <motion.div className="absolute inset-0" style={{ x: gx, y: gy }}>
          <motion.div
            className="absolute inset-0"
            animate={floats ? { y: [0, -6 * scale, 0] } : { y: 0 }}
            transition={floats ? { duration: 6, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.4 }}
          >
            {overlay({ width, scale })}
          </motion.div>
        </motion.div>
      )}

      {/* Silhueta do coelho de cristal no céu (um botão de verdade, por cima do cenário). */}
      {bunny && <MoonBunnyPass top={((scene === 'floresta' ? 82 : 46) / SCENE_H) * 100} reduced={reduced} trigger={moonPass} natural={fullMoon && !secretKnown && !secretDev} onCatch={catchMoonBunny} />}

      {/* Frente: árvores que emolduram a floresta e a granulação por cima de tudo. */}
      <svg viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        <AnimatePresence initial={false}>
          {scene === 'floresta' && (
            <motion.g key="frente" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }}>
              <ForestFront seed={seed} tilt={tilt} />
            </motion.g>
          )}
        </AnimatePresence>
        {decor.includes('neve') && <Snow seed={seed} preview={preview} />}
        {decor.includes('confete') && <Confetti seed={seed} preview={preview} />}
        {!preview && <rect width={SCENE_W} height={SCENE_H} filter="url(#hd-grain)" opacity=".6" />}
      </svg>
    </div>
  )
}

// ---------------------------------------------------------------------
// Cosmos
// ---------------------------------------------------------------------

/** Regiões do céu para as constelações, da área mais ativa para a menos (longe do planeta e do pet). */
const REGIONS: [number, number][] = [
  [30, 30],
  [176, 86],
  [300, 22],
  [432, 128],
]
const STAR_COLORS = ['#FFFFFF', '#E4D8FF', '#FFE8D6', '#D7E0FF']

function CosmosBack({ areas, days, seed, tilt, preview, floats, decor }: { areas: Area[]; days: Record<AreaId, number>; seed: number; tilt: Tilt; preview: boolean; floats: boolean; decor: DecorId[] }) {
  const stars = useMemo(() => {
    const r = rng(seed ^ 0xc05305)
    return Array.from({ length: preview ? 60 : 160 }, () => {
      const big = r() > 0.93
      return {
        x: r() * SCENE_W,
        y: r() * 250,
        r: big ? 1.4 + r() : 0.4 + r() * 0.7,
        fill: STAR_COLORS[Math.floor(r() * 4)],
        o: 0.3 + r() * 0.6,
        tw: r() > 0.6 ? { d: 2 + r() * 4, dl: r() * 4 } : null,
        big,
      }
    })
  }, [seed, preview])

  return (
    <>
      <rect width={SCENE_W} height={SCENE_H} fill="url(#hd-cSky)" />
      {/* Nebulosa (fundo: pode desfocar). */}
      <Layer depth={3} tilt={tilt}>
        <g filter="url(#hd-blur24)" opacity=".9">
          <ellipse cx="170" cy="120" rx="170" ry="70" fill="#CDB8FF" opacity={preview ? 0.1 : 0.16} transform="rotate(-18 170 120)" />
          <ellipse cx="300" cy="80" rx="140" ry="40" fill="#F7B8D6" opacity={preview ? 0.06 : 0.1} transform="rotate(-22 300 80)" />
          <ellipse cx="420" cy="170" rx="190" ry="55" fill="#A9BFFF" opacity={preview ? 0.08 : 0.12} transform="rotate(-12 420 170)" />
          <ellipse cx="90" cy="60" rx="80" ry="30" fill="#FFC9A8" opacity=".08" />
        </g>
      </Layer>
      <Layer depth={5} tilt={tilt}>
        {stars.map((s, i) => (
          <g key={i}>
            <circle
              cx={s.x}
              cy={s.y}
              r={s.r}
              fill={s.fill}
              opacity={s.o}
              className={s.tw ? 'sc-anim sc-tw' : undefined}
              style={s.tw ? ({ '--d': `${s.tw.d}s`, '--dl': `${s.tw.dl}s` } as CSSProperties) : undefined}
            />
            {s.big && <path d={`M${s.x - 5},${s.y} H${s.x + 5} M${s.x},${s.y - 5} V${s.y + 5}`} stroke="#FFFFFF" strokeOpacity=".35" strokeWidth=".6" />}
          </g>
        ))}
      </Layer>
      {/* Decorações de época no céu. */}
      {decor.includes('fogos') && (
        <Layer depth={4} tilt={tilt}>
          <Fireworks preview={preview} />
        </Layer>
      )}
      {(decor.includes('estrela-guia') || decor.includes('bandeirinhas')) && (
        <Layer depth={6} tilt={tilt}>
          {decor.includes('estrela-guia') && <GuideStar />}
          {decor.includes('bandeirinhas') && <Bunting />}
        </Layer>
      )}
      {/* Constelações das áreas da semana. */}
      <Layer depth={7} tilt={tilt}>
        {areas.slice(0, REGIONS.length).map((a, i) => {
          const c = constellationOf(a.id)
          const lit = litStars(days[a.id] ?? 0, c.stars.length)
          const [ox, oy] = REGIONS[i]
          const k = 1.35
          const pt = ([x, y]: [number, number]) => [ox + x * k, oy + y * k] as const
          return (
            <g key={a.id}>
              {c.edges.map(([p, q]) => {
                const [x1, y1] = pt(c.stars[p])
                const [x2, y2] = pt(c.stars[q])
                return <line key={`${p}-${q}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={a.color} strokeOpacity={p < lit && q < lit ? 0.32 : 0.08} strokeWidth="1" />
              })}
              {c.stars.map((st, s) => {
                const [x, y] = pt(st)
                return s < lit ? (
                  <g key={s} className="sc-anim sc-tw" style={{ '--d': '4s', '--dl': `${(s * 0.9 + i * 0.6) % 4}s` } as CSSProperties}>
                    <circle cx={x} cy={y} r={6} fill={a.color} opacity=".16" />
                    <circle cx={x} cy={y} r={2.4} fill={a.color} />
                    <circle cx={x} cy={y} r={1} fill="#FFFFFF" opacity=".85" />
                  </g>
                ) : (
                  <circle key={s} cx={x} cy={y} r={1.6} fill={a.color} opacity=".14" />
                )
              })}
            </g>
          )
        })}
      </Layer>
      {/* Planeta com anel. */}
      <Layer depth={9} tilt={tilt}>
        <ellipse cx="532" cy="72" rx="64" ry="14" fill="none" stroke="#CDB8FF" strokeOpacity=".45" strokeWidth="3" transform="rotate(-16 532 72)" strokeDasharray="0 104 210" />
        <circle cx="532" cy="72" r="30" fill="url(#hd-cPlanet)" />
        <circle cx="532" cy="72" r="30" fill="url(#hd-cShadow)" />
        <path d="M512,62 C520,58 540,58 552,64" stroke="#FFF0E4" strokeOpacity=".35" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M471,88 A64,14 -16 0 0 593,56" fill="none" stroke="#CDB8FF" strokeWidth="3" />
      </Layer>
      {/* Estrela cadente com rastro, a cada ~7 s. */}
      {!preview && (
        <g className="sc-anim sc-shoot">
          <path d="M500,36 L420,70" stroke="url(#hd-cTail)" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="500" cy="36" r="2.2" fill="#FFFFFF" filter="url(#hd-glow)" />
        </g>
      )}
      {/* Ilhota flutuante (o pet e os itens ficam por cima, no HTML). */}
      <Layer depth={18} tilt={tilt}>
        <motion.g animate={floats ? { y: [0, -6, 0] } : { y: 0 }} transition={floats ? { duration: 6, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.4 }}>
          <ellipse cx="320" cy="300" rx="170" ry="26" fill="url(#hd-cUnder)" />
          <path d="M120,256 C180,248 460,248 520,256 C512,272 470,282 430,288 C400,304 360,316 320,318 C280,316 240,304 210,288 C170,282 128,272 120,256 Z" fill="url(#hd-cRock)" />
          <path d="M120,256 C180,248 460,248 520,256 C460,262 180,262 120,256 Z" fill="#3E3459" />
          <path d="M150,254 C240,249 400,249 490,254" stroke="url(#hd-cRim)" strokeWidth="1.6" fill="none" />
          <g fill="#CDB8FF" opacity=".75">
            <path d="M236,292 l4,-10 4,10 Z" />
            <path d="M404,286 l3,-8 3,8 Z" />
            <path d="M300,306 l3,-7 3,7 Z" />
          </g>
          <g fill="#2A2240">
            <circle cx="150" cy="296" r="6" />
            <circle cx="500" cy="290" r="4" />
            <circle cx="470" cy="304" r="3" />
          </g>
          <ellipse cx="320" cy="256" rx="50" ry="6" fill="#000" opacity=".4" />
        </motion.g>
      </Layer>
    </>
  )
}

// ---------------------------------------------------------------------
// Floresta
// ---------------------------------------------------------------------

/** Árvore orgânica: tronco + copa de círculos sobrepostos. */
const TREE_PTS: [number, number][] = [
  [0, -0.62],
  [-0.32, -0.48],
  [0.32, -0.5],
  [-0.18, -0.8],
  [0.2, -0.78],
  [0, -0.95],
  [-0.42, -0.62],
]
function treeShapes(r: () => number, x: number, base: number, h: number) {
  const rad = h * 0.28
  return {
    trunk: { x: x - h * 0.05, y: base - h * 0.45, w: h * 0.1, h: h * 0.45, rx: h * 0.03 },
    crown: TREE_PTS.map(([px, py]) => ({ cx: x + px * h * 0.6, cy: base + py * h, r: rad * (0.75 + r() * 0.4) })),
  }
}
type TreeShape = ReturnType<typeof treeShapes>

function Trees({ list, color, trunk }: { list: TreeShape[]; color: string; trunk: string }) {
  return (
    <>
      {list.map((t, i) => (
        <g key={i}>
          <rect x={t.trunk.x} y={t.trunk.y} width={t.trunk.w} height={t.trunk.h} rx={t.trunk.rx} fill={trunk} />
          {t.crown.map((c, j) => (
            <circle key={j} cx={c.cx} cy={c.cy} r={c.r} fill={color} />
          ))}
        </g>
      ))}
    </>
  )
}

function ForestBack({ areas, days, seed, tilt, preview, decor }: { areas: Area[]; days: Record<AreaId, number>; seed: number; tilt: Tilt; preview: boolean; decor: DecorId[] }) {
  const gen = useMemo(() => {
    const r = rng(seed ^ 0xf0e57)
    const far = Array.from({ length: preview ? 5 : 8 }, (_, i) => treeShapes(r, 10 + i * (preview ? 140 : 86) + r() * 30, 252, 120 + r() * 50))
    const mid = ([[40, 140], [110, 170], [520, 160], [600, 150], [570, 190]] as const).map(([x, h]) => treeShapes(r, x, 256, h))
    const grass = Array.from({ length: preview ? 40 : 100 }, () => {
      const gx = r() * SCENE_W
      const gy = 254 + r() * 40
      const gh = 5 + r() * 11
      const lean = (r() - 0.5) * 8
      // Mais clara perto do pet (luz da poça quente).
      const tones = Math.abs(gx - PET_X) < 200 ? ['#2E5442', '#3A6650', '#4B7A60'] : ['#1F3B2F', '#264638', '#2C5040']
      return { d: `M${gx},${gy} q${lean / 2},${-gh / 2} ${lean},${-gh}`, stroke: tones[Math.floor(r() * 3)] }
    })
    return { far, mid, grass }
  }, [seed, preview])

  // Vaga-lumes: um grupo por área da semana, na cor dela; quantidade e brilho seguem os dias.
  const flies = useMemo(() => {
    const r = rng(seed ^ 0xf1f1)
    return areas.slice(0, 4).flatMap((a) => {
      const d = days[a.id] ?? 0
      if (d <= 0) return []
      return Array.from({ length: 1 + d }, () => ({
        color: a.color,
        x: 60 + r() * 520,
        y: 70 + r() * 160,
        r: 1.6 + r() * 1.4,
        o: 0.25 + d / 8,
        vars: { '--d': `${3 + r() * 3}s`, '--dl': `${r() * 4}s`, '--x': `${(r() - 0.5) * 20}px`, '--y': `${-6 - r() * 12}px` } as CSSProperties,
      }))
    })
  }, [areas, days, seed])

  return (
    <>
      <rect width={SCENE_W} height={SCENE_H} fill="url(#hd-fSky)" />
      {/* Lua com halo e raios de luz (fundo: pode desfocar). */}
      <Layer depth={4} tilt={tilt}>
        <circle cx="500" cy="62" r="120" fill="url(#hd-fMoon)" />
        <circle cx="500" cy="62" r="17" fill="#F6F1E6" />
        <circle cx="494" cy="57" r="3" fill="#E6DFD0" />
        <circle cx="505" cy="68" r="2" fill="#E6DFD0" />
        <g filter="url(#hd-blur6)">
          <path d="M470,70 L330,320 L410,320 Z" fill="url(#hd-fRay)" />
          <path d="M490,78 L420,320 L470,320 Z" fill="url(#hd-fRay)" />
          <path d="M455,66 L230,320 L290,320 Z" fill="url(#hd-fRay)" opacity=".7" />
        </g>
      </Layer>
      {/* Decorações de época no céu (atrás das árvores). */}
      {(decor.includes('fogos') || decor.includes('bandeirinhas')) && (
        <Layer depth={5} tilt={tilt}>
          {decor.includes('fogos') && <Fireworks preview={preview} />}
          {decor.includes('bandeirinhas') && <Bunting />}
        </Layer>
      )}
      {/* Árvores do fundo: desfocadas e mais claras pela névoa. */}
      <Layer depth={7} tilt={tilt}>
        <g opacity=".75" filter="url(#hd-blur2)">
          <Trees list={gen.far} color="#173027" trunk="#152A22" />
        </g>
      </Layer>
      {decor.includes('luzinhas') && (
        <Layer depth={7} tilt={tilt}>
          <Lights wires={LIGHT_WIRES.back} small />
        </Layer>
      )}
      <Layer depth={10} tilt={tilt}>
        <ellipse className="sc-anim sc-mist" cx="240" cy="232" rx="280" ry="26" fill="url(#hd-fMist)" opacity=".09" />
      </Layer>
      <Layer depth={12} tilt={tilt}>
        <Trees list={gen.mid} color="#1A3A2E" trunk="#142B22" />
        {decor.includes('luzinhas') && <Lights wires={LIGHT_WIRES.front} />}
      </Layer>
      <Layer depth={16} tilt={tilt}>
        <ellipse className="sc-anim sc-mist sc-mist-b" cx="420" cy="252" rx="260" ry="20" fill="url(#hd-fMist)" opacity=".1" />
      </Layer>
      <Layer depth={18} tilt={tilt}>
        {flies.map((f, i) => (
          <g key={i} className="sc-anim sc-ff" style={{ ...f.vars, opacity: f.o }}>
            <circle cx={f.x} cy={f.y} r={f.r * 3.2} fill={f.color} opacity=".22" />
            <circle cx={f.x} cy={f.y} r={f.r} fill={f.color} />
          </g>
        ))}
      </Layer>
      {/* Chão, poça de luz quente e grama (o pet e os itens ficam por cima, no HTML). */}
      <Layer depth={20} tilt={tilt}>
        <path d="M-20,258 C120,246 240,252 320,250 C420,248 520,244 660,256 V340 H-20 Z" fill="url(#hd-fGround)" />
        <ellipse cx="320" cy="258" rx="180" ry="26" fill="url(#hd-fPool)" />
        {gen.grass.map((g, i) => (
          <path key={i} d={g.d} stroke={g.stroke} strokeWidth="1.4" fill="none" strokeLinecap="round" />
        ))}
        <ellipse cx="320" cy="258" rx="50" ry="6" fill="#000" opacity=".45" />
      </Layer>
    </>
  )
}

/** Árvores da frente, quase pretas, emoldurando a clareira (acima do pet). */
function ForestFront({ seed, tilt }: { seed: number; tilt: Tilt }) {
  const front = useMemo(() => {
    const r = rng(seed ^ 0xf207)
    // Bem nas bordas: emolduram sem cobrir os itens dos espaços das pontas.
    return ([[-74, 320], [716, 300]] as const).map(([x, h]) => treeShapes(r, x, 340, h))
  }, [seed])
  return (
    <Layer depth={28} tilt={tilt}>
      <Trees list={front} color="#0B1612" trunk="#08100D" />
    </Layer>
  )
}
