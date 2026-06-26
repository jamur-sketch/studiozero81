import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function ClienteLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
        if (data) {
          navigate("/home", { replace: true });
        } else {
          navigate("/cliente/painel", { replace: true });
        }
      });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate("/cliente/painel");
    } catch (err: any) {
      toast({ title: "Erro no login", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="flex w-full min-h-screen">
      <div className="hidden md:flex flex-1 items-center justify-center relative overflow-hidden" style={{ backgroundColor: "#000000" }}>
        <div className="relative z-10 text-center px-10">
          <img
            alt="ZERO81 Studio"
            className="max-w-[480px] w-full h-auto"
            style={{ animation: "fadeInScale 0.8s ease-out" }}
            src="/lovable-uploads/0bca10b4-c0c2-418f-95ad-41475de12527.png"
          />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 md:p-10 bg-white">
        <div className="w-full max-w-[380px]">
          <div className="flex justify-center mb-10 md:hidden">
            <div className="p-6 rounded-2xl" style={{ backgroundColor: "#000000" }}>
              <img
                alt="ZERO81 Studio"
                className="max-w-[180px]"
                src="/lovable-uploads/0bca10b4-c0c2-418f-95ad-41475de12527.png"
              />
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: "#000000" }}>
              Área do Cliente
            </h1>
            <p className="mt-2 text-sm" style={{ color: "#888888" }}>
              Acesse sua conta para ver seus agendamentos
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: "#999999" }}>
                Email
              </label>
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl text-[15px] transition-all duration-200 outline-none"
                style={{ border: "1px solid #e0e0e0", backgroundColor: "#ffffff", color: "#000000" }}
                onFocus={(e) => { e.target.style.borderColor = "#000000"; e.target.style.boxShadow = "0 0 0 3px rgba(0,0,0,0.05)"; }}
                onBlur={(e) => { e.target.style.borderColor = "#e0e0e0"; e.target.style.boxShadow = "none"; }}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: "#999999" }}>
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 pr-12 rounded-xl text-[15px] transition-all duration-200 outline-none"
                  style={{ border: "1px solid #e0e0e0", backgroundColor: "#ffffff", color: "#000000" }}
                  onFocus={(e) => { e.target.style.borderColor = "#000000"; e.target.style.boxShadow = "0 0 0 3px rgba(0,0,0,0.05)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "#e0e0e0"; e.target.style.boxShadow = "none"; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 border-none rounded-xl text-[15px] font-semibold cursor-pointer transition-all duration-200 tracking-wide flex items-center justify-center gap-2 mt-3 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
              style={{ backgroundColor: "#000000", color: "#ffffff", boxShadow: "0 4px 14px rgba(0,0,0,0.15)" }}
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Entrando...</> : "Entrar"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm" style={{ color: "#888888" }}>
              Não tem conta?{" "}
              <Link to="/cliente/cadastro" className="font-semibold hover:opacity-70 transition-opacity no-underline" style={{ color: "#000000" }}>
                Criar conta
              </Link>
            </p>
          </div>

          <div className="mt-8 pt-6 border-t text-center" style={{ borderColor: "#eee" }}>
            <Link to="/login" className="text-xs hover:opacity-70 transition-opacity no-underline" style={{ color: "#aaa" }}>
              Acesso administrativo
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
