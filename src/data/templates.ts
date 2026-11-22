import type { Block, Routine } from '../types'

export type Template = Omit<Routine, 'id' | 'blocks'> & {
  key: string
  description: string
  blocks: Omit<Block, 'id'>[]
}

const ALL = [0, 1, 2, 3, 4, 5, 6]
const WEEK = [1, 2, 3, 4, 5]

export const TEMPLATES: Template[] = [
  {
    key: 'manha',
    name: 'Rotina da manhã',
    description: 'Água, cama arrumada, alongamento e o plano do dia',
    color: '#FFD59E',
    days: ALL,
    blocks: [
      { name: 'Beber água', type: 'contador', areaId: 'corpo', target: 8, unit: 'copos', step: 1 },
      { name: 'Arrumar a cama', type: 'habito', areaId: 'casa', minutes: 3 },
      { name: 'Alongar', type: 'habito', areaId: 'corpo', minutes: 10 },
      { name: 'Planejar o dia', type: 'habito', areaId: 'mente', minutes: 5 },
    ],
  },
  {
    key: 'home-office',
    name: 'Dia de home office',
    description: 'Blocos de foco, pausas e fechamento do dia',
    color: '#A9BFFF',
    days: WEEK,
    blocks: [
      { name: 'Foco profundo', type: 'contador', areaId: 'foco', target: 4, unit: 'pomodoros', step: 1, minutes: 100 },
      { name: 'Pausa longe da tela', type: 'habito', areaId: 'mente', minutes: 15 },
      { name: 'Responder mensagens', type: 'habito', areaId: 'foco', minutes: 20 },
      { name: 'Fechar o dia e anotar pendências', type: 'habito', areaId: 'foco', minutes: 10 },
    ],
  },
  {
    key: 'noite',
    name: 'Noite tranquila',
    description: 'Desligar telas, preparar o amanhã e dormir no horário',
    color: '#CDB8FF',
    days: ALL,
    blocks: [
      { name: 'Anotar gastos do dia', type: 'habito', areaId: 'financas', minutes: 5 },
      { name: 'Ler', type: 'contador', areaId: 'estudo', target: 10, unit: 'páginas', step: 5 },
      { name: 'Desligar telas', type: 'habito', areaId: 'sono' },
      { name: 'Dormir', type: 'habito', areaId: 'sono' },
    ],
  },
]
