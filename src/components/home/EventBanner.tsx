import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useActiveEvents } from '../../store/useEvents'
import { eventLabel } from '../../data/events'
import { APP_KEY } from '../../lib/storageKeys'
import { Icon } from '../ui/ui'

/** Faixas fechadas neste aparelho (uma por evento). */
const KEY = `${APP_KEY}-faixas-fechadas`

function readClosed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

/** Faixa curta no Início enquanto um evento sazonal acontece (src/data/events.ts). Dá para fechar. */
export function EventBanner() {
  const events = useActiveEvents()
  const [closed, setClosed] = useState(readClosed)
  const shown = events.filter((e) => !closed.includes(e.id))
  if (!shown.length) return null

  const close = (id: string) => {
    const next = [...closed, id]
    setClosed(next)
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      /* sem armazenamento: fecha só agora */
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {shown.map((e) => (
        <aside
          key={e.id}
          aria-label={eventLabel(e)}
          className="flex items-center gap-3 rounded-2xl border bg-panel px-4 py-2.5"
          style={{ borderColor: `color-mix(in srgb, ${e.color} 45%, transparent)`, background: `color-mix(in srgb, ${e.color} 8%, var(--color-panel))` }}
        >
          <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full" style={{ background: `color-mix(in srgb, ${e.color} 20%, transparent)`, color: e.color }}>
            <Icon name="sparkle" size={16} />
          </span>
          <p className="m-0 min-w-0 flex-1 text-sm text-soft">
            <strong className="text-fg">{eventLabel(e)}.</strong> {e.banner}
          </p>
          <Link to="/pet#colecao" className="shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-bold text-ink" style={{ background: e.color }}>
            Ver itens
          </Link>
          <button type="button" onClick={() => close(e.id)} aria-label={`Fechar a faixa de ${eventLabel(e)}`} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted hover:text-soft">
            <Icon name="x" size={14} />
          </button>
        </aside>
      ))}
    </div>
  )
}
