import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Plus, Eye, Pencil, Trash2, ChevronLeft, ChevronRight, X, KeyRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import AppLayout from "@/components/AppLayout";
import { getOwingBookings } from "@/features/financeiro/api";
import { toast } from "@/hooks/use-toast";

interface Client {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  last_booking_date: string | null;
  user_id: string | null;
  created_at: string;
}

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(25);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [owingIds, setOwingIds] = useState<Set<string>>(new Set());
  const [owingNames, setOwingNames] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchClients();
    getOwingBookings().then((rows) => {
      setOwingIds(new Set(rows.filter((r) => r.client_id).map((r) => r.client_id as string)));
      setOwingNames(new Set(rows.map((r) => r.client_name.trim().toLowerCase())));
    });
  }, []);

  const clientOwes = (client: Client) =>
    owingIds.has(client.id) || owingNames.has(client.name.trim().toLowerCase());

  async function fetchClients() {
    setLoading(true);
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("name");

    if (!error && data) {
      setClients(data as Client[]);
    }
    setLoading(false);
  }

  type ClientStatus = "active" | "inactive" | "new";

  const getStatus = (client: Client): ClientStatus => {
    if (!client.last_booking_date) return "new";
    const lastDate = new Date(client.last_booking_date);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return lastDate >= thirtyDaysAgo ? "active" : "inactive";
  };

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q));

    if (statusFilter === "all") return matchesSearch;
    return matchesSearch && getStatus(c) === statusFilter;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, itemsPerPage]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("pt-BR");
  };

  const resetForm = () => {
    setFormName("");
    setFormPhone("");
    setFormEmail("");
    setTempPassword("");
    setEditMode(false);
    setSelectedClient(null);
  };

  const openAddModal = () => {
    resetForm();
    setAddModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setFormName(client.name);
    setFormPhone(client.phone || "");
    setFormEmail(client.email || "");
    setEditMode(true);
    setSelectedClient(client);
    setAddModalOpen(true);
  };

  const openViewModal = (client: Client) => {
    setSelectedClient(client);
    setViewModalOpen(true);
  };

  const openDeleteModal = (client: Client) => {
    setSelectedClient(client);
    setDeleteModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);

    if (editMode && selectedClient) {
      const { error } = await supabase
        .from("clients")
        .update({ name: formName, phone: formPhone || null, email: formEmail || null })
        .eq("id", selectedClient.id);

      if (error) {
        toast({ title: "Erro ao atualizar cliente", variant: "destructive" });
      } else {
        toast({ title: "Cliente atualizado com sucesso" });
        setAddModalOpen(false);
        resetForm();
        fetchClients();
      }
    } else {
      const { error } = await supabase
        .from("clients")
        .insert({ name: formName, phone: formPhone || null, email: formEmail || null });

      if (error) {
        toast({ title: "Erro ao cadastrar cliente", variant: "destructive" });
      } else {
        toast({ title: "Cliente cadastrado com sucesso" });
        setAddModalOpen(false);
        resetForm();
        fetchClients();
      }
    }
    setSaving(false);
  };

  const [resetting, setResetting] = useState(false);
  const [tempPassword, setTempPassword] = useState("");

  const handleSetTempPassword = async () => {
    if (!selectedClient) return;
    if (tempPassword.trim().length < 6) {
      toast({ title: "A senha temporária precisa ter pelo menos 6 caracteres", variant: "destructive" });
      return;
    }
    setResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-set-client-password", {
        body: { clientId: selectedClient.id, tempPassword: tempPassword.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title: "Senha temporária definida!",
        description: "Passe essa senha ao cliente. No próximo acesso ele será obrigado a criar uma nova senha.",
      });
      setTempPassword("");
    } catch (err: any) {
      toast({ title: "Erro ao definir senha", description: err.message, variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedClient) return;
    const { error } = await supabase.from("clients").delete().eq("id", selectedClient.id);
    if (error) {
      toast({ title: "Erro ao excluir cliente", variant: "destructive" });
    } else {
      toast({ title: "Cliente excluído com sucesso" });
      setDeleteModalOpen(false);
      setSelectedClient(null);
      fetchClients();
    }
  };

  return (
    <AppLayout>
      <div className="flex-1 flex flex-col bg-secondary">
        <header className="bg-card border-b border-border px-6 md:px-10 py-5">
          <div className="flex items-center justify-between">
            <div className="pl-12 md:pl-0">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                Gestão de Clientes
              </h1>
              <p className="text-muted-foreground mt-1">
                Gerencie todos os clientes do Studio Zero81
              </p>
            </div>
            <Button onClick={openAddModal} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Cliente
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, telefone ou email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filtrar status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="new">Cliente Novo</SelectItem>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="inactive">Inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              <p className="text-muted-foreground text-center py-10">Carregando...</p>
            ) : filtered.length === 0 ? (
              <p className="text-muted-foreground text-center py-10">
                Nenhum cliente encontrado.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="uppercase text-xs tracking-wider font-semibold">Nome</TableHead>
                        <TableHead className="uppercase text-xs tracking-wider font-semibold">Telefone</TableHead>
                        <TableHead className="uppercase text-xs tracking-wider font-semibold">E-mail</TableHead>
                        <TableHead className="uppercase text-xs tracking-wider font-semibold">Último Agendamento</TableHead>
                        <TableHead className="uppercase text-xs tracking-wider font-semibold">Status</TableHead>
                        <TableHead className="uppercase text-xs tracking-wider font-semibold text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginated.map((client) => (
                        <TableRow key={client.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-semibold text-foreground">
                            {client.name}
                            {client.user_id && (
                              <Badge variant="outline" className="ml-2 text-[10px] py-0">
                                Cadastrado
                              </Badge>
                            )}
                            {clientOwes(client) && (
                              <Badge className="ml-2 text-[10px] py-0 bg-red-100 text-red-700 border-red-200">
                                Devendo
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{client.phone || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{client.email || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(client.last_booking_date)}</TableCell>
                          <TableCell>
                            <StatusBadge status={getStatus(client)} />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => openViewModal(client)}
                                className="w-9 h-9 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-colors"
                                title="Visualizar"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => openEditModal(client)}
                                className="w-9 h-9 rounded-md bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white flex items-center justify-center transition-colors"
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => openDeleteModal(client)}
                                className="w-9 h-9 rounded-md bg-red-50 text-red-600 hover:bg-red-600 hover:text-white flex items-center justify-center transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between p-4 border-t border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Exibir</span>
                    <Select value={String(itemsPerPage)} onValueChange={(v) => setItemsPerPage(Number(v))}>
                      <SelectTrigger className="w-[80px] h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAGE_SIZE_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={String(opt)}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground">por página</span>
                    <span className="text-sm text-muted-foreground ml-4">
                      Total: <span className="font-semibold text-foreground">{filtered.length}</span> cliente{filtered.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Página {currentPage} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Próximo
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editMode ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
            <DialogDescription>
              {editMode ? "Atualize os dados do cliente." : "Preencha os dados para cadastrar um novo cliente."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input id="name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nome completo" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">WhatsApp</Label>
                <Input id="phone" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="(81) 99999-9999" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>

            {editMode && (
              <div className="border-t border-border/60 pt-4">
                <Label className="mb-1.5 block">Acesso do cliente</Label>
                {selectedClient?.user_id ? (
                  <>
                    <div className="flex items-end gap-2">
                      <div className="flex-1 space-y-1.5">
                        <Label htmlFor="tempPassword" className="text-xs text-muted-foreground">
                          Senha temporária
                        </Label>
                        <Input
                          id="tempPassword"
                          type="text"
                          value={tempPassword}
                          onChange={(e) => setTempPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                        />
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleSetTempPassword}
                        disabled={resetting}
                        className="gap-2 shrink-0"
                      >
                        <KeyRound className="h-4 w-4" />
                        {resetting ? "Definindo..." : "Definir"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Defina uma senha temporária e passe ao cliente. No próximo acesso ele será obrigado a criar uma nova senha. Nenhum e-mail é enviado.
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Este cliente ainda não criou uma conta de acesso, então não há senha para redefinir.
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : editMode ? "Atualizar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detalhes do Cliente</DialogTitle>
            <DialogDescription>Informações completas do cliente.</DialogDescription>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-6 py-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-2">
                  Informações Pessoais
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome</p>
                    <p className="text-foreground">{selectedClient.name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">WhatsApp</p>
                    <p className="text-foreground">{selectedClient.phone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">E-mail</p>
                    <p className="text-foreground">{selectedClient.email || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</p>
                    <StatusBadge status={getStatus(selectedClient)} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</p>
                    <p className="text-foreground">{selectedClient.user_id ? "Cadastrado no portal" : "Adicionado manualmente"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cadastro</p>
                    <p className="text-foreground">{formatDate(selectedClient.created_at)}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-2">
                  Estatísticas
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 rounded-lg p-4 text-center border-t-2 border-foreground">
                    <p className="text-2xl font-bold text-foreground">{formatDate(selectedClient.last_booking_date)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Último Agendamento</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 text-center border-t-2 border-foreground">
                    <p className="text-2xl font-bold text-foreground">{formatDate(selectedClient.created_at)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Cliente Desde</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Cliente</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir <strong>{selectedClient?.name}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function StatusBadge({ status }: { status: "active" | "inactive" | "new" }) {
  if (status === "new") {
    return (
      <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
        Cliente Novo
      </Badge>
    );
  }
  if (status === "active") {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
        Ativo
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
      Inativo
    </Badge>
  );
}
