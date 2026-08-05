import { Link, Navigate, useParams } from "react-router-dom";
import { BarChart3, CalendarDays, ClipboardCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import EscolaLayout from "../../components/EscolaLayout";
import { useEstadoEscola } from "../../data/store";
import {
  ROTULO_TURNO,
  alunosDaTurma,
  chaveChamada,
  statusChamada,
  turnosDaTurma,
} from "../../lib/chamada";
import { hojeIso, rotuloData } from "../../lib/datas";

export default function TurmaPage() {
  const { turmaId = "" } = useParams();
  const estado = useEstadoEscola();
  const hoje = hojeIso();

  const turma = estado.turmas.find((t) => t.id === turmaId);
  if (!turma) return <Navigate to="/escola/professor" replace />;

  const alunos = alunosDaTurma(estado, turma.id);
  const turnos = turnosDaTurma(turma.turno);
  const chamadaHoje = estado.chamadas[chaveChamada(turma.id, hoje)];
  const status = statusChamada(chamadaHoje, hoje, hoje);
  const professoras = turma.professoraIds
    .map((id) => estado.professoras.find((p) => p.id === id)?.nome)
    .filter(Boolean);

  const atalhos = [
    {
      titulo: "Chamada",
      descricao: "Lançar e revisar a frequência dia a dia",
      icone: ClipboardCheck,
      para: `/escola/professor/turma/${turma.id}/chamada`,
    },
    {
      titulo: "Estudantes",
      descricao: `${alunos.length} crianças matriculadas`,
      icone: Users,
      para: `/escola/professor/turma/${turma.id}/alunos`,
    },
    {
      titulo: "Visão geral da turma",
      descricao: "Frequência de cada criança no período",
      icone: BarChart3,
      para: `/escola/professor/turma/${turma.id}/visao-geral`,
    },
    {
      titulo: "Chamada de hoje",
      descricao: rotuloData(hoje),
      icone: CalendarDays,
      para: `/escola/professor/turma/${turma.id}/chamada/${hoje}`,
    },
  ];

  return (
    <EscolaLayout
      titulo={turma.nome}
      subtitulo={`${turma.nivel} · ${turma.etapa} · ${turma.sala}`}
      migalhas={[
        { rotulo: "Início", para: "/escola/professor" },
        { rotulo: "Turmas", para: "/escola/professor" },
        { rotulo: turma.nome },
      ]}
      acoes={
        status === "lancada" ? (
          <Badge className="bg-emerald-600 hover:bg-emerald-600">Chamada de hoje lançada</Badge>
        ) : (
          <Badge variant="destructive">Chamada de hoje pendente</Badge>
        )
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {atalhos.map((atalho) => (
          <Link key={atalho.titulo} to={atalho.para}>
            <Card className="h-full hover:border-foreground/20 transition-colors">
              <CardContent className="p-5 space-y-3">
                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <atalho.icone className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">{atalho.titulo}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{atalho.descricao}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="p-5">
          <h2 className="font-semibold mb-4">Dados da turma</h2>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Turno</dt>
              <dd className="font-medium">
                {turma.turno === "integral"
                  ? "Integral (manhã e tarde)"
                  : turnos.map((t) => ROTULO_TURNO[t]).join(" / ")}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Sala</dt>
              <dd className="font-medium">{turma.sala}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Estudantes</dt>
              <dd className="font-medium">{alunos.length}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Professoras</dt>
              <dd className="font-medium">{professoras.join(", ") || "—"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </EscolaLayout>
  );
}
