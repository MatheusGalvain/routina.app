const pad = (n: number) => String(n).padStart(2, '0')

/** Fuso do aparelho. */
export const deviceTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone

// Fuso usado pelo app: o do perfil do usuário (definido ao entrar); até lá, o do aparelho.
let appTimeZone = deviceTimeZone()

export function setAppTimeZone(tz: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    appTimeZone = tz
  } catch {
    appTimeZone = deviceTimeZone()
  }
}

export const getAppTimeZone = () => appTimeZone

/**
 * "Agora" no fuso do usuário: um Date cujos campos locais (dia, hora, dia da semana)
 * são os do relógio no fuso do perfil. Use no lugar de `new Date()` para "hoje" e "agora".
 */
export function nowInTz(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: appTimeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    })
      .formatToParts(now)
      .map((p) => [p.type, Number(p.value)]),
  )
  return new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
}

/** Data no formato AAAA-MM-DD (chave dos registros). Sem argumento: hoje, no fuso do usuário. */
export function dayKey(d = nowInTz()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Converte AAAA-MM-DD em Date local (meio-dia, para não sofrer com horário de verão). */
export function parseKey(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

/** Soma (ou subtrai) dias a uma chave AAAA-MM-DD. */
export function addDays(key: string, n: number) {
  const d = parseKey(key)
  d.setDate(d.getDate() + n)
  return dayKey(d)
}

/** Quantos dias `a` está depois de `b`. */
export function diffDays(a: string, b: string) {
  return Math.round((parseKey(a).getTime() - parseKey(b).getTime()) / 86_400_000)
}

export function formatLong(d = nowInTz()) {
  const s = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(d)
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** "Novembro de 2026" */
export function formatMonth(d = nowInTz()) {
  const s = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(d)
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function greeting(d = nowInTz()) {
  const h = d.getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}
