import { supabase } from "@/integrations/supabase/client";

export const SERVICES = [
  { name: "Corte", duration: 45, price: 50 },
  { name: "Corte e barba", duration: 75, price: 75 },
  { name: "Barba", duration: 40, price: 35 },
  { name: "Sobrancelha", duration: 15, price: 15 },
] as const;

export type ServiceName = typeof SERVICES[number]["name"];

export interface Booking {
  id: string;
  client_name: string;
  client_phone: string;
  client_id: string | null;
  service: string;
  price: number;
  start_time: string;
  end_time: string;
  status: string;
  recurring: boolean;
  recurrence_group: string | null;
  payment_method: string | null;
  payment_status: string;
  created_at: string;
  updated_at: string;
}

export type PaymentMethod = "cash" | "pix" | "credit" | "debit";
export type PaymentStatus = "pending" | "paid" | "owing";

export const PAYMENT_METHODS: { key: PaymentMethod; label: string }[] = [
  { key: "cash", label: "Dinheiro" },
  { key: "pix", label: "PIX" },
  { key: "credit", label: "Cartão de Crédito" },
  { key: "debit", label: "Cartão de Débito" },
];

export function paymentMethodLabel(method: string | null): string {
  return PAYMENT_METHODS.find((m) => m.key === method)?.label || "—";
}

// Quantas semanas à frente um horário fixo (recorrente) é reservado de uma vez.
export const RECURRENCE_WEEKS = 12;

export async function getBookings(startDate: string, endDate: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .gte("start_time", startDate)
    .lte("start_time", endDate)
    .neq("status", "cancelled")
    .order("start_time");

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getClientBookings(clientId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("client_id", clientId)
    .order("start_time", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function createBooking(data: {
  date: string;
  time: string;
  service: string;
  clientName: string;
  clientPhone: string;
  clientId?: string;
}): Promise<Booking> {
  const svc = SERVICES.find((s) => s.name === data.service);
  const duration = svc?.duration || 45;
  const price = svc?.price || 0;

  const [hours, minutes] = data.time.split(":").map(Number);
  const startDate = new Date(`${data.date}T${data.time}:00`);
  const endDate = new Date(startDate.getTime() + duration * 60000);

  const startTime = startDate.toISOString();
  const endTime = endDate.toISOString();

  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      client_name: data.clientName,
      client_phone: data.clientPhone,
      client_id: data.clientId || null,
      service: data.service,
      price,
      start_time: startTime,
      end_time: endTime,
      status: "confirmed",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  if (data.clientId) {
    await supabase
      .from("clients")
      .update({ last_booking_date: startTime })
      .eq("id", data.clientId);
  }

  return booking;
}

export interface RecurringRule {
  id: string;
  client_id: string | null;
  client_name: string;
  client_phone: string;
  service: string;
  start_date: string;
  time: string;
  active: boolean;
}

// Cria um horário fixo: registra a regra de recorrência e já gera as ocorrências
// das próximas RECURRENCE_WEEKS semanas. A renovação contínua é feita por
// ensureRecurringBookings, que mantém a janela sempre cheia.
export async function createRecurringBooking(data: {
  date: string;
  time: string;
  service: string;
  clientName: string;
  clientPhone: string;
  clientId?: string;
}): Promise<{ created: number }> {
  const { data: rule, error } = await supabase
    .from("recurring_bookings")
    .insert({
      client_id: data.clientId || null,
      client_name: data.clientName,
      client_phone: data.clientPhone,
      service: data.service,
      start_date: data.date,
      time: data.time,
      active: true,
    })
    .select()
    .single();

  if (error || !rule) throw new Error(error?.message || "Não foi possível criar o horário fixo.");

  const result = await ensureRecurringBookings({ ruleId: rule.id });

  if (result.created === 0) {
    throw new Error("Este horário já está ocupado nas próximas semanas.");
  }

  if (data.clientId) {
    await supabase
      .from("clients")
      .update({ last_booking_date: new Date(`${data.date}T${data.time}:00`).toISOString() })
      .eq("id", data.clientId);
  }

  return result;
}

// Mantém os horários fixos sempre reservados pelas próximas RECURRENCE_WEEKS semanas.
// É idempotente: só cria as ocorrências que ainda faltam, pulando conflitos.
// Roda quando o painel do cliente ou a agenda do admin são abertos.
export async function ensureRecurringBookings(opts?: {
  clientId?: string;
  ruleId?: string;
}): Promise<{ created: number }> {
  let query = supabase.from("recurring_bookings").select("*").eq("active", true);
  if (opts?.ruleId) query = query.eq("id", opts.ruleId);
  if (opts?.clientId) query = query.eq("client_id", opts.clientId);

  const { data: rules, error } = await query;
  if (error) throw new Error(error.message);
  if (!rules || rules.length === 0) return { created: 0 };

  const now = new Date();
  const windowEnd = new Date(now.getTime() + RECURRENCE_WEEKS * 7 * 24 * 60 * 60 * 1000);

  // Busca tudo que já existe na janela de uma vez para checar conflitos/duplicatas em memória.
  // Inclui os cancelados de propósito para não recriar uma semana que foi removida manualmente.
  const { data: existing, error: existingError } = await supabase
    .from("bookings")
    .select("start_time, end_time, recurrence_group, status")
    .gte("start_time", now.toISOString())
    .lte("start_time", windowEnd.toISOString());

  if (existingError) throw new Error(existingError.message);

  const rows: Record<string, any>[] = [];

  for (const rule of rules as RecurringRule[]) {
    const svc = SERVICES.find((s) => s.name === rule.service);
    const duration = svc?.duration || 45;
    const price = svc?.price || 0;

    let occ = new Date(`${rule.start_date}T${rule.time}:00`);
    // Avança até a primeira ocorrência que ainda não passou.
    while (occ.getTime() < now.getTime()) occ.setDate(occ.getDate() + 7);

    while (occ.getTime() <= windowEnd.getTime()) {
      const start = new Date(occ);
      const end = new Date(start.getTime() + duration * 60000);

      // Já existe uma ocorrência desta série nesse horário (mesmo que cancelada de propósito)?
      const alreadyExists = (existing || []).some(
        (b) => b.recurrence_group === rule.id && new Date(b.start_time).getTime() === start.getTime(),
      );

      if (!alreadyExists) {
        const conflict = (existing || []).some((b) => {
          if (b.recurrence_group === rule.id) return false;
          if (b.status === "cancelled") return false;
          return new Date(b.start_time) < end && new Date(b.end_time) > start;
        });

        if (!conflict) {
          rows.push({
            client_name: rule.client_name,
            client_phone: rule.client_phone,
            client_id: rule.client_id,
            service: rule.service,
            price,
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            status: "confirmed",
            recurring: true,
            recurrence_group: rule.id,
          });
        }
      }

      occ.setDate(occ.getDate() + 7);
    }
  }

  if (rows.length === 0) return { created: 0 };

  const { error: insertError } = await supabase.from("bookings").insert(rows);
  if (insertError) throw new Error(insertError.message);

  return { created: rows.length };
}

// Encerra um horário fixo: desativa a regra e cancela as ocorrências futuras.
export async function cancelRecurringSeries(recurrenceGroup: string): Promise<void> {
  const { error: ruleError } = await supabase
    .from("recurring_bookings")
    .update({ active: false })
    .eq("id", recurrenceGroup);
  if (ruleError) throw new Error(ruleError.message);

  const { error: bookingsError } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("recurrence_group", recurrenceGroup)
    .gte("start_time", new Date().toISOString());
  if (bookingsError) throw new Error(bookingsError.message);
}

export async function updateBooking(data: {
  id: string;
  service?: string;
  clientName?: string;
  clientPhone?: string;
  clientId?: string | null;
  startTime?: string;
  endTime?: string;
  status?: string;
}): Promise<void> {
  const updates: Record<string, any> = {};
  if (data.service !== undefined) {
    updates.service = data.service;
    const svc = SERVICES.find((s) => s.name === data.service);
    if (svc) updates.price = svc.price;
  }
  if (data.clientName !== undefined) updates.client_name = data.clientName;
  if (data.clientPhone !== undefined) updates.client_phone = data.clientPhone;
  if (data.clientId !== undefined) updates.client_id = data.clientId;
  if (data.startTime !== undefined) updates.start_time = data.startTime;
  if (data.endTime !== undefined) updates.end_time = data.endTime;
  if (data.status !== undefined) updates.status = data.status;

  const { error } = await supabase
    .from("bookings")
    .update(updates)
    .eq("id", data.id);

  if (error) throw new Error(error.message);
}

// Busca os agendamentos de um único dia (para o controle de caixa).
export async function getDayBookings(date: string): Promise<Booking[]> {
  const dayStart = `${date}T00:00:00`;
  const dayEnd = `${date}T23:59:59`;

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .gte("start_time", dayStart)
    .lte("start_time", dayEnd)
    .neq("status", "cancelled")
    .neq("status", "blocked")
    .order("start_time");

  if (error) throw new Error(error.message);
  return data || [];
}

// Registra como o agendamento foi pago (ou marca que ficou devendo).
export async function setBookingPayment(
  id: string,
  paymentStatus: PaymentStatus,
  paymentMethod?: PaymentMethod | null,
): Promise<void> {
  const { error } = await supabase
    .from("bookings")
    .update({
      payment_status: paymentStatus,
      payment_method: paymentStatus === "paid" ? paymentMethod ?? null : null,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

// Retorna os agendamentos que ficaram "devendo" (pendência financeira).
// Usado para avisar o admin quando um cliente devedor agenda de novo.
export async function getOwingBookings(): Promise<
  { client_id: string | null; client_name: string; price: number }[]
> {
  const { data, error } = await supabase
    .from("bookings")
    .select("client_id, client_name, price")
    .eq("payment_status", "owing")
    .neq("status", "cancelled");

  if (error) throw new Error(error.message);
  return data || [];
}

export interface CashClosure {
  id: string;
  closure_date: string;
  total_received: number;
  total_cash: number;
  total_pix: number;
  total_credit: number;
  total_debit: number;
  total_owing: number;
  total_pending: number;
  appointments_count: number;
  closed_at: string;
}

// Grava (ou atualiza) o fechamento de caixa de um dia.
export async function saveCashClosure(data: {
  date: string;
  totalReceived: number;
  totalCash: number;
  totalPix: number;
  totalCredit: number;
  totalDebit: number;
  totalOwing: number;
  totalPending: number;
  appointmentsCount: number;
}): Promise<void> {
  const { error } = await supabase
    .from("cash_closures")
    .upsert(
      {
        closure_date: data.date,
        total_received: data.totalReceived,
        total_cash: data.totalCash,
        total_pix: data.totalPix,
        total_credit: data.totalCredit,
        total_debit: data.totalDebit,
        total_owing: data.totalOwing,
        total_pending: data.totalPending,
        appointments_count: data.appointmentsCount,
        closed_at: new Date().toISOString(),
      },
      { onConflict: "closure_date" },
    );

  if (error) throw new Error(error.message);
}

// Retorna os client_ids que têm uma assinatura ativa.
// Atendimentos desses clientes são cobertos pela mensalidade (valor zero no caixa).
export async function getActiveSubscriberIds(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("client_id")
    .eq("status", "active");

  if (error) throw new Error(error.message);
  return new Set((data || []).map((r) => r.client_id as string));
}

export async function getCashClosures(limit = 30): Promise<CashClosure[]> {
  const { data, error } = await supabase
    .from("cash_closures")
    .select("*")
    .order("closure_date", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data || [];
}

export async function cancelBooking(id: string): Promise<void> {
  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

// Janelas de atendimento para o cliente: Segunda a Sexta, manhã e tarde.
// [início (minutos desde meia-noite), fim (minutos desde meia-noite)]
const WORKING_WINDOWS = [
  [9 * 60, 12 * 60], // 09:00 - 12:00
  [13 * 60, 19 * 60], // 13:00 - 19:00
] as const;

// Janela ampla usada pelo admin (autonomia total): dia inteiro, qualquer dia.
const ADMIN_WINDOWS = [[8 * 60, 21 * 60]] as const;

export async function getAvailableTimes(
  date: string,
  service: string,
  opts?: { unrestricted?: boolean },
): Promise<{ start: string; end: string }[]> {
  const svc = SERVICES.find((s) => s.name === service);
  const duration = svc?.duration || 45;

  // Cliente: Segunda a Sexta apenas (0 = domingo, 6 = sábado). Admin não tem essa restrição.
  if (!opts?.unrestricted) {
    const weekday = new Date(`${date}T12:00:00`).getDay();
    if (weekday === 0 || weekday === 6) return [];
  }

  const dayStart = `${date}T00:00:00`;
  const dayEnd = `${date}T23:59:59`;

  const { data: existing, error } = await supabase
    .from("bookings")
    .select("start_time, end_time")
    .gte("start_time", dayStart)
    .lte("start_time", dayEnd)
    .neq("status", "cancelled");

  if (error) throw new Error(error.message);

  const windows = opts?.unrestricted ? ADMIN_WINDOWS : WORKING_WINDOWS;
  const slots: { start: string; end: string }[] = [];

  for (const [windowStart, windowEnd] of windows) {
    for (let minutes = windowStart; minutes < windowEnd; minutes += 15) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      const slotStart = new Date(`${date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);
      const slotEnd = new Date(slotStart.getTime() + duration * 60000);

      // O atendimento precisa terminar dentro da mesma janela.
      const slotEndMinutes = minutes + duration;
      if (slotEndMinutes > windowEnd) continue;

      const conflicts = (existing || []).some((b) => {
        const bStart = new Date(b.start_time);
        const bEnd = new Date(b.end_time);
        return slotStart < bEnd && slotEnd > bStart;
      });

      if (!conflicts) {
        slots.push({ start: slotStart.toISOString(), end: slotEnd.toISOString() });
      }
    }
  }

  return slots;
}
