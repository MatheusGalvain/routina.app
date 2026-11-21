# rotina.app

App de organização de rotina com pets animados.

## Rodar

```bash
npm install
npm run dev
```

## Stack

React 19 + Vite + TypeScript · Tailwind CSS 4 · Framer Motion (pets e reordenação) · Zustand com persistência no localStorage.

## Como funciona

- **Rotina**: nome, cor, dias da semana e uma lista de blocos. A ordem da lista é a ordem do dia (horário flexível).
- **Bloco**: três tipos.
  - **Hábito**: marca feito ou não, todo dia.
  - **Contador**: soma até uma meta (água, páginas, pomodoros), com passo configurável.
  - **Tarefa**: depois de feita, some dos dias seguintes.
- **Registro**: o que aconteceu em cada dia (feito, pulado, valor), separado do plano.

## Pets

| Estado | Pet | Quando aparece |
|---|---|---|
| Guia | Gatinho | nada em andamento |
| Foco | Polvinho | um bloco foi iniciado |
| Atenção | Pintinho | contador pela metade ou dia apertando à noite |
| Concluído | Sapinho | reação ao concluir um bloco |
| Pulado | Ouriço | reação ao pular um bloco |
| Descanso | Corujinha | tudo do dia feito |

Os pets flutuam, respiram, piscam sozinhos, reagem ao clique e trocam de forma com transição.

## Estrutura

```
src/
├─ components/pets/   Pet.tsx (animação) e pets.tsx (formas e estados)
├─ components/ui/     Panel, ProgressRing, Bar, Logo, Icon
├─ pages/             Inicio, Hoje (modo dia), Rotinas (editor)
├─ store/useRotina.ts estado e persistência
├─ lib/               datas, lista do dia e lógica do pet
└─ data/              áreas da vida e rotinas prontas
```
