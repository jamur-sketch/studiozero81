import { supabase } from "@/integrations/supabase/client";
import type { Booking } from "@/features/agenda/api";
export type { Booking };

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
