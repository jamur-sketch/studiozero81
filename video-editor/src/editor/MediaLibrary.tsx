import React, { useRef, useState } from "react";
import type { Asset } from "../types";
import { clipFromAsset, newSolidClip, newTextClip, probeFile } from "./ops";
import type { ProjectStore } from "./useProjectStore";

type Props = {
  store: ProjectStore;
  frame: number;
  onSelect: (id: string) => void;
};

const icon = (a: Asset) => ({ video: "🎬", audio: "🎵", image: "🖼️" })[a.kind];

export const MediaLibrary: React.FC<Props> = ({ store, frame, onSelect }) => {
  const { project, update } = store;
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const importFiles = async (files: FileList | File[]) => {
    setBusy(true);
    setError(null);
    const errors: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const asset = await probeFile(file);
        update((p) => {
          // A file with the same name re-links a missing asset (e.g. after opening a saved project).
          const missing = p.assets.find((a) => a.name === asset.name && !a.src);
          if (missing) {
            return {
              ...p,
              assets: p.assets.map((a) => (a.id === missing.id ? { ...asset, id: missing.id } : a)),
            };
          }
          return { ...p, assets: [...p.assets, asset] };
        });
      } catch (e) {
        errors.push((e as Error).message);
      }
    }
    if (errors.length) setError(errors.join("\n"));
    setBusy(false);
  };

  const addToTimeline = (asset: Asset) => {
    const clip = clipFromAsset(asset, project, frame);
    update((p) => ({ ...p, clips: [...p.clips, clip] }));
    onSelect(clip.id);
  };

  const removeAsset = (asset: Asset) => {
    const used = project.clips.some((c) => "assetId" in c && c.assetId === asset.id);
    if (used && !confirm(`"${asset.name}" está na linha do tempo. Remover a mídia e seus clipes?`)) return;
    update((p) => ({
      ...p,
      assets: p.assets.filter((a) => a.id !== asset.id),
      clips: p.clips.filter((c) => !("assetId" in c && c.assetId === asset.id)),
    }));
  };

  return (
    <div className="library">
      <div className="quick-add">
        <button
          onClick={() => {
            const clip = newTextClip(project, frame);
            update((p) => ({ ...p, clips: [...p.clips, clip] }));
            onSelect(clip.id);
          }}
        >
          + Texto
        </button>
        <button
          onClick={() => {
            const clip = newSolidClip(project, frame);
            update((p) => ({ ...p, clips: [...p.clips, clip] }));
            onSelect(clip.id);
          }}
        >
          + Cor
        </button>
      </div>

      <div
        className={`dropzone ${dragOver ? "over" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void importFiles(e.dataTransfer.files);
        }}
      >
        {busy ? "Importando…" : "Arraste vídeos, áudios e imagens aqui ou clique para escolher"}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="video/*,audio/*,image/*"
          hidden
          onChange={(e) => {
            if (e.target.files) void importFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className="error">{error}</p>}

      <ul className="assets">
        {project.assets.map((a) => (
          <li key={a.id} className={a.src ? "" : "missing"}>
            <span className="asset-icon">{icon(a)}</span>
            <div className="asset-info">
              <span className="asset-name" title={a.name}>
                {a.name}
              </span>
              <small>
                {a.src
                  ? [
                      a.durationInSeconds ? `${a.durationInSeconds.toFixed(1)}s` : null,
                      a.width ? `${a.width}×${a.height}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : "Arquivo ausente — importe-o de novo"}
              </small>
            </div>
            <button title="Adicionar no cursor" disabled={!a.src} onClick={() => addToTimeline(a)}>
              +
            </button>
            <button title="Remover" className="ghost" onClick={() => removeAsset(a)}>
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
