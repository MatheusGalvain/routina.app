import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Pet } from '../components/pets/Pet'
import { useShownPet } from '../store/useCompanion'

/** 404: o pet confuso, de cabeça inclinada, com pontos de interrogação. */
export function NaoEncontrada() {
  const pet = useShownPet('atencao')
  return (
    <section className="mx-auto flex w-full max-w-[520px] flex-col items-center gap-5 rounded-[22px] border border-line bg-panel px-6 py-10 text-center">
      <div className="relative">
        <motion.div animate={{ rotate: [-8, 6, -8] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} style={{ transformOrigin: '50% 90%' }}>
          <Pet kind={pet.kind} state="atencao" mood="meh" phase={pet.phase} adultDetail={pet.adultDetail} accessories={pet.accessories} size={130} interactive={false} />
        </motion.div>
        {[
          { x: -14, y: 4, size: 26, delay: 0 },
          { x: 120, y: -6, size: 20, delay: 0.6 },
        ].map((q, i) => (
          <motion.span
            key={i}
            aria-hidden="true"
            className="absolute font-extrabold text-alerta"
            style={{ left: q.x, top: q.y, fontSize: q.size }}
            animate={{ y: [0, -6, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: q.delay, ease: 'easeInOut' }}
          >
            ?
          </motion.span>
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="m-0 font-mono text-xs tracking-wider text-muted uppercase">Erro 404</p>
        <h1 className="m-0 text-2xl font-extrabold tracking-tight">Hmm… essa página não existe</h1>
        <p className="m-0 text-muted">Procurei em todo canto e não achei. Pode ser um link antigo ou digitado errado.</p>
      </div>
      <Link to="/" className="inline-flex min-h-12 items-center rounded-full bg-accent px-6 text-[15px] font-bold text-ink">
        Voltar para o início
      </Link>
    </section>
  )
}
