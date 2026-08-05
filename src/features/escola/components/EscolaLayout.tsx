import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Home, LogOut, RotateCcw, School, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { NavLink } from "@/components/NavLink";
import { useEstadoEscola, reiniciarDemonstracao } from "../data/store";
import { useProfessora } from "../hooks/useProfessora";
import { turmasDaProfessora } from "../lib/chamada";
import { AvisoPendencias } from "./AvisoPendencias";

export interface Migalha {
  rotulo: string;
  para?: string;
}

interface Props {
  titulo: string;
  subtitulo?: string;
  migalhas?: Migalha[];
  acoes?: React.ReactNode;
  children: React.ReactNode;
}

function Menu() {
  const estado = useEstadoEscola();
  const { professora } = useProfessora();
  const turmas = professora ? turmasDaProfessora(estado, professora.id) : [];

  const itemClasse =
    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-white/5 transition-colors";

  return (
    <nav className="space-y-1">
      <NavLink
        to="/escola/painel"
        end
        className={itemClasse}
        activeClassName="!text-sidebar-foreground !bg-white/10"
      >
        <Home className="h-[18px] w-[18px]" />
        <span>Página do Professor</span>
      </NavLink>

      <p className="px-3 pt-4 pb-1 text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/35 font-semibold">
        Minhas Turmas
      </p>
      {turmas.map((turma) => (
        <NavLink
          key={turma.id}
          to={`/escola/turma/${turma.id}`}
          className={itemClasse}
          activeClassName="!text-sidebar-foreground !bg-white/10"
        >
          <Users className="h-[18px] w-[18px]" />
          <span className="truncate">{turma.nome}</span>
        </NavLink>
      ))}
      {turmas.length === 0 && (
        <p className="px-3 text-xs text-sidebar-foreground/40">
          Nenhuma turma vinculada.
        </p>
      )}
    </nav>
  );
}

export default function EscolaLayout({ titulo, subtitulo, migalhas = [], acoes, children }: Props) {
  const estado = useEstadoEscola();
  const { professora, sair } = useProfessora();
  const navigate = useNavigate();

  const iniciais = professora?.nome
    .split(" ")
    .map((parte) => parte[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="min-h-screen flex w-full bg-muted/30">
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
        <div className="px-5 py-5 border-b border-sidebar-border/50">
          <Link to="/escola/painel" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
              <School className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="block text-sm font-bold tracking-tight truncate">
                {estado.escola.nome}
              </span>
              <span className="block text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/40 font-medium">
                Ano letivo {estado.escola.anoLetivo}
              </span>
            </div>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <Menu />
        </div>

        <div className="p-4">
          <Separator className="mb-4 bg-sidebar-border/30" />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-sm font-semibold shrink-0">
                {iniciais || <GraduationCap className="h-4 w-4" />}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold truncate">
                  {professora?.nome ?? "Professora"}
                </span>
                <span className="text-[11px] text-sidebar-foreground/40">Professora</span>
              </div>
            </div>
            <button
              onClick={() => {
                sair();
                navigate("/escola/entrar");
              }}
              className="text-sidebar-foreground/40 hover:text-red-400 transition-colors p-1.5 rounded-md hover:bg-white/5 shrink-0"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => {
              if (confirm("Recarregar os dados fictícios de demonstração?")) {
                reiniciarDemonstracao();
              }
            }}
            className="mt-3 flex items-center gap-2 text-[11px] text-sidebar-foreground/35 hover:text-sidebar-foreground/70 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Reiniciar dados de demonstração
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="bg-background border-b px-4 md:px-8 py-4">
          {migalhas.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground mb-2">
              {migalhas.map((migalha, indice) => (
                <span key={`${migalha.rotulo}-${indice}`} className="flex items-center gap-1.5">
                  {indice > 0 && <span className="text-muted-foreground/40">›</span>}
                  {migalha.para ? (
                    <Link to={migalha.para} className="hover:text-foreground transition-colors">
                      {migalha.rotulo}
                    </Link>
                  ) : (
                    <span className="text-foreground/70">{migalha.rotulo}</span>
                  )}
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">{titulo}</h1>
              {subtitulo && <p className="text-sm text-muted-foreground mt-0.5">{subtitulo}</p>}
            </div>
            <div className="flex items-center gap-2">{acoes}</div>
          </div>
          <div className="md:hidden mt-3 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/escola/painel">Início</Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                sair();
                navigate("/escola/entrar");
              }}
            >
              Sair
            </Button>
          </div>
        </header>

        <div className="p-4 md:p-8 space-y-6">
          <AvisoPendencias />
          {children}
        </div>
      </main>
    </div>
  );
}
