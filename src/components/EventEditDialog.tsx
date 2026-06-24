import { useState } from "react";
import { X, Trash2, Save, Phone, User, Clock, Loader2, Scissors, Repeat, CalendarX } from "lucide-react";
import { SERVICES, updateBooking, cancelBooking, cancelRecurringSeries } from "@/lib/bookings";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

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

export function EventEditDialog({ isOpen, onClose, onSuccess, event }: EventEditDialogProps) {
  const parsed = event ? parseEventDetails(event.title, event.description) : { service: "", clientName: "", clientPhone: "" };

  const [service, setService] = useState(parsed.service);
  const [clientName, setClientName] = useState(parsed.clientName);
  const [clientPhone, setClientPhone] = useState(parsed.clientPhone);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingSeries, setDeletingSeries] = useState(false);

  if (event && parsed.clientName !== clientName && !loading) {
    setService(parsed.service);
    setClientName(parsed.clientName);
    setClientPhone(parsed.clientPhone);
  }

  if (!isOpen || !event) return null;

  const startDate = new Date(event.start);
  const endDate = new Date(event.end);

  const handleSave = async () => {
    if (!clientName.trim()) {
      toast({ title: "Nome do cliente é obrigatório", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await updateBooking({
        id: event.id,
        service,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
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

  const formatDateTime = (d: Date) =>
    d.toLocaleString("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    });

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
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 px-3 py-2 rounded-lg">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatDateTime(startDate)} — {formatDateTime(endDate)}</span>
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
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Nome do cliente"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 border border-input rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Telefone
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="tel"
                placeholder="Telefone"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 border border-input rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
              />
            </div>
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
