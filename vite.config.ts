import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Trava de segurança: tudo que começa com VITE_ vai para o JavaScript do navegador.
 * Se alguma dessas variáveis tiver uma chave secreta do Supabase (sb_secret_… ou
 * JWT com role service_role), o build e o dev server param antes de expor a chave.
 */
function assertNoSecretKeys(env: Record<string, string>) {
  for (const [name, value] of Object.entries(env)) {
    if (!name.startsWith('VITE_') || !value) continue
    let secret = value.startsWith('sb_secret_')
    if (!secret && value.startsWith('eyJ')) {
      try {
        const part = value.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
        const payload = JSON.parse(atob(part))
        secret = payload.role === 'service_role'
      } catch {
        /* não é JWT: segue */
      }
    }
    if (secret) {
      throw new Error(
        `\n\n[segurança] ${name} contém uma chave SECRETA do Supabase.\n` +
          'Variáveis VITE_ são públicas (vão para o navegador). Use a chave publicável (sb_publishable_…) ou a anon key,\n' +
          'e troque a chave secreta no painel do Supabase (Settings → API Keys), pois ela pode ter sido exposta.\n',
      )
    }
  }
}

export default defineConfig(({ mode }) => {
  assertNoSecretKeys(loadEnv(mode, '.', 'VITE_'))
  return {
    plugins: [react(), tailwindcss()],
    build: {
      rolldownOptions: {
        output: {
          // Bibliotecas grandes em arquivos próprios: nenhum arquivo passa de 500 kB e,
          // como elas mudam pouco, o navegador reaproveita o cache entre versões do app.
          codeSplitting: {
            groups: [
              { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 3 },
              { name: 'motion', test: /node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/, priority: 2 },
              { name: 'supabase', test: /node_modules[\\/]@supabase[\\/]/, priority: 1 },
            ],
          },
        },
      },
    },
  }
})
