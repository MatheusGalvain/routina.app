import type { ReactNode } from 'react'
import { Icon } from '../components/ui/ui'
import { useBack } from '../lib/navigation'

/** E-mail para dúvidas sobre privacidade. Preencha antes de publicar (vazio = a seção não aparece). */
const CONTATO = ''

const UPDATED = '21 de novembro de 2026'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="m-0 text-lg font-bold">{title}</h2>
      <div className="flex flex-col gap-2 text-[15px] leading-relaxed text-soft">{children}</div>
    </section>
  )
}

/** Rota /privacidade dentro do app: "Voltar" retorna para a página de onde a pessoa veio. */
export function PrivacidadePage() {
  return <Privacidade onBack={useBack('/')} />
}

/** Política de privacidade, em linguagem simples. */
export function Privacidade({ onBack }: { onBack: () => void }) {
  return (
    <article className="mx-auto flex w-full max-w-[720px] flex-col gap-6 rounded-[22px] border border-line bg-panel p-6 sm:p-8">
      <button type="button" onClick={onBack} className="flex items-center gap-1.5 self-start rounded-full px-2 py-1 text-sm font-semibold text-muted hover:text-soft">
        <Icon name="chevron-left" size={16} /> Voltar
      </button>

      <header className="flex flex-col gap-1">
        <p className="m-0 font-mono text-xs tracking-wider text-muted uppercase">Atualizada em {UPDATED}</p>
        <h1 className="m-0 text-3xl font-extrabold tracking-tight">Política de privacidade</h1>
        <p className="m-0 text-muted">O Habbit Do guarda só o necessário para organizar o seu dia e manter tudo igual em todos os seus aparelhos.</p>
      </header>

      <Section title="Quais dados guardamos">
        <ul className="m-0 flex flex-col gap-1.5 pl-5">
          <li>
            <strong>Seu e-mail</strong>, para você entrar na conta. Se entrar com o Google, recebemos também o nome e a foto do perfil que o Google
            compartilha.
          </li>
          <li>
            <strong>Seu fuso horário</strong>, para cada registro cair no dia certo.
          </li>
          <li>
            <strong>Suas rotinas e blocos</strong>: nomes, cores, dias da semana, ordem, metas e áreas da vida.
          </li>
          <li>
            <strong>Seus registros diários</strong>: o que foi feito, pulado ou contado em cada dia, e as tarefas concluídas.
          </li>
          <li>
            <strong>As notas da revisão da noite</strong>, que você escreve no fim do dia.
          </li>
          <li>
            <strong>Seu pet</strong>: espécie favorita, nome, acessórios e a evolução dele.
          </li>
        </ul>
      </Section>

      <Section title="Para que usamos">
        <p className="m-0">
          Só para o app funcionar: mostrar seu dia, montar o histórico, fazer o pet evoluir e sincronizar seus dados entre aparelhos. Não vendemos seus
          dados, não usamos para anúncios e não compartilhamos com ninguém para outros fins.
        </p>
      </Section>

      <Section title="Onde ficam e quem acessa">
        <p className="m-0">
          Os dados ficam no <strong>Supabase</strong>, o serviço de banco de dados e login que o app usa. Cada conta só consegue ler e alterar os
          próprios dados: essa regra é aplicada no próprio banco, não só no app.
        </p>
        <p className="m-0">
          Uma cópia fica também <strong>neste aparelho</strong> (no armazenamento do navegador), para o app abrir rápido e funcionar sem internet. Ao
          sair da conta, a cópia continua no aparelho até você limpar os dados do navegador.
        </p>
        <p className="m-0">Não usamos cookies de rastreamento nem ferramentas de análise de terceiros.</p>
      </Section>

      <Section title="Seus direitos">
        <p className="m-0">De acordo com a Lei Geral de Proteção de Dados (LGPD), você pode a qualquer momento:</p>
        <ul className="m-0 flex flex-col gap-1.5 pl-5">
          <li>
            <strong>Baixar seus dados</strong> em um arquivo JSON (aba Pet → Sua conta → Baixar meus dados).
          </li>
          <li>
            <strong>Corrigir</strong> qualquer informação direto no app.
          </li>
          <li>
            <strong>Excluir sua conta e todos os seus dados</strong> (aba Pet → Sua conta). A exclusão é imediata e não tem volta. Cópias de segurança
            do provedor podem manter os dados por alguns dias, até serem substituídas automaticamente.
          </li>
        </ul>
      </Section>

      {CONTATO && (
        <Section title="Fale com a gente">
          <p className="m-0">
            Dúvidas sobre privacidade: <a href={`mailto:${CONTATO}`} className="font-semibold text-accent underline">{CONTATO}</a>
          </p>
        </Section>
      )}
    </article>
  )
}
