import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Outlet, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProfessoraProvider } from "@/features/escola/hooks/useProfessora";
import { ProfessoraRoute } from "@/features/escola/components/ProfessoraRoute";
import EscolaEntrar from "@/features/escola/pages/Entrar.tsx";
import EscolaPainel from "@/features/escola/pages/Painel.tsx";
import EscolaTurma from "@/features/escola/pages/Turma.tsx";
import EscolaChamadaLista from "@/features/escola/pages/ChamadaLista.tsx";
import EscolaChamadaDia from "@/features/escola/pages/ChamadaDia.tsx";
import EscolaAlunos from "@/features/escola/pages/Alunos.tsx";
import EscolaVisaoGeral from "@/features/escola/pages/VisaoGeralTurma.tsx";
import EscolaAluno from "@/features/escola/pages/Aluno.tsx";
import EscolaGestao from "@/features/escola/pages/Gestao.tsx";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Escola infantil — diário da professora (dados próprios, sem Supabase) */}
          <Route
            path="/escola/*"
            element={
              <ProfessoraProvider>
                <Routes>
                  <Route index element={<Navigate to="/escola/painel" replace />} />
                  <Route path="entrar" element={<EscolaEntrar />} />
                  <Route path="gestao" element={<EscolaGestao />} />
                  <Route
                    path="painel"
                    element={
                      <ProfessoraRoute>
                        <EscolaPainel />
                      </ProfessoraRoute>
                    }
                  />
                  <Route
                    path="turma/:turmaId"
                    element={
                      <ProfessoraRoute>
                        <EscolaTurma />
                      </ProfessoraRoute>
                    }
                  />
                  <Route
                    path="turma/:turmaId/alunos"
                    element={
                      <ProfessoraRoute>
                        <EscolaAlunos />
                      </ProfessoraRoute>
                    }
                  />
                  <Route
                    path="turma/:turmaId/chamada"
                    element={
                      <ProfessoraRoute>
                        <EscolaChamadaLista />
                      </ProfessoraRoute>
                    }
                  />
                  <Route
                    path="turma/:turmaId/visao-geral"
                    element={
                      <ProfessoraRoute>
                        <EscolaVisaoGeral />
                      </ProfessoraRoute>
                    }
                  />
                  <Route
                    path="turma/:turmaId/chamada/:data"
                    element={
                      <ProfessoraRoute>
                        <EscolaChamadaDia />
                      </ProfessoraRoute>
                    }
                  />
                  <Route
                    path="aluno/:alunoId"
                    element={
                      <ProfessoraRoute>
                        <EscolaAluno />
                      </ProfessoraRoute>
                    }
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </ProfessoraProvider>
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
