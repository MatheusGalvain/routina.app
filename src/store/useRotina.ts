import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import type { AccessoryId, Area, AreaId, Block, CornerLayout, CornerLayouts, DayTask, DefaultAreaKey, UserTemplate, BlockLog, Companion, DayLog, EventItemMap, PetAppearance, PetKind, PetPhase, PetProgress, PlanEntry, Routine, SceneItemMap, Slot, TrophyMap, TrophyUnlock, UnlockId } from '../types'
import type { TrophyId } from '../data/trophies'
import { EMPTY_LAYOUT, EMPTY_LAYOUTS } from '../lib/corner'
import { DEFAULT_SCENE, type SceneId, type SceneItemId } from '../data/scenes'
import { TEMPLATES } from '../data/templates'
import { AREA_ALLOWED, AREA_NAME_MAX, AREA_PALETTE, DEFAULT_AREAS, MAX_AREAS, ROUTINE_COLORS, normalizeAreas, pastelArea, pastelRoutine, removedDefaults, sameName } from '../data/areas'
import { APP_KEY } from '../lib/storageKeys'
import { dayKey, nowInTz } from '../lib/dates'
import { weekdayOf } from '../lib/routines'
import { LEGACY_SECRET_UNLOCK, SECRET_UNLOCK, legacyPhase } from '../lib/companion'
import { dayTaskBlock } from '../lib/today'

const uid = () => crypto.randomUUID()

/** Chave antiga (antes das contas), usada só para oferecer a migração dos dados deste aparelho. */
export const LEGACY_KEY = APP_KEY

// O cache local é separado por usuário: "habbit-do:<id do usuário>". Sem usuário, nada é lido nem gravado.
let storageUser: string | null = null
export const setStorageUser = (uid: string | null) => {
  storageUser = uid
}
export const userStorageKey = () => (storageUser ? `${LEGACY_KEY}:${storageUser}` : null)

const scopedStorage: StateStorage = {
  getItem: () => {
    const key = userStorageKey()
    return key ? localStorage.getItem(key) : null
  },
  setItem: (_name, value) => {
    const key = userStorageKey()
    if (key) localStorage.setItem(key, value)
  },
  removeItem: () => {
    const key = userStorageKey()
    if (key) localStorage.removeItem(key)
  },
}

export const DEFAULT_COMPANION: Companion = { kind: null, name: '', equipped: {}, appearance: 'auto', showAdultDetail: true }
export const DEFAULT_PROGRESS: PetProgress = { initialized: false, peakActiveDays: 0, seenPhase: 'filhote', unlocked: [], phases: {} }

/** Todas as espécies (para semear a fase guardada de quem já usava o app). */
const ALL_KINDS: PetKind[] = ['gatinho', 'sapinho', 'polvinho', 'pintinho', 'ourico', 'corujinha', 'coelho', 'coelho-cristal']

/**
 * Antes do crescimento por espécie, todo pet seguia 7/21 dias. Guarda essa fase para cada espécie,
 * para ninguém regredir com a regra nova (as fases só sobem a partir daqui).
 */
export function seedPhases(peak: number): Partial<Record<PetKind, PetPhase>> {
  const phase = legacyPhase(peak)
  return phase === 'filhote' ? {} : Object.fromEntries(ALL_KINDS.map((k) => [k, phase]))
}

/** O pet secreto antigo era o coelho: a marca de desbloqueio dele passa para o coelho de cristal. */
export function migrateSecretUnlock(unlocked: UnlockId[]): UnlockId[] {
  if (!unlocked.includes(LEGACY_SECRET_UNLOCK as UnlockId)) return unlocked
  const rest = unlocked.filter((u) => (u as string) !== LEGACY_SECRET_UNLOCK && u !== SECRET_UNLOCK)
  return [...rest, SECRET_UNLOCK]
}

export interface RotinaState {
  /** Áreas da vida da pessoa, sempre em ordem de `position`. */
  areas: Area[]
  routines: Routine[]
  /** Modelos de rotina da pessoa (os do app ficam em src/data/templates.ts). */
  templates: UserTemplate[]
  logs: Record<string, DayLog>
  /** Tarefas concluídas: id do bloco → dia em que foi feita. */
  completedTasks: Record<string, string>
  activeBlockId: string | null
  companion: Companion
  petProgress: PetProgress
  /** Troféus conquistados, com a data de cada nível. */
  trophies: TrophyMap
  /** Cenário do cantinho. */
  scene: SceneId
  /** Itens de cenário desbloqueados (nunca são perdidos). */
  sceneItems: SceneItemMap
  /** Itens de evento sazonal conquistados (nunca são perdidos). */
  eventItems: EventItemMap
  /** Os 4 espaços do chão, por cenário (cada cenário guarda a própria montagem). */
  cornerLayouts: CornerLayouts
  /** Dia (AAAA-MM-DD) em que a pessoa acordou o pet pelo botão do Início. Só neste aparelho. */
  wokenOn: string | null
  /** Tarefas avulsas (só de um dia, fora das rotinas). */
  dayTasks: DayTask[]
  /** Histórias dos pets já lidas até o fim: id da história → data ISO. */
  storyReads: Record<string, string>

  /** Cria uma área (até 12). Devolve o id, ou null se chegou no limite. */
  addArea: (name: string, color: string) => string | null
  updateArea: (id: AreaId, patch: Partial<Pick<Area, 'name' | 'color' | 'icon'>>) => void
  /** Move uma área uma posição para cima (-1) ou para baixo (+1). */
  moveArea: (id: AreaId, dir: -1 | 1) => void
  /** Exclui a área; os blocos que usavam ela passam para `moveTo`. O histórico não muda. */
  deleteArea: (id: AreaId, moveTo: AreaId | null) => void
  /**
   * Traz de volta uma área padrão excluída, com a chave original (o histórico e o troféu voltam a contar).
   * Com `mergeFrom`, a área criada pela pessoa vira a original: blocos e registros passam para a chave.
   */
  restoreArea: (key: DefaultAreaKey, mergeFrom?: AreaId) => void

  createRoutine: (name?: string) => string
  /** Arquiva (pausa sem perder nada) ou desarquiva uma rotina. */
  archiveRoutine: (id: string, archived: boolean) => void
  /** "Usar de novo": a rotina vira de um dia só na data escolhida e sai das arquivadas. */
  reuseRoutine: (id: string, date: string) => void
  updateRoutine: (id: string, patch: Partial<Omit<Routine, 'id' | 'blocks'>>) => void
  deleteRoutine: (id: string) => void
  /** Usa um modelo (do app, pela chave, ou da pessoa, pelo id): cria uma rotina nova e devolve o id dela. */
  addTemplate: (keyOrId: string) => string | undefined

  /** Modelo vazio, para montar do zero. */
  createTemplate: (name?: string) => string
  /** Copia nome, cor, dias e blocos da rotina (sem os registros) para um modelo novo. */
  saveAsTemplate: (routineId: string) => string | undefined
  updateTemplate: (id: string, patch: Partial<Omit<UserTemplate, 'id'>>) => void
  deleteTemplate: (id: string) => void

  addBlock: (routineId: string, block: Omit<Block, 'id'>) => void
  updateBlock: (routineId: string, blockId: string, patch: Partial<Block>) => void
  removeBlock: (routineId: string, blockId: string) => void
  setBlocks: (routineId: string, blocks: Block[]) => void

  toggleDone: (date: string, block: Block) => boolean
  increment: (date: string, block: Block, delta: number) => boolean
  toggleSkip: (date: string, block: Block) => boolean
  setActive: (blockId: string | null) => void
  /** Acorda o pet hoje (botão "Acordar meu pet"). */
  wakePet: (date: string) => void
  /** Tarefa avulsa de um dia (fora das rotinas). Devolve o id. */
  addDayTask: (date: string, name: string, areaId: AreaId | null) => string
  updateDayTask: (id: string, patch: Partial<Pick<DayTask, 'name' | 'areaId'>>) => void
  /** Apaga a tarefa avulsa e o registro dela no dia. */
  deleteDayTask: (id: string) => void
  /** Tarefa não concluída de um dia anterior: leva para `today` (cria uma cópia) ou descarta. */
  resolveDayTask: (id: string, resolution: 'levada' | 'descartada', today: string) => void
  /** "Minha ordem" do dia (ids de blocos e tarefas avulsas). */
  setDayOrder: (date: string, order: string[]) => void
  /** Marca a história como lida (a primeira data fica). */
  markStoryRead: (storyId: string) => void
  setNote: (date: string, note: string) => void
  /** Guarda a lista planejada do dia, para o histórico não depender das rotinas atuais. */
  setPlan: (date: string, plan: PlanEntry[]) => void

  setCompanionKind: (kind: PetKind | null) => void
  setCompanionName: (name: string) => void
  setAppearance: (appearance: PetAppearance) => void
  setShowAdultDetail: (show: boolean) => void
  /** Equipa um acessório no slot (ou tira, com `null`). */
  equip: (slot: Slot, id: AccessoryId | null) => void
  updateProgress: (patch: Partial<PetProgress>) => void
  /** Acrescenta níveis conquistados (os que já existem ficam como estão). */
  addTrophies: (list: { id: TrophyId; unlock: TrophyUnlock }[]) => void
  setScene: (scene: SceneId) => void
  /** Acrescenta itens desbloqueados (os que já existem ficam como estão). */
  addSceneItems: (ids: SceneItemId[], at: string) => void
  setCornerLayout: (scene: SceneId, layout: CornerLayout) => void
  /** Acrescenta itens de evento conquistados (os que já existem ficam como estão). */
  addEventItems: (list: { eventId: string; itemId: string }[], at: string) => void
}

const mapRoutine = (routines: Routine[], id: string, fn: (r: Routine) => Routine) =>
  routines.map((r) => (r.id === id ? fn(r) : r))

export const useRotina = create<RotinaState>()(
  persist(
    (set, get) => {
      // Todo registro guarda a área e o tipo do bloco, para o histórico não depender das rotinas atuais.
      const patchLog = (date: string, block: Block, fn: (l: BlockLog) => BlockLog) => {
        const day = get().logs[date] ?? { blocks: {} }
        const next = { ...fn(day.blocks[block.id] ?? {}), areaId: block.areaId, type: block.type }
        set({ logs: { ...get().logs, [date]: { ...day, blocks: { ...day.blocks, [block.id]: next } } } })
        return next
      }

      // Tarefas concluídas em dias anteriores voltam a aparecer (quando a rotina passa a valer em outro dia).
      // O registro daqueles dias não muda (continuam concluídas no histórico); as de hoje ficam como estão.
      const reopenTasks = (blocks: Block[]) => {
        const today = dayKey()
        const tasks = { ...get().completedTasks }
        let changed = false
        for (const b of blocks) {
          const doneOn = tasks[b.id]
          if (b.type === 'tarefa' && doneOn && doneOn < today) {
            delete tasks[b.id]
            changed = true
          }
        }
        if (changed) set({ completedTasks: tasks })
      }

      return {
        areas: DEFAULT_AREAS,
        routines: [],
        templates: [],
        logs: {},
        completedTasks: {},
        activeBlockId: null,
        companion: DEFAULT_COMPANION,
        petProgress: DEFAULT_PROGRESS,
        trophies: {},
        scene: DEFAULT_SCENE,
        sceneItems: {},
        eventItems: {},
        cornerLayouts: EMPTY_LAYOUTS,
        wokenOn: null,
        dayTasks: [],
        storyReads: {},

        addArea: (name, color) => {
          const areas = get().areas
          if (areas.length >= MAX_AREAS) return null
          const clean = name.trim().slice(0, AREA_NAME_MAX) || 'Nova área'
          const safeColor = AREA_ALLOWED.includes(color) ? color : AREA_PALETTE[areas.length % AREA_PALETTE.length]
          // Mesmo nome de uma área padrão excluída: volta a ser ela (com o histórico e o troféu).
          const original = removedDefaults(areas).find((d) => sameName(d.name, clean))
          const id = original?.id ?? uid()
          set({ areas: [...areas, { id, name: clean, color: safeColor, position: areas.length, isDefault: !!original }] })
          return id
        },
        updateArea: (id, patch) => {
          const clean = { ...patch }
          if (clean.name !== undefined) clean.name = clean.name.slice(0, AREA_NAME_MAX)
          if (clean.color !== undefined && !AREA_ALLOWED.includes(clean.color)) delete clean.color
          set({ areas: get().areas.map((a) => (a.id === id ? { ...a, ...clean } : a)) })
        },
        moveArea: (id, dir) => {
          const list = [...get().areas]
          const i = list.findIndex((a) => a.id === id)
          const j = i + dir
          if (i < 0 || j < 0 || j >= list.length) return
          ;[list[i], list[j]] = [list[j], list[i]]
          set({ areas: list.map((a, position) => (a.position === position ? a : { ...a, position })) })
        },
        deleteArea: (id, moveTo) => {
          const areas = get().areas
          if (areas.length <= 1 || !areas.some((a) => a.id === id)) return
          const target = moveTo && moveTo !== id && areas.some((a) => a.id === moveTo) ? moveTo : null
          const routines = get().routines.map((r) =>
            r.blocks.some((b) => b.areaId === id) && target ? { ...r, blocks: r.blocks.map((b) => (b.areaId === id ? { ...b, areaId: target } : b)) } : r,
          )
          const templates = get().templates.map((t) =>
            t.blocks.some((b) => b.areaId === id) && target ? { ...t, blocks: t.blocks.map((b) => (b.areaId === id ? { ...b, areaId: target } : b)) } : t,
          )
          set({ routines, templates, areas: normalizeAreas(areas.filter((a) => a.id !== id)) })
        },

        restoreArea: (key, mergeFrom) => {
          const areas = get().areas
          const original = DEFAULT_AREAS.find((d) => d.id === key)
          if (!original || areas.some((a) => a.id === key)) return
          const from = mergeFrom ? areas.find((a) => a.id === mergeFrom && !a.isDefault) : undefined
          if (!from) {
            if (areas.length >= MAX_AREAS) return
            set({ areas: [...areas, { ...original, position: areas.length }] })
            return
          }
          // Junta: a área da pessoa fica com o nome, a cor e o lugar dela, mas com a chave original.
          const swap = (id: AreaId) => (id === from.id ? key : id)
          const routines = get().routines.map((r) =>
            r.blocks.some((b) => b.areaId === from.id) ? { ...r, blocks: r.blocks.map((b) => ({ ...b, areaId: swap(b.areaId) })) } : r,
          )
          const logs = { ...get().logs }
          for (const [date, day] of Object.entries(logs)) {
            const touchesLog = Object.values(day.blocks).some((l) => l.areaId === from.id)
            const touchesPlan = day.plan?.some((p) => p.block.areaId === from.id)
            if (!touchesLog && !touchesPlan) continue
            logs[date] = {
              ...day,
              blocks: Object.fromEntries(Object.entries(day.blocks).map(([id, l]) => [id, l.areaId === from.id ? { ...l, areaId: key } : l])),
              ...(day.plan ? { plan: day.plan.map((p) => (p.block.areaId === from.id ? { ...p, block: { ...p.block, areaId: key } } : p)) } : {}),
            }
          }
          const templates = get().templates.map((t) =>
            t.blocks.some((b) => b.areaId === from.id) ? { ...t, blocks: t.blocks.map((b) => ({ ...b, areaId: swap(b.areaId) })) } : t,
          )
          set({ routines, templates, logs, areas: areas.map((a) => (a.id === from.id ? { ...a, id: key, isDefault: true } : a)) })
        },

        createRoutine: (name = 'Nova rotina') => {
          const id = uid()
          const color = ROUTINE_COLORS[get().routines.length % ROUTINE_COLORS.length]
          // Rotina nova começa só no dia de hoje (no fuso da pessoa); os outros dias ela marca se quiser.
          set({ routines: [...get().routines, { id, name, color, days: [nowInTz().getDay()], blocks: [] }] })
          return id
        },
        updateRoutine: (id, patch) => {
          const before = get().routines.find((r) => r.id === id)
          set({ routines: mapRoutine(get().routines, id, (r) => ({ ...r, ...patch })) })
          // Passou a valer em outro dia (dia da semana novo, ou outra data na de um dia só): as tarefas
          // da rotina concluídas em dias anteriores voltam a aparecer.
          if (!before) return
          const addedDay = patch.days?.some((d) => !before.days.includes(d))
          const newDate = patch.onceDate != null && patch.onceDate !== before.onceDate
          if (addedDay || newDate) reopenTasks(before.blocks)
        },
        deleteRoutine: (id) => set({ routines: get().routines.filter((r) => r.id !== id) }),
        archiveRoutine: (id, archived) =>
          set({ routines: mapRoutine(get().routines, id, (r) => ({ ...r, archivedAt: archived ? new Date().toISOString() : null })) }),
        reuseRoutine: (id, date) => {
          const before = get().routines.find((r) => r.id === id)
          set({
            routines: mapRoutine(get().routines, id, (r) => ({ ...r, repeat: 'once', onceDate: date, days: [weekdayOf(date)], archivedAt: r.archivedAt ? null : r.archivedAt })),
          })
          if (before) reopenTasks(before.blocks)
        },
        addTemplate: (keyOrId) => {
          const t = TEMPLATES.find((x) => x.key === keyOrId) ?? get().templates.find((x) => x.id === keyOrId)
          if (!t) return
          const id = uid()
          const routine: Routine = {
            id,
            name: t.name,
            color: t.color,
            days: [...t.days],
            // Se a pessoa excluiu a área do modelo, o bloco vai para a primeira área dela.
            blocks: t.blocks.map((b) => ({ ...b, areaId: get().areas.some((a) => a.id === b.areaId) ? b.areaId : (get().areas[0]?.id ?? b.areaId), id: uid() })),
          }
          set({ routines: [...get().routines, routine] })
          return id
        },

        createTemplate: (name = 'Novo modelo') => {
          const id = uid()
          const color = ROUTINE_COLORS[get().templates.length % ROUTINE_COLORS.length]
          set({ templates: [...get().templates, { id, name, color, days: [0, 1, 2, 3, 4, 5, 6], blocks: [] }] })
          return id
        },
        saveAsTemplate: (routineId) => {
          const r = get().routines.find((x) => x.id === routineId)
          if (!r) return
          const id = uid()
          // Modelo nunca guarda data: a de um dia só vira semanal no dia da semana daquela data.
          const days = r.repeat === 'once' && r.onceDate ? [weekdayOf(r.onceDate)] : [...r.days]
          const t: UserTemplate = { id, name: r.name.trim() || 'Novo modelo', color: r.color, days, blocks: r.blocks.map((b) => ({ ...b, id: uid() })) }
          set({ templates: [...get().templates, t] })
          return id
        },
        updateTemplate: (id, patch) => set({ templates: get().templates.map((t) => (t.id === id ? { ...t, ...patch } : t)) }),
        deleteTemplate: (id) => set({ templates: get().templates.filter((t) => t.id !== id) }),

        addBlock: (routineId, block) =>
          set({ routines: mapRoutine(get().routines, routineId, (r) => ({ ...r, blocks: [...r.blocks, { ...block, id: uid() }] })) }),
        updateBlock: (routineId, blockId, patch) =>
          set({
            routines: mapRoutine(get().routines, routineId, (r) => ({
              ...r,
              blocks: r.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)),
            })),
          }),
        removeBlock: (routineId, blockId) =>
          set({ routines: mapRoutine(get().routines, routineId, (r) => ({ ...r, blocks: r.blocks.filter((b) => b.id !== blockId) })) }),
        setBlocks: (routineId, blocks) => set({ routines: mapRoutine(get().routines, routineId, (r) => ({ ...r, blocks })) }),

        toggleDone: (date, block) => {
          let nowDone = false
          if (block.type === 'contador') {
            const target = block.target ?? 1
            patchLog(date, block, (l) => {
              nowDone = (l.value ?? 0) < target
              return { ...l, value: nowDone ? target : 0, done: nowDone, skipped: false }
            })
          } else {
            patchLog(date, block, (l) => {
              nowDone = !l.done
              return { ...l, done: nowDone, skipped: false }
            })
          }
          // Tarefa de rotina concluída some dos dias seguintes; a avulsa já é só do dia.
          if (block.type === 'tarefa' && !get().dayTasks.some((t) => t.id === block.id)) {
            const tasks = { ...get().completedTasks }
            if (nowDone) tasks[block.id] = date
            else delete tasks[block.id]
            set({ completedTasks: tasks })
          }
          if (nowDone && get().activeBlockId === block.id) set({ activeBlockId: null })
          return nowDone
        },
        increment: (date, block, delta) => {
          const target = block.target ?? 1
          const next = patchLog(date, block, (l) => {
            const value = Math.max(0, Math.round(((l.value ?? 0) + delta) * 100) / 100)
            return { ...l, skipped: false, value, done: value >= target }
          })
          const reached = (next.value ?? 0) >= target
          if (reached && get().activeBlockId === block.id) set({ activeBlockId: null })
          return reached
        },
        toggleSkip: (date, block) => {
          let skipped = false
          patchLog(date, block, (l) => {
            skipped = !l.skipped
            return { ...l, skipped }
          })
          if (skipped && get().activeBlockId === block.id) set({ activeBlockId: null })
          return skipped
        },
        setActive: (blockId) => set({ activeBlockId: blockId }),
        wakePet: (date) => set({ wokenOn: date }),
        addDayTask: (date, name, areaId) => {
          const id = uid()
          const list = get().dayTasks
          const position = list.filter((t) => t.date === date).reduce((m, t) => Math.max(m, t.position + 1), 0)
          set({ dayTasks: [...list, { id, date, name: name.trim().slice(0, 200) || 'Tarefa', areaId, position }] })
          return id
        },
        updateDayTask: (id, patch) => {
          const clean = { ...patch }
          if (clean.name !== undefined) clean.name = clean.name.trim().slice(0, 200) || 'Tarefa'
          set({ dayTasks: get().dayTasks.map((t) => (t.id === id ? { ...t, ...clean } : t)) })
          // O registro do dia guarda a área: acompanha a mudança.
          const t = get().dayTasks.find((x) => x.id === id)
          if (t && clean.areaId !== undefined && get().logs[t.date]?.blocks[id]) patchLog(t.date, dayTaskBlock(t), (l) => l)
        },
        deleteDayTask: (id) => {
          const t = get().dayTasks.find((x) => x.id === id)
          if (!t) return
          set({ dayTasks: get().dayTasks.filter((x) => x.id !== id) })
          const day = get().logs[t.date]
          if (day && (day.blocks[id] || day.order?.includes(id))) {
            const { [id]: _drop, ...blocks } = day.blocks
            set({ logs: { ...get().logs, [t.date]: { ...day, blocks, ...(day.order ? { order: day.order.filter((x) => x !== id) } : {}) } } })
          }
          if (get().activeBlockId === id) set({ activeBlockId: null })
        },
        resolveDayTask: (id, resolution, today) => {
          const t = get().dayTasks.find((x) => x.id === id)
          if (!t || t.resolution || t.date >= today) return
          let list = get().dayTasks.map((x) => (x.id === id ? { ...x, resolution } : x))
          if (resolution === 'levada') {
            const position = list.filter((x) => x.date === today).reduce((m, x) => Math.max(m, x.position + 1), 0)
            list = [...list, { id: uid(), date: today, name: t.name, areaId: t.areaId, position, carriedFrom: t.id }]
          }
          set({ dayTasks: list })
        },
        setDayOrder: (date, order) => {
          const day = get().logs[date] ?? { blocks: {} }
          if (JSON.stringify(day.order) === JSON.stringify(order)) return
          set({ logs: { ...get().logs, [date]: { ...day, order } } })
        },
        markStoryRead: (storyId) => {
          if (get().storyReads[storyId]) return
          set({ storyReads: { ...get().storyReads, [storyId]: new Date().toISOString() } })
        },
        setNote: (date, note) => {
          const day = get().logs[date] ?? { blocks: {} }
          set({ logs: { ...get().logs, [date]: { ...day, note } } })
        },
        setPlan: (date, plan) => {
          const day = get().logs[date] ?? { blocks: {} }
          if (JSON.stringify(day.plan) === JSON.stringify(plan)) return
          set({ logs: { ...get().logs, [date]: { ...day, plan } } })
        },

        setCompanionKind: (kind) => set({ companion: { ...get().companion, kind } }),
        setCompanionName: (name) => set({ companion: { ...get().companion, name } }),
        setAppearance: (appearance) => set({ companion: { ...get().companion, appearance } }),
        setShowAdultDetail: (showAdultDetail) => set({ companion: { ...get().companion, showAdultDetail } }),
        equip: (slot, id) => {
          const equipped = { ...get().companion.equipped }
          if (id) equipped[slot] = id
          else delete equipped[slot]
          set({ companion: { ...get().companion, equipped } })
        },
        updateProgress: (patch) => set({ petProgress: { ...get().petProgress, ...patch } }),
        addTrophies: (list) => {
          const trophies = { ...get().trophies }
          for (const { id, unlock } of list) {
            const have = trophies[id] ?? []
            if (!have.some((u) => u.tier === unlock.tier)) trophies[id] = [...have, unlock].sort((a, b) => a.tier - b.tier)
          }
          set({ trophies })
        },
        setScene: (scene) => set({ scene }),
        addSceneItems: (ids, at) => {
          const sceneItems = { ...get().sceneItems }
          for (const id of ids) sceneItems[id] ??= { unlockedAt: at }
          set({ sceneItems })
        },
        addEventItems: (list, at) => {
          const eventItems = { ...get().eventItems }
          for (const { eventId, itemId } of list) {
            if (eventItems[eventId]?.[itemId]) continue
            eventItems[eventId] = { ...eventItems[eventId], [itemId]: at }
          }
          set({ eventItems })
        },
        setCornerLayout: (scene, layout) => set({ cornerLayouts: { ...get().cornerLayouts, [scene]: layout } }),
      }
    },
    {
      name: LEGACY_KEY,
      version: 10,
      storage: createJSONStorage(() => scopedStorage),
      // Só carrega o cache depois do login, quando já se sabe de quem são os dados.
      skipHydration: true,
      migrate: (persisted, version) => migrate(persisted as Partial<RotinaState>, version),
    },
  ),
)

/**
 * v1 → v2: mantém tudo e completa `areaId`/`type` dos registros antigos,
 * buscando o bloco na lista congelada do dia ou, sem ela, nas rotinas atuais.
 */
export function migrate(state: Partial<RotinaState>, version: number) {
  if (version < 2) {
    const fromRoutines = new Map<string, Block>()
    for (const r of state.routines ?? []) for (const b of r.blocks) fromRoutines.set(b.id, b)

    const logs: Record<string, DayLog> = {}
    for (const [date, day] of Object.entries(state.logs ?? {})) {
      const fromPlan = new Map((day.plan ?? []).map((p) => [p.block.id, p.block]))
      const blocks: Record<string, BlockLog> = {}
      for (const [id, log] of Object.entries(day.blocks ?? {})) {
        const b = fromPlan.get(id) ?? fromRoutines.get(id)
        blocks[id] = b ? { ...log, areaId: log.areaId ?? b.areaId, type: log.type ?? b.type } : log
      }
      logs[date] = { ...day, blocks }
    }
    state = { ...state, logs, companion: state.companion ?? DEFAULT_COMPANION, petProgress: state.petProgress ?? DEFAULT_PROGRESS }
  }
  // v2 → v3: troféus e espaços do cantinho.
  if (version < 3) state = { ...state, trophies: state.trophies ?? {} }
  // v3 → v4: áreas da vida viram dados da pessoa (começa com as 8 padrão).
  if (version < 4) state = { ...state, areas: state.areas?.length ? state.areas : DEFAULT_AREAS }
  // v4 → v5: modelos de rotina da pessoa.
  if (version < 5) state = { ...state, templates: state.templates ?? [] }
  // v5 → v6: nova identidade (pastel) nas cores salvas de áreas, rotinas e modelos.
  if (version < 6) state = withPastelColors(state)
  // v6 → v7: cenários. Os troféus dos 4 espaços (cornerSlots) vão para a montagem do Cosmos,
  // que é o cenário padrão (o antigo céu de constelações foi removido).
  if (version < 7) {
    const old = (state as { cornerSlots?: ({ trophyId: string; tier: number } | null)[] }).cornerSlots ?? []
    const cosmos = EMPTY_LAYOUT.map((_, i) => {
      const s = old[i]
      return s ? { kind: 'trophy', id: s.trophyId, tier: s.tier } : null
    }) as CornerLayout
    const { cornerSlots: _drop, ...rest } = state as Partial<RotinaState> & { cornerSlots?: unknown }
    state = { ...rest, scene: DEFAULT_SCENE, sceneItems: state.sceneItems ?? {}, cornerLayouts: { ...EMPTY_LAYOUTS, cosmos } }
  }
  // v7 → v8: aparência escolhida do pet (padrão: acompanha a fase conquistada) e detalhe de adulto.
  if (version < 8) state = { ...state, companion: { ...DEFAULT_COMPANION, ...state.companion } }
  // v8 → v9: itens de eventos sazonais.
  if (version < 9) state = { ...state, eventItems: state.eventItems ?? {} }
  // v9 → v10: tarefas avulsas, histórias lidas, crescimento por espécie e o coelho de cristal.
  // O pet secreto era o "coelho": quem o desbloqueou fica com o coelho de cristal (e como favorito, se era).
  if (version < 10) {
    const p = { ...DEFAULT_PROGRESS, ...state.petProgress }
    const companion = { ...DEFAULT_COMPANION, ...state.companion }
    if (p.unlocked.includes(LEGACY_SECRET_UNLOCK as UnlockId) && companion.kind === 'coelho') companion.kind = 'coelho-cristal'
    state = {
      ...state,
      companion,
      petProgress: { ...p, unlocked: migrateSecretUnlock(p.unlocked), phases: Object.keys(p.phases ?? {}).length ? p.phases : seedPhases(p.peakActiveDays) },
      dayTasks: state.dayTasks ?? [],
      storyReads: state.storyReads ?? {},
    }
  }
  return state as RotinaState
}

/** Troca as cores vivas antigas pelas pastel (áreas, rotinas, modelos e as rotinas congeladas no histórico). */
export function withPastelColors<T extends Partial<Pick<RotinaState, 'areas' | 'routines' | 'templates' | 'logs'>>>(s: T): T {
  const logs = s.logs
    ? Object.fromEntries(
        Object.entries(s.logs).map(([d, day]) => [
          d,
          day.plan ? { ...day, plan: day.plan.map((p) => ({ ...p, routine: { ...p.routine, color: pastelRoutine(p.routine.color) } })) } : day,
        ]),
      )
    : s.logs
  return {
    ...s,
    areas: s.areas?.map((a) => ({ ...a, color: pastelArea(a.color) })),
    routines: s.routines?.map((r) => ({ ...r, color: pastelRoutine(r.color) })),
    templates: s.templates?.map((t) => ({ ...t, color: pastelRoutine(t.color) })),
    logs,
  }
}

/** Áreas da vida da pessoa, em ordem. */
export const useAreas = () => useRotina((s) => s.areas)
