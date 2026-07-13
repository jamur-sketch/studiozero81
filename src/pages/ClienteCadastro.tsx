import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, Shield, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function ClienteCadastro() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [lgpdConsent, setLgpdConsent] = useState(false);
  const [lgpdExpanded, setLgpdExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    if (!lgpdConsent) {
      toast({ title: "Aceite os termos de proteção de dados para continuar", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "As senhas não coincidem", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "A senha deve ter pelo menos 6 caracteres", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        await supabase.from("clients").insert({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          user_id: authData.user.id,
          lgpd_consent: true,
          lgpd_consent_at: new Date().toISOString(),
        });
      }

      toast({ title: "Conta criada com sucesso!", description: "Faça login para acessar." });
      navigate("/cliente/login");
    } catch (err: any) {
      if (err.message?.includes("already registered")) {
        toast({ title: "Este email já está cadastrado", description: "Tente fazer login.", variant: "destructive" });
      } else {
        toast({ title: "Erro ao criar conta", description: err.message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

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

      <div className="flex-1 flex items-center justify-center p-6 md:p-10 bg-white overflow-y-auto">
        <div className="w-full max-w-[380px] py-4">
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
              Criar Conta
            </h1>
            <p className="mt-2 text-sm" style={{ color: "#888888" }}>
              Cadastre-se para agendar seus horários
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: "#999999" }}>
                Nome completo *
              </label>
              <input
                type="text"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl text-[15px] transition-all duration-200 outline-none"
                style={{ border: "1px solid #e0e0e0", backgroundColor: "#ffffff", color: "#000000" }}
                onFocus={(e) => { e.target.style.borderColor = "#000000"; e.target.style.boxShadow = "0 0 0 3px rgba(0,0,0,0.05)"; }}
                onBlur={(e) => { e.target.style.borderColor = "#e0e0e0"; e.target.style.boxShadow = "none"; }}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: "#999999" }}>
                WhatsApp *
              </label>
              <input
                type="tel"
                placeholder="(81) 99999-9999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl text-[15px] transition-all duration-200 outline-none"
                style={{ border: "1px solid #e0e0e0", backgroundColor: "#ffffff", color: "#000000" }}
                onFocus={(e) => { e.target.style.borderColor = "#000000"; e.target.style.boxShadow = "0 0 0 3px rgba(0,0,0,0.05)"; }}
                onBlur={(e) => { e.target.style.borderColor = "#e0e0e0"; e.target.style.boxShadow = "none"; }}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: "#999999" }}>
                Email *
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
                Senha *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
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
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider mb-2 block" style={{ color: "#999999" }}>
                Confirmar senha *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Repita a senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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

            {/* Consentimento LGPD */}
            <div className="rounded-xl border mt-2" style={{ borderColor: lgpdConsent ? "#000000" : "#e0e0e0" }}>
              <button
                type="button"
                onClick={() => setLgpdExpanded((v) => !v)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors"
                style={{ borderRadius: "0.75rem" }}
              >
                <Shield className="h-4 w-4 shrink-0" style={{ color: "#000000" }} />
                <span className="text-sm font-medium flex-1" style={{ color: "#000000" }}>
                  Proteção de dados (LGPD)
                </span>
                {lgpdExpanded
                  ? <ChevronUp className="h-4 w-4 shrink-0" style={{ color: "#888888" }} />
                  : <ChevronDown className="h-4 w-4 shrink-0" style={{ color: "#888888" }} />
                }
              </button>

              {lgpdExpanded && (
                <div className="px-4 pb-4 text-xs leading-relaxed" style={{ color: "#555555" }}>
                  <p className="mb-2">
                    Em conformidade com a <strong>Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD)</strong>,
                    informamos que o <strong>Studio Zero81</strong> coleta e trata os seguintes dados pessoais:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 mb-3">
                    <li><strong>Nome completo</strong> — identificação do cliente</li>
                    <li><strong>Número de WhatsApp</strong> — contato e confirmação de agendamentos</li>
                    <li><strong>E-mail</strong> — acesso à conta e comunicações</li>
                  </ul>
                  <p className="mb-2">
                    Seus dados são utilizados exclusivamente para <strong>gestão de agendamentos e relacionamento com o cliente</strong>.
                    Não compartilhamos suas informações com terceiros.
                  </p>
                  <p className="mb-2">
                    Você pode solicitar a exclusão dos seus dados a qualquer momento pelo WhatsApp da barbearia.
                    O responsável pelo tratamento dos dados é o <strong>Studio Zero81</strong>.
                  </p>
                  <p>
                    Base legal: <em>execução de contrato</em> (art. 7º, V, LGPD) e <em>legítimo interesse</em> (art. 7º, IX, LGPD).
                  </p>
                </div>
              )}

              <label className="flex items-start gap-3 px-4 pb-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lgpdConsent}
                  onChange={(e) => setLgpdConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-black cursor-pointer"
                />
                <span className="text-xs leading-relaxed" style={{ color: "#555555" }}>
                  Li e concordo com o tratamento dos meus dados pessoais pelo Studio Zero81 conforme descrito acima,
                  em conformidade com a LGPD.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !lgpdConsent}
              className="w-full py-3.5 border-none rounded-xl text-[15px] font-semibold cursor-pointer transition-all duration-200 tracking-wide flex items-center justify-center gap-2 mt-3 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
              style={{ backgroundColor: "#000000", color: "#ffffff", boxShadow: "0 4px 14px rgba(0,0,0,0.15)" }}
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Criando conta...</> : "Criar conta"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm" style={{ color: "#888888" }}>
              Já tem conta?{" "}
              <Link to="/cliente/login" className="font-semibold hover:opacity-70 transition-opacity no-underline" style={{ color: "#000000" }}>
                Fazer login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
