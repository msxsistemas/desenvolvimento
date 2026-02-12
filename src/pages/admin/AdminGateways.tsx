import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Wallet, Plus, Pencil, Trash2 } from "lucide-react";

interface SystemGateway {
  id: string;
  nome: string;
  provedor: string;
  ativo: boolean;
  ambiente: string;
  api_key_hash: string | null;
  public_key_hash: string | null;
  webhook_url: string | null;
  configuracoes: Record<string, any>;
}

const emptyGw: Omit<SystemGateway, "id"> = {
  nome: "", provedor: "asaas", ativo: false, ambiente: "sandbox",
  api_key_hash: "", public_key_hash: "", webhook_url: "", configuracoes: {},
};

export default function AdminGateways() {
  const [gateways, setGateways] = useState<SystemGateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SystemGateway | null>(null);
  const [form, setForm] = useState(emptyGw);
  const { toast } = useToast();

  const fetch_ = async () => {
    const { data } = await supabase.from("system_gateways").select("*").order("created_at");
    if (data) setGateways(data as SystemGateway[]);
    setLoading(false);
  };

  useEffect(() => { fetch_(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyGw); setDialogOpen(true); };
  const openEdit = (g: SystemGateway) => { setEditing(g); setForm({ ...g }); setDialogOpen(true); };

  const handleSave = async () => {
    try {
      if (editing) {
        await supabase.from("system_gateways").update(form).eq("id", editing.id);
        toast({ title: "Gateway atualizado!" });
      } else {
        await supabase.from("system_gateways").insert(form);
        toast({ title: "Gateway adicionado!" });
      }
      setDialogOpen(false);
      fetch_();
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este gateway?")) return;
    await supabase.from("system_gateways").delete().eq("id", id);
    toast({ title: "Gateway excluído" });
    fetch_();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gateways do Sistema</h1>
          <p className="text-muted-foreground">Configure os gateways de pagamento globais da plataforma</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Novo Gateway</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /> Gateways ({gateways.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : gateways.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhum gateway configurado</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Provedor</TableHead>
                    <TableHead>Ambiente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Webhook</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gateways.map(g => (
                    <TableRow key={g.id}>
                      <TableCell className="font-medium">{g.nome}</TableCell>
                      <TableCell className="capitalize">{g.provedor}</TableCell>
                      <TableCell>
                        <Badge variant={g.ambiente === "producao" ? "default" : "secondary"}>{g.ambiente}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={g.ativo ? "default" : "secondary"}>{g.ativo ? "Ativo" : "Inativo"}</Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{g.webhook_url || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(g)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(g.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar Gateway" : "Novo Gateway"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Nome</Label><Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></div>
              <div>
                <Label>Provedor</Label>
                <Select value={form.provedor} onValueChange={v => setForm(f => ({ ...f, provedor: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asaas">Asaas</SelectItem>
                    <SelectItem value="mercadopago">Mercado Pago</SelectItem>
                    <SelectItem value="stripe">Stripe</SelectItem>
                    <SelectItem value="v3pay">V3Pay</SelectItem>
                    <SelectItem value="ciabra">Ciabra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Ambiente</Label>
              <Select value={form.ambiente} onValueChange={v => setForm(f => ({ ...f, ambiente: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox</SelectItem>
                  <SelectItem value="producao">Produção</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>API Key</Label><Input type="password" value={form.api_key_hash || ""} onChange={e => setForm(f => ({ ...f, api_key_hash: e.target.value }))} /></div>
            <div><Label>Public Key</Label><Input value={form.public_key_hash || ""} onChange={e => setForm(f => ({ ...f, public_key_hash: e.target.value }))} /></div>
            <div><Label>Webhook URL</Label><Input value={form.webhook_url || ""} onChange={e => setForm(f => ({ ...f, webhook_url: e.target.value }))} /></div>
            <div className="flex items-center gap-2">
              <Switch checked={form.ativo} onCheckedChange={v => setForm(f => ({ ...f, ativo: v }))} />
              <Label>Ativo</Label>
            </div>
            <Button onClick={handleSave} className="w-full">{editing ? "Salvar" : "Adicionar Gateway"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
