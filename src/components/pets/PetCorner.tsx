import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import type { Area, AreaId, PetState } from '../../types'
import { useAreas } from '../../store/useRotina'
import { useShownPet } from '../../store/useCompanion'
import { useDevOverrides } from '../../store/useDevOverrides'
import { useCornerEdit } from '../../store/useCornerEdit'
import { useTrophyView, writeSlots } from '../../store/useTrophies'
import { TROPHIES, Trophy, trophyTitle } from '../../data/trophies'
import { moveSlot, tiersOf } from '../../lib/corner'
import { Icon } from '../ui/ui'
import { Pet } from './Pet'
import { SPECIES, STATE_STYLE } from './pets'
import { CornerSky, SCENE } from './CornerSky'
import { CornerDrawer } from './CornerDrawer'

const { W, H, FLOOR } = SCENE

/** Centro de cada espaço de troféu no chão: 2 à esquerda e 2 à direita do pet. */
export const SLOT_X = [62, 124, 276, 338]

/** Distância do chão até a base do cenário, em % da altura. */
const FLOOR_FROM_BOTTOM = ((H - FLOOR) / H) * 100

/** As 4 áreas mais ativas na semana (mais dias primeiro), sem as zeradas. Empate: a ordem da pessoa. */
export function topAreas(areas: Area[], days: Record<AreaId, number>, n = 4): Area[] {
  return areas
    .filter((a) => (days[a.id] ?? 0) > 0)
    .sort((a, b) => days[b.id] - days[a.id])
    .slice(0, n)
}

/** Mede a largura de um elemento (para o pet e os troféus acompanharem o tamanho do cenário). */
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

/** Espaço mais próximo de um ponto da tela (para soltar o troféu arrastado). */
function slotAt(clientX: number, box: DOMRect) {
  const x = ((clientX - box.left) / box.width) * W
  let best = 0
  SLOT_X.forEach((sx, i) => {
    if (Math.abs(sx - x) < Math.abs(SLOT_X[best] - x)) best = i
  })
  return best
}

/**
 * Cantinho do pet, em duas camadas:
 *  - céu com as constelações das 4 áreas mais cuidadas na semana;
 *  - chão com o pet no centro e 4 espaços para troféus (montados no modo "Editar cantinho").
 */
export function PetCorner({ autoState, legend = true }: { autoState: PetState; legend?: boolean }) {
  const pet = useShownPet(autoState)
  const forced = useDevOverrides((s) => s.corner)
  const { trophies, slots } = useTrophyView()
  const areas = useAreas()
  const editing = useCornerEdit((s) => s.editing)
  const setEdit = useCornerEdit((s) => s.set)
  const [ref, width] = useWidth<HTMLDivElement>()
  const dragged = useRef(false)

  // Ao sair da tela, sai do modo edição.
  useEffect(() => () => setEdit({ editing: false, slot: null }), [])

  const aura = pet.sleeping ? STATE_STYLE.descanso.color : STATE_STYLE[pet.state].color
  const days = Object.fromEntries(areas.map((a) => [a.id, forced[a.id] ?? pet.stats.areaDays7[a.id] ?? 0])) as Record<AreaId, number>
  const shown = topAreas(areas, days)
  const petName = pet.isCompanion ? pet.name || SPECIES[pet.kind].name : 'seu pet'
  const hasTrophies = TROPHIES.some((t) => tiersOf(trophies, t.id).length > 0)
  const trophySize = Math.round(width * 0.115)
  // Altura mínima de 44px para o toque; a largura encolhe em telas estreitas para não cobrir o pet.
  const boxH = Math.max(44, Math.round(trophySize * 1.3))
  const boxW = Math.max(Math.round(trophySize * 1.3), Math.min(44, Math.round(width * 0.135)))

  return (
    <div className="flex flex-wrap items-start gap-5">
      <div className="flex min-w-0 flex-[3_1_420px] flex-col gap-3">
        <div ref={ref} className="relative w-full overflow-hidden rounded-[18px] border border-line" style={{ aspectRatio: `${W} / ${H}` }}>
          <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" role="img" aria-label={`Cantinho de ${petName}`}>
            <CornerSky areas={shown} days={days} aura={aura} shadows={SLOT_X.filter((_, i) => slots[i])} />
            {!hasTrophies && !editing && (
              <g style={{ fill: 'var(--color-muted)' }} fontSize="8.5" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif">
                <text x="93" y={FLOOR + 18}>
                  Seus troféus aparecem aqui.
                </text>
                <text x="307" y={FLOOR + 18}>
                  Seus troféus aparecem aqui.
                </text>
              </g>
            )}
          </svg>

          {/* Pés na linha do chão: o desenho do pet tem ~13% de folga embaixo. */}
          <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: `${FLOOR_FROM_BOTTOM - 6.5}%` }}>
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

          {/* Troféus (e, no modo edição, os espaços tracejados). */}
          {width > 0 &&
            SLOT_X.map((x, i) => {
              const s = slots[i]
              const style = { left: `${(x / W) * 100}%`, bottom: `${FLOOR_FROM_BOTTOM}%`, width: boxW, height: boxH, marginLeft: -boxW / 2 }
              if (!editing)
                return s ? (
                  <div key={i} className="pointer-events-none absolute flex items-end justify-center" style={style} title={trophyTitle(s.trophyId, s.tier)}>
                    <Trophy id={s.trophyId} tier={s.tier} size={trophySize} />
                  </div>
                ) : null
              return (
                <motion.button
                  key={`${i}-${s?.trophyId ?? 'vazio'}`}
                  type="button"
                  aria-label={s ? `${trophyTitle(s.trophyId, s.tier)}: trocar ou arrastar` : 'Espaço vazio: escolher troféu'}
                  className="absolute z-10 flex touch-none items-end justify-center rounded-xl border border-dashed border-muted/45 bg-fg/[0.03]"
                  style={{ ...style, marginBottom: -3 }}
                  drag={!!s}
                  dragSnapToOrigin
                  dragElastic={0.15}
                  dragMomentum={false}
                  whileDrag={{ scale: 1.08, zIndex: 20 }}
                  onDragStart={() => (dragged.current = true)}
                  onDragEnd={(_, info) => {
                    const to = slotAt(info.point.x - window.scrollX, ref.current!.getBoundingClientRect())
                    if (to !== i) writeSlots(moveSlot(slots, i, to))
                  }}
                  onClick={() => {
                    if (dragged.current) {
                      dragged.current = false
                      return
                    }
                    setEdit({ slot: i })
                  }}
                >
                  {s ? (
                    <Trophy id={s.trophyId} tier={s.tier} size={trophySize} />
                  ) : (
                    <span className="mb-auto mt-auto text-muted">
                      <Icon name="plus" size={16} />
                    </span>
                  )}
                </motion.button>
              )
            })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <p className="m-0 min-w-[200px] flex-1 rounded-2xl border border-line-2 bg-panel-2 px-4 py-3 text-sm text-soft">
            {editing
              ? 'Toque num espaço para escolher o troféu. Arraste um troféu para trocar de lugar.'
              : shown.length
                ? 'Cada dia em que você cuida de uma área acende estrelas na constelação dela. O céu mostra as 4 áreas mais cuidadas da semana.'
                : 'Conclua blocos e as constelações das suas áreas começam a acender.'}
          </p>
          <button
            type="button"
            onClick={() => setEdit({ editing: !editing, slot: null })}
            className={`min-h-11 rounded-full px-5 text-sm font-bold ${editing ? 'bg-ok text-ink' : 'border border-line text-soft hover:bg-panel-2'}`}
          >
            {editing ? 'Pronto' : 'Editar cantinho'}
          </button>
        </div>
      </div>

      {legend && (
        <ul className="m-0 grid min-w-0 flex-[2_1_240px] list-none grid-cols-2 gap-2 p-0" aria-label="Áreas nos últimos 7 dias">
          {areas.map((area) => {
            const inSky = shown.some((a) => a.id === area.id)
            return (
              <li key={area.id} className="flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-0.5 rounded-xl bg-panel-2 px-3 py-2.5">
                <span className="flex items-center gap-2 text-[13px] font-semibold">
                  <span className="h-2 w-2 rounded-full" style={{ background: area.color, opacity: inSky ? 1 : 0.3 }} aria-hidden="true" />
                  {area.name}
                </span>
                <span className="font-mono text-[11px] text-muted">
                  {days[area.id]}/7{inSky ? ' · no céu' : ''}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      <CornerDrawer />
    </div>
  )
}
