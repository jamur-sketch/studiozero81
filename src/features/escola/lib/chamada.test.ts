import { describe, expect, it } from "vitest";
import {
  LIMITE_FALTAS_AVISO,
  TURNOS_CHAMADA,
  alternarColunaTurno,
  alternarTodosDoAluno,
  alternarTudo,
  alternarTurno,
  avisosDeFaltas,
  estaTudoMarcado,
  frequenciaAluno,
  pendenciasDaProfessora,
  resumoChamada,
  resumoTurma,
  statusChamada,
  turnosDaTurma,
} from "./chamada";
import { diasLetivos, idadeExtenso, rotuloData } from "./datas";
import { criarEstadoInicial } from "../data/seed";
import type { Chamada, RegistroPresenca, Turno } from "../types";

const ALUNOS = ["a1", "a2", "a3"];
const TURNOS: Turno[] = ["manha", "tarde"];

function registros(valor = true): Record<string, RegistroPresenca> {
  return Object.fromEntries(ALUNOS.map((id) => [id, { manha: valor, tarde: valor }]));
}

describe("alternância de presença", () => {
  it("marca e desmarca um turno de um aluno só", () => {
    const depois = alternarTurno(registros(), "a2", "manha");
    expect(depois.a2).toEqual({ manha: false, tarde: true });
    expect(depois.a1).toEqual({ manha: true, tarde: true });
  });

  it('"Todos" do aluno desmarca todos os turnos dele quando estão marcados', () => {
    const depois = alternarTodosDoAluno(registros(), "a1", TURNOS);
    expect(depois.a1).toEqual({ manha: false, tarde: false });
    expect(depois.a3).toEqual({ manha: true, tarde: true });
  });

  it('"Todos" do aluno marca tudo quando há turno faltando', () => {
    const parcial = alternarTurno(registros(), "a1", "tarde");
    const depois = alternarTodosDoAluno(parcial, "a1", TURNOS);
    expect(depois.a1).toEqual({ manha: true, tarde: true });
  });

  it("cabeçalho do turno alterna a coluna inteira", () => {
    const desmarcado = alternarColunaTurno(registros(), ALUNOS, "tarde");
    expect(ALUNOS.every((id) => desmarcado[id].tarde === false)).toBe(true);
    expect(ALUNOS.every((id) => desmarcado[id].manha === true)).toBe(true);

    const remarcado = alternarColunaTurno(desmarcado, ALUNOS, "tarde");
    expect(ALUNOS.every((id) => remarcado[id].tarde === true)).toBe(true);
  });

  it('"Todos" geral alterna a grade inteira', () => {
    const vazio = alternarTudo(registros(), ALUNOS, TURNOS);
    expect(estaTudoMarcado(vazio, ALUNOS, TURNOS)).toBe(false);
    expect(resumoChamada(vazio, ALUNOS, TURNOS)).toEqual({ presentes: 0, ausentes: 3 });

    const cheio = alternarTudo(vazio, ALUNOS, TURNOS);
    expect(estaTudoMarcado(cheio, ALUNOS, TURNOS)).toBe(true);
    expect(resumoChamada(cheio, ALUNOS, TURNOS)).toEqual({ presentes: 3, ausentes: 0 });
  });

  it("basta um turno marcado para o aluno contar como presente no dia", () => {
    const meioPeriodo = alternarTurno(registros(), "a1", "tarde");
    expect(resumoChamada(meioPeriodo, ALUNOS, TURNOS)).toEqual({ presentes: 3, ausentes: 0 });
  });

  it("as funções de alternância não mutam o objeto original", () => {
    const original = registros();
    alternarTudo(original, ALUNOS, TURNOS);
    expect(original.a1).toEqual({ manha: true, tarde: true });
  });
});

describe("turnos da turma", () => {
  it("a grade da chamada tem sempre manhã e tarde, em qualquer turma", () => {
    expect(TURNOS_CHAMADA).toEqual(["manha", "tarde"]);
  });

  it("turma integral usa manhã e tarde", () => {
    expect(turnosDaTurma("integral")).toEqual(["manha", "tarde"]);
  });

  it("turma de um turno só usa aquele turno", () => {
    expect(turnosDaTurma("manha")).toEqual(["manha"]);
    expect(turnosDaTurma("tarde")).toEqual(["tarde"]);
  });
});

describe("status da chamada", () => {
  const lancada: Chamada = {
    turmaId: "t1",
    data: "2026-08-03",
    lancadaEm: "2026-08-03T18:00:00",
    lancadaPor: "prof",
    registros: {},
  };

  it("dia anterior sem lançamento fica atrasado", () => {
    expect(statusChamada(undefined, "2026-08-03", "2026-08-04")).toBe("atrasada");
  });

  it("dia de hoje sem lançamento fica pendente", () => {
    expect(statusChamada(undefined, "2026-08-04", "2026-08-04")).toBe("pendente");
  });

  it("chamada salva fica lançada", () => {
    expect(statusChamada(lancada, "2026-08-03", "2026-08-04")).toBe("lancada");
  });
});

describe("calendário letivo", () => {
  it("não mostra datas futuras — os dias aparecem conforme o calendário avança", () => {
    const dias = diasLetivos("2026-07-27", "2026-12-18", [], "2026-08-04");
    expect(dias[0]).toBe("2026-07-27");
    expect(dias[dias.length - 1]).toBe("2026-08-04");
    expect(dias.some((dia) => dia > "2026-08-04")).toBe(false);
  });

  it("pula fins de semana e feriados", () => {
    const dias = diasLetivos("2026-08-31", "2026-09-30", ["2026-09-07"], "2026-09-30");
    expect(dias).not.toContain("2026-09-05"); // sábado
    expect(dias).not.toContain("2026-09-06"); // domingo
    expect(dias).not.toContain("2026-09-07"); // feriado
    expect(dias).toContain("2026-09-08");
  });

  it("formata o rótulo do dia como na chamada", () => {
    expect(rotuloData("2026-08-04")).toBe("TERÇA-FEIRA - 04/08/2026");
  });

  it("calcula idade em anos e meses", () => {
    expect(idadeExtenso("2024-02-10", "2026-08-04")).toBe("2 anos e 5 meses");
    expect(idadeExtenso("2026-05-04", "2026-08-04")).toBe("3 meses");
  });
});

describe("pendências da professora", () => {
  const hoje = "2026-08-04";
  const estado = criarEstadoInicial(hoje);

  it("a carga de demonstração sempre deixa pendência para a professora ver o aviso", () => {
    const pendencias = pendenciasDaProfessora(estado, "prof-sabrina", hoje);
    expect(pendencias.length).toBeGreaterThan(0);
    expect(pendencias.some((p) => p.status === "pendente" && p.data === hoje)).toBe(true);
    expect(pendencias.some((p) => p.status === "atrasada")).toBe(true);
  });

  it("não cobra dias anteriores ao início de uso do sistema", () => {
    const pendencias = pendenciasDaProfessora(estado, "prof-sabrina", hoje);
    expect(estado.escola.usoDesde).toBe("2026-06-01");
    expect(pendencias.every((p) => p.data >= estado.escola.usoDesde)).toBe(true);
    // o que a escola registrou fora do sistema não vira pendência
    expect(pendencias.length).toBeLessThan(5);
  });

  it("só cobra as turmas vinculadas à professora", () => {
    const pendencias = pendenciasDaProfessora(estado, "prof-sabrina", hoje);
    expect(new Set(pendencias.map((p) => p.turmaId))).toEqual(new Set(["turma-maternal-1a"]));
  });

  it("lançar a chamada tira o dia da lista de pendências", () => {
    const pendencias = pendenciasDaProfessora(estado, "prof-sabrina", hoje);
    const alvo = pendencias[0];
    const comLancamento = {
      ...estado,
      chamadas: {
        ...estado.chamadas,
        [`${alvo.turmaId}|${alvo.data}`]: {
          turmaId: alvo.turmaId,
          data: alvo.data,
          lancadaEm: "2026-08-04T19:00:00",
          lancadaPor: "prof-sabrina",
          registros: {},
        },
      },
    };
    const depois = pendenciasDaProfessora(comLancamento, "prof-sabrina", hoje);
    expect(depois.length).toBe(pendencias.length - 1);
  });
});

describe("frequência em dias", () => {
  const hoje = "2026-08-04";
  const estado = criarEstadoInicial(hoje);
  const aluno = estado.alunos[0];

  it("conta os dias em que a criança veio sobre os dias lançados", () => {
    const frequencia = frequenciaAluno(estado, aluno);
    expect(frequencia.diasLancados).toBeGreaterThan(0);
    expect(frequencia.diasPresentes + frequencia.faltas).toBe(frequencia.diasLancados);
    expect(frequencia.percentual).toBeGreaterThanOrEqual(0);
    expect(frequencia.percentual).toBeLessThanOrEqual(100);
  });

  it("meio período conta como dia presente; falta é o dia inteiro", () => {
    const chamadas = {
      "t1|2026-08-03": {
        turmaId: "t1",
        data: "2026-08-03",
        lancadaEm: "2026-08-03T18:00",
        lancadaPor: null,
        registros: { a1: { manha: true, tarde: false } },
      },
      "t1|2026-08-04": {
        turmaId: "t1",
        data: "2026-08-04",
        lancadaEm: "2026-08-04T18:00",
        lancadaPor: null,
        registros: { a1: { manha: false, tarde: false } },
      },
    };
    const base = {
      ...estado,
      chamadas,
      alunos: [{ ...aluno, id: "a1", turmaId: "t1" }],
    };
    const frequencia = frequenciaAluno(base, base.alunos[0]);
    expect(frequencia.diasLancados).toBe(2);
    expect(frequencia.diasPresentes).toBe(1);
    expect(frequencia.faltas).toBe(1);
    expect(frequencia.ultimaFalta).toBe("2026-08-04");
    expect(frequencia.percentual).toBe(50);
  });

  it("chamada em aberto não entra na conta", () => {
    const semChamadas = { ...estado, chamadas: {} };
    const frequencia = frequenciaAluno(semChamadas, semChamadas.alunos[0]);
    expect(frequencia.diasLancados).toBe(0);
    expect(frequencia.percentual).toBeNull();
  });
});

describe("aviso de faltas para a direção", () => {
  const hoje = "2026-08-04";
  const estado = criarEstadoInicial(hoje);

  it("a carga de demonstração tem criança infrequente para a direção ver", () => {
    const avisos = avisosDeFaltas(estado);
    expect(avisos.length).toBeGreaterThan(0);
    expect(avisos.every((aviso) => aviso.faltas >= LIMITE_FALTAS_AVISO)).toBe(true);
    expect(avisos.every((aviso) => aviso.novo)).toBe(true);
  });

  it("vem ordenado da criança com mais faltas para a com menos", () => {
    const avisos = avisosDeFaltas(estado);
    const faltas = avisos.map((a) => a.faltas);
    expect([...faltas].sort((a, b) => b - a)).toEqual(faltas);
  });

  it("não avisa quem está abaixo do limite", () => {
    const avisos = avisosDeFaltas(estado);
    const avisados = new Set(avisos.map((a) => a.alunoId));
    for (const aluno of estado.alunos) {
      if (avisados.has(aluno.id)) continue;
      expect(frequenciaAluno(estado, aluno).faltas).toBeLessThan(LIMITE_FALTAS_AVISO);
    }
  });

  it("marcar como visto silencia o aviso até a próxima falta", () => {
    const [primeiro] = avisosDeFaltas(estado);
    const visto = { ...estado, avisosLidos: { [primeiro.alunoId]: primeiro.faltas } };
    expect(avisosDeFaltas(visto).find((a) => a.alunoId === primeiro.alunoId)?.novo).toBe(false);

    const desatualizado = { ...estado, avisosLidos: { [primeiro.alunoId]: primeiro.faltas - 1 } };
    expect(avisosDeFaltas(desatualizado).find((a) => a.alunoId === primeiro.alunoId)?.novo).toBe(
      true,
    );
  });
});

describe("visão geral da turma", () => {
  const estado = criarEstadoInicial("2026-08-04");

  it("resume a turma inteira e separa quem está no limite de faltas", () => {
    const resumo = resumoTurma(estado, "turma-maternal-1a");
    expect(resumo.linhas.length).toBe(
      estado.alunos.filter((a) => a.turmaId === "turma-maternal-1a").length,
    );
    expect(resumo.frequenciaMedia).not.toBeNull();
    expect(resumo.emAlerta.every((linha) => linha.faltas >= LIMITE_FALTAS_AVISO)).toBe(true);
  });
});
