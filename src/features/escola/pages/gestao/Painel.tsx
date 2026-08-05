import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle2,
  CircleAlert,
  UserCog,
  Users,
} from "lucide-react";
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
import GestaoLayout from "../../components/GestaoLayout";
import { marcarAvisoVisto, useEstadoEscola } from "../../data/store";
import { useSessao } from "../../hooks/useSessao";
import {
  LIMITE_FALTAS_AVISO,
  avisosDeFaltas,
  situacaoDoDia,
} from "../../lib/chamada";
import { formatarBr, hojeIso, rotuloData } from "../../lib/datas";

export default function PainelGestao() {
  const estado = useEstadoEscola();
  const { usuario } = useSessao();
  const hoje = hojeIso();

  const avisos = avisosDeFaltas(estado);
  const novos = avisos.filter((aviso) => aviso.novo).length;
  const situacao = situacaoDoDia(estado, hoje, hoje);
  const pendentes = situacao.filter((linha) => linha.status !== "lancada");
  const professorasAtivas = estado.usuarios.filter(
    (u) => u.papel === "professora" && u.ativo,
  ).length;

  const indicadores = [
    { rotulo: "Turmas", valor: estado.turmas.length, icone: Users },
    { rotulo: "Crianças", valor: estado.alunos.length, icone: Users },
    { rotulo: "Professoras com acesso", valor: professorasAtivas, icone: UserCog },
    {
      rotulo: "Chamadas de hoje em aberto",
      valor: pendentes.length,
      icone: CircleAlert,
      alerta: pendentes.length > 0,
    },
  ];

  return (
    <GestaoLayout
      titulo="Visão geral"
      subtitulo={`${usuario?.nome} · ${rotuloData(hoje)}`}
      migalhas={[{ rotulo: "Gestão" }]}
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
            {novos > 0 && (
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
                        {aviso.percentual !== null &&
                          ` · frequência de ${aviso.percentual.toFixed(0)}%`}
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
                      <Link to={`/escola/gestao/turma/${aviso.turmaId}`}>Ver turma</Link>
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
        <CardContent className="p-0">
          <div className="px-5 py-4 border-b flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold">Chamada de hoje</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Quem já lançou e quem está devendo — {rotuloData(hoje)}
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/escola/gestao/chamadas">Ver histórico</Link>
            </Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Turma</TableHead>
                  <TableHead>Professora responsável</TableHead>
                  <TableHead className="text-center">Crianças</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {situacao.map((linha) => (
                  <TableRow key={linha.turma.id}>
                    <TableCell className="font-medium">
                      <Link
                        to={`/escola/gestao/turma/${linha.turma.id}`}
                        className="hover:underline underline-offset-4"
                      >
                        {linha.turma.nome}
                      </Link>
                      <span className="block text-xs text-muted-foreground">
                        {linha.turma.etapa}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {linha.professoras.map((p) => p.nome).join(", ") || (
                        <span className="text-muted-foreground">Sem professora vinculada</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">{linha.alunos}</TableCell>
                    <TableCell>
                      {linha.status === "lancada" ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" />
                          Lançada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-sm text-amber-700 dark:text-amber-400">
                          <CircleAlert className="h-4 w-4" />
                          Ainda não lançada
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </GestaoLayout>
  );
}
