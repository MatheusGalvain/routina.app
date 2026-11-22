import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { useCornerEdit } from '../../store/useCornerEdit'
import { useTrophyView, writeSlots } from '../../store/useTrophies'
import { TIERS, TROPHIES, Trophy } from '../../data/trophies'
import { clearSlot, placeTrophy, tiersOf } from '../../lib/corner'
import { Icon } from '../ui/ui'

const SIDE = ['1º à esquerda', '2º à esquerda', '1º à direita', '2º à direita']

/**
 * Gaveta (de baixo para cima) para escolher o troféu e o nível de um espaço.
 * Um troféu fica em um espaço só: escolher um que já está exposto troca os dois de lugar.
 */
export function CornerDrawer() {
  const slot = useCornerEdit((s) => s.slot)
  const set = useCornerEdit((s) => s.set)
  const { trophies, slots } = useTrophyView()
  const close = () => set({ slot: null })

  useEffect(() => {
    if (slot === null) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [slot])

  const owned = TROPHIES.filter((t) => tiersOf(trophies, t.id).length > 0)
  const current = slot !== null ? slots[slot] : null

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
            <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-[#2A3242]" aria-hidden="true" />
            <header className="flex items-center justify-between gap-3 px-5 pt-3 pb-2">
              <div>
                <p className="m-0 font-mono text-[11px] tracking-wider text-muted uppercase">Espaço {SIDE[slot]}</p>
                <h2 id="drawer-title" className="m-0 text-lg font-bold">
                  Escolha um troféu
                </h2>
              </div>
              <button type="button" onClick={close} aria-label="Fechar" className="grid h-11 w-11 place-items-center rounded-full text-muted hover:bg-panel-2 hover:text-soft">
                <Icon name="x" />
              </button>
            </header>

            <div className="flex flex-col gap-3 overflow-y-auto px-5 pb-5">
              {owned.length === 0 && <p className="m-0 rounded-2xl bg-panel-2 px-4 py-3 text-sm text-soft">Você ainda não tem troféus. Eles aparecem na Coleção, na aba Pet.</p>}
              {owned.map((t) => {
                const exposedAt = slots.findIndex((s) => s?.trophyId === t.id)
                return (
                  <section key={t.id} className="flex flex-col gap-2">
                    <h3 className="m-0 flex items-baseline gap-2 text-sm font-semibold">
                      {t.name}
                      {exposedAt >= 0 && exposedAt !== slot && <span className="text-[12px] font-normal text-muted">(exposto em outro espaço: troca de lugar)</span>}
                    </h3>
                    <div className="grid grid-cols-4 gap-2">
                      {tiersOf(trophies, t.id).map((tier) => {
                        const on = current?.trophyId === t.id && current.tier === tier
                        return (
                          <button
                            key={tier}
                            type="button"
                            aria-pressed={on}
                            aria-label={`${t.name} de ${TIERS[tier].name}`}
                            onClick={() => {
                              writeSlots(placeTrophy(slots, slot, t.id, tier))
                              close()
                            }}
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
                )
              })}
              {current && (
                <button
                  type="button"
                  onClick={() => {
                    writeSlots(clearSlot(slots, slot))
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
