import { createContext, useContext, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from "@/features/notificacoes/api";

interface NotificationsValue {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  markRead: (id: string) => void;
  markAllRead: () => void;
  refresh: () => void;
}

const NotificationsContext = createContext<NotificationsValue>({
  notifications: [],
  unreadCount: 0,
  loading: false,
  markRead: () => {},
  markAllRead: () => {},
  refresh: () => {},
});

export const useNotifications = () => useContext(NotificationsContext);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  // Evita tocar o som/toast no primeiro carregamento da lista.
  const hydrated = useRef(false);

  const refresh = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      setNotifications(await getNotifications());
    } catch (err) {
      console.error("Erro ao carregar notificações:", err);
    } finally {
      setLoading(false);
      hydrated.current = true;
    }
  }, [isAdmin]);

  useEffect(() => {
    if (adminLoading || !isAdmin) return;
    refresh();
  }, [adminLoading, isAdmin, refresh]);

  // Assinatura em tempo real: novo agendamento de cliente chega na hora.
  useEffect(() => {
    if (adminLoading || !isAdmin) return;

    const channel = supabase
      .channel("notifications-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const novo = payload.new as AppNotification;
          setNotifications((prev) =>
            prev.some((n) => n.id === novo.id) ? prev : [novo, ...prev],
          );
          if (hydrated.current) {
            toast.success(novo.title, { description: novo.body ?? undefined, duration: 8000 });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [adminLoading, isAdmin]);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    markNotificationRead(id).catch((err) => console.error("Erro ao marcar como lida:", err));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    markAllNotificationsRead().catch((err) => console.error("Erro ao marcar todas:", err));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, loading, markRead, markAllRead, refresh }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}
