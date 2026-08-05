import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, CircleAlert, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
import { cn } from "@/lib/utils";
import GestaoLayout from "../../components/GestaoLayout";
import { useEstadoEscola } from "../../data/store";
import { panoramaChamadas } from "../../lib/chamada";
import { formatarBr, hojeIso, nomeDiaSemana } from "../../lib/datas";

const DIAS_MOSTRADOS = 20;

export default function ChamadasGestao() {
  const estado = useEstadoEscola();
  const hoje = hojeIso();

  const periodoAtual =
    estado.periodos.find((p) => p.inicio <= hoje && hoje <= p.fim) ??
    estado.periodos[estado.periodos.length - 1];
  const [periodoId, setPeriodoId] = useState(periodoAtual.id);

  const panorama = useMemo(
    () => panoramaChamadas(estado, periodoId, DIAS_MOSTRADOS, hoje),
    [estado, periodoId, hoje],
  );

  const emAberto = panorama.flatMap((dia) =>
    dia.turmas
      .filter((linha) => linha.status !== "lancada")
      .map((linha) => ({ data: dia.data, turma: linha.turma, status: linha.status })),
  );
  const atrasadas = emAberto.filter((item) => item.status === "atrasada");

  return (
    <GestaoLayout
      titulo="Chamadas"
      subtitulo={`Últimos ${DIAS_MOSTRADOS} dias letivos, por turma`}
      migalhas={[{ rotulo: "Gestão", para: "/escola/gestao" }, { rotulo: "Chamadas" }]}
      acoes={
        <span className="text-sm text-muted-foreground">
          {atrasadas.length} lançamento(s) em atraso
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
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-600" /> Lançada
            </span>
            <span className="flex items-center gap-1.5">
              <CircleAlert className="h-3.5 w-3.5 text-red-600" /> Não lançada
            </span>
            <span className="flex items-center gap-1.5">
              <Minus className="h-3.5 w-3.5 text-amber-600" /> Aguardando (é hoje)
            </span>
          </div>
        </CardContent>
      </Card>

      {atrasadas.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="px-5 py-4 border-b">
              <h2 className="font-semibold">Em atraso</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Dias que já passaram e continuam sem lançamento. É o que a direção cobra.
              </p>
            </div>
            <div className="divide-y">
              {atrasadas.slice(0, 12).map((item) => (
                <div
                  key={`${item.turma.id}-${item.data}`}
                  className="flex flex-wrap items-center justify-between gap-2 px-5 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{item.turma.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {nomeDiaSemana(item.data)} — {formatarBr(item.data)}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.turma.professoraIds
                      .map((id) => estado.professoras.find((p) => p.id === id)?.nome)
                      .filter(Boolean)
                      .join(", ") || "Sem professora vinculada"}
                  </p>
                </div>
              ))}
              {atrasadas.length > 12 && (
                <p className="px-5 py-3 text-xs text-muted-foreground">
                  e mais {atrasadas.length - 12} dia(s).
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold">Mapa de lançamentos</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cada linha é um dia letivo; cada coluna, uma turma.
            </p>
          </div>
          {panorama.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              Nenhum dia letivo neste período ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Dia</TableHead>
                    {estado.turmas.map((turma) => (
                      <TableHead key={turma.id} className="text-center">
                        <Link
                          to={`/escola/gestao/turma/${turma.id}`}
                          className="hover:underline underline-offset-4"
                        >
                          {turma.nome}
                        </Link>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {panorama.map((dia) => (
                    <TableRow key={dia.data} className={dia.data === hoje ? "bg-accent/40" : undefined}>
                      <TableCell>
                        <span className="font-medium">{formatarBr(dia.data)}</span>
                        <span className="block text-xs text-muted-foreground">
                          {nomeDiaSemana(dia.data)}
                          {dia.data === hoje && " · hoje"}
                        </span>
                      </TableCell>
                      {estado.turmas.map((turma) => {
                        const linha = dia.turmas.find((t) => t.turma.id === turma.id);
                        const status = linha?.status ?? "atrasada";
                        return (
                          <TableCell key={turma.id} className="text-center">
                            <span
                              className={cn(
                                "inline-flex h-7 w-7 items-center justify-center rounded-full",
                                status === "lancada" &&
                                  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
                                status === "atrasada" &&
                                  "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
                                status === "pendente" &&
                                  "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
                              )}
                              title={
                                status === "lancada"
                                  ? "Lançada"
                                  : status === "atrasada"
                                    ? "Não lançada"
                                    : "Aguardando lançamento"
                              }
                            >
                              {status === "lancada" ? (
                                <Check className="h-4 w-4" />
                              ) : status === "atrasada" ? (
                                <CircleAlert className="h-4 w-4" />
                              ) : (
                                <Minus className="h-4 w-4" />
                              )}
                            </span>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </GestaoLayout>
  );
}
