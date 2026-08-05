import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { PapelUsuario, Professora, Usuario } from "../types";
import { useEstadoEscola, registrarAcesso } from "../data/store";
import { autenticar, type ErroAcesso } from "../lib/acesso";

/**
 * Sessão de uma das áreas do sistema.
 *
 * Cada área (professora e gestão) tem o seu próprio provedor e a sua própria
 * chave de sessão: entrar na gestão não dá acesso à área da professora, e vice
 * e versa. Trocar a verificação local por uma autenticação de servidor é mexer
 * em `entrar` aqui e em `lib/acesso.ts` — as telas consomem só este contrato.
 */

const CHAVE_SESSAO: Record<PapelUsuario, string> = {
  professora: "escola:sessao:professora",
  gestao: "escola:sessao:gestao",
};

interface Sessao {
  papel: PapelUsuario;
  usuario: Usuario | null;
  /** Professora vinculada, quando o papel é professora. */
  professora: Professora | null;
  carregando: boolean;
  /** Devolve o erro, ou `null` quando entrou. */
  entrar: (email: string, senha: string) => ErroAcesso | null;
  sair: () => void;
}

const ContextoSessao = createContext<Sessao | undefined>(undefined);

export function SessaoProvider({
  papel,
  children,
}: {
  papel: PapelUsuario;
  children: React.ReactNode;
}) {
  const estado = useEstadoEscola();
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    try {
      setUsuarioId(window.localStorage.getItem(CHAVE_SESSAO[papel]));
    } catch {
      setUsuarioId(null);
    }
    setCarregando(false);
  }, [papel]);

  const entrar = useCallback(
    (email: string, senha: string) => {
      const { usuario, erro } = autenticar(estado, email, senha, papel);
      if (!usuario) return erro;
      try {
        window.localStorage.setItem(CHAVE_SESSAO[papel], usuario.id);
      } catch {
        // sessão só em memória
      }
      setUsuarioId(usuario.id);
      registrarAcesso(usuario.id);
      return null;
    },
    [estado, papel],
  );

  const sair = useCallback(() => {
    try {
      window.localStorage.removeItem(CHAVE_SESSAO[papel]);
    } catch {
      // nada a limpar
    }
    setUsuarioId(null);
  }, [papel]);

  const valor = useMemo<Sessao>(() => {
    const usuario = estado.usuarios.find((u) => u.id === usuarioId) ?? null;
    // Conta desativada ou de outra área perde a sessão na hora.
    const valido = usuario && usuario.ativo && usuario.papel === papel ? usuario : null;
    return {
      papel,
      usuario: valido,
      professora: valido?.professoraId
        ? (estado.professoras.find((p) => p.id === valido.professoraId) ?? null)
        : null,
      carregando,
      entrar,
      sair,
    };
  }, [estado.usuarios, estado.professoras, usuarioId, papel, carregando, entrar, sair]);

  return <ContextoSessao.Provider value={valor}>{children}</ContextoSessao.Provider>;
}

export function useSessao(): Sessao {
  const contexto = useContext(ContextoSessao);
  if (!contexto) {
    throw new Error("useSessao precisa estar dentro de <SessaoProvider>");
  }
  return contexto;
}
