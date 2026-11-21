/** Contraste entre cores (fórmula do WCAG), para acessórios legíveis sobre qualquer espécie. */

function luminance(hex: string) {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

/** Das opções, a que mais contrasta com o fundo. */
export const pick = (bg: string, ...options: string[]) => options.reduce((best, c) => (contrast(c, bg) > contrast(best, bg) ? c : best))

/** Contorno só quando a cor some sobre o fundo. */
export const edge = (color: string, bg: string, stroke: string, min = 1.8) =>
  contrast(color, bg) < min ? { stroke, strokeWidth: 1.5, strokeLinejoin: 'round' as const } : {}
