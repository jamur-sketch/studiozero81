import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, MessageSquare, Minus, Save, Undo2, X } from "lucide-react";
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
import EscolaLayout from "../../components/EscolaLayout";
import { lancarChamada, reabrirChamada, useEstadoEscola } from "../../data/store";
import { useSessao } from "../../hooks/useSessao";
import {
  LIMITE_FALTAS_AVISO,
  ROTULO_TURNO,
  TURNOS_CHAMADA,
  alternarColunaTurno,
  alternarTodosDoAluno,
  alternarTudo,
  alternarTurno,
  alunosDaTurma,
  chaveChamada,
  estadoDoGrupo,
  frequenciaAluno,
  registroVazio,
  resumoChamada,
  statusChamada,
  turnosDaTurma,
} from "../../lib/chamada";
import { hojeIso, rotuloData } from "../../lib/datas";
import type { EstadoPresenca } from "../../lib/chamada";
import type { RegistroPresenca } from "../../types";

const APARENCIA: Record<EstadoPresenca, { trilho: string; icone: JSX.Element }> = {
  todos: {
    trilho: "justify-end border-emerald-600 bg-emerald-500",
    icone: <Check className="h-3.5 w-3.5 text-emerald-600" />,
  },
  nenhum: {
    trilho: "justify-start border-red-600 bg-red-500",
    icone: <X className="h-3.5 w-3.5 text-red-600" />,
  },
  // Parte marcada: nem presente nem falta. Fica no meio, em âmbar.
  parcial: {
    trilho: "justify-center border-amber-500 bg-amber-400",
    icone: <Minus className="h-3.5 w-3.5 text-amber-600" />,
  },
};

const CLASSE_PASTILHA =
  "inline-flex h-7 w-10 sm:w-[52px] items-center rounded-full border transition-colors";

/** Só o visual — usado também na legenda, onde não há o que clicar. */
function PastilhaPresenca({ estado }: { estado: EstadoPresenca }) {
  return (
    <span className={cn(CLASSE_PASTILHA, APARENCIA[estado].trilho)} aria-hidden>
      <span className="mx-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white">
        {APARENCIA[estado].icone}
      </span>
    </span>
  );
}

function BotaoPresenca({
  estado,
  onClick,
  titulo,
}: {
  estado: EstadoPresenca;
  onClick: () => void;
  titulo: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={titulo}
      aria-pressed={estado === "todos"}
      aria-label={titulo}
      className={cn(CLASSE_PASTILHA, APARENCIA[estado].trilho)}
    >
      <span className="mx-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white">
        {APARENCIA[estado].icone}
      </span>
    </button>
  );
}

export default function ChamadaDia() {
  const { turmaId = "", data = "" } = useParams();
  const estado = useEstadoEscola();
  const { professora } = useSessao();
  const navigate = useNavigate();
  const hoje = hojeIso();

  const turma = estado.turmas.find((t) => t.id === turmaId);
  const alunos = useMemo(
    () => (turma ? alunosDaTurma(estado, turma.id) : []),
    [estado, turma],
  );
  const alunoIds = useMemo(() => alunos.map((a) => a.id), [alunos]);
  const turnos = TURNOS_CHAMADA;
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

  if (!turma) return <Navigate to="/escola/professor" replace />;

  const dataInvalida = !/^\d{4}-\d{2}-\d{2}$/.test(data) || data > hoje;
  if (dataInvalida) {
    return (
      <EscolaLayout
        titulo="Data indisponível"
        migalhas={[
          { rotulo: "Início", para: "/escola/professor" },
          { rotulo: turma.nome, para: `/escola/professor/turma/${turma.id}` },
        ]}
      >
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              A chamada só fica disponível a partir do próprio dia letivo. As datas vão aparecendo
              conforme o calendário avança.
            </p>
            <Button asChild variant="outline">
              <Link to={`/escola/professor/turma/${turma.id}/chamada`}>Ver datas disponíveis</Link>
            </Button>
          </CardContent>
        </Card>
      </EscolaLayout>
    );
  }

  const status = statusChamada(chamadaSalva, data, hoje);
  const resumo = resumoChamada(registros, alunoIds, turnos);

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
        { rotulo: "Início", para: "/escola/professor" },
        { rotulo: turma.nome, para: `/escola/professor/turma/${turma.id}` },
        { rotulo: "Chamada", para: `/escola/professor/turma/${turma.id}/chamada` },
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
              <span className="text-muted-foreground">Turma de: </span>
              <strong>
                {turma.turno === "integral"
                  ? "Manhã e tarde"
                  : turnosDaTurma(turma.turno).map((t) => ROTULO_TURNO[t]).join(" e ")}
              </strong>
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
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b px-4 py-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <PastilhaPresenca estado="todos" />
              Presente
            </span>
            <span className="flex items-center gap-2">
              <PastilhaPresenca estado="nenhum" />
              Falta
            </span>
            <span className="flex items-center gap-2">
              <PastilhaPresenca estado="parcial" />
              <span>
                Parte do dia
                <span className="hidden sm:inline">
                  {" "}
                  — em <strong className="font-medium">Todos</strong> e no cabeçalho, quer dizer que
                  só parte está marcada
                </span>
              </span>
            </span>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20 hidden sm:table-cell">Código</TableHead>
                  <TableHead className="min-w-[100px] sm:min-w-[220px] px-2 sm:px-4">Estudante</TableHead>
                  <TableHead className="w-14 sm:w-24 text-center px-0.5 sm:px-4">Frequência</TableHead>
                  {turnos.map((turno) => (
                    <TableHead key={turno} className="w-12 sm:w-24 text-center px-0.5 sm:px-4">
                      {ROTULO_TURNO[turno]}
                    </TableHead>
                  ))}
                  <TableHead className="w-12 sm:w-24 text-center px-0.5 sm:px-4">Todos</TableHead>
                  <TableHead className="w-10 sm:w-24 text-center px-0.5 sm:px-4">Obs.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Linha de atalhos: marca/desmarca a turma inteira. */}
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableCell className="text-muted-foreground hidden sm:table-cell">#</TableCell>
                  <TableCell className="font-medium px-2 sm:px-4">Todos os estudantes</TableCell>
                  <TableCell />
                  {turnos.map((turno) => (
                    <TableCell key={turno} className="text-center px-0.5 sm:px-4">
                      <BotaoPresenca
                        estado={estadoDoGrupo(registros, alunoIds, [turno])}
                        onClick={() => aplicar(alternarColunaTurno(registros, alunoIds, turno))}
                        titulo={`Marcar/desmarcar ${ROTULO_TURNO[turno]} para toda a turma`}
                      />
                    </TableCell>
                  ))}
                  <TableCell className="text-center px-0.5 sm:px-4">
                    <BotaoPresenca
                      estado={estadoDoGrupo(registros, alunoIds, turnos)}
                      onClick={() => aplicar(alternarTudo(registros, alunoIds, turnos))}
                      titulo="Marcar/desmarcar todos os turnos de toda a turma"
                    />
                  </TableCell>
                  <TableCell className="px-0.5 sm:px-4" />
                </TableRow>

                {alunos.map((aluno) => {
                  const registro = registros[aluno.id] ?? registroVazio();
                  const frequencia = frequenciaAluno(estado, aluno);
                  return (
                    <TableRow key={aluno.id}>
                      <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">{aluno.codigo}</TableCell>
                      <TableCell className="px-2 sm:px-4">
                        <Link
                          to={`/escola/professor/aluno/${aluno.id}`}
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
                      <TableCell className="text-center px-0.5 sm:px-4">
                        {frequencia.diasLancados === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <>
                            <span
                              className={cn(
                                "block text-sm font-semibold tabular-nums",
                                frequencia.faltas >= LIMITE_FALTAS_AVISO &&
                                  "text-red-600 dark:text-red-400",
                              )}
                            >
                              {frequencia.diasPresentes}
                              <span className="text-muted-foreground font-normal">
                                /{frequencia.diasLancados}
                              </span>
                            </span>
                            <span className="block text-[11px] text-muted-foreground tabular-nums">
                              {frequencia.percentual?.toFixed(0)}%
                            </span>
                          </>
                        )}
                      </TableCell>
                      {turnos.map((turno) => (
                        <TableCell key={turno} className="text-center px-0.5 sm:px-4">
                          <BotaoPresenca
                            estado={registro[turno] ? "todos" : "nenhum"}
                            onClick={() => aplicar(alternarTurno(registros, aluno.id, turno))}
                            titulo={`${aluno.nome} — ${ROTULO_TURNO[turno]}`}
                          />
                        </TableCell>
                      ))}
                      <TableCell className="text-center px-0.5 sm:px-4">
                        <BotaoPresenca
                          estado={estadoDoGrupo(registros, [aluno.id], turnos)}
                          onClick={() => aplicar(alternarTodosDoAluno(registros, aluno.id, turnos))}
                          titulo={`Marcar/desmarcar todos os turnos de ${aluno.nome}`}
                        />
                      </TableCell>
                      <TableCell className="text-center px-0.5 sm:px-4">
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
