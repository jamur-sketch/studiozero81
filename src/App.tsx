import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import Home from "./pages/Home.tsx";
import Clientes from "./pages/Clientes.tsx";
import Assinaturas from "./pages/Assinaturas.tsx";
import Configuracoes from "./pages/Configuracoes.tsx";
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
            <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
            <Route path="/assinaturas" element={<ProtectedRoute><Assinaturas /></ProtectedRoute>} />
            <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
