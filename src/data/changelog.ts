/**
 * Novidades do app, da mais nova para a mais antiga. Escritas para quem usa o Habbit Do
 * (sem termos técnicos). A tela Início avisa quando existe uma versão que a pessoa ainda não viu,
 * e /novidades mostra o histórico inteiro.
 *
 * Para publicar uma novidade: acrescente uma entrada NO TOPO com uma versão nova.
 */
export interface ChangelogEntry {
  /** Identificador da versão (ex.: "0.4"). Precisa ser único. */
  versão: string
  /** Data (AAAA-MM-DD). */
  data: string
  título: string
  itens: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    versão: '0.4',
    data: '2026-11-24',
    título: 'Um coelho, tarefas do dia e histórias completas',
    itens: [
      'O coelho branco agora é o mascote do Habbit Do e pode ser adotado por qualquer pessoa. O app também ganhou um ícone novo com o rostinho dele.',
      'Existe um novo pet secreto, ainda mais raro. Quem já tinha encontrado o segredo antigo continua com ele, agora de cara nova.',
      'Dá para anotar tarefas só para hoje direto na tela Hoje, sem criar uma rotina. Se alguma ficar para trás, no dia seguinte o app pergunta se você quer levar para hoje.',
      'A lista do Hoje pode ser organizada do seu jeito: por rotina, automática (o que falta fazer primeiro) ou na sua ordem, arrastando os itens.',
      'Cada rotina mostra os dias da semana em que aparece, com o dia de hoje marcado.',
      'Cada pet cresce no seu próprio ritmo: uns viram adultos mais rápido, outros levam mais tempo. Ninguém volta de fase.',
      'As histórias dos pets agora ficam marcadas como lidas. Quem ler todas ganha o título de Historiador e um acessório especial.',
      'Seu nome aparece no topo do app, com um atalho para o seu perfil.',
    ],
  },
  {
    versão: '0.3',
    data: '2026-11-23',
    título: 'Modo foco e datas especiais',
    itens: [
      'Novo modo foco: escolha um bloco e o seu pet fica trabalhando junto com você, com pausas para descansar.',
      'Datas especiais, como Natal e Ano Novo, trazem enfeites para o cantinho e acessórios que só aparecem nessa época.',
      'Entrar ficou mais simples: o código que chega no e-mail ficou mais fácil de digitar.',
      'Vários ajustes nos botões e na edição de rotinas.',
    ],
  },
  {
    versão: '0.2',
    data: '2026-11-22',
    título: 'O cantinho do pet',
    itens: [
      'Seu pet ganhou um cantinho, com cenários para escolher e espaços para enfeitar com troféus e itens.',
      'Troféus para conquistar conforme você cuida das suas áreas da vida.',
      'Cores novas, mais suaves e agradáveis de olhar.',
      'Página de perfil com seus números, a vitrine de troféus e as preferências.',
    ],
  },
  {
    versão: '0.1',
    data: '2026-11-21',
    título: 'O começo do Habbit Do',
    itens: [
      'Monte suas rotinas com hábitos, contadores e tarefas, na ordem que fizer sentido para você.',
      'A tela Hoje mostra o que fazer agora, um bloco de cada vez.',
      'O histórico guarda como foi cada dia.',
      'Escolha um pet para te acompanhar. Ele muda de humor com o seu dia e cresce junto com os seus hábitos.',
      'Cada pet tem uma historinha para ler e brincar.',
      'Sua conta guarda tudo, e você pode entrar de qualquer aparelho.',
    ],
  },
]

export const LATEST_VERSION = CHANGELOG[0].versão

/** Versões que a pessoa ainda não viu (todas depois de `lastSeen`). */
export function unseenEntries(lastSeen: string | null): ChangelogEntry[] {
  if (lastSeen === LATEST_VERSION) return []
  const i = lastSeen ? CHANGELOG.findIndex((e) => e.versão === lastSeen) : -1
  // Nunca viu nenhuma (quem já usava antes do aviso existir) ou versão desconhecida: só a mais nova.
  return i === -1 ? CHANGELOG.slice(0, 1) : CHANGELOG.slice(0, i)
}

/** "24 de novembro de 2026". */
export const formatChangelogDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
