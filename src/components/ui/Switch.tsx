/** Interruptor acessível (role="switch"), com o rótulo e a explicação ligados a ele. */
export function Switch({ id, label, hint, checked, disabled, onChange }: { id: string; label: string; hint: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span id={`${id}-rotulo`} className="text-sm font-semibold text-soft">
          {label}
        </span>
        <span id={`${id}-dica`} className="text-[13px] text-muted">
          {hint}
        </span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-rotulo`}
        aria-describedby={`${id}-dica`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 shrink-0 rounded-full border transition-colors disabled:opacity-40 ${checked ? 'border-accent bg-accent' : 'border-line-strong bg-panel-2'}`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full transition-all ${checked ? 'left-[26px] bg-ink' : 'left-1 bg-muted'}`}
        />
      </button>
    </div>
  )
}

