import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { BODY, CARD_TOP, clamp, CREAM, ease, f, FPS, GOLD, GREEN_92, TITLE } from "../brand";
import type { CardItem } from "../types";

export const Card: React.FC<{ children: React.ReactNode; durationInFrames: number }> = ({ children, durationInFrames }) => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 10], [0, 1], { ...clamp, easing: ease });
  const exit = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: 80,
        right: 80,
        top: CARD_TOP,
        background: GREEN_92,
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

export const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 28, color: GOLD, letterSpacing: 0.5, marginBottom: 10 }}>
    {children}
  </div>
);

/** Renders `text` with `highlight` (a substring) in gold. */
export const Highlighted: React.FC<{ text: string; highlight?: string }> = ({ text, highlight }) => {
  const i = highlight ? text.indexOf(highlight) : -1;
  if (!highlight || i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <span style={{ color: GOLD }}>{highlight}</span>
      {text.slice(i + highlight.length)}
    </>
  );
};

const titleStyle = (size: number): React.CSSProperties => ({
  fontFamily: TITLE,
  fontWeight: 600,
  fontSize: size,
  lineHeight: 1.12,
  color: CREAM,
});

const Reveal: React.FC<{ at: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ at, children, style }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 10], [0, 1], { ...clamp, easing: ease });
  return <div style={{ ...style, opacity: p, translate: `0px ${interpolate(p, [0, 1], [12, 0])}px` }}>{children}</div>;
};

const DatesBody: React.FC<{ card: Extract<CardItem, { type: "dates" }> }> = ({ card }) => {
  const frame = useCurrentFrame();
  const line = interpolate(frame, [4, 26], [0, 100], { ...clamp, easing: ease });
  const local = (s: number) => f(s - card.from);
  return (
    <>
      <Label>{card.label}</Label>
      <div style={titleStyle(62)}>
        <Highlighted text={card.title} highlight={card.highlight} />
      </div>
      <div style={{ position: "relative", height: 26, margin: "22px 0 18px" }}>
        <div style={{ position: "absolute", top: 12, left: 0, height: 2, width: `${line}%`, background: GOLD }} />
        {card.items.map((it, k) => {
          const x = card.items.length === 1 ? 0 : (k / (card.items.length - 1)) * 100;
          return (
            <div
              key={k}
              style={{
                position: "absolute",
                top: 3,
                left: `calc(${x}% - ${(x / 100) * 20}px)`,
                width: 20,
                height: 20,
                borderRadius: 10,
                background: GOLD,
                opacity: interpolate(frame, [local(it.at), local(it.at) + 6], [0, 1], clamp),
              }}
            />
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
        {card.items.map((it, k) => (
          <Reveal key={k} at={local(it.at)} style={{ textAlign: k === card.items.length - 1 && k > 0 ? "right" : "left" }}>
            <div style={{ fontFamily: TITLE, fontWeight: 600, fontSize: 56, color: GOLD, lineHeight: 1 }}>{it.date}</div>
            <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 30, color: CREAM, marginTop: 8 }}>{it.text}</div>
          </Reveal>
        ))}
      </div>
    </>
  );
};

const PointsBody: React.FC<{ card: Extract<CardItem, { type: "points" }> }> = ({ card }) => {
  const frame = useCurrentFrame();
  const t = frame / FPS + card.from;
  const idx = Math.max(0, card.points.findLastIndex(([s]) => t >= s));
  const since = frame - f(card.points[idx][0] - card.from);
  const p = interpolate(since, [0, 8], [0, 1], { ...clamp, easing: ease });
  return (
    <>
      <Label>
        {card.label}
        {card.points.length > 1 ? `  ·  ${idx + 1}/${card.points.length}` : ""}
      </Label>
      <div style={{ ...titleStyle(62), opacity: p, translate: `0px ${interpolate(p, [0, 1], [10, 0])}px` }}>
        {card.points[idx][1]}
      </div>
    </>
  );
};

const CompareBody: React.FC<{ card: Extract<CardItem, { type: "compare" }> }> = ({ card }) => (
  <>
    <Label>{card.label}</Label>
    {card.rows.map((r, k) => (
      <Reveal key={r.name} at={f(r.at - card.from)} style={{ display: "flex", alignItems: "baseline", gap: 24, marginTop: k ? 18 : 6 }}>
        <div style={{ fontFamily: TITLE, fontWeight: 600, fontSize: 56, color: GOLD, minWidth: 230 }}>{r.name}</div>
        <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 38, lineHeight: 1.25, color: CREAM }}>{r.text}</div>
      </Reveal>
    ))}
    {card.footer && (
      <Reveal at={f(card.footer.at - card.from)} style={{ marginTop: 26, paddingTop: 22, borderTop: "2px solid rgba(210,178,107,0.45)" }}>
        <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 36, lineHeight: 1.3, color: CREAM }}>{card.footer.text}</div>
      </Reveal>
    )}
  </>
);

const StatementBody: React.FC<{ card: Extract<CardItem, { type: "statement" }> }> = ({ card }) => (
  <>
    <Label>{card.label}</Label>
    {card.lines.map((l, k) => (
      <Reveal key={k} at={f(l.at - card.from)} style={{ marginTop: k ? 18 : 0 }}>
        <div style={{ ...titleStyle(50), lineHeight: 1.14, color: l.gold ? GOLD : CREAM }}>{l.text}</div>
      </Reveal>
    ))}
  </>
);

export const CardView: React.FC<{ card: CardItem }> = ({ card }) => {
  const durationInFrames = f(card.to) - f(card.from);
  return (
    <Card durationInFrames={durationInFrames}>
      {card.type === "title" && (
        <>
          <Label>{card.label}</Label>
          <div style={titleStyle(70)}>
            <Highlighted text={card.text} highlight={card.highlight} />
          </div>
        </>
      )}
      {card.type === "dates" && <DatesBody card={card} />}
      {card.type === "points" && <PointsBody card={card} />}
      {card.type === "compare" && <CompareBody card={card} />}
      {card.type === "statement" && <StatementBody card={card} />}
    </Card>
  );
};

/** Big number in the top band, for one striking figure. */
export const Callout: React.FC<{ value: string; text: string; durationInFrames: number }> = ({ value, text, durationInFrames }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, 14], [0, 1], { ...clamp, easing: ease });
  return (
    <Card durationInFrames={durationInFrames}>
      <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
        <div
          style={{
            fontFamily: TITLE,
            fontWeight: 600,
            fontSize: 150,
            lineHeight: 0.9,
            color: GOLD,
            scale: String(interpolate(p, [0, 1], [0.85, 1])),
            whiteSpace: "nowrap",
          }}
        >
          {value}
        </div>
        <div style={{ fontFamily: BODY, fontWeight: 500, fontSize: 36, lineHeight: 1.25, color: CREAM }}>{text}</div>
      </div>
    </Card>
  );
};
