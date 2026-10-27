import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { BODY, clamp, CREAM, ease, GOLD, GREEN, TITLE } from "../brand";

export const CHAPTER_FRAMES = 30;

/** Brand wipe that opens a new block: a green panel with a gold edge sweeps up, shows the title, and leaves. */
export const Chapter: React.FC<{ label: string; title: string }> = ({ label, title }) => {
  const frame = useCurrentFrame();
  const inP = interpolate(frame, [0, 9], [0, 1], { ...clamp, easing: ease });
  const outP = interpolate(frame, [CHAPTER_FRAMES - 9, CHAPTER_FRAMES], [0, 1], { ...clamp, easing: ease });
  const y = interpolate(inP, [0, 1], [100, 0]) - interpolate(outP, [0, 1], [0, 100]);
  const text = interpolate(frame, [5, 12, CHAPTER_FRAMES - 10, CHAPTER_FRAMES - 6], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill style={{ translate: `0px ${y}%`, background: GREEN, borderTop: `6px solid ${GOLD}`, borderBottom: `6px solid ${GOLD}` }}>
      <AbsoluteFill style={{ justifyContent: "center", padding: "0 110px", opacity: text }}>
        <div style={{ width: 80, height: 3, background: GOLD, marginBottom: 28 }} />
        <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 34, color: GOLD, marginBottom: 14 }}>{label}</div>
        <div style={{ fontFamily: TITLE, fontWeight: 600, fontSize: 104, lineHeight: 1.05, color: CREAM }}>{title}</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
