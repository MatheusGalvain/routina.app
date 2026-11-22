import type { Area, AreaId, Block, BlockLog, BlockType, DayLog, PlanEntry, Routine } from '../types'
import { DEFAULT_AREAS } from '../data/areas'
import { addDays, parseKey } from '../lib/dates'
import { isActiveDay, type Logs } from '../lib/stats'

/**
 * Geração de histórico falso para o painel de desenvolvimento.
 * Tudo que sai daqui leva `dev: true`. Quando um dia real é substituído,
 * ele fica guardado em `real` e volta ao limpar os dados simulados.
 */


const uid = () => crypto.randomUUID()

/** Rotina de teste com blocos de todas as áreas e dos 3 tipos. */
export function testRoutine(areas: Area[] = DEFAULT_AREAS): Routine {
  const types: BlockType[] = ['habito', 'contador', 'tarefa']
  const blocks: Block[] = areas.flatMap((a, i) =>
    [0, 1].map((j) => {
      const type = types[(i + j) % 3]
      return {
        id: uid(),
        name: `${a.name} (teste ${j + 1})`,
        type,
        areaId: a.id,
        ...(type === 'contador' ? { target: 4, unit: 'vezes', step: 1 } : {}),
      }
    }),
  )
  return { id: uid(), name: 'Rotina de teste (dev)', color: '#A6E3DA', days: [0, 1, 2, 3, 4, 5, 6], blocks, dev: true }
}

const ref = (r: Routine) => ({ id: r.id, name: r.name, color: r.color })

/** Lista do dia: rotinas daquele dia da semana (ou todas, se nenhuma cair nele). Garante uma área, se pedida. */
function planFor(routines: Routine[], date: string, mustArea?: AreaId): PlanEntry[] {
  const weekday = parseKey(date).getDay()
  let rs = routines.filter((r) => r.days.includes(weekday) && r.blocks.length)
  if (!rs.length) rs = routines.filter((r) => r.blocks.length)
  const plan = rs.flatMap((r) => r.blocks.map((block) => ({ block, routine: ref(r) })))
  if (mustArea && !plan.some((p) => p.block.areaId === mustArea)) {
    for (const r of routines) for (const block of r.blocks) if (block.areaId === mustArea) plan.push({ block, routine: ref(r) })
  }
  return plan
}

const doneLog = (b: Block): BlockLog => ({
  done: true,
  ...(b.type === 'contador' ? { value: b.target ?? 1 } : {}),
  areaId: b.areaId,
  type: b.type,
  dev: true,
})

/** O dia real por baixo (se o dia já era simulado, mantém o real original). */
const realOf = (prev: DayLog | undefined) => (prev?.dev ? prev.real : prev)

function makeDay(plan: PlanEntry[], done: (p: PlanEntry, i: number) => boolean, prev: DayLog | undefined): DayLog {
  const blocks: Record<string, BlockLog> = {}
  plan.forEach((p, i) => {
    if (done(p, i)) blocks[p.block.id] = doneLog(p.block)
  })
  const real = realOf(prev)
  return { plan, blocks, dev: true, ...(real ? { real } : {}) }
}

function shuffle<T>(arr: T[]) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Dia ativo com 50% a 100% dos blocos concluídos, sorteados entre as áreas. */
function activeDay(routines: Routine[], date: string, prev: DayLog | undefined): DayLog {
  const plan = planFor(routines, date)
  const k = Math.max(Math.ceil(plan.length / 2), Math.round(plan.length * (0.5 + Math.random() * 0.5)))
  const chosen = new Set(shuffle(plan.map((_, i) => i)).slice(0, k))
  return makeDay(plan, (_, i) => chosen.has(i), prev)
}

/** N dias ativos antes de hoje, nos dias que ainda não são ativos (do mais recente para trás). */
export function simulateActiveDays(logs: Logs, routines: Routine[], n: number, today: string): Logs {
  const out = { ...logs }
  let d = addDays(today, -1)
  for (let made = 0, guard = 0; made < n && guard < 5000; guard++, d = addDays(d, -1)) {
    if (isActiveDay(out[d])) continue
    out[d] = activeDay(routines, d, out[d])
    made++
  }
  return out
}

/** Os N dias até ontem, todos ativos. */
export function simulateStreak(logs: Logs, routines: Routine[], n: number, today: string): Logs {
  const out = { ...logs }
  for (let i = 1; i <= n; i++) {
    const d = addDays(today, -i)
    if (!isActiveDay(out[d])) out[d] = activeDay(routines, d, out[d])
  }
  return out
}

/** Os N dias até ontem ficam sem registro (o real fica guardado). */
export function simulateIdle(logs: Logs, n: number, today: string): Logs {
  const out = { ...logs }
  for (let i = 1; i <= n; i++) {
    const d = addDays(today, -i)
    const real = realOf(out[d])
    out[d] = { blocks: {}, dev: true, ...(real ? { real } : {}) }
  }
  return out
}

/**
 * Nos 6 dias antes de hoje, a área tem bloco concluído em exatamente `k` deles
 * (hoje continua com os dados reais e também entra na conta dos últimos 7).
 */
export function simulateArea(logs: Logs, routines: Routine[], area: AreaId, k: number, today: string): Logs {
  const out = { ...logs }
  const days = Array.from({ length: 6 }, (_, i) => addDays(today, -(i + 1)))
  const withArea = new Set(shuffle(days).slice(0, Math.min(6, Math.max(0, k))))
  for (const d of days) {
    const plan = planFor(routines, d, area)
    const others = plan.filter((p) => p.block.areaId !== area)
    const chosen = new Set(shuffle(others).slice(0, Math.ceil(others.length * (0.5 + Math.random() * 0.5))))
    out[d] = makeDay(plan, (p) => (p.block.areaId === area ? withArea.has(d) : chosen.has(p)), out[d])
  }
  return out
}

export { clearDev, hasDev } from '../lib/devData'
