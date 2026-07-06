import { useState, useEffect, useMemo } from "react";
import { Users, DollarSign, PieChart, AlertCircle, Pencil, X, Plus, Check, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface Plan {
  id: string;
  name: string;
  badge: string;
  price: number;
  cuts_per_month: number;
  beards_per_month: number;
  discount_percent: number;
  is_featured: boolean;
}

interface Subscription {
  id: string;
  client_id: string;
  plan_id: string;
  start_date: string;
  next_billing_date: string;
  payment_method: string;
  status: string;
  credits_used: number;
  client_name?: string;
  plan_name?: string;
  total_credits?: number;
}

interface Client {
  id: string;
  name: string;
  phone: string | null;
}

export default function Assinaturas() {
  const [activeTab, setActiveTab] = useState<"subscriptions" | "plans">("subscriptions");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showSubModal, setShowSubModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  // Sub form
  const [subClientId, setSubClientId] = useState("");
  const [subPlanId, setSubPlanId] = useState("");
  const [subStartDate, setSubStartDate] = useState("");
  const [subPaymentMethod, setSubPaymentMethod] = useState("pix");

  // Plan form
  const [planName, setPlanName] = useState("");
  const [planBadge, setPlanBadge] = useState("Básico");
  const [planPrice, setPlanPrice] = useState("");
  const [planCuts, setPlanCuts] = useState("0");
  const [planBeards, setPlanBeards] = useState("0");
  const [planDiscount, setPlanDiscount] = useState("0");
  const [planFeatured, setPlanFeatured] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [plansRes, subsRes, clientsRes] = await Promise.all([
      supabase.from("subscription_plans").select("*").order("price"),
      supabase.from("subscriptions").select("*"),
      supabase.from("clients").select("id, name, phone").order("name"),
    ]);

    if (plansRes.data) setPlans(plansRes.data);
    if (clientsRes.data) setClients(clientsRes.data);

    if (subsRes.data && plansRes.data && clientsRes.data) {
      const enriched = subsRes.data.map((s: any) => {
        const plan = plansRes.data?.find((p: any) => p.id === s.plan_id);
        const client = clientsRes.data?.find((c: any) => c.id === s.client_id);
        return {
          ...s,
          client_name: client?.name || "—",
          plan_name: plan?.name || "—",
          total_credits: (plan?.cuts_per_month || 0) + (plan?.beards_per_month || 0),
        };
      });
      setSubscriptions(enriched);
    }
    setLoading(false);
  };

  // Stats
  const stats = useMemo(() => {
    const active = subscriptions.filter((s) => s.status === "active").length;
    const overdue = subscriptions.filter((s) => s.status === "overdue").length;
    const mrr = subscriptions
      .filter((s) => s.status === "active")
      .reduce((sum, s) => {
        const plan = plans.find((p) => p.id === s.plan_id);
        return sum + (plan?.price || 0);
      }, 0);
    const renewal = subscriptions.length > 0 ? Math.round((active / subscriptions.length) * 100) : 0;
    return { active, mrr, renewal, overdue };
  }, [subscriptions, plans]);

  // Sub CRUD
  const openNewSub = () => {
    setEditingSub(null);
    setSubClientId("");
    setSubPlanId("");
    setSubStartDate("");
    setSubPaymentMethod("pix");
    setShowSubModal(true);
  };

  const openEditSub = (sub: Subscription) => {
    setEditingSub(sub);
    setSubClientId(sub.client_id);
    setSubPlanId(sub.plan_id);
    setSubStartDate(sub.start_date);
    setSubPaymentMethod(sub.payment_method);
    setShowSubModal(true);
  };

  const saveSub = async () => {
    if (!subClientId || !subPlanId || !subStartDate) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }

    const startD = new Date(subStartDate);
    const nextBilling = new Date(startD);
    nextBilling.setMonth(nextBilling.getMonth() + 1);

    const payload = {
      client_id: subClientId,
      plan_id: subPlanId,
      start_date: subStartDate,
      next_billing_date: nextBilling.toISOString().split("T")[0],
      payment_method: subPaymentMethod,
    };

    if (editingSub) {
      const { error } = await supabase.from("subscriptions").update(payload).eq("id", editingSub.id);
      if (error) { toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Assinatura atualizada!" });
    } else {
      const { error } = await supabase.from("subscriptions").insert(payload);
      if (error) { toast({ title: "Erro ao criar", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Assinatura criada!" });
    }
    setShowSubModal(false);
    fetchData();
  };

  const cancelSub = async (id: string) => {
    const { error } = await supabase.from("subscriptions").update({ status: "cancelled" }).eq("id", id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Assinatura cancelada" });
    fetchData();
  };

  // Plan CRUD
  const openNewPlan = () => {
    setEditingPlan(null);
    setPlanName(""); setPlanBadge("Básico"); setPlanPrice(""); setPlanCuts("0"); setPlanBeards("0"); setPlanDiscount("0"); setPlanFeatured(false);
    setShowPlanModal(true);
  };

  const openEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    setPlanName(plan.name); setPlanBadge(plan.badge); setPlanPrice(String(plan.price)); setPlanCuts(String(plan.cuts_per_month)); setPlanBeards(String(plan.beards_per_month)); setPlanDiscount(String(plan.discount_percent)); setPlanFeatured(plan.is_featured);
    setShowPlanModal(true);
  };

  const savePlan = async () => {
    if (!planName || !planPrice) {
      toast({ title: "Preencha nome e preço", variant: "destructive" });
      return;
    }
    const payload = {
      name: planName,
      badge: planBadge,
      price: parseFloat(planPrice),
      cuts_per_month: parseInt(planCuts),
      beards_per_month: parseInt(planBeards),
      discount_percent: parseInt(planDiscount),
      is_featured: planFeatured,
    };

    if (editingPlan) {
      const { error } = await supabase.from("subscription_plans").update(payload).eq("id", editingPlan.id);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Plano atualizado!" });
    } else {
      const { error } = await supabase.from("subscription_plans").insert(payload);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Plano criado!" });
    }
    setShowPlanModal(false);
    fetchData();
  };

  const approveSub = async (id: string) => {
    const { error } = await supabase.from("subscriptions").update({ status: "active" }).eq("id", id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Assinatura aprovada!" });
    fetchData();
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-[hsl(120,40%,92%)] text-[hsl(120,50%,25%)] hover:bg-[hsl(120,40%,88%)]">Pago</Badge>;
      case "pending": return <Badge className="bg-[hsl(40,90%,92%)] text-[hsl(35,90%,30%)] hover:bg-[hsl(40,90%,88%)]">Pendente</Badge>;
      case "overdue": return <Badge className="bg-[hsl(0,70%,95%)] text-[hsl(0,70%,35%)] hover:bg-[hsl(0,70%,90%)]">Atrasado</Badge>;
      case "cancelled": return <Badge variant="secondary">Cancelado</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <AppLayout>
      <main className="flex-1 bg-gradient-to-br from-secondary via-background to-secondary/50 overflow-auto">
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4 pl-12 md:pl-0">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
                  <Layers className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground tracking-tight">Planos e Assinaturas</h1>
                  <p className="text-muted-foreground text-sm">Gerencie os clientes recorrentes e seus benefícios</p>
                </div>
            </div>
            <Button onClick={openNewSub} className="gap-2 rounded-xl shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4" /> Nova Assinatura
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { icon: Users, value: stats.active, label: "Assinantes Ativos" },
              { icon: DollarSign, value: `R$ ${stats.mrr.toLocaleString("pt-BR")}`, label: "MRR (Receita Mensal)" },
              { icon: PieChart, value: `${stats.renewal}%`, label: "Taxa de Renovação" },
              { icon: AlertCircle, value: stats.overdue, label: "Pagamentos Atrasados" },
            ].map((s, i) => (
              <div key={i} className="bg-card rounded-xl shadow-sm p-5 flex items-center gap-4 border border-border/40 hover:shadow-md transition-all hover:-translate-y-0.5">
                <div className="w-11 h-11 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground tracking-tight">{s.value}</div>
                  <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-1 mb-6 border-b border-border/50 bg-secondary/30 rounded-t-xl px-1 pt-1">
            <button
              onClick={() => setActiveTab("subscriptions")}
              className={`flex items-center gap-2 px-5 py-2.5 font-semibold text-sm rounded-t-lg transition-all ${
                activeTab === "subscriptions"
                  ? "bg-card text-foreground shadow-sm border border-border/40 border-b-card -mb-px"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="h-4 w-4" /> Assinantes
            </button>
            <button
              onClick={() => setActiveTab("plans")}
              className={`flex items-center gap-2 px-5 py-2.5 font-semibold text-sm rounded-t-lg transition-all ${
                activeTab === "plans"
                  ? "bg-card text-foreground shadow-sm border border-border/40 border-b-card -mb-px"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="h-4 w-4" /> Planos
            </button>
          </div>

          {/* Tab: Subscriptions */}
          {activeTab === "subscriptions" && (
            <div className="bg-card rounded-xl shadow-sm overflow-hidden border border-border/40">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                    <TableHead className="font-semibold uppercase text-[11px] tracking-wider">Cliente</TableHead>
                    <TableHead className="font-semibold uppercase text-[11px] tracking-wider">Plano</TableHead>
                    <TableHead className="font-semibold uppercase text-[11px] tracking-wider">Próxima Cobrança</TableHead>
                    <TableHead className="font-semibold uppercase text-[11px] tracking-wider">Status</TableHead>
                    <TableHead className="font-semibold uppercase text-[11px] tracking-wider">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : subscriptions.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Nenhuma assinatura cadastrada</TableCell></TableRow>
                  ) : (
                    subscriptions.map((sub) => {
                      return (
                        <TableRow key={sub.id} className="hover:bg-secondary/50">
                          <TableCell className="font-semibold">{sub.client_name}</TableCell>
                          <TableCell>{sub.plan_name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(sub.next_billing_date).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell>{statusBadge(sub.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {sub.status === "pending" && (
                                <button onClick={() => approveSub(sub.id)} className="w-8 h-8 rounded-md bg-[hsl(120,40%,92%)] text-[hsl(120,50%,25%)] hover:bg-[hsl(120,50%,30%)] hover:text-white flex items-center justify-center transition-colors" title="Aprovar">
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <button onClick={() => openEditSub(sub)} className="w-8 h-8 rounded-md bg-[hsl(30,100%,93%)] text-[hsl(30,100%,30%)] hover:bg-[hsl(30,100%,30%)] hover:text-white flex items-center justify-center transition-colors" title="Editar">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => cancelSub(sub.id)} className="w-8 h-8 rounded-md bg-[hsl(0,70%,95%)] text-[hsl(0,70%,35%)] hover:bg-[hsl(0,70%,35%)] hover:text-white flex items-center justify-center transition-colors" title="Cancelar">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Tab: Plans */}
          {activeTab === "plans" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`bg-card rounded-xl p-6 shadow-sm flex flex-col transition-all hover:shadow-md hover:-translate-y-1 ${
                    plan.is_featured ? "border-2 border-primary shadow-md shadow-primary/10 scale-[1.02]" : "border border-border/40"
                  }`}
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-bold text-foreground tracking-tight">{plan.name}</h3>
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wider font-semibold">{plan.badge}</Badge>
                  </div>
                  <div className="flex items-baseline gap-1 mb-5">
                    <span className="text-3xl font-bold text-foreground tracking-tight">R$ {plan.price}</span>
                    <span className="text-xs text-muted-foreground">/mês</span>
                  </div>
                  <div className="flex-1 mb-5 space-y-2.5">
                    <div className="flex items-center gap-2 text-sm">
                      {plan.cuts_per_month > 0 ? (
                        <><Check className="h-4 w-4 text-primary shrink-0" /> {plan.cuts_per_month >= 99 ? "Cortes Ilimitados" : `${plan.cuts_per_month} Cortes/mês`}</>
                      ) : (
                        <><X className="h-4 w-4 text-muted-foreground/40 shrink-0" /> <span className="text-muted-foreground">Sem Corte</span></>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {plan.beards_per_month > 0 ? (
                        <><Check className="h-4 w-4 text-primary shrink-0" /> {plan.beards_per_month >= 99 ? "Barbas Ilimitadas" : `${plan.beards_per_month} Barba/mês`}</>
                      ) : (
                        <><X className="h-4 w-4 text-muted-foreground/40 shrink-0" /> <span className="text-muted-foreground">Sem Barba</span></>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0" /> Desconto {plan.discount_percent}%
                    </div>
                  </div>
                  <Button variant="outline" className="w-full rounded-xl hover:bg-primary hover:text-primary-foreground transition-all" onClick={() => openEditPlan(plan)}>
                    <Pencil className="h-4 w-4 mr-2" /> Editar
                  </Button>
                </div>
              ))}

              <div
                onClick={openNewPlan}
                className="rounded-xl p-6 flex items-center justify-center cursor-pointer border-2 border-dashed border-border/40 bg-secondary/30 hover:border-primary/30 hover:bg-secondary/50 transition-all min-h-[280px]"
              >
                <div className="text-center text-muted-foreground">
                  <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center mx-auto mb-3">
                    <Plus className="h-6 w-6 text-primary/60" />
                  </div>
                  <p className="font-semibold text-sm">Adicionar Novo Plano</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal: Nova/Editar Assinatura */}
        <Dialog open={showSubModal} onOpenChange={setShowSubModal}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-['Poppins']">{editingSub ? "Editar Assinatura" : "Nova Assinatura"}</DialogTitle>
              <DialogDescription>Preencha os dados da assinatura</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Select value={subClientId} onValueChange={setSubClientId}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Plano *</Label>
                <Select value={subPlanId} onValueChange={setSubPlanId}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} - R$ {p.price}/mês</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data de Início *</Label>
                <Input type="date" value={subStartDate} onChange={(e) => setSubStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Método de Pagamento *</Label>
                <Select value={subPaymentMethod} onValueChange={setSubPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="credit">Cartão de Crédito</SelectItem>
                    <SelectItem value="debit">Cartão de Débito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSubModal(false)}>Cancelar</Button>
              <Button onClick={saveSub}>{editingSub ? "Salvar" : "Criar Assinatura"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal: Novo/Editar Plano */}
        <Dialog open={showPlanModal} onOpenChange={setShowPlanModal}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-['Poppins']">{editingPlan ? "Editar Plano" : "Novo Plano"}</DialogTitle>
              <DialogDescription>Configure os detalhes do plano</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="Ex: Plano Gold" />
              </div>
              <div className="space-y-2">
                <Label>Badge</Label>
                <Input value={planBadge} onChange={(e) => setPlanBadge(e.target.value)} placeholder="Ex: Popular" />
              </div>
              <div className="space-y-2">
                <Label>Preço (R$) *</Label>
                <Input type="number" value={planPrice} onChange={(e) => setPlanPrice(e.target.value)} placeholder="120.00" />
              </div>
              <div className="space-y-2">
                <Label>Desconto (%)</Label>
                <Input type="number" value={planDiscount} onChange={(e) => setPlanDiscount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Cortes/mês</Label>
                <Input type="number" value={planCuts} onChange={(e) => setPlanCuts(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Barbas/mês</Label>
                <Input type="number" value={planBeards} onChange={(e) => setPlanBeards(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPlanModal(false)}>Cancelar</Button>
              <Button onClick={savePlan}>{editingPlan ? "Salvar" : "Criar Plano"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </AppLayout>
  );
}
