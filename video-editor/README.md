# Studio Zero — Editor de Vídeo

Editor de vídeo no navegador feito com [Remotion](https://www.remotion.dev). O preview usa o
`@remotion/player` e a exportação roda **no próprio navegador** com `@remotion/web-renderer`
(sem servidor). Também dá para renderizar no computador com o renderizador completo do Remotion.

## Como rodar

```sh
cd video-editor
npm install
npm run dev        # abre em http://localhost:5174
```

Use Chrome ou Edge (a exportação depende de WebCodecs).

## O que dá para fazer

- **Importar mídia**: arraste vídeos, áudios e imagens para a biblioteca (duração e resolução são lidas com Mediabunny).
- **Linha do tempo com várias faixas**: arraste clipes para mover (inclusive entre faixas), puxe as bordas para cortar
  início/fim, com *snap* nas bordas dos outros clipes e no cursor. Faixas mais altas ficam por cima.
- **Preview interativo**: clique num elemento para selecionar, arraste para mover, use o canto para redimensionar
  (Shift redimensiona livremente).
- **Textos** com fonte, tamanho, peso, cor, fundo, alinhamento e animação de entrada (subir, pop, máquina de escrever).
- **Cores sólidas**, opacidade, rotação, enquadramento (preencher/encaixar/esticar), fade in/out.
- **Volume e velocidade** (0,25x a 4x) de vídeos e áudios.
- **Formatos**: 16:9, 9:16 (Reels/Stories), 1:1, 4:5; 24–60 fps.
- **Desfazer/refazer**, salvamento automático no navegador, salvar/abrir projeto em `.json`.
- **Exportar** em MP4 (H.264) ou WebM, em resolução cheia ou metade.

### Atalhos

| Tecla | Ação |
| --- | --- |
| Espaço | Reproduzir / pausar |
| ← / → (Shift: 1 s) | Voltar / avançar quadro |
| S | Dividir clipe selecionado no cursor (ou todos sob o cursor) |
| Ctrl+D | Duplicar clipe |
| Delete | Excluir clipe |
| Ctrl+Z / Ctrl+Shift+Z | Desfazer / refazer |

## Projetos salvos e mídia

Os arquivos importados ficam só na memória da aba. Ao salvar/reabrir um projeto, ele guarda o **nome** dos arquivos;
os que faltarem aparecem em vermelho na biblioteca — importe-os de novo (mesmo nome) que eles são religados.

## Renderizar no computador (opcional)

Para vídeos longos, ou para usar o renderizador completo:

```sh
npm run render -- meu-projeto.json pasta-com-as-midias saida.mp4
```

A pasta de mídia deve conter os arquivos com os mesmos nomes usados no projeto. Para usar um Chrome já instalado em vez
de baixar o Chrome Headless Shell, defina `REMOTION_BROWSER_EXECUTABLE=/caminho/do/chrome`.

`npm run studio` abre o Remotion Studio com a composição `Editor` (útil para desenvolver novos efeitos).

## Estrutura

```
src/
  types.ts                 modelo do projeto (mídias, clipes, faixas)
  remotion/Main.tsx        composição Remotion que desenha o projeto
  remotion/Root.tsx        registro da composição (Studio / render no Node)
  editor/                  interface: biblioteca, preview, linha do tempo, inspetor, exportação
scripts/render.mjs         render no Node a partir de um projeto salvo
.agents/skills             Agent Skills do Remotion (npx skills add remotion-dev/skills)
```

## Licença do Remotion

O Remotion é gratuito para pessoas físicas e empresas com até 3 funcionários. Empresas maiores precisam de uma
[licença de empresa](https://remotion.pro/license); nesse caso troque `licenseKey: "free-license"` em
`src/editor/ExportDialog.tsx` pela sua chave.
