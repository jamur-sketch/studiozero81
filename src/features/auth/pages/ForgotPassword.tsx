import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Mail } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({ title: "Informe seu email", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast({ title: "Email enviado!", description: "Verifique sua caixa de entrada." });
    } catch (err: any) {
      toast({ title: "Erro ao enviar email", description: err.message, variant: "destructive" });
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

          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao login
          </Link>

          <h1 className="text-4xl font-bold text-foreground mb-3 tracking-tight">
            Esqueceu a senha?
          </h1>
          <p className="text-muted-foreground mb-8">
            Informe seu email e enviaremos um link para redefinir sua senha.
          </p>

          {sent ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Email enviado!</h2>
              <p className="text-muted-foreground text-sm">
                Enviamos um link de redefinição para <strong className="text-foreground">{email}</strong>.
                Verifique sua caixa de entrada e spam.
              </p>
              <Link to="/login" className="login-button mt-4 text-center no-underline inline-block">
                Voltar ao login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <input
                type="email"
                placeholder="Seu email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="login-input"
              />
              <button type="submit" disabled={loading} className="login-button mt-2">
                {loading ? "Enviando..." : "Enviar link de redefinição"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
