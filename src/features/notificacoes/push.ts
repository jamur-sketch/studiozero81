import { supabase } from "@/integrations/supabase/client";

// Chave pública VAPID. É pública por natureza: vai para o serviço de push
// do próprio navegador. A chave PRIVADA fica só no servidor (Supabase).
export const VAPID_PUBLIC_KEY =
  "BMyBY8mM71YcXVfbjvAH-vp7-WPDWVu9OQHSwf3NA3pbrgHdJujk3fs4luVdnwxjG8zPu-VT1m8NbLjlDk7WcV8";

export type PushStatus =
  | "unsupported" // navegador/aparelho não suporta
  | "needs-install" // iOS: só funciona com o app instalado na tela de início
  | "denied" // usuário bloqueou nas configurações
  | "off" // suportado, mas ainda não ativado
  | "on"; // ativado neste aparelho

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

// No iOS, push só existe quando o site foi adicionado à tela de início.
export const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (window.navigator as any).standalone === true;

export function pushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function getPushStatus(): Promise<PushStatus> {
  if (!pushSupported()) {
    return isIOS() && !isStandalone() ? "needs-install" : "unsupported";
  }
  if (Notification.permission === "denied") return "denied";

  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return "off";

  // Só está realmente ligado se o servidor também conhecer este aparelho.
  // Sem esta checagem o botão diz "ativado" enquanto nenhum aviso chega.
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("endpoint", sub.endpoint)
    .maybeSingle();

  if (error || !data) return "off";
  return "on";
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

// Pede permissão, inscreve o aparelho e guarda no banco.
export async function enablePush(): Promise<void> {
  if (!pushSupported()) {
    throw new Error(
      isIOS() && !isStandalone()
        ? "No iPhone, adicione o app à tela de início primeiro."
        : "Este aparelho não suporta notificações push.",
    );
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Permissão de notificação negada.");
  }

  const reg = await navigator.serviceWorker.ready;

  // Reaproveita a inscrição existente se já houver uma.
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Sessão expirada. Entre novamente.");

  const json = sub.toJSON() as { endpoint?: string; keys?: Record<string, string> };
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Não foi possível registrar este aparelho.");
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent.slice(0, 300),
    },
    { onConflict: "endpoint" },
  );

  if (error) throw new Error(error.message);
}

// Cancela no aparelho e remove do banco.
export async function disablePush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;

  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}
