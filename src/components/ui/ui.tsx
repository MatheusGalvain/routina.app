import type { ReactNode } from 'react'
import type { HelpKey } from '../../data/help'
import { HelpButton } from '../help/HelpButton'

const PATHS: Record<string, ReactNode> = {
  trend: <><path d="M4 19 L10 13 L14 17 L20 7" /><path d="M15 7 L20 7 L20 12" /></>,
  calendar: <><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M8 3 L8 7 M16 3 L16 7 M4 10 L20 10" /></>,
  box: <><path d="M12 3 L20 7.5 L20 16.5 L12 21 L4 16.5 L4 7.5 Z" /><path d="M4 7.5 L12 12 L20 7.5 M12 12 L12 21" /></>,
  grid: <><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></>,
  paw: <><circle cx="12" cy="15" r="4" /><circle cx="6" cy="9" r="2" /><circle cx="10" cy="5.5" r="2" /><circle cx="14" cy="5.5" r="2" /><circle cx="18" cy="9" r="2" /></>,
  check: <path d="M5 12.5 L10 17.5 L19 7.5" />,
  plus: <path d="M12 5 L12 19 M5 12 L19 12" />,
  minus: <path d="M5 12 L19 12" />,
  play: <path d="M7 5 L19 12 L7 19 Z" />,
  skip: <path d="M6 6 L14 12 L6 18 Z M17 6 L17 18" />,
  undo: <><path d="M9 14 L4 9 L9 4" /><path d="M4 9 L14 9 A6 6 0 0 1 14 21 L10 21" /></>,
  trash: <path d="M5 7 L19 7 M10 7 L10 4 L14 4 L14 7 M7 7 L8 20 L16 20 L17 7" />,
  edit: <path d="M4 20 L8 19 L19 8 L16 5 L5 16 Z" />,
  grip: <path d="M9 6 L9 6.01 M15 6 L15 6.01 M9 12 L9 12.01 M15 12 L15 12.01 M9 18 L9 18.01 M15 18 L15 18.01" />,
  note: <path d="M6 4 L15 4 L19 8 L19 20 L6 20 Z M9 11 L16 11 M9 15 L14 15" />,
  'chevron-left': <path d="M15 5 L8 12 L15 19" />,
  'chevron-right': <path d="M9 5 L16 12 L9 19" />,
  'chevron-up': <path d="M5 15 L12 8 L19 15" />,
  'chevron-down': <path d="M5 9 L12 16 L19 9" />,
  gauge: <><path d="M4 16 A8 8 0 0 1 20 16" /><path d="M12 16 L16 10" /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2.5" /><path d="M8 11 V8 A4 4 0 0 1 16 8 V11" /></>,
  x: <path d="M6 6 L18 18 M18 6 L6 18" />,
  menu: <path d="M4 7 L20 7 M4 12 L20 12 M4 17 L20 17" />,
  sparkle: <path d="M12 3 L13.8 10.2 L21 12 L13.8 13.8 L12 21 L10.2 13.8 L3 12 L10.2 10.2 Z" />,
  book: <><path d="M4 5 Q8 3.5 12 6 Q16 3.5 20 5 L20 19 Q16 17.5 12 20 Q8 17.5 4 19 Z" /><path d="M12 6 L12 20" /></>,
  hand: <path d="M9 11 V5.5 A1.5 1.5 0 0 1 12 5.5 V10 M12 9.5 A1.5 1.5 0 0 1 15 9.5 V11 M15 10.5 A1.5 1.5 0 0 1 18 10.5 V15 A6 6 0 0 1 12 21 A6 6 0 0 1 6.5 17 L4.8 13.2 A1.4 1.4 0 0 1 7.3 12 L9 14" />,
}

export function Icon({ name, size = 18, className = '' }: { name: keyof typeof PATHS | string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {PATHS[name]}
    </svg>
  )
}

export function Panel({
  title,
  icon,
  color = 'var(--color-accent)',
  action,
  help,
  className = '',
  children,
}: {
  title: string
  icon: string
  color?: string
  action?: ReactNode
  /** Botão "?" ao lado do título, com o texto de src/data/help.ts. */
  help?: HelpKey
  className?: string
  children: ReactNode
}) {
  return (
    <section className={`flex flex-col gap-4 rounded-[22px] border border-line bg-panel p-4 sm:p-6 ${className}`}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <h2 className="m-0 flex min-w-0 items-center gap-3 text-lg font-bold">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px]" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
              <Icon name={icon} />
            </span>
            <span className="min-w-0 [overflow-wrap:anywhere]">{title}</span>
          </h2>
          {help && <HelpButton k={help} />}
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}

export function ProgressRing({ pct, size = 104, stroke = 8, color = 'var(--color-accent)', children }: { pct: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} style={{ stroke: 'var(--color-line)' }} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(1, pct))}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ stroke: color, transition: 'stroke-dashoffset .5s ease' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-xl font-extrabold">{children}</div>
    </div>
  )
}

export function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-[5px] overflow-hidden rounded-full bg-line">
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.round(pct * 100)}%`, background: color }} />
    </div>
  )
}

export function Logo({ size = 56 }: { size?: number }) {
  const segs = ['var(--color-alerta)', 'var(--color-accent)', 'var(--color-ok)', 'var(--color-noite)']
  return (
    <div className="grid place-items-center rounded-[22px] border border-line bg-panel" style={{ width: size + 20, height: size + 20 }}>
      <svg width={size} height={size} viewBox="0 0 56 56" role="img" aria-label="Habbit Do">
        {segs.map((c, i) => (
          <circle key={c} cx="28" cy="28" r="22" fill="none" style={{ stroke: c }} strokeWidth="6" strokeLinecap="round" strokeDasharray="26 112.2" strokeDashoffset={-34.5 * i} transform="rotate(-90 28 28)" />
        ))}
        <path d="M19 28.5 L25.5 35 L37.5 22" fill="none" style={{ stroke: 'var(--color-fg)' }} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
