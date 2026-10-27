import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { BODY, clamp, CREAM, ease, GOLD, GREEN, OFFWHITE } from "../brand";

/** Illustrative chat (not a real app screen): question bubbles appear one by one. */
export const ChatMock: React.FC<{ title: string; questions: string[]; every?: number }> = ({ title, questions, every = 22 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: GREEN, padding: "150px 90px 80px", gap: 26 }}>
      <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 30, color: GOLD }}>{title}</div>
      {questions.map((q, k) => {
        const p = interpolate(frame, [8 + k * every, 18 + k * every], [0, 1], { ...clamp, easing: ease });
        return (
          <div
            key={k}
            style={{
              alignSelf: "flex-end",
              maxWidth: "82%",
              background: OFFWHITE,
              color: GREEN,
              borderRadius: "30px 30px 6px 30px",
              padding: "24px 32px",
              fontFamily: BODY,
              fontWeight: 500,
              fontSize: 44,
              lineHeight: 1.25,
              opacity: p,
              translate: `0px ${interpolate(p, [0, 1], [20, 0])}px`,
            }}
          >
            {q}
          </div>
        );
      })}
      <div style={{ display: "flex", gap: 12, marginTop: 6, opacity: interpolate(frame, [20 + questions.length * every, 26 + questions.length * every], [0, 1], clamp) }}>
        {[0, 1, 2].map((d) => (
          <div
            key={d}
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              background: CREAM,
              opacity: 0.4 + 0.6 * Math.abs(Math.sin((frame + d * 6) / 8)),
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};
