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

// Best take of each line, in seconds of the source recording (IMG_5977).
const CUTS: [number, number][] = [
  [1.14, 3.2], [4.16, 6.91], [9.62, 10.86], [15.21, 18.66], [19.49, 23.12], [26.0, 28.17],
  [30.11, 32.95], [36.01, 38.77], [47.67, 49.92], [52.64, 55.22], [57.92, 60.87], [66.04, 69.31],
  [73.73, 75.16], [77.17, 78.96], [86.27, 87.34], [87.44, 91.46], [94.64, 99.07], [112.42, 115.36],
  [136.58, 138.98], [153.4, 155.45], [161.19, 163.41], [165.29, 167.52], [171.39, 173.43], [176.17, 179.39],
  [181.09, 183.27], [186.37, 187.82], [190.7, 194.03], [204.88, 205.92], [206.44, 208.66], [210.48, 211.5],
  [214.77, 218.42], [219.04, 219.85], [222.05, 224.43], [229.23, 230.21], [232.45, 234.54], [236.98, 237.82],
  [239.59, 241.55], [244.08, 246.66], [247.03, 248.25], [251.49, 252.32], [274.99, 278.16], [292.86, 296.61],
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

// Fades/slides in `at` frames after the start of its Sequence.
const Reveal: React.FC<{ at: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ at, children, style }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 10], [0, 1], { ...clamp, easing: ease });
  return <div style={{ ...style, opacity: p, translate: `0px ${interpolate(p, [0, 1], [12, 0])}px` }}>{children}</div>;
};

const Hook: React.FC = () => (
  <Card durationInFrames={f(4.8)}>
    <Label>Novidade no delivery</Label>
    <div style={{ fontFamily: TITLE, fontWeight: 600, fontSize: 70, lineHeight: 1.12, color: CREAM }}>
      iFood e 99 lançaram uma <span style={{ color: GOLD }}>IA</span> pra gerir o seu restaurante
    </div>
  </Card>
);

// Edit-timeline seconds where each block starts.
const T_TIMELINE = 4.84;
const T_IFOOD = 13.28;
const T_99 = 15.58;
const T_TOQAN = 20.96;
const T_CHATGPT = 44.84;
const T_ZESTO = 50.18;
const T_SUMMARY = 80.12;
const T_CLOSE = 90.82;

const DateDot: React.FC<{ at: number; date: string; text: string; align: "left" | "right" }> = ({ at, date, text, align }) => (
  <Reveal at={at} style={{ textAlign: align }}>
    <div style={{ fontFamily: TITLE, fontWeight: 600, fontSize: 56, color: GOLD, lineHeight: 1 }}>{date}</div>
    <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 30, color: CREAM, marginTop: 8 }}>{text}</div>
  </Reveal>
);

const Timeline: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const line = interpolate(frame, [4, 26], [0, 100], { ...clamp, easing: ease });
  const dots = [f(T_IFOOD - T_TIMELINE), f(T_99 - T_TIMELINE)];
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
              opacity: interpolate(frame, [dots[k], dots[k] + 6], [0, 1], clamp),
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <DateDot at={dots[0]} date="17/set" text="iFood lança o Toqan" align="left" />
        <DateDot at={dots[1]} date="14/out" text="99 lança o Zesto" align="right" />
      </div>
    </Card>
  );
};

// One headline at a time, swapping as each point is spoken. Times are edit seconds.
const PointsCard: React.FC<{ label: string; points: [number, string][]; durationInFrames: number }> = ({
  label,
  points,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const t = frame / FPS + points[0][0];
  const idx = Math.max(0, points.findLastIndex(([s]) => t >= s));
  const since = frame - f(points[idx][0] - points[0][0]);
  const p = interpolate(since, [0, 8], [0, 1], { ...clamp, easing: ease });
  return (
    <Card durationInFrames={durationInFrames}>
      <Label>
        {label}  ·  {idx + 1}/{points.length}
      </Label>
      <div
        style={{
          fontFamily: TITLE,
          fontWeight: 600,
          fontSize: 62,
          lineHeight: 1.12,
          color: CREAM,
          opacity: p,
          translate: `0px ${interpolate(p, [0, 1], [10, 0])}px`,
        }}
      >
        {points[idx][1]}
      </div>
    </Card>
  );
};

const TOQAN_POINTS: [number, string][] = [
  [T_TOQAN, "Um chat de IA"],
  [23.36, "Que já conhece as suas vendas"],
  [25.82, "Mesmo login do Portal do Parceiro"],
  [28.88, "Pergunte como a um gerente"],
  [32.16, "“Como foram as vendas ontem?”"],
  [33.6, "“Por que os cancelamentos subiram?”"],
  [35.42, "Resumo do dia no seu WhatsApp"],
  [40.42, "De graça, por enquanto"],
];

const ZESTO_POINTS: [number, string][] = [
  [T_ZESTO, "Sistema de gestão completo"],
  [54.42, "Mensalidade, sem comissão por pedido"],
  [58.66, "WhatsApp, apps e balcão juntos"],
  [64.18, "Controle de estoque"],
  [65.36, "Robô que atende no WhatsApp"],
  [68.96, "Zeca, um assistente que executa ordens"],
  [72.22, "“Manda um cupom pra quem não pede há 15 dias”"],
  [77.72, "Preço ainda não divulgado"],
];

// Side-by-side rows that build up as each one is spoken. Times are edit seconds.
const CompareCard: React.FC<{
  label: string;
  start: number;
  rows: [number, string, string][];
  footer?: [number, string];
  durationInFrames: number;
}> = ({ label, start, rows, footer, durationInFrames }) => (
  <Card durationInFrames={durationInFrames}>
    <Label>{label}</Label>
    {rows.map(([at, name, text], k) => (
      <Reveal key={name} at={f(at - start)} style={{ display: "flex", alignItems: "baseline", gap: 24, marginTop: k ? 18 : 6 }}>
        <div style={{ fontFamily: TITLE, fontWeight: 600, fontSize: 56, color: GOLD, minWidth: 230 }}>{name}</div>
        <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 38, lineHeight: 1.25, color: CREAM }}>{text}</div>
      </Reveal>
    ))}
    {footer ? (
      <Reveal at={f(footer[0] - start)} style={{ marginTop: 26, paddingTop: 22, borderTop: "2px solid rgba(210,178,107,0.45)" }}>
        <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 36, lineHeight: 1.3, color: CREAM }}>{footer[1]}</div>
      </Reveal>
    ) : null}
  </Card>
);

const Closing: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => (
  <Card durationInFrames={durationInFrames + 8}>
    <Label>Para levar</Label>
    <div style={{ fontFamily: TITLE, fontWeight: 600, fontSize: 50, lineHeight: 1.14, color: CREAM }}>
      A IA não vai gerenciar o seu restaurante.
    </div>
    <Reveal at={f(93.82 - T_CLOSE)} style={{ marginTop: 18 }}>
      <div style={{ fontFamily: TITLE, fontWeight: 600, fontSize: 50, lineHeight: 1.14, color: GOLD }}>
        Mas quem aprende a perguntar pra ela decide mais rápido.
      </div>
    </Reveal>
  </Card>
);

type Word = [string, number, number];
// Spoken words (seconds of the edit), grouped into caption lines.
const CAPTIONS: Word[][] = [
  [["O", 0.0, 0.2], ["iFood", 0.2, 0.68], ["e", 0.68, 1.06], ["a", 1.06, 1.14]],
  [["99", 1.14, 1.5], ["lançaram", 1.5, 2.64], ["uma", 2.64, 2.88], ["IA", 2.88, 3.12]],
  [["para", 3.12, 3.36], ["gerir", 3.36, 3.88], ["o", 3.88, 4.02], ["seu", 4.02, 4.14]],
  [["restaurante.", 4.14, 4.84]],
  [["Em", 4.84, 4.96], ["menos", 4.96, 5.18], ["de", 5.18, 5.38], ["um", 5.38, 5.52]],
  [["mês,", 5.52, 6.18], ["as", 6.18, 6.28], ["duas", 6.28, 6.44], ["maiores", 6.44, 6.96]],
  [["plataformas", 6.96, 7.76], ["de", 7.76, 7.9]],
  [["Marketplace", 7.9, 8.64], ["do", 8.64, 8.86], ["Brasil,", 8.86, 9.22]],
  [["lançaram", 9.22, 10.16], ["cada", 10.16, 10.44], ["uma", 10.44, 10.82], ["uma", 10.82, 11.06]],
  [["ferramenta", 11.06, 11.66], ["de", 11.66, 11.88], ["IA", 11.88, 12.08], ["para", 12.08, 12.22]],
  [["o", 12.22, 12.4], ["seu", 12.4, 12.48], ["restaurante.", 12.48, 13.24]],
  [["O", 13.24, 13.28], ["iFood", 13.28, 13.66], ["lançou", 13.66, 14.5], ["o", 14.5, 14.72]],
  [["Toqan", 14.72, 15.32], ["e", 15.32, 15.48], ["a", 15.48, 15.58], ["99Food", 15.58, 16.58]],
  [["lançou", 16.58, 17.32], ["o", 17.32, 17.52], ["Zesto.", 17.52, 18.28]],
  [["E", 18.28, 18.36], ["são", 18.36, 18.5], ["coisas", 18.5, 18.94], ["totalmente", 18.94, 19.96]],
  [["diferentes.", 19.96, 20.96]],
  [["O", 20.96, 21.12], ["Toqan", 21.12, 21.76], ["é", 21.76, 21.96], ["um", 21.96, 22.08]],
  [["chat", 22.08, 22.42], ["de", 22.42, 22.74], ["IA", 22.74, 23.0], ["que", 23.0, 23.36]],
  [["já", 23.36, 23.62], ["conhece", 23.62, 24.24], ["as", 24.24, 24.4], ["suas", 24.4, 24.68]],
  [["vendas", 24.68, 25.12], ["no", 25.12, 25.28], ["iFood.", 25.28, 25.82]],
  [["Você", 25.82, 26.12], ["entra", 26.12, 26.34], ["com", 26.34, 26.54], ["o", 26.54, 26.66]],
  [["mesmo", 26.66, 26.8], ["login", 26.8, 27.22], ["do", 27.22, 27.46], ["portal", 27.46, 27.78]],
  [["de", 27.78, 27.98], ["parceiros", 27.98, 28.5], ["e", 28.5, 28.88], ["pergunta", 28.88, 29.32]],
  [["como", 29.32, 29.74], ["se", 29.74, 29.9], ["você", 29.9, 30.16], ["estivesse", 30.16, 30.44]],
  [["falando", 30.44, 30.78], ["com", 30.78, 31.08], ["o", 31.08, 31.24], ["seu", 31.24, 31.4], ["gerente.", 31.4, 32.16]],
  [["Como", 32.16, 32.22], ["foram", 32.22, 32.48], ["as", 32.48, 32.64], ["vendas", 32.64, 32.86], ["ontem?", 32.86, 33.6]],
  [["Por", 33.6, 33.6], ["que", 33.6, 33.78], ["os", 33.78, 33.94], ["cancelamentos", 33.94, 34.44]],
  [["subiram?", 34.44, 35.42]],
  [["Ele", 35.42, 35.44], ["responde", 35.44, 36.2], ["e", 36.2, 36.44], ["ainda", 36.44, 36.72]],
  [["te", 36.72, 36.94], ["manda", 36.94, 37.16], ["um", 37.16, 37.32], ["resumo", 37.32, 37.92]],
  [["do", 37.92, 38.46], ["dia", 38.46, 38.72], ["de", 38.72, 38.86], ["ontem", 38.86, 39.22]],
  [["no", 39.22, 39.52], ["seu", 39.52, 39.7], ["WhatsApp.", 39.7, 40.42]],
  [["Por", 40.42, 40.54], ["enquanto,", 40.54, 41.18]],
  [["é", 41.18, 41.52], ["de", 41.52, 41.64], ["graça", 41.64, 42.1], ["e", 42.1, 42.64]],
  [["para", 42.64, 42.98], ["quem", 42.98, 43.14], ["tem", 43.14, 43.44], ["conta", 43.44, 44.14]],
  [["no", 44.14, 44.3], ["iFood.", 44.3, 44.84]],
  [["No", 44.84, 44.94], ["ChatGPT,", 44.94, 46.04]],
  [["você", 46.04, 46.24], ["precisa", 46.24, 46.56], ["subir", 46.56, 46.94], ["os", 46.94, 47.2], ["dados.", 47.2, 47.78]],
  [["O", 47.78, 47.9], ["Toqan", 47.9, 48.3], ["já", 48.3, 48.62], ["parte", 48.62, 49.04]],
  [["dos", 49.04, 49.42], ["seus", 49.42, 49.64], ["dados.", 49.64, 50.18]],
  [["O", 50.18, 50.32], ["Zesto,", 50.32, 50.98]],
  [["da", 50.98, 51.18], ["99,", 51.18, 52.14]],
  [["é", 52.14, 52.3], ["um", 52.3, 52.44], ["sistema", 52.44, 52.86], ["de", 52.86, 53.1]],
  [["gestão", 53.1, 53.4], ["completo.", 53.4, 54.42]],
  [["Ele", 54.42, 54.56], ["é", 54.56, 54.66], ["pago", 54.66, 55.06], ["por", 55.06, 55.68]],
  [["mensalidade", 55.68, 56.5], ["e", 56.5, 56.74], ["não", 56.74, 56.86], ["tem", 56.86, 57.1]],
  [["nenhuma", 57.1, 57.4], ["comissão", 57.4, 57.92], ["por", 57.92, 58.1], ["pedido.", 58.1, 58.66]],
  [["Ele", 58.66, 58.86], ["junta", 58.86, 59.28], ["todos", 59.28, 59.7], ["os", 59.7, 60.0]],
  [["pedidos", 60.0, 60.54], ["do", 60.54, 61.0], ["seu", 61.0, 61.18], ["WhatsApp,", 61.18, 62.02]],
  [["dos", 62.02, 62.16], ["apps", 62.16, 63.06], ["e", 63.06, 63.18], ["do", 63.18, 63.32]],
  [["balcão,", 63.32, 64.18], ["controla", 64.18, 64.48], ["o", 64.48, 64.64]],
  [["estoque", 64.64, 65.36], ["e", 65.36, 65.64], ["tem", 65.64, 65.84], ["um", 65.84, 66.0]],
  [["robô", 66.0, 66.34], ["que", 66.34, 66.64], ["atende", 66.64, 67.02]],
  [["diretamente", 67.02, 67.84], ["no", 67.84, 68.08], ["seu", 68.08, 68.24], ["WhatsApp.", 68.24, 68.96]],
  [["E", 68.96, 69.04], ["tem", 69.04, 69.2], ["o", 69.2, 69.32], ["Zeca,", 69.32, 69.98]],
  [["um", 69.98, 70.08], ["assistente", 70.08, 70.7], ["que", 70.7, 70.94]],
  [["executa", 70.94, 71.44], ["ordens.", 71.44, 72.22]],
  [["Você", 72.22, 72.46], ["fala,", 72.46, 73.28]],
  [["manda", 73.28, 73.48], ["o", 73.48, 73.6], ["cupom", 73.6, 73.9], ["para", 73.9, 74.3]],
  [["quem", 74.3, 74.44], ["tem", 74.44, 74.62], ["mais", 74.62, 74.86], ["de", 74.86, 75.06]],
  [["15", 75.06, 75.26], ["dias", 75.26, 75.64], ["sem", 75.64, 75.82], ["fazer", 75.82, 76.06]],
  [["um", 76.06, 76.2], ["pedido", 76.2, 76.86], ["e", 76.86, 77.0], ["ele", 77.0, 77.1], ["manda.", 77.1, 77.72]],
  [["O", 77.72, 77.82], ["preço", 77.82, 78.24], ["ainda", 78.24, 78.88], ["não", 78.88, 79.16]],
  [["foi", 79.16, 79.36], ["divulgado.", 79.36, 80.12]],
  [["Resumindo,", 80.12, 81.02], ["o", 81.02, 81.16], ["Toqan", 81.16, 81.54]],
  [["analisa", 81.54, 82.14], ["os", 82.14, 82.28], ["seus", 82.28, 82.42], ["números.", 82.42, 83.14]],
  [["O", 83.14, 83.28], ["Zesto", 83.28, 83.76], ["quer", 83.76, 84.06], ["ser", 84.06, 84.34]],
  [["o", 84.34, 84.46], ["seu", 84.46, 84.64], ["sistema", 84.64, 85.12], ["de", 85.12, 85.3], ["PDV.", 85.3, 85.68]],
  [["Se", 85.68, 86.22], ["você", 86.22, 86.48], ["quer", 86.48, 86.7], ["entender", 86.7, 87.04]],
  [["melhor", 87.04, 87.52], ["o", 87.52, 87.68], ["seu", 87.68, 87.76], ["delivery,", 87.76, 88.48]],
  [["comece", 88.48, 88.9], ["pelo", 88.9, 89.12], ["Toqan.", 89.12, 89.78]],
  [["É", 89.78, 89.82], ["de", 89.82, 89.92], ["graça.", 89.92, 90.82]],
  [["A", 90.82, 90.98], ["IA", 90.98, 91.22], ["não", 91.22, 91.9], ["vai", 91.9, 92.22]],
  [["gerir", 92.22, 92.8], ["o", 92.8, 92.92], ["seu", 92.92, 93.06], ["restaurante.", 93.06, 93.82]],
  [["Mas", 93.82, 94.02], ["quem", 94.02, 94.48], ["aprende", 94.48, 94.98], ["a", 94.98, 95.02]],
  [["perguntar", 95.02, 95.6], ["para", 95.6, 95.74], ["ela,", 95.74, 96.4]],
  [["decide", 96.4, 96.66], ["mais", 96.66, 96.98], ["rápido.", 96.98, 97.48]],
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

// Card shown from `start` to `end` (edit seconds).
const span = (start: number, end: number) => ({ from: f(start), durationInFrames: f(end) - f(start) });

export const Reel: React.FC = () => {
  const end = TOTAL_FRAMES / FPS;
  return (
    <AbsoluteFill style={{ background: GREEN }}>
      {SEGMENTS.map((seg) => (
        <Sequence key={seg.i} name={`Corte ${seg.i + 1}`} from={seg.from} durationInFrames={seg.durationInFrames + (seg.i === SEGMENTS.length - 1 ? 12 : 0)}>
          <Shot seg={seg} />
        </Sequence>
      ))}

      <Sequence name="Gancho" from={0} durationInFrames={f(4.8)}>
        <Hook />
      </Sequence>
      <Sequence name="Linha do tempo" {...span(T_TIMELINE, 20.8)}>
        <Timeline durationInFrames={span(T_TIMELINE, 20.8).durationInFrames} />
      </Sequence>
      <Sequence name="Toqan" {...span(T_TOQAN, 44.75)}>
        <PointsCard label="Toqan · iFood" points={TOQAN_POINTS} durationInFrames={span(T_TOQAN, 44.75).durationInFrames} />
      </Sequence>
      <Sequence name="Não é só um ChatGPT" {...span(T_CHATGPT, 50.1)}>
        <CompareCard
          label="Por que não é só um ChatGPT"
          start={T_CHATGPT}
          rows={[
            [T_CHATGPT, "ChatGPT", "você baixa e sobe planilhas"],
            [47.78, "Toqan", "já parte dos seus dados"],
          ]}
          durationInFrames={span(T_CHATGPT, 50.1).durationInFrames}
        />
      </Sequence>
      <Sequence name="Zesto" {...span(T_ZESTO, 79.95)}>
        <PointsCard label="Zesto · 99" points={ZESTO_POINTS} durationInFrames={span(T_ZESTO, 79.95).durationInFrames} />
      </Sequence>
      <Sequence name="Resumindo" {...span(T_SUMMARY, 90.7)}>
        <CompareCard
          label="Resumindo"
          start={T_SUMMARY}
          rows={[
            [81.02, "Toqan", "analisa os seus números"],
            [83.14, "Zesto", "quer ser o seu sistema"],
          ]}
          footer={[85.68, "Quer entender o seu delivery? Comece pelo Toqan, que é de graça."]}
          durationInFrames={span(T_SUMMARY, 90.7).durationInFrames}
        />
      </Sequence>
      <Sequence name="Fechamento" {...span(T_CLOSE, end)}>
        <Closing durationInFrames={span(T_CLOSE, end).durationInFrames} />
      </Sequence>

      {CAPTIONS.map((words, k) => {
        const start = words[0][1];
        const next = CAPTIONS[k + 1]?.[0][1] ?? end;
        return (
          <Sequence key={k} name={`Legenda ${k + 1}`} from={f(start)} durationInFrames={Math.max(1, f(next) - f(start))}>
            <CaptionLine words={words} start={start} />
          </Sequence>
        );
      })}
      <Progress />
    </AbsoluteFill>
  );
};
