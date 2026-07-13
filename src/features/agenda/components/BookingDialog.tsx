import { useState, useEffect } from "react";
import { X, Clock, User, Phone, Mail, Search, UserPlus, Check, ChevronLeft, Loader2, CalendarDays, Scissors, AlertCircle } from "lucide-react";
import { SERVICES, type ServiceName, getAvailableTimes, createBooking } from "@/features/agenda/api";
import { getOwingBookings } from "@/features/financeiro/api";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface ClientOption {
  id: string;
  name: string;
  phone: string | null;
}

interface BookingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedDate?: string;
}

export function BookingDialog({ isOpen, onClose, onSuccess, selectedDate }: BookingDialogProps) {
  const [step, setStep] = useState<"service" | "time" | "info">("service");
  const [service, setService] = useState<ServiceName | "">("");
  const [availableSlots, setAvailableSlots] = useState<{ start: string; end: string }[]>([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Seleção / cadastro de cliente
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(selectedDate || today);

  const [owingIds, setOwingIds] = useState<Set<string>>(new Set());
  const [owingNames, setOwingNames] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) return;
    supabase
      .from("clients")
      .select("id, name, phone")
      .order("name")
      .then(({ data }) => setClients(data || []));
    getOwingBookings().then((rows) => {
      setOwingIds(new Set(rows.filter((r) => r.client_id).map((r) => r.client_id as string)));
      setOwingNames(new Set(rows.map((r) => r.client_name.trim().toLowerCase())));
    });
  }, [isOpen]);

  const clientOwes = (c: ClientOption) =>
    owingIds.has(c.id) || owingNames.has(c.name.trim().toLowerCase());

  const selectedClient = clients.find((c) => c.id === selectedClientId) || null;
  const filteredClients = clients.filter((c) => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || (c.phone || "").toLowerCase().includes(q);
  });

  const handleSelectService = async (svc: ServiceName) => {
    setService(svc);
    setLoadingSlots(true);
    try {
      const slots = await getAvailableTimes(date, svc, { unrestricted: true });
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
    setStep("info");
  };

  const handleSubmit = async () => {
    if (creatingNew && !newName.trim()) {
      toast({ title: "Informe o nome do cliente", variant: "destructive" });
      return;
    }
    if (!creatingNew && !selectedClientId) {
      toast({ title: "Selecione um cliente ou cadastre um novo", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      let clientId = selectedClientId;
      let name = selectedClient?.name || "";
      let phone = selectedClient?.phone || "";

      if (creatingNew) {
        const { data, error } = await supabase
          .from("clients")
          .insert({
            name: newName.trim(),
            phone: newPhone.trim() || null,
            email: newEmail.trim() || null,
          })
          .select("id, name, phone")
          .single();
        if (error) throw new Error(error.message);
        clientId = data.id;
        name = data.name;
        phone = data.phone || "";
      }

      await createBooking({
        date,
        time: selectedTime,
        service: service as string,
        clientName: name,
        clientPhone: phone,
        clientId: clientId || undefined,
      });
      toast({ title: "Agendamento criado com sucesso!" });
      resetAndClose();
      onSuccess();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setStep("service");
    setService("");
    setSelectedTime("");
    setClientSearch("");
    setSelectedClientId(null);
    setCreatingNew(false);
    setNewName("");
    setNewPhone("");
    setNewEmail("");
    setAvailableSlots([]);
    onClose();
  };

  if (!isOpen) return null;

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    });
  };

  const svcInfo = SERVICES.find((s) => s.name === service);

  const stepIndicator = (
    <div className="flex items-center gap-2 px-6 py-3 bg-secondary/50 border-b border-border/50">
      {["Serviço", "Horário", "Dados"].map((label, i) => {
        const stepIndex = ["service", "time", "info"].indexOf(step);
        const isActive = i === stepIndex;
        const isDone = i < stepIndex;
        return (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && <div className={`w-6 h-px ${isDone ? "bg-primary" : "bg-border"}`} />}
            <div className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
              isActive ? "text-foreground" : isDone ? "text-primary" : "text-muted-foreground/50"
            }`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                isActive ? "bg-primary text-primary-foreground" : isDone ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground/40"
              }`}>
                {i + 1}
              </div>
              {label}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-hidden" style={{ animation: "fadeInScale 0.2s ease-out" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/5 flex items-center justify-center">
              <Scissors className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground tracking-tight">Novo Agendamento</h2>
          </div>
          <button onClick={resetAndClose} className="p-2 hover:bg-accent rounded-lg transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {stepIndicator}

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="mb-5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Data do agendamento
            </label>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                className="w-full pl-10 pr-3 py-2.5 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all text-sm"
              />
            </div>
          </div>

          {step === "service" && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">
                Escolha o serviço
              </label>
              <div className="grid grid-cols-1 gap-2">
                {SERVICES.map((svc) => (
                  <button
                    key={svc.name}
                    onClick={() => handleSelectService(svc.name as ServiceName)}
                    disabled={loadingSlots}
                    className="flex items-center justify-between p-4 border border-border/60 rounded-xl hover:bg-accent hover:border-primary/20 transition-all text-left group disabled:opacity-50"
                  >
                    <div>
                      <span className="font-semibold text-foreground text-sm">{svc.name}</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">R$ {svc.price.toFixed(2)}</span>
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5 bg-secondary px-2.5 py-1 rounded-full group-hover:bg-primary/5">
                      <Clock className="h-3 w-3" />
                      {svc.duration} min
                    </span>
                  </button>
                ))}
              </div>
              {loadingSlots && (
                <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Buscando horários...
                </div>
              )}
            </div>
          )}

          {step === "time" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Horários disponíveis
                </label>
                <button
                  onClick={() => { setStep("service"); setService(""); }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="h-3 w-3" /> Voltar
                </button>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mb-4 bg-secondary px-3 py-1.5 rounded-full">
                <Scissors className="h-3 w-3" />
                {service} - {svcInfo?.duration} min - R$ {svcInfo?.price.toFixed(2)}
              </div>
              {availableSlots.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarDays className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum horário disponível nesta data.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-[280px] overflow-y-auto pr-1">
                  {availableSlots.map((slot) => {
                    const timeStr = formatTime(slot.start);
                    const timeValue = new Date(slot.start).toLocaleTimeString("en-GB", {
                      hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo"
                    });
                    return (
                      <button
                        key={slot.start}
                        onClick={() => handleSelectTime(timeValue)}
                        className="py-2.5 px-2 border border-border/60 rounded-xl text-sm font-medium text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all hover:-translate-y-0.5"
                      >
                        {timeStr}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {step === "info" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Dados do cliente
                </label>
                <button
                  onClick={() => setStep("time")}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="h-3 w-3" /> Voltar
                </button>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mb-5 bg-secondary px-3 py-1.5 rounded-full">
                {service} - {selectedTime} - {new Date(date + "T12:00:00").toLocaleDateString("pt-BR")}
              </div>

              {!creatingNew ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Buscar cliente por nome ou telefone"
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="w-full pl-10 pr-3 py-3 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all text-sm"
                    />
                  </div>

                  <div className="max-h-[220px] overflow-y-auto rounded-xl border border-border/60 divide-y divide-border/40">
                    {filteredClients.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                        Nenhum cliente encontrado.
                      </div>
                    ) : (
                      filteredClients.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setSelectedClientId(c.id)}
                          className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
                            selectedClientId === c.id ? "bg-primary/5" : "hover:bg-accent"
                          }`}
                        >
                          <div className="min-w-0">
                            <span className="flex items-center gap-2 text-sm font-medium text-foreground truncate">
                              {c.name}
                              {clientOwes(c) && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full shrink-0">
                                  <AlertCircle className="h-3 w-3" /> Devendo
                                </span>
                              )}
                            </span>
                            <span className="block text-xs text-muted-foreground truncate">{c.phone || "Sem telefone"}</span>
                          </div>
                          {selectedClientId === c.id && <Check className="h-4 w-4 text-primary shrink-0" />}
                        </button>
                      ))
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setCreatingNew(true);
                      setSelectedClientId(null);
                      setNewName(clientSearch.trim());
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-border rounded-xl text-sm font-medium text-foreground hover:bg-accent transition-colors"
                  >
                    <UserPlus className="h-4 w-4" /> Cadastrar novo cliente
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={() => setCreatingNew(false)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronLeft className="h-3 w-3" /> Escolher cliente existente
                  </button>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Nome do cliente"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full pl-10 pr-3 py-3 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all text-sm"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="tel"
                      placeholder="Telefone"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full pl-10 pr-3 py-3 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all text-sm"
                    />
                  </div>
                  <div>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="email"
                        placeholder="E-mail (opcional)"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className="w-full pl-10 pr-3 py-3 border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all text-sm"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 ml-1">
                      O e-mail é opcional. Depois serve para enviar o acesso ao cliente.
                    </p>
                  </div>
                </div>
              )}

              {selectedClient && clientOwes(selectedClient) && (
                <div className="flex items-start gap-2 mt-4 text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-3 py-2.5 rounded-xl">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>Atenção: este cliente está com pagamento em aberto (devendo) de um atendimento anterior.</span>
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={loading || (!creatingNew && !selectedClientId) || (creatingNew && !newName.trim())}
                className="w-full mt-5 py-3 h-auto rounded-xl font-semibold shadow-lg shadow-primary/15 hover:shadow-xl hover:shadow-primary/25 transition-all hover:-translate-y-0.5 disabled:opacity-50"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Criando...</>
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
