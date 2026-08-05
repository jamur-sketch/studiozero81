/**
 * Utilidades de data trabalhando sempre com string "YYYY-MM-DD" no fuso local,
 * para não escorregar um dia por causa de UTC.
 */

const DIAS_SEMANA = [
  "DOMINGO",
  "SEGUNDA-FEIRA",
  "TERÇA-FEIRA",
  "QUARTA-FEIRA",
  "QUINTA-FEIRA",
  "SEXTA-FEIRA",
  "SÁBADO",
];

export function paraData(iso: string): Date {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

export function paraIso(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${mes}-${dia}`;
}

export function hojeIso(): string {
  return paraIso(new Date());
}

export function somarDias(iso: string, dias: number): string {
  const d = paraData(iso);
  d.setDate(d.getDate() + dias);
  return paraIso(d);
}

export function formatarBr(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function nomeDiaSemana(iso: string): string {
  return DIAS_SEMANA[paraData(iso).getDay()];
}

/** "TERÇA-FEIRA - 04/08/2026" */
export function rotuloData(iso: string): string {
  return `${nomeDiaSemana(iso)} - ${formatarBr(iso)}`;
}

export function ehFimDeSemana(iso: string): boolean {
  const dia = paraData(iso).getDay();
  return dia === 0 || dia === 6;
}

export function idadeEm(nascimento: string, referencia = hojeIso()): number {
  const [anoN, mesN, diaN] = nascimento.split("-").map(Number);
  const [anoR, mesR, diaR] = referencia.split("-").map(Number);
  let idade = anoR - anoN;
  if (mesR < mesN || (mesR === mesN && diaR < diaN)) idade -= 1;
  return idade;
}

export function idadeExtenso(nascimento: string, referencia = hojeIso()): string {
  const [anoN, mesN] = nascimento.split("-").map(Number);
  const [anoR, mesR] = referencia.split("-").map(Number);
  let meses = (anoR - anoN) * 12 + (mesR - mesN);
  if (paraData(referencia).getDate() < paraData(nascimento).getDate()) meses -= 1;
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  if (anos === 0) return `${resto} ${resto === 1 ? "mês" : "meses"}`;
  const parteAnos = `${anos} ${anos === 1 ? "ano" : "anos"}`;
  if (resto === 0) return parteAnos;
  return `${parteAnos} e ${resto} ${resto === 1 ? "mês" : "meses"}`;
}

/**
 * Dias letivos do período: segunda a sexta, fora feriados, e — este é o ponto
 * central do pedido — nunca à frente de `ate` (por padrão, hoje). Os dias vão
 * "aparecendo" conforme as datas viram.
 */
export function diasLetivos(
  inicio: string,
  fim: string,
  feriados: string[] = [],
  ate: string = hojeIso(),
): string[] {
  const limite = fim < ate ? fim : ate;
  const feriadosSet = new Set(feriados);
  const dias: string[] = [];
  let atual = inicio;
  while (atual <= limite) {
    if (!ehFimDeSemana(atual) && !feriadosSet.has(atual)) dias.push(atual);
    atual = somarDias(atual, 1);
  }
  return dias;
}
