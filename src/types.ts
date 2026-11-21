export type BlockType = 'habito' | 'contador' | 'tarefa'

export type AreaId = 'sono' | 'corpo' | 'foco' | 'casa' | 'financas' | 'estudo' | 'mente' | 'social'

/** Um item planejado dentro de uma rotina. A ordem na lista é a ordem do dia (horário flexível). */
export interface Block {
  id: string
  name: string
  type: BlockType
  areaId: AreaId
  /** Duração estimada, opcional. */
  minutes?: number
  /** Só para contador: meta, unidade e passo de cada clique. */
  target?: number
  unit?: string
  step?: number
}

export interface Routine {
  id: string
  name: string
  color: string
  /** Dias da semana em que a rotina aparece (0 = domingo … 6 = sábado). */
  days: number[]
  blocks: Block[]
}

/** O que aconteceu com um bloco em um dia. */
export interface BlockLog {
  done?: boolean
  skipped?: boolean
  value?: number
}

export interface DayLog {
  blocks: Record<string, BlockLog>
  note?: string
}

export interface TodayItem {
  block: Block
  routine: Routine
  log: BlockLog
  done: boolean
  skipped: boolean
}

export type PetKind = 'gatinho' | 'sapinho' | 'polvinho' | 'pintinho' | 'ourico' | 'corujinha'

export type PetState = 'neutro' | 'foco' | 'concluido' | 'atencao' | 'pulado' | 'descanso'
