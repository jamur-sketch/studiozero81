import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";
import Login from "@/features/auth/pages/Login.tsx";
import ForgotPassword from "@/features/auth/pages/ForgotPassword.tsx";
import ResetPassword from "@/features/auth/pages/ResetPassword.tsx";
import Home from "@/features/agenda/pages/Home.tsx";
import Clientes from "@/features/clientes/pages/Clientes.tsx";
import Assinaturas from "@/features/assinaturas/pages/Assinaturas.tsx";
import Configuracoes from "@/features/configuracoes/pages/Configuracoes.tsx";
import Financeiro from "@/features/financeiro/pages/Financeiro.tsx";
import Relatorios from "@/features/relatorios/pages/Relatorios.tsx";
import ClienteLogin from "@/features/portal-cliente/pages/ClienteLogin.tsx";
import ClienteCadastro from "@/features/portal-cliente/pages/ClienteCadastro.tsx";
import ClientePainel from "@/features/portal-cliente/pages/ClientePainel.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
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
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
