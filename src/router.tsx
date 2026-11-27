import { lazy, type ComponentType } from 'react'
import { createBrowserRouter, type RouteObject } from 'react-router-dom'
import { Home, PublicOnly, RequireAuth, RootLayout } from './shell'
import { withReload } from './lib/staleBuild'

/** Carrega a página só quando a rota abre (cada página vira um pedaço separado do build). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function page<K extends string>(load: () => Promise<Record<K, ComponentType<any>>>, name: K) {
  return lazy(withReload(() => load().then((m) => ({ default: m[name] }))))
}

// O app logado inteiro (header, abas e as janelas por cima) fica no mesmo arquivo do AuthedApp (shell.tsx).
const AppShell = page(() => import('./App'), 'AppShell')
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
const Novidades = page(() => import('./pages/Novidades'), 'Novidades')

/** Título da aba: "<title> · Habbit Do", ou `documentTitle` inteiro (lido pelo RootLayout). */
export type RouteHandle = { title?: string; documentTitle?: string }

/** Título da landing (o mesmo do index.html, que é o que os buscadores e as redes leem). */
export const LANDING_TITLE = 'Habbit Do · Uma rotina que dá vontade de cuidar'


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
      // Landing para quem não está logado; com sessão, vai para /inicio (ver Home).
      { index: true, element: <Home />, handle: { documentTitle: LANDING_TITLE } },
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
        // Sem sessão, tudo daqui para baixo vai para /entrar (a política de privacidade e as novidades são a exceção).
        element: <RequireAuth />,
        children: [
          { path: 'bem-vindo', element: <BemVindo />, handle: { title: 'Bem-vindo' } },
          {
            element: <AppShell />,
            children: [
              { path: 'inicio', element: <Inicio />, handle: { title: 'Início' } },
              { path: 'hoje', element: <Hoje />, handle: { title: 'Hoje' } },
              { path: 'historico', element: <Historico />, handle: { title: 'Histórico' } },
              { path: 'rotinas', element: <Rotinas />, handle: { title: 'Rotinas' } },
              { path: 'rotinas/modelos/:slug', element: <Rotinas kind="template" />, handle: { title: 'Editar modelo' } },
              { path: 'rotinas/:slug', element: <Rotinas />, handle: { title: 'Editar rotina' } },
              { path: 'pet', element: <Companheiro />, handle: { title: 'Pet' } },
              { path: 'perfil', element: <Perfil />, handle: { title: 'Perfil' } },
              { path: 'novidades', element: <Novidades />, handle: { title: 'Novidades' } },
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
