import { Navigate, useParams } from "react-router-dom";
import { HeartPulse, Home, Phone, ShieldCheck, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import EscolaLayout from "../components/EscolaLayout";
import { useEstadoEscola } from "../data/store";
import { ROTULO_TURNO, faltasAluno, frequenciaAluno, turnosDaTurma } from "../lib/chamada";
import { formatarBr, idadeExtenso } from "../lib/datas";
import type { Responsavel } from "../types";

function Campo({ rotulo, valor }: { rotulo: string; valor?: string | null }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{rotulo}</dt>
      <dd className="text-sm font-medium">{valor?.trim() ? valor : "—"}</dd>
    </div>
  );
}

function CartaoResponsavel({ responsavel }: { responsavel: Responsavel }) {
  return (
    <div className="rounded-xl border p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{responsavel.nome}</p>
        <Badge variant="secondary">{responsavel.parentesco}</Badge>
      </div>
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Phone className="h-3.5 w-3.5" />
        {responsavel.telefone}
      </p>
      {responsavel.email && (
        <p className="text-sm text-muted-foreground break-all">{responsavel.email}</p>
      )}
      {responsavel.profissao && (
        <p className="text-xs text-muted-foreground">Profissão: {responsavel.profissao}</p>
      )}
    </div>
  );
}

function Lista({ itens, vazio }: { itens: string[]; vazio: string }) {
  if (itens.length === 0) return <p className="text-sm text-muted-foreground">{vazio}</p>;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {itens.map((item) => (
        <li key={item}>
          <Badge variant="secondary">{item}</Badge>
        </li>
      ))}
    </ul>
  );
}

export default function AlunoPage() {
  const { alunoId = "" } = useParams();
  const estado = useEstadoEscola();

  const aluno = estado.alunos.find((a) => a.id === alunoId);
  if (!aluno) return <Navigate to="/escola/painel" replace />;

  const turma = estado.turmas.find((t) => t.id === aluno.turmaId);
  const frequencia = frequenciaAluno(estado, aluno);
  const turnos = turnosDaTurma(aluno.turno);

  return (
    <EscolaLayout
      titulo={aluno.nome}
      subtitulo={`${turma?.nome ?? ""} · Código ${aluno.codigo}`}
      migalhas={[
        { rotulo: "Início", para: "/escola/painel" },
        ...(turma
          ? [
              { rotulo: turma.nome, para: `/escola/turma/${turma.id}` },
              { rotulo: "Estudantes", para: `/escola/turma/${turma.id}/alunos` },
            ]
          : []),
        { rotulo: aluno.nome },
      ]}
      acoes={
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            Faltas: {faltasAluno(estado, aluno)}
          </Badge>
          <Badge
            className={
              frequencia !== null && frequencia < 75
                ? "bg-red-600 hover:bg-red-600"
                : "bg-emerald-600 hover:bg-emerald-600"
            }
          >
            Frequência: {frequencia === null ? "—" : `${frequencia.toFixed(0)}%`}
          </Badge>
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5 space-y-4">
            <h2 className="flex items-center gap-2 font-semibold">
              <User className="h-4 w-4" />
              Dados da criança
            </h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Campo rotulo="Nome completo" valor={aluno.nome} />
              <Campo rotulo="Código / matrícula" valor={aluno.codigo} />
              <Campo rotulo="Data de nascimento" valor={formatarBr(aluno.dataNascimento)} />
              <Campo rotulo="Idade" valor={idadeExtenso(aluno.dataNascimento)} />
              <Campo rotulo="Sexo" valor={aluno.sexo === "F" ? "Feminino" : "Masculino"} />
              <Campo rotulo="Turma" valor={turma?.nome} />
              <Campo rotulo="Turno" valor={turnos.map((t) => ROTULO_TURNO[t]).join(" e ")} />
              <Campo rotulo="Matriculado em" valor={formatarBr(aluno.matriculadoEm)} />
              <Campo rotulo="Transporte" valor={aluno.transporte} />
            </dl>
            {aluno.observacoes && (
              <div className="rounded-lg bg-muted/60 p-3 text-sm">
                <p className="text-xs text-muted-foreground mb-1">Observações da rotina</p>
                {aluno.observacoes}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-4">
            <h2 className="flex items-center gap-2 font-semibold">
              <HeartPulse className="h-4 w-4" />
              Saúde
            </h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Campo rotulo="Tipo sanguíneo" valor={aluno.saude.tipoSanguineo} />
              <Campo rotulo="Convênio / atendimento" valor={aluno.saude.convenio} />
            </dl>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Alergias</p>
                <Lista itens={aluno.saude.alergias} vazio="Nenhuma alergia registrada." />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Restrições alimentares</p>
                <Lista
                  itens={aluno.saude.restricoesAlimentares}
                  vazio="Sem restrições alimentares."
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Medicações</p>
                <Lista itens={aluno.saude.medicacoes} vazio="Nenhuma medicação de uso na escola." />
              </div>
            </div>
            {aluno.saude.observacoes && (
              <div className="rounded-lg bg-muted/60 p-3 text-sm">{aluno.saude.observacoes}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-4">
            <h2 className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="h-4 w-4" />
              Filiação e responsáveis
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <CartaoResponsavel responsavel={aluno.mae} />
              <CartaoResponsavel responsavel={aluno.pai} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Autorizados a retirar a criança</p>
              {aluno.autorizados.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Somente a mãe e o pai estão autorizados.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {aluno.autorizados.map((responsavel) => (
                    <CartaoResponsavel key={responsavel.nome} responsavel={responsavel} />
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-4">
            <h2 className="flex items-center gap-2 font-semibold">
              <Home className="h-4 w-4" />
              Endereço
            </h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Campo
                rotulo="Logradouro"
                valor={`${aluno.endereco.logradouro}, ${aluno.endereco.numero}`}
              />
              <Campo rotulo="Bairro" valor={aluno.endereco.bairro} />
              <Campo rotulo="Cidade / UF" valor={`${aluno.endereco.cidade} / ${aluno.endereco.uf}`} />
              <Campo rotulo="CEP" valor={aluno.endereco.cep} />
            </dl>
          </CardContent>
        </Card>
      </div>
    </EscolaLayout>
  );
}
