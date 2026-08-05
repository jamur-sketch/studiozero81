import type { EstadoEscola, PapelUsuario, Usuario } from "../types";

/**
 * Verificação de acesso.
 *
 * Enquanto não há servidor, a conferência é local contra a carga de
 * demonstração. Toda a decisão de "quem pode entrar onde" está aqui, então
 * ligar uma autenticação de verdade é trocar `autenticar` por uma chamada ao
 * provedor — as telas não mudam.
 */

export type ErroAcesso =
  | "credenciais-invalidas"
  | "acesso-desativado"
  | "area-incorreta";

export const MENSAGEM_ERRO: Record<ErroAcesso, string> = {
  "credenciais-invalidas": "E-mail ou senha incorretos.",
  "acesso-desativado": "Este acesso está desativado. Fale com a direção da escola.",
  "area-incorreta":
    "Esta conta não é desta área. Use o link de acesso que a escola enviou para você.",
};

/**
 * `erro` nulo significa acesso liberado. É um objeto simples de propósito: o
 * projeto compila com `strict: false`, e união discriminada por booleano não
 * estreita nesse modo.
 */
export interface ResultadoAcesso {
  usuario: Usuario | null;
  erro: ErroAcesso | null;
}

export const ROTULO_PAPEL: Record<PapelUsuario, string> = {
  professora: "Professora",
  gestao: "Gestão",
};

/** Rota de entrada de cada área — cada uma tem o seu link. */
export const ENTRADA: Record<PapelUsuario, string> = {
  professora: "/escola/professor/entrar",
  gestao: "/escola/gestao/entrar",
};

/** Para onde cada área vai depois de entrar. */
export const INICIO: Record<PapelUsuario, string> = {
  professora: "/escola/professor",
  gestao: "/escola/gestao",
};

function normalizar(email: string): string {
  return email.trim().toLowerCase();
}

export function autenticar(
  estado: EstadoEscola,
  email: string,
  senha: string,
  papel: PapelUsuario,
): ResultadoAcesso {
  const usuario = estado.usuarios.find((u) => normalizar(u.email) === normalizar(email));

  // Sem conta ou com senha errada dá a mesma resposta: não se confirma
  // e-mail cadastrado para quem não sabe a senha.
  if (!usuario || usuario.senha !== senha) {
    return { usuario: null, erro: "credenciais-invalidas" };
  }
  if (!usuario.ativo) return { usuario: null, erro: "acesso-desativado" };
  if (usuario.papel !== papel) return { usuario: null, erro: "area-incorreta" };

  return { usuario, erro: null };
}

export function usuarioDaProfessora(
  estado: EstadoEscola,
  professoraId: string,
): Usuario | undefined {
  return estado.usuarios.find((u) => u.professoraId === professoraId);
}
