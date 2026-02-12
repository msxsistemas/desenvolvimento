import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Wallet, Plus, Pencil, Trash2, Key, Settings, Webhook, ExternalLink, Copy } from "lucide-react";
import { toast as sonnerToast } from "sonner";

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

const provedorLabels: Record<string, string> = {
  asaas: "Asaas",
  mercadopago: "Mercado Pago",
  stripe: "Stripe",
  v3pay: "V3Pay",
  ciabra: "Ciabra",
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

  useEffect(() => {
    document.title = "Gateways | Admin Msx Gestor";
    fetch_();
  }, []);

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    sonnerToast.success("Copiado!");
  };

  const activeGateway = gateways.find(g => g.ativo);

  return (
    <div>
      <header className="rounded-lg border mb-6 overflow-hidden shadow">
        <div className="px-4 py-3 text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                <h1 className="text-base font-semibold tracking-tight">Gateways de Pagamento</h1>
              </div>
              <p className="text-xs/6 opacity-90">Configure os gateways de pagamento globais para cobranças de planos.</p>
            </div>
            <Button onClick={openCreate} size="sm" variant="secondary" className="gap-2">
              <Plus className="h-4 w-4" /> Novo Gateway
            </Button>
          </div>
        </div>
      </header>

      <main className="space-y-4">
        {/* Status Cards */}
        <section className="grid gap-4 md:grid-cols-2">
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-foreground/70" />
                <CardTitle className="text-sm">Gateway Ativo</CardTitle>
              </div>
              <CardDescription>Gateway selecionado para processar pagamentos de assinaturas.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border px-3 py-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">
                  {activeGateway ? provedorLabels[activeGateway.provedor] || activeGateway.provedor : "Nenhum"}
                </span>
                <div className="flex items-center gap-2">
                  <Switch checked={!!activeGateway} disabled />
                  <Badge variant={activeGateway ? "default" : "destructive"}>
                    {activeGateway ? "Ativado" : "Desativado"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Webhook className="h-4 w-4 text-foreground/70" />
                <CardTitle className="text-sm">Webhook URL</CardTitle>
              </div>
              <CardDescription>URL para receber notificações de pagamento do gateway.</CardDescription>
            </CardHeader>
            <CardContent>
              {activeGateway?.webhook_url ? (
                <div className="flex items-center gap-2">
                  <Input readOnly value={activeGateway.webhook_url} className="font-mono text-xs bg-muted/50" />
                  <Button variant="default" size="sm" onClick={() => copyToClipboard(activeGateway.webhook_url!)} className="shrink-0">
                    <Copy className="h-3 w-3 mr-1" /> Copiar
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum webhook configurado.</p>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Gateways Table */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-foreground/70" />
              <CardTitle className="text-sm">Todos os Gateways ({gateways.length})</CardTitle>
            </div>
            <CardDescription>Lista de gateways cadastrados no sistema.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : gateways.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum gateway configurado. Clique em "Novo Gateway" para adicionar.
              </div>
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
                        <TableCell>{provedorLabels[g.provedor] || g.provedor}</TableCell>
                        <TableCell>
                          <Badge variant={g.ambiente === "producao" ? "default" : "secondary"}>{g.ambiente === "producao" ? "Produção" : "Sandbox"}</Badge>
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
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar Gateway" : "Novo Gateway"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Nome</Label><Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Asaas Produção" /></div>
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
            <div><Label>API Key / Token</Label><Input type="password" value={form.api_key_hash || ""} onChange={e => setForm(f => ({ ...f, api_key_hash: e.target.value }))} placeholder="Cole a chave da API aqui" /></div>
            <div><Label>Public Key (opcional)</Label><Input value={form.public_key_hash || ""} onChange={e => setForm(f => ({ ...f, public_key_hash: e.target.value }))} placeholder="Chave pública (se necessário)" /></div>
            <div><Label>Webhook URL</Label><Input value={form.webhook_url || ""} onChange={e => setForm(f => ({ ...f, webhook_url: e.target.value }))} placeholder="https://..." /></div>
            <div className="rounded-md border px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">Ativo</span>
              </div>
              <Switch checked={form.ativo} onCheckedChange={v => setForm(f => ({ ...f, ativo: v }))} />
            </div>
            <Button onClick={handleSave} className="w-full">{editing ? "Salvar Alterações" : "Adicionar Gateway"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
