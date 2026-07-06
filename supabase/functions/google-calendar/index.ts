import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const TIMEZONE = "America/Sao_Paulo";
const BUSINESS_START = 9;
const BUSINESS_END = 20;

const SERVICE_DURATIONS: Record<string, number> = {
  "Corte": 45,
  "Corte e barba": 75,
  "Barba": 40,
  "Sobrancelha": 15,
};

async function getAccessToken(supabase: any): Promise<string> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "google_refresh_token")
    .single();

  if (!data?.value) {
    throw new Error("Google Calendar não conectado. Configure a integração primeiro.");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: data.value,
      grant_type: "refresh_token",
    }),
  });

  const tokens = await res.json();
  if (tokens.error) {
    throw new Error(`Token refresh failed: ${tokens.error_description}`);
  }
  return tokens.access_token;
}

async function getAvailableTimes(accessToken: string, date: string, service: string) {
  const duration = SERVICE_DURATIONS[service];
  if (!duration) throw new Error(`Serviço inválido: ${service}`);

  const dayStart = `${date}T${String(BUSINESS_START).padStart(2, "0")}:00:00`;
  const dayEnd = `${date}T${String(BUSINESS_END).padStart(2, "0")}:00:00`;

  const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin: new Date(`${dayStart}-03:00`).toISOString(),
      timeMax: new Date(`${dayEnd}-03:00`).toISOString(),
      timeZone: TIMEZONE,
      items: [{ id: "primary" }],
    }),
  });

  const data = await res.json();
  const busySlots = data.calendars?.primary?.busy || [];

  const slots: { start: string; end: string }[] = [];
  for (let mins = BUSINESS_START * 60; mins + duration <= BUSINESS_END * 60; mins += 15) {
    const slotStart = new Date(`${date}T${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}:00-03:00`);
    const slotEnd = new Date(slotStart.getTime() + duration * 60000);
    const isConflict = busySlots.some((busy: any) => {
      const busyStart = new Date(busy.start);
      const busyEnd = new Date(busy.end);
      return slotStart < busyEnd && slotEnd > busyStart;
    });
    if (!isConflict) {
      slots.push({ start: slotStart.toISOString(), end: slotEnd.toISOString() });
    }
  }
  return slots;
}

async function getEvents(accessToken: string, dateStart: string, dateEnd: string) {
  const timeMin = new Date(`${dateStart}T00:00:00-03:00`).toISOString();
  const timeMax = new Date(`${dateEnd}T23:59:59-03:00`).toISOString();

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&timeZone=${TIMEZONE}&singleEvents=true&orderBy=startTime&maxResults=250`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const data = await res.json();
  return data.items || [];
}

async function createBooking(
  accessToken: string,
  supabase: any,
  data: { date: string; time: string; service: string; clientName: string; clientPhone: string }
) {
  const duration = SERVICE_DURATIONS[data.service];
  if (!duration) throw new Error(`Serviço inválido: ${data.service}`);

  const startDateTime = new Date(`${data.date}T${data.time}:00-03:00`);
  const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

  const eventRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: `${data.service} - ${data.clientName}`,
      description: `Telefone: ${data.clientPhone}\nServiço: ${data.service}`,
      start: { dateTime: startDateTime.toISOString(), timeZone: TIMEZONE },
      end: { dateTime: endDateTime.toISOString(), timeZone: TIMEZONE },
    }),
  });

  const event = await eventRes.json();
  if (event.error) throw new Error(`Erro ao criar evento: ${event.error.message}`);

  await supabase.from("bookings").insert({
    google_event_id: event.id,
    client_name: data.clientName,
    client_phone: data.clientPhone,
    service: data.service,
    start_time: startDateTime.toISOString(),
    end_time: endDateTime.toISOString(),
    status: "confirmed",
  });

  return event;
}

async function updateEvent(
  accessToken: string,
  supabase: any,
  data: { eventId: string; summary?: string; description?: string; start?: string; end?: string; clientName?: string; clientPhone?: string; service?: string }
) {
  const patch: any = {};
  if (data.summary) patch.summary = data.summary;
  if (data.description) patch.description = data.description;
  if (data.start) patch.start = { dateTime: data.start, timeZone: TIMEZONE };
  if (data.end) patch.end = { dateTime: data.end, timeZone: TIMEZONE };

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${data.eventId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patch),
    }
  );

  const event = await res.json();
  if (event.error) throw new Error(`Erro ao atualizar evento: ${event.error.message}`);

  // Update local booking if exists
  const updateData: any = {};
  if (data.start) updateData.start_time = data.start;
  if (data.end) updateData.end_time = data.end;
  if (data.clientName) updateData.client_name = data.clientName;
  if (data.clientPhone) updateData.client_phone = data.clientPhone;
  if (data.service) updateData.service = data.service;

  if (Object.keys(updateData).length > 0) {
    await supabase
      .from("bookings")
      .update(updateData)
      .eq("google_event_id", data.eventId);
  }

  return event;
}

async function cancelBooking(accessToken: string, supabase: any, eventId: string) {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok && res.status !== 204) {
    const err = await res.json();
    throw new Error(`Erro ao cancelar: ${err.error?.message}`);
  }

  await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("google_event_id", eventId);

  return { success: true };
}

function phoneDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

function phonesMatch(a: string, b: string): boolean {
  const da = phoneDigits(a);
  const db = phoneDigits(b);
  if (!da || !db || da.length < 8 || db.length < 8) return false;
  return da === db || da.endsWith(db) || db.endsWith(da);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // ── POST actions that don't need Google Calendar ──────────────────────
    if (req.method === "POST") {
      const body = await req.json();
      const bodyAction: string = body.action || action || "";

      // Link existing bookings to a client by phone (called after registration)
      if (bodyAction === "link-client-bookings") {
        const { clientId, phone } = body;
        if (!clientId || !phone) return json({ error: "clientId e phone são obrigatórios" }, 400);

        // Verify the caller owns this client record
        const authHeader = req.headers.get("Authorization") || "";
        const token = authHeader.replace("Bearer ", "");
        const { data: caller } = await supabase.auth.getUser(token);
        const { data: clientRow } = await supabase.from("clients").select("user_id").eq("id", clientId).single();
        if (!caller?.user || !clientRow || clientRow.user_id !== caller.user.id) {
          return json({ error: "Não autorizado" }, 403);
        }

        const { data: unlinked } = await supabase.from("bookings").select("id, client_phone").is("client_id", null);
        const toLink = (unlinked || []).filter((b: any) => phonesMatch(b.client_phone, phone));
        for (const b of toLink) {
          await supabase.from("bookings").update({ client_id: clientId }).eq("id", b.id);
        }
        return json({ linked: toLink.length });
      }

      // Import Google Calendar events into bookings (admin only)
      if (bodyAction === "import-calendar") {
        const authHeader = req.headers.get("Authorization") || "";
        const token = authHeader.replace("Bearer ", "");
        const { data: caller } = await supabase.auth.getUser(token);
        if (!caller?.user) return json({ error: "Não autorizado" }, 401);
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", caller.user.id).eq("role", "admin");
        if (!roles || roles.length === 0) return json({ error: "Apenas administradores podem importar" }, 403);

        const { dateStart, dateEnd } = body;
        if (!dateStart || !dateEnd) return json({ error: "dateStart e dateEnd são obrigatórios" }, 400);

        const accessToken = await getAccessToken(supabase);
        const events = await getEvents(accessToken, dateStart, dateEnd);

        // Existing google_event_ids to skip duplicates
        const { data: existing } = await supabase.from("bookings").select("google_event_id").not("google_event_id", "is", null);
        const existingIds = new Set((existing || []).map((b: any) => b.google_event_id));

        // Clients for phone matching
        const { data: clients } = await supabase.from("clients").select("id, phone");

        let imported = 0, skipped = 0, errors = 0;

        for (const event of events) {
          try {
            // Skip already imported or all-day events
            if (existingIds.has(event.id) || !event.start?.dateTime) { skipped++; continue; }

            // Parse "Nome - Serviço" from title
            const title: string = event.summary || "";
            const dashIdx = title.lastIndexOf(" - ");
            let clientName = title.trim();
            let service = "";
            if (dashIdx > 0) {
              clientName = title.substring(0, dashIdx).trim();
              service = title.substring(dashIdx + 3).trim();
            }

            // Extract phone from description (first sequence of digits+formatting, min 8 digits)
            const desc: string = event.description || "";
            const phoneMatch = desc.match(/[\d][\d\s\-\(\)\.]{6,}[\d]/);
            const rawPhone = phoneMatch ? phoneMatch[0].trim() : "";
            const digits = phoneDigits(rawPhone);

            // Match to a registered client
            let clientId: string | null = null;
            if (digits.length >= 8 && clients) {
              const match = (clients as any[]).find((c) => phonesMatch(c.phone || "", rawPhone));
              if (match) clientId = match.id;
            }

            const { error: insertError } = await supabase.from("bookings").insert({
              google_event_id: event.id,
              client_id: clientId,
              client_name: clientName || "Sem nome",
              client_phone: digits || rawPhone,
              service,
              start_time: event.start.dateTime,
              end_time: event.end?.dateTime || event.start.dateTime,
              status: "confirmed",
              price: 0,
            });

            if (insertError) { errors++; } else { imported++; }
          } catch (_) {
            errors++;
          }
        }

        return json({ imported, skipped, errors });
      }
    }

    // ── Actions that need Google Calendar ────────────────────────────────
    const accessToken = await getAccessToken(supabase);

    if (req.method === "GET" && action === "available-times") {
      const date = url.searchParams.get("date");
      const service = url.searchParams.get("service");
      if (!date || !service) throw new Error("Parâmetros 'date' e 'service' são obrigatórios");
      const slots = await getAvailableTimes(accessToken, date, service);
      return new Response(JSON.stringify({ slots }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "GET" && action === "events") {
      const dateStart = url.searchParams.get("dateStart") || url.searchParams.get("date");
      const dateEnd = url.searchParams.get("dateEnd") || dateStart;
      if (!dateStart) throw new Error("Parâmetro 'dateStart' é obrigatório");
      const events = await getEvents(accessToken, dateStart, dateEnd!);
      return new Response(JSON.stringify({ events }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const bodyAction: string = body.action || action || "";

      if (bodyAction === "create-block") {
        const authHeader2 = req.headers.get("Authorization") || "";
        const token2 = authHeader2.replace("Bearer ", "");
        const { data: caller2 } = await supabase.auth.getUser(token2);
        if (!caller2?.user) return json({ error: "Não autorizado" }, 401);
        const { data: roles2 } = await supabase.from("user_roles").select("role").eq("user_id", caller2.user.id).eq("role", "admin");
        if (!roles2 || roles2.length === 0) return json({ error: "Apenas administradores podem bloquear horários" }, 403);

        const { start, end, reason } = body;
        if (!start || !end) return json({ error: "start e end são obrigatórios" }, 400);

        const gcalRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            summary: reason || "Bloqueio",
            start: { dateTime: start, timeZone: TIMEZONE },
            end: { dateTime: end, timeZone: TIMEZONE },
          }),
        });
        const gcalEvent = await gcalRes.json();

        await supabase.from("bookings").insert({
          google_event_id: gcalEvent.id || null,
          client_name: "Bloqueado",
          client_phone: "",
          service: reason || "Bloqueio",
          start_time: start,
          end_time: end,
          status: "blocked",
          price: 0,
        });

        return json({ success: true });
      }

      if (bodyAction === "delete-block") {
        const authHeader2 = req.headers.get("Authorization") || "";
        const token2 = authHeader2.replace("Bearer ", "");
        const { data: caller2 } = await supabase.auth.getUser(token2);
        if (!caller2?.user) return json({ error: "Não autorizado" }, 401);
        const { data: roles2 } = await supabase.from("user_roles").select("role").eq("user_id", caller2.user.id).eq("role", "admin");
        if (!roles2 || roles2.length === 0) return json({ error: "Apenas administradores podem remover bloqueios" }, 403);

        const { bookingId } = body;
        if (!bookingId) return json({ error: "bookingId é obrigatório" }, 400);

        const { data: bk } = await supabase.from("bookings").select("google_event_id").eq("id", bookingId).single();
        if (bk?.google_event_id) {
          await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${bk.google_event_id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${accessToken}` },
          });
        }
        await supabase.from("bookings").delete().eq("id", bookingId);
        return json({ success: true });
      }

      if (bodyAction === "create-booking" || action === "create-booking") {
        const event = await createBooking(accessToken, supabase, body);
        return new Response(JSON.stringify({ success: true, event }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (bodyAction === "update-event" || action === "update-event") {
        const event = await updateEvent(accessToken, supabase, body);
        return new Response(JSON.stringify({ success: true, event }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (bodyAction === "cancel-booking" || action === "cancel-booking") {
        const result = await cancelBooking(accessToken, supabase, body.eventId);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
