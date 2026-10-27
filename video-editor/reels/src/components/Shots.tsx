import { Video } from "@remotion/media";
import React from "react";
import { AbsoluteFill, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { clamp, FPS } from "../brand";

export type Segment = { i: number; from: number; trimBefore: number; durationInFrames: number };

export const buildSegments = (cuts: [number, number][]): Segment[] => {
  let from = 0;
  return cuts.map(([a, b], i) => {
    const trimBefore = Math.round(a * FPS);
    const durationInFrames = Math.round(b * FPS) - trimBefore;
    const seg = { i, from, trimBefore, durationInFrames };
    from += durationInFrames;
    return seg;
  });
};

const Shot: React.FC<{ seg: Segment; src: string; last: boolean }> = ({ seg, src, last }) => {
  // Alternate framing on every cut so jump cuts read as intentional punch-ins.
  const zoom = seg.i % 2 === 1 ? 1.12 : 1;
  return (
    <Video
      src={staticFile(src)}
      trimBefore={seg.trimBefore}
      // 2-frame audio ramps avoid clicks at the cuts.
      volume={(fr) =>
        Math.min(
          interpolate(fr, [0, 2], [0, 1], clamp),
          last ? 1 : interpolate(fr, [seg.durationInFrames - 2, seg.durationInFrames], [1, 0], clamp),
        )
      }
      style={{ width: "100%", height: "100%", scale: String(zoom), transformOrigin: "50% 40%" }}
      objectFit="cover"
    />
  );
};

/** The speaker. When the screen is split, the shot shrinks into the bottom half. */
export const Shots: React.FC<{ segments: Segment[]; src: string; tail: number; splitAt: (t: number) => number }> = ({
  segments,
  src,
  tail,
  splitAt,
}) => {
  const frame = useCurrentFrame();
  const split = splitAt(frame / FPS);
  return (
    <AbsoluteFill
      style={{
        scale: String(interpolate(split, [0, 1], [1, 0.84])),
        translate: `0px ${interpolate(split, [0, 1], [0, 650])}px`,
        transformOrigin: "50% 0%",
      }}
    >
      {segments.map((seg) => {
        const last = seg.i === segments.length - 1;
        return (
          <Sequence key={seg.i} name={`Corte ${seg.i + 1}`} from={seg.from} durationInFrames={seg.durationInFrames + (last ? tail : 0)}>
            <Shot seg={seg} src={src} last={last} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
