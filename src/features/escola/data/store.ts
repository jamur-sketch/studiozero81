import { useSyncExternalStore } from "react";
import type { Chamada, EstadoEscola, RegistroPresenca } from "../types";
import { chaveChamada } from "../lib/chamada";
import { criarEstadoInicial, VERSAO_ESTADO } from "./seed";

/**
 * Camada de dados do módulo escola.
 *
 * Hoje os dados vivem no localStorage, com carga fictícia de demonstração —
 * ainda não existem contas de professora nem banco. Quando os acessos forem
 * criados, só este arquivo precisa mudar: as telas consomem `useEstadoEscola`
 * e as funções abaixo, não o storage.
 */

const CHAVE_STORAGE = "escola:estado:v1";

let estado: EstadoEscola = carregar();
const ouvintes = new Set<() => void>();

function carregar(): EstadoEscola {
  if (typeof window === "undefined") return criarEstadoInicial();
  try {
    const bruto = window.localStorage.getItem(CHAVE_STORAGE);
    if (bruto) {
      const salvo = JSON.parse(bruto) as EstadoEscola;
      if (salvo?.versao === VERSAO_ESTADO) return salvo;
    }
  } catch {
    // storage indisponível ou corrompido: recomeça do zero
  }
  const inicial = criarEstadoInicial();
  persistir(inicial);
  return inicial;
}

function persistir(novo: EstadoEscola) {
  try {
    window.localStorage.setItem(CHAVE_STORAGE, JSON.stringify(novo));
  } catch {
    // sem storage, o estado segue apenas em memória
  }
}

function definirEstado(novo: EstadoEscola) {
  estado = novo;
  persistir(novo);
  ouvintes.forEach((ouvinte) => ouvinte());
}

function inscrever(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

export function lerEstado(): EstadoEscola {
  return estado;
}

export function useEstadoEscola(): EstadoEscola {
  return useSyncExternalStore(inscrever, lerEstado, lerEstado);
}

/** Recria a carga de demonstração (útil para testar o aviso de pendência). */
export function reiniciarDemonstracao() {
  definirEstado(criarEstadoInicial());
}

export function obterChamada(turmaId: string, data: string): Chamada | undefined {
  return estado.chamadas[chaveChamada(turmaId, data)];
}

/** Salva a chamada do dia e a marca como lançada. */
export function lancarChamada(
  turmaId: string,
  data: string,
  registros: Record<string, RegistroPresenca>,
  professoraId: string,
) {
  const chamada: Chamada = {
    turmaId,
    data,
    registros,
    lancadaEm: new Date().toISOString(),
    lancadaPor: professoraId,
  };
  definirEstado({
    ...estado,
    chamadas: { ...estado.chamadas, [chaveChamada(turmaId, data)]: chamada },
  });
}

/** A direção marca o aviso de faltas como visto, no número atual de faltas. */
export function marcarAvisoVisto(alunoId: string, faltas: number) {
  definirEstado({
    ...estado,
    avisosLidos: { ...estado.avisosLidos, [alunoId]: faltas },
  });
}

/** Reabre uma chamada já lançada para correção. */
export function reabrirChamada(turmaId: string, data: string) {
  const atual = estado.chamadas[chaveChamada(turmaId, data)];
  if (!atual) return;
  definirEstado({
    ...estado,
    chamadas: {
      ...estado.chamadas,
      [chaveChamada(turmaId, data)]: { ...atual, lancadaEm: null, lancadaPor: null },
    },
  });
}
