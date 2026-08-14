// Envia notificação push para os aparelhos do admin.
// Chamada por um Database Webhook do Supabase a cada INSERT em `notifications`.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:estudioo081@gmail.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

interface NotificationRow {
  id: string;
  title: string;
  body: string | null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const payload = await req.json();

    // Formato enviado pelo Database Webhook: { type, table, record, ... }
    const record: NotificationRow | undefined = payload.record ?? payload;
    if (!record?.title) {
      return json({ error: "Payload sem notificação." }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: subs, error } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth");

    if (error) throw new Error(error.message);
    if (!subs || subs.length === 0) {
      return json({ sent: 0, note: "Nenhum aparelho inscrito." });
    }

    const message = JSON.stringify({
      title: record.title,
      body: record.body ?? "Novo agendamento.",
      url: "/home",
      tag: "booking-" + record.id,
    });

    let sent = 0;
    const expirados: string[] = [];

    await Promise.all(
      subs.map(async (s: any) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            message,
          );
          sent++;
        } catch (err: any) {
          // 404/410 = aparelho desinstalou o app ou revogou: limpar do banco.
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            expirados.push(s.id);
          } else {
            console.error("Falha ao enviar push:", err?.statusCode, err?.body ?? err?.message);
          }
        }
      }),
    );

    if (expirados.length > 0) {
      await admin.from("push_subscriptions").delete().in("id", expirados);
    }

    return json({ sent, removed: expirados.length });
  } catch (err: any) {
    console.error("send-push falhou:", err?.message ?? err);
    return json({ error: err?.message ?? "Erro inesperado." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
