import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Área com rolagem interna que não empurra o resto da tela: ocupa o espaço que sobra no painel
 * (o conteúdo fica num bloco absoluto, então não aumenta a altura do painel) e mostra uma leve
 * sombra em degradê no fim enquanto ainda há o que rolar.
 * `minHeight` vale quando o painel não tem vizinhos para definir a altura (ex.: uma coluna no celular).
 */
export function ScrollFade({ children, minHeight = 200, label }: { children: ReactNode; minHeight?: number; label?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [more, setMore] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 4)
    check()
    el.addEventListener('scroll', check, { passive: true })
    const ro = new ResizeObserver(check)
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)
    return () => {
      el.removeEventListener('scroll', check)
      ro.disconnect()
    }
  }, [])

  return (
    <div className="relative min-h-0 flex-1" style={{ minHeight }}>
      <div
        ref={ref}
        // Rolável pelo teclado quando passa do tamanho.
        tabIndex={more ? 0 : -1}
        role={label ? 'region' : undefined}
        aria-label={label}
        className="absolute inset-0 overflow-y-auto overscroll-contain rounded-[10px] [scrollbar-width:thin] focus-visible:outline-2 focus-visible:outline-accent"
      >
        {children}
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-10 rounded-b-[10px] transition-opacity duration-300"
        style={{ opacity: more ? 1 : 0, background: 'linear-gradient(to bottom, transparent, var(--color-panel))' }}
      />
    </div>
  )
}
