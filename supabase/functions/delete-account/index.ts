// Edge Function: exclui a conta de quem está chamando e, em cascata, todos os dados dele.
//
// A chave de serviço só existe AQUI, no servidor do Supabase (variável de ambiente
// fornecida automaticamente às Edge Functions). Ela nunca vai para o app.
//
// Segurança:
//  - Quem é excluído vem do token de login enviado pelo app (nunca de um id no corpo).
//  - Exige a confirmação { "confirm": "EXCLUIR" } no corpo.
//  - Apagar o usuário em auth.users apaga todas as linhas dele (ON DELETE CASCADE na migration 001).

import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json(405, { error: 'Use POST.' })

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return json(401, { error: 'Faça login para excluir a conta.' })

  let body: { confirm?: string } = {}
  try {
    body = await req.json()
  } catch {
    /* corpo vazio */
  }
  if (body.confirm !== 'EXCLUIR') return json(400, { error: 'Confirmação ausente.' })

  const url = Deno.env.get('SUPABASE_URL')
  // Fornecida automaticamente às Edge Functions. Em projetos só com as chaves novas,
  // cadastre a secret key com: supabase secrets set SUPABASE_SECRET_KEY=sb_secret_...
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY')
  if (!url || !serviceKey) return json(500, { error: 'Função sem configuração do servidor.' })

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

  // Descobre o usuário pelo token dele (valida assinatura e validade).
  const { data, error: userError } = await admin.auth.getUser(token)
  if (userError || !data.user) return json(401, { error: 'Sessão inválida. Entre de novo e tente outra vez.' })

  const { error } = await admin.auth.admin.deleteUser(data.user.id)
  if (error) {
    console.error('delete-account', data.user.id, error.message)
    return json(500, { error: 'Não foi possível excluir agora. Tente de novo em instantes.' })
  }

  return json(200, { ok: true })
})
