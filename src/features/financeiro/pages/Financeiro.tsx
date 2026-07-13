import { useState, useEffect } from "react";
import {
  DollarSign,
  CalendarDays,
  Wallet,
  AlertCircle,
  Clock,
  X,
  Check,
  Loader2,
  Banknote,
  CreditCard,
  Smartphone,
  Crown,
  Percent,
} from "lucide-react";
import { updateBooking } from "@/features/agenda/api";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import {
  getDayBookings,
  setBookingPayment,
  paymentMethodLabel,
  saveCashClosure,
  getCashClosures,
  getActiveSubscriberIds,
  PAYMENT_METHODS,
  type Booking,
  type PaymentMethod,
  type CashClosure,
} from "@/features/financeiro/api";
import { toast } from "@/hooks/use-toast";

const METHOD_ICON: Record<string, React.ReactNode> = {
  cash: <Banknote className="h-4 w-4" />,
  pix: <Smartphone className="h-4 w-4" />,
  credit: <CreditCard className="h-4 w-4" />,
  debit: <CreditCard className="h-4 w-4" />,
};

export default function FinanceiroPage() {
  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD no fuso local
  const [date, setDate] = useState(today);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [closingOpen, setClosingOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [closures, setClosures] = useState<CashClosure[]>([]);
  const [subscriberIds, setSubscriberIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  useEffect(() => {
    getActiveSubscriberIds().then(setSubscriberIds).catch(() => {});
  }, []);

  useEffect(() => {
    loadClosures();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const data = await getDayBookings(date);
      setBookings(data);
    } catch (err: any) {
      toast({ title: "Erro ao carregar caixa", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function loadClosures() {
    try {
      setClosures(await getCashClosures());
    } catch {
      // silencioso: histórico é secundário
    }
  }

  const isSubscriber = (b: Booking) => !!b.client_id && subscriberIds.has(b.client_id);

  // Assinantes: cobertos pela mensalidade, não entram no caixa do dia.
  const subscriberBookings = bookings.filter(isSubscriber);
  const cashable = bookings.filter((b) => !isSubscriber(b));

  const paid = cashable.filter((b) => b.payment_status === "paid");
  const owing = cashable.filter((b) => b.payment_status === "owing");
  const pending = cashable.filter((b) => b.payment_status === "pending");

  const received = paid.reduce((s, b) => s + (b.price || 0), 0);
  const owingTotal = owing.reduce((s, b) => s + (b.price || 0), 0);
  const pendingTotal = pending.reduce((s, b) => s + (b.price || 0), 0);

  const byMethod = PAYMENT_METHODS.map((m) => ({
    ...m,
    total: paid.filter((b) => b.payment_method === m.key).reduce((s, b) => s + (b.price || 0), 0),
  }));

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

  const handleSetPayment = async (booking: Booking, status: "paid" | "owing" | "pending", method?: PaymentMethod, finalPrice?: number) => {
    try {
      if (status === "paid" && finalPrice !== undefined && finalPrice !== booking.price) {
        await updateBooking({ id: booking.id, price: finalPrice });
      }
      await setBookingPayment(booking.id, status, method);
      toast({
        title:
          status === "paid"
            ? "Pagamento registrado!"
            : status === "owing"
            ? "Marcado como devendo."
            : "Pagamento removido.",
      });
      setSelected(null);
      fetchData();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleConfirmClosure = async () => {
    setSaving(true);
    try {
      await saveCashClosure({
        date,
        totalReceived: received,
        totalCash: byMethod.find((m) => m.key === "cash")?.total || 0,
        totalPix: byMethod.find((m) => m.key === "pix")?.total || 0,
        totalCredit: byMethod.find((m) => m.key === "credit")?.total || 0,
        totalDebit: byMethod.find((m) => m.key === "debit")?.total || 0,
        totalOwing: owingTotal,
        totalPending: pendingTotal,
        appointmentsCount: bookings.length,
      });
      toast({ title: "Caixa fechado!", description: "O fechamento foi salvo no histórico." });
      setClosingOpen(false);
      loadClosures();
    } catch (err: any) {
      toast({ title: "Erro ao fechar caixa", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const dateLabel = new Date(date + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <AppLayout>
      <div className="flex-1 flex flex-col bg-secondary">
        <header className="bg-card border-b border-border px-6 md:px-10 py-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4 pl-12 md:pl-0">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Caixa</h1>
                <p className="text-sm text-muted-foreground capitalize">{dateLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="pl-10 pr-3 py-2.5 border border-input rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary"
                />
              </div>
              <Button onClick={() => setClosingOpen(true)} className="gap-2 rounded-xl">
                <DollarSign className="h-4 w-4" /> Fechar caixa
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard title="Recebido" value={`R$ ${received.toFixed(2)}`} icon={<DollarSign className="h-5 w-5" />} color="emerald" />
            <StatCard title="Devendo" value={`R$ ${owingTotal.toFixed(2)}`} icon={<AlertCircle className="h-5 w-5" />} color="red" />
            <StatCard title="A registrar" value={`R$ ${pendingTotal.toFixed(2)}`} icon={<Clock className="h-5 w-5" />} color="amber" />
          </div>

          <div className="bg-card rounded-2xl shadow-sm overflow-hidden border border-border/40">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Atendimentos do dia</h2>
              <span className="text-sm text-muted-foreground">{bookings.length} no total</span>
            </div>

            {loading ? (
              <p className="text-muted-foreground text-center py-12">Carregando...</p>
            ) : bookings.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">Nenhum atendimento neste dia.</p>
            ) : (
              <div className="divide-y divide-border/40">
                {bookings.map((b) => {
                  const subscriber = isSubscriber(b);
                  return (
                    <button
                      key={b.id}
                      onClick={() => !subscriber && setSelected(b)}
                      className={`w-full flex items-center justify-between gap-4 px-5 py-4 transition-colors text-left ${
                        subscriber ? "cursor-default" : "hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <span className="text-sm font-medium text-muted-foreground w-12 shrink-0">{formatTime(b.start_time)}</span>
                        <div className="min-w-0">
                          <span className="block text-sm font-semibold text-foreground truncate">{b.client_name}</span>
                          <span className="block text-xs text-muted-foreground truncate">{b.service}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-sm font-semibold ${subscriber ? "text-muted-foreground" : "text-foreground"}`}>
                          R$ {(subscriber ? 0 : b.price || 0).toFixed(2)}
                        </span>
                        {subscriber ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full">
                            <Crown className="h-3.5 w-3.5" /> Assinatura
                          </span>
                        ) : (
                          <PaymentBadge booking={b} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {closures.length > 0 && (
            <div className="bg-card rounded-2xl shadow-sm overflow-hidden border border-border/40">
              <div className="p-5 border-b border-border">
                <h2 className="font-semibold text-foreground">Histórico de fechamentos</h2>
              </div>
              <div className="divide-y divide-border/40">
                {closures.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                    <div className="min-w-0">
                      <span className="block text-sm font-medium text-foreground">
                        {new Date(c.closure_date + "T12:00:00").toLocaleDateString("pt-BR", {
                          weekday: "short",
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {c.appointments_count} atend. · {c.total_owing > 0 ? `R$ ${c.total_owing.toFixed(2)} em aberto` : "sem pendências"}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600 shrink-0">
                      R$ {c.total_received.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {selected && (
        <PaymentDialog
          booking={selected}
          onClose={() => setSelected(null)}
          onSet={handleSetPayment}
        />
      )}

      {closingOpen && (
        <ClosingDialog
          dateLabel={dateLabel}
          received={received}
          owingTotal={owingTotal}
          pendingTotal={pendingTotal}
          byMethod={byMethod}
          owingList={owing}
          pendingCount={pending.length}
          subscriberCount={subscriberBookings.length}
          saving={saving}
          onConfirm={handleConfirmClosure}
          onClose={() => setClosingOpen(false)}
        />
      )}
    </AppLayout>
  );
}

function PaymentBadge({ booking }: { booking: Booking }) {
  if (booking.payment_status === "paid") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">
        {METHOD_ICON[booking.payment_method || ""] || <Check className="h-3.5 w-3.5" />}
        {paymentMethodLabel(booking.payment_method)}
      </span>
    );
  }
  if (booking.payment_status === "owing") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-red-100 text-red-700 px-2.5 py-1 rounded-full">
        <AlertCircle className="h-3.5 w-3.5" /> Devendo
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
      <Clock className="h-3.5 w-3.5" /> A registrar
    </span>
  );
}

function PaymentDialog({
  booking,
  onClose,
  onSet,
}: {
  booking: Booking;
  onClose: () => void;
  onSet: (b: Booking, status: "paid" | "owing" | "pending", method?: PaymentMethod, finalPrice?: number) => void;
}) {
  const [discount, setDiscount] = useState(0);
  const originalPrice = booking.price || 0;
  const discountAmount = originalPrice * (discount / 100);
  const finalPrice = originalPrice - discountAmount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md" style={{ animation: "fadeInScale 0.2s ease-out" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <div>
            <h2 className="text-lg font-bold text-foreground tracking-tight">{booking.client_name}</h2>
            <p className="text-sm text-muted-foreground">{booking.service}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-lg transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Desconto */}
          <div className="flex items-center gap-3 bg-secondary/50 rounded-xl px-4 py-3">
            <Percent className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground">Desconto</span>
            <input
              type="number"
              min={0}
              max={100}
              value={discount || ""}
              onChange={(e) => {
                const v = Math.min(100, Math.max(0, Number(e.target.value)));
                setDiscount(isNaN(v) ? 0 : v);
              }}
              placeholder="0"
              className="w-16 px-2 py-1 border border-input rounded-lg bg-background text-foreground text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary"
            />
            <span className="text-sm text-muted-foreground">%</span>
            <div className="ml-auto text-right">
              {discount > 0 ? (
                <>
                  <span className="text-xs text-muted-foreground line-through block">R$ {originalPrice.toFixed(2)}</span>
                  <span className="text-sm font-bold text-emerald-600">R$ {finalPrice.toFixed(2)}</span>
                </>
              ) : (
                <span className="text-sm font-bold text-foreground">R$ {originalPrice.toFixed(2)}</span>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Forma de pagamento
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((m) => {
                const active = booking.payment_status === "paid" && booking.payment_method === m.key;
                return (
                  <button
                    key={m.key}
                    onClick={() => onSet(booking, "paid", m.key, finalPrice)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                      active
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "border-border/60 text-foreground hover:bg-accent"
                    }`}
                  >
                    {METHOD_ICON[m.key]}
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              onClick={() => onSet(booking, "owing")}
              className={`flex-1 gap-2 rounded-xl border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground ${
                booking.payment_status === "owing" ? "bg-destructive text-destructive-foreground" : ""
              }`}
            >
              <AlertCircle className="h-4 w-4" /> Ficou devendo
            </Button>
            {booking.payment_status !== "pending" && (
              <Button
                variant="outline"
                onClick={() => onSet(booking, "pending")}
                className="gap-2 rounded-xl"
              >
                Limpar
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ClosingDialog({
  dateLabel,
  received,
  owingTotal,
  pendingTotal,
  byMethod,
  owingList,
  pendingCount,
  subscriberCount,
  saving,
  onConfirm,
  onClose,
}: {
  dateLabel: string;
  received: number;
  owingTotal: number;
  pendingTotal: number;
  byMethod: { key: string; label: string; total: number }[];
  owingList: Booking[];
  pendingCount: number;
  subscriberCount: number;
  saving: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col" style={{ animation: "fadeInScale 0.2s ease-out" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <div>
            <h2 className="text-lg font-bold text-foreground tracking-tight">Resumo do caixa</h2>
            <p className="text-sm text-muted-foreground capitalize">{dateLabel}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-lg transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          <div className="bg-emerald-50 rounded-xl p-4">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Total recebido</span>
            <p className="text-3xl font-bold text-emerald-700 mt-1">R$ {received.toFixed(2)}</p>
          </div>

          <div className="space-y-2">
            {byMethod.map((m) => (
              <div key={m.key} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{m.label}</span>
                <span className="font-semibold text-foreground">R$ {m.total.toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-border/50 pt-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-red-600 font-medium">
                <AlertCircle className="h-4 w-4" /> Em aberto (devendo)
              </span>
              <span className="font-semibold text-red-600">R$ {owingTotal.toFixed(2)}</span>
            </div>
            {owingList.length > 0 && (
              <div className="bg-red-50 rounded-xl p-3 space-y-1">
                {owingList.map((b) => (
                  <div key={b.id} className="flex items-center justify-between text-xs text-red-700">
                    <span className="truncate">{b.client_name}</span>
                    <span className="font-medium shrink-0 ml-2">R$ {(b.price || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
            {pendingCount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-amber-600 font-medium">
                  <Clock className="h-4 w-4" /> Sem registro ({pendingCount})
                </span>
                <span className="font-semibold text-amber-600">R$ {pendingTotal.toFixed(2)}</span>
              </div>
            )}
            {subscriberCount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-violet-600 font-medium">
                  <Crown className="h-4 w-4" /> Cobertos por assinatura
                </span>
                <span className="font-semibold text-violet-600">{subscriberCount}</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border/50 flex gap-3">
          <Button variant="outline" onClick={onClose} disabled={saving} className="rounded-xl">
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={saving} className="flex-1 gap-2 rounded-xl">
            {saving ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</>
            ) : (
              "Confirmar fechamento"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: "emerald" | "red" | "amber";
}) {
  const colors = {
    emerald: "bg-emerald-50 text-emerald-600",
    red: "bg-red-50 text-red-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <div className="bg-card rounded-2xl p-5 shadow-sm border border-border/40">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>{icon}</div>
        <span className="text-sm text-muted-foreground">{title}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
