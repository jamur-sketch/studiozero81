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
  ChevronLeft,
  Loader2,
  X,
  Repeat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  SERVICES,
  type ServiceName,
  getAvailableTimes,
  createBooking,
  createRecurringBooking,
  RECURRENCE_WEEKS,
  type Booking,
} from "@/lib/bookings";

export default function ClientePainel() {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [client, setClient] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);

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

      const { data: bookingData } = await supabase
        .from("bookings")
        .select("*")
        .eq("client_id", clientData.id)
        .order("start_time", { ascending: false });

      setBookings(bookingData || []);
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-black" />
      </div>
    );
  }

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

        {upcoming.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Próximos agendamentos
            </h2>
            <div className="space-y-3">
              {upcoming.map((b) => (
                <div key={b.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-black/5 flex items-center justify-center shrink-0">
                    <Scissors className="h-5 w-5 text-black" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">{b.service}</p>
                      {b.recurring && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-700 bg-violet-100 border border-violet-200 px-2 py-0.5 rounded-full">
                          <Repeat className="h-3 w-3" /> Horário fixo
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {formatDate(b.start_time)} • {formatTime(b.start_time)} - {formatTime(b.end_time)}
                    </p>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                    Confirmado
                  </Badge>
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
                <div key={b.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 opacity-70">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <Scissors className="h-4 w-4 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-700">{b.service}</p>
                    <p className="text-sm text-gray-400">
                      {formatDate(b.start_time)} • {formatTime(b.start_time)}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-gray-400 border-gray-200">
                    {b.status === "cancelled" ? "Cancelado" : "Concluído"}
                  </Badge>
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
        const { created, skipped } = await createRecurringBooking({
          date,
          time: selectedTime,
          service: service as string,
          clientName,
          clientPhone,
          clientId,
        });
        toast({
          title: "Horário fixo reservado!",
          description:
            `${created} agendamentos criados${skipped > 0 ? ` (${skipped} semana(s) puladas por conflito)` : ""}.`,
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
                  <p className="text-sm text-gray-400">Nenhum horário disponível nesta data.</p>
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
                    Este horário fica fixo para você toda semana
                    {" "}({weekdayLabel}, {selectedTime}) pelas próximas {RECURRENCE_WEEKS} semanas.
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
