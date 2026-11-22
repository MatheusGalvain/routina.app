// Primeiro de tudo: renomeia as chaves antigas do localStorage (rotina-app → habbit-do).
import './lib/storageKeys'
import { StrictMode } from 'react'
import { MotionConfig } from 'framer-motion'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Com prefers-reduced-motion, o framer-motion pula animações de movimento em todo o app. */}
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
)
