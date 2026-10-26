import React from "react";
import type { Clip, Project, TextClip } from "../types";
import { clamp, maxClipDuration } from "./ops";
import type { ProjectStore } from "./useProjectStore";

const FONTS = [
  { label: "Inter", value: "Inter, system-ui, sans-serif" },
  { label: "Arial Black", value: "'Arial Black', Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Impact", value: "Impact, 'Arial Narrow Bold', sans-serif" },
  { label: "Courier", value: "'Courier New', monospace" },
  { label: "Trebuchet", value: "'Trebuchet MS', sans-serif" },
];

type Props = {
  store: ProjectStore;
  selectedId: string | null;
};

const Num: React.FC<{
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}> = ({ label, value, onChange, min, max, step = 1, suffix }) => (
  <label className="field">
    <span>{label}</span>
    <div className="num">
      <input
        type="number"
        value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (!Number.isNaN(v)) onChange(clamp(v, min ?? -Infinity, max ?? Infinity));
        }}
      />
      {suffix && <em>{suffix}</em>}
    </div>
  </label>
);

const Range: React.FC<{
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
}> = ({ label, value, onChange, min, max, step, format }) => (
  <label className="field">
    <span>
      {label} <b>{format ? format(value) : value}</b>
    </span>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  </label>
);

export const Inspector: React.FC<Props> = ({ store, selectedId }) => {
  const { project, update, commit } = store;
  const clip = project.clips.find((c) => c.id === selectedId);

  if (!clip) {
    return <ProjectSettings store={store} />;
  }

  const set = (patch: Partial<Clip>, field: string) =>
    update(
      (p) => ({
        ...p,
        clips: p.clips.map((c) => (c.id === clip.id ? ({ ...c, ...patch } as Clip) : c)),
      }),
      `inspector-${clip.id}-${field}`,
    );

  const fps = project.fps;
  const seconds = (f: number) => `${(f / fps).toFixed(2)}s`;
  const hasBox = clip.type !== "audio";
  const isMedia = clip.type === "video" || clip.type === "audio";

  return (
    <div className="inspector" onBlur={commit}>
      <h3>{labelFor(clip)}</h3>
      <label className="field">
        <span>Nome</span>
        <input value={clip.name} onChange={(e) => set({ name: e.target.value }, "name")} />
      </label>

      {clip.type === "text" && <TextFields clip={clip} set={set} />}

      {clip.type === "solid" && (
        <label className="field">
          <span>Cor</span>
          <input type="color" value={clip.color} onChange={(e) => set({ color: e.target.value }, "color")} />
        </label>
      )}

      <fieldset>
        <legend>Tempo</legend>
        <div className="grid2">
          <Num label="Início (s)" value={clip.from / fps} min={0} step={0.1} onChange={(v) => set({ from: Math.round(v * fps) }, "from")} />
          <Num
            label="Duração (s)"
            value={clip.durationInFrames / fps}
            min={1 / fps}
            max={maxClipDuration(clip, project) / fps}
            step={0.1}
            onChange={(v) => set({ durationInFrames: Math.max(1, Math.round(v * fps)) }, "duration")}
          />
          {isMedia && (
            <Num
              label="Corte inicial (s)"
              value={clip.trimBefore / fps}
              min={0}
              step={0.1}
              onChange={(v) => set({ trimBefore: Math.round(v * fps) }, "trim")}
            />
          )}
          <Num label="Faixa" value={clip.track + 1} min={1} onChange={(v) => set({ track: Math.round(v) - 1 }, "track")} />
        </div>
        <Range label="Fade in" value={clip.fadeIn} min={0} max={Math.min(3 * fps, clip.durationInFrames)} step={1} format={seconds} onChange={(v) => set({ fadeIn: v }, "fadeIn")} />
        <Range label="Fade out" value={clip.fadeOut} min={0} max={Math.min(3 * fps, clip.durationInFrames)} step={1} format={seconds} onChange={(v) => set({ fadeOut: v }, "fadeOut")} />
      </fieldset>

      {isMedia && (
        <fieldset>
          <legend>Áudio e velocidade</legend>
          <Range label="Volume" value={clip.volume} min={0} max={2} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ volume: v }, "volume")} />
          <Range
            label="Velocidade"
            value={clip.playbackRate}
            min={0.25}
            max={4}
            step={0.25}
            format={(v) => `${v}x`}
            onChange={(v) =>
              set(
                {
                  playbackRate: v,
                  durationInFrames: Math.max(1, Math.round((clip.durationInFrames * clip.playbackRate) / v)),
                },
                "rate",
              )
            }
          />
        </fieldset>
      )}

      {hasBox && (
        <fieldset>
          <legend>Posição e aparência</legend>
          <div className="grid2">
            <Num label="X" suffix="%" value={clip.x} step={0.5} onChange={(v) => set({ x: v }, "x")} />
            <Num label="Y" suffix="%" value={clip.y} step={0.5} onChange={(v) => set({ y: v }, "y")} />
            <Num label="Largura" suffix="%" value={clip.width} min={1} step={0.5} onChange={(v) => set({ width: v }, "w")} />
            <Num label="Altura" suffix="%" value={clip.height} min={1} step={0.5} onChange={(v) => set({ height: v }, "h")} />
          </div>
          <Range label="Opacidade" value={clip.opacity} min={0} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ opacity: v }, "opacity")} />
          <Range label="Rotação" value={clip.rotation} min={-180} max={180} step={1} format={(v) => `${v}°`} onChange={(v) => set({ rotation: v }, "rotation")} />
          {(clip.type === "video" || clip.type === "image") && (
            <label className="field">
              <span>Enquadramento</span>
              <select value={clip.fit} onChange={(e) => set({ fit: e.target.value as "cover" }, "fit")}>
                <option value="cover">Preencher (cortar)</option>
                <option value="contain">Encaixar</option>
                <option value="fill">Esticar</option>
              </select>
            </label>
          )}
          <button
            className="ghost"
            onClick={() => set({ x: 0, y: 0, width: 100, height: 100, rotation: 0 }, "fullscreen")}
          >
            Tela cheia
          </button>
        </fieldset>
      )}
    </div>
  );
};

const labelFor = (clip: Clip) =>
  ({ video: "Vídeo", image: "Imagem", audio: "Áudio", text: "Texto", solid: "Cor sólida" })[clip.type];

const TextFields: React.FC<{ clip: TextClip; set: (patch: Partial<TextClip>, field: string) => void }> = ({
  clip,
  set,
}) => (
  <fieldset>
    <legend>Texto</legend>
    <textarea rows={3} value={clip.text} onChange={(e) => set({ text: e.target.value }, "text")} />
    <div className="grid2">
      <label className="field">
        <span>Fonte</span>
        <select value={clip.fontFamily} onChange={(e) => set({ fontFamily: e.target.value }, "font")}>
          {FONTS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </label>
      <Num label="Tamanho" value={clip.fontSize} min={8} onChange={(v) => set({ fontSize: v }, "size")} />
      <label className="field">
        <span>Peso</span>
        <select value={clip.fontWeight} onChange={(e) => set({ fontWeight: Number(e.target.value) }, "weight")}>
          {[300, 400, 600, 700, 800, 900].map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Alinhamento</span>
        <select value={clip.align} onChange={(e) => set({ align: e.target.value as TextClip["align"] }, "align")}>
          <option value="left">Esquerda</option>
          <option value="center">Centro</option>
          <option value="right">Direita</option>
        </select>
      </label>
      <label className="field">
        <span>Cor</span>
        <input type="color" value={clip.color} onChange={(e) => set({ color: e.target.value }, "color")} />
      </label>
      <label className="field">
        <span>Fundo</span>
        <div className="row">
          <input
            type="color"
            value={clip.background === "transparent" ? "#000000" : clip.background}
            onChange={(e) => set({ background: e.target.value }, "bg")}
          />
          <label className="check">
            <input
              type="checkbox"
              checked={clip.background === "transparent"}
              onChange={(e) => set({ background: e.target.checked ? "transparent" : "#000000" }, "bg")}
            />
            Sem
          </label>
        </div>
      </label>
    </div>
    <label className="field">
      <span>Animação de entrada</span>
      <select value={clip.animation} onChange={(e) => set({ animation: e.target.value as TextClip["animation"] }, "anim")}>
        <option value="none">Nenhuma</option>
        <option value="slide-up">Subir</option>
        <option value="pop">Pop</option>
        <option value="typewriter">Máquina de escrever</option>
      </select>
    </label>
  </fieldset>
);

const PRESETS = [
  { label: "16:9 Paisagem (1920×1080)", width: 1920, height: 1080 },
  { label: "9:16 Stories/Reels (1080×1920)", width: 1080, height: 1920 },
  { label: "1:1 Quadrado (1080×1080)", width: 1080, height: 1080 },
  { label: "4:5 Feed (1080×1350)", width: 1080, height: 1350 },
];

const ProjectSettings: React.FC<{ store: ProjectStore }> = ({ store }) => {
  const { project, update } = store;
  const set = (patch: Partial<Project>, field: string) =>
    update((p) => ({ ...p, ...patch }), `project-${field}`);
  const preset = PRESETS.findIndex((p) => p.width === project.width && p.height === project.height);

  return (
    <div className="inspector" onBlur={store.commit}>
      <h3>Projeto</h3>
      <label className="field">
        <span>Nome</span>
        <input value={project.name} onChange={(e) => set({ name: e.target.value }, "name")} />
      </label>
      <label className="field">
        <span>Formato</span>
        <select
          value={preset}
          onChange={(e) => {
            const p = PRESETS[Number(e.target.value)];
            if (p) set({ width: p.width, height: p.height }, "size");
          }}
        >
          {preset === -1 && <option value={-1}>Personalizado ({project.width}×{project.height})</option>}
          {PRESETS.map((p, i) => (
            <option key={p.label} value={i}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Quadros por segundo</span>
        <select
          value={project.fps}
          onChange={(e) => {
            const fps = Number(e.target.value);
            const k = fps / project.fps;
            // Keep clip timings in seconds when the frame rate changes.
            update((p) => ({
              ...p,
              fps,
              clips: p.clips.map((c) => ({
                ...c,
                from: Math.round(c.from * k),
                durationInFrames: Math.max(1, Math.round(c.durationInFrames * k)),
                fadeIn: Math.round(c.fadeIn * k),
                fadeOut: Math.round(c.fadeOut * k),
                ...(c.type === "video" || c.type === "audio" ? { trimBefore: Math.round(c.trimBefore * k) } : {}),
              })),
            }));
          }}
        >
          {[24, 25, 30, 50, 60].map((f) => (
            <option key={f} value={f}>
              {f} fps
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Cor de fundo</span>
        <input type="color" value={project.background} onChange={(e) => set({ background: e.target.value }, "bg")} />
      </label>
      <p className="hint">Selecione um clipe na linha do tempo ou no preview para editar suas propriedades.</p>
    </div>
  );
};
