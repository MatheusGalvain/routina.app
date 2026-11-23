import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useCornerEdit } from '../../store/useCornerEdit'
import { useCornerView, writeLayout } from '../../store/useCorner'
import { TIERS, TROPHIES, Trophy } from '../../data/trophies'
import { SCENE_BY_ID, SceneItem, itemsOf } from '../../data/scenes'
import { clearSlot, place, sameThing, tiersOf } from '../../lib/corner'
import { Icon } from '../ui/ui'

const SIDE = ['1º à esquerda', '2º à esquerda', '1º à direita', '2º à direita']

type Tab = 'trofeus' | 'itens'

/**
 * Gaveta (de baixo para cima) para escolher o que vai num espaço: um troféu (de qualquer cenário)
 * ou um item do cenário atual. Uma mesma coisa fica em um espaço só: escolher o que já está exposto
 * troca os dois de lugar.
 */
export function CornerDrawer() {
  const slot = useCornerEdit((s) => s.slot)
  const set = useCornerEdit((s) => s.set)
  const { trophies, items, layout, scene } = useCornerView()
  const [tab, setTab] = useState<Tab>('trofeus')
  const close = () => set({ slot: null })

  useEffect(() => {
    if (slot === null) return
    // Abre na aba do que já está no espaço.
    setTab(layout[slot]?.kind === 'item' ? 'itens' : 'trofeus')
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [slot])

  const owned = TROPHIES.filter((t) => tiersOf(trophies, t.id).length > 0)
  const sceneItems = itemsOf(scene)
  const current = slot !== null ? layout[slot] : null
  const elsewhere = (p: Parameters<typeof sameThing>[0]) => {
    const at = layout.findIndex((s) => sameThing(s, p))
    return at >= 0 && at !== slot
  }
  const choose = (p: NonNullable<typeof current>) => {
    if (slot === null) return
    writeLayout(place(layout, slot, p))
    close()
  }

  const tabCls = (on: boolean) => `min-h-10 flex-1 rounded-full px-3 text-[13px] font-semibold ${on ? 'bg-accent text-ink' : 'text-muted hover:text-soft'}`

  return (
    <AnimatePresence>
      {slot !== null && (
        <motion.div className="fixed inset-0 z-[75] flex items-end justify-center bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-title"
            className="flex max-h-[78vh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-[24px] border border-b-0 border-line bg-panel"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-line-2" aria-hidden="true" />
            <header className="flex items-center justify-between gap-3 px-5 pt-3 pb-2">
              <div>
                <p className="m-0 font-mono text-[11px] tracking-wider text-muted uppercase">Espaço {SIDE[slot]}</p>
                <h2 id="drawer-title" className="m-0 text-lg font-bold">
                  O que vai aqui?
                </h2>
              </div>
              <button type="button" onClick={close} aria-label="Fechar" className="grid h-11 w-11 place-items-center rounded-full text-muted hover:bg-panel-2 hover:text-soft">
                <Icon name="x" />
              </button>
            </header>

            <div role="tablist" aria-label="Tipo" className="mx-5 mb-3 flex gap-1 rounded-full border border-line bg-ink p-1">
              <button type="button" role="tab" id="aba-trofeus" aria-selected={tab === 'trofeus'} aria-controls="painel-gaveta" onClick={() => setTab('trofeus')} className={tabCls(tab === 'trofeus')}>
                Troféus
              </button>
              <button type="button" role="tab" id="aba-itens" aria-selected={tab === 'itens'} aria-controls="painel-gaveta" onClick={() => setTab('itens')} className={tabCls(tab === 'itens')}>
                Itens deste cenário
              </button>
            </div>

            <div id="painel-gaveta" role="tabpanel" aria-labelledby={tab === 'trofeus' ? 'aba-trofeus' : 'aba-itens'} className="flex flex-col gap-3 overflow-y-auto px-5 pb-5">
              {tab === 'trofeus' ? (
                <>
                  {owned.length === 0 && <p className="m-0 rounded-2xl bg-panel-2 px-4 py-3 text-sm text-soft">Você ainda não tem troféus. Eles aparecem na Coleção, na aba Pet.</p>}
                  {owned.map((t) => (
                    <section key={t.id} className="flex flex-col gap-2">
                      <h3 className="m-0 flex flex-wrap items-baseline gap-x-2 text-sm font-semibold">
                        {t.name}
                        {elsewhere({ kind: 'trophy', id: t.id, tier: 1 }) && <span className="text-[12px] font-normal text-muted">(exposto em outro espaço: troca de lugar)</span>}
                      </h3>
                      <div className="grid grid-cols-4 gap-2">
                        {tiersOf(trophies, t.id).map((tier) => {
                          const on = current?.kind === 'trophy' && current.id === t.id && current.tier === tier
                          return (
                            <button
                              key={tier}
                              type="button"
                              aria-pressed={on}
                              aria-label={`${t.name} de ${TIERS[tier].name}`}
                              onClick={() => choose({ kind: 'trophy', id: t.id, tier })}
                              className="flex min-h-[76px] flex-col items-center justify-end gap-1 rounded-xl border bg-panel-2 px-1 pt-2 pb-1.5"
                              style={{ borderColor: on ? TIERS[tier].color : 'var(--color-line)' }}
                            >
                              <Trophy id={t.id} tier={tier} size={40} />
                              <span className="text-[11px] text-soft capitalize">{TIERS[tier].name}</span>
                            </button>
                          )
                        })}
                      </div>
                    </section>
                  ))}
                </>
              ) : (
                <>
                  <p className="m-0 text-[13px] text-muted">Itens de {SCENE_BY_ID[scene].name}. Os bloqueados aparecem na Coleção, com quanto falta.</p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {sceneItems.map((it) => {
                      const id = it.id as Parameters<typeof SceneItem>[0]['id']
                      const unlocked = !!items[id]
                      const on = current?.kind === 'item' && current.id === id
                      return (
                        <button
                          key={id}
                          type="button"
                          disabled={!unlocked}
                          aria-pressed={on}
                          aria-label={unlocked ? `${it.name}${elsewhere({ kind: 'item', id }) ? ' (exposto em outro espaço: troca de lugar)' : ''}` : `${it.name}: bloqueado`}
                          onClick={() => choose({ kind: 'item', id })}
                          className={`flex min-h-[92px] flex-col items-center justify-end gap-1 rounded-xl border-2 bg-panel-2 px-1 pt-2 pb-1.5 disabled:cursor-not-allowed ${on ? 'border-accent' : 'border-line'}`}
                        >
                          <SceneItem id={id} size={44} silhouette={!unlocked} />
                          <span className={`text-[11.5px] leading-tight ${unlocked ? 'text-soft' : 'text-muted'}`}>{unlocked ? it.name : 'Bloqueado'}</span>
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
              {current && (
                <button
                  type="button"
                  onClick={() => {
                    writeLayout(clearSlot(layout, slot))
                    close()
                  }}
                  className="mt-1 min-h-11 rounded-full border border-line px-4 text-sm font-semibold text-soft hover:bg-panel-2"
                >
                  Esvaziar espaço
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
