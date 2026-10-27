import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { f, GOLD, GREEN } from "./brand";
import { brollProgress, BrollView } from "./components/Broll";
import { Callout, CardView } from "./components/Cards";
import { CaptionLine } from "./components/Captions";
import { Chapter, CHAPTER_FRAMES } from "./components/Chapter";
import { buildSegments, Shots } from "./components/Shots";
import type { EditConfig } from "./types";

const TAIL = 12;

export const getDuration = (edit: EditConfig) =>
  buildSegments(edit.cuts).reduce((s, x) => s + x.durationInFrames, 0) + TAIL;

const Progress: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return <div style={{ position: "absolute", top: 0, left: 0, height: 6, width: `${(frame / durationInFrames) * 100}%`, background: GOLD }} />;
};

const Sfx: React.FC<{ at: number; file: string; volume: number }> = ({ at, file, volume }) => (
  <Sequence name={`Som ${file}`} from={Math.max(0, f(at))} durationInFrames={f(1.2)} layout="none">
    <Audio src={staticFile(file)} volume={volume} />
  </Sequence>
);

export const Reel: React.FC<{ edit: EditConfig }> = ({ edit }) => {
  const segments = buildSegments(edit.cuts);
  const total = getDuration(edit);
  const splits = edit.broll.filter((b) => b.mode === "split");
  const splitAt = (t: number) => Math.max(0, ...splits.map((b) => brollProgress(b, t)));

  return (
    <AbsoluteFill style={{ background: GREEN }}>
      <Shots segments={segments} src={edit.source} tail={TAIL} splitAt={splitAt} />

      {edit.cards.map((c, k) => (
        <Sequence key={`card${k}`} name={`Card ${k + 1}`} from={f(c.from)} durationInFrames={f(c.to) - f(c.from)}>
          <CardView card={c} />
        </Sequence>
      ))}
      {edit.callouts.map((c, k) => (
        <Sequence key={`callout${k}`} name={`Número ${c.value}`} from={f(c.from)} durationInFrames={f(c.to) - f(c.from)}>
          <Callout value={c.value} text={c.text} durationInFrames={f(c.to) - f(c.from)} />
        </Sequence>
      ))}
      {edit.broll.map((b, k) => (
        <Sequence key={`broll${k}`} name={`Imagem ${k + 1} (${b.mode})`} from={f(b.from)} durationInFrames={f(b.to) - f(b.from)}>
          <BrollView item={b} durationInFrames={f(b.to) - f(b.from)} />
        </Sequence>
      ))}
      {edit.captions.map((words, k) => {
        const start = words[0][1];
        const end = edit.captions[k + 1]?.[0][1] ?? total / 30;
        return (
          <Sequence key={`cap${k}`} name={`Legenda ${k + 1}`} from={f(start)} durationInFrames={Math.max(1, f(end) - f(start))}>
            <CaptionLine words={words} start={start} splitAt={splitAt} />
          </Sequence>
        );
      })}

      {/* Chapters go over the captions: the title already says the line. */}
      {edit.chapters.map((c, k) => (
        <Sequence key={`chapter${k}`} name={`Capítulo ${c.title}`} from={f(c.at) - CHAPTER_FRAMES / 2} durationInFrames={CHAPTER_FRAMES}>
          <Chapter label={c.label} title={c.title} />
        </Sequence>
      ))}

      {edit.music && (
        <Audio src={staticFile(edit.music.src)} volume={edit.music.volume} loop />
      )}
      {edit.sfx && (
        <>
          {edit.chapters.map((c, k) => <Sfx key={`wc${k}`} at={c.at - 0.45} file="whoosh.wav" volume={0.35} />)}
          {edit.broll.map((b, k) => <Sfx key={`wb${k}`} at={b.from - 0.1} file="whoosh.wav" volume={0.25} />)}
          {[...edit.cards, ...edit.callouts].map((c, k) => <Sfx key={`p${k}`} at={c.from} file="pop.wav" volume={0.3} />)}
        </>
      )}
      <Progress />
    </AbsoluteFill>
  );
};
