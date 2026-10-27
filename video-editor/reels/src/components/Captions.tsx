import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { BODY, CAPTION_TOP, clamp, CREAM, ease, FPS, GOLD } from "../brand";
import type { Word } from "../types";

/** One caption line; the word being spoken turns gold. `lift` moves it up (0-1) when the screen is split. */
export const CaptionLine: React.FC<{ words: Word[]; start: number; splitAt: (t: number) => number }> = ({
  words,
  start,
  splitAt,
}) => {
  const frame = useCurrentFrame();
  const t = frame / FPS + start;
  const pop = interpolate(frame, [0, 5], [0.92, 1], { ...clamp, easing: ease });
  const split = splitAt(t);
  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        right: 60,
        top: interpolate(split, [0, 1], [CAPTION_TOP, 930]),
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "rgba(19, 52, 43, 0.86)",
          borderRadius: 18,
          padding: "14px 26px 18px",
          fontFamily: BODY,
          fontWeight: 600,
          fontSize: 58,
          lineHeight: 1.2,
          textAlign: "center",
          color: CREAM,
          scale: String(pop),
        }}
      >
        {words.map(([w, s], k) => {
          const next = words[k + 1]?.[1] ?? Infinity;
          return (
            <span key={k} style={{ color: t >= s ? (t < next ? GOLD : CREAM) : "rgba(242,236,223,0.55)" }}>
              {w}
              {k < words.length - 1 ? " " : ""}
            </span>
          );
        })}
      </div>
    </div>
  );
};
