import type { RotinaState } from '../store/useRotina'
import type { Row, Table } from './rows'
import { areaRows, blockLogRow, eventItemRows, templateRows, companionRow, dayRow, sceneItemRows, slotRow, structureRows, taskRow, trophyRows } from './rows'
import { SCENES } from '../data/scenes'

export type Emit = (table: Table, kind: 'upsert' | 'delete', row: Row) => void

const hasDevDays = (s: RotinaState) => Object.values(s.logs).some((d) => d.dev)
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/**
 * Compara o store antes e depois de uma mudança e emite as gravações necessárias.
 * Compara por referência primeiro (o Zustand só troca o que mudou), então é barato.
 * Dados do painel dev (`dev: true`) nunca geram gravação.
 */
export function diff(uid: string, prev: RotinaState, next: RotinaState, enqueue: Emit) {
  if (prev.routines !== next.routines) {
    const a = structureRows(uid, prev.routines)
    const b = structureRows(uid, next.routines)
    for (const t of ['routines', 'blocks'] as const) {
      for (const [id, row] of b[t]) if (!same(a[t].get(id), row)) enqueue(t, 'upsert', row)
      for (const [id, row] of a[t]) if (!b[t].has(id)) enqueue(t, 'delete', { id: row.id })
    }
  }

  if (prev.logs !== next.logs) {
    for (const date of new Set([...Object.keys(prev.logs), ...Object.keys(next.logs)])) {
      const p = prev.logs[date]
      const n = next.logs[date]
      if (p === n) continue
      // Dia simulado (antes ou depois): fica só neste aparelho.
      if (p?.dev || n?.dev) continue
      if (!n) {
        enqueue('day_logs', 'delete', { date })
        continue
      }
      let dayChanged = !p || p.note !== n.note || !same(p.plan, n.plan)
      for (const id of new Set([...Object.keys(p?.blocks ?? {}), ...Object.keys(n.blocks)])) {
        const pb = p?.blocks[id]
        const nb = n.blocks[id]
        if (pb === nb || pb?.dev || nb?.dev) continue
        if (nb) {
          enqueue('block_logs', 'upsert', blockLogRow(uid, date, id, nb))
          dayChanged = true // o registro do bloco precisa do dia existir no servidor
        } else enqueue('block_logs', 'delete', { date, block_id: id })
      }
      if (dayChanged) enqueue('day_logs', 'upsert', dayRow(uid, date, n))
    }
  }

  if (prev.completedTasks !== next.completedTasks) {
    for (const [id, date] of Object.entries(next.completedTasks)) if (prev.completedTasks[id] !== date) enqueue('completed_tasks', 'upsert', taskRow(uid, id, date))
    for (const id of Object.keys(prev.completedTasks)) if (!(id in next.completedTasks)) enqueue('completed_tasks', 'delete', { block_id: id })
  }

  if (prev.companion !== next.companion || prev.petProgress !== next.petProgress) {
    // Com simulação ativa, o progresso calculado é falso: sobe só espécie, nome e acessórios.
    const c = next.companion
    const p = prev.companion
    const withLook = c.appearance !== 'auto' || !c.showAdultDetail || p.appearance !== c.appearance || p.showAdultDetail !== c.showAdultDetail
    enqueue('companion', 'upsert', companionRow(uid, c, next.petProgress, !hasDevDays(next), withLook))
  }

  // Troféus: só acrescenta (um nível conquistado nunca é perdido).
  if (prev.trophies !== next.trophies) {
    const a = trophyRows(uid, prev.trophies)
    for (const [key, row] of trophyRows(uid, next.trophies)) if (!same(a.get(key), row)) enqueue('user_trophies', 'upsert', row)
  }

  if (prev.areas !== next.areas) {
    const a = areaRows(uid, prev.areas)
    const b = areaRows(uid, next.areas)
    for (const [id, row] of b) if (!same(a.get(id), row)) enqueue('user_areas', 'upsert', row)
    for (const id of a.keys()) if (!b.has(id)) enqueue('user_areas', 'delete', { id })
  }

  if (prev.templates !== next.templates) {
    const a = templateRows(uid, prev.templates)
    const b = templateRows(uid, next.templates)
    for (const [id, row] of b) if (!same(a.get(id), row)) enqueue('user_templates', 'upsert', row)
    for (const id of a.keys()) if (!b.has(id)) enqueue('user_templates', 'delete', { id })
  }

  // Montagem do cantinho: um registro por espaço preenchido, por cenário.
  if (prev.cornerLayouts !== next.cornerLayouts) {
    for (const { id: scene } of SCENES) {
      const a = prev.cornerLayouts[scene]
      const b = next.cornerLayouts[scene]
      if (a === b) continue
      b.forEach((s, i) => {
        if (same(a?.[i] ?? null, s)) return
        if (s) enqueue('corner_slots', 'upsert', slotRow(uid, scene, i, s))
        else enqueue('corner_slots', 'delete', { scene_id: scene, slot: i })
      })
    }
  }

  // Itens de cenário: só acrescenta (um item desbloqueado nunca é perdido).
  if (prev.sceneItems !== next.sceneItems) {
    const a = sceneItemRows(uid, prev.sceneItems)
    for (const [key, row] of sceneItemRows(uid, next.sceneItems)) if (!same(a.get(key), row)) enqueue('user_scene_items', 'upsert', row)
  }

  // Itens de evento: só acrescenta (o que se conquista num evento fica para sempre).
  if (prev.eventItems !== next.eventItems) {
    const a = eventItemRows(uid, prev.eventItems)
    for (const [key, row] of eventItemRows(uid, next.eventItems)) if (!same(a.get(key), row)) enqueue('user_event_items', 'upsert', row)
  }

  if (prev.scene !== next.scene) enqueue('profiles', 'upsert', { user_id: uid, scene: next.scene })
}
