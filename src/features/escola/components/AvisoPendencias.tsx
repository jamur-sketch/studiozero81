import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CalendarClock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEstadoEscola } from "../data/store";
import { useProfessora } from "../hooks/useProfessora";
import { pendenciasDaProfessora } from "../lib/chamada";
import { hojeIso, rotuloData } from "../lib/datas";

function usePendencias() {
  const estado = useEstadoEscola();
  const { professora } = useProfessora();
  const hoje = hojeIso();
  const todas = professora ? pendenciasDaProfessora(estado, professora.id, hoje) : [];
  return {
    hoje,
    todas,
    atrasadas: todas.filter((p) => p.status === "atrasada"),
    deHoje: todas.filter((p) => p.status === "pendente"),
  };
}

/** Faixa fixa no topo das telas: a professora nunca perde de vista o que falta. */
export function AvisoPendencias() {
  const { todas, atrasadas, deHoje } = usePendencias();

  if (todas.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span>Chamadas em dia. Nenhum lançamento pendente.</span>
      </div>
    );
  }

  const critico = atrasadas.length > 0;

  return (
    <div
      className={
        critico
          ? "rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/40"
          : "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/40"
      }
    >
      <div className="flex items-start gap-3">
        {critico ? (
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
        ) : (
          <CalendarClock className="h-4 w-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
        )}
        <div className="min-w-0 flex-1">
          <p
            className={
              critico
                ? "text-sm font-semibold text-red-900 dark:text-red-200"
                : "text-sm font-semibold text-amber-900 dark:text-amber-200"
            }
          >
            {atrasadas.length > 0
              ? `${atrasadas.length} chamada(s) de dias anteriores ainda não foram lançadas`
              : "A chamada de hoje ainda não foi lançada"}
          </p>
          <p
            className={
              critico
                ? "text-xs text-red-800/80 dark:text-red-300/80 mt-0.5"
                : "text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5"
            }
          >
            A chamada precisa ser lançada todos os dias letivos.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {[...atrasadas, ...deHoje].slice(0, 6).map((pendencia) => (
              <Button
                key={`${pendencia.turmaId}-${pendencia.data}`}
                size="sm"
                variant={pendencia.status === "atrasada" ? "destructive" : "outline"}
                className="h-7 text-xs"
                asChild
              >
                <Link to={`/escola/turma/${pendencia.turmaId}/chamada/${pendencia.data}`}>
                  {pendencia.turmaNome} · {rotuloData(pendencia.data)}
                </Link>
              </Button>
            ))}
            {todas.length > 6 && (
              <span className="self-center text-xs text-muted-foreground">
                e mais {todas.length - 6}…
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Aviso de entrada: aparece uma vez por dia, assim que a professora entra no
 * sistema, sempre que houver chamada em aberto.
 */
export function ModalAvisoEntrada() {
  const { professora } = useProfessora();
  const { todas, atrasadas, deHoje, hoje } = usePendencias();
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (!professora || todas.length === 0) return;
    const chave = `escola:aviso-visto:${professora.id}:${hoje}`;
    try {
      if (window.sessionStorage.getItem(chave)) return;
      window.sessionStorage.setItem(chave, "1");
    } catch {
      // sem sessionStorage: mostra sempre
    }
    setAberto(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [professora?.id, hoje, todas.length]);

  const primeira = atrasadas[0] ?? deHoje[0];

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
            <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <DialogTitle className="text-center">Você tem chamada pendente</DialogTitle>
          <DialogDescription className="text-center">
            {atrasadas.length > 0 ? (
              <>
                Há <strong>{atrasadas.length}</strong> chamada(s) de dias anteriores sem
                lançamento
                {deHoje.length > 0 && ", além da chamada de hoje"}. O lançamento é diário e
                obrigatório.
              </>
            ) : (
              <>A chamada de hoje ainda não foi lançada. O lançamento é diário e obrigatório.</>
            )}
          </DialogDescription>
        </DialogHeader>

        <ul className="max-h-48 overflow-y-auto space-y-1.5 text-sm">
          {todas.slice(0, 8).map((pendencia) => (
            <li
              key={`${pendencia.turmaId}-${pendencia.data}`}
              className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
            >
              <span className="min-w-0">
                <span className="block font-medium truncate">{pendencia.turmaNome}</span>
                <span className="block text-xs text-muted-foreground">
                  {rotuloData(pendencia.data)}
                </span>
              </span>
              <span
                className={
                  pendencia.status === "atrasada"
                    ? "shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-950 dark:text-red-300"
                    : "shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                }
              >
                {pendencia.status === "atrasada" ? "Atrasada" : "Hoje"}
              </span>
            </li>
          ))}
        </ul>

        <DialogFooter className="sm:justify-between gap-2">
          <Button variant="ghost" onClick={() => setAberto(false)}>
            Ver depois
          </Button>
          {primeira && (
            <Button asChild onClick={() => setAberto(false)}>
              <Link to={`/escola/turma/${primeira.turmaId}/chamada/${primeira.data}`}>
                Lançar agora
              </Link>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
