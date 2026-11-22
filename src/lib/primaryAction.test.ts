// Testes do botão contextual. Rodam com o executor do próprio Node (sem biblioteca): `npm test`.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { clipName, getPrimaryAction, type PrimaryInput } from './primaryAction.ts'

const item = (id: string, patch: Partial<{ name: string; done: boolean; skipped: boolean }> = {}) => ({ id, name: `Bloco ${id}`, done: false, skipped: false, ...patch })

/** Pessoa "em dia": tem pet, rotina e blocos hoje, nada feito ainda, de manhã. */
const base: PrimaryInput = {
  hasFavoritePet: true,
  routineCount: 1,
  daysSinceLastActive: 0,
  wokeToday: false,
  items: [item('a'), item('b')],
  activeId: null,
  hour: 9,
  hasReview: false,
}
const run = (patch: Partial<PrimaryInput>) => getPrimaryAction({ ...base, ...patch })

test('1. sem pet favorito: conhecer o pet (onboarding passo 1)', () => {
  const r = run({ hasFavoritePet: false, routineCount: 0 })
  assert.equal(r.label, 'Conhecer meu pet')
  assert.deepEqual(r.action, { type: 'onboarding', step: 1 })
})

test('2. sem rotina: montar a primeira (onboarding passo 2)', () => {
  const r = run({ routineCount: 0, items: [] })
  assert.equal(r.label, 'Montar minha primeira rotina')
  assert.deepEqual(r.action, { type: 'onboarding', step: 2 })
})

test('3. 2+ dias parado: acordar o pet (e não repete depois de acordar)', () => {
  const r = run({ daysSinceLastActive: 2 })
  assert.equal(r.label, 'Acordar meu pet')
  assert.deepEqual(r.action, { type: 'wakePet' })
  assert.equal(run({ daysSinceLastActive: 5, wokeToday: true }).state, 'comecar')
  assert.equal(run({ daysSinceLastActive: null }).state, 'comecar')
  assert.equal(run({ daysSinceLastActive: 1 }).state, 'comecar')
})

test('4. hoje sem blocos: adicionar algo para hoje', () => {
  const r = run({ items: [] })
  assert.equal(r.label, 'Adicionar algo para hoje')
  assert.deepEqual(r.action, { type: 'quickTask' })
})

test('5. nada feito hoje: começar o dia pelo primeiro pendente', () => {
  const r = run({ items: [item('a', { skipped: true }), item('b'), item('c')] })
  assert.equal(r.label, 'Começar meu dia')
  assert.deepEqual(r.action, { type: 'startDay', blockId: 'b' })
})

test('6. com pendentes: continuar no próximo (o em andamento tem prioridade)', () => {
  const items = [item('a', { done: true }), item('b', { name: 'Ler' }), item('c', { name: 'Correr' })]
  const r = run({ items })
  assert.equal(r.label, 'Continuar: Ler')
  assert.deepEqual(r.action, { type: 'continue', blockId: 'b' })
  assert.deepEqual(run({ items, activeId: 'c' }).action, { type: 'continue', blockId: 'c' })
})

test('6. nome longo é cortado com reticências (24 caracteres)', () => {
  const long = 'Fechar o dia e anotar pendências'
  const r = run({ items: [item('a', { done: true }), item('b', { name: long })] })
  assert.equal(r.label, `Continuar: ${clipName(long)}`)
  assert.equal(clipName(long).length, 24)
  assert.ok(clipName(long).endsWith('…'))
  assert.equal(clipName('Ler'), 'Ler')
})

test('7. tudo feito depois das 19h sem revisão: revisão da noite', () => {
  const r = run({ items: [item('a', { done: true }), item('b', { skipped: true })], hour: 19 })
  assert.equal(r.label, 'Fazer a revisão da noite')
  assert.deepEqual(r.action, { type: 'review' })
})

test('8. tudo feito: ver como foi o dia (antes das 19h, ou já com revisão)', () => {
  const items = [item('a', { done: true }), item('b', { done: true })]
  assert.equal(run({ items, hour: 15 }).label, 'Ver como foi o dia')
  assert.deepEqual(run({ items, hour: 22, hasReview: true }).action, { type: 'daySummary' })
})

test('todo estado tem uma frase do pet', () => {
  const cases: Partial<PrimaryInput>[] = [
    { hasFavoritePet: false },
    { routineCount: 0 },
    { daysSinceLastActive: 3 },
    { items: [] },
    {},
    { items: [item('a', { done: true }), item('b')] },
    { items: [item('a', { done: true })], hour: 20 },
    { items: [item('a', { done: true })] },
  ]
  const states = cases.map((c) => run(c))
  assert.equal(new Set(states.map((s) => s.state)).size, 8)
  for (const s of states) assert.ok(s.petMessage.length > 0)
})
