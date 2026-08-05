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

/** Turnos que a turma usa na chamada: integral marca manhã e tarde. */
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
export function frequenciaAluno(estado: EstadoEscola, aluno: Aluno): number | null {
  const turnos = turnosDaTurma(aluno.turno);
  let previstos = 0;
  let presencas = 0;
  for (const chamada of Object.values(estado.chamadas)) {
    if (chamada.turmaId !== aluno.turmaId || !chamada.lancadaEm) continue;
    const registro = chamada.registros[aluno.id];
    if (!registro) continue;
    for (const turno of turnos) {
      previstos += 1;
      if (registro[turno]) presencas += 1;
    }
  }
  if (previstos === 0) return null;
  return Math.round((presencas / previstos) * 1000) / 10;
}

export function faltasAluno(estado: EstadoEscola, aluno: Aluno): number {
  const turnos = turnosDaTurma(aluno.turno);
  let faltas = 0;
  for (const chamada of Object.values(estado.chamadas)) {
    if (chamada.turmaId !== aluno.turmaId || !chamada.lancadaEm) continue;
    const registro = chamada.registros[aluno.id];
    if (!registro) continue;
    // Turma integral: manhã e tarde ausentes contam como uma falta no dia.
    const ausencias = turnos.filter((t) => !registro[t]).length;
    if (ausencias === turnos.length) faltas += 1;
    else if (ausencias > 0) faltas += 0.5;
  }
  return faltas;
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
