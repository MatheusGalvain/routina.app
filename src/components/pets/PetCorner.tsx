import { motion, useAnimationControls } from 'framer-motion'
import { useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import type { Area, AreaId, PetState, Placed } from '../../types'
import { useAreas } from '../../store/useRotina'
import { useShownPet } from '../../store/useCompanion'
import { useDevOverrides } from '../../store/useDevOverrides'
import { useCornerEdit } from '../../store/useCornerEdit'
import { chooseScene, useCornerView, writeLayout } from '../../store/useCorner'
import { useAuth } from '../../store/useAuth'
import { Trophy, trophyTitle } from '../../data/trophies'
import { ITEM_BY_ID, SCENES, SCENE_BY_ID, SceneItem, type SceneId } from '../../data/scenes'
import { moveSlot } from '../../lib/corner'
import { Icon } from '../ui/ui'
import { Pet } from './Pet'
import { SPECIES } from './pets'
import { FLOOR_Y, SCENE_H, SCENE_W, SLOT_X, SceneStage, seedFrom } from '../scenes/SceneStage'
import { CornerDrawer } from './CornerDrawer'

/** Distância do chão até a base da cena, em % da altura. */
const FLOOR_FROM_BOTTOM = ((SCENE_H - FLOOR_Y) / SCENE_H) * 100

/** As 4 áreas mais ativas na semana (mais dias primeiro), sem as zeradas. Empate: a ordem da pessoa. */
export function topAreas(areas: Area[], days: Record<AreaId, number>, n = 4): Area[] {
  return areas
    .filter((a) => (days[a.id] ?? 0) > 0)
    .sort((a, b) => days[b.id] - days[a.id])
    .slice(0, n)
}

/** Espaço mais próximo de um ponto da tela (para soltar o que foi arrastado). */
function slotAt(clientX: number, box: DOMRect) {
  const x = ((clientX - box.left) / box.width) * SCENE_W
  let best = 0
  SLOT_X.forEach((sx, i) => {
    if (Math.abs(sx - x) < Math.abs(SLOT_X[best] - x)) best = i
  })
  return best
}

/** Nome de quem ocupa um espaço (leitores de tela e dica). */
export const placedTitle = (p: Placed) => (p.kind === 'trophy' ? trophyTitle(p.id, p.tier) : ITEM_BY_ID[p.id].name)

/** Desenho de quem ocupa um espaço, no tamanho da cena. */
function PlacedArt({ p, scale }: { p: Placed; scale: number }) {
  if (p.kind === 'trophy') return <Trophy id={p.id} tier={p.tier} size={Math.round(46 * scale)} />
  return <SceneItem id={p.id} size={Math.round(52 * (ITEM_BY_ID[p.id].scale ?? 1) * scale)} />
}

/** Semente da cena: a mesma pessoa vê sempre a mesma cena. */
export function useSceneSeed() {
  const uid = useAuth((s) => s.session?.user.id) ?? 'habbit-do'
  return useMemo(() => seedFrom(uid), [uid])
}

/** Dias de cada área nos últimos 7 (com a sobrescrita do painel dev). */
function useWeekDays(stats: Record<AreaId, number>) {
  const areas = useAreas()
  const forced = useDevOverrides((s) => s.corner)
  const days = Object.fromEntries(areas.map((a) => [a.id, forced[a.id] ?? stats[a.id] ?? 0])) as Record<AreaId, number>
  return { areas, days, shown: topAreas(areas, days) }
}

/**
 * Cantinho do pet: o cenário escolhido (cosmos ou floresta, ver SceneStage) com o pet no centro
 * e 4 espaços no chão para troféus e itens do cenário.
 * `editable`: só na aba Pet aparece o "Editar cantinho" (cenário e montagem). No Início ele mostra
 * só o resultado, com a explicação ao lado e um link para arrumar na aba Pet.
 */
export function PetCorner({ autoState, legend = true, editable = false }: { autoState: PetState; legend?: boolean; editable?: boolean }) {
  const pet = useShownPet(autoState)
  const { scene, layout } = useCornerView()
  const { areas, days, shown } = useWeekDays(pet.stats.areaDays7)
  const editing = useCornerEdit((s) => s.editing) && editable
  const setEdit = useCornerEdit((s) => s.set)
  const seed = useSceneSeed()
  const stageRef = useRef<HTMLDivElement>(null)
  const dragged = useRef(false)
  const hop = useAnimationControls()

  // Ao sair da tela, sai do modo edição.
  useEffect(() => () => setEdit({ editing: false, slot: null }), [])

  // Trocou de cenário: o pet chega dando um pulinho.
  const firstScene = useRef(true)
  useEffect(() => {
    if (firstScene.current) {
      firstScene.current = false
      return
    }
    void hop.start({ y: [0, -26, 0, -8, 0], transition: { duration: 0.9, delay: 0.45, ease: 'easeOut' } })
  }, [scene])

  const petName = pet.isCompanion ? pet.name || SPECIES[pet.kind].name : 'seu pet'
  const sceneInfo = SCENE_BY_ID[scene]

  return (
    <div className="flex flex-wrap items-start gap-5">
      <div className="flex min-w-0 flex-[3_1_420px] flex-col gap-3">
        <div ref={stageRef} className="overflow-hidden rounded-[18px] border border-line">
          <SceneStage
            scene={scene}
            areas={shown}
            days={days}
            seed={seed}
            label={`Cantinho de ${petName}: ${sceneInfo.title}`}
            overlay={({ width, scale }) => {
              const petSize = Math.round(width * 0.23)
              // Altura mínima de 44px para o toque nos espaços (modo edição).
              const boxW = Math.max(44, Math.round(62 * scale))
              const boxH = Math.max(44, Math.round(70 * scale))
              return (
                <>
                  {/* Pés na sombra do chão: o desenho tem ~15% de folga embaixo e o pet flutua um pouco. */}
                  <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: `calc(${FLOOR_FROM_BOTTOM}% - ${Math.round(petSize * 0.2)}px)` }}>
                    <motion.div animate={hop}>
                      <Pet
                        kind={pet.kind}
                        state={pet.state}
                        sleeping={pet.sleeping}
                        phase={pet.phase} adultDetail={pet.adultDetail}
                        accessories={pet.accessories}
                        size={petSize}
                        play
                        label={`${petName}: ${pet.sleeping ? 'dormindo' : 'cutucar'}`}
                      />
                    </motion.div>
                  </div>

                  {SLOT_X.map((x, i) => {
                    const p = layout[i]
                    const style = { left: `${(x / SCENE_W) * 100}%`, bottom: `${FLOOR_FROM_BOTTOM}%`, width: boxW, height: boxH, marginLeft: -boxW / 2 }
                    if (!editing)
                      return p ? (
                        <div key={i} className="pointer-events-none absolute flex items-end justify-center" style={style} title={placedTitle(p)}>
                          {/* Sombrinha no chão. */}
                          <span aria-hidden="true" className="absolute -bottom-[2px] left-1/2 h-[6%] w-[70%] -translate-x-1/2 rounded-[50%] bg-black/45 blur-[2px]" />
                          <span className="relative">
                            <PlacedArt p={p} scale={scale} />
                          </span>
                        </div>
                      ) : null
                    return (
                      <motion.button
                        key={`${i}-${p ? `${p.kind}:${p.id}` : 'vazio'}`}
                        type="button"
                        aria-label={p ? `${placedTitle(p)}: trocar ou arrastar` : 'Espaço vazio: escolher troféu ou item'}
                        className="absolute z-10 flex touch-none items-end justify-center rounded-xl border border-dashed border-muted/50 bg-fg/[0.04]"
                        style={{ ...style, marginBottom: -3 }}
                        drag={!!p}
                        dragSnapToOrigin
                        dragElastic={0.15}
                        dragMomentum={false}
                        whileDrag={{ scale: 1.08, zIndex: 20 }}
                        onDragStart={() => (dragged.current = true)}
                        onDragEnd={(_, info) => {
                          const to = slotAt(info.point.x - window.scrollX, stageRef.current!.getBoundingClientRect())
                          if (to !== i) writeLayout(moveSlot(layout, i, to))
                        }}
                        onClick={() => {
                          if (dragged.current) {
                            dragged.current = false
                            return
                          }
                          setEdit({ slot: i })
                        }}
                      >
                        {p ? (
                          <PlacedArt p={p} scale={scale} />
                        ) : (
                          <span className="mt-auto mb-auto text-muted">
                            <Icon name="plus" size={16} />
                          </span>
                        )}
                      </motion.button>
                    )
                  })}
                </>
              )
            }}
          />
        </div>

        {/* Modo edição: as prévias dos cenários ficam logo abaixo da cena. */}
        {editing && <ScenePicker current={scene} areas={shown} days={days} seed={seed} />}

        {editable && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="m-0 min-w-[200px] flex-1 rounded-2xl border border-line-2 bg-panel-2 px-4 py-3 text-sm text-soft">
              {editing
                ? 'Escolha o cenário nas prévias logo acima. Toque num espaço para colocar um troféu ou um item deste cenário; arraste para trocar de lugar.'
                : `Cada cenário guarda a própria montagem. ${sceneInfo.description}`}
            </p>
            <button
              type="button"
              onClick={() => setEdit({ editing: !editing, slot: null })}
              className={`min-h-11 rounded-full px-5 text-sm font-bold ${editing ? 'bg-ok text-ink' : 'border border-line text-soft hover:bg-panel-2'}`}
            >
              {editing ? 'Pronto' : 'Editar cantinho'}
            </button>
          </div>
        )}
      </div>

      {legend && (
        <div className="flex min-w-0 flex-[2_1_240px] flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <h3 id="cantinho-titulo" className="m-0 text-base font-bold">
              {scene === 'cosmos' ? 'O céu da sua semana' : 'Os vaga-lumes da sua semana'}
            </h3>
            <p className="m-0 text-[13.5px] leading-relaxed text-muted">
              {scene === 'cosmos'
                ? `Aqui é a ilhota de ${petName}. Cada dia em que você conclui um bloco de uma área acende uma estrela na constelação dela, e as 4 áreas mais cuidadas nos últimos 7 dias aparecem no céu.`
                : `Aqui é a clareira de ${petName}. Cada área cuidada nos últimos 7 dias vira vaga-lumes na cor dela: quanto mais dias, mais vaga-lumes e mais brilho. Aparecem as 4 mais cuidadas.`}{' '}
              No chão ficam os troféus e itens que você escolheu.
            </p>
          </div>
          <ul className="m-0 grid min-w-0 list-none grid-cols-2 gap-2 p-0" aria-labelledby="cantinho-titulo">
            {/* Mais dias na semana primeiro; empate segue a ordem da pessoa. */}
            {[...areas]
              .sort((a, b) => days[b.id] - days[a.id])
              .map((area) => {
                const inScene = shown.some((a) => a.id === area.id)
                return (
                  <li key={area.id} className="flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-0.5 rounded-xl bg-panel-2 px-3 py-2.5">
                    <span className="flex items-center gap-2 text-[13px] font-semibold">
                      <span className="h-2 w-2 rounded-full" style={{ background: area.color, opacity: inScene ? 1 : 0.3 }} aria-hidden="true" />
                      {area.name}
                    </span>
                    <span className="font-mono text-[11px] text-muted">
                      {days[area.id]}/7{inScene ? (scene === 'cosmos' ? ' · no céu' : ' · na clareira') : ''}
                    </span>
                  </li>
                )
              })}
          </ul>
          {!editable && (
            <Link to="/pet#cantinho" className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-full px-1 text-sm font-semibold text-accent hover:underline">
              <Icon name="edit" size={14} /> Arrumar o cantinho na aba Pet
            </Link>
          )}
        </div>
      )}

      {editable && <CornerDrawer />}
    </div>
  )
}

/** Seletor de cenário (modo edição): as duas prévias pequenas. */
function ScenePicker({ current, areas, days, seed }: { current: SceneId; areas: Area[]; days: Record<AreaId, number>; seed: number }) {
  return (
    <div role="radiogroup" aria-label="Cenário do cantinho" className="grid grid-cols-2 gap-2.5">
      {SCENES.map((s) => {
        const on = s.id === current
        return (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => chooseScene(s.id)}
            className={`flex min-w-0 flex-col gap-1.5 rounded-2xl border-2 p-1.5 text-left transition-colors ${on ? 'border-accent bg-accent/10' : 'border-line bg-panel-2 hover:border-line-2'}`}
          >
            <span className="overflow-hidden rounded-xl">
              <SceneStage scene={s.id} areas={areas} days={days} seed={seed} preview />
            </span>
            <span className="flex min-w-0 flex-col px-1.5 pb-1">
              <strong className="text-[13px]">{s.name}</strong>
              <span className="truncate text-[11.5px] text-muted">{s.title}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
