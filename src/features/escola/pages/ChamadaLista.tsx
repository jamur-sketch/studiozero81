import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { CheckCircle2, CircleAlert, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import EscolaLayout from "../components/EscolaLayout";
import { useEstadoEscola } from "../data/store";
import {
  ROTULO_STATUS,
  alunosDaTurma,
  chaveChamada,
  datasDaTurma,
  resumoChamada,
  statusChamada,
  turnosDaTurma,
} from "../lib/chamada";
import { formatarBr, hojeIso, rotuloData } from "../lib/datas";

export default function ChamadaLista() {
  const { turmaId = "" } = useParams();
  const estado = useEstadoEscola();
  const hoje = hojeIso();

  const turma = estado.turmas.find((t) => t.id === turmaId);
  const periodoAtual =
    estado.periodos.find((p) => p.inicio <= hoje && hoje <= p.fim) ??
    estado.periodos[estado.periodos.length - 1];

  const [periodoId, setPeriodoId] = useState(periodoAtual.id);
  const [ordem, setOrdem] = useState<"crescente" | "decrescente">("decrescente");

  const datas = useMemo(() => {
    const lista = datasDaTurma(estado, periodoId, hoje);
    return ordem === "decrescente" ? [...lista].reverse() : lista;
  }, [estado, periodoId, ordem, hoje]);

  if (!turma) return <Navigate to="/escola/painel" replace />;

  const alunos = alunosDaTurma(estado, turma.id);
  const alunoIds = alunos.map((a) => a.id);
  const turnos = turnosDaTurma(turma.turno);
  const lancadas = datas.filter(
    (data) => statusChamada(estado.chamadas[chaveChamada(turma.id, data)], data, hoje) === "lancada",
  ).length;

  return (
    <EscolaLayout
      titulo="Frequência"
      subtitulo={`${turma.nome} · ${turma.etapa}`}
      migalhas={[
        { rotulo: "Início", para: "/escola/painel" },
        { rotulo: turma.nome, para: `/escola/turma/${turma.id}` },
        { rotulo: "Chamada" },
      ]}
      acoes={
        <span className="text-sm text-muted-foreground">
          {lancadas} de {datas.length} dias lançados
        </span>
      }
    >
      <Card>
        <CardContent className="p-5 flex flex-wrap items-end gap-6">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Período letivo</Label>
            <Select value={periodoId} onValueChange={setPeriodoId}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {estado.periodos.map((periodo) => (
                  <SelectItem key={periodo.id} value={periodo.id}>
                    {periodo.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Ordem das datas</Label>
            <RadioGroup
              value={ordem}
              onValueChange={(valor) => setOrdem(valor as typeof ordem)}
              className="flex items-center gap-4 h-10"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="crescente" id="ordem-crescente" />
                <Label htmlFor="ordem-crescente" className="font-normal">
                  Crescente
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="decrescente" id="ordem-decrescente" />
                <Label htmlFor="ordem-decrescente" className="font-normal">
                  Decrescente
                </Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {datas.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              Nenhum dia letivo a lançar neste período. As datas aparecem conforme o calendário
              avança, a partir de {formatarBr(estado.escola.usoDesde)} — início do uso do sistema.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-center">Presentes</TableHead>
                    <TableHead className="text-center">Faltas</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Lançamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {datas.map((data) => {
                    const chamada = estado.chamadas[chaveChamada(turma.id, data)];
                    const status = statusChamada(chamada, data, hoje);
                    const resumo =
                      chamada?.lancadaEm && resumoChamada(chamada.registros, alunoIds, turnos);

                    return (
                      <TableRow key={data} className={data === hoje ? "bg-accent/40" : undefined}>
                        <TableCell>
                          <Link
                            to={`/escola/turma/${turma.id}/chamada/${data}`}
                            className="font-medium hover:underline underline-offset-4"
                          >
                            {rotuloData(data)}
                          </Link>
                          {data === hoje && (
                            <span className="ml-2 text-xs text-muted-foreground">(hoje)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {resumo ? resumo.presentes : "—"}
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {resumo ? resumo.ausentes : "—"}
                        </TableCell>
                        <TableCell>
                          {status === "lancada" ? (
                            <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 className="h-4 w-4" />
                              {ROTULO_STATUS.lancada}
                            </span>
                          ) : status === "atrasada" ? (
                            <span className="inline-flex items-center gap-1.5 text-sm text-red-700 dark:text-red-400">
                              <CircleAlert className="h-4 w-4" />
                              {ROTULO_STATUS.atrasada}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-sm text-amber-700 dark:text-amber-400">
                              <CircleAlert className="h-4 w-4" />
                              {ROTULO_STATUS.pendente}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant={status === "lancada" ? "outline" : "default"}
                            asChild
                          >
                            <Link to={`/escola/turma/${turma.id}/chamada/${data}`}>
                              <PencilLine className="mr-1.5 h-3.5 w-3.5" />
                              {status === "lancada" ? "Revisar" : "Lançar"}
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
    </EscolaLayout>
  );
}
