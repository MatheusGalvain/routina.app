// Primeiro de tudo: renomeia as chaves antigas do localStorage (rotina-app → habbit-do).
import './lib/storageKeys'
// Depois: o Supabase lê a sessão da URL e guardamos o erro do link, antes do roteador redirecionar.
import './lib/authUrl'
import { StrictMode } from 'react'
import { MotionConfig } from 'framer-motion'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { MOTION_CONFIG, usePetPrefs } from './store/usePetPrefs'
import './index.css'

/**
 * Movimento reduzido em todo o app: por padrão segue o aparelho (prefers-reduced-motion);
 * no Perfil dá para escolher "Sempre animar" ou "Reduzir".
 */
function Root() {
  const motion = usePetPrefs((s) => s.motion)
  return (
    <MotionConfig reducedMotion={MOTION_CONFIG[motion]}>
      <RouterProvider router={router} />
    </MotionConfig>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
