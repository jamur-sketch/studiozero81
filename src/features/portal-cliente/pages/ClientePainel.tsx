import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  CalendarDays,
  Clock,
  LogOut,
  Plus,
  Scissors,
  User,
  Shield,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Loader2,
  X,
  Repeat,
  CreditCard,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  SERVICES,
  type ServiceName,
  getAvailableTimes,
  createBooking,
  createRecurringBooking,
  ensureRecurringBookings,
  type Booking,
} from "@/features/agenda/api";

interface Plan {
  id: string;
  name: string;
  badge: string;
  price: number;
  cuts_per_month: number;
  beards_per_month: number;
  discount_percent: number;
  is_featured: boolean;
}

interface Subscription {
  id: string;
  plan_id: string;
  status: string;
  next_billing_date: string;
  payment_method: string;
}

export default function ClientePainel() {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [client, setClient] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [subscribePlan, setSubscribePlan] = useState<Plan | null>(null);
  const [lgpdOpen, setLgpdOpen] = useState(false);
  const [lgpdExpanded, setLgpdExpanded] = useState(false);
  const [lgpdSaving, setLgpdSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/cliente/login", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: clientData } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (clientData) {
      setClient(clientData);
      if (!clientData.lgpd_consent) setLgpdOpen(true);

      // Renova os horários fixos do cliente (gera as próximas semanas que faltarem).
      try {
        await ensureRecurringBookings({ clientId: clientData.id });
      } catch (err) {
        console.error("Erro ao renovar horários fixos:", err);
      }

      const [bookingRes, plansRes, subRes] = await Promise.all([
        supabase
          .from("bookings")
          .select("*")
          .eq("client_id", clientData.id)
          .order("start_time", { ascending: false }),
        supabase.from("subscription_plans").select("*").order("price"),
        supabase
          .from("subscriptions")
          .select("*")
          .eq("client_id", clientData.id)
          .neq("status", "cancelled")
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

      setBookings(bookingRes.data || []);
      setPlans(plansRes.data || []);
      setSubscription(subRes.data?.[0] || null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogout = async () => {
    await signOut();
    navigate("/cliente/login");
  };

  const handleLgpdAccept = async () => {
    if (!client) return;
    setLgpdSaving(true);
    try {
      await supabase.from("clients").update({
        lgpd_consent: true,
        lgpd_consent_at: new Date().toISOString(),
      }).eq("id", client.id);
      setClient((c: any) => ({ ...c, lgpd_consent: true }));
      setLgpdOpen(false);
      toast({ title: "Consentimento registrado. Obrigado!" });
    } catch {
      toast({ title: "Erro ao registrar consentimento", variant: "destructive" });
    } finally {
      setLgpdSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-black" />
      </div>
    );
  }

  const mustChangePassword = !!(user?.user_metadata as any)?.must_change_password;

  const upcoming = bookings.filter((b) => new Date(b.start_time) >= new Date() && b.status === "confirmed");
  const past = bookings.filter((b) => new Date(b.start_time) < new Date() || b.status !== "confirmed");

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-black text-white px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Scissors className="h-5 w-5" />
            <span className="font-bold text-lg tracking-tight">ZERO81 Studio</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-white/60 hidden sm:inline">
              {client?.name || user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="text-white/50 hover:text-white transition-colors p-1.5"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Olá, {client?.name?.split(" ")[0] || "Cliente"}!
            </h1>
            <p className="text-sm text-gray-500 mt-1">Gerencie seus agendamentos</p>
          </div>
          <Button
            onClick={() => setBookingOpen(true)}
            className="gap-2 bg-black hover:bg-gray-800 text-white rounded-xl"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo Agendamento</span>
            <span className="sm:hidden">Agendar</span>
          </Button>
        </div>

        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Minha assinatura
          </h2>
          {subscription ? (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-black/5 flex items-center justify-center shrink-0 mt-0.5">
                  <CreditCard className="h-5 w-5 text-black" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900">
                      {plans.find((p) => p.id === subscription.plan_id)?.name || "Plano"}
                    </p>
                    {subscription.status === "pending" ? (
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200">Pendente</Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Ativo</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {subscription.status === "pending"
                      ? "Aguardando confirmação do pagamento pelo studio"
                      : `Próxima cobrança: ${new Date(subscription.next_billing_date + "T12:00:00").toLocaleDateString("pt-BR")}`}
                  </p>
                </div>
              </div>
            </div>
          ) : plans.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`bg-white rounded-xl p-5 shadow-sm flex flex-col ${
                    plan.is_featured ? "border-2 border-black" : "border border-gray-100"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-900">{plan.name}</h3>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {plan.badge}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-2xl font-bold text-gray-900">R$ {plan.price}</span>
                    <span className="text-xs text-gray-400">/mês</span>
                  </div>
                  <div className="flex-1 space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" /> {plan.cuts_per_month} cortes/mês
                    </div>
                    {plan.beards_per_month > 0 && (
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Check className="h-4 w-4 text-emerald-600 shrink-0" /> {plan.beards_per_month} barba/mês
                      </div>
                    )}
                    {plan.discount_percent > 0 && (
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Check className="h-4 w-4 text-emerald-600 shrink-0" /> {plan.discount_percent}% de desconto
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={() => setSubscribePlan(plan)}
                    className="w-full rounded-xl bg-black hover:bg-gray-800 text-white"
                  >
                    Assinar
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        {upcoming.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Próximos agendamentos
            </h2>
            <div className="space-y-3">
              {upcoming.map((b) => (
                <div key={b.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-black/5 flex items-center justify-center shrink-0 mt-0.5">
                      <Scissors className="h-5 w-5 text-black" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900">{b.service}</p>
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                          Confirmado
                        </Badge>
                        {b.recurring && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-700 bg-violet-100 border border-violet-200 px-2 py-0.5 rounded-full">
                            <Repeat className="h-3 w-3" /> Fixo
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {formatDate(b.start_time)} • {formatTime(b.start_time)} - {formatTime(b.end_time)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {upcoming.length === 0 && !loading && (
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
            <CalendarDays className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhum agendamento futuro</p>
            <p className="text-sm text-gray-400 mt-1">Clique em "Novo Agendamento" para marcar um horário</p>
          </div>
        )}

        {past.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Histórico
            </h2>
            <div className="space-y-2">
              {past.slice(0, 10).map((b) => (
                <div key={b.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 opacity-70">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Scissors className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-700">{b.service}</p>
                        <Badge variant="outline" className="text-gray-400 border-gray-200">
                          {b.status === "cancelled" ? "Cancelado" : "Concluído"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400 mt-0.5">
                        {formatDate(b.start_time)} • {formatTime(b.start_time)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {bookingOpen && client && (
        <ClientBookingDialog
          clientId={client.id}
          clientName={client.name}
          clientPhone={client.phone}
          onClose={() => setBookingOpen(false)}
          onSuccess={() => {
            setBookingOpen(false);
            fetchData();
          }}
        />
      )}

      {subscribePlan && client && (
        <SubscribeDialog
          plan={subscribePlan}
          clientId={client.id}
          onClose={() => setSubscribePlan(null)}
          onSuccess={() => {
            setSubscribePlan(null);
            fetchData();
          }}
        />
      )}

      {mustChangePassword && <ForcePasswordChangeDialog />}
      {/* Modal LGPD para usuários existentes sem consentimento */}
      {lgpdOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" style={{ animation: "fadeInScale 0.25s ease-out" }}>
            <div className="px-6 pt-6 pb-4 flex items-center gap-3 border-b border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center shrink-0">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-black">Proteção de Dados (LGPD)</h2>
                <p className="text-xs text-gray-500">Precisamos do seu consentimento para continuar</p>
              </div>
            </div>

            <div className="px-6 py-4 space-y-3">
              <p className="text-sm text-gray-700">
                Em conformidade com a <strong>Lei Geral de Proteção de Dados (Lei nº 13.709/2018)</strong>,
                o <strong>Studio Zero81</strong> trata seus dados pessoais para gestão de agendamentos.
              </p>

              <button
                type="button"
                onClick={() => setLgpdExpanded((v) => !v)}
                className="flex items-center gap-2 text-xs font-medium text-black hover:opacity-70 transition-opacity"
              >
                {lgpdExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {lgpdExpanded ? "Recolher detalhes" : "Ver detalhes completos"}
              </button>

              {lgpdExpanded && (
                <div className="text-xs text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-4 space-y-2">
                  <p><strong>Dados coletados:</strong> nome completo, WhatsApp e e-mail.</p>
                  <p><strong>Finalidade:</strong> gerenciamento de agendamentos e relacionamento com o cliente.</p>
                  <p><strong>Compartilhamento:</strong> seus dados não são compartilhados com terceiros.</p>
                  <p><strong>Seus direitos:</strong> você pode solicitar a exclusão dos seus dados a qualquer momento pelo WhatsApp da barbearia.</p>
                  <p><strong>Base legal:</strong> execução de contrato (art. 7º, V) e legítimo interesse (art. 7º, IX) da LGPD.</p>
                </div>
              )}
            </div>

            <div className="px-6 pb-6">
              <button
                onClick={handleLgpdAccept}
                disabled={lgpdSaving}
                className="w-full py-3.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "#000000" }}
              >
                {lgpdSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                {lgpdSaving ? "Registrando..." : "Entendi e concordo"}
              </button>
              <p className="text-xs text-gray-400 text-center mt-3">
                Ao continuar usando o aplicativo você está ciente desta política.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ForcePasswordChangeDialog() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (password.length < 6) {
      toast({ title: "A senha deve ter no mínimo 6 caracteres", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "As senhas não coincidem", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password,
        data: { must_change_password: false },
      });
      if (error) throw error;
      toast({ title: "Senha atualizada!", description: "Pronto, sua nova senha já está valendo." });
      // Recarrega para atualizar a sessão com a flag limpa.
      window.location.reload();
    } catch (err: any) {
      toast({ title: "Erro ao atualizar senha", description: err.message, variant: "destructive" });
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" style={{ animation: "fadeInScale 0.2s ease-out" }}>
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Crie uma nova senha</h2>
          <p className="text-sm text-gray-500 mt-1">
            Você entrou com uma senha temporária. Defina uma nova senha para continuar.
          </p>
        </div>
        <div className="p-6 space-y-3">
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              placeholder="Nova senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-medium"
            >
              {show ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          <input
            type={show ? "text" : "password"}
            placeholder="Confirmar nova senha"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black"
          />
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-3.5 rounded-xl text-[15px] font-semibold bg-black text-white flex items-center justify-center gap-2 disabled:opacity-50 mt-1"
          >
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</> : "Salvar nova senha"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SubscribeDialog({
  plan,
  clientId,
  onClose,
  onSuccess,
}: {
  plan: Plan;
  clientId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const startDate = new Date();
      const nextBilling = new Date(startDate);
      nextBilling.setMonth(nextBilling.getMonth() + 1);

      const { error } = await supabase.from("subscriptions").insert({
        client_id: clientId,
        plan_id: plan.id,
        start_date: startDate.toISOString().split("T")[0],
        next_billing_date: nextBilling.toISOString().split("T")[0],
        payment_method: paymentMethod,
        status: "pending",
      });

      if (error) throw new Error(error.message);

      toast({
        title: "Assinatura solicitada!",
        description: "Assim que o studio confirmar o pagamento, sua assinatura fica ativa.",
      });
      onSuccess();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const paymentOptions = [
    { value: "pix", label: "PIX" },
    { value: "credit", label: "Cartão de Crédito" },
    { value: "debit", label: "Cartão de Débito" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4" style={{ animation: "fadeInScale 0.2s ease-out" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-black/5 flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-black" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Assinar {plan.name}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-gray-50 rounded-xl p-4 mb-5">
            <div className="flex items-baseline justify-between mb-3">
              <span className="font-semibold text-gray-900">{plan.name}</span>
              <span className="text-lg font-bold text-gray-900">R$ {plan.price}<span className="text-xs font-normal text-gray-400">/mês</span></span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> {plan.cuts_per_month} cortes/mês
              </div>
              {plan.beards_per_month > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> {plan.beards_per_month} barba/mês
                </div>
              )}
              {plan.discount_percent > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> {plan.discount_percent}% de desconto
                </div>
              )}
            </div>
          </div>

          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
            Forma de pagamento
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-5">
            {paymentOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPaymentMethod(opt.value)}
                className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-all ${
                  paymentMethod === opt.value
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <p className="text-xs text-gray-400 mb-5">
            O pagamento é combinado diretamente com o studio. Sua assinatura fica pendente até a confirmação.
          </p>

          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 h-auto rounded-xl font-semibold bg-black hover:bg-gray-800 text-white transition-all hover:-translate-y-0.5 disabled:opacity-50"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Solicitando...</>
            ) : (
              "Confirmar assinatura"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ClientBookingDialog({
  clientId,
  clientName,
  clientPhone,
  onClose,
  onSuccess,
}: {
  clientId: string;
  clientName: string;
  clientPhone: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<"service" | "time" | "confirm">("service");
  const [service, setService] = useState<ServiceName | "">("");
  const [availableSlots, setAvailableSlots] = useState<{ start: string; end: string }[]>([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);

  const handleSelectService = async (svc: ServiceName) => {
    setService(svc);
    setLoadingSlots(true);
    try {
      const slots = await getAvailableTimes(date, svc);
      setAvailableSlots(slots);
      setStep("time");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSelectTime = (time: string) => {
    setSelectedTime(time);
    setStep("confirm");
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (recurring) {
        await createRecurringBooking({
          date,
          time: selectedTime,
          service: service as string,
          clientName,
          clientPhone,
          clientId,
        });
        toast({
          title: "Horário fixo reservado!",
          description: "Este horário agora fica sempre reservado para você toda semana.",
        });
      } else {
        await createBooking({
          date,
          time: selectedTime,
          service: service as string,
          clientName,
          clientPhone,
          clientId,
        });
        toast({ title: "Agendamento criado com sucesso!" });
      }
      onSuccess();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (isoString: string) =>
    new Date(isoString).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

  const svcInfo = SERVICES.find((s) => s.name === service);
  const weekdayLabel = new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long" });
  const selectedWeekday = new Date(date + "T12:00:00").getDay();
  const isWeekend = selectedWeekday === 0 || selectedWeekday === 6;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-hidden" style={{ animation: "fadeInScale 0.2s ease-out" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-black/5 flex items-center justify-center">
              <Scissors className="h-4 w-4 text-black" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Novo Agendamento</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <div className="mb-5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
              Data do agendamento
            </label>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={date}
                min={today}
                onChange={(e) => {
                  setDate(e.target.value);
                  if (service) {
                    setStep("service");
                    setService("");
                    setAvailableSlots([]);
                  }
                }}
                className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all text-sm"
              />
            </div>
          </div>

          {step === "service" && (
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 block">
                Escolha o serviço
              </label>
              <div className="grid grid-cols-1 gap-2">
                {SERVICES.map((svc) => (
                  <button
                    key={svc.name}
                    onClick={() => handleSelectService(svc.name as ServiceName)}
                    disabled={loadingSlots}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-black/20 transition-all text-left disabled:opacity-50"
                  >
                    <div>
                      <span className="font-semibold text-gray-900 text-sm">{svc.name}</span>
                      <span className="block text-xs text-gray-400 mt-0.5">
                        R$ {svc.price.toFixed(2)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-full">
                      <Clock className="h-3 w-3" />
                      {svc.duration} min
                    </span>
                  </button>
                ))}
              </div>
              {loadingSlots && (
                <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Buscando horários...
                </div>
              )}
            </div>
          )}

          {step === "time" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Horários disponíveis
                </label>
                <button
                  onClick={() => { setStep("service"); setService(""); }}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-900 transition-colors"
                >
                  <ChevronLeft className="h-3 w-3" /> Voltar
                </button>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs text-gray-500 mb-4 bg-gray-100 px-3 py-1.5 rounded-full">
                <Scissors className="h-3 w-3" />
                {service} - {svcInfo?.duration} min - R$ {svcInfo?.price.toFixed(2)}
              </div>
              {availableSlots.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarDays className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">
                    {isWeekend
                      ? "Não atendemos aos fins de semana. Escolha um dia de segunda a sexta."
                      : "Nenhum horário disponível nesta data."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-[280px] overflow-y-auto pr-1">
                  {availableSlots.map((slot) => {
                    const timeStr = formatTime(slot.start);
                    const timeValue = new Date(slot.start).toLocaleTimeString("en-GB", {
                      hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
                    });
                    return (
                      <button
                        key={slot.start}
                        onClick={() => handleSelectTime(timeValue)}
                        className="py-2.5 px-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 hover:bg-black hover:text-white hover:border-black transition-all"
                      >
                        {timeStr}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {step === "confirm" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Confirmação
                </label>
                <button
                  onClick={() => setStep("time")}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-900 transition-colors"
                >
                  <ChevronLeft className="h-3 w-3" /> Voltar
                </button>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-3 mb-5">
                <div className="flex items-center gap-3">
                  <Scissors className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{service}</p>
                    <p className="text-xs text-gray-400">{svcInfo?.duration} min • R$ {svcInfo?.price.toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-4 w-4 text-gray-400" />
                  <p className="text-sm text-gray-700">
                    {new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <p className="text-sm text-gray-700">{selectedTime}</p>
                </div>
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-gray-400" />
                  <p className="text-sm text-gray-700">{clientName}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setRecurring((v) => !v)}
                className={`w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-all mb-5 ${
                  recurring
                    ? "border-violet-300 bg-violet-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div
                  className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                    recurring ? "bg-violet-600 border-violet-600" : "border-gray-300"
                  }`}
                >
                  {recurring && <Repeat className="h-3 w-3 text-white" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Reservar sempre este horário</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {weekdayLabel} às {selectedTime} fica fixo para você toda semana,
                    {" "}renovado automaticamente.
                  </p>
                </div>
              </button>

              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-3 h-auto rounded-xl font-semibold bg-black hover:bg-gray-800 text-white transition-all hover:-translate-y-0.5 disabled:opacity-50"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Agendando...</>
                ) : recurring ? (
                  "Reservar horário fixo"
                ) : (
                  "Confirmar Agendamento"
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
