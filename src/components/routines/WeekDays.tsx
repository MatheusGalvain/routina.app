import { WEEKDAYS } from '../../data/areas'
import { nowInTz } from '../../lib/dates'

/** "segunda, quarta e sexta" (ou "todos os dias" / "nenhum dia"). */
export function daysSpoken(days: number[]) {
  if (days.length === 7) return 'todos os dias'
  if (days.length === 0) return 'nenhum dia'
  const names = [...days].sort((a, b) => a - b).map((d) => WEEKDAYS[d].long.toLowerCase())
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`
}

/**
 * Os 7 dias da semana em letrinhas (D S T Q Q S S): os dias da rotina na cor dela, os outros bem apagados,
 * e um pontinho embaixo do dia de hoje. Passar o mouse mostra o dia por extenso (tooltip);
 * o leitor de tela ouve os dias por extenso pelo aria-label.
 */
export function WeekDays({ days, color, className = '' }: { days: number[]; color: string; className?: string }) {
  const today = nowInTz().getDay()
  return (
    <span role="img" aria-label={`Dias: ${daysSpoken(days)}`} className={`inline-flex items-start gap-[5px] font-mono text-[10.5px] leading-none ${className}`}>
      {WEEKDAYS.map((d, i) => {
        const on = days.includes(i)
        return (
          <span key={i} aria-hidden="true" title={d.long} className="flex w-[9px] flex-col items-center gap-[3px]">
            <span className={on ? 'font-semibold' : ''} style={{ color: on ? color : 'color-mix(in srgb, var(--color-muted) 40%, transparent)' }}>
              {d.short}
            </span>
            <span className="h-[3px] w-[3px] rounded-full" style={{ background: i === today ? (on ? color : 'var(--color-muted)') : 'transparent' }} />
          </span>
        )
      })}
    </span>
  )
}
