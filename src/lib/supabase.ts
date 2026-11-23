import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
// Chave PUBLICÁVEL (sb_publishable_… ou anon). A chave secreta nunca vem para o front:
// o vite.config.ts barra o build se ela aparecer numa variável VITE_.
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !key) {
  throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local')
}

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Lê a sessão que volta na URL depois do link mágico / Google.
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
})

/** Login com Google aparece só quando o provedor está ligado no painel do Supabase. */
export const GOOGLE_ENABLED = import.meta.env.VITE_ENABLE_GOOGLE === 'true'

/**
 * Para onde o link mágico e o Google devolvem a pessoa: sempre a raiz do app (é a URL liberada
 * em Redirect URLs no Supabase). A rota que ela tentou abrir volta depois do login (lib/authUrl).
 */
export const redirectTo = () => window.location.origin + '/'
