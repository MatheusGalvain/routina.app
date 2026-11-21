const pad = (n: number) => String(n).padStart(2, '0')

/** Data local no formato AAAA-MM-DD, usada como chave dos registros. */
export function dayKey(d = new Date()) {
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

export function formatLong(d = new Date()) {
  const s = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(d)
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** "Novembro de 2026" */
export function formatMonth(d = new Date()) {
  const s = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(d)
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function greeting(d = new Date()) {
  const h = d.getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}
