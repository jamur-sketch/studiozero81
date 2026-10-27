# Reels do Jamur — processo de edição

Modelo usado no Reels "iFood e 99 lançaram um gerente de IA" (Toqan / Zesto).
Para um vídeo novo, siga os passos abaixo e peça ao Claude: "edita igual ao Reels do Toqan".

## 1. Preparar a gravação
Coloque o vídeo original em `reels/public/` e gere uma versão vertical, 30 fps e com áudio tratado:

```sh
ffmpeg -i ORIGINAL.MOV -vf "fps=30,scale=1080:1920:flags=lanczos,format=yuv420p" -c:v libx264 -crf 18 \
  -af "highpass=f=80,afftdn=nf=-30,loudnorm=I=-14:TP=-1.5:LRA=9" -ar 48000 -c:a aac -b:a 192k reels/public/src.mp4
```

## 2. Transcrever com o tempo de cada palavra
```sh
python3 -m venv .venv && .venv/bin/pip install faster-whisper
ffmpeg -i reels/public/src.mp4 -ac 1 -ar 16000 audio.wav
.venv/bin/python reels/transcribe.py small audio.wav words.json
```
Também ajuda o mapa de pausas: `ffmpeg -i reels/public/src.mp4 -af silencedetect=noise=-40dB:d=0.18 -f null -`

## 3. Escolher as melhores versões das frases
Na gravação há regravações da mesma frase. Para cada frase do roteiro, escolher a melhor versão
(normalmente a última completa) e anotar início/fim em segundos em `CUTS` (`src/Reel.tsx`), com
~0,06 s de folga antes e ~0,1 s depois. Conferir montando só o áudio e transcrevendo de novo:
o texto tem que sair igual ao roteiro, sem repetição.

## 4. Textos na tela (`src/Reel.tsx`)
- `CAPTIONS`: legendas em frases curtas, com o tempo de cada palavra no vídeo editado (palavra falada em dourado).
- Cards no topo (sobre a parede, acima do rosto): gancho nos primeiros ~4 s; depois um card por bloco do roteiro
  com os pontos principais trocando conforme a fala.
- Zoom de 1,12 alternado a cada corte, para disfarçar o salto.

## 5. Identidade "Jamur"
Verde #13342B, dourado #D2B26B, creme #F2ECDF. Playfair Display 600 nos títulos, Inter no resto.
Sem vermelho, sem emojis, sem sombras pesadas, títulos sem caixa alta.
Layout 1080x1920: cards a partir de y=170, legendas em y≈1440 (acima da área de legenda do Instagram).

## 6. Renderizar
```sh
node reels/render.mjs stills 2 9 20   # confere quadros em reels/out/
node reels/render.mjs video           # gera reels/out/reel.mp4
```
