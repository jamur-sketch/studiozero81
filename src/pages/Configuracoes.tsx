import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Save, Plus, Trash2, Loader2, ExternalLink, CheckCircle2, Settings, User, Scissors, Store, Link2, Download } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

interface Service {
  id: string;
  name: string;
  price: number;
  active: boolean;
  isNew?: boolean;
}

export default function Configuracoes() {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminCheck();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  const [services, setServices] = useState<Service[]>([]);
  const [servicesSaving, setServicesSaving] = useState(false);
  const [servicesLoading, setServicesLoading] = useState(true);

  const [shopName, setShopName] = useState("");
  const [openingHours, setOpeningHours] = useState("");
  const [systemSaving, setSystemSaving] = useState(false);

  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(true);

  const today = new Date().toISOString().split("T")[0];
  const sixMonthsAgo = new Date(Date.now() - 180 * 86400_000).toISOString().split("T")[0];
  const [importFrom, setImportFrom] = useState(sixMonthsAgo);
  const [importTo, setImportTo] = useState(today);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    setEmail(user.email || "");
    supabase.from("profiles").select("full_name").eq("user_id", user.id).single()
      .then(({ data }) => { if (data?.full_name) setFullName(data.full_name); });
  }, [user]);

  useEffect(() => {
    supabase.from("services").select("*").eq("active", true).order("name")
      .then(({ data }) => {
        if (data) setServices(data.map((s) => ({ ...s, price: Number(s.price) })));
        setServicesLoading(false);
      });
  }, []);

  useEffect(() => {
    supabase.from("app_settings").select("key, value").in("key", ["shop_name", "opening_hours"])
      .then(({ data }) => {
        if (data) {
          const nameRow = data.find((r) => r.key === "shop_name");
          const hoursRow = data.find((r) => r.key === "opening_hours");
          if (nameRow) setShopName(nameRow.value);
          if (hoursRow) setOpeningHours(hoursRow.value);
        }
      });
  }, []);

  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
    fetch(`${supabaseUrl}/functions/v1/google-calendar-auth?action=status`)
      .then((r) => r.json())
      .then((d) => setGoogleConnected(!!d.connected))
      .catch(() => setGoogleConnected(false))
      .finally(() => setGoogleLoading(false));
  }, []);

  const handleConnectGoogle = async () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/google-calendar-auth?action=auth-url`);
      const { url } = await res.json();
      window.open(url, "_blank");
    } catch {
      toast.error("Erro ao iniciar conexão com Google Calendar");
    }
  };

  if (adminLoading) {
    return (
      <AppLayout>
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-secondary via-background to-secondary/50">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) return <Navigate to="/home" replace />;

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    try {
      const { error: profileError } = await supabase.from("profiles").update({ full_name: fullName }).eq("user_id", user!.id);
      if (profileError) throw profileError;
      if (newPassword.trim()) {
        const { error: pwError } = await supabase.auth.updateUser({ password: newPassword });
        if (pwError) throw pwError;
        setNewPassword("");
      }
      toast.success("Perfil atualizado com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar perfil");
    } finally {
      setProfileSaving(false);
    }
  };

  const addService = () => {
    setServices([...services, { id: crypto.randomUUID(), name: "", price: 0, active: true, isNew: true }]);
  };

  const updateServiceField = (id: string, field: "name" | "price", value: string | number) => {
    setServices(services.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const removeService = async (id: string, isNew?: boolean) => {
    if (!isNew) {
      const { error } = await supabase.from("services").update({ active: false }).eq("id", id);
      if (error) { toast.error("Erro ao remover serviço"); return; }
    }
    setServices(services.filter((s) => s.id !== id));
    toast.success("Serviço removido");
  };

  const handleSaveServices = async () => {
    setServicesSaving(true);
    try {
      for (const s of services) {
        if (!s.name.trim()) continue;
        if (s.isNew) {
          const { error } = await supabase.from("services").insert({ name: s.name, price: s.price });
          if (error) throw error;
        } else {
          const { error } = await supabase.from("services").update({ name: s.name, price: s.price }).eq("id", s.id);
          if (error) throw error;
        }
      }
      const { data } = await supabase.from("services").select("*").eq("active", true).order("name");
      if (data) setServices(data.map((s) => ({ ...s, price: Number(s.price) })));
      toast.success("Serviços salvos com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar serviços");
    } finally {
      setServicesSaving(false);
    }
  };

  const handleSaveSystem = async () => {
    setSystemSaving(true);
    try {
      const upsertSetting = async (key: string, value: string) => {
        const { data: existing } = await supabase.from("app_settings").select("id").eq("key", key).single();
        if (existing) {
          await supabase.from("app_settings").update({ value }).eq("key", key);
        } else {
          await supabase.from("app_settings").insert({ key, value });
        }
      };
      await upsertSetting("shop_name", shopName);
      await upsertSetting("opening_hours", openingHours);
      toast.success("Configurações do sistema salvas!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar configurações");
    } finally {
      setSystemSaving(false);
    }
  };

  const handleImportCalendar = async () => {
    if (!importFrom || !importTo) {
      toast.error("Selecione o período de importação");
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("google-calendar", {
        body: { action: "import-calendar", dateStart: importFrom, dateEnd: importTo },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setImportResult(data);
      toast.success(`Importação concluída: ${data.imported} agendamentos importados`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao importar");
    } finally {
      setImporting(false);
    }
  };

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";

  return (
    <AppLayout>
      <div className="flex-1 flex flex-col bg-gradient-to-br from-secondary via-background to-secondary/50">
        <header className="bg-card/80 backdrop-blur-sm border-b border-border/50 px-6 md:px-10 py-5">
          <div className="flex items-center gap-4 pl-12 md:pl-0">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
              <Settings className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Configurações</h1>
              <p className="text-sm text-muted-foreground">Gerencie as configurações do sistema</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8 max-w-4xl mx-auto w-full space-y-6">
          <Card className="border-border/40 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Perfil do Usuário</CardTitle>
                  <CardDescription className="text-xs">Atualize suas informações pessoais e senha</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome Completo</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">E-mail</Label>
                  <Input id="email" value={email} disabled className="opacity-50 rounded-xl" />
                </div>
              </div>
              <div className="max-w-sm space-y-2">
                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nova Senha</Label>
                <Input id="password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Deixe em branco para manter" className="rounded-xl" />
              </div>
              <Button onClick={handleSaveProfile} disabled={profileSaving} className="gap-2 rounded-xl">
                {profileSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar Perfil
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/40 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center">
                    <Scissors className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Produtos & Serviços</CardTitle>
                    <CardDescription className="text-xs">Cadastre e gerencie os serviços da barbearia</CardDescription>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={addService} className="gap-1.5 rounded-xl text-xs">
                  <Plus className="h-3.5 w-3.5" /> Adicionar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {servicesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="rounded-xl border border-border/40 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                          <TableHead className="text-xs font-semibold uppercase tracking-wider">Nome do Serviço</TableHead>
                          <TableHead className="w-40 text-xs font-semibold uppercase tracking-wider">Preço (R$)</TableHead>
                          <TableHead className="w-16" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {services.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground py-8 text-sm">
                              Nenhum serviço cadastrado
                            </TableCell>
                          </TableRow>
                        ) : (
                          services.map((s) => (
                            <TableRow key={s.id} className="hover:bg-secondary/30">
                              <TableCell>
                                <Input value={s.name} onChange={(e) => updateServiceField(s.id, "name", e.target.value)} placeholder="Nome do serviço" className="border-0 bg-transparent px-0 focus-visible:ring-0 text-sm" />
                              </TableCell>
                              <TableCell>
                                <Input type="number" step="0.01" min="0" value={s.price} onChange={(e) => updateServiceField(s.id, "price", parseFloat(e.target.value) || 0)} className="border-0 bg-transparent px-0 focus-visible:ring-0 text-sm" />
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" onClick={() => removeService(s.id, s.isNew)} className="text-muted-foreground hover:text-destructive h-8 w-8">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-4">
                    <Button onClick={handleSaveServices} disabled={servicesSaving} className="gap-2 rounded-xl">
                      {servicesSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Salvar Serviços
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/40 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center">
                  <Store className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Configurações do Sistema</CardTitle>
                  <CardDescription className="text-xs">Nome da barbearia e horário de funcionamento</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shopName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome da Barbearia</Label>
                  <Input id="shopName" value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="Ex: Studio Zero81" className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hours" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Horário de Funcionamento</Label>
                  <Input id="hours" value={openingHours} onChange={(e) => setOpeningHours(e.target.value)} placeholder="Ex: Seg-Sáb 09:00 - 20:00" className="rounded-xl" />
                </div>
              </div>
              <Button onClick={handleSaveSystem} disabled={systemSaving} className="gap-2 rounded-xl">
                {systemSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar Configurações
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/40 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center">
                  <Link2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Google Calendar</CardTitle>
                  <CardDescription className="text-xs">Conecte sua agenda do Google para sincronizar agendamentos</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {googleLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Verificando conexão...
                </div>
              ) : googleConnected ? (
                <div className="flex items-center gap-2.5 text-green-600 bg-green-50 px-4 py-3 rounded-xl">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium text-sm">Google Calendar conectado</span>
                </div>
              ) : (
                <Button onClick={handleConnectGoogle} size="lg" className="gap-2 rounded-xl">
                  <ExternalLink className="h-4 w-4" />
                  Conectar Google Calendar
                </Button>
              )}
              <p className="text-xs text-muted-foreground">Conta: estudioo081@gmail.com</p>
            </CardContent>
          </Card>

          {googleConnected && (
            <Card className="border-border/40 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center">
                    <Download className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Importar do Google Calendar</CardTitle>
                    <CardDescription className="text-xs">Traz os agendamentos existentes para o sistema. Agendamentos já importados são ignorados automaticamente.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="importFrom" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">De</Label>
                    <Input id="importFrom" type="date" value={importFrom} onChange={(e) => setImportFrom(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="importTo" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Até</Label>
                    <Input id="importTo" type="date" value={importTo} onChange={(e) => setImportTo(e.target.value)} className="rounded-xl" />
                  </div>
                </div>
                <Button onClick={handleImportCalendar} disabled={importing} className="gap-2 rounded-xl">
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {importing ? "Importando..." : "Importar agendamentos"}
                </Button>
                {importResult && (
                  <div className="text-sm rounded-xl bg-secondary/50 px-4 py-3 space-y-1 border border-border/40">
                    <p><span className="font-semibold text-green-600">{importResult.imported}</span> agendamentos importados</p>
                    <p><span className="font-semibold text-muted-foreground">{importResult.skipped}</span> já existiam (ignorados)</p>
                    {importResult.errors > 0 && <p><span className="font-semibold text-red-500">{importResult.errors}</span> com erro</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="border-border/40 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center">
                  <Link2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Integração</CardTitle>
                  <CardDescription className="text-xs">Informações de conexão do backend</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">URL do Backend (somente leitura)</Label>
                <Input value={supabaseUrl} disabled className="opacity-50 font-mono text-xs rounded-xl" />
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </AppLayout>
  );
}
