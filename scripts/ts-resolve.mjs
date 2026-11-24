// Usado pelo `npm test`: deixa o Node achar imports sem extensão (`./stats` → `./stats.ts`),
// como o Vite faz, para os testes rodarem direto nos arquivos do app. Sem biblioteca.
import { register } from 'node:module'

register(
  'data:text/javascript,' +
    encodeURIComponent(`
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context)
  } catch (error) {
    if (!/^\\.\\.?\\//.test(specifier) || /\\.[cm]?[jt]sx?$/.test(specifier)) throw error
    for (const ext of ['.ts', '/index.ts']) {
      try {
        return await next(specifier + ext, context)
      } catch {}
    }
    throw error
  }
}
`),
  import.meta.url,
)
