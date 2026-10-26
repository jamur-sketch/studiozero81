import React, { useEffect, useRef, useState } from "react";
import { getProjectDuration, getTrackCount, type Clip, type Project } from "../types";
import { clamp, formatTime, maxClipDuration } from "./ops";
import type { ProjectStore } from "./useProjectStore";

const TRACK_HEIGHT = 44;
const HEADER_WIDTH = 64;
const RULER_HEIGHT = 24;
const SNAP_PX = 8;

type DragMode = "move" | "trim-start" | "trim-end";

type Props = {
  store: ProjectStore;
  frame: number;
  onSeek: (frame: number) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

const clipColor = (clip: Clip) =>
  ({ video: "#4f7cff", image: "#21a87a", audio: "#d9822b", text: "#b05ce6", solid: "#6b7280" })[
    clip.type
  ];

export const Timeline: React.FC<Props> = ({ store, frame, onSeek, selectedId, onSelect }) => {
  const { project, update, commit } = store;
  const [pxPerFrame, setPxPerFrame] = useState(4);
  const scrollRef = useRef<HTMLDivElement>(null);
  const duration = getProjectDuration(project);
  const trackCount = getTrackCount(project);
  const width = (duration + project.fps * 10) * pxPerFrame;

  const frameFromClientX = (clientX: number) => {
    const el = scrollRef.current!;
    const rect = el.getBoundingClientRect();
    return Math.max(0, Math.round((clientX - rect.left - HEADER_WIDTH + el.scrollLeft) / pxPerFrame));
  };

  const scrub = (e: React.PointerEvent) => {
    onSeek(frameFromClientX(e.clientX));
    const move = (ev: PointerEvent) => onSeek(frameFromClientX(ev.clientX));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const snapPoints = (p: Project, exceptId: string) => [
    0,
    frame,
    ...p.clips.filter((c) => c.id !== exceptId).flatMap((c) => [c.from, c.from + c.durationInFrames]),
  ];

  const snap = (value: number, points: number[]) => {
    let best = value;
    let bestDist = SNAP_PX / pxPerFrame;
    for (const p of points) {
      const d = Math.abs(p - value);
      if (d < bestDist) {
        best = p;
        bestDist = d;
      }
    }
    return best;
  };

  const startDrag = (e: React.PointerEvent, clip: Clip, mode: DragMode) => {
    e.stopPropagation();
    onSelect(clip.id);
    const startX = e.clientX;
    const startY = e.clientY;
    const original = clip;
    const key = `timeline-${mode}-${clip.id}-${Date.now()}`;

    const move = (ev: PointerEvent) => {
      const df = Math.round((ev.clientX - startX) / pxPerFrame);
      update((p) => {
        const points = snapPoints(p, original.id);
        const clips = p.clips.map((c): Clip => {
          if (c.id !== original.id) return c;
          if (mode === "move") {
            let from = Math.max(0, original.from + df);
            const snappedStart = snap(from, points);
            if (snappedStart !== from) {
              from = snappedStart;
            } else {
              const end = from + original.durationInFrames;
              from = snap(end, points) - original.durationInFrames;
            }
            const dTrack = -Math.round((ev.clientY - startY) / TRACK_HEIGHT);
            const track = clamp(original.track + dTrack, 0, getTrackCount(p) - 1);
            return { ...c, from: Math.max(0, from), track };
          }
          if (mode === "trim-end") {
            const max = maxClipDuration(original, p);
            const end = snap(original.from + original.durationInFrames + df, points);
            return { ...c, durationInFrames: clamp(end - original.from, 1, max) };
          }
          // trim-start: move the in point, keeping the out point fixed.
          const isMedia = original.type === "video" || original.type === "audio";
          const rate = isMedia ? original.playbackRate : 1;
          let from = snap(original.from + df, points);
          const minFrom = isMedia ? original.from - Math.floor(original.trimBefore / rate) : 0;
          from = clamp(from, Math.max(0, minFrom), original.from + original.durationInFrames - 1);
          const delta = from - original.from;
          const next = { ...c, from, durationInFrames: original.durationInFrames - delta };
          if (isMedia && (next.type === "video" || next.type === "audio")) {
            next.trimBefore = Math.max(0, Math.round(original.trimBefore + delta * rate));
          }
          return next;
        });
        return { ...p, clips };
      }, key);
    };
    const up = () => {
      commit();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // Keep the playhead in view while playing.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const x = frame * pxPerFrame;
    const visible = el.clientWidth - HEADER_WIDTH;
    if (x < el.scrollLeft || x > el.scrollLeft + visible - 40) {
      el.scrollLeft = Math.max(0, x - visible / 4);
    }
  }, [frame, pxPerFrame]);

  const secondStep = pxPerFrame * project.fps < 40 ? 5 : 1;
  const ticks: number[] = [];
  for (let s = 0; s * project.fps * pxPerFrame < width; s += secondStep) ticks.push(s);

  return (
    <div className="timeline">
      <div className="timeline-toolbar">
        <span className="timecode">
          {formatTime(frame, project.fps)} / {formatTime(duration, project.fps)}
        </span>
        <label className="zoom">
          Zoom
          <input
            type="range"
            min={0.5}
            max={16}
            step={0.5}
            value={pxPerFrame}
            onChange={(e) => setPxPerFrame(Number(e.target.value))}
          />
        </label>
      </div>
      <div className="timeline-scroll" ref={scrollRef}>
        <div
          className="timeline-inner"
          style={{ width: width + HEADER_WIDTH, height: RULER_HEIGHT + trackCount * TRACK_HEIGHT }}
        >
          <div className="ruler" style={{ left: HEADER_WIDTH, width }} onPointerDown={scrub}>
            {ticks.map((s) => (
              <span key={s} className="tick" style={{ left: s * project.fps * pxPerFrame }}>
                {s}s
              </span>
            ))}
          </div>
          {Array.from({ length: trackCount }, (_, i) => trackCount - 1 - i).map((track, row) => (
            <div
              key={track}
              className="track"
              style={{ top: RULER_HEIGHT + row * TRACK_HEIGHT, height: TRACK_HEIGHT }}
            >
              <div className="track-header" style={{ width: HEADER_WIDTH }}>
                Faixa {track + 1}
              </div>
              <div
                className="track-lane"
                style={{ left: HEADER_WIDTH, width }}
                onPointerDown={(e) => {
                  onSelect(null);
                  scrub(e);
                }}
              >
                {project.clips
                  .filter((c) => c.track === track)
                  .map((clip) => (
                    <div
                      key={clip.id}
                      className={`clip ${clip.id === selectedId ? "selected" : ""}`}
                      style={{
                        left: clip.from * pxPerFrame,
                        width: Math.max(4, clip.durationInFrames * pxPerFrame),
                        background: clipColor(clip),
                      }}
                      onPointerDown={(e) => startDrag(e, clip, "move")}
                      title={clip.name}
                    >
                      <div className="handle left" onPointerDown={(e) => startDrag(e, clip, "trim-start")} />
                      <span className="clip-label">
                        {clip.type === "text" ? `T  ${clip.text}` : clip.name}
                      </span>
                      <div className="handle right" onPointerDown={(e) => startDrag(e, clip, "trim-end")} />
                    </div>
                  ))}
              </div>
            </div>
          ))}
          <div
            className="playhead"
            style={{ left: HEADER_WIDTH + frame * pxPerFrame, height: RULER_HEIGHT + trackCount * TRACK_HEIGHT }}
          />
        </div>
      </div>
    </div>
  );
};
