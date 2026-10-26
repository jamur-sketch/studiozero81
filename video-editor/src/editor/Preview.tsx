import { Player, type PlayerRef } from "@remotion/player";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Main } from "../remotion/Main";
import { getProjectDuration, type Box, type Clip } from "../types";
import type { ProjectStore } from "./useProjectStore";

type Props = {
  store: ProjectStore;
  playerRef: React.RefObject<PlayerRef | null>;
  frame: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

const hasBox = (c: Clip): c is Clip & Box => c.type !== "audio";

export const Preview: React.FC<Props> = ({ store, playerRef, frame, selectedId, onSelect }) => {
  const { project, update, commit } = store;
  const areaRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  // Fit the canvas into the available area, keeping the aspect ratio.
  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const scale = Math.min(el.clientWidth / project.width, el.clientHeight / project.height);
      setSize({ width: project.width * scale, height: project.height * scale });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [project.width, project.height]);

  const duration = getProjectDuration(project);
  useEffect(() => {
    if (frame >= duration) playerRef.current?.seekTo(duration - 1);
  }, [duration, frame, playerRef]);

  const visibleAt = project.clips
    .filter(hasBox)
    .filter((c) => frame >= c.from && frame < c.from + c.durationInFrames);
  const selected = project.clips.find((c) => c.id === selectedId);

  const toPercent = (e: { clientX: number; clientY: number }) => {
    const rect = stageRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  };

  const startDrag = (e: React.PointerEvent, clip: Clip & Box, mode: "move" | "resize") => {
    e.stopPropagation();
    e.preventDefault();
    const start = toPercent(e);
    const original = { x: clip.x, y: clip.y, width: clip.width, height: clip.height };
    const aspect = original.width / original.height;
    const key = `preview-${mode}-${clip.id}-${Date.now()}`;

    const move = (ev: PointerEvent) => {
      const p = toPercent(ev);
      const dx = p.x - start.x;
      const dy = p.y - start.y;
      let patch: Partial<Box>;
      if (mode === "move") {
        patch = { x: original.x + dx, y: original.y + dy };
      } else {
        const width = Math.max(2, original.width + dx);
        // Shift keeps the free aspect; otherwise keep proportions.
        const height = ev.shiftKey ? Math.max(2, original.height + dy) : width / aspect;
        patch = { width, height };
      }
      update(
        (prj) => ({
          ...prj,
          clips: prj.clips.map((c) => (c.id === clip.id ? ({ ...c, ...patch } as Clip) : c)),
        }),
        key,
      );
    };
    const up = () => {
      commit();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const onStagePointerDown = (e: React.PointerEvent) => {
    const p = toPercent(e);
    // Topmost clip under the pointer.
    const hit = [...visibleAt]
      .sort((a, b) => b.track - a.track)
      .find((c) => p.x >= c.x && p.x <= c.x + c.width && p.y >= c.y && p.y <= c.y + c.height);
    onSelect(hit?.id ?? null);
    if (hit) startDrag(e, hit, "move");
  };

  return (
    <div className="preview-area" ref={areaRef}>
      <div className="stage" ref={stageRef} style={{ width: size.width, height: size.height }}>
        <Player
          ref={playerRef}
          component={Main}
          inputProps={{ project }}
          durationInFrames={duration}
          fps={project.fps}
          compositionWidth={project.width}
          compositionHeight={project.height}
          style={{ width: "100%", height: "100%" }}
          acknowledgeRemotionLicense
        />
        <div className="overlay" onPointerDown={onStagePointerDown}>
          {selected && hasBox(selected) && frame >= selected.from && frame < selected.from + selected.durationInFrames && (
            <div
              className="selection"
              style={{
                left: `${selected.x}%`,
                top: `${selected.y}%`,
                width: `${selected.width}%`,
                height: `${selected.height}%`,
                rotate: `${selected.rotation}deg`,
              }}
              onPointerDown={(e) => startDrag(e, selected, "move")}
            >
              <div className="resize" onPointerDown={(e) => startDrag(e, selected, "resize")} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
