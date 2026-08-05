import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Info, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEstadoEscola } from "../data/store";
import { useSessao } from "../hooks/useSessao";
import { INICIO, MENSAGEM_ERRO } from "../lib/acesso";
import { SENHA_DEMONSTRACAO } from "../data/seed";

interface Props {
  titulo: string;
  descricao: string;
  icone: React.ReactNode;
  /** Contas mostradas na caixa de demonstração — sai quando houver acesso real. */
  sugestoes: { email: string; rotulo: string }[];
}

export default function FormularioEntrada({ titulo, descricao, icone, sugestoes }: Props) {
  const estado = useEstadoEscola();
  const { papel, entrar } = useSessao();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const enviar = (evento: React.FormEvent) => {
    evento.preventDefault();
    const falha = entrar(email, senha);
    if (!falha) {
      navigate(INICIO[papel], { replace: true });
      return;
    }
    setErro(MENSAGEM_ERRO[falha]);
  };

  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-5">
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center">
            {icone}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{estado.escola.nome}</h1>
          <p className="text-sm text-muted-foreground">
            {titulo} · Ano letivo {estado.escola.anoLetivo}
          </p>
        </div>

        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground mb-4">{descricao}</p>
            <form onSubmit={enviar} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(evento) => {
                    setEmail(evento.target.value);
                    setErro(null);
                  }}
                  placeholder="seu.nome@escola.exemplo.br"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="senha">Senha</Label>
                <div className="relative">
                  <Input
                    id="senha"
                    type={verSenha ? "text" : "password"}
                    autoComplete="current-password"
                    value={senha}
                    onChange={(evento) => {
                      setSenha(evento.target.value);
                      setErro(null);
                    }}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setVerSenha((atual) => !atual)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {verSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {erro && (
                <p
                  role="alert"
                  className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
                >
                  {erro}
                </p>
              )}

              <Button type="submit" className="w-full">
                <LogIn className="mr-2 h-4 w-4" />
                Entrar
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Some junto com a carga de demonstração, quando houver acesso real. */}
        <div className="rounded-xl border bg-background p-4 space-y-2">
          <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            Acessos de demonstração
          </p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {sugestoes.map((sugestao) => (
              <li key={sugestao.email} className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEmail(sugestao.email);
                    setSenha(SENHA_DEMONSTRACAO);
                    setErro(null);
                  }}
                  className="font-medium text-foreground underline underline-offset-2 hover:no-underline"
                >
                  {sugestao.email}
                </button>
                <span>{sugestao.rotulo}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Senha de todos: <strong className="text-foreground">{SENHA_DEMONSTRACAO}</strong>. Clique
            em um e-mail para preencher.
          </p>
        </div>
      </div>
    </div>
  );
}
