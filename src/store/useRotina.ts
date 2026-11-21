import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AccessoryId, Block, BlockLog, Companion, DayLog, PetKind, PetProgress, PlanEntry, Routine, Slot } from '../types'
import { TEMPLATES } from '../data/templates'
import { ROUTINE_COLORS } from '../data/areas'

const uid = () => crypto.randomUUID()

export const DEFAULT_COMPANION: Companion = { kind: null, name: '', equipped: {} }
export const DEFAULT_PROGRESS: PetProgress = { initialized: false, peakActiveDays: 0, seenPhase: 'filhote', unlocked: [] }

interface RotinaState {
  routines: Routine[]
  logs: Record<string, DayLog>
  /** Tarefas concluídas: id do bloco → dia em que foi feita. */
  completedTasks: Record<string, string>
  activeBlockId: string | null
  companion: Companion
  petProgress: PetProgress

  createRoutine: (name?: string) => string
  updateRoutine: (id: string, patch: Partial<Omit<Routine, 'id' | 'blocks'>>) => void
  deleteRoutine: (id: string) => void
  addTemplate: (key: string) => string | undefined

  addBlock: (routineId: string, block: Omit<Block, 'id'>) => void
  updateBlock: (routineId: string, blockId: string, patch: Partial<Block>) => void
  removeBlock: (routineId: string, blockId: string) => void
  setBlocks: (routineId: string, blocks: Block[]) => void

  toggleDone: (date: string, block: Block) => boolean
  increment: (date: string, block: Block, delta: number) => boolean
  toggleSkip: (date: string, block: Block) => boolean
  setActive: (blockId: string | null) => void
  setNote: (date: string, note: string) => void
  /** Guarda a lista planejada do dia, para o histórico não depender das rotinas atuais. */
  setPlan: (date: string, plan: PlanEntry[]) => void

  setCompanionKind: (kind: PetKind | null) => void
  setCompanionName: (name: string) => void
  /** Equipa um acessório no slot (ou tira, com `null`). */
  equip: (slot: Slot, id: AccessoryId | null) => void
  updateProgress: (patch: Partial<PetProgress>) => void
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

      return {
        routines: [],
        logs: {},
        completedTasks: {},
        activeBlockId: null,
        companion: DEFAULT_COMPANION,
        petProgress: DEFAULT_PROGRESS,

        createRoutine: (name = 'Nova rotina') => {
          const id = uid()
          const color = ROUTINE_COLORS[get().routines.length % ROUTINE_COLORS.length]
          set({ routines: [...get().routines, { id, name, color, days: [0, 1, 2, 3, 4, 5, 6], blocks: [] }] })
          return id
        },
        updateRoutine: (id, patch) => set({ routines: mapRoutine(get().routines, id, (r) => ({ ...r, ...patch })) }),
        deleteRoutine: (id) => set({ routines: get().routines.filter((r) => r.id !== id) }),
        addTemplate: (key) => {
          const t = TEMPLATES.find((x) => x.key === key)
          if (!t) return
          const id = uid()
          const routine: Routine = {
            id,
            name: t.name,
            color: t.color,
            days: [...t.days],
            blocks: t.blocks.map((b) => ({ ...b, id: uid() })),
          }
          set({ routines: [...get().routines, routine] })
          return id
        },

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
          if (block.type === 'tarefa') {
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
        equip: (slot, id) => {
          const equipped = { ...get().companion.equipped }
          if (id) equipped[slot] = id
          else delete equipped[slot]
          set({ companion: { ...get().companion, equipped } })
        },
        updateProgress: (patch) => set({ petProgress: { ...get().petProgress, ...patch } }),
      }
    },
    {
      name: 'rotina-app',
      version: 2,
      migrate: (persisted, version) => migrate(persisted as Partial<RotinaState>, version),
    },
  ),
)

/**
 * v1 → v2: mantém tudo e completa `areaId`/`type` dos registros antigos,
 * buscando o bloco na lista congelada do dia ou, sem ela, nas rotinas atuais.
 */
function migrate(state: Partial<RotinaState>, version: number) {
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
  return state as RotinaState
}
