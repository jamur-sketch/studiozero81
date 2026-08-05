import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Professora } from "../types";
import { useEstadoEscola } from "../data/store";

/**
 * Sessão da professora.
 *
 * Os acessos ainda não foram criados: por enquanto a professora é escolhida na
 * tela de entrada e a escolha fica no localStorage. O contrato deste contexto
 * (`professora`, `entrar`, `sair`, `carregando`) é o mesmo que uma autenticação
 * de verdade exporia — quando as contas existirem, basta trocar o miolo daqui
 * por Supabase Auth e ligar `Professora.usuarioId` ao usuário logado.
 */

const CHAVE_SESSAO = "escola:professora-sessao";

interface SessaoProfessora {
  professora: Professora | null;
  carregando: boolean;
  entrar: (professoraId: string) => void;
  sair: () => void;
}

const ContextoProfessora = createContext<SessaoProfessora | undefined>(undefined);

export function ProfessoraProvider({ children }: { children: React.ReactNode }) {
  const estado = useEstadoEscola();
  const [professoraId, setProfessoraId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    try {
      setProfessoraId(window.localStorage.getItem(CHAVE_SESSAO));
    } catch {
      setProfessoraId(null);
    }
    setCarregando(false);
  }, []);

  const entrar = useCallback((id: string) => {
    try {
      window.localStorage.setItem(CHAVE_SESSAO, id);
    } catch {
      // sessão só em memória
    }
    setProfessoraId(id);
  }, []);

  const sair = useCallback(() => {
    try {
      window.localStorage.removeItem(CHAVE_SESSAO);
    } catch {
      // nada a limpar
    }
    setProfessoraId(null);
  }, []);

  const valor = useMemo<SessaoProfessora>(
    () => ({
      professora: estado.professoras.find((p) => p.id === professoraId) ?? null,
      carregando,
      entrar,
      sair,
    }),
    [estado.professoras, professoraId, carregando, entrar, sair],
  );

  return <ContextoProfessora.Provider value={valor}>{children}</ContextoProfessora.Provider>;
}

export function useProfessora(): SessaoProfessora {
  const contexto = useContext(ContextoProfessora);
  if (!contexto) {
    throw new Error("useProfessora precisa estar dentro de <ProfessoraProvider>");
  }
  return contexto;
}
