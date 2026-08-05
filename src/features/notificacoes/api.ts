import { supabase } from "@/integrations/supabase/client";

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  booking_id: string | null;
  read: boolean;
  created_at: string;
}

// A tabela notifications ainda não está no types.ts gerado, por isso os casts.
const table = () => (supabase as any).from("notifications");

export async function getNotifications(limit = 30): Promise<AppNotification[]> {
  const { data, error } = await table()
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data || []) as AppNotification[];
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await table().update({ read: true }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await table().update({ read: true }).eq("read", false);
  if (error) throw new Error(error.message);
}

// "há 5 min", "há 2 h", "ontem", "12/07"
export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);

  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;

  const hours = Math.floor(min / 60);
  if (hours < 24) return `há ${hours} h`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "ontem";
  if (days < 7) return `há ${days} dias`;

  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
