import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Users, Scissors, TrendingUp, CalendarDays, Clock } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BookingRecord {
  id: string;
  client_name: string;
  service: string;
  price: number;
  start_time: string;
  status: string;
}

export default function RelatoriosPage() {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");

  useEffect(() => {
    fetchData();
  }, [period]);

  async function fetchData() {
    setLoading(true);
    const now = new Date();
    let startDate: Date;

    if (period === "week") {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else if (period === "month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    const [bookingsRes, clientsRes] = await Promise.all([
      supabase
        .from("bookings")
        .select("id, client_name, service, price, start_time, status")
        .gte("start_time", startDate.toISOString())
        .order("start_time", { ascending: false }),
      supabase.from("clients").select("*"),
    ]);

    if (!bookingsRes.error) setBookings(bookingsRes.data || []);
    if (!clientsRes.error) setClients(clientsRes.data || []);
    setLoading(false);
  }

  const confirmed = bookings.filter((b) => b.status !== "cancelled");

  const serviceStats = confirmed.reduce((acc, b) => {
    if (!acc[b.service]) acc[b.service] = { count: 0, revenue: 0 };
    acc[b.service].count += 1;
    acc[b.service].revenue += b.price || 0;
    return acc;
  }, {} as Record<string, { count: number; revenue: number }>);

  const serviceRanking = Object.entries(serviceStats)
    .sort(([, a], [, b]) => b.count - a.count);

  const dayStats = confirmed.reduce((acc, b) => {
    const day = new Date(b.start_time).toLocaleDateString("pt-BR", { weekday: "long" });
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const dayRanking = Object.entries(dayStats).sort(([, a], [, b]) => b - a);

  const hourStats = confirmed.reduce((acc, b) => {
    const hour = new Date(b.start_time).getHours();
    const label = `${String(hour).padStart(2, "0")}:00`;
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const hourRanking = Object.entries(hourStats).sort(([a], [b]) => a.localeCompare(b));

  const topClients = confirmed.reduce((acc, b) => {
    if (!acc[b.client_name]) acc[b.client_name] = { count: 0, revenue: 0 };
    acc[b.client_name].count += 1;
    acc[b.client_name].revenue += b.price || 0;
    return acc;
  }, {} as Record<string, { count: number; revenue: number }>);

  const clientRanking = Object.entries(topClients)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 10);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const activeClients = clients.filter((c) => c.last_booking_date && new Date(c.last_booking_date) >= thirtyDaysAgo).length;
  const inactiveClients = clients.length - activeClients;

  const maxServiceCount = serviceRanking.length > 0 ? serviceRanking[0][1].count : 1;
  const maxHourCount = hourRanking.length > 0 ? Math.max(...hourRanking.map(([, c]) => c)) : 1;

  return (
    <AppLayout>
      <div className="flex-1 flex flex-col bg-secondary">
        <header className="bg-card border-b border-border px-6 md:px-10 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                  Relatórios
                </h1>
                <p className="text-sm text-muted-foreground">Métricas e análises</p>
              </div>
            </div>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Última semana</SelectItem>
                <SelectItem value="month">Este mês</SelectItem>
                <SelectItem value="year">Este ano</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 space-y-6">
          {loading ? (
            <p className="text-muted-foreground text-center py-10">Carregando...</p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-card rounded-2xl p-5 shadow-sm border border-border/40">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Users className="h-5 w-5" />
                    </div>
                    <span className="text-sm text-muted-foreground">Clientes</span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <p className="text-2xl font-bold text-foreground">{clients.length}</p>
                    <div className="flex gap-2 text-xs">
                      <span className="text-emerald-600">{activeClients} ativos</span>
                      <span className="text-red-500">{inactiveClients} inativos</span>
                    </div>
                  </div>
                </div>
                <div className="bg-card rounded-2xl p-5 shadow-sm border border-border/40">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <span className="text-sm text-muted-foreground">Receita no período</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    R$ {confirmed.reduce((s, b) => s + (b.price || 0), 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-card rounded-2xl p-5 shadow-sm border border-border/40">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                      <CalendarDays className="h-5 w-5" />
                    </div>
                    <span className="text-sm text-muted-foreground">Agendamentos</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{confirmed.length}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card rounded-2xl shadow-sm border border-border/40 overflow-hidden">
                  <div className="p-5 border-b border-border/40">
                    <div className="flex items-center gap-2">
                      <Scissors className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold text-foreground">Serviços mais realizados</h3>
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    {serviceRanking.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">Sem dados</p>
                    )}
                    {serviceRanking.map(([name, stats], i) => (
                      <div key={name}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-foreground">{name}</span>
                          <span className="text-sm text-muted-foreground">
                            {stats.count}x • R$ {stats.revenue.toFixed(2)}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${(stats.count / maxServiceCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-card rounded-2xl shadow-sm border border-border/40 overflow-hidden">
                  <div className="p-5 border-b border-border/40">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold text-foreground">Top clientes</h3>
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    {clientRanking.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">Sem dados</p>
                    )}
                    {clientRanking.map(([name, stats], i) => (
                      <div key={name} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}º</span>
                          <span className="text-sm font-medium text-foreground">{name}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {stats.count} visitas • R$ {stats.revenue.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-card rounded-2xl shadow-sm border border-border/40 overflow-hidden">
                  <div className="p-5 border-b border-border/40">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold text-foreground">Dias mais movimentados</h3>
                    </div>
                  </div>
                  <div className="p-5 space-y-2">
                    {dayRanking.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">Sem dados</p>
                    )}
                    {dayRanking.map(([day, count]) => (
                      <div key={day} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground capitalize">{day}</span>
                        <span className="text-sm text-muted-foreground">{count} agendamentos</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-card rounded-2xl shadow-sm border border-border/40 overflow-hidden">
                  <div className="p-5 border-b border-border/40">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold text-foreground">Horários de pico</h3>
                    </div>
                  </div>
                  <div className="p-5 space-y-2">
                    {hourRanking.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">Sem dados</p>
                    )}
                    {hourRanking.map(([hour, count]) => (
                      <div key={hour}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-foreground">{hour}</span>
                          <span className="text-sm text-muted-foreground">{count}</span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-violet-500 rounded-full transition-all"
                            style={{ width: `${(count / maxHourCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </AppLayout>
  );
}
