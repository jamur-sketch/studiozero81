import { Link } from "react-router-dom";
import { AlertTriangle, Bell, CheckCheck, Construction, Lock } from "lucide-react";
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
import { toast } from "@/hooks/use-toast";
import { marcarAvisoVisto, useEstadoEscola } from "../data/store";
import {
  LIMITE_FALTAS_AVISO,
  ROTULO_TURNO,
  alunosDaTurma,
  avisosDeFaltas,
  turnosDaTurma,
} from "../lib/chamada";
import { formatarBr } from "../lib/datas";

/**
 * Painel da gestão — ainda não construído, conforme combinado.
 *
 * A separação de papéis já existe no modelo de dados: a gestão é quem vincula
 * professora × turma (`Turma.professoraIds`), cria os acessos e acompanha quem
 * lançou a chamada. Aqui fica só a visão de leitura do que já está configurado.
 */
export default function Gestao() {
  const estado = useEstadoEscola();
  const avisos = avisosDeFaltas(estado);
  const novos = avisos.filter((aviso) => aviso.novo).length;

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Painel da Gestão</h1>
            <p className="text-sm text-muted-foreground">
              {estado.escola.nome} · Ano letivo {estado.escola.anoLetivo}
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/escola/entrar">Área da professora</Link>
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="px-5 py-4 border-b flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  {novos > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                      {novos}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="font-semibold">Notificações da direção</h2>
                  <p className="text-xs text-muted-foreground">
                    Aviso automático quando uma criança chega a {LIMITE_FALTAS_AVISO} faltas.
                  </p>
                </div>
              </div>
              {avisos.length > 0 && novos > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    avisos.forEach((aviso) => marcarAvisoVisto(aviso.alunoId, aviso.faltas));
                    toast({
                      title: "Avisos marcados como vistos",
                      description: "Voltam a aparecer como novos se a criança faltar de novo.",
                    });
                  }}
                >
                  <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
                  Marcar todos como vistos
                </Button>
              )}
            </div>

            {avisos.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                Nenhuma criança atingiu {LIMITE_FALTAS_AVISO} faltas. Nada a comunicar.
              </p>
            ) : (
              <div className="divide-y">
                {avisos.map((aviso) => (
                  <div
                    key={aviso.alunoId}
                    className={cn(
                      "flex flex-wrap items-center justify-between gap-3 px-5 py-4",
                      aviso.novo && "bg-red-50/60 dark:bg-red-950/20",
                    )}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 font-medium">
                          {aviso.alunoNome}
                          {aviso.novo && (
                            <Badge variant="destructive" className="text-[10px]">
                              Novo
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {aviso.turmaNome} · <strong>{aviso.faltas} faltas</strong> em{" "}
                          {aviso.diasLancados} dias lançados
                          {aviso.percentual !== null && ` · frequência de ${aviso.percentual.toFixed(0)}%`}
                        </p>
                        {aviso.ultimaFalta && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Última falta em {formatarBr(aviso.ultimaFalta)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/escola/turma/${aviso.turmaId}/visao-geral`}>Ver turma</Link>
                      </Button>
                      {aviso.novo && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => marcarAvisoVisto(aviso.alunoId, aviso.faltas)}
                        >
                          Marcar como visto
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex gap-4">
            <div className="w-11 h-11 shrink-0 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center dark:bg-amber-950 dark:text-amber-400">
              <Construction className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <p className="font-semibold">Módulo reservado</p>
              <p className="text-sm text-muted-foreground">
                Este painel ainda não foi construído. Quando for, é aqui que a gestão vai:
              </p>
              <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                <li>criar e desativar os acessos das professoras;</li>
                <li>vincular cada professora à sua turma;</li>
                <li>cadastrar turmas, calendário letivo e feriados;</li>
                <li>manter a ficha das crianças e dos responsáveis;</li>
                <li>acompanhar quem lançou a chamada e cobrar os atrasos.</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="px-5 py-4 border-b flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <div>
                <h2 className="font-semibold">Vínculo professora × turma</h2>
                <p className="text-xs text-muted-foreground">
                  Somente leitura por enquanto — definido na carga de dados.
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Turma</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead>Turno</TableHead>
                    <TableHead className="text-center">Estudantes</TableHead>
                    <TableHead>Professoras</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estado.turmas.map((turma) => (
                    <TableRow key={turma.id}>
                      <TableCell className="font-medium">{turma.nome}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{turma.etapa}</TableCell>
                      <TableCell className="text-sm">
                        {turnosDaTurma(turma.turno)
                          .map((t) => ROTULO_TURNO[t])
                          .join(" / ")}
                      </TableCell>
                      <TableCell className="text-center">
                        {alunosDaTurma(estado, turma.id).length}
                      </TableCell>
                      <TableCell className="text-sm">
                        {turma.professoraIds
                          .map((id) => estado.professoras.find((p) => p.id === id)?.nome)
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
