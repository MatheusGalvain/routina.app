/**
 * Movimento reduzido fora do React (rolagens com `behavior: 'smooth'`).
 * Segue a mesma regra das animações em CSS: o aparelho (prefers-reduced-motion), a não ser
 * que o Perfil diga "Sempre animar" ou "Reduzir" (lido do atributo data-motion do <html>, ver main.tsx).
 */
export function prefersReducedMotion(): boolean {
  const pref = document.documentElement.dataset.motion
  if (pref === 'reduzir') return true
  if (pref === 'sempre') return false
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}
