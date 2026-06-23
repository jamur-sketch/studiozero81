import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { externalSupabase } from "@/lib/external-supabase";
import { Search, Plus, Eye, Pencil, Trash2, ChevronLeft, ChevronRight, X } from "lucide-react";
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
import { toast } from "@/hooks/use-toast";

interface Client {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  ultimo_agendamento: string | null;
}

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(25);

  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    setLoading(true);
    const { data, error } = await externalSupabase
      .from("clientes")
      .select("*")
      .order("nome");

    if (!error && data) {
      setClients(data);
    }
    setLoading(false);
  }

  const isActive = (client: Client) => {
    if (!client.ultimo_agendamento) return false;
    const lastDate = new Date(client.ultimo_agendamento);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return lastDate >= thirtyDaysAgo;
  };

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      c.nome.toLowerCase().includes(q) ||
      (c.telefone && c.telefone.includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q));

    if (statusFilter === "active") return matchesSearch && isActive(c);
    if (statusFilter === "inactive") return matchesSearch && !isActive(c);
    return matchesSearch;
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
    setFormNotes("");
    setEditMode(false);
    setSelectedClient(null);
  };

  const openAddModal = () => {
    resetForm();
    setAddModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setFormName(client.nome);
    setFormPhone(client.telefone || "");
    setFormEmail(client.email || "");
    setFormNotes("");
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
      const { error } = await externalSupabase
        .from("clientes")
        .update({ nome: formName, telefone: formPhone || null, email: formEmail || null })
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
      const { error } = await externalSupabase
        .from("clientes")
        .insert({ nome: formName, telefone: formPhone || null, email: formEmail || null });

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

  const handleDelete = async () => {
    if (!selectedClient) return;
    const { error } = await externalSupabase.from("clientes").delete().eq("id", selectedClient.id);
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
        {/* Header */}
        <header className="bg-card border-b border-border px-6 md:px-10 py-5">
          <div className="flex items-center justify-between">
            <div>
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
            {/* Search & Filters */}
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
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="inactive">Inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Table */}
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
                          <TableCell className="font-semibold text-foreground">{client.nome}</TableCell>
                          <TableCell className="text-muted-foreground">{client.telefone || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{client.email || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(client.ultimo_agendamento)}</TableCell>
                          <TableCell>
                            {isActive(client) ? (
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                                Ativo
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
                                Inativo
                              </Badge>
                            )}
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

                {/* Pagination */}
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

      {/* Add/Edit Client Modal */}
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
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea id="notes" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Observações sobre o cliente..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : editMode ? "Atualizar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Client Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detalhes do Cliente</DialogTitle>
            <DialogDescription>Informações completas do cliente.</DialogDescription>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-6 py-4">
              {/* Info */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-2">
                  Informações Pessoais
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome</p>
                    <p className="text-foreground">{selectedClient.nome}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">WhatsApp</p>
                    <p className="text-foreground">{selectedClient.telefone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">E-mail</p>
                    <p className="text-foreground">{selectedClient.email || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</p>
                    {isActive(selectedClient) ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Ativo</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">Inativo</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-2">
                  Estatísticas
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-muted/50 rounded-lg p-4 text-center border-t-2 border-foreground">
                    <p className="text-2xl font-bold text-foreground">—</p>
                    <p className="text-xs text-muted-foreground mt-1">Total de Visitas</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 text-center border-t-2 border-foreground">
                    <p className="text-2xl font-bold text-foreground">{formatDate(selectedClient.ultimo_agendamento)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Última Visita</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 text-center border-t-2 border-foreground">
                    <p className="text-2xl font-bold text-foreground">—</p>
                    <p className="text-xs text-muted-foreground mt-1">Ticket Médio</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Cliente</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir <strong>{selectedClient?.nome}</strong>? Esta ação não pode ser desfeita.
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
