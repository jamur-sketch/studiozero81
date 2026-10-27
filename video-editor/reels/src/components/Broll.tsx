import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { BODY, CARD_TOP, clamp, CREAM, ease, GOLD, GREEN } from "../brand";
import type { Broll as BrollItem } from "../types";
import { GraphicView } from "./Graphics";

/** 0 → 1 → 0 envelope of a split/full B-roll at time t (seconds of the edit). */
export const brollProgress = (b: BrollItem, t: number) =>
  Math.min(
    interpolate(t, [b.from, b.from + 0.35], [0, 1], { ...clamp, easing: ease }),
    interpolate(t, [b.to - 0.3, b.to], [1, 0], clamp),
  );

const Media: React.FC<{ item: BrollItem; durationInFrames: number }> = ({ item, durationInFrames }) => {
  const frame = useCurrentFrame();
  // Slow push-in (Ken Burns) keeps still images alive.
  const kb = interpolate(frame, [0, durationInFrames], [1, 1.08], clamp);
  if (item.graphic) return <GraphicView graphic={item.graphic} />;
  if (!item.image) return null;
  return (
    <Img
      src={staticFile(item.image)}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", scale: String(kb) }}
    />
  );
};

const Tag: React.FC<{ text?: string; top: number }> = ({ text, top }) =>
  text ? (
    <div
      style={{
        position: "absolute",
        right: 48,
        top,
        padding: "8px 16px",
        borderRadius: 10,
        background: "rgba(19, 52, 43, 0.86)",
        fontFamily: BODY,
        fontWeight: 500,
        fontSize: 26,
        color: CREAM,
      }}
    >
      {text}
    </div>
  ) : null;

export const BrollView: React.FC<{ item: BrollItem; durationInFrames: number }> = ({ item, durationInFrames }) => {
  const frame = useCurrentFrame();
  const fps = 30;
  const p = brollProgress({ ...item, from: 0, to: durationInFrames / fps }, frame / fps);

  if (item.mode === "split") {
    return (
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 1000,
          overflow: "hidden",
          background: GREEN,
          translate: `0px ${interpolate(p, [0, 1], [-1000, 0])}px`,
          borderBottom: `4px solid ${GOLD}`,
        }}
      >
        <Media item={item} durationInFrames={durationInFrames} />
        <Tag text={item.label} top={150} />
      </div>
    );
  }

  if (item.mode === "pip") {
    return (
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: CARD_TOP,
          height: 560,
          borderRadius: 24,
          overflow: "hidden",
          background: GREEN,
          opacity: p,
          scale: String(interpolate(p, [0, 1], [0.94, 1])),
          outline: `3px solid ${GOLD}`,
        }}
      >
        <Media item={item} durationInFrames={durationInFrames} />
        <Tag text={item.label} top={24} />
      </div>
    );
  }

  return (
    <AbsoluteFill style={{ background: GREEN, opacity: p, scale: String(interpolate(p, [0, 1], [1.04, 1])) }}>
      <Media item={item} durationInFrames={durationInFrames} />
      <Tag text={item.label} top={150} />
    </AbsoluteFill>
  );
};
