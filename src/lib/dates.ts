const pad = (n: number) => String(n).padStart(2, '0')

/** Data local no formato AAAA-MM-DD, usada como chave dos registros. */
export function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
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
