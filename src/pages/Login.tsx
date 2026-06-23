import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Scissors, Loader2 } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, signIn, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/home", { replace: true });
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
      await signIn(email, password);
      navigate("/home");
    } catch (err: any) {
      toast({ title: "Erro no login", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="flex w-full min-h-screen">
      <div className="hidden md:flex flex-1 bg-gradient-to-br from-primary via-primary to-primary/90 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.05),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.03),transparent_50%)]" />
        <div className="relative z-10 text-center">
          <img
            alt="ZERO81 Studio"
            className="max-w-[350px] w-full h-auto drop-shadow-2xl"
            style={{ animation: "fadeInScale 0.8s ease-out" }}
            src="/lovable-uploads/0bca10b4-c0c2-418f-95ad-41475de12527.png"
          />
          <p className="text-white/40 text-sm mt-6 tracking-[0.3em] uppercase font-light">
            Sistema de Gestão
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 md:p-10 bg-background">
        <div className="w-full max-w-[380px]">
          <div className="flex justify-center mb-8 md:hidden">
            <div className="bg-primary p-5 rounded-2xl shadow-lg">
              <img
                alt="ZERO81 Studio"
                className="max-w-[160px]"
                src="/lovable-uploads/5d98ac67-06fd-4e43-8f41-d5f6f2eb18b0.png"
              />
            </div>
          </div>

          <div className="mb-8">
            <div className="hidden md:flex items-center gap-2 mb-6">
              <Scissors className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground tracking-wider uppercase">
                ZERO81 Studio
              </span>
            </div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Bem-vindo de volta
            </h1>
            <p className="text-muted-foreground mt-1.5 text-sm">
              Entre com suas credenciais para acessar o sistema
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                Email
              </label>
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="login-input"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                Senha
              </label>
              <input
                type="password"
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input"
              />
            </div>

            <div className="flex justify-between items-center text-sm mt-1">
              <label className="flex items-center gap-2.5 cursor-pointer text-muted-foreground select-none text-[13px]">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 cursor-pointer accent-primary rounded"
                />
                Lembrar-me
              </label>
              <Link to="/forgot-password" className="text-muted-foreground font-medium transition-colors hover:text-foreground no-underline text-[13px]">
                Esqueceu a senha?
              </Link>
            </div>

            <button type="submit" disabled={loading} className="login-button mt-3 flex items-center justify-center gap-2">
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Entrando...</>
              ) : (
                "Entrar"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
