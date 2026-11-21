import type { ReactNode } from 'react'
import { crescent } from '../../data/accessories'

/** Enfeites das historinhas, em SVG flat (viewBox 0 0 32 32). */
const DECO = {
  cloud: <path d="M8,22 A5,5 0 0 1 9,12 A7,7 0 0 1 22,11 A5.5,5.5 0 0 1 24,22 Z" fill="#C9CED8" />,
  moon: <path d={crescent(14, 16, 10)} fill="#FDE68A" />,
  star: <path d="M16,4 L19,12.5 L28,13 L21,18.5 L23.5,27 L16,22 L8.5,27 L11,18.5 L4,13 L13,12.5 Z" fill="#FFD34D" />,
  sparkle: <path d="M16,3 L18.2,13.8 L29,16 L18.2,18.2 L16,29 L13.8,18.2 L3,16 L13.8,13.8 Z" fill="#E9E3FF" />,
  note: (
    <>
      <rect x="7" y="5" width="18" height="23" rx="3" fill="#F1F3F6" />
      <rect x="12" y="3" width="8" height="5" rx="2" fill="#9AA3B5" />
      <path d="M11,14 H21 M11,19 H21 M11,24 H17" stroke="#9AA3B5" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  play: (
    <>
      <circle cx="16" cy="16" r="12" fill="#22C55E" />
      <path d="M13,10 L22,16 L13,22 Z" fill="#06210F" />
    </>
  ),
  yarn: (
    <>
      <circle cx="16" cy="16" r="10" fill="#FB7185" />
      <path d="M8,12 Q16,16 22,8 M7,18 Q16,20 25,12 M10,24 Q18,22 26,17" fill="none" stroke="#9F1239" strokeWidth="1.5" />
      <path d="M24,22 Q29,26 26,29" fill="none" stroke="#FB7185" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  lotus: (
    <>
      <ellipse cx="16" cy="24" rx="13" ry="4" fill="#16A34A" />
      <path d="M16,8 Q21,15 16,22 Q11,15 16,8 Z" fill="#F9A8D4" />
      <path d="M8,13 Q15,16 16,22 Q9,21 8,13 Z M24,13 Q17,16 16,22 Q23,21 24,13 Z" fill="#F472B6" />
    </>
  ),
  drop: <path d="M16,4 C22,13 24,17 24,20 A8,8 0 0 1 8,20 C8,17 10,13 16,4 Z" fill="#5AA7FF" />,
  confetti: (
    <>
      <path d="M5,28 L11,10 L22,21 Z" fill="#FFB020" />
      <circle cx="20" cy="7" r="2" fill="#FB7185" />
      <circle cx="26" cy="13" r="2" fill="#5AA7FF" />
      <rect x="23" y="4" width="3" height="5" rx="1" fill="#22C55E" transform="rotate(30 24 6)" />
    </>
  ),
  leaf: (
    <>
      <path d="M6,26 C6,12 14,6 27,5 C26,18 20,26 6,26 Z" fill="#22C55E" />
      <path d="M6,26 L20,12" stroke="#15803D" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  phone: (
    <>
      <rect x="9" y="3" width="14" height="26" rx="3" fill="#2A3244" />
      <rect x="11" y="6" width="10" height="17" rx="1" fill="#5AA7FF" />
      <circle cx="16" cy="26" r="1.3" fill="#9AA3B5" />
    </>
  ),
  tv: (
    <>
      <rect x="4" y="8" width="24" height="17" rx="3" fill="#2A3244" />
      <rect x="7" y="11" width="18" height="11" rx="1.5" fill="#A78BFA" />
      <path d="M11,3 L16,8 L21,3" fill="none" stroke="#9AA3B5" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  cookie: (
    <>
      <circle cx="16" cy="16" r="11" fill="#D19A5B" />
      <circle cx="12" cy="12" r="1.8" fill="#5B3A1E" />
      <circle cx="19" cy="14" r="1.6" fill="#5B3A1E" />
      <circle cx="14" cy="20" r="1.8" fill="#5B3A1E" />
      <circle cx="21" cy="21" r="1.3" fill="#5B3A1E" />
    </>
  ),
  bell: (
    <>
      <path d="M16,5 C10,5 9,11 9,16 L6,22 H26 L23,16 C23,11 22,5 16,5 Z" fill="#FFB020" />
      <circle cx="16" cy="25" r="3" fill="#E07B00" />
    </>
  ),
  bubble: (
    <>
      <circle cx="16" cy="16" r="10" fill="#5AA7FF" fillOpacity=".18" stroke="#93C5FD" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2.5" fill="#E0F2FE" opacity=".8" />
    </>
  ),
  shell: (
    <>
      <path d="M16,6 C25,6 29,15 26,24 H6 C3,15 7,6 16,6 Z" fill="#FDBA74" />
      <path d="M16,24 V8 M11,24 L9,10 M21,24 L23,10" stroke="#C2410C" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  clock: (
    <>
      <circle cx="16" cy="17" r="11" fill="#F1F3F6" stroke="#FFB020" strokeWidth="2.5" />
      <path d="M16,17 V10 M16,17 L21,19" stroke="#0A0D14" strokeWidth="2" strokeLinecap="round" />
      <circle cx="7" cy="6" r="3" fill="#FFB020" />
      <circle cx="25" cy="6" r="3" fill="#FFB020" />
    </>
  ),
  scissors: (
    <>
      <circle cx="9" cy="23" r="4" fill="none" stroke="#F43F5E" strokeWidth="2.5" />
      <circle cx="23" cy="23" r="4" fill="none" stroke="#F43F5E" strokeWidth="2.5" />
      <path d="M11,20 L22,5 M21,20 L10,5" stroke="#C9CED8" strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  wheat: (
    <>
      <path d="M16,29 V8" stroke="#E0A526" strokeWidth="2" strokeLinecap="round" />
      {[10, 15, 20].map((y) => (
        <g key={y}>
          <ellipse cx="12.5" cy={y} rx="3.5" ry="2" fill="#FFD34D" transform={`rotate(-35 12.5 ${y})`} />
          <ellipse cx="19.5" cy={y} rx="3.5" ry="2" fill="#FFD34D" transform={`rotate(35 19.5 ${y})`} />
        </g>
      ))}
    </>
  ),
  sun: (
    <>
      <circle cx="16" cy="16" r="7" fill="#FFB020" />
      <path d="M16,3 V6 M16,26 V29 M3,16 H6 M26,16 H29 M7,7 L9,9 M23,23 L25,25 M7,25 L9,23 M23,9 L25,7" stroke="#FFB020" strokeWidth="2.2" strokeLinecap="round" />
    </>
  ),
  anger: <path d="M12,4 V10 Q10,12 4,12 M20,4 V10 Q22,12 28,12 M4,20 Q10,20 12,22 V28 M28,20 Q22,20 20,22 V28" fill="none" stroke="#F43F5E" strokeWidth="3" strokeLinecap="round" />,
  wind: <path d="M4,12 H20 A4,4 0 1 0 16,8 M4,18 H25 A4,4 0 1 1 21,22 M4,24 H14" fill="none" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" />,
  question: (
    <>
      <circle cx="16" cy="16" r="12" fill="#2A3244" />
      <path d="M12,12 A4,4 0 1 1 17,16 Q16,17 16,19" fill="none" stroke="#F1F3F6" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="16" cy="23.5" r="1.6" fill="#F1F3F6" />
    </>
  ),
  apple: (
    <>
      <path d="M16,10 C10,6 4,10 5,18 C6,25 11,29 16,26 C21,29 26,25 27,18 C28,10 22,6 16,10 Z" fill="#F43F5E" />
      <path d="M16,10 Q16,6 18,4" stroke="#7C4A2D" strokeWidth="2" strokeLinecap="round" />
      <path d="M17,7 Q22,3 25,6 Q21,9 17,7 Z" fill="#22C55E" />
    </>
  ),
  sprout: (
    <>
      <path d="M16,28 V14" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M16,16 C8,16 5,10 6,7 C12,6 16,10 16,16 Z M16,14 C22,14 26,9 25,5 C19,5 16,9 16,14 Z" fill="#22C55E" />
    </>
  ),
  bulb: (
    <>
      <path d="M16,3 A9,9 0 0 1 21,19.5 V22 H11 V19.5 A9,9 0 0 1 16,3 Z" fill="#FFD34D" />
      <rect x="11" y="23" width="10" height="5" rx="1.5" fill="#9AA3B5" />
    </>
  ),
  heart: <path d="M16,27 C6,20 3,14 5,9.5 C7,5 13,5 16,10 C19,5 25,5 27,9.5 C29,14 26,20 16,27 Z" fill="#A78BFA" />,
  zz: (
    <path d="M5,10 H13 L5,20 H13 M17,6 H24 L17,15 H24" fill="none" stroke="#C4B5FD" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  ),
} satisfies Record<string, ReactNode>

export type DecoId = keyof typeof DECO

export function Deco({ id, size = 30 }: { id: DecoId; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      {DECO[id]}
    </svg>
  )
}
