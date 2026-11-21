import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Block, BlockLog, DayLog, PlanEntry, Routine } from '../types'
import { TEMPLATES } from '../data/templates'
import { ROUTINE_COLORS } from '../data/areas'

const uid = () => crypto.randomUUID()

interface RotinaState {
  routines: Routine[]
  logs: Record<string, DayLog>
  /** Tarefas concluídas: id do bloco → dia em que foi feita. */
  completedTasks: Record<string, string>
  activeBlockId: string | null

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
  toggleSkip: (date: string, blockId: string) => boolean
  setActive: (blockId: string | null) => void
  setNote: (date: string, note: string) => void
  /** Guarda a lista planejada do dia, para o histórico não depender das rotinas atuais. */
  setPlan: (date: string, plan: PlanEntry[]) => void
}

const mapRoutine = (routines: Routine[], id: string, fn: (r: Routine) => Routine) =>
  routines.map((r) => (r.id === id ? fn(r) : r))

export const useRotina = create<RotinaState>()(
  persist(
    (set, get) => {
      const patchLog = (date: string, blockId: string, fn: (l: BlockLog) => BlockLog) => {
        const day = get().logs[date] ?? { blocks: {} }
        const next = fn(day.blocks[blockId] ?? {})
        set({ logs: { ...get().logs, [date]: { ...day, blocks: { ...day.blocks, [blockId]: next } } } })
        return next
      }

      return {
        routines: [],
        logs: {},
        completedTasks: {},
        activeBlockId: null,

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
            patchLog(date, block.id, (l) => {
              nowDone = (l.value ?? 0) < target
              return { ...l, value: nowDone ? target : 0, skipped: false }
            })
          } else {
            patchLog(date, block.id, (l) => {
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
          const next = patchLog(date, block.id, (l) => ({
            ...l,
            skipped: false,
            value: Math.max(0, Math.round(((l.value ?? 0) + delta) * 100) / 100),
          }))
          const reached = (next.value ?? 0) >= target
          if (reached && get().activeBlockId === block.id) set({ activeBlockId: null })
          return reached
        },
        toggleSkip: (date, blockId) => {
          let skipped = false
          patchLog(date, blockId, (l) => {
            skipped = !l.skipped
            return { ...l, skipped }
          })
          if (skipped && get().activeBlockId === blockId) set({ activeBlockId: null })
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
      }
    },
    { name: 'rotina-app', version: 1 },
  ),
)
