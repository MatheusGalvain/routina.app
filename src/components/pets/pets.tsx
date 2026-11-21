import type { ReactNode } from 'react'
import type { PetKind, PetState } from '../../types'

export type EyeStyle = 'open' | 'happy' | 'closed' | 'angry' | 'squint'

export interface PetDef {
  kind: PetKind
  name: string
  color: string
  glow: string
  /** Rótulo no estilo "AZUL / FOCO". */
  label: string
  title: string
  description: string
  eyeStyle: EyeStyle
  /** Centro de cada olho no viewBox 0 0 120 120. */
  eyes: [number, number][]
  body: ReactNode
}

const spikes = [-80, -60, -40, -20, 0, 20, 40, 60, 80]

export const PETS: Record<PetKind, PetDef> = {
  gatinho: {
    kind: 'gatinho',
    name: 'Gatinho',
    color: '#F1F3F6',
    glow: 'rgba(241,243,246,.35)',
    label: 'Branco / Guia',
    title: 'Pronto para começar',
    description: 'Te apresenta o próximo bloco e espera você dar o play.',
    eyeStyle: 'open',
    eyes: [[49, 58], [71, 58]],
    body: (
      <>
        <path d="M22,56 L24,18 L46,36 Q60,32 74,36 L96,18 L98,56 C100,84 82,102 60,102 C38,102 20,84 22,56 Z" fill="#F1F3F6" />
        <path d="M30,30 L32,44 L41,38 Z M90,30 L88,44 L79,38 Z" fill="#F9C6D0" opacity=".75" />
        <path d="M57,74 L63,74 L60,78 Z" fill="#F59AB0" />
      </>
    ),
  },
  sapinho: {
    kind: 'sapinho',
    name: 'Sapinho',
    color: '#22C55E',
    glow: 'rgba(34,197,94,.45)',
    label: 'Verde / Concluído',
    title: 'Bloco concluído',
    description: 'Comemora cada hábito feito e cada meta batida.',
    eyeStyle: 'happy',
    eyes: [[38, 43], [82, 43]],
    body: (
      <>
        <circle cx="38" cy="42" r="15" fill="#22C55E" />
        <circle cx="82" cy="42" r="15" fill="#22C55E" />
        <ellipse cx="60" cy="72" rx="44" ry="32" fill="#22C55E" />
        <path d="M50,80 Q60,89 70,80" fill="none" stroke="#0A0D14" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="34" cy="76" r="5" fill="#FF8FA3" opacity=".55" />
        <circle cx="86" cy="76" r="5" fill="#FF8FA3" opacity=".55" />
      </>
    ),
  },
  polvinho: {
    kind: 'polvinho',
    name: 'Polvinho',
    color: '#1E88FF',
    glow: 'rgba(30,136,255,.5)',
    label: 'Azul / Foco',
    title: 'Bloco em andamento',
    description: 'Acompanha o bloco ativo e mostra o que muda no painel do dia.',
    eyeStyle: 'open',
    eyes: [[50, 54], [70, 54]],
    body: (
      <path
        d="M22,62 C22,34 40,18 60,18 C80,18 98,34 98,62 C98,72 94,78 90,80 Q86,96 80,88 Q74,102 66,90 Q60,104 54,90 Q46,102 40,88 Q34,96 30,80 C26,78 22,72 22,62 Z"
        fill="#1E88FF"
      />
    ),
  },
  pintinho: {
    kind: 'pintinho',
    name: 'Pintinho',
    color: '#FFB020',
    glow: 'rgba(255,176,32,.45)',
    label: 'Amarelo / Atenção',
    title: 'Atenção ao aviso',
    description: 'Avisa quando falta pouco para a meta ou o dia está apertando.',
    eyeStyle: 'squint',
    eyes: [[50, 60], [70, 60]],
    body: (
      <>
        <path d="M52,32 Q53,14 61,26 Q66,12 70,32 Z" fill="#FFB020" />
        <circle cx="60" cy="66" r="38" fill="#FFB020" />
        <path d="M54,73 L66,73 L60,81 Z" fill="#E07B00" />
      </>
    ),
  },
  ourico: {
    kind: 'ourico',
    name: 'Ouriço',
    color: '#F43F5E',
    glow: 'rgba(244,63,94,.45)',
    label: 'Vermelho / Pulado',
    title: 'Bloco pulado',
    description: 'Fica bravinho quando um bloco é pulado, mas não guarda rancor.',
    eyeStyle: 'angry',
    eyes: [[50, 70], [70, 70]],
    body: (
      <>
        {spikes.map((a) => (
          <path key={a} d="M52,40 L60,16 L68,40 Z" fill="#F43F5E" transform={`rotate(${a} 60 68)`} />
        ))}
        <circle cx="60" cy="68" r="36" fill="#F43F5E" />
      </>
    ),
  },
  corujinha: {
    kind: 'corujinha',
    name: 'Corujinha',
    color: '#8B5CF6',
    glow: 'rgba(139,92,246,.5)',
    label: 'Roxo / Descanso',
    title: 'Dia encerrado',
    description: 'Aparece quando tudo foi feito e é hora de desacelerar.',
    eyeStyle: 'closed',
    eyes: [[45, 60], [75, 60]],
    body: (
      <>
        <path d="M26,50 L30,20 L47,35 Q60,30 73,35 L90,20 L94,50 C98,82 84,104 60,104 C36,104 22,82 26,50 Z" fill="#8B5CF6" />
        <circle cx="45" cy="60" r="13" fill="#C4B5FD" opacity=".45" />
        <circle cx="75" cy="60" r="13" fill="#C4B5FD" opacity=".45" />
        <path d="M57,70 L63,70 L60,76 Z" fill="#FFB020" />
      </>
    ),
  },
}

export const PET_BY_STATE: Record<PetState, PetKind> = {
  neutro: 'gatinho',
  concluido: 'sapinho',
  foco: 'polvinho',
  atencao: 'pintinho',
  pulado: 'ourico',
  descanso: 'corujinha',
}

export const PET_ORDER: PetKind[] = ['sapinho', 'ourico', 'gatinho', 'pintinho', 'polvinho', 'corujinha']
