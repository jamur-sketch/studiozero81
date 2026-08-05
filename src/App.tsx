import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Outlet, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SessaoProvider } from "@/features/escola/hooks/useSessao";
import { RotaProtegida } from "@/features/escola/components/RotaProtegida";
import EscolaPortaria from "@/features/escola/pages/Portaria.tsx";
import ProfEntrar from "@/features/escola/pages/professor/Entrar.tsx";
import ProfPainel from "@/features/escola/pages/professor/Painel.tsx";
import ProfTurma from "@/features/escola/pages/professor/Turma.tsx";
import ProfChamadaLista from "@/features/escola/pages/professor/ChamadaLista.tsx";
import ProfChamadaDia from "@/features/escola/pages/professor/ChamadaDia.tsx";
import ProfAlunos from "@/features/escola/pages/professor/Alunos.tsx";
import ProfVisaoGeral from "@/features/escola/pages/professor/VisaoGeralTurma.tsx";
import ProfAluno from "@/features/escola/pages/professor/Aluno.tsx";
import GestaoEntrar from "@/features/escola/pages/gestao/Entrar.tsx";
import GestaoPainel from "@/features/escola/pages/gestao/Painel.tsx";
import GestaoChamadas from "@/features/escola/pages/gestao/Chamadas.tsx";
import GestaoTurmas from "@/features/escola/pages/gestao/Turmas.tsx";
import GestaoTurma from "@/features/escola/pages/gestao/Turma.tsx";
import GestaoProfessoras from "@/features/escola/pages/gestao/Professoras.tsx";
import NotFound from "./pages/NotFound.tsx";

// As telas do studio dependem do Supabase já na importação. Carregá-las sob
// demanda mantém o módulo da escola (que usa dados próprios) funcionando mesmo
// sem as variáveis de ambiente do studio configuradas.
const AuthProvider = lazy(() =>
  import("@/hooks/useAuth").then((m) => ({ default: m.AuthProvider })),
);
const ProtectedRoute = lazy(() =>
  import("@/features/auth/components/ProtectedRoute").then((m) => ({ default: m.ProtectedRoute })),
);
const Login = lazy(() => import("@/features/auth/pages/Login.tsx"));
const ForgotPassword = lazy(() => import("@/features/auth/pages/ForgotPassword.tsx"));
const ResetPassword = lazy(() => import("@/features/auth/pages/ResetPassword.tsx"));
const Home = lazy(() => import("@/features/agenda/pages/Home.tsx"));
const Clientes = lazy(() => import("@/features/clientes/pages/Clientes.tsx"));
const Assinaturas = lazy(() => import("@/features/assinaturas/pages/Assinaturas.tsx"));
const Configuracoes = lazy(() => import("@/features/configuracoes/pages/Configuracoes.tsx"));
const Financeiro = lazy(() => import("@/features/financeiro/pages/Financeiro.tsx"));
const Relatorios = lazy(() => import("@/features/relatorios/pages/Relatorios.tsx"));
const ClienteLogin = lazy(() => import("@/features/portal-cliente/pages/ClienteLogin.tsx"));
const ClienteCadastro = lazy(() => import("@/features/portal-cliente/pages/ClienteCadastro.tsx"));
const ClientePainel = lazy(() => import("@/features/portal-cliente/pages/ClientePainel.tsx"));

const queryClient = new QueryClient();

const Carregando = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

/** Rota de layout: provê a sessão do studio para as telas abaixo dela. */
const StudioLayout = () => (
  <Suspense fallback={<Carregando />}>
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  </Suspense>
);

const protegida = (elemento: React.ReactNode) => <RotaProtegida>{elemento}</RotaProtegida>;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Escola infantil — duas áreas separadas, cada uma com o seu login */}
          <Route path="/escola" element={<EscolaPortaria />} />

          <Route
            path="/escola/professor/*"
            element={
              <SessaoProvider papel="professora">
                <Routes>
                  <Route path="entrar" element={<ProfEntrar />} />
                  <Route index element={protegida(<ProfPainel />)} />
                  <Route path="turma/:turmaId" element={protegida(<ProfTurma />)} />
                  <Route path="turma/:turmaId/alunos" element={protegida(<ProfAlunos />)} />
                  <Route path="turma/:turmaId/chamada" element={protegida(<ProfChamadaLista />)} />
                  <Route path="turma/:turmaId/visao-geral" element={protegida(<ProfVisaoGeral />)} />
                  <Route path="turma/:turmaId/chamada/:data" element={protegida(<ProfChamadaDia />)} />
                  <Route path="aluno/:alunoId" element={protegida(<ProfAluno />)} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </SessaoProvider>
            }
          />

          <Route
            path="/escola/gestao/*"
            element={
              <SessaoProvider papel="gestao">
                <Routes>
                  <Route path="entrar" element={<GestaoEntrar />} />
                  <Route index element={protegida(<GestaoPainel />)} />
                  <Route path="chamadas" element={protegida(<GestaoChamadas />)} />
                  <Route path="turmas" element={protegida(<GestaoTurmas />)} />
                  <Route path="turma/:turmaId" element={protegida(<GestaoTurma />)} />
                  <Route path="professoras" element={protegida(<GestaoProfessoras />)} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </SessaoProvider>
            }
          />

          {/* Studio */}
          <Route element={<StudioLayout />}>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Admin routes */}
            <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
            <Route path="/assinaturas" element={<ProtectedRoute><Assinaturas /></ProtectedRoute>} />
            <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
            <Route path="/financeiro" element={<ProtectedRoute><Financeiro /></ProtectedRoute>} />
            <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />

            {/* Client portal routes */}
            <Route path="/cliente/login" element={<ClienteLogin />} />
            <Route path="/cliente/cadastro" element={<ClienteCadastro />} />
            <Route path="/cliente/painel" element={<ClientePainel />} />

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
