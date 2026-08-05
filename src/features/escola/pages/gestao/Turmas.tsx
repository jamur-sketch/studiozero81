import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import GestaoLayout from "../../components/GestaoLayout";
import { useEstadoEscola } from "../../data/store";
import { ROTULO_TURNO, resumoTurma, turnosDaTurma } from "../../lib/chamada";

export default function TurmasGestao() {
  const estado = useEstadoEscola();

  return (
    <GestaoLayout
      titulo="Turmas"
      subtitulo={`${estado.turmas.length} turmas · ${estado.alunos.length} crianças`}
      migalhas={[{ rotulo: "Gestão", para: "/escola/gestao" }, { rotulo: "Turmas" }]}
    >
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Turma</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead className="min-w-[200px]">Professoras</TableHead>
                  <TableHead className="text-center">Crianças</TableHead>
                  <TableHead className="text-center">Frequência média</TableHead>
                  <TableHead>Atenção</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {estado.turmas.map((turma) => {
                  const resumo = resumoTurma(estado, turma.id);
                  const professoras = turma.professoraIds
                    .map((id) => estado.professoras.find((p) => p.id === id)?.nome)
                    .filter(Boolean);
                  return (
                    <TableRow key={turma.id}>
                      <TableCell className="font-medium">
                        <Link
                          to={`/escola/gestao/turma/${turma.id}`}
                          className="hover:underline underline-offset-4"
                        >
                          {turma.nome}
                        </Link>
                        <span className="block text-xs text-muted-foreground">{turma.sala}</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{turma.etapa}</TableCell>
                      <TableCell className="text-sm">
                        {turma.turno === "integral"
                          ? "Integral"
                          : turnosDaTurma(turma.turno)
                              .map((t) => ROTULO_TURNO[t])
                              .join(" / ")}
                      </TableCell>
                      <TableCell className="text-sm">
                        {professoras.length > 0 ? (
                          professoras.join(", ")
                        ) : (
                          <span className="text-red-600 dark:text-red-400">
                            Sem professora vinculada
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {resumo.linhas.length}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-center tabular-nums",
                          (resumo.frequenciaMedia ?? 100) < 85 && "text-red-600 dark:text-red-400",
                        )}
                      >
                        {resumo.frequenciaMedia === null
                          ? "—"
                          : `${resumo.frequenciaMedia.toFixed(0)}%`}
                      </TableCell>
                      <TableCell>
                        {resumo.emAlerta.length > 0 ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {resumo.emAlerta.length} com muitas faltas
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/escola/gestao/turma/${turma.id}`}>
                            Abrir
                            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </GestaoLayout>
  );
}
