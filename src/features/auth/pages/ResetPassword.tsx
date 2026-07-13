import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, Eye, EyeOff } from "lucide-react";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have a recovery session from the URL hash
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get("type");
    if (type !== "recovery" && !window.location.hash.includes("access_token")) {
      // Also check if user already has a session from the recovery link
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          toast({ title: "Link inválido ou expirado", variant: "destructive" });
          navigate("/login", { replace: true });
        }
      });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "A senha deve ter no mínimo 6 caracteres", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "As senhas não coincidem", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      toast({ title: "Senha redefinida com sucesso!" });
      setTimeout(() => navigate("/login", { replace: true }), 2000);
    } catch (err: any) {
      toast({ title: "Erro ao redefinir senha", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full min-h-screen">
      <div className="hidden md:flex flex-1 bg-primary items-center justify-center">
        <img
          alt="ZERO81 Studio"
          className="max-w-[400px] w-full h-auto"
          style={{ animation: "fadeInScale 0.8s ease-out" }}
          src="/lovable-uploads/0bca10b4-c0c2-418f-95ad-41475de12527.png"
        />
      </div>

      <div className="flex-1 flex items-center justify-center p-6 md:p-10 bg-background">
        <div className="w-full max-w-[400px]">
          <div className="flex justify-center mb-8 md:hidden">
            <img
              alt="ZERO81 Studio"
              className="max-w-[200px] bg-primary p-4 rounded-xl"
              src="/lovable-uploads/5d98ac67-06fd-4e43-8f41-d5f6f2eb18b0.png"
            />
          </div>

          <h1 className="text-4xl font-bold text-foreground mb-3 tracking-tight">
            Redefinir senha
          </h1>
          <p className="text-muted-foreground mb-8">
            Escolha uma nova senha para sua conta.
          </p>

          {success ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Senha redefinida!</h2>
              <p className="text-muted-foreground text-sm">Redirecionando para o login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Nova senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="login-input pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirmar nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="login-input pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <button type="submit" disabled={loading} className="login-button mt-2">
                {loading ? "Salvando..." : "Redefinir senha"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
