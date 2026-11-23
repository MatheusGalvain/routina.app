import { motion } from 'framer-motion'
import { Pet } from '../pets/Pet'
import { useShownPet } from '../../store/useCompanion'

/** Carregamento simples: o pet da pessoa piscando devagar, com um texto curto. */
export function PetLoader({ text = 'Carregando…', full = false }: { text?: string; full?: boolean }) {
  const pet = useShownPet('neutro')
  return (
    <div className={`grid place-items-center ${full ? 'min-h-screen' : 'min-h-[50vh]'}`} role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3">
        <motion.div animate={{ opacity: [1, 0.35, 1] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}>
          <Pet kind={pet.kind} phase={pet.phase} adultDetail={pet.adultDetail} accessories={pet.accessories} size={72} interactive={false} float={false} />
        </motion.div>
        <span className="text-sm text-muted">{text}</span>
      </div>
    </div>
  )
}
