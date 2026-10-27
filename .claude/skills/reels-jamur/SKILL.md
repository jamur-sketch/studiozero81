---
name: reels-jamur
description: Edita Reels do Jamur (talking head) no padrão da marca, com Remotion. Use quando ele mandar uma gravação e um roteiro, pedir para "editar igual ao Reels do Toqan", ou pedir cortes, legendas, imagens, transições ou capítulos num vídeo.
---

# Reels do Jamur

O modelo fica em `video-editor/reels/`. Cada vídeo é um arquivo de configuração em
`src/edits/<id>.ts` (só dados); os recursos visuais ficam em `src/components/`.
Exemplos: `src/edits/completo.ts` (vídeo inteiro, ~98 s) e `src/edits/toqan.ts` (trecho de 30 s).

## Fluxo

1. **Preparar** a gravação (vertical, 30 fps, áudio tratado) em `reels/public/<id>.mp4`:
   ```sh
   ffmpeg -i ORIGINAL.MOV -vf "fps=30,scale=1080:1920:flags=lanczos,format=yuv420p" -c:v libx264 -crf 18 \
     -af "highpass=f=80,afftdn=nf=-30,loudnorm=I=-14:TP=-1.5:LRA=9" -ar 48000 -c:a aac -b:a 192k reels/public/<id>.mp4
   ```
2. **Transcrever** com tempo por palavra (`python3 -m venv .venv && .venv/bin/pip install faster-whisper`):
   ```sh
   ffmpeg -i reels/public/<id>.mp4 -ac 1 -ar 16000 audio.wav
   .venv/bin/python reels/transcribe.py small audio.wav words.json
   ffmpeg -i reels/public/<id>.mp4 -af silencedetect=noise=-40dB:d=0.18 -f null -   # mapa de pausas
   ```
3. **Cortar**: ele regrava frases. Para cada frase do roteiro, escolher a melhor versão completa
   (em geral a última) e anotar em `cuts` (segundos da gravação, ~0,06 s de folga antes e ~0,1 s depois).
   Conferir montando só o áudio dos cortes e transcrevendo de novo: tem que sair igual ao roteiro.
4. **Legendas** (`captions`): transcrever o áudio já cortado e agrupar em frases de 2 a 6 palavras,
   com os tempos do vídeo editado. Corrigir nomes próprios conforme o roteiro.
5. **Camadas visuais**: preencher `cards`, `callouts`, `chapters` e `broll` (abaixo).
6. **Conferir quadros** e só então renderizar:
   ```sh
   node reels/render.mjs stills <id> 2 8 17.5   # reels/out/<id>-<s>.png
   node reels/render.mjs video <id>             # reels/out/<id>.mp4
   ```
   Registrar o novo edit em `src/Root.tsx` (`EDITS`).
7. **Tempo alvo**: se passar do tempo (ex.: 90 s), acelerar o vídeo pronto sem mudar o tom de voz
   (1,08x deixa 98 s em ~90 s):
   ```sh
   ffmpeg -i reels/out/<id>.mp4 -filter_complex "[0:v]setpts=PTS/1.08,fps=30[v];[0:a]atempo=1.08[a]" -map "[v]" -map "[a]" \
     -c:v libx264 -crf 18 -movflags +faststart -c:a aac -b:a 192k reels/out/<id>-1.08x.mp4
   ```

## Recursos (todos os tempos em segundos do vídeo editado)

| Recurso | Campo | Quando usar |
|---|---|---|
| Card de título | `cards` `type: "title"` | Gancho nos primeiros 3–5 s, sempre. Texto curto, uma parte em dourado (`highlight`). |
| Card de tópicos | `cards` `type: "points"` | Explicação em passos: o texto troca conforme a fala. Até ~6 palavras por tópico. |
| Card de datas | `cards` `type: "dates"` | Linha do tempo com 1 a 3 marcos que aparecem quando são ditos. |
| Comparação | `cards` `type: "compare"` | "X faz isso, Y faz aquilo": linhas que entram conforme a fala, com rodapé opcional. |
| Frase de fechamento | `cards` `type: "statement"` | Última ideia do vídeo; a linha `gold` é a frase de impacto. |
| Número em destaque | `callouts` | Um número forte (%, R$, "2 apps"). Um por vídeo, no máximo dois. |
| Capítulo | `chapters` | Cortina verde com título ao mudar de bloco do roteiro (ex.: Toqan → Zesto). 1 a 3 por vídeo; dura 1 s e cobre o rosto, então coloque onde a fala repete o título. |
| Tela dividida | `broll` `mode: "split"` | Mostrar algo enquanto ele fala: print, foto, gráfico. A imagem fica em cima, ele embaixo, a legenda na emenda. |
| Tela cheia | `broll` `mode: "full"` | Imagem que precisa de atenção total, 2–4 s. A voz continua. |
| Janela | `broll` `mode: "pip"` | Logo ou print pequeno na faixa de cima, no lugar de um card. |
| Gráfico em código | `broll.graphic` | Quando não há imagem real: hoje existe `kind: "chat"` (perguntas em balões). Novos tipos em `components/Graphics.tsx`. |
| Trilha | `music` | Arquivo em `public/`, volume 0,08–0,15. |
| Efeitos sonoros | `sfx: true` | Whoosh leve nas cortinas e imagens, "pop" baixo nos cards. Já ligados por padrão. |

Os cortes alternam zoom (1 / 1,12) automaticamente para disfarçar o salto.

## Regras

- **Imagens**: só fotos, prints e logos que ele mandar, ou de fonte oficial (imprensa da empresa).
  Ficam em `reels/public/` e o `label` diz a fonte. Nunca simular a tela de um app real; ilustração em
  código leva `label: "Ilustração"`. Não inventar números em gráficos.
- **Ritmo**: algo novo na tela a cada 3–6 s (card troca, imagem, número), mas uma coisa por vez.
  Cards e imagens na faixa de cima ou em tela dividida; nunca sobre o rosto.
- **Marca "Jamur"**: verde #13342B, dourado #D2B26B, creme #F2ECDF; Playfair Display 600 nos títulos,
  Inter no resto. Sem vermelho, emojis, sombras pesadas, gradientes chamativos ou títulos em caixa alta.
  Dourado só como destaque.
- **Áreas seguras (1080x1920)**: cards a partir de y=170; legendas em y≈1440; nada importante abaixo de
  y=1600 nem na faixa da direita entre y=1100 e 1700 (botões do Instagram).
- **Fatos**: datas e números na tela vêm do roteiro com fonte. Se não der para confirmar, avisar.
- Antes de entregar: conferir quadros em cada troca (gancho, capítulos, imagens, final) e a duração.
