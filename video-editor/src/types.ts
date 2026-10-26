export type AssetKind = "video" | "audio" | "image";

export type Asset = {
  id: string;
  name: string;
  kind: AssetKind;
  /** blob:/http(s) URL, or a file name inside public/ when rendering on the server. Empty when the file still needs to be re-linked. */
  src: string;
  durationInSeconds: number | null;
  width: number | null;
  height: number | null;
};

export type TextAnimation = "none" | "slide-up" | "pop" | "typewriter";

type ClipBase = {
  id: string;
  name: string;
  track: number;
  /** Start on the project timeline, in frames. */
  from: number;
  durationInFrames: number;
  /** Fade in/out length, in frames. */
  fadeIn: number;
  fadeOut: number;
};

/** Box in percent of the canvas (0-100). */
export type Box = { x: number; y: number; width: number; height: number };

export type MediaClip = ClipBase &
  Box & {
    type: "video" | "image" | "audio";
    assetId: string;
    /** Frames of the source skipped at the start. */
    trimBefore: number;
    volume: number;
    playbackRate: number;
    opacity: number;
    fit: "cover" | "contain" | "fill";
    rotation: number;
  };

export type TextClip = ClipBase &
  Box & {
    type: "text";
    text: string;
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    color: string;
    background: string;
    align: "left" | "center" | "right";
    animation: TextAnimation;
    opacity: number;
    rotation: number;
  };

export type SolidClip = ClipBase &
  Box & {
    type: "solid";
    color: string;
    opacity: number;
    rotation: number;
  };

export type Clip = MediaClip | TextClip | SolidClip;

export type Project = {
  name: string;
  width: number;
  height: number;
  fps: number;
  background: string;
  assets: Asset[];
  clips: Clip[];
};

export const getProjectDuration = (project: Project) =>
  Math.max(
    project.fps,
    ...project.clips.map((c) => c.from + c.durationInFrames),
  );

export const getTrackCount = (project: Project) =>
  Math.max(3, ...project.clips.map((c) => c.track + 2));
