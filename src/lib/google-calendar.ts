const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export const SERVICES = [
  { name: "Corte", duration: 45 },
  { name: "Corte e barba", duration: 75 },
  { name: "Barba", duration: 40 },
  { name: "Sobrancelha", duration: 15 },
] as const;

export type ServiceName = typeof SERVICES[number]["name"];

export interface TimeSlot {
  start: string;
  end: string;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime: string };
  end: { dateTime: string };
}

export async function getGoogleAuthUrl(): Promise<string> {
  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/google-calendar-auth?action=auth-url`
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.url;
}

export async function getGoogleConnectionStatus(): Promise<boolean> {
  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/google-calendar-auth?action=status`
  );
  const data = await res.json();
  return data.connected;
}

export async function getAvailableTimes(date: string, service: string): Promise<TimeSlot[]> {
  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/google-calendar?action=available-times&date=${date}&service=${encodeURIComponent(service)}`
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.slots;
}

export async function getEvents(dateStart: string, dateEnd: string): Promise<CalendarEvent[]> {
  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/google-calendar?action=events&dateStart=${dateStart}&dateEnd=${dateEnd}`
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.events;
}

export async function createBooking(data: {
  date: string;
  time: string;
  service: string;
  clientName: string;
  clientPhone: string;
}) {
  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/google-calendar?action=create-booking`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );
  const result = await res.json();
  if (result.error) throw new Error(result.error);
  return result;
}

export async function updateEvent(data: {
  eventId: string;
  summary?: string;
  description?: string;
  start?: string;
  end?: string;
  clientName?: string;
  clientPhone?: string;
  service?: string;
}) {
  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/google-calendar?action=update-event`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );
  const result = await res.json();
  if (result.error) throw new Error(result.error);
  return result;
}

export async function cancelBooking(eventId: string) {
  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/google-calendar?action=cancel-booking`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId }),
    }
  );
  const result = await res.json();
  if (result.error) throw new Error(result.error);
  return result;
}
