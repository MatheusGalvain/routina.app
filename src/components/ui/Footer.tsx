import { Logo } from './ui'

/** Rodapé escuro e fosco: marca, direitos autorais e política de privacidade. */
export function Footer({ onPrivacy }: { onPrivacy: () => void }) {
  const year = new Date().getFullYear()
  return (
    <footer className="relative mt-auto w-full border-t border-white/[0.06] bg-[#06080C]/85 backdrop-blur-xl">
      {/* Brilho sutil na borda de cima */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#5AA7FF]/40 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#5AA7FF]/[0.04] to-transparent" />

      <div className="relative mx-auto flex max-w-[1320px] flex-col gap-6 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <div className="origin-left scale-[0.6]" style={{ margin: '-14px -22px -14px 0' }}>
              <Logo size={40} />
            </div>
            <div className="flex flex-col">
              <span className="text-lg leading-none font-extrabold tracking-tight">
                rotina<span className="text-[#5AA7FF]">.app</span>
              </span>
              <span className="mt-1 text-[13px] text-muted">Organize o seu dia, um bloco de cada vez.</span>
            </div>
          </div>

          <nav aria-label="Links do rodapé" className="flex flex-wrap items-center gap-1">
            <button type="button" onClick={onPrivacy} className="rounded-full px-3.5 py-2 text-sm font-semibold text-soft transition-colors hover:bg-white/[0.05] hover:text-white">
              Política de privacidade
            </button>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="rounded-full px-3.5 py-2 text-sm font-semibold text-muted transition-colors hover:bg-white/[0.05] hover:text-soft"
            >
              Voltar ao topo
            </button>
          </nav>
        </div>

        <div className="h-px w-full bg-white/[0.06]" aria-hidden="true" />

        <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-[#8A93A6]">
          <p className="m-0">
            © {year} Matheus Galvain. Todos os direitos reservados.
          </p>
          <p className="m-0 font-mono text-[11.5px] tracking-wide">Feito com cuidado (e alguns pets) no Brasil.</p>
        </div>
      </div>
    </footer>
  )
}
