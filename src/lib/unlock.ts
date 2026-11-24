/**
 * Regra do coelho de cristal (pet secreto). Funções puras, testadas em unlock.test.ts (`npm test`).
 *
 * Ele chega por QUALQUER um destes caminhos:
 *  - 'dias':  30 dias ativos no total (não precisam ser seguidos);
 *  - 'areas': 7 dias seguidos em que todas as áreas da vida atuais tiveram pelo menos um bloco
 *             concluído, desde que a pessoa tenha no mínimo 5 áreas;
 *  - 'lua':   tocar na silhueta que passa pelo céu numa noite de lua cheia (ver MoonBunnyPass).
 *
 * Só contam registros reais: tudo que o painel dev simula (`dev: true`) fica de fora.
 */
import type { AreaId } from '../types'
import { activeDays, allAreasInAWeek, bestAreasWindow, type Logs } from './stats'
import { clearDev } from './devData'
import { dayKey } from './dates'

/** Dias ativos (no total) que trazem o coelho de cristal. */
export const SECRET_DAYS = 30
/** Mínimo de áreas da vida para valer o caminho da semana com todas as áreas. */
export const SECRET_MIN_AREAS = 5

/** Por onde a pessoa desbloqueou (fica no Supabase, não aparece na interface). */
export type SecretPath = 'dias' | 'areas' | 'lua'

const uniqueAreas = (areaIds: AreaId[]) => [...new Set(areaIds.filter(Boolean))]

/**
 * Por qual caminho automático a pessoa merece o coelho de cristal hoje (`null` = ainda não).
 * O caminho da lua não depende dos registros, então nunca sai daqui.
 */
export function secretUnlockPath(logs: Logs, areaIds: AreaId[], today = dayKey()): Exclude<SecretPath, 'lua'> | null {
  const real = clearDev(logs)
  const days = activeDays(real, today)
  if (days >= SECRET_DAYS) return 'dias'
  const areas = uniqueAreas(areaIds)
  if (areas.length >= SECRET_MIN_AREAS && allAreasInAWeek(real, areas, today, SECRET_MIN_AREAS)) return 'areas'
  return null
}

/** Merece o coelho de cristal pelos registros reais? */
export const deservesSecret = (logs: Logs, areaIds: AreaId[], today = dayKey()) => secretUnlockPath(logs, areaIds, today) !== null

/** Quanto falta (para a dica da galeria). Só registros reais. */
export function secretProgress(logs: Logs, areaIds: AreaId[], today = dayKey()) {
  const real = clearDev(logs)
  const areas = uniqueAreas(areaIds)
  return {
    days: Math.min(SECRET_DAYS, activeDays(real, today)),
    areasTotal: areas.length,
    /** Mais áreas cobertas numa mesma janela de 7 dias. */
    bestAreas: bestAreasWindow(real, areas, today),
    enoughAreas: areas.length >= SECRET_MIN_AREAS,
  }
}
