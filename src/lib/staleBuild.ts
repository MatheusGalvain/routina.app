/**
 * Versão nova publicada com a aba aberta: os arquivos das páginas da versão antiga
 * deixam de existir e o import da página falha ("error loading dynamically imported module").
 * Aí recarregamos a aba uma vez, para ela pegar a versão nova. Se a falha voltar logo depois
 * do recarregamento (ex.: sem internet), deixa o erro aparecer em vez de recarregar sem parar.
 */
const KEY = 'habbit-do-stale-reload'
const WINDOW_MS = 10_000

export function reloadForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) ?? 0)
    if (Date.now() - last < WINDOW_MS) return false
    sessionStorage.setItem(KEY, String(Date.now()))
  } catch {
    return false
  }
  window.location.reload()
  return true
}

/** Envolve um import de página: se o arquivo sumiu, recarrega a aba em vez de quebrar. */
export function withReload<T>(load: () => Promise<T>): () => Promise<T> {
  return () =>
    load().catch((err) => {
      // Promise que nunca resolve: a tela segue no carregando até a aba recarregar.
      if (reloadForNewVersion()) return new Promise<T>(() => {})
      throw err
    })
}

// Falha nos arquivos que o Vite pré-carrega junto com a página.
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (e) => {
    if (reloadForNewVersion()) e.preventDefault()
  })
}
