import { useState, useEffect } from "react";
import { X, Trash2, Save, Phone, User, Clock, Loader2, Scissors, Repeat, CalendarX, CalendarDays, Search, UserPlus, Check, Mail, Ban } from "lucide-react";
import { SERVICES, updateBooking, cancelBooking, cancelRecurringSeries } from "@/lib/bookings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface ClientOption {
  id: string;
  name: string;
  phone: string | null;
}

interface EventEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  event: {
    id: string;
    title: string;
    description?: string;
    start: string;
    end: string;
    status?: string;
    recurring?: boolean;
    recurrenceGroup?: string | null;
  } | null;
}

function parseEventDetails(title: string, description?: string) {
  const parts = title.split(" - ");
  const service = parts[0] || "";
  const clientName = parts.slice(1).join(" - ") || title;
  const phoneMatch = description?.match(/Telefone:\s*(.+)/);
  const clientPhone = phoneMatch?.[1]?.trim() || "";
  return { service, clientName, clientPhone };
}

// Formata um Date no fuso local para os inputs (date e time).
function toInputDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toInputTime(d: Date) {
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${min}`;
}

export function EventEditDialog({ isOpen, onClose, onSuccess, event }: EventEditDialogProps) {
  const parsed = event ? parseEventDetails(event.title, event.description) : { service: "", clientName: "", clientPhone: "" };

  const initialDate = event ? toInputDate(new Date(event.start)) : "";
  const initialTime = event ? toInputTime(new Date(event.start)) : "";

  const [service, setService] = useState(parsed.service);
  const [clientName, setClientName] = useState(parsed.clientName);
  const [clientPhone, setClientPhone] = useState(parsed.clientPhone);
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);
  const [syncedId, setSyncedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingSeries, setDeletingSeries] = useState(false);

  // Troca / cadastro de cliente
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [changingClient, setChangingClient] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    supabase
      .from("clients")
      .select("id, name, phone")
      .order("name")
      .then(({ data }) => setClients(data || []));
  }, [isOpen]);

  // Sincroniza os campos quando um novo evento é aberto.
  if (event && event.id !== syncedId && !loading) {
    setService(parsed.service);
    setClientName(parsed.clientName);
    setClientPhone(parsed.clientPhone);
    setDate(initialDate);
    setTime(initialTime);
    setSyncedId(event.id);
    setChangingClient(false);
    setClientSearch("");
    setSelectedClientId(null);
    setCreatingNew(false);
    setNewName("");
    setNewPhone("");
    setNewEmail("");
  }

  if (!isOpen || !event) return null;

  const selectedClient = clients.find((c) => c.id === selectedClientId) || null;
  const filteredClients = clients.filter((c) => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || (c.phone || "").toLowerCase().includes(q);
  });

  const startDate = new Date(event.start);
  const endDate = new Date(event.end);

  const handleSave = async () => {
    if (!date || !time) {
      toast({ title: "Data e horário são obrigatórios", variant: "destructive" });
      return;
    }
    if (changingClient && creatingNew && !newName.trim()) {
      toast({ title: "Informe o nome do cliente", variant: "destructive" });
      return;
    }
    if (changingClient && !creatingNew && !selectedClientId) {
      toast({ title: "Selecione um cliente ou cadastre um novo", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      // Resolve qual cliente será gravado.
      let name = clientName.trim();
      let phone = clientPhone.trim();
      let clientId: string | null | undefined = undefined;

      if (changingClient) {
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
          name = data.name;
          phone = data.phone || "";
          clientId = data.id;
        } else if (selectedClient) {
          name = selectedClient.name;
          phone = selectedClient.phone || "";
          clientId = selectedClient.id;
        }
      }

      if (!name) {
        toast({ title: "Nome do cliente é obrigatório", variant: "destructive" });
        setLoading(false);
        return;
      }

      const svc = SERVICES.find((s) => s.name === service);
      const duration = svc?.duration ?? Math.round((endDate.getTime() - startDate.getTime()) / 60000);
      const newStart = new Date(`${date}T${time}:00`);
      const newEnd = new Date(newStart.getTime() + duration * 60000);

      await updateBooking({
        id: event.id,
        service,
        clientName: name,
        clientPhone: phone,
        clientId,
        startTime: newStart.toISOString(),
        endTime: newEnd.toISOString(),
      });
      toast({ title: "Agendamento atualizado com sucesso!" });
      onSuccess();
      onClose();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const message = event.recurring
      ? "Cancelar apenas este dia? As outras semanas do horário fixo continuam."
      : "Tem certeza que deseja excluir este agendamento?";
    if (!confirm(message)) return;
    setDeleting(true);
    try {
      await cancelBooking(event.id);
      toast({ title: event.recurring ? "Este dia foi cancelado." : "Agendamento excluído com sucesso!" });
      onSuccess();
      onClose();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSeries = async () => {
    if (!event.recurrenceGroup) return;
    if (!confirm("Encerrar este horário fixo? Todos os agendamentos futuros desta recorrência serão cancelados.")) return;
    setDeletingSeries(true);
    try {
      await cancelRecurringSeries(event.recurrenceGroup);
      toast({ title: "Horário fixo encerrado." });
      onSuccess();
      onClose();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setDeletingSeries(false);
    }
  };

  // ── Bloqueio de horário ────────────────────────────────────────────────
  if (event.status === "blocked") {
    const startFmt = new Date(event.start).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    const endFmt = new Date(event.end).toLocaleTimeString("pt-BR", { timeStyle: "short" });

    const handleRemoveBlock = async () => {
      if (!confirm("Remover este bloqueio?")) return;
      setDeleting(true);
      try {
        const { data, error } = await supabase.functions.invoke("google-calendar", {
          body: { action: "delete-block", bookingId: event.id },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        toast({ title: "Bloqueio removido!" });
        onSuccess();
        onClose();
      } catch (err: any) {
        toast({ title: "Erro ao remover bloqueio", description: err.message, variant: "destructive" });
      } finally {
        setDeleting(false);
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
        <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm mx-4" style={{ animation: "fadeInScale 0.2s ease-out" }}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                <Ban className="h-4 w-4 text-muted-foreground" />
              </div>
              <h2 className="font-semibold text-foreground">Horário Bloqueado</h2>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-6 space-y-3">
            <p className="text-sm font-semibold text-foreground">{event.title}</p>
            <p className="text-sm text-muted-foreground">{startFmt} – {endFmt}</p>
          </div>
          <div className="flex justify-end gap-2 px-6 pb-6">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Fechar
            </button>
            <button
              onClick={handleRemoveBlock}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-destructive text-destructive-foreground rounded-xl hover:bg-destructive/90 transition-colors disabled:opacity-50"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Remover Bloqueio
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4" style={{ animation: "fadeInScale 0.2s ease-out" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/5 flex items-center justify-center">
              <Scissors className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground tracking-tight">Editar Agendamento</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-lg transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                Data
              </label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border border-input rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                Horário
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border border-input rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
                />
              </div>
            </div>
          </div>

          {event.recurring && (
            <div className="flex items-center gap-2 text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 px-3 py-2 rounded-lg">
              <Repeat className="h-3.5 w-3.5" />
              <span>Horário fixo — repete toda semana automaticamente</span>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Serviço
            </label>
            <select
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="w-full px-3 py-2.5 border border-input rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
            >
              {SERVICES.map((s) => (
                <option key={s.name} value={s.name}>{s.name} ({s.duration} min)</option>
              ))}
              {!SERVICES.find((s) => s.name === service) && service && (
                <option value={service}>{service}</option>
              )}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Cliente
            </label>

            {!changingClient ? (
              <div className="flex items-center justify-between gap-3 px-3 py-2.5 border border-input rounded-xl bg-background">
                <div className="flex items-center gap-2.5 min-w-0">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <span className="block text-sm font-medium text-foreground truncate">
                      {clientName || "Sem cliente"}
                    </span>
                    <span className="block text-xs text-muted-foreground truncate">
                      {clientPhone || "Sem telefone"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setChangingClient(true)}
                  className="text-xs font-medium text-primary hover:underline shrink-0"
                >
                  Trocar
                </button>
              </div>
            ) : !creatingNew ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Buscar cliente por nome ou telefone"
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 border border-input rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
                    />
                  </div>
                  <button
                    onClick={() => { setChangingClient(false); setSelectedClientId(null); setClientSearch(""); }}
                    className="ml-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
                  >
                    Cancelar
                  </button>
                </div>

                <div className="max-h-[180px] overflow-y-auto rounded-xl border border-border/60 divide-y divide-border/40">
                  {filteredClients.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                      Nenhum cliente encontrado.
                    </div>
                  ) : (
                    filteredClients.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedClientId(c.id)}
                        className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors ${
                          selectedClientId === c.id ? "bg-primary/5" : "hover:bg-accent"
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="block text-sm font-medium text-foreground truncate">{c.name}</span>
                          <span className="block text-xs text-muted-foreground truncate">{c.phone || "Sem telefone"}</span>
                        </div>
                        {selectedClientId === c.id && <Check className="h-4 w-4 text-primary shrink-0" />}
                      </button>
                    ))
                  )}
                </div>

                <button
                  onClick={() => { setCreatingNew(true); setSelectedClientId(null); setNewName(clientSearch.trim()); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-border rounded-xl text-sm font-medium text-foreground hover:bg-accent transition-colors"
                >
                  <UserPlus className="h-4 w-4" /> Cadastrar novo cliente
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => setCreatingNew(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  ‹ Escolher cliente existente
                </button>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Nome do cliente"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 border border-input rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="tel"
                    placeholder="Telefone"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 border border-input rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
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
                      className="w-full pl-10 pr-3 py-2.5 border border-input rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 ml-1">
                    O e-mail é opcional. Depois serve para enviar o acesso ao cliente.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3 pt-3">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={deleting || deletingSeries || loading}
                className="gap-2 border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-xl transition-all"
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? "Cancelando..." : event.recurring ? "Cancelar só este dia" : "Excluir"}
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading || deleting || deletingSeries}
                className="flex-1 gap-2 rounded-xl shadow-lg shadow-primary/15 hover:shadow-xl hover:shadow-primary/25 transition-all hover:-translate-y-0.5"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</>
                ) : (
                  <><Save className="h-4 w-4" /> Salvar Alterações</>
                )}
              </Button>
            </div>

            {event.recurring && (
              <Button
                variant="outline"
                onClick={handleDeleteSeries}
                disabled={deleting || deletingSeries || loading}
                className="w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-xl transition-all"
              >
                <CalendarX className="h-4 w-4" />
                {deletingSeries ? "Encerrando..." : "Encerrar horário fixo (todas as semanas)"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
