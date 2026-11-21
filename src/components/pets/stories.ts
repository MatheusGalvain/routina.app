import type { PetKind } from '../../types'
import type { EyeStyle } from './pets'
import type { DecoId } from './Deco'

export type SceneAction =
  /** Só um botão de continuar. */
  | { type: 'next'; label?: string }
  /** Toque no pet N vezes para avançar. */
  | { type: 'tap'; hint: string; times: number; done: string }
  /** Escolha entre opções; cada uma tem uma resposta do pet. */
  | { type: 'choice'; options: { label: string; reply: string; mood?: EyeStyle }[] }
  /** Última cena. */
  | { type: 'end'; moral: string }

export interface Scene {
  text: string
  /** Gradiente de fundo da cena (topo, base). */
  sky: [string, string]
  mood?: EyeStyle
  /** Enfeites que flutuam ao redor do pet. */
  deco?: DecoId[]
  action: SceneAction
}

export interface PetStory {
  title: string
  scenes: Scene[]
}

const NIGHT: [string, string] = ['#1B1440', '#0C0D13']
const DAWN: [string, string] = ['#3B2A4A', '#141826']
const DAY: [string, string] = ['#12324F', '#0F1622']
const POND: [string, string] = ['#0F3A2A', '#0C1712']
const SEA: [string, string] = ['#0B2A55', '#0A1020']
const SUN: [string, string] = ['#4A3510', '#16130C']
const EMBER: [string, string] = ['#4A1422', '#170C10']

export const STORIES: Record<PetKind, PetStory> = {
  gatinho: {
    title: 'O Gatinho e o primeiro passo',
    scenes: [
      {
        sky: DAWN,
        mood: 'closed',
        deco: ['cloud', 'moon'],
        text: 'O sol ainda está nascendo. O Gatinho está enroladinho no travesseiro, sonhando com novelos de lã.',
        action: { type: 'tap', hint: 'Toque no Gatinho para acordá-lo', times: 3, done: 'Ele se espreguiça bem devagarinho… miau!' },
      },
      {
        sky: DAY,
        deco: ['note', 'sparkle'],
        text: 'Acordado, o Gatinho olha para a lista do dia. Tem tanta coisa ali! Por onde começar?',
        action: {
          type: 'choice',
          options: [
            { label: 'Pela tarefa mais fácil', reply: 'Boa! Uma vitória rapidinha deixa o resto mais leve.', mood: 'happy' },
            { label: 'Pela mais importante', reply: 'Corajoso! Enquanto a energia está alta, dá pra encarar o difícil.', mood: 'open' },
            { label: 'Tomar um café antes', reply: 'Justo. Primeiro o café, depois o mundo.', mood: 'happy' },
          ],
        },
      },
      {
        sky: DAY,
        deco: ['play'],
        text: 'O Gatinho sabe de um segredo: ninguém precisa terminar tudo de uma vez. Só precisa dar o play no primeiro bloco.',
        action: { type: 'tap', hint: 'Toque para dar o play junto com ele', times: 1, done: 'Play! O dia começou.' },
      },
      {
        sky: DAY,
        mood: 'happy',
        deco: ['yarn', 'star'],
        text: 'E lá vai ele, rabinho em pé, rumo ao primeiro bloco. Depois do primeiro passo, o segundo é sempre mais fácil.',
        action: { type: 'end', moral: 'Começar é metade do caminho.' },
      },
    ],
  },

  sapinho: {
    title: 'O Sapinho e as vitórias-régias',
    scenes: [
      {
        sky: POND,
        deco: ['lotus', 'lotus', 'lotus'],
        text: 'No meio da lagoa, o Sapinho quer chegar até a ilha do outro lado. O caminho são três vitórias-régias.',
        action: { type: 'next', label: 'Vamos lá!' },
      },
      {
        sky: POND,
        deco: ['lotus', 'drop'],
        text: 'Cada vitória-régia é um hábito do dia: beber água, se mexer um pouco e ler uma página.',
        action: { type: 'tap', hint: 'Toque no Sapinho para pular', times: 3, done: 'Ploc, ploc, ploc! Três pulos, três hábitos!' },
      },
      {
        sky: POND,
        mood: 'happy',
        deco: ['confetti', 'sparkle'],
        text: 'Chegando na ilha, o Sapinho quer comemorar. Como ele deveria festejar?',
        action: {
          type: 'choice',
          options: [
            { label: 'Dancinha na folha', reply: 'Ele balança de um lado pro outro. Ninguém dança como um sapo feliz!', mood: 'happy' },
            { label: 'Coaxar bem alto', reply: 'CROAAAC! Até os peixinhos aplaudiram.', mood: 'happy' },
            { label: 'Descansar ao sol', reply: 'Comemorar também é descansar. Sábio, Sapinho.', mood: 'closed' },
          ],
        },
      },
      {
        sky: POND,
        mood: 'happy',
        deco: ['leaf', 'star'],
        text: 'Da ilha, ele olha para trás e vê o caminho que fez. Não foi um pulo gigante, foram vários pulinhos.',
        action: { type: 'end', moral: 'Pequenas vitórias, repetidas, viram grandes conquistas.' },
      },
    ],
  },

  polvinho: {
    title: 'O Polvinho e os oito tentáculos',
    scenes: [
      {
        sky: SEA,
        deco: ['phone', 'tv', 'cookie'],
        text: 'O Polvinho tem oito tentáculos, e cada um quer fazer uma coisa diferente: celular, série, biscoito…',
        action: { type: 'next', label: 'Oito ao mesmo tempo?!' },
      },
      {
        sky: SEA,
        mood: 'squint',
        deco: ['phone', 'bell'],
        text: 'Ele está tentando estudar, mas o celular não para de vibrar. O que ele faz?',
        action: {
          type: 'choice',
          options: [
            { label: 'Guardar na gaveta', reply: 'Gaveta fechada, mente aberta. Muito melhor!', mood: 'happy' },
            { label: 'Modo não perturbe', reply: 'Silêncio no oceano. Agora dá pra ouvir as próprias ideias.', mood: 'open' },
            { label: '"Só uma olhadinha…"', reply: 'Vinte minutos depois… ops. Ele respira fundo e guarda o celular.', mood: 'squint' },
          ],
        },
      },
      {
        sky: SEA,
        deco: ['bubble', 'bubble'],
        text: 'Hora de focar. O Polvinho precisa recolher os tentáculos, um por um, e deixar só um na tarefa.',
        action: { type: 'tap', hint: 'Toque para recolher os tentáculos', times: 7, done: 'Sete recolhidos, um no trabalho. Foco total!' },
      },
      {
        sky: SEA,
        mood: 'happy',
        deco: ['shell', 'sparkle'],
        text: 'Com um tentáculo de cada vez, o Polvinho termina o bloco muito mais rápido do que imaginava.',
        action: { type: 'end', moral: 'Uma coisa de cada vez rende mais que oito pela metade.' },
      },
    ],
  },

  pintinho: {
    title: 'O Pintinho e o relógio',
    scenes: [
      {
        sky: SUN,
        mood: 'squint',
        deco: ['clock'],
        text: 'O Pintinho olha o relógio e arregala os olhinhos: faltam só duas horas e ainda tem bastante coisa na lista!',
        action: { type: 'tap', hint: 'Toque para ele dar o alerta', times: 2, done: 'Piu! Piu! Alerta dado, sem pânico.' },
      },
      {
        sky: SUN,
        deco: ['note', 'scissors'],
        text: 'Não dá para fazer tudo. O Pintinho precisa decidir o que fica para amanhã.',
        action: {
          type: 'choice',
          options: [
            { label: 'Adiar o que não é urgente', reply: 'Isso! Urgente primeiro, o resto espera um pouquinho.', mood: 'happy' },
            { label: 'Fazer versões menores', reply: '10 minutos em vez de 30. Feito é melhor que perfeito!', mood: 'happy' },
            { label: 'Tentar fazer tudo correndo', reply: 'Ele corre, tropeça nas próprias patinhas… melhor escolher com calma.', mood: 'squint' },
          ],
        },
      },
      {
        sky: SUN,
        deco: ['wheat'],
        text: 'Com a lista mais curta, o Pintinho cisca tarefa por tarefa, sem afobação.',
        action: { type: 'next', label: 'Cisca, cisca…' },
      },
      {
        sky: DAWN,
        mood: 'happy',
        deco: ['sun', 'star'],
        text: 'O sol se põe e o essencial está feito. O Pintinho estufa o peito, orgulhoso.',
        action: { type: 'end', moral: 'Avisar cedo é cuidar, não é ter medo.' },
      },
    ],
  },

  ourico: {
    title: 'O Ouriço que pulou um bloco',
    scenes: [
      {
        sky: EMBER,
        mood: 'angry',
        deco: ['anger'],
        text: 'Hoje o Ouriço pulou o treino. Agora está todo espetado, bravo consigo mesmo.',
        action: { type: 'next', label: 'Ih, que bico…' },
      },
      {
        sky: EMBER,
        mood: 'angry',
        deco: ['wind'],
        text: 'Espinho em pé não ajuda ninguém. Que tal ajudar o Ouriço a respirar fundo?',
        action: { type: 'tap', hint: 'Toque devagar para acalmá-lo', times: 4, done: 'Inspira… expira… os espinhos vão abaixando.' },
      },
      {
        sky: DAWN,
        mood: 'open',
        deco: ['question'],
        text: 'Mais calmo, o Ouriço pensa: e agora, o que fazer com o bloco pulado?',
        action: {
          type: 'choice',
          options: [
            { label: 'Fazer uma versão curtinha', reply: 'Cinco minutos de alongamento já contam. E contam muito!', mood: 'happy' },
            { label: 'Remarcar pra amanhã', reply: 'Amanhã ele volta, sem culpa. O plano continua de pé.', mood: 'happy' },
            { label: 'Ficar remoendo', reply: 'Ele remói… remói… e percebe que isso cansa mais que o treino. Melhor seguir.', mood: 'squint' },
          ],
        },
      },
      {
        sky: DAY,
        mood: 'happy',
        deco: ['apple', 'sprout'],
        text: 'O Ouriço sorri. Pular um bloco não apaga todos os outros que ele já fez.',
        action: { type: 'end', moral: 'Um dia ruim não define a rotina. Recomeçar faz parte.' },
      },
    ],
  },

  corujinha: {
    title: 'A Corujinha e a noite tranquila',
    scenes: [
      {
        sky: NIGHT,
        mood: 'open',
        deco: ['moon', 'star', 'star'],
        text: 'A noite chegou. A Corujinha pousa no galho mais alto para olhar o dia que passou.',
        action: { type: 'next', label: 'Hu-hu…' },
      },
      {
        sky: NIGHT,
        deco: ['bulb', 'bulb', 'bulb'],
        text: 'Ainda tem luzes acesas por todo lado: telas, pensamentos, listas. Hora de apagar uma por uma.',
        action: { type: 'tap', hint: 'Toque para apagar as luzes', times: 3, done: 'Clic, clic, clic. Tudo escurinho e calmo.' },
      },
      {
        sky: NIGHT,
        mood: 'happy',
        deco: ['heart'],
        text: 'Antes de dormir, a Corujinha sempre escolhe uma coisa boa do dia. Qual vai ser hoje?',
        action: {
          type: 'choice',
          options: [
            { label: 'Uma tarefa concluída', reply: 'Feito é feito! Ela guarda essa no coração.', mood: 'happy' },
            { label: 'Uma conversa boa', reply: 'Pessoas queridas fazem qualquer dia valer a pena.', mood: 'happy' },
            { label: 'Ter descansado', reply: 'Descansar também é produtivo. A Corujinha aprova.', mood: 'closed' },
          ],
        },
      },
      {
        sky: NIGHT,
        mood: 'closed',
        deco: ['zz', 'star'],
        text: 'Ela fecha os olhinhos devagar. Amanhã tem um dia novinho esperando.',
        action: { type: 'end', moral: 'Descanso é parte da rotina, não o fim dela.' },
      },
    ],
  },
}
