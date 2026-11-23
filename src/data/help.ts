import type { BlockType } from '../types'

/**
 * Textos de ajuda do botão "?" de cada tela e painel. Quem "explica" é o pet favorito
 * (sem favorito, o gatinho), sempre em primeira pessoa e em 1 a 3 frases curtas.
 * Para mudar um texto, edite só aqui: os componentes leem tudo deste arquivo.
 */

export interface HelpExample {
  type: BlockType
  name: string
  /** Um exemplo concreto do tipo. */
  example: string
}

export interface HelpEntry {
  /** Título do balão. */
  title: string
  /** 1 a 3 frases. */
  text: string[]
  /** Exemplos (usado para os 3 tipos de bloco). */
  examples?: HelpExample[]
}

/** Um exemplo de cada tipo de bloco. */
const BLOCK_EXAMPLES: HelpExample[] = [
  { type: 'habito', name: 'Hábito', example: 'Arrumar a cama: todo dia você marca se fez ou não.' },
  { type: 'contador', name: 'Contador', example: 'Beber água: meta de 8 copos, um toque no + por copo.' },
  { type: 'tarefa', name: 'Tarefa', example: 'Pagar a internet: depois de feita, some da lista.' },
]

export const HELP = {
  // Telas principais
  inicio: {
    title: 'Início',
    text: ['Aqui é a nossa sala. Você vê como está o dia, o meu cantinho e as suas rotinas.', 'O botão azul sempre mostra o próximo passo, então é só seguir ele.'],
  },
  hoje: {
    title: 'Hoje',
    text: ['Esta é a lista do dia, na ordem das suas rotinas.', 'Marque o que fez, pule o que não deu e, à noite, me conte como foi.'],
  },
  rotinas: {
    title: 'Rotinas',
    text: ['Uma rotina é um conjunto de blocos para certos dias da semana.', 'Você pode ter várias, como uma da manhã e outra da noite, e eu junto tudo no Hoje.'],
  },
  editor: {
    title: 'Editor de rotina',
    text: ['Escolha o nome, a cor e os dias, depois monte os blocos na ordem em que quer fazer.', 'Cada bloco tem um tipo:'],
    examples: BLOCK_EXAMPLES,
  },
  tipos: {
    title: 'Tipos de bloco',
    text: ['Cada bloco funciona de um jeito. Escolha o que combina com o que você quer acompanhar:'],
    examples: BLOCK_EXAMPLES,
  },
  areas: {
    title: 'Áreas da vida',
    text: [
      'Essas são as partes da sua vida que a gente cuida junto.',
      'Cada bloco pertence a uma área, e é assim que eu sei o que acender no céu.',
    ],
  },
  modelos: {
    title: 'Rotinas prontas',
    text: ['Modelos são receitas de rotina: um toque e eu crio uma rotina nova para você.', 'Use as sugestões ou salve as suas. Mudar um modelo não mexe nas rotinas que já existem.'],
  },
  'meus-modelos': {
    title: 'Meus modelos',
    text: ['Aqui ficam os modelos que você criou ou salvou a partir de uma rotina.', 'Eles servem só de ponto de partida: cada uso vira uma rotina independente.'],
  },
  colecao: {
    title: 'Coleção',
    text: ['Aqui ficam os troféus que a gente conquista juntos.', 'Cada um tem 4 níveis, e nenhum nível conquistado se perde.'],
  },
  cantinho: {
    title: 'Cantinho',
    text: [
      'Este é o meu cantinho. Cada dia em que você cuida de uma área acende estrelas no céu.',
      'Na aba Pet, em "Editar cantinho", você escolhe quais troféus ficam aqui comigo.',
    ],
  },
  perfil: {
    title: 'Perfil',
    text: ['Esse é o seu canto pessoal: seus números, a vitrine de troféus e as configurações.', 'Só você vê o que está aqui.'],
  },

  // Painéis
  'resumo-hoje': {
    title: 'Hoje',
    text: ['Esse anel mostra quanto do dia já foi feito.', 'Embaixo eu mostro o próximo bloco, para você não precisar pensar.'],
  },
  'minhas-rotinas': {
    title: 'Minhas rotinas',
    text: ['Suas rotinas, com quantos blocos têm e em que dias aparecem.', 'Toque numa para editar.'],
  },
  'os-pets': {
    title: 'Os pets',
    text: ['Somos nós! Cada pet tem um jeito e uma historinha.', 'Toque em "História" para conhecer melhor cada um.'],
  },
  'painel-do-dia': {
    title: 'Painel do dia',
    text: ['Os contadores do dia, em números grandes, para você ver de longe quanto falta.'],
  },
  revisao: {
    title: 'Revisão da noite',
    text: ['Um espaço para fechar o dia: o que funcionou, o que travou e o que mudar amanhã.', 'Só você lê isso.'],
  },
  favorito: {
    title: 'Favorito',
    text: ['Escolha quem vai te acompanhar. O favorito aparece em todo lugar e cresce com os seus dias ativos.'],
  },
  acessorios: {
    title: 'Acessórios',
    text: ['Cada acessório chega quando você alcança uma conquista.', 'Depois de liberado, é seu para sempre: é só vestir.'],
  },
  mes: {
    title: 'Mês',
    text: ['Cada quadradinho é um dia. Quanto mais forte a cor, mais blocos você concluiu.', 'Toque num dia para ver como ele foi.'],
  },
  vitrine: {
    title: 'Vitrine de troféus',
    text: ['Os seus troféus mais altos, para você lembrar do quanto já andou.'],
  },
  configuracoes: {
    title: 'Configurações',
    text: ['Fuso horário, seus dados e a conta.', 'Daqui também dá para rever o tour comigo.'],
  },
} satisfies Record<string, HelpEntry>

export type HelpKey = keyof typeof HELP

/** Paradas do tour ("Rever o tour", no Perfil). Todas ficam na tela Início. */
export const TOUR: { key: HelpKey; text: string }[] = [
  { key: 'inicio', text: 'Oi! Vou te mostrar o caminho. Em todo lugar com este "?" eu explico o que é aquilo.' },
  { key: 'cantinho', text: 'Este é o meu cantinho. As estrelas do céu acendem com as áreas que você cuida na semana.' },
  { key: 'resumo-hoje', text: 'Aqui você vê o dia num relance: quanto já foi feito e qual é o próximo bloco.' },
  { key: 'areas', text: 'Essas são as suas áreas da vida. Dá para renomear, trocar a cor e criar outras.' },
  { key: 'modelos', text: 'Sem ideia de por onde começar? Use uma rotina pronta ou salve as suas como modelo.' },
]
