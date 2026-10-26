import type { PlayerRef } from "@remotion/player";
import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { Inspector } from "./editor/Inspector";
import { MediaLibrary } from "./editor/MediaLibrary";
import { serializableProject, splitClip, uid } from "./editor/ops";
import { Preview } from "./editor/Preview";
import { Timeline } from "./editor/Timeline";
import { useProjectStore } from "./editor/useProjectStore";
import { sampleProject } from "./remotion/sample";
import { getProjectDuration, type Project } from "./types";

// The web renderer is heavy; load it only when exporting.
const ExportDialog = lazy(() => import("./editor/ExportDialog").then((m) => ({ default: m.ExportDialog })));

export const App: React.FC = () => {
  const store = useProjectStore();
  const { project, update, undo, redo } = store;
  const playerRef = useRef<PlayerRef | null>(null);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const openRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const onFrame = (e: { detail: { frame: number } }) => setFrame(e.detail.frame);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    player.addEventListener("frameupdate", onFrame);
    player.addEventListener("play", onPlay);
    player.addEventListener("pause", onPause);
    return () => {
      player.removeEventListener("frameupdate", onFrame);
      player.removeEventListener("play", onPlay);
      player.removeEventListener("pause", onPause);
    };
  }, []);

  const seek = useCallback((f: number) => {
    const max = getProjectDuration(project) - 1;
    const target = Math.max(0, Math.min(max, f));
    playerRef.current?.seekTo(target);
    setFrame(target);
  }, [project]);

  const togglePlay = () => playerRef.current?.toggle();

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    update((p) => ({ ...p, clips: p.clips.filter((c) => c.id !== selectedId) }));
    setSelectedId(null);
  }, [selectedId, update]);

  const splitSelected = useCallback(() => {
    update((p) => {
      // Split the selected clip, or every clip under the playhead when nothing is selected.
      const targets = p.clips.filter((c) => (selectedId ? c.id === selectedId : true));
      let changed = false;
      const clips = p.clips.flatMap((c) => {
        if (!targets.includes(c)) return [c];
        const parts = splitClip(c, frame);
        if (!parts) return [c];
        changed = true;
        return parts;
      });
      return changed ? { ...p, clips } : p;
    });
  }, [frame, selectedId, update]);

  const duplicateSelected = useCallback(() => {
    const clip = project.clips.find((c) => c.id === selectedId);
    if (!clip) return;
    const copy = { ...clip, id: uid(), from: clip.from + clip.durationInFrames };
    update((p) => ({ ...p, clips: [...p.clips, copy] }));
    setSelectedId(copy.id);
  }, [project.clips, selectedId, update]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select")) return;
      const mod = e.ctrlKey || e.metaKey;
      if (e.code === "Space") {
        e.preventDefault();
        playerRef.current?.toggle();
      } else if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelected();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        deleteSelected();
      } else if (e.key.toLowerCase() === "s" && !mod) {
        splitSelected();
      } else if (e.key === "ArrowLeft") {
        seek(frame - (e.shiftKey ? project.fps : 1));
      } else if (e.key === "ArrowRight") {
        seek(frame + (e.shiftKey ? project.fps : 1));
      } else if (e.key === "Home") {
        seek(0);
      } else if (e.key === "Escape") {
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteSelected, duplicateSelected, frame, project.fps, redo, seek, splitSelected, undo]);

  const saveProject = () => {
    const data = JSON.stringify(serializableProject(project), null, 2);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([data], { type: "application/json" }));
    a.download = `${project.name || "projeto"}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const openProject = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as Project;
      if (!Array.isArray(parsed.clips) || !Array.isArray(parsed.assets)) throw new Error();
      store.replace(serializableProject(parsed));
      setSelectedId(null);
      seek(0);
    } catch {
      alert("Arquivo de projeto inválido.");
    }
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">▶</span> Studio Zero <small>editor de vídeo</small>
        </div>
        <div className="actions">
          <button className="ghost" onClick={undo} disabled={!store.canUndo} title="Desfazer (Ctrl+Z)">
            ↶
          </button>
          <button className="ghost" onClick={redo} disabled={!store.canRedo} title="Refazer (Ctrl+Shift+Z)">
            ↷
          </button>
          <span className="sep" />
          <button
            className="ghost"
            onClick={() => {
              if (confirm("Começar um projeto novo? O atual será descartado.")) {
                store.replace(sampleProject);
                setSelectedId(null);
                seek(0);
              }
            }}
          >
            Novo
          </button>
          <button className="ghost" onClick={() => openRef.current?.click()}>
            Abrir
          </button>
          <button className="ghost" onClick={saveProject}>
            Salvar
          </button>
          <input
            ref={openRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void openProject(f);
              e.target.value = "";
            }}
          />
          <button className="primary" onClick={() => setExporting(true)}>
            Exportar
          </button>
        </div>
      </header>

      <aside className="left-panel">
        <MediaLibrary store={store} frame={frame} onSelect={setSelectedId} />
      </aside>

      <main className="center">
        <Preview store={store} playerRef={playerRef} frame={frame} selectedId={selectedId} onSelect={setSelectedId} />
        <div className="transport">
          <button onClick={() => seek(0)} title="Início (Home)">⏮</button>
          <button onClick={() => seek(frame - 1)} title="Quadro anterior (←)">◀︎</button>
          <button className="play" onClick={togglePlay} title="Reproduzir/pausar (Espaço)">
            {playing ? "❚❚" : "▶"}
          </button>
          <button onClick={() => seek(frame + 1)} title="Próximo quadro (→)">▶︎</button>
          <span className="sep" />
          <button onClick={splitSelected} title="Dividir no cursor (S)">✂ Dividir</button>
          <button onClick={duplicateSelected} disabled={!selectedId} title="Duplicar (Ctrl+D)">⧉ Duplicar</button>
          <button onClick={deleteSelected} disabled={!selectedId} title="Excluir (Delete)">🗑 Excluir</button>
        </div>
      </main>

      <aside className="right-panel">
        <Inspector store={store} selectedId={selectedId} />
      </aside>

      <section className="bottom">
        <Timeline store={store} frame={frame} onSeek={seek} selectedId={selectedId} onSelect={setSelectedId} />
      </section>

      {exporting && (
        <Suspense fallback={null}>
          <ExportDialog project={project} onClose={() => setExporting(false)} />
        </Suspense>
      )}
    </div>
  );
};
