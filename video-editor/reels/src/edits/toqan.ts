import type { EditConfig } from "../types";

// "iFood e 99 lançaram um gerente de IA" — parte 1 (gancho, contexto e Toqan).
export const toqan: EditConfig = {
  id: "toqan",
  source: "toqan.mp4",
  cuts: [
  [1.5, 3.15], [4.6, 7.55], [11.1, 12.3], [20.65, 22.8], [24.65, 25.6], [26.28, 28.55],
  [33.05, 34.4], [46.92, 48.85], [49.46, 52.5], [69.2, 70.32], [79.3, 82.65], [85.8, 87.4],
  [90.9, 93.08], [94.76, 95.85], [105.4, 108.6],
],
  captions: [
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
],
  cards: [
    { type: "title", from: 0, to: 4.6, label: "Novidade no delivery", text: "iFood e 99 lançaram um gerente de IA", highlight: "gerente de IA" },
    {
      type: "dates",
      from: 12.5,
      to: 17.3,
      label: "Dois apps de delivery",
      title: "Em menos de um mês",
      highlight: "um mês",
      items: [
        { at: 12.66, date: "17/set", text: "iFood lança o Toqan" },
        { at: 14.66, date: "14/out", text: "99 lança o Zesto" },
      ],
    },
    {
      type: "points",
      from: 18.0,
      to: 26.9,
      label: "Toqan · iFood",
      points: [
        [18.0, "Um chat de IA"],
        [21.16, "Que já conhece as suas vendas"],
        [24.8, "Mesmo login do Portal do Parceiro"],
      ],
    },
  ],
  callouts: [{ from: 4.72, to: 12.4, value: "2 apps", text: "de delivery lançaram IA para o dono de restaurante" }],
  chapters: [{ at: 17.4, label: "Parte 1 · iFood", title: "O que é o Toqan?" }],
  broll: [
    {
      from: 26.9,
      to: 30.4,
      mode: "split",
      label: "Ilustração",
      graphic: { kind: "chat", title: "Pergunte como a um gerente", questions: ["Como foram as vendas ontem?", "Por que os cancelamentos subiram?"] },
    },
  ],
  sfx: true,
};
