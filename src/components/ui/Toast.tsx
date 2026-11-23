import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { create } from 'zustand'
import { Icon } from './ui'

/** Aviso curto que sobrevive à troca de página (ex.: "Rotina salva" ao voltar para /rotinas). */
export const useToast = create<{ toast: { id: number; text: string } | null; show: (text: string) => void; hide: () => void }>()((set) => ({
  toast: null,
  show: (text) => set({ toast: { id: Date.now(), text } }),
  hide: () => set({ toast: null }),
}))

export const showToast = (text: string) => useToast.getState().show(text)

export function Toaster() {
  const toast = useToast((s) => s.toast)
  const hide = useToast((s) => s.hide)

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(hide, 3000)
    return () => window.clearTimeout(t)
  }, [toast?.id])

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-4 z-[95] flex justify-center px-4">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            role="status"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-ok/30 bg-panel-2 py-2.5 pr-4 pl-3 text-sm font-semibold text-fg shadow-[0_10px_30px_rgba(0,0,0,.45)]"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-ok text-ink" aria-hidden="true">
              <Icon name="check" size={14} />
            </span>
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
