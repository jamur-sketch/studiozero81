import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, EventDropArg, DateSelectArg } from "@fullcalendar/core";
import { getBookings, updateBooking, ensureRecurringBookings, type Booking } from "@/lib/bookings";
import { toast } from "@/hooks/use-toast";
import { Loader2, ChevronDown } from "lucide-react";

interface InteractiveCalendarProps {
  onEventClick: (event: {
    id: string;
    title: string;
    description?: string;
    start: string;
    end: string;
    recurring?: boolean;
    recurrenceGroup?: string | null;
  }) => void;
  onDateSelect: (date: string) => void;
  refreshKey: number;
}

const VIEW_OPTIONS = [
  { key: "timeGridDay", label: "Dia" },
  { key: "timeGridWeek", label: "Semana" },
  { key: "dayGridMonth", label: "Mês" },
] as const;

export default function InteractiveCalendar({ onEventClick, onDateSelect, refreshKey }: InteractiveCalendarProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentView, setCurrentView] = useState("");
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const calendarRef = useRef<FullCalendar>(null);
  const lastFetchRange = useRef<string>("");
  const toppedUp = useRef(false);

  const isMobile = useMemo(() => window.innerWidth < 768, []);

  const fetchEvents = useCallback(async (startStr: string, endStr: string) => {
    const rangeKey = `${startStr}_${endStr}`;
    if (rangeKey === lastFetchRange.current && refreshKey === 0) return;
    lastFetchRange.current = rangeKey;

    setLoading(true);
    try {
      const bookings = await getBookings(startStr, endStr);
      const mapped = bookings.map((b: Booking) => ({
        id: b.id,
        title: `${b.service} - ${b.client_name}`,
        start: b.start_time,
        end: b.end_time,
        extendedProps: {
          description: `Telefone: ${b.client_phone}\nServiço: ${b.service}`,
          clientName: b.client_name,
          clientPhone: b.client_phone,
          service: b.service,
          status: b.status,
          recurring: b.recurring,
          recurrenceGroup: b.recurrence_group,
        },
      }));
      setEvents(mapped);
    } catch (err: any) {
      console.error("Erro ao carregar eventos:", err);
      toast({ title: "Erro ao carregar agenda", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [refreshKey]);

  useEffect(() => {
    if (refreshKey > 0 && calendarRef.current) {
      const api = calendarRef.current.getApi();
      const view = api.view;
      const start = view.activeStart.toISOString().split("T")[0];
      const end = view.activeEnd.toISOString().split("T")[0];
      lastFetchRange.current = "";
      fetchEvents(start, end);
    }
  }, [refreshKey, fetchEvents]);

  // Renova os horários fixos de todos os clientes ao abrir a agenda.
  useEffect(() => {
    if (toppedUp.current) return;
    toppedUp.current = true;
    (async () => {
      try {
        const { created } = await ensureRecurringBookings();
        if (created > 0 && calendarRef.current) {
          const api = calendarRef.current.getApi();
          const view = api.view;
          const start = view.activeStart.toISOString().split("T")[0];
          const end = view.activeEnd.toISOString().split("T")[0];
          lastFetchRange.current = "";
          fetchEvents(start, end);
        }
      } catch (err) {
        console.error("Erro ao renovar horários fixos:", err);
      }
    })();
  }, [fetchEvents]);

  const handleDatesSet = useCallback((info: any) => {
    const start = info.startStr.split("T")[0];
    const end = info.endStr.split("T")[0];
    fetchEvents(start, end);
  }, [fetchEvents]);

  const handleEventClick = useCallback((info: EventClickArg) => {
    const evt = info.event;
    onEventClick({
      id: evt.id,
      title: evt.title,
      description: evt.extendedProps?.description,
      start: evt.start?.toISOString() || "",
      end: evt.end?.toISOString() || "",
      recurring: evt.extendedProps?.recurring,
      recurrenceGroup: evt.extendedProps?.recurrenceGroup,
    });
  }, [onEventClick]);

  const handleEventDrop = useCallback(async (info: EventDropArg) => {
    const evt = info.event;
    const newStart = evt.start?.toISOString();
    const newEnd = evt.end?.toISOString();

    if (!newStart || !newEnd) {
      info.revert();
      return;
    }

    try {
      await updateBooking({ id: evt.id, startTime: newStart, endTime: newEnd });
      toast({ title: "Horário atualizado!" });
    } catch (err: any) {
      info.revert();
      toast({ title: "Erro ao mover evento", description: err.message, variant: "destructive" });
    }
  }, []);

  const handleEventResize = useCallback(async (info: any) => {
    const evt = info.event;
    try {
      await updateBooking({ id: evt.id, startTime: evt.start?.toISOString(), endTime: evt.end?.toISOString() });
      toast({ title: "Duração atualizada!" });
    } catch (err: any) {
      info.revert();
      toast({ title: "Erro ao redimensionar", description: err.message, variant: "destructive" });
    }
  }, []);

  const handleDateSelect = useCallback((info: DateSelectArg) => {
    const dateStr = info.startStr.split("T")[0];
    onDateSelect(dateStr);
  }, [onDateSelect]);

  const handleViewChange = (viewKey: string) => {
    if (calendarRef.current) {
      calendarRef.current.getApi().changeView(viewKey);
      setCurrentView(viewKey);
    }
    setViewMenuOpen(false);
  };

  const handleViewDidMount = useCallback((info: any) => {
    setCurrentView(info.view.type);
  }, []);

  const currentViewLabel = VIEW_OPTIONS.find((v) => v.key === currentView)?.label || "Dia";

  return (
    <div className="h-full interactive-calendar">
      {loading && (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-card text-foreground text-xs px-3.5 py-2 rounded-lg border border-border/60 shadow-md loading-indicator">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Carregando...
        </div>
      )}

      {isMobile && (
        <div className="relative inline-block mb-2 ml-1">
          <button
            onClick={() => setViewMenuOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-foreground bg-secondary border border-border rounded-lg"
          >
            {currentViewLabel}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {viewMenuOpen && (
            <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-20 overflow-hidden min-w-[120px]">
              {VIEW_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => handleViewChange(opt.key)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    currentView === opt.key
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-foreground hover:bg-secondary"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={isMobile ? "timeGridDay" : "timeGridWeek"}
        headerToolbar={isMobile
          ? { left: "prev,next today", center: "title", right: "" }
          : { left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" }
        }
        locale="pt-br"
        timeZone="America/Sao_Paulo"
        slotMinTime="08:00:00"
        slotMaxTime="21:00:00"
        slotDuration="01:00:00"
        slotLabelInterval="01:00:00"
        snapDuration="00:15:00"
        expandRows={true}
        allDaySlot={false}
        hiddenDays={[0]}
        editable={true}
        selectable={true}
        selectMirror={true}
        droppable={true}
        eventResizableFromStart={true}
        events={events}
        datesSet={handleDatesSet}
        viewDidMount={handleViewDidMount}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
        select={handleDateSelect}
        height="100%"
        nowIndicator={true}
        buttonText={{
          today: "Hoje",
          month: "Mês",
          week: "Semana",
          day: "Dia",
        }}
      />
    </div>
  );
}
