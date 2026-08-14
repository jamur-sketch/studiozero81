import { useState, useCallback } from "react";
import { Plus, CalendarDays, Ban } from "lucide-react";
import { BookingDialog } from "@/features/agenda/components/BookingDialog";
import { EventEditDialog } from "@/features/agenda/components/EventEditDialog";
import { BlockDialog } from "@/features/agenda/components/BlockDialog";
import InteractiveCalendar from "@/features/agenda/components/InteractiveCalendar";
import AppLayout from "@/components/AppLayout";
import { NotificationBell } from "@/features/notificacoes/components/NotificationBell";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);
  const [editEvent, setEditEvent] = useState<{
    id: string;
    title: string;
    description?: string;
    start: string;
    end: string;
    status?: string;
    recurring?: boolean;
    recurrenceGroup?: string | null;
  } | null>(null);

  const hoje = new Date();
  const today = hoje.toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  // Versão curta para o celular, onde a data longa quebrava em três linhas.
  const todayShort = hoje.toLocaleDateString("pt-BR", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleEventClick = useCallback(
    (event: {
      id: string;
      title: string;
      description?: string;
      start: string;
      end: string;
      status?: string;
      recurring?: boolean;
      recurrenceGroup?: string | null;
    }) => {
      setEditEvent(event);
    },
    []
  );

  const handleDateSelect = useCallback((date: string) => {
    setSelectedDate(date);
    setBookingOpen(true);
  }, []);

  return (
    <AppLayout>
      <div className="flex-1 flex flex-col bg-gradient-to-br from-secondary via-background to-secondary/50">
        <header className="bg-card/80 backdrop-blur-sm border-b border-border/50 px-4 md:px-10 py-4 md:py-5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 md:gap-4 pl-12 md:pl-0 min-w-0">
            {/* Ícone só no desktop: no celular o espaço é do título. */}
            <div className="hidden md:flex w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary/80 items-center justify-center shadow-lg shadow-primary/20">
              <CalendarDays className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl md:text-3xl font-bold text-foreground tracking-tight leading-tight">
                Agenda
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground capitalize truncate">
                <span className="md:hidden">{todayShort}</span>
                <span className="hidden md:inline">{today}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* No desktop o sino fica no menu lateral; no celular, aqui. */}
            <div className="md:hidden">
              <NotificationBell variant="header" />
            </div>
            <Button
              onClick={() => {
                setSelectedDate(undefined);
                setBlockOpen(true);
              }}
              size="lg"
              variant="outline"
              className="gap-2 rounded-xl"
            >
              <Ban className="h-5 w-5" />
              <span className="hidden sm:inline">Bloquear</span>
            </Button>
            <Button
              onClick={() => {
                setSelectedDate(undefined);
                setBookingOpen(true);
              }}
              size="lg"
              className="gap-2 rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all hover:-translate-y-0.5"
            >
              <Plus className="h-5 w-5" />
              <span className="hidden sm:inline">Novo Agendamento</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-hidden relative">
          <div
            className="bg-card rounded-2xl shadow-sm border border-border/40 h-full overflow-hidden"
            style={{ minHeight: "calc(100vh - 160px)" }}
          >
            <InteractiveCalendar
              onEventClick={handleEventClick}
              onDateSelect={handleDateSelect}
              refreshKey={refreshKey}
            />
          </div>
        </main>
      </div>

      <BookingDialog
        isOpen={bookingOpen}
        onClose={() => setBookingOpen(false)}
        onSuccess={handleRefresh}
        selectedDate={selectedDate}
      />

      <EventEditDialog
        isOpen={!!editEvent}
        onClose={() => setEditEvent(null)}
        onSuccess={handleRefresh}
        event={editEvent}
      />

      <BlockDialog
        isOpen={blockOpen}
        onClose={() => setBlockOpen(false)}
        onSuccess={handleRefresh}
        selectedDate={selectedDate}
      />
    </AppLayout>
  );
}
