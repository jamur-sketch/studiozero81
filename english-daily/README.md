# English Daily

App de inglês para estudar um pouco todo dia: cada atividade começa revisando as frases que você errou e depois ensina frases novas. São 40 unidades (480 frases) em 4 níveis, com teste de nível, áudio e revisão espaçada.

- Funciona no celular como app instalado (tela cheia, ícone próprio, funciona sem internet depois de aberto uma vez).
- Não tem login nem servidor: o progresso de cada pessoa fica salvo no próprio celular. Na aba **Progresso** há um código de backup para levar o progresso para outro aparelho.
- Não usa nenhuma API paga.

## Colocar no ar (Vercel)

1. Entre em [vercel.com](https://vercel.com) com a sua conta do GitHub.
2. Clique em **Add New… → Project**.
3. Escolha o repositório **english-daily** e clique em **Import**.
4. Em **Framework Preset**, deixe **Other**. Não precisa mudar mais nada.
5. Clique em **Deploy**. Em menos de um minuto o app ganha um endereço, por exemplo `english-daily.vercel.app`.

Toda vez que algo for enviado para a branch `main` deste repositório, a Vercel publica a nova versão sozinha.

## Instalar no celular

- **iPhone:** abra o endereço no **Safari**, toque em **Compartilhar** e depois em **Adicionar à Tela de Início**.
- **Android:** abra no **Chrome**, toque nos **três pontinhos** e depois em **Instalar app**.

Cada pessoa instala no próprio celular e tem a própria trilha.

## Como o projeto está organizado

| Arquivo | O que tem |
| --- | --- |
| `content.js` | Todas as unidades: título, dica de gramática e as 12 frases de cada uma |
| `logic.js` | Montagem dos exercícios, correção das respostas e intervalos da revisão |
| `app.js` | Telas, progresso, backup e lições |
| `styles.css` | Visual |
| `sw.js` | Funcionamento offline |

## Adicionar unidades novas

Acrescente novas unidades no fim da lista `UNITS` em `content.js`, com um `id` novo (por exemplo `u41`), e aumente o número em `VERSION` no `sw.js` (por exemplo `ed-v2`) para os celulares baixarem a versão nova. Nunca mude o `id` de uma unidade que já existe: o progresso de cada pessoa é guardado por esse `id`.
