import { lazy, type ComponentType } from 'react'
import { createBrowserRouter, type RouteObject } from 'react-router-dom'
import { AppShell, PublicOnly, RequireAuth, RootLayout } from './App'

/** Carrega a página só quando a rota abre (cada página vira um pedaço separado do build). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function page<K extends string>(load: () => Promise<Record<K, ComponentType<any>>>, name: K) {
  return lazy(() => load().then((m) => ({ default: m[name] })))
}

const Inicio = page(() => import('./pages/Inicio'), 'Inicio')
const Hoje = page(() => import('./pages/Hoje'), 'Hoje')
const Historico = page(() => import('./pages/Historico'), 'Historico')
const Rotinas = page(() => import('./pages/Rotinas'), 'Rotinas')
const Companheiro = page(() => import('./pages/Companheiro'), 'Companheiro')
const Perfil = page(() => import('./pages/Perfil'), 'Perfil')
const Privacidade = page(() => import('./pages/Privacidade'), 'PrivacidadePage')
const Entrar = page(() => import('./pages/Entrar'), 'Entrar')
const BemVindo = page(() => import('./pages/BemVindo'), 'BemVindo')
const NaoEncontrada = page(() => import('./pages/NaoEncontrada'), 'NaoEncontrada')

/** Título da aba: "<title> · Habbit Do" (lido pelo RootLayout). */
export type RouteHandle = { title?: string }

// Páginas de desenvolvimento: em produção a condição vira `false` e os imports somem do build.
const devRoutes: RouteObject[] = import.meta.env.DEV
  ? (() => {
      const DevIndex = page(() => import('./dev/DevPages'), 'DevIndex')
      const DevCantinho = page(() => import('./dev/DevPages'), 'DevCantinho')
      const DevPets = page(() => import('./dev/DevPages'), 'DevPets')
      return [
        { path: 'dev', element: <DevIndex />, handle: { title: 'Dev' } },
        { path: 'dev/cantinho', element: <DevCantinho />, handle: { title: 'Dev · Cantinho' } },
        { path: 'dev/pets', element: <DevPets />, handle: { title: 'Dev · Pets' } },
      ]
    })()
  : []

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: 'entrar',
        element: (
          <PublicOnly>
            <Entrar />
          </PublicOnly>
        ),
        handle: { title: 'Entrar' },
      },
      {
        // Sem sessão, tudo daqui para baixo vai para /entrar (a política de privacidade é a exceção).
        element: <RequireAuth />,
        children: [
          { path: 'bem-vindo', element: <BemVindo />, handle: { title: 'Bem-vindo' } },
          {
            element: <AppShell />,
            children: [
              { index: true, element: <Inicio />, handle: { title: 'Início' } },
              { path: 'hoje', element: <Hoje />, handle: { title: 'Hoje' } },
              { path: 'historico', element: <Historico />, handle: { title: 'Histórico' } },
              { path: 'rotinas', element: <Rotinas />, handle: { title: 'Rotinas' } },
              { path: 'rotinas/modelos/:slug', element: <Rotinas kind="template" />, handle: { title: 'Editar modelo' } },
              { path: 'rotinas/:slug', element: <Rotinas />, handle: { title: 'Editar rotina' } },
              { path: 'pet', element: <Companheiro />, handle: { title: 'Pet' } },
              { path: 'perfil', element: <Perfil />, handle: { title: 'Perfil' } },
              { path: 'privacidade', element: <Privacidade />, handle: { title: 'Privacidade' } },
              ...devRoutes,
              { path: '*', element: <NaoEncontrada />, handle: { title: 'Página não encontrada' } },
            ],
          },
        ],
      },
    ],
  },
])
