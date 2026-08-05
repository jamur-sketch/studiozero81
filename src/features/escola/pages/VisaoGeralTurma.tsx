import { Link, Navigate, useParams } from "react-router-dom";
import { AlertTriangle, CalendarCheck, PencilLine, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import EscolaLayout from "../components/EscolaLayout";
import { useEstadoEscola } from "../data/store";
import { LIMITE_FALTAS_AVISO, ROTULO_TURNO, resumoTurma, turnosDaTurma } from "../lib/chamada";
import { formatarBr, hojeIso } from "../lib/datas";

/**
 * Visão geral da turma: é o que a professora vê quando a chamada do dia já está
 * lançada — como cada criança está de presença, em vez de reabrir o mesmo dia.
 */
export default function VisaoGeralTurma() {
  const { turmaId = "" } = useParams();
  const estado = useEstadoEscola();
  const hoje = hojeIso();

  const turma = estado.turmas.find((t) => t.id === turmaId);
  if (!turma) return <Navigate to="/escola/painel" replace />;

  const resumo = resumoTurma(estado, turma.id);
  const indicadores = [
    { rotulo: "Estudantes", valor: String(resumo.linhas.length), icone: Users },
    { rotulo: "Dias lançados", valor: String(resumo.diasLancados), icone: CalendarCheck },
    {
      rotulo: "Frequência média",
      valor: resumo.frequenciaMedia === null ? "—" : `${resumo.frequenciaMedia.toFixed(0)}%`,
      icone: CalendarCheck,
    },
    {
      rotulo: `Com ${LIMITE_FALTAS_AVISO}+ faltas`,
      valor: String(resumo.emAlerta.length),
      icone: AlertTriangle,
      alerta: resumo.emAlerta.length > 0,
    },
  ];

  return (
    <EscolaLayout
      titulo="Visão geral da turma"
      subtitulo={`${turma.nome} · ${turma.etapa} · desde ${formatarBr(estado.escola.usoDesde)}`}
      migalhas={[
        { rotulo: "Início", para: "/escola/painel" },
        { rotulo: turma.nome, para: `/escola/turma/${turma.id}` },
        { rotulo: "Visão geral" },
      ]}
      acoes={
        <Button variant="outline" size="sm" asChild>
          <Link to={`/escola/turma/${turma.id}/chamada/${hoje}`}>
            <PencilLine className="mr-1.5 h-3.5 w-3.5" />
            Chamada de hoje
          </Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {indicadores.map((indicador) => (
          <Card key={indicador.rotulo}>
            <CardContent className="p-5 flex items-center gap-4">
              <div
                className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center",
                  indicador.alerta
                    ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                    : "bg-primary/10 text-primary",
                )}
              >
                <indicador.icone className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none tabular-nums">{indicador.valor}</p>
                <p className="text-xs text-muted-foreground mt-1">{indicador.rotulo}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {resumo.emAlerta.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/40">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
            <div>
              <p className="text-sm font-semibold text-red-900 dark:text-red-200">
                {resumo.emAlerta.length} criança(s) com {LIMITE_FALTAS_AVISO} faltas ou mais
              </p>
              <p className="text-xs text-red-800/80 dark:text-red-300/80 mt-0.5">
                A direção é avisada automaticamente. Vale registrar contato com a família.
              </p>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold">Frequência por criança</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Dias em que veio à escola sobre os dias já lançados. Turma de{" "}
              {turma.turno === "integral"
                ? "manhã e tarde"
                : turnosDaTurma(turma.turno)
                    .map((t) => ROTULO_TURNO[t])
                    .join(" e ")
                    .toLowerCase()}
              .
            </p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Estudante</TableHead>
                  <TableHead className="text-center">Dias presentes</TableHead>
                  <TableHead className="text-center">Faltas</TableHead>
                  <TableHead className="min-w-[160px]">Frequência</TableHead>
                  <TableHead>Última falta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumo.linhas.map((linha) => {
                  const emAlerta = linha.faltas >= LIMITE_FALTAS_AVISO;
                  return (
                    <TableRow key={linha.aluno.id}>
                      <TableCell>
                        <Link
                          to={`/escola/aluno/${linha.aluno.id}`}
                          className="font-medium hover:underline underline-offset-4"
                        >
                          {linha.aluno.nome}
                        </Link>
                        {emAlerta && (
                          <Badge variant="destructive" className="ml-2 text-[10px]">
                            {linha.faltas} faltas
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {linha.diasPresentes}
                        <span className="text-muted-foreground">/{linha.diasLancados}</span>
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-center tabular-nums",
                          emAlerta && "font-semibold text-red-600 dark:text-red-400",
                        )}
                      >
                        {linha.faltas}
                      </TableCell>
                      <TableCell>
                        {linha.percentual === null ? (
                          <span className="text-sm text-muted-foreground">—</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Progress value={linha.percentual} className="h-2 w-24" />
                            <span
                              className={cn(
                                "text-sm tabular-nums",
                                linha.percentual < 75 && "text-red-600 dark:text-red-400",
                              )}
                            >
                              {linha.percentual.toFixed(0)}%
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {linha.ultimaFalta ? formatarBr(linha.ultimaFalta) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </EscolaLayout>
  );
}
