import { Audio, Video } from "@remotion/media";
import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import type { Asset, Box, Clip, MediaClip, Project, TextClip } from "../types";

export type MainProps = { project: Project };

export const resolveSrc = (asset: Asset) =>
  /^(blob:|https?:|data:)/.test(asset.src) ? asset.src : staticFile(asset.src);

const fadeOpacity = (frame: number, clip: Clip) =>
  Math.min(
    clip.fadeIn > 0
      ? interpolate(frame, [0, clip.fadeIn], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 1,
    clip.fadeOut > 0
      ? interpolate(
          frame,
          [clip.durationInFrames - clip.fadeOut, clip.durationInFrames],
          [1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        )
      : 1,
  );

const boxStyle = (box: Box, rotation: number): React.CSSProperties => ({
  position: "absolute",
  left: `${box.x}%`,
  top: `${box.y}%`,
  width: `${box.width}%`,
  height: `${box.height}%`,
  rotate: `${rotation}deg`,
});

const MediaLayer: React.FC<{ clip: MediaClip; asset: Asset }> = ({
  clip,
  asset,
}) => {
  const frame = useCurrentFrame();
  const src = resolveSrc(asset);
  const volume = (f: number) => clip.volume * fadeOpacity(f, clip);

  if (clip.type === "audio") {
    return (
      <Audio
        src={src}
        trimBefore={clip.trimBefore}
        playbackRate={clip.playbackRate}
        volume={volume}
      />
    );
  }

  const style: React.CSSProperties = {
    ...boxStyle(clip, clip.rotation),
    opacity: clip.opacity * fadeOpacity(frame, clip),
  };

  if (clip.type === "image") {
    return (
      <Img src={src} style={{ ...style, objectFit: clip.fit }} />
    );
  }

  return (
    <Video
      src={src}
      trimBefore={clip.trimBefore}
      playbackRate={clip.playbackRate}
      volume={volume}
      muted={clip.volume === 0}
      objectFit={clip.fit}
      style={style}
    />
  );
};

const TextLayer: React.FC<{ clip: TextClip }> = ({ clip }) => {
  const frame = useCurrentFrame();
  const intro = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

  const visibleText =
    clip.animation === "typewriter"
      ? clip.text.slice(
          0,
          Math.round(
            interpolate(frame, [0, Math.max(1, clip.text.length * 2)], [0, clip.text.length], intro),
          ),
        )
      : clip.text;

  return (
    <div
      style={{
        ...boxStyle(clip, clip.rotation),
        display: "flex",
        alignItems: "center",
        justifyContent:
          clip.align === "left" ? "flex-start" : clip.align === "right" ? "flex-end" : "center",
        opacity: clip.opacity * fadeOpacity(frame, clip),
        translate:
          clip.animation === "slide-up"
            ? `0px ${interpolate(frame, [0, 20], [60, 0], { ...intro, easing: Easing.bezier(0.16, 1, 0.3, 1) })}px`
            : undefined,
        scale:
          clip.animation === "pop"
            ? String(interpolate(frame, [0, 18], [0.6, 1], { ...intro, easing: Easing.spring({ damping: 12 }) }))
            : undefined,
      }}
    >
      <span
        style={{
          fontFamily: clip.fontFamily,
          fontSize: clip.fontSize,
          fontWeight: clip.fontWeight,
          color: clip.color,
          background: clip.background,
          textAlign: clip.align,
          lineHeight: 1.15,
          padding: clip.background === "transparent" ? 0 : "0.15em 0.4em",
          borderRadius: 12,
          whiteSpace: "pre-wrap",
        }}
      >
        {visibleText}
      </span>
    </div>
  );
};

const SolidLayer: React.FC<{ clip: Extract<Clip, { type: "solid" }> }> = ({
  clip,
}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        ...boxStyle(clip, clip.rotation),
        background: clip.color,
        opacity: clip.opacity * fadeOpacity(frame, clip),
      }}
    />
  );
};

export const Main: React.FC<MainProps> = ({ project }) => {
  // Higher tracks are drawn on top.
  const clips = [...project.clips].sort((a, b) => a.track - b.track);

  return (
    <AbsoluteFill style={{ background: project.background }}>
      {clips.map((clip) => {
        let layer: React.ReactNode = null;
        if (clip.type === "text") {
          layer = <TextLayer clip={clip} />;
        } else if (clip.type === "solid") {
          layer = <SolidLayer clip={clip} />;
        } else {
          const asset = project.assets.find((a) => a.id === clip.assetId);
          if (asset && asset.src) {
            layer = <MediaLayer clip={clip} asset={asset} />;
          }
        }
        return (
          <Sequence
            key={clip.id}
            name={clip.name}
            from={clip.from}
            durationInFrames={clip.durationInFrames}
            premountFor={clip.type === "video" ? project.fps : 0}
          >
            {layer}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
