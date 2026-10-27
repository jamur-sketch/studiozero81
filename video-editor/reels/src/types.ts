/** [word, start, end] in seconds of the edited video. */
export type Word = [string, number, number];

export type CardItem =
  | { type: "title"; from: number; to: number; label: string; text: string; highlight?: string }
  | { type: "points"; from: number; to: number; label: string; points: [number, string][] }
  | {
      type: "dates";
      from: number;
      to: number;
      label: string;
      title: string;
      highlight?: string;
      items: { at: number; date: string; text: string }[];
    }
  /** Side-by-side rows that build up as each is spoken (e.g. "ChatGPT x Toqan"), with an optional footer. */
  | {
      type: "compare";
      from: number;
      to: number;
      label: string;
      rows: { at: number; name: string; text: string }[];
      footer?: { at: number; text: string };
    }
  /** Closing line(s); a `gold` line is the punchline. */
  | { type: "statement"; from: number; to: number; label: string; lines: { at: number; text: string; gold?: boolean }[] };

/** Graphics drawn in code, in the brand style. Add new kinds in components/Graphics.tsx. */
export type Graphic = { kind: "chat"; title: string; questions: string[] };

export type Broll = {
  from: number;
  to: number;
  /** full: covers the screen; split: top half, speaker moves to the bottom; pip: card in the top band. */
  mode: "full" | "split" | "pip";
  /** Image in public/ (photo, print, logo...). */
  image?: string;
  /** Or a graphic made in code (props must be plain data: they are serialized). */
  graphic?: Graphic;
  /** Small label over the image, e.g. the source. */
  label?: string;
};

export type EditConfig = {
  id: string;
  /** Recording in public/ (vertical, 30 fps). */
  source: string;
  /** Best take of each line, in seconds of the source. */
  cuts: [number, number][];
  captions: Word[][];
  cards: CardItem[];
  callouts: { from: number; to: number; value: string; text: string }[];
  /** Full-screen wipe that opens a new block of the script. */
  chapters: { at: number; label: string; title: string }[];
  broll: Broll[];
  /** Background music in public/, kept low under the voice. */
  music?: { src: string; volume: number };
  /** Subtle whoosh/pop on transitions and card changes. */
  sfx: boolean;
};
