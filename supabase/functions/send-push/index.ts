// Envia notificação push para os aparelhos do admin.
// Chamada por um Database Webhook do Supabase a cada INSERT em `notifications`.
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

// O Supabase expõe SUPABASE_SECRET_KEYS como um dicionário JSON.
// Extrai dali a primeira chave sb_secret_ que encontrar.
function chaveDoDicionario(): string | undefined {
  const bruto = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!bruto) return undefined;
  try {
    const dados = JSON.parse(bruto);
    const candidatos: unknown[] = Array.isArray(dados) ? dados : Object.values(dados);
    for (const item of candidatos) {
      if (typeof item === "string" && item.startsWith("sb_secret_")) return item;
      // Formato alternativo: [{ name, api_key }]
      if (item && typeof item === "object") {
        for (const v of Object.values(item as Record<string, unknown>)) {
          if (typeof v === "string" && v.startsWith("sb_secret_")) return v;
        }
      }
    }
  } catch {
    // Se não for JSON válido, pode ser a chave em texto puro.
    if (bruto.startsWith("sb_secret_")) return bruto;
  }
  return undefined;
}

// Ordem: chave definida à mão → dicionário automático → chave legada (obsoleta).
// O nome não pode começar com SUPABASE_ (prefixo reservado pela plataforma).
const SERVICE_ROLE_KEY =
  Deno.env.get("PUSH_DB_KEY") ??
  chaveDoDicionario() ??
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  "";
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:estudioo081@gmail.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

interface NotificationRow {
  id: string;
  title: string;
  body: string | null;
}

interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

// Acesso direto à API do banco: evita carregar o cliente inteiro,
// deixando o arranque da função mais rápido (o push chega antes).
const dbHeaders = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
};

async function listarInscricoes(): Promise<PushSubscriptionRow[]> {
  if (!SERVICE_ROLE_KEY) {
    throw new Error(
      "Nenhuma chave de acesso ao banco configurada. Defina o secret PUSH_DB_KEY.",
    );
  }
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/push_subscriptions?select=id,endpoint,p256dh,auth`,
    { headers: dbHeaders },
  );
  if (!res.ok) throw new Error(`Falha ao ler inscrições: ${res.status} ${await res.text()}`);
  return await res.json();
}

async function removerInscricoes(ids: string[]): Promise<void> {
  const lista = ids.map((id) => `"${id}"`).join(",");
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/push_subscriptions?id=in.(${lista})`,
    { method: "DELETE", headers: dbHeaders },
  );
  if (!res.ok) console.error("Falha ao limpar inscrições:", res.status, await res.text());
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

    const subs = await listarInscricoes();
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
      subs.map(async (s) => {
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
      await removerInscricoes(expirados);
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
