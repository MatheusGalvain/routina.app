import { useEffect, useRef } from 'react'
import { useRotina } from './useRotina'
import { useDevOverrides } from './useDevOverrides'
import { usePetEvents } from './usePetEvents'
import { useStats } from './useCompanion'
import { hasDev } from '../lib/devData'
import { EMPTY_LAYOUTS, validLayout } from '../lib/corner'
import { missingItems, type SceneId } from '../data/scenes'
import type { CornerLayout } from '../types'

/**
 * Cenário, itens e montagem do cantinho que a tela mostra.
 * Com qualquer simulação do painel dev ligada (troféus, itens, cenário ou montagem),
 * tudo é lido de lá e as edições vão para lá: nada chega ao store real nem ao Supabase.
 */
const simulatingNow = () => {
  const d = useDevOverrides.getState()
  return !!(d.trophies || d.layouts || d.sceneItems || d.scene)
}

export function useCornerView() {
  // Um seletor por campo (um objeto novo a cada leitura faria o Zustand renderizar sem parar).
  const real = {
    scene: useRotina((s) => s.scene),
    items: useRotina((s) => s.sceneItems),
    layouts: useRotina((s) => s.cornerLayouts),
    trophies: useRotina((s) => s.trophies),
  }
  const dev = {
    scene: useDevOverrides((s) => s.scene),
    items: useDevOverrides((s) => s.sceneItems),
    layouts: useDevOverrides((s) => s.layouts),
    trophies: useDevOverrides((s) => s.trophies),
  }
  const scene = dev.scene ?? real.scene
  const items = dev.items ?? real.items
  const trophies = dev.trophies ?? real.trophies
  const layouts = dev.layouts ?? real.layouts
  const layoutOf = (id: SceneId) => validLayout(layouts[id] ?? EMPTY_LAYOUTS[id], id, trophies, items)
  return { scene, items, trophies, layout: layoutOf(scene), layoutOf, simulated: !!(dev.scene || dev.items || dev.layouts || dev.trophies) }
}

/** Montagem atual de um cenário, fora de componentes. */
export function currentLayout(scene: SceneId = currentScene()): CornerLayout {
  const d = useDevOverrides.getState()
  const r = useRotina.getState()
  const layouts = d.layouts ?? r.cornerLayouts
  return validLayout(layouts[scene] ?? EMPTY_LAYOUTS[scene], scene, d.trophies ?? r.trophies, d.sceneItems ?? r.sceneItems)
}

export const currentScene = (): SceneId => useDevOverrides.getState().scene ?? useRotina.getState().scene

/** Grava a montagem de um cenário (no painel dev, se ele estiver simulando). */
export function writeLayout(next: CornerLayout, scene: SceneId = currentScene()) {
  if (simulatingNow()) {
    const d = useDevOverrides.getState()
    d.set({ layouts: { ...(d.layouts ?? useRotina.getState().cornerLayouts), [scene]: next } })
  } else useRotina.getState().setCornerLayout(scene, next)
}

/** Troca o cenário (no painel dev, se ele estiver simulando). */
export function chooseScene(scene: SceneId) {
  if (simulatingNow()) useDevOverrides.getState().set({ scene })
  else useRotina.getState().setScene(scene)
}

/**
 * Libera os itens de cenário conquistados (montado uma vez, no App), como os troféus:
 * na primeira conta da sessão (logo depois de entrar) libera em silêncio o que já era merecido;
 * depois, cada item novo vira um aviso. Com dias simulados, não libera nada de verdade.
 */
export function useSceneItemProgress() {
  const stats = useStats()
  const logs = useRotina((s) => s.logs)
  const primed = useRef(false)

  useEffect(() => {
    if (hasDev(logs)) return
    const { sceneItems, addSceneItems } = useRotina.getState()
    const fresh = missingItems(sceneItems, stats)
    const first = !primed.current
    primed.current = true
    if (!fresh.length) return
    addSceneItems(fresh, new Date().toISOString())
    if (first) return
    const { push } = usePetEvents.getState()
    for (const item of fresh) push({ type: 'item', item })
  }, [stats, logs])
}
