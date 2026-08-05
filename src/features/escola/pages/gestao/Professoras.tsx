import { useState } from "react";
import { KeyRound, Link2, Mail, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import GestaoLayout from "../../components/GestaoLayout";
import {
  definirAcessoAtivo,
  definirProfessorasDaTurma,
  useEstadoEscola,
} from "../../data/store";
import { ENTRADA, usuarioDaProfessora } from "../../lib/acesso";
import { turmasDaProfessora } from "../../lib/chamada";

export default function ProfessorasGestao() {
  const estado = useEstadoEscola();
  const [vinculando, setVinculando] = useState<string | null>(null);

  const professora = estado.professoras.find((p) => p.id === vinculando);
  const turmasDela = new Set(professora ? turmasDaProfessora(estado, professora.id).map((t) => t.id) : []);

  const alternarTurma = (turmaId: string, marcar: boolean) => {
    if (!professora) return;
    const turma = estado.turmas.find((t) => t.id === turmaId);
    if (!turma) return;
    const ids = marcar
      ? [...new Set([...turma.professoraIds, professora.id])]
      : turma.professoraIds.filter((id) => id !== professora.id);
    definirProfessorasDaTurma(turmaId, ids);
  };

  return (
    <GestaoLayout
      titulo="Professoras e acessos"
      subtitulo="Quem entra no sistema e em qual turma dá aula"
      migalhas={[{ rotulo: "Gestão", para: "/escola/gestao" }, { rotulo: "Professoras" }]}
    >
      <div className="flex gap-3 rounded-xl border bg-background p-4 text-sm">
        <Link2 className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
        <p className="text-muted-foreground">
          O link de acesso das professoras é{" "}
          <strong className="text-foreground">{ENTRADA.professora}</strong>. O da gestão é{" "}
          <strong className="text-foreground">{ENTRADA.gestao}</strong>. Cada pessoa entra com o
          próprio e-mail e senha; desligar o acesso aqui bloqueia a entrada na hora.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold">Professoras</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              O vínculo com a turma define de quem o sistema cobra a chamada.
            </p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Professora</TableHead>
                  <TableHead className="min-w-[220px]">Contato</TableHead>
                  <TableHead className="min-w-[200px]">Turmas</TableHead>
                  <TableHead>Último acesso</TableHead>
                  <TableHead className="text-center">Acesso</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {estado.professoras.map((prof) => {
                  const usuario = usuarioDaProfessora(estado, prof.id);
                  const turmas = turmasDaProfessora(estado, prof.id);
                  return (
                    <TableRow key={prof.id}>
                      <TableCell>
                        <p className="font-medium">{prof.nome}</p>
                        <p className="text-xs text-muted-foreground">{prof.formacao}</p>
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Mail className="h-3.5 w-3.5" />
                          {prof.email}
                        </span>
                        <span className="flex items-center gap-1.5 text-muted-foreground mt-0.5">
                          <Phone className="h-3.5 w-3.5" />
                          {prof.telefone}
                        </span>
                      </TableCell>
                      <TableCell>
                        {turmas.length === 0 ? (
                          <span className="text-sm text-muted-foreground">Nenhuma</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {turmas.map((turma) => (
                              <Badge key={turma.id} variant="secondary" className="text-[11px]">
                                {turma.nome}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {usuario?.ultimoAcesso
                          ? new Date(usuario.ultimoAcesso).toLocaleString("pt-BR")
                          : "Nunca entrou"}
                      </TableCell>
                      <TableCell className="text-center">
                        {usuario ? (
                          <div className="flex flex-col items-center gap-1">
                            <Switch
                              checked={usuario.ativo}
                              onCheckedChange={(ativo) => {
                                definirAcessoAtivo(usuario.id, ativo);
                                toast({
                                  title: ativo ? "Acesso liberado" : "Acesso bloqueado",
                                  description: `${prof.nome} ${ativo ? "pode entrar" : "não entra mais"} no sistema.`,
                                });
                              }}
                              aria-label={`Acesso de ${prof.nome}`}
                            />
                            <span className="text-[11px] text-muted-foreground">
                              {usuario.ativo ? "Ativo" : "Bloqueado"}
                            </span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <KeyRound className="h-3 w-3" />
                            Sem conta
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => setVinculando(prof.id)}>
                          Vincular turmas
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

      <Card>
        <CardContent className="p-0">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold">Gestão</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Quem entra pelo painel da gestão.
            </p>
          </div>
          <div className="divide-y">
            {estado.usuarios
              .filter((usuario) => usuario.papel === "gestao")
              .map((usuario) => (
                <div
                  key={usuario.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                >
                  <div>
                    <p className="font-medium">{usuario.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {usuario.cargo} · {usuario.email}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {usuario.ultimoAcesso
                        ? `Último acesso em ${new Date(usuario.ultimoAcesso).toLocaleString("pt-BR")}`
                        : "Nunca entrou"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {usuario.ativo ? "Ativo" : "Bloqueado"}
                    </span>
                    <Switch
                      checked={usuario.ativo}
                      onCheckedChange={(ativo) => definirAcessoAtivo(usuario.id, ativo)}
                      aria-label={`Acesso de ${usuario.nome}`}
                    />
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={vinculando !== null} onOpenChange={(aberto) => !aberto && setVinculando(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Turmas de {professora?.nome}</DialogTitle>
            <DialogDescription>
              Marque as turmas em que ela dá aula. A chamada passa a ser cobrada dela nessas
              turmas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {estado.turmas.map((turma) => (
              <label
                key={turma.id}
                className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent"
              >
                <Checkbox
                  checked={turmasDela.has(turma.id)}
                  onCheckedChange={(marcado) => alternarTurma(turma.id, marcado === true)}
                />
                <span className="min-w-0">
                  <span className="block font-medium">{turma.nome}</span>
                  <span className="block text-xs text-muted-foreground">
                    {turma.etapa} · {turma.sala}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setVinculando(null)}>Concluído</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </GestaoLayout>
  );
}
