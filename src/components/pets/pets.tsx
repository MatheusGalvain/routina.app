import type { CSSProperties, ReactNode } from 'react'
import type { BasePetKind, PetKind, PetState, SecretPetKind } from '../../types'
import type { Anchor } from '../../data/accessories'
import { BunnyBody, Stardust } from './Bunny'

/** `meh` = sem graça (olhos meio fechados, sem sobrancelha). `angry` só aparece nas historinhas. `spiral` = tonto (brincadeira). */
export type EyeStyle = 'open' | 'happy' | 'closed' | 'angry' | 'squint' | 'meh' | 'spiral'

/** Cores do corpo da espécie (fixas: o estado não muda o corpo). */
export interface PetColors {
  /** Cor principal do corpo. */
  color: string
  /** Tom de apoio (orelhas, espinhos, nariz, bico). */
  detail: string
  /** Bico e detalhes quentes. */
  accent: string
}

/** O estado aparece na expressão, na aura (brilho e anéis) e no balão de emoção. */
export interface StateStyle {
  /** Cor da aura e dos anéis. */
  color: string
  glow: string
  eyeStyle: EyeStyle
  /** Rótulo no estilo "AZUL / FOCO". */
  label: string
  title: string
  description: string
}

/** Cor e expressão de cada estado: qualquer espécie pode "vestir" qualquer estado. */
export const STATE_STYLE: Record<PetState, StateStyle> = {
  neutro: {
    color: '#F1F3F6',
    glow: 'rgba(241,243,246,.35)',
    eyeStyle: 'open',
    label: 'Branco / Guia',
    title: 'Pronto para começar',
    description: 'Te apresenta o próximo bloco e espera você dar o play.',
  },
  foco: {
    color: '#1E88FF',
    glow: 'rgba(30,136,255,.5)',
    eyeStyle: 'open',
    label: 'Azul / Foco',
    title: 'Bloco em andamento',
    description: 'Acompanha o bloco ativo e mostra o que muda no painel do dia.',
  },
  concluido: {
    color: '#22C55E',
    glow: 'rgba(34,197,94,.45)',
    eyeStyle: 'happy',
    label: 'Verde / Concluído',
    title: 'Bloco concluído',
    description: 'Comemora cada hábito feito e cada meta batida.',
  },
  atencao: {
    color: '#FFB020',
    glow: 'rgba(255,176,32,.45)',
    eyeStyle: 'squint',
    label: 'Amarelo / Atenção',
    title: 'Atenção ao aviso',
    description: 'Avisa quando falta pouco para a meta ou o dia está apertando.',
  },
  pulado: {
    color: '#94A3B8',
    glow: 'rgba(148,163,184,.5)',
    eyeStyle: 'meh',
    label: 'Cinza / Pulado',
    title: 'Bloco pulado',
    description: 'Fica meio sem graça quando um bloco é pulado, e logo passa.',
  },
  descanso: {
    color: '#8B5CF6',
    glow: 'rgba(139,92,246,.5)',
    eyeStyle: 'closed',
    label: 'Roxo / Descanso',
    title: 'Dia encerrado',
    description: 'Aparece quando tudo foi feito e é hora de desacelerar.',
  },
}

/** Pontos onde os acessórios se encaixam (viewBox 0 0 120 120). */
export interface Anchors {
  /** Topo da cabeça: onde fica a base de um chapéu. */
  head: Anchor
  /** Linha dos olhos: centro e distância entre os olhos. */
  eyes: Anchor
  neck: Anchor
  hand: Anchor
}

export interface SpeciesDef {
  kind: PetKind
  name: string
  /** Cores originais do corpo. */
  colors: PetColors
  /** O estado "da casa": a expressão e a aura com que a espécie nasceu. */
  homeState: PetState
  /** Centro de cada olho. */
  eyes: [number, number][]
  anchors: Anchors
  /** Detalhe que aparece na fase adulto. */
  adultDetail: string
  /** Desenho do corpo. `adult` liga o detalhe da fase adulto. */
  body: (c: PetColors, adult: boolean) => ReactNode
  /** Camada atrás do corpo (ex.: partículas). Some na silhueta. */
  behind?: () => ReactNode
  /** Brilho em forma de estrela nas pupilas. */
  starEyes?: boolean
  /** Animação parada: flutuar (padrão) ou pulinhos de vez em quando. */
  idle?: 'float' | 'hop'
}

/** Preenchimento com transição suave de cor quando o estado muda. */
export const fill = (color: string): CSSProperties => ({ fill: color, transition: 'fill .6s ease, stroke .6s ease' })
const stroke = (color: string): CSSProperties => ({ stroke: color, transition: 'stroke .6s ease' })

const INK = '#0A0D14'
const BLUSH = '#FF8FA3'

const spikeAngles = (step: number) => Array.from({ length: Math.floor(160 / step) + 1 }, (_, i) => -80 + i * step)

export const SPECIES: Record<PetKind, SpeciesDef> = {
  gatinho: {
    kind: 'gatinho',
    colors: { color: '#F1F3F6', detail: '#F59AB0', accent: '#FFB020' },
    name: 'Gatinho',
    homeState: 'neutro',
    eyes: [[49, 58], [71, 58]],
    anchors: { head: { x: 60, y: 36, w: 34 }, eyes: { x: 60, y: 58, w: 22 }, neck: { x: 60, y: 94, w: 52 }, hand: { x: 96, y: 84, w: 0 } },
    adultDetail: 'um rabo enrolado',
    body: (c, adult) => (
      <>
        {adult && <path d="M80,98 C104,100 114,80 106,62 C104,57 98,58 100,64 C104,78 98,90 80,90" fill="none" strokeWidth={8} strokeLinecap="round" style={stroke(c.color)} />}
        <path d="M22,56 L24,18 L46,36 Q60,32 74,36 L96,18 L98,56 C100,84 82,102 60,102 C38,102 20,84 22,56 Z" style={fill(c.color)} />
        <path d="M30,30 L32,44 L41,38 Z M90,30 L88,44 L79,38 Z" style={fill(c.detail)} opacity=".75" />
        <path d="M57,74 L63,74 L60,78 Z" style={fill(c.detail)} />
      </>
    ),
  },
  sapinho: {
    kind: 'sapinho',
    colors: { color: '#22C55E', detail: '#15803D', accent: '#FFB020' },
    name: 'Sapinho',
    homeState: 'concluido',
    eyes: [[38, 43], [82, 43]],
    anchors: { head: { x: 60, y: 44, w: 26 }, eyes: { x: 60, y: 43, w: 44 }, neck: { x: 60, y: 97, w: 56 }, hand: { x: 100, y: 84, w: 0 } },
    adultDetail: 'uma coroinha',
    body: (c, adult) => (
      <>
        <circle cx="38" cy="42" r="15" style={fill(c.color)} />
        <circle cx="82" cy="42" r="15" style={fill(c.color)} />
        <ellipse cx="60" cy="72" rx="44" ry="32" style={fill(c.color)} />
        <path d="M50,80 Q60,89 70,80" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="34" cy="76" r="5" fill={BLUSH} opacity=".55" />
        <circle cx="86" cy="76" r="5" fill={BLUSH} opacity=".55" />
        {adult && (
          <g transform="rotate(-14 38 26)">
            <path d="M29,30 L28,19 L33,24 L38,16 L43,24 L48,19 L47,30 Z" fill="#FFD34D" />
            <circle cx="38" cy="25" r="1.8" fill="#F43F5E" />
          </g>
        )}
      </>
    ),
  },
  polvinho: {
    kind: 'polvinho',
    colors: { color: '#1E88FF', detail: '#0F5FC2', accent: '#FFB020' },
    name: 'Polvinho',
    homeState: 'foco',
    eyes: [[50, 54], [70, 54]],
    anchors: { head: { x: 60, y: 22, w: 40 }, eyes: { x: 60, y: 54, w: 20 }, neck: { x: 60, y: 79, w: 68 }, hand: { x: 94, y: 92, w: 0 } },
    adultDetail: 'um tentáculo a mais',
    body: (c, adult) => (
      <>
        {adult && <path d="M30,76 Q12,78 10,92 Q9,102 18,100" fill="none" strokeWidth={8} strokeLinecap="round" style={stroke(c.color)} />}
        <path
          d="M22,62 C22,34 40,18 60,18 C80,18 98,34 98,62 C98,72 94,78 90,80 Q86,96 80,88 Q74,102 66,90 Q60,104 54,90 Q46,102 40,88 Q34,96 30,80 C26,78 22,72 22,62 Z"
          style={fill(c.color)}
        />
        <circle cx="40" cy="36" r="4" style={fill(c.detail)} opacity=".6" />
        <circle cx="79" cy="33" r="3" style={fill(c.detail)} opacity=".6" />
      </>
    ),
  },
  pintinho: {
    kind: 'pintinho',
    colors: { color: '#FFB020', detail: '#E07B00', accent: '#E07B00' },
    name: 'Pintinho',
    homeState: 'atencao',
    eyes: [[50, 60], [70, 60]],
    anchors: { head: { x: 60, y: 31, w: 34 }, eyes: { x: 60, y: 60, w: 20 }, neck: { x: 60, y: 92, w: 50 }, hand: { x: 97, y: 76, w: 0 } },
    adultDetail: 'uma crista maior',
    body: (c, adult) => (
      <>
        {adult ? (
          <path d="M47,34 Q44,10 56,22 Q60,2 67,20 Q78,8 75,34 Z" style={fill(c.detail)} />
        ) : (
          <path d="M52,32 Q53,14 61,26 Q66,12 70,32 Z" style={fill(c.color)} />
        )}
        <circle cx="60" cy="66" r="38" style={fill(c.color)} />
        <path d="M54,73 L66,73 L60,81 Z" style={fill(c.accent)} />
      </>
    ),
  },
  ourico: {
    kind: 'ourico',
    colors: { color: '#F43F5E', detail: '#C81E45', accent: '#FFB020' },
    name: 'Ouriço',
    homeState: 'pulado',
    eyes: [[50, 70], [70, 70]],
    anchors: { head: { x: 60, y: 30, w: 32 }, eyes: { x: 60, y: 70, w: 20 }, neck: { x: 60, y: 99, w: 44 }, hand: { x: 94, y: 86, w: 0 } },
    adultDetail: 'mais espinhos',
    body: (c, adult) => (
      <>
        {spikeAngles(adult ? 10 : 20).map((a) => (
          <path key={a} d="M52,40 L60,16 L68,40 Z" style={fill(c.detail)} transform={`rotate(${a} 60 68)`} />
        ))}
        <circle cx="60" cy="68" r="36" style={fill(c.color)} />
      </>
    ),
  },
  corujinha: {
    kind: 'corujinha',
    colors: { color: '#8B5CF6', detail: '#6D28D9', accent: '#FFB020' },
    name: 'Corujinha',
    homeState: 'descanso',
    eyes: [[45, 60], [75, 60]],
    anchors: { head: { x: 60, y: 35, w: 30 }, eyes: { x: 60, y: 60, w: 30 }, neck: { x: 60, y: 96, w: 50 }, hand: { x: 93, y: 84, w: 0 } },
    adultDetail: 'uma lua',
    body: (c, adult) => (
      <>
        {adult && <path d="M100,10 A11 11 0 0 0 100,32 A6.5 11 0 0 1 100,10 Z" fill="#FDE68A" transform="rotate(25 100 21)" />}
        <path d="M26,50 L30,20 L47,35 Q60,30 73,35 L90,20 L94,50 C98,82 84,104 60,104 C36,104 22,82 26,50 Z" style={fill(c.color)} />
        <circle cx="45" cy="60" r="13" fill="#FFFFFF" opacity=".22" />
        <circle cx="75" cy="60" r="13" fill="#FFFFFF" opacity=".22" />
        <path d="M57,70 L63,70 L60,76 Z" style={fill(c.accent)} />
      </>
    ),
  },
  coelho: {
    kind: 'coelho',
    colors: { color: '#DCCBFF', detail: '#FFC4E1', accent: '#F59BC4' },
    name: 'Coelho',
    homeState: 'neutro',
    eyes: [[48, 63], [72, 63]],
    anchors: { head: { x: 60, y: 40, w: 30 }, eyes: { x: 60, y: 63, w: 24 }, neck: { x: 60, y: 97, w: 52 }, hand: { x: 96, y: 86, w: 0 } },
    adultDetail: 'uma florzinha na orelha',
    body: (_c, adult) => <BunnyBody adult={adult} />,
    behind: () => <Stardust />,
    starEyes: true,
    idle: 'hop',
  },
}

export const PET_BY_STATE: Record<PetState, BasePetKind> = {
  neutro: 'gatinho',
  concluido: 'sapinho',
  foco: 'polvinho',
  atencao: 'pintinho',
  pulado: 'ourico',
  descanso: 'corujinha',
}

export const PET_ORDER: BasePetKind[] = ['sapinho', 'ourico', 'gatinho', 'pintinho', 'polvinho', 'corujinha']

/** O sétimo pet. Só aparece de verdade depois de desbloqueado. */
export const SECRET_PET: SecretPetKind = 'coelho'
export const ALL_PETS: PetKind[] = [...PET_ORDER, SECRET_PET]

/** Cada espécie com a cor do corpo e o estado "da casa". */
export const PETS = Object.fromEntries(
  ALL_PETS.map((k) => {
    const s = SPECIES[k]
    const st = STATE_STYLE[s.homeState]
    return [k, { kind: k, name: s.name, color: s.colors.color, label: st.label, title: st.title, description: st.description }]
  }),
) as Record<PetKind, { kind: PetKind; name: string; color: string; label: string; title: string; description: string }>

/**
 * Cor legível para TEXTO sobre o fundo escuro (o pet e a aura continuam com a cor viva):
 * o branco do neutro fica um pouco mais suave e o roxo do descanso (4.0:1) vira lilás (10:1).
 */
export const textColor = (c: string) => (c === '#F1F3F6' ? '#C9CED8' : c === '#8B5CF6' ? '#C4B5FD' : c)
