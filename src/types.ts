import type { TrophyId, TrophyTier } from './data/trophies'
import type { SceneId, SceneItemId } from './data/scenes'

export type BlockType = 'habito' | 'contador' | 'tarefa'

/** Id de uma área da vida: a chave original nas 8 padrão ("sono"…), um uuid nas criadas pela pessoa. */
export type AreaId = string

/** As 8 áreas com que toda conta começa. A chave nunca muda, mesmo se a pessoa renomear a área. */
export type DefaultAreaKey = 'sono' | 'corpo' | 'foco' | 'casa' | 'financas' | 'estudo' | 'mente' | 'social'

/** Uma área da vida da pessoa (renomeável, recolorível e reordenável). */
export interface Area {
  id: AreaId
  name: string
  color: string
  icon?: string
  /** Ordem na lista (0 = primeira). */
  position: number
  /** Uma das 8 padrão (o id é a chave original). */
  isDefault: boolean
}

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

/**
 * Modelo de rotina criado pela pessoa. É só uma receita: usar o modelo cria uma rotina nova
 * e independente (mudar o modelo depois não mexe nas rotinas já criadas).
 * Os blocos têm id só para editar e reordenar; a rotina criada ganha ids novos.
 */
export interface UserTemplate {
  id: string
  name: string
  color: string
  days: number[]
  blocks: Block[]
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

export type BaseAccessoryId = 'chapeu-mago' | 'coroa' | 'fones' | 'oculos' | 'cachecol' | 'tiara-lua' | 'cartinha' | 'laco'

/** Acessórios de evento sazonal (src/data/events.ts): sempre com o prefixo "evt-". */
export type EventAccessoryId = `evt-${string}`

export type AccessoryId = BaseAccessoryId | EventAccessoryId

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

/** Item de cenário desbloqueado e quando. */
export interface SceneItemUnlock {
  unlockedAt: string
}

/**
 * Itens de evento sazonal conquistados: id do evento → id do item (acessório ou troféu) → data ISO.
 * Ficam para sempre, mesmo depois que o evento acaba.
 */
export type EventItemMap = Record<string, Record<string, string>>

/** Itens de cenário desbloqueados: id → data (nunca são perdidos). */
export type SceneItemMap = Partial<Record<SceneItemId, SceneItemUnlock>>

/**
 * O que ocupa um espaço do cantinho: um troféu (num nível, pode ser menor que o maior conquistado)
 * ou um item do cenário.
 */
export type Placed = { kind: 'trophy'; id: TrophyId; tier: TrophyTier } | { kind: 'item'; id: SceneItemId }

/** Os 4 espaços do chão do cantinho: 2 à esquerda e 2 à direita do pet. */
export type CornerLayout = [Placed | null, Placed | null, Placed | null, Placed | null]

/** Cada cenário guarda a própria montagem. */
export type CornerLayouts = Record<SceneId, CornerLayout>

/** O pet favorito (companheiro). */
/** Aparência escolhida: uma fase já conquistada, ou 'auto' (segue a fase conquistada). */
export type PetAppearance = 'auto' | PetPhase

export interface Companion {
  kind: PetKind | null
  name: string
  equipped: Partial<Record<Slot, AccessoryId>>
  /** Aparência escolhida (a fase conquistada continua em petProgress e nunca regride). */
  appearance: PetAppearance
  /** Mostrar o detalhe de adulto da espécie (depois de conquistar a fase adulto), em qualquer aparência. */
  showAdultDetail: boolean
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
