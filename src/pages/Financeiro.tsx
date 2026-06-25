import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingUp, TrendingDown, CalendarDays, ArrowUpRight, ArrowDownRight } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface BookingRecord {
  id: string;
  client_name: string;
  service: string;
  price: number;
  start_time: string;
  status: string;
}

export default function FinanceiroPage() {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
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

    const { data, error } = await supabase
      .from("bookings")
      .select("id, client_name, service, price, start_time, status")
      .gte("start_time", startDate.toISOString())
      .lte("start_time", now.toISOString())
      .order("start_time", { ascending: false });

    if (!error) setBookings(data || []);
    setLoading(false);
  }

  const confirmed = bookings.filter((b) => b.status === "confirmed" || b.status === "completed");
  const cancelled = bookings.filter((b) => b.status === "cancelled");

  const totalRevenue = confirmed.reduce((sum, b) => sum + (b.price || 0), 0);
  const totalBookings = confirmed.length;
  const avgTicket = totalBookings > 0 ? totalRevenue / totalBookings : 0;
  const cancelRate = bookings.length > 0 ? (cancelled.length / bookings.length) * 100 : 0;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

  return (
    <AppLayout>
      <div className="flex-1 flex flex-col bg-secondary">
        <header className="bg-card border-b border-border px-6 md:px-10 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 pl-12 md:pl-0">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                  Financeiro
                </h1>
                <p className="text-sm text-muted-foreground">Receitas e movimentação</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Receita Total"
              value={`R$ ${totalRevenue.toFixed(2)}`}
              icon={<DollarSign className="h-5 w-5" />}
              color="emerald"
            />
            <StatCard
              title="Atendimentos"
              value={String(totalBookings)}
              icon={<CalendarDays className="h-5 w-5" />}
              color="blue"
            />
            <StatCard
              title="Ticket Médio"
              value={`R$ ${avgTicket.toFixed(2)}`}
              icon={<TrendingUp className="h-5 w-5" />}
              color="violet"
            />
            <StatCard
              title="Taxa de Cancelamento"
              value={`${cancelRate.toFixed(1)}%`}
              icon={<TrendingDown className="h-5 w-5" />}
              color="red"
            />
          </div>

          <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border">
              <h2 className="font-semibold text-foreground">Movimentações</h2>
            </div>
            {loading ? (
              <p className="text-muted-foreground text-center py-10">Carregando...</p>
            ) : bookings.length === 0 ? (
              <p className="text-muted-foreground text-center py-10">Nenhuma movimentação neste período.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="uppercase text-xs tracking-wider font-semibold">Data</TableHead>
                      <TableHead className="uppercase text-xs tracking-wider font-semibold">Horário</TableHead>
                      <TableHead className="uppercase text-xs tracking-wider font-semibold">Cliente</TableHead>
                      <TableHead className="uppercase text-xs tracking-wider font-semibold">Serviço</TableHead>
                      <TableHead className="uppercase text-xs tracking-wider font-semibold">Valor</TableHead>
                      <TableHead className="uppercase text-xs tracking-wider font-semibold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((b) => (
                      <TableRow key={b.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="text-muted-foreground">{formatDate(b.start_time)}</TableCell>
                        <TableCell className="text-muted-foreground">{formatTime(b.start_time)}</TableCell>
                        <TableCell className="font-semibold text-foreground">{b.client_name}</TableCell>
                        <TableCell className="text-muted-foreground">{b.service}</TableCell>
                        <TableCell className="font-semibold text-foreground">
                          R$ {(b.price || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {b.status === "cancelled" ? (
                            <Badge className="bg-red-100 text-red-700 border-red-200">Cancelado</Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                              <ArrowUpRight className="h-3 w-3 mr-1" />
                              Receita
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </main>
      </div>
    </AppLayout>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: "emerald" | "blue" | "violet" | "red";
}) {
  const colors = {
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    violet: "bg-violet-50 text-violet-600",
    red: "bg-red-50 text-red-600",
  };

  return (
    <div className="bg-card rounded-2xl p-5 shadow-sm border border-border/40">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
          {icon}
        </div>
        <span className="text-sm text-muted-foreground">{title}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
