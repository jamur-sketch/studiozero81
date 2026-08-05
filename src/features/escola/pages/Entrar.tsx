import { Link, useNavigate } from "react-router-dom";
import { Info, School } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useEstadoEscola } from "../data/store";
import { useProfessora } from "../hooks/useProfessora";
import { turmasDaProfessora } from "../lib/chamada";

/**
 * Entrada da professora.
 *
 * Os acessos (login e senha) ainda não foram criados — por isso a tela lista as
 * professoras cadastradas para entrar direto. Quando as contas existirem, este
 * arquivo vira o formulário de login e chama a autenticação; o resto do sistema
 * não muda, pois consome `useProfessora()`.
 */
export default function Entrar() {
  const estado = useEstadoEscola();
  const { entrar } = useProfessora();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-5">
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center">
            <School className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{estado.escola.nome}</h1>
          <p className="text-sm text-muted-foreground">
            Diário da professora · Ano letivo {estado.escola.anoLetivo}
          </p>
        </div>

        <Card>
          <CardContent className="p-5 space-y-3">
            <p className="text-sm font-semibold">Entrar como</p>
            {estado.professoras.map((professora) => {
              const turmas = turmasDaProfessora(estado, professora.id);
              return (
                <button
                  key={professora.id}
                  onClick={() => {
                    entrar(professora.id);
                    navigate("/escola/painel");
                  }}
                  className="w-full flex items-center gap-3 rounded-xl border p-3 text-left hover:bg-accent hover:border-foreground/20 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-semibold shrink-0">
                    {professora.nome
                      .split(" ")
                      .map((parte) => parte[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{professora.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {turmas.length > 0
                        ? turmas.map((t) => t.nome).join(" · ")
                        : "Sem turma vinculada"}
                    </p>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex gap-3 rounded-xl border bg-background p-4 text-xs text-muted-foreground">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            Os acessos individuais (login e senha) ainda não foram criados. A tela de login fica
            aqui quando a gestão liberar as contas — a vinculação professora × turma já está
            pronta e é feita pelo painel da gestão.
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
            <Link to="/escola/gestao">Painel da gestão</Link>
          </Button>
        </p>
      </div>
    </div>
  );
}
