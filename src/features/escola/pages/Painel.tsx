import { Link } from "react-router-dom";
import { ArrowRight, CalendarCheck, ClipboardList, Users } from "lucide-react";
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
import EscolaLayout from "../components/EscolaLayout";
import { ModalAvisoEntrada } from "../components/AvisoPendencias";
import { useEstadoEscola } from "../data/store";
import { useProfessora } from "../hooks/useProfessora";
import {
  ROTULO_TURNO,
  alunosDaTurma,
  chaveChamada,
  pendenciasDaProfessora,
  statusChamada,
  turmasDaProfessora,
  turnosDaTurma,
} from "../lib/chamada";
import { hojeIso, rotuloData } from "../lib/datas";

export default function Painel() {
  const estado = useEstadoEscola();
  const { professora } = useProfessora();
  const hoje = hojeIso();

  const turmas = professora ? turmasDaProfessora(estado, professora.id) : [];
  const pendencias = professora ? pendenciasDaProfessora(estado, professora.id, hoje) : [];
  const totalAlunos = turmas.reduce((soma, turma) => soma + alunosDaTurma(estado, turma.id).length, 0);

  const indicadores = [
    { rotulo: "Turmas", valor: turmas.length, icone: Users },
    { rotulo: "Estudantes", valor: totalAlunos, icone: ClipboardList },
    { rotulo: "Chamadas pendentes", valor: pendencias.length, icone: CalendarCheck },
  ];

  return (
    <EscolaLayout
      titulo="Página do Professor"
      subtitulo={professora?.nome}
      migalhas={[{ rotulo: "Início" }]}
    >
      <ModalAvisoEntrada />

      <div className="grid gap-4 sm:grid-cols-3">
        {indicadores.map((indicador) => (
          <Card key={indicador.rotulo}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <indicador.icone className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none">{indicador.valor}</p>
                <p className="text-xs text-muted-foreground mt-1">{indicador.rotulo}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold">Minhas Turmas</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Situação da chamada de hoje — {rotuloData(hoje)}
            </p>
          </div>

          {turmas.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted-foreground text-center">
              Nenhuma turma vinculada a você. A gestão faz esse vínculo.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Turma</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead>Turno</TableHead>
                    <TableHead className="text-center">Estudantes</TableHead>
                    <TableHead>Chamada de hoje</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {turmas.map((turma) => {
                    const chamada = estado.chamadas[chaveChamada(turma.id, hoje)];
                    const status = statusChamada(chamada, hoje, hoje);
                    const turnos = turnosDaTurma(turma.turno);
                    return (
                      <TableRow key={turma.id}>
                        <TableCell className="font-medium">
                          <Link
                            to={`/escola/turma/${turma.id}`}
                            className="hover:underline underline-offset-4"
                          >
                            {turma.nome}
                          </Link>
                          <span className="block text-xs text-muted-foreground">{turma.nivel}</span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{turma.etapa}</TableCell>
                        <TableCell className="text-sm">
                          {turnos.map((t) => ROTULO_TURNO[t]).join(" / ")}
                        </TableCell>
                        <TableCell className="text-center">
                          {alunosDaTurma(estado, turma.id).length}
                        </TableCell>
                        <TableCell>
                          {status === "lancada" ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-600">Lançada</Badge>
                          ) : (
                            <Badge variant="destructive">Não lançada</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {/* Com a chamada do dia feita, o próximo passo útil é
                              olhar a turma, não reabrir o mesmo dia. */}
                          <Button size="sm" variant="outline" asChild>
                            <Link
                              to={
                                status === "lancada"
                                  ? `/escola/turma/${turma.id}/visao-geral`
                                  : `/escola/turma/${turma.id}/chamada/${hoje}`
                              }
                            >
                              {status === "lancada" ? "Visão geral da turma" : "Fazer chamada"}
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
          )}
        </CardContent>
      </Card>

      {pendencias.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="px-5 py-4 border-b">
              <h2 className="font-semibold">Chamadas em aberto</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                O lançamento é diário. Dias anteriores sem chamada seguem cobrados aqui.
              </p>
            </div>
            <div className="divide-y">
              {pendencias.map((pendencia) => (
                <div
                  key={`${pendencia.turmaId}-${pendencia.data}`}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{pendencia.turmaNome}</p>
                    <p className="text-xs text-muted-foreground">{rotuloData(pendencia.data)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={pendencia.status === "atrasada" ? "destructive" : "secondary"}>
                      {pendencia.status === "atrasada" ? "Atrasada" : "Hoje"}
                    </Badge>
                    <Button size="sm" asChild>
                      <Link to={`/escola/turma/${pendencia.turmaId}/chamada/${pendencia.data}`}>
                        Lançar
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </EscolaLayout>
  );
}
