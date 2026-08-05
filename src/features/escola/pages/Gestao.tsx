import { Link } from "react-router-dom";
import { Construction, Lock } from "lucide-react";
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
import { useEstadoEscola } from "../data/store";
import { ROTULO_TURNO, alunosDaTurma, turnosDaTurma } from "../lib/chamada";

/**
 * Painel da gestão — ainda não construído, conforme combinado.
 *
 * A separação de papéis já existe no modelo de dados: a gestão é quem vincula
 * professora × turma (`Turma.professoraIds`), cria os acessos e acompanha quem
 * lançou a chamada. Aqui fica só a visão de leitura do que já está configurado.
 */
export default function Gestao() {
  const estado = useEstadoEscola();

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
