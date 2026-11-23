// Testes da fase da lua (cálculo, sem API). Rodam com o executor do próprio Node: `npm test`.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isFullMoon, isNight, moonAge, moonIllumination, nextFullMoon } from './moon.ts'

// Luas de referência (horário UTC publicado pelos observatórios).
const FULL = [Date.UTC(2024, 0, 25, 17, 54), Date.UTC(2025, 8, 7, 18, 9), Date.UTC(2026, 11, 24, 1, 28)]
const NEW = [Date.UTC(2024, 0, 11, 11, 57), Date.UTC(2025, 8, 21, 19, 54)]

test('lua cheia conhecida é reconhecida como cheia', () => {
  for (const t of FULL) assert.equal(isFullMoon(new Date(t)), true, new Date(t).toISOString())
})

test('lua nova conhecida tem iluminação perto de zero', () => {
  for (const t of NEW) {
    assert.ok(moonIllumination(new Date(t)) < 0.02, new Date(t).toISOString())
    assert.equal(isFullMoon(new Date(t)), false)
  }
})

test('uma semana depois da cheia já não é cheia', () => {
  assert.equal(isFullMoon(new Date(FULL[0] + 7 * 86_400_000)), false)
})

test('idade da lua fica entre 0 e o mês sinódico', () => {
  const age = moonAge(new Date(Date.UTC(1990, 4, 3)))
  assert.ok(age >= 0 && age < 29.54)
})

test('próxima lua cheia cai perto da cheia conhecida', () => {
  const from = new Date(FULL[2] - 10 * 86_400_000)
  const next = nextFullMoon(from).getTime()
  assert.ok(Math.abs(next - FULL[2]) < 12 * 3_600_000, new Date(next).toISOString())
})

test('noite vai das 18h às 6h', () => {
  assert.equal(isNight(18), true)
  assert.equal(isNight(23), true)
  assert.equal(isNight(5), true)
  assert.equal(isNight(6), false)
  assert.equal(isNight(12), false)
})
