import { describe, expect, it } from "vitest";
import { ENTRADA, INICIO, autenticar, usuarioDaProfessora } from "./acesso";
import { criarEstadoInicial, SENHA_DEMONSTRACAO } from "../data/seed";

const estado = criarEstadoInicial("2026-08-05");
const professora = estado.usuarios.find((u) => u.papel === "professora")!;
const gestao = estado.usuarios.find((u) => u.papel === "gestao")!;

describe("acesso às áreas", () => {
  it("entra com e-mail e senha corretos na própria área", () => {
    const resultado = autenticar(estado, professora.email, SENHA_DEMONSTRACAO, "professora");
    expect(resultado.erro).toBeNull();
    expect(resultado.usuario?.id).toBe(professora.id);
  });

  it("não aceita senha errada", () => {
    const resultado = autenticar(estado, professora.email, "outra-senha", "professora");
    expect(resultado.usuario).toBeNull();
    expect(resultado.erro).toBe("credenciais-invalidas");
  });

  it("e-mail inexistente devolve o mesmo erro da senha errada", () => {
    const resultado = autenticar(estado, "ninguem@escola.exemplo.br", "seja-o-que-for", "gestao");
    expect(resultado.erro).toBe("credenciais-invalidas");
  });

  it("ignora maiúsculas e espaços no e-mail", () => {
    const resultado = autenticar(
      estado,
      `  ${professora.email.toUpperCase()} `,
      SENHA_DEMONSTRACAO,
      "professora",
    );
    expect(resultado.usuario?.id).toBe(professora.id);
  });

  it("conta da gestão não entra pela área da professora", () => {
    const resultado = autenticar(estado, gestao.email, SENHA_DEMONSTRACAO, "professora");
    expect(resultado.usuario).toBeNull();
    expect(resultado.erro).toBe("area-incorreta");
  });

  it("conta de professora não entra pelo painel da gestão", () => {
    const resultado = autenticar(estado, professora.email, SENHA_DEMONSTRACAO, "gestao");
    expect(resultado.erro).toBe("area-incorreta");
  });

  it("acesso desativado pela gestão não entra", () => {
    const bloqueado = {
      ...estado,
      usuarios: estado.usuarios.map((u) => (u.id === professora.id ? { ...u, ativo: false } : u)),
    };
    const resultado = autenticar(bloqueado, professora.email, SENHA_DEMONSTRACAO, "professora");
    expect(resultado.usuario).toBeNull();
    expect(resultado.erro).toBe("acesso-desativado");
  });
});

describe("endereços das áreas", () => {
  it("cada área tem o seu link de entrada e o seu início", () => {
    expect(ENTRADA.professora).toBe("/escola/professor/entrar");
    expect(ENTRADA.gestao).toBe("/escola/gestao/entrar");
    expect(INICIO.professora).toBe("/escola/professor");
    expect(INICIO.gestao).toBe("/escola/gestao");
  });
});

describe("vínculo conta × professora", () => {
  it("toda professora da carga tem conta de acesso", () => {
    for (const prof of estado.professoras) {
      expect(usuarioDaProfessora(estado, prof.id)?.papel).toBe("professora");
    }
  });
});
