import {
  canRenderMediaOnWeb,
  renderMediaOnWeb,
  type WebRendererContainer,
  type WebRendererQuality,
} from "@remotion/web-renderer";
import React, { useRef, useState } from "react";
import { Main } from "../remotion/Main";
import { COMPOSITION_ID } from "../remotion/Root";
import { getProjectDuration, type Project } from "../types";

type Props = { project: Project; onClose: () => void };

type Status =
  | { state: "idle" }
  | { state: "rendering"; progress: number }
  | { state: "done"; url: string; fileName: string; seconds: number }
  | { state: "error"; message: string };

const QUALITIES: { value: WebRendererQuality; label: string }[] = [
  { value: "medium", label: "Média (arquivo menor)" },
  { value: "high", label: "Alta" },
  { value: "very-high", label: "Muito alta" },
];

export const ExportDialog: React.FC<Props> = ({ project, onClose }) => {
  const [container, setContainer] = useState<WebRendererContainer>("mp4");
  const [quality, setQuality] = useState<WebRendererQuality>("high");
  const [scale, setScale] = useState(1);
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  const missing = project.assets.filter(
    (a) => !a.src && project.clips.some((c) => "assetId" in c && c.assetId === a.id),
  );

  const start = async () => {
    const width = Math.round(project.width * scale);
    const height = Math.round(project.height * scale);
    const check = await canRenderMediaOnWeb({ container, width, height });
    const errors = check.issues.filter((i) => i.severity === "error");
    if (!check.canRender) {
      setStatus({ state: "error", message: errors.map((i) => i.message).join("\n") || "Navegador sem suporte." });
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    const startedAt = performance.now();
    setStatus({ state: "rendering", progress: 0 });
    try {
      const result = await renderMediaOnWeb({
        composition: {
          id: COMPOSITION_ID,
          component: Main,
          width: project.width,
          height: project.height,
          fps: project.fps,
          durationInFrames: getProjectDuration(project),
          defaultProps: { project },
        },
        inputProps: { project },
        container,
        videoBitrate: quality,
        scale,
        signal: controller.signal,
        licenseKey: "free-license",
        onProgress: (p) => setStatus({ state: "rendering", progress: p.progress }),
      });
      const blob = await result.getBlob();
      const safeName = project.name.trim().replace(/[^\p{L}\p{N}_-]+/gu, "-") || "video";
      setStatus({
        state: "done",
        url: URL.createObjectURL(blob),
        fileName: `${safeName}.${container}`,
        seconds: (performance.now() - startedAt) / 1000,
      });
    } catch (e) {
      if (controller.signal.aborted) {
        setStatus({ state: "idle" });
      } else {
        setStatus({ state: "error", message: (e as Error).message });
      }
    }
  };

  return (
    <div className="modal-backdrop" onClick={status.state === "rendering" ? undefined : onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Exportar vídeo</h2>

        {status.state === "idle" || status.state === "error" ? (
          <>
            <div className="grid2">
              <label className="field">
                <span>Formato</span>
                <select value={container} onChange={(e) => setContainer(e.target.value as WebRendererContainer)}>
                  <option value="mp4">MP4 (H.264)</option>
                  <option value="webm">WebM (VP8)</option>
                </select>
              </label>
              <label className="field">
                <span>Qualidade</span>
                <select value={quality} onChange={(e) => setQuality(e.target.value as WebRendererQuality)}>
                  {QUALITIES.map((q) => (
                    <option key={q.value} value={q.value}>
                      {q.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Resolução</span>
                <select value={scale} onChange={(e) => setScale(Number(e.target.value))}>
                  <option value={1}>
                    {project.width}×{project.height}
                  </option>
                  <option value={0.5}>
                    {project.width / 2}×{project.height / 2} (rápido)
                  </option>
                </select>
              </label>
            </div>
            {missing.length > 0 && (
              <p className="error">
                Arquivos ausentes: {missing.map((a) => a.name).join(", ")}. Importe-os de novo antes de exportar.
              </p>
            )}
            {status.state === "error" && <p className="error">{status.message}</p>}
            <p className="hint">
              A renderização acontece no seu navegador (Chrome ou Edge recomendados). Mantenha esta aba aberta até
              terminar.
            </p>
            <div className="modal-actions">
              <button className="ghost" onClick={onClose}>
                Cancelar
              </button>
              <button className="primary" disabled={missing.length > 0} onClick={() => void start()}>
                Renderizar
              </button>
            </div>
          </>
        ) : status.state === "rendering" ? (
          <>
            <div className="progress">
              <div style={{ width: `${Math.round(status.progress * 100)}%` }} />
            </div>
            <p>{Math.round(status.progress * 100)}% renderizado…</p>
            <div className="modal-actions">
              <button className="ghost" onClick={() => abortRef.current?.abort()}>
                Cancelar renderização
              </button>
            </div>
          </>
        ) : (
          <>
            <p>Pronto em {status.seconds.toFixed(1)}s.</p>
            <video src={status.url} controls className="result" />
            <div className="modal-actions">
              <button className="ghost" onClick={onClose}>
                Fechar
              </button>
              <a className="button primary" href={status.url} download={status.fileName}>
                Baixar {status.fileName}
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
