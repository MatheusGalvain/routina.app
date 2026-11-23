import { useRotina } from '../store/useRotina'

/**
 * Endereços legíveis para rotinas e modelos: /rotinas/treino-da-manha e /rotinas/modelos/semana-leve.
 * O endereço é só aparência: quem protege os dados é o login + as regras do Supabase (RLS),
 * não o id escondido. Nomes repetidos ganham -2, -3… na ordem da lista.
 */
export function slugify(name: string) {
  const s = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '')
  return s || 'sem-nome'
}

type Named = { id: string; name: string }

/** Slug de cada item (id → slug), únicos dentro da lista. */
export function slugMap(items: Named[]) {
  // Nomes "de verdade" primeiro, para "Sono 2" não perder o endereço para a segunda rotina "Sono".
  const bases = items.map((it) => slugify(it.name))
  const taken = new Set<string>()
  const out = new Map<string, string>()
  items.forEach((it, i) => {
    if (!taken.has(bases[i])) {
      taken.add(bases[i])
      out.set(it.id, bases[i])
    }
  })
  items.forEach((it, i) => {
    if (out.has(it.id)) return
    let n = 2
    while (taken.has(`${bases[i]}-${n}`) || bases.includes(`${bases[i]}-${n}`)) n++
    const slug = `${bases[i]}-${n}`
    taken.add(slug)
    out.set(it.id, slug)
  })
  return out
}

export function findBySlug<T extends Named>(items: T[], slug: string): T | undefined {
  const map = slugMap(items)
  return items.find((it) => map.get(it.id) === slug)
}

/** Endereço do editor de uma rotina ou modelo, pelo id (procura nas duas listas). */
export function editorPath(id: string) {
  const { routines, templates } = useRotina.getState()
  if (routines.some((r) => r.id === id)) return `/rotinas/${slugMap(routines).get(id)}`
  if (templates.some((t) => t.id === id)) return `/rotinas/modelos/${slugMap(templates).get(id)}`
  return '/rotinas'
}

/** Ids antigos (UUID) ainda abrem: o app troca pelo endereço com nome. */
export const looksLikeId = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
