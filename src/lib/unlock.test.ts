// Testes da regra do coelho de cristal (src/lib/unlock.ts). Rodam com `npm test`.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SECRET_DAYS, SECRET_MIN_AREAS, deservesSecret, secretProgress, secretUnlockPath } from './unlock.ts'
import { allAreasInAWeek, bestAreasWindow, type Logs } from './stats.ts'
import { addDays } from './dates.ts'
import type { DayLog } from '../types.ts'

const TODAY = '2026-11-24'
const AREAS5 = ['sono', 'corpo', 'foco', 'casa', 'mente']
const AREAS4 = AREAS5.slice(0, 4)

/** Um dia ativo com um bloco concluído em cada área pedida. */
const doneDay = (areas: string[], dev = false): DayLog => ({
  blocks: Object.fromEntries(areas.map((a, i) => [`b-${a}-${i}`, { done: true, areaId: a, type: 'habito' as const, ...(dev ? { dev: true as const } : {}) }])),
  ...(dev ? { dev: true as const } : {}),
})

/** `n` dias ativos (não seguidos: um sim, um não), terminando antes de hoje. */
function activeDaysLogs(n: number, dev = false): Logs {
  const logs: Logs = {}
  for (let i = 0; i < n; i++) logs[addDays(TODAY, -(i * 2 + 1))] = doneDay(['sono'], dev)
  return logs
}

/** `n` dias seguidos, cada um com todas as `areas` concluídas, terminando ontem. */
function allAreasRun(n: number, areas: string[], dev = false): Logs {
  const logs: Logs = {}
  for (let i = 0; i < n; i++) logs[addDays(TODAY, -(i + 1))] = doneDay(areas, dev)
  return logs
}

test('conta nova (sem registros e sem áreas) não ganha o coelho de cristal', () => {
  assert.equal(secretUnlockPath({}, [], TODAY), null)
  assert.equal(deservesSecret({}, AREAS5, TODAY), false)
})

test('listas vazias nunca liberam nada', () => {
  assert.equal(allAreasInAWeek({}, [], TODAY), false)
  assert.equal(allAreasInAWeek(allAreasRun(7, AREAS5), [], TODAY), false)
  assert.equal(bestAreasWindow(allAreasRun(7, AREAS5), [], TODAY), 0)
  assert.equal(secretUnlockPath(allAreasRun(7, AREAS5), [], TODAY), null)
  // Dias sem nenhum bloco não contam como ativos.
  const empty: Logs = { [addDays(TODAY, -1)]: { blocks: {} } }
  assert.equal(secretUnlockPath(empty, AREAS5, TODAY), null)
})

test('29 dias ativos ainda não; 30 sim (caminho "dias")', () => {
  assert.equal(SECRET_DAYS, 30)
  assert.equal(secretUnlockPath(activeDaysLogs(29), [], TODAY), null)
  assert.equal(secretUnlockPath(activeDaysLogs(30), [], TODAY), 'dias')
  assert.equal(secretProgress(activeDaysLogs(29), [], TODAY).days, 29)
})

test('semana com todas as áreas: 4 áreas não valem, 5 sim (caminho "areas")', () => {
  assert.equal(SECRET_MIN_AREAS, 5)
  assert.equal(secretUnlockPath(allAreasRun(7, AREAS4), AREAS4, TODAY), null)
  assert.equal(secretUnlockPath(allAreasRun(7, AREAS5), AREAS5, TODAY), 'areas')
})

test('as áreas precisam caber numa janela de 7 dias seguidos', () => {
  // Cada área num dia diferente: 5 dias seguidos cabem na janela.
  const spread: Logs = {}
  AREAS5.forEach((a, i) => (spread[addDays(TODAY, -(i + 1))] = doneDay([a])))
  assert.equal(secretUnlockPath(spread, AREAS5, TODAY), 'areas')

  // A primeira e a última área separadas por 7 dias (janela de 8): não vale.
  const wide: Logs = {}
  wide[addDays(TODAY, -8)] = doneDay(['sono'])
  wide[addDays(TODAY, -1)] = doneDay(['corpo', 'foco', 'casa', 'mente'])
  assert.equal(secretUnlockPath(wide, AREAS5, TODAY), null)
  assert.equal(bestAreasWindow(wide, AREAS5, TODAY), 4)

  // Separadas por 6 dias (janela de 7): vale.
  const fits: Logs = {}
  fits[addDays(TODAY, -7)] = doneDay(['sono'])
  fits[addDays(TODAY, -1)] = doneDay(['corpo', 'foco', 'casa', 'mente'])
  assert.equal(secretUnlockPath(fits, AREAS5, TODAY), 'areas')
})

test('6 dias seguidos sem uma das áreas não valem; o 7º dia com ela vale', () => {
  // 6 dias com 4 das 5 áreas: falta uma.
  const six = allAreasRun(6, AREAS4)
  assert.equal(secretUnlockPath(six, AREAS5, TODAY), null)
  // No 7º dia seguido (dentro da mesma janela) aparece a 5ª área.
  const seven = { ...six, [addDays(TODAY, -7)]: doneDay(['mente']) }
  assert.equal(secretUnlockPath(seven, AREAS5, TODAY), 'areas')
})

test('dados simulados pelo painel dev não contam', () => {
  assert.equal(secretUnlockPath(activeDaysLogs(40, true), [], TODAY), null)
  assert.equal(secretUnlockPath(allAreasRun(7, AREAS5, true), AREAS5, TODAY), null)
  // Bloco simulado dentro de um dia real também fica de fora.
  const mixed: Logs = {}
  for (let i = 0; i < 7; i++) {
    const day = doneDay(['sono'])
    const sim = doneDay(['corpo', 'foco', 'casa', 'mente'], true)
    mixed[addDays(TODAY, -(i + 1))] = { blocks: { ...day.blocks, ...sim.blocks } }
  }
  assert.equal(secretUnlockPath(mixed, AREAS5, TODAY), null)
  assert.equal(secretProgress(mixed, AREAS5, TODAY).bestAreas, 1)
})

test('registros no futuro não contam', () => {
  const future: Logs = {}
  for (let i = 0; i < 30; i++) future[addDays(TODAY, i + 1)] = doneDay(['sono'])
  assert.equal(secretUnlockPath(future, [], TODAY), null)
})
