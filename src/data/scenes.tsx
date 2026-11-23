import type { AreaId, DefaultAreaKey, SceneItemMap } from '../types'
import type { Stats } from '../lib/stats'

/**
 * Cenários do cantinho e os itens de cada um.
 * Os desenhos vêm de src/docs/referencias/cenarios.html: ficam como <symbol> em <SceneDefs />
 * (montado uma vez no app) e são usados com <use href="#hd-…">.
 * Itens de área desbloqueiam com 10 dias em que a área teve bloco concluído (chave da área padrão,
 * como nos troféus); os outros dois seguem blocos concluídos e a maior sequência.
 */

export type SceneId = 'cosmos' | 'floresta'

export const SCENES: { id: SceneId; name: string; title: string; description: string }[] = [
  {
    id: 'cosmos',
    name: 'Cosmos',
    title: 'Ilhota entre as estrelas',
    description: 'Uma ilhota de pedra flutuando devagar, com nebulosa, planeta com anel e estrelas cadentes. As áreas da semana viram constelações.',
  },
  {
    id: 'floresta',
    name: 'Floresta',
    title: 'Clareira à noite',
    description: 'Lua atravessando a névoa, árvores em camadas e grama que reage à luz. As áreas da semana viram vaga-lumes.',
  },
]
export const SCENE_BY_ID = Object.fromEntries(SCENES.map((s) => [s.id, s])) as Record<SceneId, (typeof SCENES)[number]>
export const DEFAULT_SCENE: SceneId = 'cosmos'
export const isSceneId = (v: unknown): v is SceneId => v === 'cosmos' || v === 'floresta'

/** Meta dos itens de área (dias com bloco da área concluído). */
export const AREA_ITEM_GOAL = 10

type ItemStats = Pick<Stats, 'bestStreak' | 'blocksDone' | 'areaDaysTotal'>

export interface SceneItemDef {
  id: string
  scene: SceneId
  name: string
  /** Como se conquista (coleção). */
  hint: string
  goal: number
  unit: readonly [string, string]
  value: (s: ItemStats) => number
  /** Item de área: a chave da área padrão. */
  area?: DefaultAreaKey
  /** Altura relativa no chão (1 = 48 unidades da cena). */
  scale?: number
}

const areaItem = <I extends string>(id: I, scene: SceneId, name: string, area: DefaultAreaKey, areaName: string, scale?: number): SceneItemDef & { id: I } => ({
  id,
  scene,
  name,
  hint: `${AREA_ITEM_GOAL} dias com bloco de ${areaName} concluído`,
  goal: AREA_ITEM_GOAL,
  unit: ['dia', 'dias'],
  value: (s) => s.areaDaysTotal[area] ?? 0,
  area,
  scale,
})

export const SCENE_ITEMS = [
  areaItem('telescopio', 'cosmos', 'Telescópio', 'estudo', 'Estudo', 1.15),
  areaItem('planeta', 'cosmos', 'Planetinha', 'foco', 'Foco'),
  areaItem('pote', 'cosmos', 'Pote de estrelas', 'sono', 'Sono', 0.92),
  { id: 'foguete', scene: 'cosmos', name: 'Foguetinho', hint: '100 blocos concluídos', goal: 100, unit: ['bloco', 'blocos'], value: (s) => s.blocksDone, scale: 1.05 },
  areaItem('cristal', 'cosmos', 'Cristal', 'financas', 'Finanças', 0.92),
  areaItem('lua', 'cosmos', 'Lua', 'mente', 'Mente', 0.95),
  areaItem('cogumelo', 'floresta', 'Cogumelo', 'corpo', 'Corpo', 0.92),
  areaItem('lanterna', 'floresta', 'Lanterna', 'foco', 'Foco', 1.15),
  areaItem('toco', 'floresta', 'Toco com broto', 'casa', 'Casa'),
  areaItem('fogueira', 'floresta', 'Fogueirinha', 'social', 'Social', 1.08),
  areaItem('flores', 'floresta', 'Flores', 'mente', 'Mente', 0.88),
  { id: 'pedra', scene: 'floresta', name: 'Pedra com musgo', hint: 'Sequência de 14 dias ativos', goal: 14, unit: ['dia', 'dias'], value: (s) => s.bestStreak },
] as const satisfies readonly SceneItemDef[]

export type SceneItemId = (typeof SCENE_ITEMS)[number]['id']
export const ITEM_BY_ID = Object.fromEntries(SCENE_ITEMS.map((i) => [i.id, i])) as Record<SceneItemId, SceneItemDef>
export const isItemId = (v: unknown): v is SceneItemId => typeof v === 'string' && v in ITEM_BY_ID
export const itemsOf = (scene: SceneId) => SCENE_ITEMS.filter((i) => i.scene === scene) as SceneItemDef[]

/** Itens que as estatísticas garantem e ainda não estão no mapa. */
export function missingItems(map: SceneItemMap, stats: ItemStats) {
  return (SCENE_ITEMS as readonly SceneItemDef[]).filter((i) => !map[i.id as SceneItemId] && i.value(stats) >= i.goal).map((i) => i.id as SceneItemId)
}

/** Quanto falta para um item (coleção). */
export function itemRemaining(id: SceneItemId, s: ItemStats) {
  const def = ITEM_BY_ID[id]
  const v = def.value(s)
  const left = Math.max(0, def.goal - v)
  return { pct: Math.min(1, v / def.goal), text: left === 0 ? 'pronto' : `faltam ${left} ${def.unit[left === 1 ? 0 : 1]}` }
}

// ---------------------------------------------------------------------
// Constelações (cosmos): uma por área, estrelas acesas conforme os dias da semana.
// ---------------------------------------------------------------------

export type Constellation = { stars: [number, number][]; edges: [number, number][] }

/** Constelações em caixas de 70 × 44. `edges` liga os índices de `stars`. */
const CONSTELLATIONS: Record<DefaultAreaKey, Constellation> = {
  sono: { stars: [[8, 30], [22, 12], [44, 8], [62, 20]], edges: [[0, 1], [1, 2], [2, 3]] },
  corpo: { stars: [[6, 36], [20, 20], [34, 30], [48, 10], [64, 24]], edges: [[0, 1], [1, 2], [2, 3], [3, 4]] },
  foco: { stars: [[10, 34], [36, 8], [62, 34]], edges: [[0, 1], [1, 2], [2, 0]] },
  casa: { stars: [[12, 38], [12, 18], [35, 4], [58, 18], [58, 38]], edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]] },
  financas: { stars: [[35, 4], [60, 22], [35, 40], [10, 22]], edges: [[0, 1], [1, 2], [2, 3], [3, 0]] },
  estudo: { stars: [[8, 10], [30, 14], [52, 10], [30, 38]], edges: [[0, 1], [1, 2], [1, 3]] },
  mente: { stars: [[14, 30], [35, 10], [56, 30]], edges: [[0, 1], [1, 2]] },
  social: { stars: [[8, 22], [24, 8], [35, 24], [46, 8], [62, 22]], edges: [[0, 1], [1, 2], [2, 3], [3, 4]] },
}
const SHAPES = Object.values(CONSTELLATIONS)

/** Forma da constelação: a própria nas áreas padrão; nas criadas pela pessoa, uma das 8, sempre a mesma para o mesmo id. */
export function constellationOf(id: AreaId): Constellation {
  if (id in CONSTELLATIONS) return CONSTELLATIONS[id as DefaultAreaKey]
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return SHAPES[h % SHAPES.length]
}

/** Estrelas acesas: proporcional aos dias (7 dias = todas). Pelo menos uma se houve algum dia. */
export const litStars = (days: number, total: number) => (days <= 0 ? 0 : Math.min(total, Math.ceil((days * total) / 7)))

// ---------------------------------------------------------------------
// Desenhos
// ---------------------------------------------------------------------

/** Desenho de um item (viewBox 48 × 48, apoiado embaixo). `silhouette` = bloqueado. */
export function SceneItem({ id, size = 48, silhouette = false, className = '' }: { id: SceneItemId; size?: number; silhouette?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      aria-hidden="true"
      className={className}
      style={{ overflow: 'visible', ...(silhouette ? { filter: 'brightness(0) drop-shadow(0 0 3px rgba(205,184,255,.35))', opacity: 0.7 } : {}) }}
    >
      <use href={`#hd-${id}`} />
    </svg>
  )
}

/**
 * Gradientes, filtros e desenhos dos cenários e itens, num <svg> invisível.
 * Montado uma vez (App); os cenários e os itens usam por id. Animações: classes sc-* (index.css).
 */
export function SceneDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        <filter id="hd-blur2" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
        <filter id="hd-blur6" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id="hd-blur24" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="24" />
        </filter>
        <filter id="hd-glow" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="hd-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves={2} stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .05 0" />
        </filter>

        {/* Floresta */}
        <linearGradient id="hd-fSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#08110F" />
          <stop offset=".55" stopColor="#10201B" />
          <stop offset="1" stopColor="#1C3229" />
        </linearGradient>
        <radialGradient id="hd-fMoon" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#F6F1E6" stopOpacity=".55" />
          <stop offset=".25" stopColor="#E8EFD8" stopOpacity=".18" />
          <stop offset="1" stopColor="#E8EFD8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hd-fRay" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F2F0ED" stopOpacity=".10" />
          <stop offset="1" stopColor="#F2F0ED" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hd-fGround" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1D3429" />
          <stop offset="1" stopColor="#0C1511" />
        </linearGradient>
        <radialGradient id="hd-fPool" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#FFD59E" stopOpacity=".22" />
          <stop offset="1" stopColor="#FFD59E" stopOpacity="0" />
        </radialGradient>
        {/* Névoa: elipse com borda suave por gradiente (sem filtro de desfoque nas camadas da frente). */}
        <radialGradient id="hd-fMist" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#CFE3D8" stopOpacity="1" />
          <stop offset=".6" stopColor="#CFE3D8" stopOpacity=".45" />
          <stop offset="1" stopColor="#CFE3D8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hd-dot" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>

        {/* Cosmos */}
        <linearGradient id="hd-cSky" x1="0" y1="0" x2=".3" y2="1">
          <stop offset="0" stopColor="#07060F" />
          <stop offset=".6" stopColor="#120D24" />
          <stop offset="1" stopColor="#1B1333" />
        </linearGradient>
        <radialGradient id="hd-cPlanet" cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#FFE3CF" />
          <stop offset=".55" stopColor="#FFC9A8" />
          <stop offset="1" stopColor="#B9746A" />
        </radialGradient>
        <radialGradient id="hd-cShadow" cx="85%" cy="85%" r="70%">
          <stop offset="0" stopColor="#1B1333" stopOpacity=".85" />
          <stop offset="1" stopColor="#1B1333" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hd-cRock" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3A3054" />
          <stop offset=".35" stopColor="#2A2240" />
          <stop offset="1" stopColor="#140F22" />
        </linearGradient>
        <linearGradient id="hd-cRim" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#CDB8FF" stopOpacity="0" />
          <stop offset=".5" stopColor="#CDB8FF" stopOpacity=".7" />
          <stop offset="1" stopColor="#CDB8FF" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="hd-cUnder" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#A9BFFF" stopOpacity=".35" />
          <stop offset="1" stopColor="#A9BFFF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hd-cTail" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity=".9" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>

        {/* Luz comum dos itens */}
        <linearGradient id="hd-hl" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity=".45" />
          <stop offset=".5" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hd-crystal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F1E6FF" />
          <stop offset=".5" stopColor="#A5D8FF" />
          <stop offset="1" stopColor="#FBCFE8" />
        </linearGradient>
        <radialGradient id="hd-warm" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#FFD59E" stopOpacity=".55" />
          <stop offset="1" stopColor="#FFD59E" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hd-capG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FAC4C4" />
          <stop offset="1" stopColor="#D9898F" />
        </linearGradient>
        <linearGradient id="hd-woodG" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6E5440" />
          <stop offset=".5" stopColor="#9A7656" />
          <stop offset="1" stopColor="#5A4434" />
        </linearGradient>

        {/* Itens: 48 × 48, apoiados em y = 48 */}
        <symbol id="hd-cogumelo" viewBox="0 0 48 48" overflow="visible">
          <path d="M19,28 C18,38 17,44 16,48 H32 C31,44 30,38 29,28 Z" fill="#EFE6D8" />
          <path d="M19,28 C18,38 17,44 16,48 H21 C21,40 21,34 22,28 Z" fill="#D8CBB6" />
          <path d="M5,29 C5,14 15,6 24,6 C33,6 43,14 43,29 C34,32 14,32 5,29 Z" fill="url(#hd-capG)" />
          <path d="M5,29 C14,32 34,32 43,29 C40,33 8,33 5,29 Z" fill="#B87079" />
          <ellipse cx="16" cy="18" rx="3.4" ry="2.6" fill="#FFF3F0" />
          <ellipse cx="28" cy="13" rx="2.6" ry="2" fill="#FFF3F0" />
          <ellipse cx="33" cy="22" rx="2.2" ry="1.7" fill="#FFF3F0" />
          <path d="M9,22 C12,12 20,8 26,8" fill="none" stroke="#FFFFFF" strokeOpacity=".5" strokeWidth="2" strokeLinecap="round" />
        </symbol>
        <symbol id="hd-lanterna" viewBox="0 0 48 48" overflow="visible">
          <circle cx="24" cy="27" r="22" fill="url(#hd-warm)" />
          <path d="M24,1 C29,1 29,7 24,7" fill="none" stroke="#5B5550" strokeWidth="2" />
          <path d="M15,13 L24,7 L33,13 Z" fill="#4E4843" />
          <rect x="15" y="13" width="18" height="4" rx="1.5" fill="#625B55" />
          <rect x="16.5" y="17" width="15" height="20" rx="3" fill="#FFE6B8" />
          <rect x="16.5" y="17" width="15" height="20" rx="3" fill="url(#hd-hl)" />
          <path d="M24,22 C27,26 27,29 24,32 C21,29 21,26 24,22 Z" className="sc-anim sc-flick" fill="#FFB86B" />
          <path d="M16.5,23 H31.5 M24,17 V37" stroke="#4E4843" strokeWidth="1.4" />
          <rect x="14" y="37" width="20" height="4" rx="1.5" fill="#625B55" />
        </symbol>
        <symbol id="hd-toco" viewBox="0 0 48 48" overflow="visible">
          <path d="M8,22 C8,34 6,44 4,48 H44 C42,44 40,34 40,22 Z" fill="url(#hd-woodG)" />
          <ellipse cx="24" cy="22" rx="16" ry="5.5" fill="#D6B38E" />
          <ellipse cx="24" cy="22" rx="10" ry="3.4" fill="none" stroke="#A9835F" strokeWidth="1.2" />
          <ellipse cx="24" cy="22" rx="4.5" ry="1.6" fill="none" stroke="#A9835F" strokeWidth="1" />
          <path d="M30,20 C32,12 38,10 41,12 C38,13 34,15 32,20" fill="#A8E6B8" />
          <path d="M31,20 C29,13 24,11 21,13 C24,14 28,16 30,20" fill="#86C99B" />
          <path d="M4,48 C10,44 16,46 20,48 Z" fill="#7FB894" />
        </symbol>
        <symbol id="hd-fogueira" viewBox="0 0 48 48" overflow="visible">
          <circle cx="24" cy="30" r="22" fill="url(#hd-warm)" />
          <g className="sc-anim sc-flick">
            <path d="M24,8 C31,17 35,22 33,30 C31.5,37 16.5,37 15,30 C13,23 19,19 24,8 Z" fill="#FF9F7A" />
            <path d="M24,17 C28,23 30,26 28.5,31 C27,35 21,35 19.5,31 C18,27 21,23 24,17 Z" fill="#FFD59E" />
            <path d="M24,25 C25.5,28 26,30 25,32 C24,33.5 23,33.5 22.8,32 C22.3,30 23,28 24,25 Z" fill="#FFF4DC" />
          </g>
          <rect x="7" y="38" width="34" height="5.5" rx="2.75" fill="#7A5C45" transform="rotate(-12 24 41)" />
          <rect x="7" y="38" width="34" height="5.5" rx="2.75" fill="#5E4636" transform="rotate(12 24 41)" />
          <g fill="#6B6B6B">
            <ellipse cx="6" cy="46" rx="4" ry="2.4" />
            <ellipse cx="42" cy="46" rx="4" ry="2.4" />
          </g>
        </symbol>
        <symbol id="hd-flores" viewBox="0 0 48 48" overflow="visible">
          <path d="M13,48 C13,40 12,34 14,29 M24,48 C24,38 25,30 24,21 M35,48 C35,42 36,37 34,32" fill="none" stroke="#6FA884" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M24,40 C18,38 16,34 17,31 C21,32 23,35 24,40 Z M24,36 C29,34 31,30 30,27 C27,28 25,31 24,36 Z" fill="#86C99B" />
          <g transform="translate(14 28)">
            <circle r="5.5" fill="#F7B8D6" />
            <circle r="2" fill="#FFE8B5" />
          </g>
          <g transform="translate(24 19)">
            <circle cx="0" cy="-5" r="3.6" fill="#CDB8FF" />
            <circle cx="5" cy="-1" r="3.6" fill="#CDB8FF" />
            <circle cx="3" cy="4.5" r="3.6" fill="#CDB8FF" />
            <circle cx="-3" cy="4.5" r="3.6" fill="#CDB8FF" />
            <circle cx="-5" cy="-1" r="3.6" fill="#CDB8FF" />
            <circle r="2.4" fill="#FFE8B5" />
          </g>
          <g transform="translate(34 31)">
            <circle r="4.6" fill="#FFD59E" />
            <circle r="1.6" fill="#FFF4DC" />
          </g>
        </symbol>
        <symbol id="hd-pedra" viewBox="0 0 48 48" overflow="visible">
          <path d="M3,48 C2,38 8,28 18,26 C28,22 40,28 44,38 C45,42 45,46 45,48 Z" fill="#55575A" />
          <path d="M3,48 C2,38 8,28 18,26 C14,32 12,40 14,48 Z" fill="#6A6D70" />
          <path d="M9,33 C15,25 30,22 40,31 C34,29 26,29 20,31 C16,32 12,33 9,33 Z" fill="#94D4A6" />
          <path d="M12,30 C18,25 26,24 32,26" fill="none" stroke="#C6EED2" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="34" cy="40" r="1.4" fill="#94D4A6" />
        </symbol>

        <symbol id="hd-telescopio" viewBox="0 0 48 48" overflow="visible">
          <g transform="rotate(-28 24 16)">
            <rect x="6" y="11" width="34" height="10" rx="5" fill="#A9BFFF" />
            <rect x="6" y="11" width="34" height="10" rx="5" fill="url(#hd-hl)" />
            <rect x="36" y="9.5" width="7" height="13" rx="2.5" fill="#7E8FCC" />
            <rect x="2" y="13" width="6" height="6" rx="2" fill="#7E8FCC" />
            <rect x="20" y="11" width="3" height="10" fill="#D7E0FF" />
          </g>
          <path d="M24,24 L13,48 M24,24 L35,48 M24,24 L24,48" stroke="#5B5770" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="24" cy="24" r="3" fill="#7E8FCC" />
        </symbol>
        <symbol id="hd-planeta" viewBox="0 0 48 48" overflow="visible">
          <path d="M4,24 a20,6 -15 0 1 40,-6" fill="none" stroke="#CDB8FF" strokeOpacity=".55" strokeWidth="2.6" />
          <circle cx="24" cy="20" r="12" fill="url(#hd-cPlanet)" />
          <circle cx="24" cy="20" r="12" fill="url(#hd-cShadow)" />
          <path d="M44,18 a20,6 -15 0 1 -40,6" fill="none" stroke="#CDB8FF" strokeWidth="2.6" />
          <path d="M22,32 L26,32 L27,42 H21 Z" fill="#3D3650" />
          <rect x="15" y="42" width="18" height="6" rx="2.5" fill="#2E2840" />
        </symbol>
        <symbol id="hd-pote" viewBox="0 0 48 48" overflow="visible">
          <circle cx="24" cy="30" r="20" fill="#FFD59E" opacity=".12" />
          <rect x="15" y="6" width="18" height="6" rx="2" fill="#C9A27E" />
          <rect x="15" y="6" width="18" height="2.5" rx="1.2" fill="#E1C09F" />
          <path d="M13,15 C13,12 35,12 35,15 L37,40 C37,46 11,46 11,40 Z" fill="#A9BFFF" fillOpacity=".14" stroke="#C9D6FF" strokeOpacity=".55" />
          <path d="M15,18 C15,30 15,36 16,40" fill="none" stroke="#FFFFFF" strokeOpacity=".35" strokeWidth="2" strokeLinecap="round" />
          <g filter="url(#hd-glow)" className="sc-anim sc-glowpulse">
            <path d="M24,22 l1.8,4.4 4.6,.6 -3.4,3 .9,4.6 -3.9,-2.4 -3.9,2.4 .9,-4.6 -3.4,-3 4.6,-.6 Z" fill="#FFE2B0" />
            <circle cx="18" cy="37" r="1.4" fill="#FFE2B0" />
            <circle cx="30" cy="34" r="1.1" fill="#FFE2B0" />
            <circle cx="28" cy="40" r=".9" fill="#FFE2B0" />
          </g>
        </symbol>
        <symbol id="hd-foguete" viewBox="0 0 48 48" overflow="visible">
          <path d="M20,36 Q24,50 28,36 Z" fill="#FFD59E" className="sc-anim sc-flick" />
          <path d="M24,3 C33,11 33,26 30,36 H18 C15,26 15,11 24,3 Z" fill="#F2F0ED" />
          <path d="M24,3 C28,7 31,14 31,22 C27,14 25,8 24,3 Z" fill="#FFFFFF" opacity=".6" />
          <path d="M24,3 C19,8 17,14 17,22 C17,27 18,32 18,36 H21 C20,28 20,14 24,3 Z" fill="#D4D0CA" />
          <circle cx="24" cy="18" r="4.6" fill="#7E8FCC" />
          <circle cx="24" cy="18" r="3.2" fill="#A9BFFF" />
          <circle cx="22.8" cy="16.8" r="1.1" fill="#FFFFFF" />
          <path d="M18,25 L9,37 L18,35 Z M30,25 L39,37 L30,35 Z" fill="#F4B4B4" />
          <path d="M24,28 V36" stroke="#F4B4B4" strokeWidth="3" />
        </symbol>
        <symbol id="hd-cristal" viewBox="0 0 48 48" overflow="visible">
          <circle cx="24" cy="24" r="20" fill="#CDB8FF" opacity=".12" className="sc-anim sc-glowpulse" />
          <path d="M24,3 L35,18 L24,42 L13,18 Z" fill="url(#hd-crystal)" />
          <path d="M24,3 L35,18 L24,22 Z" fill="#FFFFFF" opacity=".45" />
          <path d="M13,18 L24,22 L24,42 Z" fill="#7E8FCC" opacity=".25" />
          <path d="M15,10 L13,7 M33,10 L35,7" stroke="#F1E6FF" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M14,42 H34 L32,48 H16 Z" fill="#2E2840" />
        </symbol>
        <symbol id="hd-lua" viewBox="0 0 48 48" overflow="visible">
          <circle cx="24" cy="20" r="20" fill="#FFD59E" opacity=".1" />
          <path d="M19,3 a17,17 0 1 0 21,24 a13,13 0 1 1 -21,-24 Z" fill="#FFE2B0" />
          <path d="M19,3 a17,17 0 0 0 -4,30 a17,17 0 0 1 4,-30 Z" fill="#FFF4DC" opacity=".6" />
          <circle cx="16" cy="24" r="2" fill="#E8C68E" />
          <circle cx="21" cy="31" r="1.4" fill="#E8C68E" />
          <rect x="16" y="42" width="16" height="6" rx="2.5" fill="#2E2840" />
          <path d="M23,36 H25 V42 H23 Z" fill="#2E2840" />
        </symbol>
      </defs>
    </svg>
  )
}
