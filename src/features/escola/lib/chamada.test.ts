import { describe, expect, it } from "vitest";
import {
  alternarColunaTurno,
  alternarTodosDoAluno,
  alternarTudo,
  alternarTurno,
  estaTudoMarcado,
  frequenciaAluno,
  pendenciasDaProfessora,
  resumoChamada,
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
    expect(estado.escola.usoDesde).toBe("2026-07-27");
    expect(pendencias.every((p) => p.data >= estado.escola.usoDesde)).toBe(true);
    // 1º semestre inteiro fora do sistema não vira pendência
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

describe("frequência", () => {
  const hoje = "2026-08-04";
  const estado = criarEstadoInicial(hoje);

  it("calcula sobre os turnos já lançados e ignora chamadas em aberto", () => {
    const aluno = estado.alunos.find((a) => a.turmaId === "turma-maternal-1a")!;
    const frequencia = frequenciaAluno(estado, aluno);
    expect(frequencia).not.toBeNull();
    expect(frequencia!).toBeGreaterThanOrEqual(0);
    expect(frequencia!).toBeLessThanOrEqual(100);
  });

  it("aluno sem nenhuma chamada lançada não tem frequência", () => {
    const semChamadas = { ...estado, chamadas: {} };
    const aluno = semChamadas.alunos[0];
    expect(frequenciaAluno(semChamadas, aluno)).toBeNull();
  });
});
