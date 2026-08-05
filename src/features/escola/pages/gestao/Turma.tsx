import { Navigate, useParams } from "react-router-dom";
import { AlertTriangle, CalendarCheck, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import GestaoLayout from "../../components/GestaoLayout";
import { TabelaFrequencia } from "../../components/TabelaFrequencia";
import { useEstadoEscola } from "../../data/store";
import { LIMITE_FALTAS_AVISO, ROTULO_TURNO, resumoTurma, turnosDaTurma } from "../../lib/chamada";
import { formatarBr } from "../../lib/datas";

export default function TurmaGestao() {
  const { turmaId = "" } = useParams();
  const estado = useEstadoEscola();

  const turma = estado.turmas.find((t) => t.id === turmaId);
  if (!turma) return <Navigate to="/escola/gestao/turmas" replace />;

  const resumo = resumoTurma(estado, turma.id);
  const professoras = turma.professoraIds
    .map((id) => estado.professoras.find((p) => p.id === id)?.nome)
    .filter(Boolean);

  const indicadores = [
    { rotulo: "Crianças", valor: String(resumo.linhas.length), icone: Users },
    { rotulo: "Dias lançados", valor: String(resumo.diasLancados), icone: CalendarCheck },
    {
      rotulo: "Frequência média",
      valor: resumo.frequenciaMedia === null ? "—" : `${resumo.frequenciaMedia.toFixed(0)}%`,
      icone: CalendarCheck,
    },
    {
      rotulo: `Com ${LIMITE_FALTAS_AVISO}+ faltas`,
      valor: String(resumo.emAlerta.length),
      icone: AlertTriangle,
      alerta: resumo.emAlerta.length > 0,
    },
  ];

  return (
    <GestaoLayout
      titulo={turma.nome}
      subtitulo={`${turma.etapa} · ${
        turma.turno === "integral"
          ? "Integral"
          : turnosDaTurma(turma.turno).map((t) => ROTULO_TURNO[t]).join(" / ")
      } · ${professoras.join(", ") || "sem professora vinculada"}`}
      migalhas={[
        { rotulo: "Gestão", para: "/escola/gestao" },
        { rotulo: "Turmas", para: "/escola/gestao/turmas" },
        { rotulo: turma.nome },
      ]}
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
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold">Frequência por criança</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Dias em que veio à escola desde {formatarBr(estado.escola.usoDesde)}.
            </p>
          </div>
          <TabelaFrequencia resumo={resumo} />
        </CardContent>
      </Card>
    </GestaoLayout>
  );
}
