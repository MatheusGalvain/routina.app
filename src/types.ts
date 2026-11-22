import type { TrophyId, TrophyTier } from './data/trophies'

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
  /** Criada pelo painel de desenvolvimento. */
  dev?: true
}

/** O que aconteceu com um bloco em um dia. */
export interface BlockLog {
  done?: boolean
  skipped?: boolean
  value?: number
  /** Área e tipo do bloco no momento do registro (sobrevivem se o bloco for apagado). */
  areaId?: AreaId
  type?: BlockType
  /** Registro gerado pelo painel de desenvolvimento. */
  dev?: true
}

/** O essencial de uma rotina para exibir um item (nome e cor congelados no histórico). */
export type RoutineRef = Pick<Routine, 'id' | 'name' | 'color'>

/** Um bloco como estava planejado naquele dia — sobrevive a edições/remoções da rotina. */
export interface PlanEntry {
  block: Block
  routine: RoutineRef
}

export interface DayLog {
  blocks: Record<string, BlockLog>
  note?: string
  /** Lista do dia congelada (atualizada enquanto o dia é "hoje"). */
  plan?: PlanEntry[]
  /** Dia gerado pelo painel de desenvolvimento. */
  dev?: true
  /** Dia real que a simulação substituiu (volta ao limpar os dados simulados). */
  real?: DayLog
}

export interface TodayItem {
  block: Block
  routine: RoutineRef
  log: BlockLog
  done: boolean
  skipped: boolean
}

/** Os seis pets de sempre (cada um tem um estado "da casa" e uma historinha). */
export type BasePetKind = 'gatinho' | 'sapinho' | 'polvinho' | 'pintinho' | 'ourico' | 'corujinha'

/** O coelho aparece só depois de desbloqueado (a interface nunca anuncia isso). */
export type SecretPetKind = 'coelho'

export type PetKind = BasePetKind | SecretPetKind

export type PetState = 'neutro' | 'foco' | 'concluido' | 'atencao' | 'pulado' | 'descanso'

export type PetPhase = 'filhote' | 'jovem' | 'adulto'

export type Slot = 'cabeca' | 'rosto' | 'pescoco' | 'mao'

export type AccessoryId = 'chapeu-mago' | 'coroa' | 'fones' | 'oculos' | 'cachecol' | 'tiara-lua' | 'cartinha' | 'laco'

/** Pets desbloqueáveis ficam na mesma lista dos acessórios, com o prefixo "pet:". */
export type PetUnlockId = `pet:${SecretPetKind}`
export type UnlockId = AccessoryId | PetUnlockId

/** Um nível de troféu conquistado e quando. */
export interface TrophyUnlock {
  tier: TrophyTier
  /** Data e hora (ISO) do desbloqueio. */
  unlockedAt: string
}

/** Troféus conquistados: id → níveis desbloqueados (nunca são perdidos). */
export type TrophyMap = Partial<Record<TrophyId, TrophyUnlock[]>>

/** Um troféu exposto num espaço do cantinho (pode ser um nível menor que o maior conquistado). */
export interface CornerSlot {
  trophyId: TrophyId
  tier: TrophyTier
}

/** Os 4 espaços do chão do cantinho: 2 à esquerda e 2 à direita do pet. */
export type CornerSlots = [CornerSlot | null, CornerSlot | null, CornerSlot | null, CornerSlot | null]

/** O pet favorito (companheiro). */
export interface Companion {
  kind: PetKind | null
  name: string
  equipped: Partial<Record<Slot, AccessoryId>>
}

/** Progresso do companheiro que nunca regride. */
export interface PetProgress {
  /** Já fez o primeiro cálculo (evita comemorar tudo de uma vez na primeira abertura). */
  initialized: boolean
  /** Maior número de dias ativos já alcançado. */
  peakActiveDays: number
  /** Última fase já comemorada. */
  seenPhase: PetPhase
  /** Acessórios e pets desbloqueados (ficam para sempre). */
  unlocked: UnlockId[]
}
