import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, BellRing, CalendarDays, CheckCheck, Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotifications } from "@/features/notificacoes/NotificationsContext";
import { timeAgo } from "@/features/notificacoes/api";
import { getPushStatus, enablePush, disablePush, type PushStatus } from "@/features/notificacoes/push";

function PushToggle() {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPushStatus().then(setStatus).catch(() => setStatus("unsupported"));
  }, []);

  if (status === null || status === "unsupported") return null;

  const handleToggle = async () => {
    setBusy(true);
    try {
      if (status === "on") {
        await disablePush();
        setStatus("off");
        toast.success("Avisos no celular desligados.");
      } else {
        await enablePush();
        setStatus("on");
        toast.success("Pronto! Você será avisado mesmo com o app fechado.");
      }
    } catch (err: any) {
      toast.error(err.message || "Não foi possível alterar os avisos.");
      setStatus(await getPushStatus().catch(() => status));
    } finally {
      setBusy(false);
    }
  };

  if (status === "needs-install") {
    return (
      <div className="flex items-start gap-2.5 px-4 py-3 border-b border-border/60 bg-amber-50/60">
        <Smartphone className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 leading-relaxed">
          Para receber avisos com o app fechado, adicione o ZERO81 à tela de início pelo Safari.
        </p>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="flex items-start gap-2.5 px-4 py-3 border-b border-border/60 bg-amber-50/60">
        <Smartphone className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 leading-relaxed">
          As notificações estão bloqueadas. Libere nos ajustes do aparelho para este app.
        </p>
      </div>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={busy}
      className="w-full flex items-center gap-2.5 px-4 py-3 border-b border-border/60 hover:bg-accent/60 transition-colors text-left disabled:opacity-60"
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
      ) : (
        <BellRing
          className={`h-4 w-4 shrink-0 ${status === "on" ? "text-emerald-600" : "text-muted-foreground"}`}
        />
      )}
      <span className="flex-1 min-w-0">
        <span className="block text-xs font-medium text-foreground">
          {status === "on" ? "Avisos no celular ativados" : "Ativar avisos no celular"}
        </span>
        <span className="block text-[11px] text-muted-foreground mt-0.5">
          {status === "on"
            ? "Você é avisado mesmo com o app fechado."
            : "Receba mesmo com o app fechado."}
        </span>
      </span>
      <span
        className={`w-9 h-5 rounded-full shrink-0 relative transition-colors ${
          status === "on" ? "bg-emerald-500" : "bg-muted-foreground/25"
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
            status === "on" ? "left-[18px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

export function NotificationBell({
  variant = "sidebar",
}: {
  /** "sidebar" = fundo escuro do menu lateral; "header" = fundo claro das páginas. */
  variant?: "sidebar" | "header";
}) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleClick = (id: string, read: boolean) => {
    if (!read) markRead(id);
    setOpen(false);
    navigate("/home");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`relative rounded-lg transition-colors shrink-0 ${
            variant === "sidebar"
              ? "p-2 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-white/5"
              : "h-10 w-10 flex items-center justify-center border border-border bg-background text-foreground hover:bg-accent rounded-xl"
          }`}
          title="Notificações"
          aria-label={
            unreadCount > 0 ? `Notificações (${unreadCount} não lidas)` : "Notificações"
          }
        >
          <Bell className={variant === "sidebar" ? "h-[18px] w-[18px]" : "h-5 w-5"} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" sideOffset={8} className="w-[320px] p-0 rounded-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
          <span className="text-sm font-semibold text-foreground">Notificações</span>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Marcar todas
            </button>
          )}
        </div>

        <PushToggle />

        <div className="max-h-[340px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Bell className="h-7 w-7 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma notificação ainda.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Você é avisado aqui quando um cliente agenda.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n.id, n.read)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/60 ${
                    n.read ? "" : "bg-primary/[0.04]"
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <CalendarDays className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm truncate ${
                        n.read ? "text-foreground/80" : "text-foreground font-semibold"
                      }`}
                    >
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{n.body}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-2" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
