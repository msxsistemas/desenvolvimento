import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Users, Search, Trash2, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AdminCliente {
  id: string;
  nome: string;
  whatsapp: string;
  email: string;
  produto: string;
  plano: string;
  fatura: string;
  ativo: boolean;
  data_vencimento: string;
  user_id: string;
  owner_email: string;
  created_at: string;
}

export default function AdminClientes() {
  const [clientes, setClientes] = useState<AdminCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<AdminCliente | null>(null);
  const { toast } = useToast();

  const fetchClientes = async (p = 0) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(
        `https://dxxfablfqigoewcfmjzl.supabase.co/functions/v1/admin-api`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ action: "list_clientes", page: p }),
        }
      );
      const result = await resp.json();
      if (result.success) {
        setClientes(result.clientes);
        setTotal(result.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClientes(page); }, [page]);

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este cliente?")) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`https://dxxfablfqigoewcfmjzl.supabase.co/functions/v1/admin-api`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ action: "delete_cliente", cliente_id: id }),
      });
      toast({ title: "Cliente excluído" });
      fetchClientes(page);
    } catch {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  const filtered = search
    ? clientes.filter(c =>
        c.nome?.toLowerCase().includes(search.toLowerCase()) ||
        c.whatsapp?.includes(search) ||
        c.owner_email?.toLowerCase().includes(search.toLowerCase())
      )
    : clientes;

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gerenciar Clientes</h1>
        <p className="text-muted-foreground">Todos os clientes de todos os usuários ({total})</p>
      </div>

      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, WhatsApp ou dono..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Clientes ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhum cliente encontrado</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Fatura</TableHead>
                    <TableHead>Dono</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.nome}</TableCell>
                      <TableCell>{c.whatsapp}</TableCell>
                      <TableCell>{c.produto || "—"}</TableCell>
                      <TableCell>{c.plano || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={c.ativo ? "default" : "secondary"}>{c.ativo ? "Ativo" : "Inativo"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.fatura === "Pago" ? "default" : "destructive"}>{c.fatura || "—"}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.owner_email}</TableCell>
                      <TableCell className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setSelected(c)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">Página {page + 1} de {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detalhes do Cliente</DialogTitle></DialogHeader>
          {selected && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="font-semibold">Nome:</span> {selected.nome}</div>
              <div><span className="font-semibold">WhatsApp:</span> {selected.whatsapp}</div>
              <div><span className="font-semibold">Email:</span> {selected.email || "—"}</div>
              <div><span className="font-semibold">Produto:</span> {selected.produto || "—"}</div>
              <div><span className="font-semibold">Plano:</span> {selected.plano || "—"}</div>
              <div><span className="font-semibold">Fatura:</span> {selected.fatura || "—"}</div>
              <div><span className="font-semibold">Status:</span> {selected.ativo ? "Ativo" : "Inativo"}</div>
              <div><span className="font-semibold">Vencimento:</span> {selected.data_vencimento ? new Date(selected.data_vencimento).toLocaleDateString("pt-BR") : "—"}</div>
              <div className="col-span-2"><span className="font-semibold">Dono:</span> {selected.owner_email}</div>
              <div className="col-span-2"><span className="font-semibold">Criado em:</span> {new Date(selected.created_at).toLocaleDateString("pt-BR")}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
