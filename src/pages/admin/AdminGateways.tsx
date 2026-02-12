import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Wallet, Pencil, Trash2, Key, Settings, Webhook, Copy } from "lucide-react";
import { toast as sonnerToast } from "sonner";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

interface SystemGateway {
  id: string;
  nome: string;
  provedor: string;
  ativo: boolean;
  ambiente: string;
  webhook_url: string | null;
}

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
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetch_ = async () => {
    const { data } = await supabase.from("system_gateways").select("*").order("created_at");
    if (data) setGateways(data as SystemGateway[]);
    setLoading(false);
  };

  useEffect(() => {
    document.title = "Gateways | Admin Msx Gestor";
    fetch_();
  }, []);

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
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            <h1 className="text-base font-semibold tracking-tight">Gateways de Pagamento</h1>
          </div>
          <p className="text-xs/6 opacity-90">Configure os gateways de pagamento globais para cobranças de planos.</p>
        </div>
      </header>

      <main className="space-y-4">
        <section className="grid gap-4 md:grid-cols-2">
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-foreground/70" />
                <CardTitle className="text-sm">Gateway Ativo</CardTitle>
              </div>
              <CardDescription>Gateway selecionado para processar pagamentos.</CardDescription>
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
              <CardDescription>URL para receber notificações de pagamento.</CardDescription>
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
                Nenhum gateway configurado. Use o submenu para configurar um gateway.
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
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/gateways/${g.provedor}`)}><Pencil className="h-4 w-4" /></Button>
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
    </div>
  );
}
