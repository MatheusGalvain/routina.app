// Testes das rotinas de um dia só e do arquivamento (src/lib/routines.ts). Rodam com `npm test`.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { beyondWeek, isArchived, isExpired, next7, nextOnce, onceLabel, runsOn, shortDay, splitArchived } from './routines.ts'
import { getTodayItems } from './today.ts'
import type { Routine } from '../types.ts'

const TODAY = '2026-11-24' // terça
const block = { id: 'b1', name: 'Beber água', type: 'habito' as const, areaId: 'corpo' }
const weekly = (patch: Partial<Routine> = {}): Routine => ({ id: 'w', name: 'Manhã', color: '#A6E3DA', days: [2], blocks: [block], ...patch })
const once = (date: string, patch: Partial<Routine> = {}): Routine => ({
  id: 'o',
  name: 'Mudança',
  color: '#CDB8FF',
  days: [new Date(`${date}T12:00`).getDay()],
  blocks: [{ ...block, id: 'b2' }],
  repeat: 'once',
  onceDate: date,
  ...patch,
})

test('semanal aparece nos dias da semana marcados', () => {
  assert.equal(runsOn(weekly(), TODAY), true)
  assert.equal(runsOn(weekly(), '2026-11-25'), false)
  assert.equal(runsOn(weekly(), '2026-12-01'), true) // próxima terça
})

test('de um dia só aparece apenas naquela data', () => {
  assert.equal(runsOn(once('2026-11-26'), '2026-11-26'), true)
  assert.equal(runsOn(once('2026-11-26'), TODAY), false)
  // Mesmo dia da semana, outra semana: não.
  assert.equal(runsOn(once('2026-11-26'), '2026-12-03'), false)
})

test('depois que a data passa, vai sozinha para as arquivadas', () => {
  assert.equal(isArchived(once(TODAY), TODAY), false)
  assert.equal(isArchived(once('2026-11-23'), TODAY), true)
  assert.equal(isExpired(once('2026-11-23'), TODAY), true)
  assert.equal(isArchived(weekly(), TODAY), false)
})

test('arquivar à mão tira do Hoje; desarquivar (null) devolve', () => {
  const paused = weekly({ archivedAt: '2026-11-20T10:00:00.000Z' })
  assert.equal(isArchived(paused, TODAY), true)
  assert.equal(isExpired(paused, TODAY), false)
  assert.equal(runsOn(paused, TODAY), false)
  assert.equal(runsOn(weekly({ archivedAt: null }), TODAY), true)
})

test('lista do Hoje: só a de um dia só da data e as semanais do dia', () => {
  const list = [weekly(), once(TODAY), once('2026-11-26', { id: 'o2' }), weekly({ id: 'p', archivedAt: '2026-11-20T10:00:00.000Z' })]
  const items = getTodayItems(list, undefined, {}, new Date(), TODAY)
  assert.deepEqual(
    items.map((i) => i.routine.id),
    ['w', 'o'],
  )
})

test('separa ativas e arquivadas mantendo a ordem', () => {
  const { active, archived } = splitArchived([weekly(), once('2026-11-20'), once('2026-11-30', { id: 'o3' })], TODAY)
  assert.deepEqual(active.map((r) => r.id), ['w', 'o3'])
  assert.deepEqual(archived.map((r) => r.id), ['o'])
})

test('próximos 7 dias e rótulos', () => {
  const week = next7(TODAY)
  assert.equal(week.length, 7)
  assert.equal(week[0], TODAY)
  assert.equal(week[6], '2026-11-30')
  assert.equal(shortDay(TODAY), 'Ter 24')
  assert.equal(shortDay('2026-11-25'), 'Qua 25')
  assert.equal(onceLabel('2026-11-26'), 'Só em qui, 26 nov')
  assert.equal(beyondWeek('2026-11-30', TODAY), false)
  assert.equal(beyondWeek('2026-12-01', TODAY), true)
})

test('próxima rotina de um dia só (depois de hoje)', () => {
  const list = [once('2026-12-10', { id: 'a', name: 'Viagem' }), once('2026-11-26', { id: 'b', name: 'Mudança' }), once(TODAY, { id: 'c' }), weekly()]
  assert.equal(nextOnce(list, TODAY)?.name, 'Mudança')
  assert.equal(nextOnce([weekly()], TODAY), null)
})
