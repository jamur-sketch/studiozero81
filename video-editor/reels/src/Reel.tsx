import { Video } from "@remotion/media";
import { loadFont } from "@remotion/fonts";
import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const FPS = 30;
const GREEN = "#13342B";
const GOLD = "#D2B26B";
const CREAM = "#F2ECDF";
const TITLE = "Playfair Display";
const BODY = "Inter";

loadFont({ family: TITLE, url: staticFile("playfair-600.woff2"), weight: "600" });
loadFont({ family: BODY, url: staticFile("inter-400.woff2"), weight: "400" });
loadFont({ family: BODY, url: staticFile("inter-500.woff2"), weight: "500" });
loadFont({ family: BODY, url: staticFile("inter-600.woff2"), weight: "600" });

// Best take of each line, in seconds of the source recording.
const CUTS: [number, number][] = [
  [1.5, 3.15], [4.6, 7.55], [11.1, 12.3], [20.65, 22.8], [24.65, 25.6], [26.28, 28.55],
  [33.05, 34.4], [46.92, 48.85], [49.46, 52.5], [69.2, 70.32], [79.3, 82.65], [85.8, 87.4],
  [90.9, 93.08], [94.76, 95.85], [105.4, 108.6],
];

const SEGMENTS = (() => {
  let from = 0;
  return CUTS.map(([a, b], i) => {
    const trimBefore = Math.round(a * FPS);
    const durationInFrames = Math.round(b * FPS) - trimBefore;
    const seg = { i, from, trimBefore, durationInFrames };
    from += durationInFrames;
    return seg;
  });
})();

export const TOTAL_FRAMES = SEGMENTS.reduce((s, x) => s + x.durationInFrames, 0) + 12;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const f = (s: number) => Math.round(s * FPS);

const Shot: React.FC<{ seg: (typeof SEGMENTS)[number] }> = ({ seg }) => {
  const last = seg.i === SEGMENTS.length - 1;
  // Alternate framing on every cut so jump cuts read as intentional punch-ins.
  const zoom = seg.i % 2 === 1 ? 1.12 : 1;
  return (
    <Video
      src={staticFile("src.mp4")}
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

// Card in the upper band (over the wall, above the face).
const Card: React.FC<{ children: React.ReactNode; durationInFrames: number }> = ({ children, durationInFrames }) => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 10], [0, 1], { ...clamp, easing: ease });
  const exit = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: 80,
        right: 80,
        top: 170,
        background: "rgba(19, 52, 43, 0.93)",
        borderRadius: 24,
        padding: "34px 48px 38px",
        opacity: Math.min(enter, exit),
        translate: `0px ${interpolate(enter, [0, 1], [-24, 0])}px`,
      }}
    >
      <div style={{ width: 64, height: 3, background: GOLD, marginBottom: 20 }} />
      {children}
    </div>
  );
};

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 28, color: GOLD, letterSpacing: 0.5, marginBottom: 10 }}>
    {children}
  </div>
);

const Hook: React.FC = () => (
  <Card durationInFrames={f(4.6)}>
    <Label>Novidade no delivery</Label>
    <div style={{ fontFamily: TITLE, fontWeight: 600, fontSize: 70, lineHeight: 1.12, color: CREAM }}>
      iFood e 99 lançaram um <span style={{ color: GOLD }}>gerente de IA</span>
    </div>
  </Card>
);

const DateDot: React.FC<{ at: number; date: string; text: string; align: "left" | "right" }> = ({ at, date, text, align }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 10], [0, 1], { ...clamp, easing: ease });
  return (
    <div style={{ textAlign: align, opacity: p, translate: `0px ${interpolate(p, [0, 1], [12, 0])}px` }}>
      <div style={{ fontFamily: TITLE, fontWeight: 600, fontSize: 56, color: GOLD, lineHeight: 1 }}>{date}</div>
      <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 30, color: CREAM, marginTop: 8 }}>{text}</div>
    </div>
  );
};

const Timeline: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const line = interpolate(frame, [4, 26], [0, 100], { ...clamp, easing: ease });
  // Local frames: this card starts at 4.72s of the edit.
  const start = 4.72;
  return (
    <Card durationInFrames={durationInFrames}>
      <Label>Dois apps de delivery</Label>
      <div style={{ fontFamily: TITLE, fontWeight: 600, fontSize: 62, lineHeight: 1.12, color: CREAM }}>
        Em menos de <span style={{ color: GOLD }}>um mês</span>
      </div>
      <div style={{ position: "relative", height: 26, margin: "22px 0 18px" }}>
        <div style={{ position: "absolute", top: 12, left: 0, height: 2, width: `${line}%`, background: GOLD }} />
        {[0, 100].map((x, k) => (
          <div
            key={x}
            style={{
              position: "absolute",
              top: 3,
              left: `calc(${x}% - ${k ? 20 : 0}px)`,
              width: 20,
              height: 20,
              borderRadius: 10,
              background: GOLD,
              opacity: interpolate(frame, [f((k ? 14.66 : 12.66) - start), f((k ? 14.66 : 12.66) - start) + 6], [0, 1], clamp),
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <DateDot at={f(12.66 - start)} date="17/set" text="iFood lança o Toqan" align="left" />
        <DateDot at={f(14.66 - start)} date="14/out" text="99 lança o Zesto" align="right" />
      </div>
    </Card>
  );
};

const TOQAN_POINTS: [number, string][] = [
  [17.56, "O que é o Toqan?"],
  [19.48, "Um chat de IA"],
  [21.16, "Que já conhece as suas vendas"],
  [24.8, "Mesmo login do Portal do Parceiro"],
  [27.02, "Pergunte como a um gerente"],
];

const ToqanCard: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const t = frame / FPS + TOQAN_POINTS[0][0];
  const idx = TOQAN_POINTS.findLastIndex(([s]) => t >= s);
  const since = frame - f(TOQAN_POINTS[idx][0] - TOQAN_POINTS[0][0]);
  const p = interpolate(since, [0, 8], [0, 1], { ...clamp, easing: ease });
  return (
    <Card durationInFrames={durationInFrames}>
      <Label>
        Toqan · iFood{idx > 0 ? `  ·  ${idx}/${TOQAN_POINTS.length - 1}` : ""}
      </Label>
      <div
        style={{
          fontFamily: TITLE,
          fontWeight: 600,
          fontSize: 62,
          lineHeight: 1.12,
          color: idx === 0 ? GOLD : CREAM,
          opacity: p,
          translate: `0px ${interpolate(p, [0, 1], [10, 0])}px`,
        }}
      >
        {TOQAN_POINTS[idx][1]}
      </div>
    </Card>
  );
};

type Word = [string, number, number];
// Spoken words (seconds of the edit), grouped into caption lines.
const CAPTIONS: Word[][] = [
  [["O", 0, 0.18], ["iFood", 0.18, 0.5], ["e", 0.5, 0.68], ["a", 0.68, 0.8], ["99", 0.8, 1.6]],
  [["lançaram", 1.65, 2.34], ["uma", 2.34, 2.64], ["IA", 2.64, 2.88]],
  [["para", 2.88, 3.12], ["gerir", 3.12, 3.56], ["o", 3.56, 3.72], ["seu", 3.72, 3.84], ["restaurante.", 3.84, 4.6]],
  [["Em", 4.72, 4.78], ["menos", 4.78, 5.0], ["de", 5.0, 5.2], ["um", 5.2, 5.34], ["mês,", 5.34, 5.8]],
  [["os", 5.88, 6.0], ["dois", 6.0, 6.16], ["maiores", 6.16, 6.66], ["apps", 6.66, 7.02], ["de", 7.02, 7.28], ["delivery", 7.28, 7.9]],
  [["lançaram", 7.95, 8.85], ["ferramentas", 8.9, 10.5], ["de", 10.5, 10.76], ["IA", 10.76, 11.06]],
  [["para", 11.06, 11.3], ["o", 11.3, 11.4], ["dono", 11.4, 11.7], ["de", 11.7, 11.84], ["restaurante.", 11.84, 12.5]],
  [["O", 12.6, 12.66], ["iFood", 12.66, 13.06], ["lançou", 13.06, 13.8], ["o", 13.8, 13.94], ["Toqan", 13.94, 14.4]],
  [["e", 14.4, 14.56], ["a", 14.56, 14.66], ["99Food", 14.66, 15.72], ["lançou", 15.72, 16.66], ["o", 16.66, 16.86], ["Zesto.", 16.86, 17.45]],
  [["O", 17.56, 17.68], ["que", 17.68, 17.82], ["é", 17.82, 17.98], ["o", 17.98, 18.1], ["Toqan?", 18.1, 18.55]],
  [["O", 18.66, 18.78], ["Toqan", 18.78, 19.12], ["é", 19.12, 19.36], ["um", 19.36, 19.48], ["chat", 19.48, 19.82], ["de", 19.82, 20.14], ["IA", 20.14, 20.42]],
  [["que", 20.42, 20.84], ["já", 20.84, 21.16], ["conhece", 21.16, 21.9]],
  [["as", 21.96, 22.18], ["suas", 22.18, 22.46], ["vendas", 22.46, 22.9], ["no", 22.9, 23.06], ["iFood.", 23.06, 23.5]],
  [["Você", 23.6, 23.98], ["entra", 23.98, 24.44], ["com", 24.44, 24.7], ["o", 24.7, 24.8], ["mesmo", 24.8, 25.0], ["login", 25.0, 25.44]],
  [["do", 25.44, 25.88], ["Portal", 25.88, 26.24], ["do", 26.24, 26.46], ["Parceiro", 26.46, 26.88]],
  [["e", 26.88, 27.02], ["pergunta", 27.02, 28.02]],
  [["como", 28.02, 28.4], ["se", 28.4, 28.56], ["falasse", 28.56, 29.0], ["com", 29.0, 29.24], ["um", 29.24, 29.34], ["gerente.", 29.34, 30.4]],
];

const CaptionLine: React.FC<{ words: Word[]; start: number }> = ({ words, start }) => {
  const frame = useCurrentFrame();
  const t = frame / FPS + start;
  const pop = interpolate(frame, [0, 5], [0.92, 1], { ...clamp, easing: ease });
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: 1440, display: "flex", justifyContent: "center" }}>
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
        {words.map(([w, s], k) => (
          <span key={k} style={{ color: t >= s ? (t < (words[k + 1]?.[1] ?? Infinity) ? GOLD : CREAM) : "rgba(242,236,223,0.55)" }}>
            {w}
            {k < words.length - 1 ? " " : ""}
          </span>
        ))}
      </div>
    </div>
  );
};

const Progress: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return <div style={{ position: "absolute", top: 0, left: 0, height: 6, width: `${(frame / durationInFrames) * 100}%`, background: GOLD }} />;
};

export const Reel: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: GREEN }}>
      {SEGMENTS.map((seg) => (
        <Sequence key={seg.i} name={`Corte ${seg.i + 1}`} from={seg.from} durationInFrames={seg.durationInFrames + (seg.i === SEGMENTS.length - 1 ? 12 : 0)}>
          <Shot seg={seg} />
        </Sequence>
      ))}

      <Sequence name="Gancho" from={0} durationInFrames={f(4.6)}>
        <Hook />
      </Sequence>
      <Sequence name="Linha do tempo" from={f(4.72)} durationInFrames={f(17.45 - 4.72)}>
        <Timeline durationInFrames={f(17.45 - 4.72)} />
      </Sequence>
      <Sequence name="Toqan" from={f(17.56)} durationInFrames={TOTAL_FRAMES - f(17.56)}>
        <ToqanCard durationInFrames={TOTAL_FRAMES - f(17.56)} />
      </Sequence>

      {CAPTIONS.map((words, k) => {
        const start = words[0][1];
        const end = CAPTIONS[k + 1]?.[0][1] ?? TOTAL_FRAMES / FPS;
        return (
          <Sequence key={k} name={`Legenda ${k + 1}`} from={f(start)} durationInFrames={Math.max(1, f(end) - f(start))}>
            <CaptionLine words={words} start={start} />
          </Sequence>
        );
      })}
      <Progress />
    </AbsoluteFill>
  );
};
