import json, sys, wave
import numpy as np
from faster_whisper import WhisperModel
model_dir, audio, out = sys.argv[1:4]
m = WhisperModel(model_dir, device="cpu", compute_type="int8")
with wave.open(audio) as f:
    pcm = np.frombuffer(f.readframes(f.getnframes()), dtype=np.int16).astype(np.float32) / 32768
segs, info = m.transcribe(pcm, language="pt", word_timestamps=True, vad_filter=False,
    initial_prompt="iFood, 99Food, WhatsApp, ChatGPT, CMV, delivery, restaurante.")
words, lines = [], []
for s in segs:
    lines.append(f"[{s.start:6.2f}-{s.end:6.2f}] {s.text.strip()}")
    for w in s.words:
        words.append({"w": w.word, "s": round(w.start, 2), "e": round(w.end, 2)})
json.dump(words, open(out, "w"), ensure_ascii=False)
print("\n".join(lines))
