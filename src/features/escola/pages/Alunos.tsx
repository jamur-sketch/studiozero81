import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { alunosDaTurma, faltasAluno, frequenciaAluno } from "../lib/chamada";
import { formatarBr, idadeExtenso } from "../lib/datas";

export default function Alunos() {
  const { turmaId = "" } = useParams();
  const estado = useEstadoEscola();
  const [busca, setBusca] = useState("");

  const turma = estado.turmas.find((t) => t.id === turmaId);
  const alunos = useMemo(() => (turma ? alunosDaTurma(estado, turma.id) : []), [estado, turma]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return alunos;
    return alunos.filter(
      (aluno) =>
        aluno.nome.toLowerCase().includes(termo) ||
        aluno.codigo.includes(termo) ||
        aluno.mae.nome.toLowerCase().includes(termo) ||
        aluno.pai.nome.toLowerCase().includes(termo),
    );
  }, [alunos, busca]);

  if (!turma) return <Navigate to="/escola/painel" replace />;

  return (
    <EscolaLayout
      titulo="Estudantes"
      subtitulo={`${turma.nome} · ${filtrados.length} de ${alunos.length}`}
      migalhas={[
        { rotulo: "Início", para: "/escola/painel" },
        { rotulo: turma.nome, para: `/escola/turma/${turma.id}` },
        { rotulo: "Estudantes" },
      ]}
    >
      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
              placeholder="Buscar por nome, código ou responsável"
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Código</TableHead>
                  <TableHead className="min-w-[220px]">Estudante</TableHead>
                  <TableHead>Idade</TableHead>
                  <TableHead className="min-w-[200px]">Mãe</TableHead>
                  <TableHead className="min-w-[200px]">Pai</TableHead>
                  <TableHead className="text-center">Faltas</TableHead>
                  <TableHead className="text-center">Freq.</TableHead>
                  <TableHead>Atenção</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((aluno) => {
                  const frequencia = frequenciaAluno(estado, aluno);
                  const alertas = [
                    ...aluno.saude.alergias.map((a) => `Alergia: ${a}`),
                    ...aluno.saude.restricoesAlimentares.map((r) => r),
                    ...aluno.saude.medicacoes.map((m) => m),
                  ];
                  return (
                    <TableRow key={aluno.id}>
                      <TableCell className="text-xs text-muted-foreground">{aluno.codigo}</TableCell>
                      <TableCell>
                        <Link
                          to={`/escola/aluno/${aluno.id}`}
                          className="font-medium hover:underline underline-offset-4"
                        >
                          {aluno.nome}
                        </Link>
                        <span className="block text-xs text-muted-foreground">
                          Nasc. {formatarBr(aluno.dataNascimento)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {idadeExtenso(aluno.dataNascimento)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {aluno.mae.nome}
                        <span className="block text-xs text-muted-foreground">
                          {aluno.mae.telefone}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {aluno.pai.nome}
                        <span className="block text-xs text-muted-foreground">
                          {aluno.pai.telefone}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {faltasAluno(estado, aluno)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-center text-sm font-medium",
                          frequencia !== null && frequencia < 75 && "text-red-600 dark:text-red-400",
                        )}
                      >
                        {frequencia === null ? "—" : `${frequencia.toFixed(0)}%`}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {alertas.slice(0, 2).map((alerta) => (
                            <Badge key={alerta} variant="secondary" className="text-[11px]">
                              {alerta}
                            </Badge>
                          ))}
                          {alertas.length > 2 && (
                            <Badge variant="outline" className="text-[11px]">
                              +{alertas.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtrados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-10">
                      Nenhum estudante encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </EscolaLayout>
  );
}
