import { motion } from 'framer-motion'
import type { AccessoryId, PetKind, PetPhase, PetState } from '../../types'
import { Pet } from '../pets/Pet'
import { SPECIES } from '../pets/pets'
import { useReducedMotionPref } from '../../store/usePetPrefs'

/**
 * O pet do modo foco. Por cima do <Pet> (mesmo viewBox 120 × 120) vai uma camada com o notebook
 * e as patinhas, que muda conforme o momento:
 *  - `typing`: atrás do notebookzinho, digitando no jeito da espécie (discreto);
 *  - `stretch`: na pausa, se espreguiça com os braços para cima;
 *  - `door`: a pessoa saiu do app: sentado, virado para a porta;
 *  - `cheer`: a pessoa voltou: comemora de leve.
 * Com movimento reduzido, nada se mexe: só as poses e as expressões.
 */

export type FocusPose = 'typing' | 'stretch' | 'door' | 'cheer'

type Limb = 'paw' | 'tentacle' | 'wing'

/** Jeito de digitar de cada espécie: quantas patinhas, o ritmo (s) e o formato. */
const TYPING: Record<PetKind, { limbs: number; beat: number; shape: Limb; bob?: boolean }> = {
  gatinho: { limbs: 2, beat: 0.34, shape: 'paw' },
  sapinho: { limbs: 2, beat: 0.2, shape: 'paw' },
  polvinho: { limbs: 4, beat: 0.28, shape: 'tentacle' },
  pintinho: { limbs: 2, beat: 0.5, shape: 'wing', bob: true },
  ourico: { limbs: 2, beat: 0.6, shape: 'paw' },
  corujinha: { limbs: 2, beat: 0.44, shape: 'wing' },
  coelho: { limbs: 2, beat: 0.26, shape: 'paw' },
  'coelho-cristal': { limbs: 2, beat: 0.26, shape: 'paw' },
}

const POSE_STATE: Record<FocusPose, PetState> = { typing: 'foco', stretch: 'descanso', door: 'neutro', cheer: 'concluido' }

function LimbShape({ shape, x, y, color }: { shape: Limb; x: number; y: number; color: string }) {
  if (shape === 'tentacle') return <path d={`M${x - 3},${y - 7} Q${x - 4},${y} ${x},${y + 1} Q${x + 4},${y} ${x + 3},${y - 7} Z`} fill={color} />
  if (shape === 'wing') return <ellipse cx={x} cy={y - 2} rx={6} ry={3.6} fill={color} />
  return (
    <g>
      <ellipse cx={x} cy={y - 1} rx={5} ry={3.6} fill={color} />
      <path d={`M${x - 2},${y + 1.6} V${y + 0.4} M${x + 2},${y + 1.6} V${y + 0.4}`} stroke="#0A0D14" strokeOpacity=".25" strokeWidth={0.8} strokeLinecap="round" />
    </g>
  )
}

/** Notebookzinho visto de trás (a tela virada para o pet), com o brilho da tela no rosto dele. */
function Laptop() {
  return (
    <g>
      <ellipse cx="60" cy="74" rx="26" ry="10" fill="#7DD3FC" opacity=".08" />
      <path d="M33,80 Q33,78 35,78 H85 Q87,78 87,80 L89,104 H31 Z" fill="#2A3142" />
      <path d="M35,80 H85 L86.6,102 H33.4 Z" fill="#323A4E" />
      <circle cx="60" cy="90" r="2.6" fill="#C4B5FD" opacity=".55" />
      <rect x="26" y="103" width="68" height="5" rx="2.5" fill="#3A4357" />
      <rect x="26" y="103" width="68" height="1.4" rx=".7" fill="#566079" />
    </g>
  )
}

export function FocusPet({
  kind,
  phase,
  adultDetail,
  accessories,
  pose,
  size,
}: {
  kind: PetKind
  phase: PetPhase
  adultDetail: boolean
  accessories: AccessoryId[]
  pose: FocusPose
  size: number
}) {
  const reduced = useReducedMotionPref()
  const t = TYPING[kind]
  const body = SPECIES[kind].colors
  const limbColor = t.shape === 'paw' ? body.color : body.detail
  const xs = t.limbs === 4 ? [42, 53, 67, 78] : [48, 72]

  // Pose do corpo: sentado de lado olhando a porta, espreguiçando, comemorando ou bicando o teclado.
  const bodyAnim =
    pose === 'door'
      ? { rotateY: -32, y: size * 0.04, rotate: 0, scaleY: 0.96 }
      : pose === 'stretch'
        ? reduced
          ? { rotateY: 0, y: 0, rotate: 0, scaleY: 1.04 }
          : { rotateY: 0, y: 0, rotate: 0, scaleY: [1, 1.09, 1.09, 1] }
        : pose === 'cheer'
          ? reduced
            ? { rotateY: 0, y: 0, rotate: 0, scaleY: 1 }
            : { rotateY: 0, y: [0, -size * 0.06, 0], rotate: 0, scaleY: 1 }
          : t.bob && !reduced
            ? { rotateY: 0, y: 0, rotate: [0, 4, 0], scaleY: 1 }
            : { rotateY: 0, y: 0, rotate: 0, scaleY: 1 }
  const bodyTransition =
    pose === 'stretch'
      ? { duration: 3.2, repeat: Infinity, repeatDelay: 1.2, ease: 'easeInOut' as const }
      : pose === 'cheer'
        ? { duration: 0.6, repeat: 2, ease: 'easeOut' as const }
        : t.bob
          ? { duration: t.beat * 2, repeat: Infinity, ease: 'easeInOut' as const }
          : { duration: 0.8, ease: 'easeInOut' as const }

  return (
    <div className="relative" style={{ width: size, height: size, perspective: size * 4 }}>
      <motion.div className="absolute inset-0" style={{ transformOrigin: '50% 92%' }} animate={bodyAnim} transition={bodyTransition}>
        <Pet kind={kind} state={POSE_STATE[pose]} phase={phase} adultDetail={adultDetail} accessories={accessories} size={size} float={false} interactive={false} />
      </motion.div>

      <svg viewBox="0 0 120 120" width={size} height={size} className="pointer-events-none absolute inset-0" style={{ overflow: 'visible' }} aria-hidden="true">
        {pose === 'typing' && (
          <>
            <Laptop />
            {xs.map((x, i) => (
              <motion.g
                key={x}
                animate={reduced ? { y: 0 } : { y: [0, -3.2, 0] }}
                transition={{ duration: t.beat, repeat: Infinity, repeatDelay: t.beat * (t.limbs === 4 ? 1.4 : 0.6), delay: i * t.beat * 0.5, ease: 'easeInOut' }}
              >
                <LimbShape shape={t.shape} x={x} y={103} color={limbColor} />
              </motion.g>
            ))}
          </>
        )}
        {pose === 'stretch' &&
          [44, 76].map((x, i) => (
            <motion.g key={x} animate={reduced ? { y: 0 } : { y: [6, -6, -6, 6] }} transition={{ duration: 3.2, repeat: Infinity, repeatDelay: 1.2, ease: 'easeInOut', delay: i * 0.05 }}>
              <LimbShape shape={t.shape} x={x + (i ? 8 : -8)} y={22} color={limbColor} />
            </motion.g>
          ))}
      </svg>
    </div>
  )
}
