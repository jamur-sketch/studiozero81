import type {
  Aluno,
  Chamada,
  EstadoEscola,
  RegistroPresenca,
  StatusChamada,
  Turma,
  Turno,
  TurnoTurma,
} from "../types";
import { diasLetivos, hojeIso } from "./datas";

export function chaveChamada(turmaId: string, data: string): string {
  return `${turmaId}|${data}`;
}

/**
 * A chamada sempre tem os dois turnos, em qualquer turma — a criança pode ficar
 * só um turno ou o dia todo, e quem registra isso é a professora.
 */
export const TURNOS_CHAMADA: Turno[] = ["manha", "tarde"];

/** Turno em que a turma funciona, para exibição (não é a grade da chamada). */
export function turnosDaTurma(turno: TurnoTurma): Turno[] {
  return turno === "integral" ? ["manha", "tarde"] : [turno];
}

export const ROTULO_TURNO: Record<Turno, string> = {
  manha: "Manhã",
  tarde: "Tarde",
};

export function registroVazio(): RegistroPresenca {
  return { manha: true, tarde: true };
}

export function statusChamada(
  chamada: Chamada | undefined,
  data: string,
  hoje = hojeIso(),
): StatusChamada {
  if (chamada?.lancadaEm) return "lancada";
  return data < hoje ? "atrasada" : "pendente";
}

export const ROTULO_STATUS: Record<StatusChamada, string> = {
  lancada: "Lançada",
  pendente: "Aguardando lançamento",
  atrasada: "Não lançada",
};

/**
 * Datas com chamada prevista para a turma no período, em ordem crescente.
 * Nunca à frente de hoje, nem antes do início de uso do sistema.
 */
export function datasDaTurma(estado: EstadoEscola, periodoId: string, hoje = hojeIso()): string[] {
  const periodo = estado.periodos.find((p) => p.id === periodoId);
  if (!periodo) return [];
  const inicio = periodo.inicio > estado.escola.usoDesde ? periodo.inicio : estado.escola.usoDesde;
  const feriados = estado.feriados.map((f) => f.data);
  return diasLetivos(inicio, periodo.fim, feriados, hoje);
}

export function turmasDaProfessora(estado: EstadoEscola, professoraId: string): Turma[] {
  return estado.turmas.filter((t) => t.professoraIds.includes(professoraId));
}

export function alunosDaTurma(estado: EstadoEscola, turmaId: string): Aluno[] {
  return estado.alunos
    .filter((a) => a.turmaId === turmaId)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export interface Pendencia {
  turmaId: string;
  turmaNome: string;
  data: string;
  status: Exclude<StatusChamada, "lancada">;
}

/**
 * Chamadas que a professora ainda não lançou. É o que dispara o aviso quando
 * ela entra no sistema: `atrasada` = dia já passou, `pendente` = é hoje.
 */
export function pendenciasDaProfessora(
  estado: EstadoEscola,
  professoraId: string,
  hoje = hojeIso(),
): Pendencia[] {
  const pendencias: Pendencia[] = [];
  for (const turma of turmasDaProfessora(estado, professoraId)) {
    for (const periodo of estado.periodos) {
      if (periodo.inicio > hoje) continue;
      for (const data of datasDaTurma(estado, periodo.id, hoje)) {
        const chamada = estado.chamadas[chaveChamada(turma.id, data)];
        const status = statusChamada(chamada, data, hoje);
        if (status === "lancada") continue;
        pendencias.push({ turmaId: turma.id, turmaNome: turma.nome, data, status });
      }
    }
  }
  return pendencias.sort((a, b) => b.data.localeCompare(a.data));
}

/** Frequência do aluno (%) sobre os turnos já lançados. */
export interface Frequencia {
  /** Dias letivos com chamada já lançada. */
  diasLancados: number;
  /** Dias em que a criança veio (presente em pelo menos um turno). */
  diasPresentes: number;
  /** Dias em que faltou aos dois turnos. */
  faltas: number;
  /** Dias presentes sobre dias lançados. `null` enquanto não há chamada. */
  percentual: number | null;
  /** Dia da falta mais recente, se houver. */
  ultimaFalta: string | null;
}

/**
 * Frequência da criança em dias: quantos dias ela veio à escola sobre os dias
 * já lançados. Meio período conta como dia presente; falta é o dia inteiro.
 */
export function frequenciaAluno(estado: EstadoEscola, aluno: Aluno): Frequencia {
  let diasLancados = 0;
  let diasPresentes = 0;
  let faltas = 0;
  let ultimaFalta: string | null = null;

  for (const chamada of Object.values(estado.chamadas)) {
    if (chamada.turmaId !== aluno.turmaId || !chamada.lancadaEm) continue;
    const registro = chamada.registros[aluno.id];
    if (!registro) continue;
    diasLancados += 1;
    const veio = TURNOS_CHAMADA.some((turno) => registro[turno]);
    if (veio) {
      diasPresentes += 1;
    } else {
      faltas += 1;
      if (!ultimaFalta || chamada.data > ultimaFalta) ultimaFalta = chamada.data;
    }
  }

  return {
    diasLancados,
    diasPresentes,
    faltas,
    percentual:
      diasLancados === 0 ? null : Math.round((diasPresentes / diasLancados) * 1000) / 10,
    ultimaFalta,
  };
}

export interface LinhaFrequencia extends Frequencia {
  aluno: Aluno;
}

export interface ResumoTurma {
  linhas: LinhaFrequencia[];
  diasLancados: number;
  /** Média das frequências das crianças, em %. */
  frequenciaMedia: number | null;
  /** Crianças que já bateram o limite de faltas. */
  emAlerta: LinhaFrequencia[];
}

/** Visão geral da turma: como cada criança está de presença no período. */
export function resumoTurma(
  estado: EstadoEscola,
  turmaId: string,
  limiteFaltas = LIMITE_FALTAS_AVISO,
): ResumoTurma {
  const linhas = alunosDaTurma(estado, turmaId).map((aluno) => ({
    aluno,
    ...frequenciaAluno(estado, aluno),
  }));
  const comDados = linhas.filter((linha) => linha.percentual !== null);
  return {
    linhas,
    diasLancados: linhas.reduce((maior, linha) => Math.max(maior, linha.diasLancados), 0),
    frequenciaMedia:
      comDados.length === 0
        ? null
        : Math.round(
            (comDados.reduce((soma, linha) => soma + (linha.percentual ?? 0), 0) /
              comDados.length) *
              10,
          ) / 10,
    emAlerta: linhas.filter((linha) => linha.faltas >= limiteFaltas),
  };
}

export interface SituacaoTurma {
  turma: Turma;
  status: StatusChamada;
  chamada: Chamada | undefined;
  professoras: { id: string; nome: string }[];
  alunos: number;
}

/** Como está a chamada de cada turma num dia — a visão de cobrança da gestão. */
export function situacaoDoDia(
  estado: EstadoEscola,
  data: string,
  hoje = hojeIso(),
): SituacaoTurma[] {
  return estado.turmas.map((turma) => {
    const chamada = estado.chamadas[chaveChamada(turma.id, data)];
    return {
      turma,
      chamada,
      status: statusChamada(chamada, data, hoje),
      professoras: turma.professoraIds
        .map((id) => estado.professoras.find((p) => p.id === id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
        .map((p) => ({ id: p.id, nome: p.nome })),
      alunos: alunosDaTurma(estado, turma.id).length,
    };
  });
}

/** Últimos dias letivos com o status de cada turma, do mais recente ao mais antigo. */
export function panoramaChamadas(
  estado: EstadoEscola,
  periodoId: string,
  quantidadeDeDias = 15,
  hoje = hojeIso(),
): { data: string; turmas: SituacaoTurma[] }[] {
  const datas = datasDaTurma(estado, periodoId, hoje).slice(-quantidadeDeDias).reverse();
  return datas.map((data) => ({ data, turmas: situacaoDoDia(estado, data, hoje) }));
}

// ---------------------------------------------------------------------------
// Aviso de faltas para a direção
// ---------------------------------------------------------------------------

/** A partir daqui a direção é avisada. */
export const LIMITE_FALTAS_AVISO = 5;

export interface AvisoFaltas {
  alunoId: string;
  alunoNome: string;
  turmaId: string;
  turmaNome: string;
  faltas: number;
  diasLancados: number;
  percentual: number | null;
  ultimaFalta: string | null;
  /** Falso depois que a direção marca como visto, até a criança faltar de novo. */
  novo: boolean;
}

/**
 * Crianças que atingiram o limite de faltas. Marcar como visto silencia o
 * aviso até a próxima falta — o caso não some da lista, só deixa de ser novo.
 */
export function avisosDeFaltas(
  estado: EstadoEscola,
  limite = LIMITE_FALTAS_AVISO,
): AvisoFaltas[] {
  const avisos: AvisoFaltas[] = [];
  for (const aluno of estado.alunos) {
    const frequencia = frequenciaAluno(estado, aluno);
    if (frequencia.faltas < limite) continue;
    const turma = estado.turmas.find((t) => t.id === aluno.turmaId);
    avisos.push({
      alunoId: aluno.id,
      alunoNome: aluno.nome,
      turmaId: aluno.turmaId,
      turmaNome: turma?.nome ?? "—",
      faltas: frequencia.faltas,
      diasLancados: frequencia.diasLancados,
      percentual: frequencia.percentual,
      ultimaFalta: frequencia.ultimaFalta,
      novo: (estado.avisosLidos[aluno.id] ?? 0) < frequencia.faltas,
    });
  }
  return avisos.sort((a, b) => b.faltas - a.faltas || a.alunoNome.localeCompare(b.alunoNome, "pt-BR"));
}

// ---------------------------------------------------------------------------
// Alternância das chaves de presença (puro, para o "Todos" da tela de chamada)
// ---------------------------------------------------------------------------

type Registros = Record<string, RegistroPresenca>;

function definir(
  registros: Registros,
  alunoIds: string[],
  turnos: Turno[],
  valor: boolean,
): Registros {
  const saida: Registros = { ...registros };
  for (const id of alunoIds) {
    const atual = saida[id] ?? registroVazio();
    const novo = { ...atual };
    for (const turno of turnos) novo[turno] = valor;
    saida[id] = novo;
  }
  return saida;
}

function todosMarcados(registros: Registros, alunoIds: string[], turnos: Turno[]): boolean {
  return alunoIds.every((id) => {
    const registro = registros[id] ?? registroVazio();
    return turnos.every((turno) => registro[turno]);
  });
}

/** Uma célula: um aluno em um turno. */
export function alternarTurno(
  registros: Registros,
  alunoId: string,
  turno: Turno,
): Registros {
  const atual = registros[alunoId] ?? registroVazio();
  return definir(registros, [alunoId], [turno], !atual[turno]);
}

/** Coluna "Todos" da linha do aluno: marca/desmarca todos os turnos dele. */
export function alternarTodosDoAluno(
  registros: Registros,
  alunoId: string,
  turnos: Turno[],
): Registros {
  const marcar = !todosMarcados(registros, [alunoId], turnos);
  return definir(registros, [alunoId], turnos, marcar);
}

/** Cabeçalho de um turno: marca/desmarca aquele turno para a turma inteira. */
export function alternarColunaTurno(
  registros: Registros,
  alunoIds: string[],
  turno: Turno,
): Registros {
  const marcar = !todosMarcados(registros, alunoIds, [turno]);
  return definir(registros, alunoIds, [turno], marcar);
}

/** Cruzamento cabeçalho x "Todos": marca/desmarca a grade inteira. */
export function alternarTudo(
  registros: Registros,
  alunoIds: string[],
  turnos: Turno[],
): Registros {
  const marcar = !todosMarcados(registros, alunoIds, turnos);
  return definir(registros, alunoIds, turnos, marcar);
}

export function estaTudoMarcado(
  registros: Registros,
  alunoIds: string[],
  turnos: Turno[],
): boolean {
  return todosMarcados(registros, alunoIds, turnos);
}

/**
 * Estado de um conjunto de presenças (a linha "Todos" de uma criança, ou a
 * coluna de um turno na turma inteira). O caso `parcial` precisa existir: sem
 * ele, uma única falta pinta o controle inteiro de vermelho e parece que
 * ninguém veio.
 */
export type EstadoPresenca = "todos" | "nenhum" | "parcial";

export function estadoDoGrupo(
  registros: Registros,
  alunoIds: string[],
  turnos: Turno[],
): EstadoPresenca {
  let marcados = 0;
  let total = 0;
  for (const id of alunoIds) {
    const registro = registros[id] ?? registroVazio();
    for (const turno of turnos) {
      total += 1;
      if (registro[turno]) marcados += 1;
    }
  }
  if (total === 0 || marcados === total) return "todos";
  if (marcados === 0) return "nenhum";
  return "parcial";
}

export function resumoChamada(
  registros: Registros,
  alunoIds: string[],
  turnos: Turno[],
): { presentes: number; ausentes: number } {
  let presentes = 0;
  let ausentes = 0;
  for (const id of alunoIds) {
    const registro = registros[id] ?? registroVazio();
    const faltou = turnos.every((t) => !registro[t]);
    if (faltou) ausentes += 1;
    else presentes += 1;
  }
  return { presentes, ausentes };
}
