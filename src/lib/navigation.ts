import { useLocation, useNavigate } from 'react-router-dom'

/** Onde abrir o Hoje: num bloco (rola até ele) ou no campo da revisão da noite. */
export type TodayTarget = { blockId?: string; review?: boolean }

/** Abre /hoje; com alvo, a página rola até o bloco (ou a revisão) e leva o foco para ele. */
export function useGoToday() {
  const navigate = useNavigate()
  return (target?: TodayTarget) => navigate('/hoje', { state: target ? { focus: target } : null })
}

/** Voltar: para a página anterior do app, ou para `fallback` se a pessoa chegou direto por esta URL. */
export function useBack(fallback = '/') {
  const navigate = useNavigate()
  const location = useLocation()
  return () => (location.key !== 'default' ? navigate(-1) : navigate(fallback))
}
