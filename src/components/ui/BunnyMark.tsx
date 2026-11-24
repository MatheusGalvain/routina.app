import { useId } from 'react'

/**
 * Símbolo do Habbit Do: o rosto do coelho branco (orelhas, cabeça, olhos, focinho e bochechas).
 * viewBox 0 0 64 64. As mesmas formas estão em public/favicon.svg e nos ícones do app
 * (gerados por scripts/icons.py): se mudar aqui, gere os ícones de novo.
 * `tile`: com o fundo #141414 de cantos arredondados e o halo lilás (o ícone do app).
 */
export function BunnyMark({ size = 40, tile = false, label = 'Habbit Do' }: { size?: number; tile?: boolean; label?: string | null }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}>
      <defs>
        <radialGradient id={`halo-${id}`} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#CDB8FF" stopOpacity=".26" />
          <stop offset="1" stopColor="#CDB8FF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`ear-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F7B8D6" />
          <stop offset="1" stopColor="#CDB8FF" />
        </linearGradient>
      </defs>
      {tile && <rect width="64" height="64" rx="14" fill="#141414" />}
      <circle cx="32" cy="34" r={tile ? 27 : 30} fill={`url(#halo-${id})`} />
      <g transform="translate(0 3)">
        <g transform="rotate(-12 24.5 30)">
          <ellipse cx="24.5" cy="17" rx="5.6" ry="13" fill="#F2F0ED" />
          <ellipse cx="24.5" cy="18.5" rx="2.6" ry="9" fill={`url(#ear-${id})`} />
        </g>
        <g transform="rotate(12 39.5 30)">
          <ellipse cx="39.5" cy="17" rx="5.6" ry="13" fill="#F2F0ED" />
          <ellipse cx="39.5" cy="18.5" rx="2.6" ry="9" fill={`url(#ear-${id})`} />
        </g>
        <ellipse cx="32" cy="39" rx="17" ry="15" fill="#F2F0ED" />
        <ellipse cx="21.5" cy="44.5" rx="3" ry="1.8" fill="#FF9EC7" opacity=".6" />
        <ellipse cx="42.5" cy="44.5" rx="3" ry="1.8" fill="#FF9EC7" opacity=".6" />
        <rect x="24.2" y="34" width="4.6" height="7" rx="2.3" fill="#0A0D14" />
        <rect x="35.2" y="34" width="4.6" height="7" rx="2.3" fill="#0A0D14" />
        <circle cx="27.4" cy="35.8" r=".95" fill="#FFFFFF" />
        <circle cx="38.4" cy="35.8" r=".95" fill="#FFFFFF" />
        <path d="M30.6,44.2 Q32,43.4 33.4,44.2 Q32.8,45.8 32,46 Q31.2,45.8 30.6,44.2 Z" fill="#F59BC4" />
        <path d="M32,46 Q31.2,47.6 29.6,47.1 M32,46 Q32.8,47.6 34.4,47.1" fill="none" stroke="#0A0D14" strokeWidth=".9" strokeLinecap="round" />
      </g>
    </svg>
  )
}
