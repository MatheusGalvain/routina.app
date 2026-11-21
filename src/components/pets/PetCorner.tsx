import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { AreaId, PetState } from '../../types'
import { AREAS } from '../../data/areas'
import { crescent } from '../../data/accessories'
import { useShownPet } from '../../store/useCompanion'
import { useDevOverrides, type CornerStage } from '../../store/useDevOverrides'
import { Pet } from './Pet'
import { SPECIES, STATE_STYLE } from './pets'

/** Cenário em viewBox 0 0 400 240: parede até y=186, chão abaixo. */
const W = 400
const H = 240
const FLOOR = 186

/** Estágio pelo número de dias com a área concluída nos últimos 7. */
export const stageFor = (days: number): CornerStage => (days >= 5 ? 3 : days >= 3 ? 2 : days >= 1 ? 1 : 0)

interface Spot {
  area: AreaId
  thing: string
  tip: string
  /** Áreas clicáveis (viewBox). */
  hits: [number, number, number, number][]
}

const SPOTS: Spot[] = [
  { area: 'sono', thing: 'Lua e estrelas', tip: 'A lua e as estrelas aparecem na janela quando você cuida do Sono.', hits: [[160, 12, 80, 62]] },
  { area: 'social', thing: 'Porta-retratos', tip: 'Os porta-retratos chegam com os dias em que você cuida do Social.', hits: [[16, 58, 108, 44]] },
  { area: 'casa', thing: 'Tapete e quadro', tip: 'O tapete e o quadro se arrumam quando você cuida da Casa.', hits: [[292, 30, 66, 60], [100, 204, 40, 30], [260, 204, 40, 30]] },
  { area: 'estudo', thing: 'Pilha de livros', tip: 'A pilha de livros cresce com os dias de Estudo.', hits: [[22, 136, 70, 52]] },
  { area: 'financas', thing: 'Cofrinho', tip: 'O cofrinho enche de moedas com os dias de Finanças.', hits: [[92, 150, 50, 40]] },
  { area: 'mente', thing: 'Vela', tip: 'A vela acende quando você cuida da Mente.', hits: [[262, 140, 32, 50]] },
  { area: 'foco', thing: 'Luminária', tip: 'A luminária acende com os dias de Foco.', hits: [[298, 96, 52, 92]] },
  { area: 'corpo', thing: 'Plantinha', tip: 'Sua plantinha cresce quando você cuida do Corpo.', hits: [[350, 112, 48, 78]] },
]

const color = (a: AreaId) => AREAS.find((x) => x.id === a)!.color

/** Elemento que entra com animação suave quando aparece ou muda de estágio. */
function Grow({ stage, children, origin = '50% 100%' }: { stage: number; children: ReactNode; origin?: string }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.g
        key={stage}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.85 }}
        transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        style={{ transformBox: 'fill-box', transformOrigin: origin }}
      >
        {children}
      </motion.g>
    </AnimatePresence>
  )
}

const GHOST = { fill: 'none', stroke: '#2A3244', strokeWidth: 1.5, strokeDasharray: '4 4' }

function Window({ s }: { s: number }) {
  const stars: [number, number, number][] = [
    [174, 26, 2],
    [226, 24, 1.6],
    [212, 56, 1.8],
    [182, 60, 1.4],
    [196, 22, 1.2],
    [230, 46, 1.4],
    [170, 44, 1.2],
  ]
  const count = [0, 3, 5, 7][s]
  return (
    <g>
      <rect x="160" y="12" width="80" height="62" rx="8" fill="#0A0E1C" stroke="#232B3C" strokeWidth="3" />
      <Grow stage={s} origin="50% 50%">
        {s >= 3 && <circle cx="214" cy="36" r="22" fill="url(#moonGlow)" />}
        {s === 2 && <path d={crescent(212, 36, 10)} fill="#FDE68A" />}
        {s === 3 && <circle cx="214" cy="36" r="10" fill="#FDE68A" />}
        {stars.slice(0, count).map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="#E9E3FF" opacity={0.9} />
        ))}
      </Grow>
      <path d="M200,12 V74 M160,43 H240" stroke="#232B3C" strokeWidth="3" />
    </g>
  )
}

function Frames({ s }: { s: number }) {
  const c = color('social')
  const frames: [number, number, number][] = [
    [30, 70, 22],
    [60, 64, 28],
    [94, 72, 20],
  ]
  return (
    <g>
      <rect x="16" y="98" width="108" height="5" rx="2" fill="#2A3244" />
      {s === 0 && <rect x="56" y="70" width="28" height="28" rx="3" {...GHOST} />}
      <Grow stage={s}>
        {frames.slice(0, s).map(([x, y, w], i) => (
          <g key={i}>
            <rect x={x} y={y} width={w} height={98 - y} rx="3" fill="#1A2030" stroke={c} strokeWidth="2.5" />
            <circle cx={x + w / 2} cy={y + (98 - y) * 0.42} r={w * 0.16} fill={c} opacity=".7" />
            <path d={`M${x + 4},${96} Q${x + w / 2},${y + (98 - y) * 0.55} ${x + w - 4},${96}`} fill={c} opacity=".45" />
          </g>
        ))}
        {s >= 3 && <path d="M117,62 C112,57 114,52 117,55 C120,52 122,57 117,62 Z" fill={c} />}
      </Grow>
    </g>
  )
}

function Rug({ s }: { s: number }) {
  const c = color('casa')
  return (
    <g>
      {s === 0 && <ellipse cx="200" cy="216" rx="80" ry="12" {...GHOST} />}
      <Grow stage={s} origin="50% 50%">
        {s >= 1 && <ellipse cx="200" cy="216" rx={[0, 70, 90, 100][s]} ry={[0, 10, 13, 14][s]} fill="#2A2112" stroke={c} strokeOpacity=".5" strokeWidth="2" />}
        {s >= 3 && <ellipse cx="200" cy="216" rx="78" ry="9" fill="none" stroke={c} strokeOpacity=".45" strokeWidth="2" strokeDasharray="6 5" />}
      </Grow>
    </g>
  )
}

function Painting({ s }: { s: number }) {
  const c = color('casa')
  return (
    <g>
      {s <= 1 && <rect x="298" y="38" width="54" height="42" rx="3" {...GHOST} />}
      <Grow stage={s >= 2 ? s : 0} origin="50% 0%">
        {s >= 2 && (
          <g transform={s === 2 ? 'rotate(-7 325 59)' : undefined}>
            <path d="M325,30 L310,38 M325,30 L340,38" stroke="#3A4256" strokeWidth="1.5" />
            <rect x="298" y="38" width="54" height="42" rx="3" fill="#141A28" stroke={c} strokeWidth="3" />
            {s >= 3 && (
              <>
                <circle cx="338" cy="50" r="5" fill="#FDE68A" />
                <path d="M301,77 L316,58 L326,68 L334,60 L349,77 Z" fill="#22C55E" opacity=".75" />
              </>
            )}
          </g>
        )}
      </Grow>
    </g>
  )
}

function Books({ s }: { s: number }) {
  const c = color('estudo')
  const books: [number, number, number, string][] = [
    [26, 172, 60, c],
    [32, 158, 50, '#5AA7FF'],
    [28, 144, 54, '#A78BFA'],
  ]
  return (
    <g>
      {s === 0 && <rect x="26" y="172" width="60" height="14" rx="3" {...GHOST} />}
      <Grow stage={s}>
        {books.slice(0, s).map(([x, y, w, col], i) => (
          <g key={i}>
            <rect x={x} y={y} width={w} height="14" rx="3" fill={col} />
            <rect x={x + 4} y={y + 3} width={w - 8} height="2.5" rx="1" fill="#0A0D14" opacity=".25" />
          </g>
        ))}
        {s >= 3 && <path d="M70,144 L70,132 L76,136 L82,132 L82,144" fill="#F43F5E" />}
      </Grow>
    </g>
  )
}

function Piggy({ s }: { s: number }) {
  const c = color('financas')
  return (
    <g>
      {s === 0 && <ellipse cx="116" cy="172" rx="20" ry="14" {...GHOST} />}
      <Grow stage={s}>
        {s >= 1 && (
          <g>
            {s >= 3 && <circle cx="116" cy="170" r="30" fill="url(#coinGlow)" />}
            <rect x="104" y="180" width="6" height="7" rx="2" fill="#E879A5" />
            <rect x="122" y="180" width="6" height="7" rx="2" fill="#E879A5" />
            <ellipse cx="116" cy="172" rx="20" ry="14" fill="#F9A8D4" />
            <ellipse cx="135" cy="172" rx="5" ry="6" fill="#F472B6" />
            <path d="M104,160 L106,152 L112,159 Z" fill="#F472B6" />
            <circle cx="124" cy="167" r="1.8" fill="#0A0D14" />
            <rect x="110" y="158" width="10" height="2.5" rx="1" fill="#9D174D" />
          </g>
        )}
        {s >= 2 && <circle cx="115" cy="150" r="5" fill="#FFD34D" stroke={c} strokeWidth="1" />}
        {s >= 3 &&
          [0, 1, 2].map((i) => <ellipse key={i} cx="146" cy={184 - i * 4} rx="7" ry="2.6" fill="#FFD34D" stroke="#B88A00" strokeWidth=".8" />)}
      </Grow>
    </g>
  )
}

function Candle({ s }: { s: number }) {
  const c = color('mente')
  return (
    <g>
      {s === 0 && <rect x="270" y="160" width="16" height="26" rx="3" {...GHOST} />}
      <Grow stage={s}>
        {s >= 1 && (
          <g>
            {s >= 3 && <circle cx="278" cy="152" r="22" fill="url(#flameGlow)" />}
            <rect x="270" y="160" width="16" height="26" rx="3" fill="#E9E3FF" />
            <rect x="270" y="160" width="16" height="5" rx="2.5" fill={c} opacity=".6" />
            <path d="M278,160 V154" stroke="#3A3A3A" strokeWidth="1.5" />
            {s >= 2 && (
              <motion.path
                d="M278,140 C284,148 283,154 278,155 C273,154 272,148 278,140 Z"
                fill="#FFB020"
                animate={{ scaleY: [1, 1.12, 0.95, 1] }}
                transition={{ duration: 1.6, repeat: Infinity }}
                style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}
              />
            )}
          </g>
        )}
      </Grow>
    </g>
  )
}

function Lamp({ s }: { s: number }) {
  const on = s >= 2
  return (
    <g>
      {s === 0 && <path d="M310,186 H340 M325,186 V120 M308,120 H342 L334,100 H316 Z" {...GHOST} />}
      <Grow stage={s}>
        {s >= 1 && (
          <g>
            {s >= 3 && <path d="M310,120 L286,186 H364 L340,120 Z" fill="url(#lampCone)" />}
            {on && <circle cx="325" cy="118" r={s >= 3 ? 30 : 18} fill="url(#lampGlow)" />}
            <rect x="312" y="182" width="26" height="5" rx="2.5" fill="#2A3244" />
            <rect x="323" y="120" width="4" height="62" fill="#2A3244" />
            <path d="M308,120 H342 L334,100 H316 Z" fill={on ? '#FFD34D' : '#3A4256'} />
          </g>
        )}
      </Grow>
    </g>
  )
}

function Plant({ s }: { s: number }) {
  const c = color('corpo')
  return (
    <g>
      <path d="M358,166 H392 L387,188 H363 Z" fill={s === 0 ? 'none' : '#7C4A2D'} {...(s === 0 ? GHOST : {})} />
      <Grow stage={s}>
        {s >= 1 && <path d="M375,166 V150" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" />}
        {s >= 1 && <path d="M375,154 C366,150 365,144 369,142 C374,144 376,149 375,154 Z" fill="#22C55E" />}
        {s >= 2 && (
          <>
            <path d="M375,150 V128" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" />
            <path d="M375,140 C386,136 388,128 383,126 C377,128 375,134 375,140 Z" fill="#22C55E" />
            <path d="M375,132 C366,128 364,120 368,118 C374,120 376,126 375,132 Z" fill="#4ADE80" />
          </>
        )}
        {s >= 3 && (
          <>
            <path d="M375,128 V116" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" />
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse key={a} cx="375" cy="109" rx="3.4" ry="6" fill={c} transform={`rotate(${a} 375 114)`} />
            ))}
            <circle cx="375" cy="114" r="3.4" fill="#FFD34D" />
          </>
        )}
      </Grow>
    </g>
  )
}

/** Mede a largura de um elemento (para o pet acompanhar o tamanho do cenário). */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

/**
 * Cantinho do pet: cenário atrás do favorito que muda conforme as áreas
 * cuidadas nos últimos 7 dias. Cada elemento mostra uma dica ao ser clicado.
 */
export function PetCorner({ autoState }: { autoState: PetState }) {
  const pet = useShownPet(autoState)
  const forced = useDevOverrides((s) => s.corner)
  const [ref, width] = useWidth<HTMLDivElement>()
  const [selected, setSelected] = useState<AreaId | null>(null)

  const aura = pet.sleeping ? '#8B5CF6' : STATE_STYLE[pet.state].color
  const days = pet.stats.areaDays7
  const stage = (a: AreaId) => forced[a] ?? stageFor(days[a])
  const spot = SPOTS.find((s) => s.area === selected)
  const petName = pet.isCompanion ? pet.name || SPECIES[pet.kind].name : 'seu pet'

  return (
    <div className="flex flex-wrap items-start gap-5">
      <div className="flex min-w-0 flex-[3_1_420px] flex-col gap-3">
        <div ref={ref} className="relative w-full overflow-hidden rounded-[18px] border border-line" style={{ aspectRatio: `${W} / ${H}` }}>
          <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" role="img" aria-label={`Cantinho de ${petName}`}>
            <defs>
              <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#131A29" />
                <stop offset="1" stopColor="#0E131D" />
              </linearGradient>
              <radialGradient id="petGlow">
                {/* Aura do estado atrás do pet, com transição de cor. */}
                <stop offset="0" stopOpacity=".18" style={{ stopColor: aura, transition: 'stop-color .6s ease' }} />
                <stop offset="1" stopOpacity="0" style={{ stopColor: aura, transition: 'stop-color .6s ease' }} />
              </radialGradient>
              <radialGradient id="moonGlow">
                <stop offset="0" stopColor="#FDE68A" stopOpacity=".45" />
                <stop offset="1" stopColor="#FDE68A" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="flameGlow">
                <stop offset="0" stopColor="#FFB020" stopOpacity=".5" />
                <stop offset="1" stopColor="#FFB020" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="lampGlow">
                <stop offset="0" stopColor="#FFD34D" stopOpacity=".55" />
                <stop offset="1" stopColor="#FFD34D" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="coinGlow">
                <stop offset="0" stopColor="#22C55E" stopOpacity=".3" />
                <stop offset="1" stopColor="#22C55E" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="lampCone" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#FFD34D" stopOpacity=".22" />
                <stop offset="1" stopColor="#FFD34D" stopOpacity="0" />
              </linearGradient>
            </defs>
            <rect width={W} height={FLOOR} fill="url(#wall)" />
            <rect y={FLOOR} width={W} height={H - FLOOR} fill="#0B0F17" />
            <path d={`M0,${FLOOR} H${W}`} stroke="#1E2636" strokeWidth="2" />
            <ellipse cx="200" cy="150" rx="120" ry="90" fill="url(#petGlow)" />

            <Window s={stage('sono')} />
            <Frames s={stage('social')} />
            <Painting s={stage('casa')} />
            <Rug s={stage('casa')} />
            <Books s={stage('estudo')} />
            <Piggy s={stage('financas')} />
            <Candle s={stage('mente')} />
            <Lamp s={stage('foco')} />
            <Plant s={stage('corpo')} />
          </svg>

          {/* Botões reais por cima de cada elemento */}
          {SPOTS.flatMap((s) =>
            s.hits.map(([x, y, w, h], i) => (
              <button
                key={`${s.area}-${i}`}
                type="button"
                aria-label={`${s.thing} (${AREAS.find((a) => a.id === s.area)!.name}): ver dica`}
                aria-pressed={selected === s.area}
                onClick={() => setSelected(selected === s.area ? null : s.area)}
                className="absolute rounded-lg transition-colors hover:bg-white/5"
                style={{
                  left: `${(x / W) * 100}%`,
                  top: `${(y / H) * 100}%`,
                  width: `${(w / W) * 100}%`,
                  height: `${(h / H) * 100}%`,
                  boxShadow: selected === s.area ? `inset 0 0 0 2px ${color(s.area)}88` : undefined,
                }}
              />
            )),
          )}

          <div className="absolute bottom-[5%] left-1/2 -translate-x-1/2">
            {width > 0 && (
              <Pet
                kind={pet.kind}
                state={pet.state}
                sleeping={pet.sleeping}
                phase={pet.phase}
                accessories={pet.accessories}
                size={Math.round(width * 0.3)}
                label={`${petName}: ${pet.sleeping ? 'dormindo' : 'cutucar'}`}
              />
            )}
          </div>
        </div>

        <p aria-live="polite" className="m-0 min-h-[46px] rounded-2xl border border-[#2A3242] bg-panel-2 px-4 py-3 text-sm text-soft">
          {spot ? (
            <>
              <strong style={{ color: color(spot.area) }}>{spot.thing}.</strong> {spot.tip} Nos últimos 7 dias: {days[spot.area]}{' '}
              {days[spot.area] === 1 ? 'dia' : 'dias'}.
            </>
          ) : pet.isCompanion ? (
            `Toque nos objetos do cantinho para ver como cada um cresce.`
          ) : (
            'Escolha um pet favorito na aba Pet para ele morar aqui. Toque nos objetos para ver as dicas.'
          )}
        </p>
      </div>

      {/* Legenda: estágio de cada área */}
      <ul className="m-0 grid min-w-0 flex-[2_1_240px] list-none grid-cols-2 gap-2 p-0">
        {SPOTS.map((s) => {
          const st = stage(s.area)
          const area = AREAS.find((a) => a.id === s.area)!
          return (
            <li key={s.area}>
              <button
                type="button"
                aria-pressed={selected === s.area}
                onClick={() => setSelected(selected === s.area ? null : s.area)}
                className="flex w-full flex-col gap-1.5 rounded-xl bg-panel-2 px-3 py-2.5 text-left"
                style={{ boxShadow: selected === s.area ? `inset 0 0 0 1.5px ${area.color}88` : undefined }}
              >
                <span className="flex items-center justify-between gap-2 text-[13px] font-semibold">
                  {s.thing}
                  <span className="flex gap-1" aria-label={`Estágio ${st} de 3`}>
                    {[1, 2, 3].map((n) => (
                      <span key={n} className="h-1.5 w-1.5 rounded-full" style={{ background: n <= st ? area.color : '#2A3244' }} />
                    ))}
                  </span>
                </span>
                <span className="font-mono text-[11px] text-muted">
                  {area.name} · {days[s.area]}/7
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
