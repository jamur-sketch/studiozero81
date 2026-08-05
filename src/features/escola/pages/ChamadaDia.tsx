import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, MessageSquare, Save, Undo2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
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
import EscolaLayout from "../components/EscolaLayout";
import { lancarChamada, reabrirChamada, useEstadoEscola } from "../data/store";
import { useProfessora } from "../hooks/useProfessora";
import {
  ROTULO_TURNO,
  alternarColunaTurno,
  alternarTodosDoAluno,
  alternarTudo,
  alternarTurno,
  alunosDaTurma,
  chaveChamada,
  estaTudoMarcado,
  frequenciaAluno,
  registroVazio,
  resumoChamada,
  statusChamada,
  turnosDaTurma,
} from "../lib/chamada";
import { hojeIso, rotuloData } from "../lib/datas";
import type { RegistroPresenca } from "../types";

function BotaoPresenca({
  marcado,
  onClick,
  titulo,
}: {
  marcado: boolean;
  onClick: () => void;
  titulo: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={titulo}
      aria-pressed={marcado}
      aria-label={titulo}
      className={cn(
        "inline-flex h-7 w-[52px] items-center rounded-full border transition-colors",
        marcado
          ? "justify-end border-emerald-600 bg-emerald-500"
          : "justify-start border-red-600 bg-red-500",
      )}
    >
      <span className="mx-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px]">
        {marcado ? (
          <Check className="h-3.5 w-3.5 text-emerald-600" />
        ) : (
          <X className="h-3.5 w-3.5 text-red-600" />
        )}
      </span>
    </button>
  );
}

export default function ChamadaDia() {
  const { turmaId = "", data = "" } = useParams();
  const estado = useEstadoEscola();
  const { professora } = useProfessora();
  const navigate = useNavigate();
  const hoje = hojeIso();

  const turma = estado.turmas.find((t) => t.id === turmaId);
  const alunos = useMemo(
    () => (turma ? alunosDaTurma(estado, turma.id) : []),
    [estado, turma],
  );
  const alunoIds = useMemo(() => alunos.map((a) => a.id), [alunos]);
  const turnos = useMemo(() => (turma ? turnosDaTurma(turma.turno) : []), [turma]);
  const chamadaSalva = estado.chamadas[chaveChamada(turmaId, data)];

  const [registros, setRegistros] = useState<Record<string, RegistroPresenca>>({});
  const [alterado, setAlterado] = useState(false);
  const [alunoObservacao, setAlunoObservacao] = useState<string | null>(null);
  const [textoObservacao, setTextoObservacao] = useState("");

  useEffect(() => {
    const inicial: Record<string, RegistroPresenca> = {};
    for (const aluno of alunos) {
      inicial[aluno.id] = chamadaSalva?.registros[aluno.id]
        ? { ...chamadaSalva.registros[aluno.id] }
        : registroVazio();
    }
    setRegistros(inicial);
    setAlterado(false);
  }, [alunos, chamadaSalva]);

  if (!turma) return <Navigate to="/escola/painel" replace />;

  const dataInvalida = !/^\d{4}-\d{2}-\d{2}$/.test(data) || data > hoje;
  if (dataInvalida) {
    return (
      <EscolaLayout
        titulo="Data indisponível"
        migalhas={[
          { rotulo: "Início", para: "/escola/painel" },
          { rotulo: turma.nome, para: `/escola/turma/${turma.id}` },
        ]}
      >
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              A chamada só fica disponível a partir do próprio dia letivo. As datas vão aparecendo
              conforme o calendário avança.
            </p>
            <Button asChild variant="outline">
              <Link to={`/escola/turma/${turma.id}/chamada`}>Ver datas disponíveis</Link>
            </Button>
          </CardContent>
        </Card>
      </EscolaLayout>
    );
  }

  const status = statusChamada(chamadaSalva, data, hoje);
  const resumo = resumoChamada(registros, alunoIds, turnos);
  const tudoMarcado = estaTudoMarcado(registros, alunoIds, turnos);

  const aplicar = (novos: Record<string, RegistroPresenca>) => {
    setRegistros(novos);
    setAlterado(true);
  };

  const salvar = () => {
    lancarChamada(turma.id, data, registros, professora?.id ?? "");
    setAlterado(false);
    toast({
      title: "Chamada lançada",
      description: `${turma.nome} — ${rotuloData(data)}. ${resumo.presentes} presentes, ${resumo.ausentes} faltas.`,
    });
  };

  const abrirObservacao = (alunoId: string) => {
    setAlunoObservacao(alunoId);
    setTextoObservacao(registros[alunoId]?.observacao ?? "");
  };

  const salvarObservacao = () => {
    if (!alunoObservacao) return;
    const atual = registros[alunoObservacao] ?? registroVazio();
    aplicar({
      ...registros,
      [alunoObservacao]: { ...atual, observacao: textoObservacao.trim() || undefined },
    });
    setAlunoObservacao(null);
  };

  return (
    <EscolaLayout
      titulo="Chamada"
      subtitulo={`${turma.nome} — ${rotuloData(data)}`}
      migalhas={[
        { rotulo: "Início", para: "/escola/painel" },
        { rotulo: turma.nome, para: `/escola/turma/${turma.id}` },
        { rotulo: "Chamada", para: `/escola/turma/${turma.id}/chamada` },
        { rotulo: rotuloData(data) },
      ]}
      acoes={
        <>
          {status === "lancada" && !alterado ? (
            <Badge className="bg-emerald-600 hover:bg-emerald-600">Lançada</Badge>
          ) : status === "atrasada" ? (
            <Badge variant="destructive">Não lançada</Badge>
          ) : (
            <Badge variant="secondary">Aguardando lançamento</Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Voltar
          </Button>
        </>
      }
    >
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-5 text-sm">
            <span>
              <span className="text-muted-foreground">Presentes: </span>
              <strong className="text-emerald-700 dark:text-emerald-400">{resumo.presentes}</strong>
            </span>
            <span>
              <span className="text-muted-foreground">Faltas: </span>
              <strong className="text-red-700 dark:text-red-400">{resumo.ausentes}</strong>
            </span>
            <span>
              <span className="text-muted-foreground">Turnos: </span>
              <strong>{turnos.map((t) => ROTULO_TURNO[t]).join(" e ")}</strong>
            </span>
            {chamadaSalva?.lancadaEm && (
              <span className="text-xs text-muted-foreground">
                Último lançamento em {new Date(chamadaSalva.lancadaEm).toLocaleString("pt-BR")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {status === "lancada" && !alterado && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  reabrirChamada(turma.id, data);
                  toast({
                    title: "Lançamento desfeito",
                    description: "A chamada voltou a constar como não lançada.",
                  });
                }}
              >
                <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                Desfazer lançamento
              </Button>
            )}
            <Button onClick={salvar} disabled={status === "lancada" && !alterado}>
              <Save className="mr-1.5 h-4 w-4" />
              {status === "lancada" ? "Salvar alterações" : "Lançar chamada"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {alterado && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Há alterações não salvas. A chamada só conta como lançada depois de salvar.
        </p>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20 hidden sm:table-cell">Código</TableHead>
                  <TableHead className="min-w-[140px] sm:min-w-[220px]">Estudante</TableHead>
                  <TableHead className="w-20 text-center hidden md:table-cell">Freq.</TableHead>
                  {turnos.map((turno) => (
                    <TableHead key={turno} className="w-[76px] sm:w-24 text-center px-1 sm:px-4">
                      {ROTULO_TURNO[turno]}
                    </TableHead>
                  ))}
                  <TableHead className="w-[76px] sm:w-24 text-center px-1 sm:px-4">Todos</TableHead>
                  <TableHead className="w-16 sm:w-24 text-center px-1 sm:px-4">Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Linha de atalhos: marca/desmarca a turma inteira. */}
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableCell className="text-muted-foreground hidden sm:table-cell">#</TableCell>
                  <TableCell className="font-medium">Todos os estudantes</TableCell>
                  <TableCell className="hidden md:table-cell" />
                  {turnos.map((turno) => (
                    <TableCell key={turno} className="text-center px-1 sm:px-4">
                      <BotaoPresenca
                        marcado={estaTudoMarcado(registros, alunoIds, [turno])}
                        onClick={() => aplicar(alternarColunaTurno(registros, alunoIds, turno))}
                        titulo={`Marcar/desmarcar ${ROTULO_TURNO[turno]} para toda a turma`}
                      />
                    </TableCell>
                  ))}
                  <TableCell className="text-center px-1 sm:px-4">
                    <BotaoPresenca
                      marcado={tudoMarcado}
                      onClick={() => aplicar(alternarTudo(registros, alunoIds, turnos))}
                      titulo="Marcar/desmarcar todos os turnos de toda a turma"
                    />
                  </TableCell>
                  <TableCell className="px-1 sm:px-4" />
                </TableRow>

                {alunos.map((aluno) => {
                  const registro = registros[aluno.id] ?? registroVazio();
                  const frequencia = frequenciaAluno(estado, aluno);
                  const marcadoTodos = turnos.every((turno) => registro[turno]);
                  return (
                    <TableRow key={aluno.id}>
                      <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">{aluno.codigo}</TableCell>
                      <TableCell>
                        <Link
                          to={`/escola/aluno/${aluno.id}`}
                          className="font-medium hover:underline underline-offset-4"
                        >
                          {aluno.nome}
                        </Link>
                        {registro.observacao && (
                          <span className="block text-xs text-muted-foreground truncate max-w-[260px]">
                            {registro.observacao}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-xs hidden md:table-cell">
                        {frequencia === null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span
                            className={cn(
                              "font-medium",
                              frequencia < 75 ? "text-red-600 dark:text-red-400" : "text-muted-foreground",
                            )}
                          >
                            {frequencia.toFixed(0)}%
                          </span>
                        )}
                      </TableCell>
                      {turnos.map((turno) => (
                        <TableCell key={turno} className="text-center px-1 sm:px-4">
                          <BotaoPresenca
                            marcado={registro[turno]}
                            onClick={() => aplicar(alternarTurno(registros, aluno.id, turno))}
                            titulo={`${aluno.nome} — ${ROTULO_TURNO[turno]}`}
                          />
                        </TableCell>
                      ))}
                      <TableCell className="text-center px-1 sm:px-4">
                        <BotaoPresenca
                          marcado={marcadoTodos}
                          onClick={() => aplicar(alternarTodosDoAluno(registros, aluno.id, turnos))}
                          titulo={`Marcar/desmarcar todos os turnos de ${aluno.nome}`}
                        />
                      </TableCell>
                      <TableCell className="text-center px-1 sm:px-4">
                        <Button
                          variant={registro.observacao ? "secondary" : "ghost"}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => abrirObservacao(aluno.id)}
                          title="Observação do dia"
                        >
                          <MessageSquare className="h-4 w-4" />
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

      <Dialog open={alunoObservacao !== null} onOpenChange={(aberto) => !aberto && setAlunoObservacao(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Observação do dia</DialogTitle>
            <DialogDescription>
              {alunos.find((a) => a.id === alunoObservacao)?.nome} — {rotuloData(data)}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={textoObservacao}
            onChange={(evento) => setTextoObservacao(evento.target.value)}
            placeholder="Ex.: chegou atrasado, família avisou consulta médica, passou mal após o almoço…"
            rows={4}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAlunoObservacao(null)}>
              Cancelar
            </Button>
            <Button onClick={salvarObservacao}>Salvar observação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </EscolaLayout>
  );
}
