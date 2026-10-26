import { ALL_FORMATS, BlobSource, Input } from "mediabunny";
import type {
  Asset,
  AssetKind,
  Clip,
  MediaClip,
  Project,
  SolidClip,
  TextClip,
} from "../types";

export const uid = () => Math.random().toString(36).slice(2, 10);

export const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

export const formatTime = (frame: number, fps: number) => {
  const totalSeconds = frame / fps;
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  const f = Math.floor(frame % fps);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(f).padStart(2, "0")}`;
};

const kindFromFile = (file: File): AssetKind | null => {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("image/")) return "image";
  return null;
};

const imageSize = (src: string) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("Não foi possível ler a imagem"));
    img.src = src;
  });

/** Reads duration and dimensions of a dropped file with Mediabunny. */
export const probeFile = async (file: File): Promise<Asset> => {
  const kind = kindFromFile(file);
  if (!kind) throw new Error(`Formato não suportado: ${file.name}`);
  const src = URL.createObjectURL(file);
  const asset: Asset = {
    id: uid(),
    name: file.name,
    kind,
    src,
    durationInSeconds: null,
    width: null,
    height: null,
  };

  if (kind === "image") {
    Object.assign(asset, await imageSize(src));
    return asset;
  }

  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
  try {
    asset.durationInSeconds = await input.computeDuration();
    if (kind === "video") {
      const track = await input.getPrimaryVideoTrack();
      if (track) {
        asset.width = track.displayWidth;
        asset.height = track.displayHeight;
      }
    }
  } finally {
    input.dispose();
  }
  return asset;
};

/** Longest the clip can be on the timeline given the source media length. */
export const maxClipDuration = (clip: Clip, project: Project) => {
  if (clip.type !== "video" && clip.type !== "audio") return Infinity;
  const asset = project.assets.find((a) => a.id === clip.assetId);
  if (!asset?.durationInSeconds) return Infinity;
  const sourceFrames = Math.floor(asset.durationInSeconds * project.fps);
  return Math.max(1, Math.floor((sourceFrames - clip.trimBefore) / clip.playbackRate));
};

/** First free track at the given time range, starting from `preferred`. */
export const findFreeTrack = (
  project: Project,
  from: number,
  duration: number,
  preferred = 0,
) => {
  for (let track = preferred; ; track++) {
    const busy = project.clips.some(
      (c) => c.track === track && c.from < from + duration && from < c.from + c.durationInFrames,
    );
    if (!busy) return track;
  }
};

/** Fits media of the given size inside the canvas, in percent. */
const fitBox = (project: Project, w: number | null, h: number | null) => {
  if (!w || !h) return { x: 0, y: 0, width: 100, height: 100 };
  const scale = Math.min(project.width / w, project.height / h);
  const width = ((w * scale) / project.width) * 100;
  const height = ((h * scale) / project.height) * 100;
  return { x: (100 - width) / 2, y: (100 - height) / 2, width, height };
};

export const clipFromAsset = (asset: Asset, project: Project, from: number): MediaClip => {
  const durationInFrames = asset.durationInSeconds
    ? Math.max(1, Math.floor(asset.durationInSeconds * project.fps))
    : 5 * project.fps;
  const preferred = asset.kind === "audio" ? 0 : 1;
  return {
    id: uid(),
    name: asset.name,
    type: asset.kind,
    assetId: asset.id,
    track: findFreeTrack(project, from, durationInFrames, preferred),
    from,
    durationInFrames,
    trimBefore: 0,
    volume: 1,
    playbackRate: 1,
    opacity: 1,
    fit: "cover",
    rotation: 0,
    fadeIn: 0,
    fadeOut: 0,
    ...(asset.kind === "video"
      ? { x: 0, y: 0, width: 100, height: 100 }
      : fitBox(project, asset.width, asset.height)),
  };
};

export const newTextClip = (project: Project, from: number): TextClip => {
  const durationInFrames = 3 * project.fps;
  return {
    id: uid(),
    name: "Texto",
    type: "text",
    track: findFreeTrack(project, from, durationInFrames, 1),
    from,
    durationInFrames,
    fadeIn: 0,
    fadeOut: 0,
    x: 10,
    y: 40,
    width: 80,
    height: 20,
    text: "Seu texto aqui",
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: Math.round(project.height / 12),
    fontWeight: 700,
    color: "#ffffff",
    background: "transparent",
    align: "center",
    animation: "slide-up",
    opacity: 1,
    rotation: 0,
  };
};

export const newSolidClip = (project: Project, from: number): SolidClip => {
  const durationInFrames = 3 * project.fps;
  return {
    id: uid(),
    name: "Cor sólida",
    type: "solid",
    track: findFreeTrack(project, from, durationInFrames, 0),
    from,
    durationInFrames,
    fadeIn: 0,
    fadeOut: 0,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    color: "#6d5efc",
    opacity: 1,
    rotation: 0,
  };
};

/** Splits a clip at an absolute timeline frame. Returns null if the frame is outside the clip. */
export const splitClip = (clip: Clip, frame: number): [Clip, Clip] | null => {
  const offset = frame - clip.from;
  if (offset <= 0 || offset >= clip.durationInFrames) return null;
  const left: Clip = { ...clip, durationInFrames: offset, fadeOut: 0 };
  const right: Clip = {
    ...clip,
    id: uid(),
    from: frame,
    durationInFrames: clip.durationInFrames - offset,
    fadeIn: 0,
  };
  if (right.type === "video" || right.type === "audio") {
    right.trimBefore = Math.round(right.trimBefore + offset * right.playbackRate);
  }
  return [left, right];
};

/** Project copy safe to save as JSON: object URLs die with the tab, so only file names are kept. */
export const serializableProject = (project: Project): Project => ({
  ...project,
  assets: project.assets.map((a) => ({
    ...a,
    src: a.src.startsWith("blob:") ? "" : a.src,
  })),
});
