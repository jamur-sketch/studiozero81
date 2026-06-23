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
  created_at: string;
  updated_at: string;
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

// Cria um horário fixo: reserva o mesmo dia/horário toda semana por RECURRENCE_WEEKS semanas.
// Pula automaticamente as semanas em que o horário já estiver ocupado.
export async function createRecurringBooking(data: {
  date: string;
  time: string;
  service: string;
  clientName: string;
  clientPhone: string;
  clientId?: string;
  weeks?: number;
}): Promise<{ created: number; skipped: number }> {
  const svc = SERVICES.find((s) => s.name === data.service);
  const duration = svc?.duration || 45;
  const price = svc?.price || 0;
  const weeks = data.weeks ?? RECURRENCE_WEEKS;

  const firstStart = new Date(`${data.date}T${data.time}:00`);

  // Monta as ocorrências semanais.
  const occurrences = Array.from({ length: weeks }, (_, i) => {
    const start = new Date(firstStart);
    start.setDate(start.getDate() + i * 7);
    const end = new Date(start.getTime() + duration * 60000);
    return { start, end };
  });

  const rangeStart = occurrences[0].start.toISOString();
  const rangeEnd = occurrences[occurrences.length - 1].end.toISOString();

  // Busca agendamentos existentes no intervalo todo para checar conflitos em memória.
  const { data: existing, error: existingError } = await supabase
    .from("bookings")
    .select("start_time, end_time")
    .gte("start_time", rangeStart)
    .lte("start_time", rangeEnd)
    .neq("status", "cancelled");

  if (existingError) throw new Error(existingError.message);

  const group = crypto.randomUUID();
  const rows: Record<string, any>[] = [];
  let skipped = 0;

  for (const occ of occurrences) {
    const conflicts = (existing || []).some((b) => {
      const bStart = new Date(b.start_time);
      const bEnd = new Date(b.end_time);
      return occ.start < bEnd && occ.end > bStart;
    });

    if (conflicts) {
      skipped++;
      continue;
    }

    rows.push({
      client_name: data.clientName,
      client_phone: data.clientPhone,
      client_id: data.clientId || null,
      service: data.service,
      price,
      start_time: occ.start.toISOString(),
      end_time: occ.end.toISOString(),
      status: "confirmed",
      recurring: true,
      recurrence_group: group,
    });
  }

  if (rows.length === 0) {
    throw new Error("Este horário já está ocupado em todas as próximas semanas.");
  }

  const { error } = await supabase.from("bookings").insert(rows);
  if (error) throw new Error(error.message);

  if (data.clientId) {
    await supabase
      .from("clients")
      .update({ last_booking_date: rows[0].start_time })
      .eq("id", data.clientId);
  }

  return { created: rows.length, skipped };
}

export async function updateBooking(data: {
  id: string;
  service?: string;
  clientName?: string;
  clientPhone?: string;
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
  if (data.startTime !== undefined) updates.start_time = data.startTime;
  if (data.endTime !== undefined) updates.end_time = data.endTime;
  if (data.status !== undefined) updates.status = data.status;

  const { error } = await supabase
    .from("bookings")
    .update(updates)
    .eq("id", data.id);

  if (error) throw new Error(error.message);
}

export async function cancelBooking(id: string): Promise<void> {
  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function getAvailableTimes(date: string, service: string): Promise<{ start: string; end: string }[]> {
  const svc = SERVICES.find((s) => s.name === service);
  const duration = svc?.duration || 45;

  const dayStart = `${date}T08:00:00`;
  const dayEnd = `${date}T21:00:00`;

  const { data: existing, error } = await supabase
    .from("bookings")
    .select("start_time, end_time")
    .gte("start_time", dayStart)
    .lte("start_time", dayEnd)
    .neq("status", "cancelled");

  if (error) throw new Error(error.message);

  const slots: { start: string; end: string }[] = [];
  const startHour = 8;
  const endHour = 21;

  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += 15) {
      const slotStart = new Date(`${date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);
      const slotEnd = new Date(slotStart.getTime() + duration * 60000);

      if (slotEnd.getHours() >= endHour && slotEnd.getMinutes() > 0) continue;

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
