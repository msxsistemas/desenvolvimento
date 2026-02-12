import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Key, Copy, Webhook, ExternalLink, Settings } from "lucide-react";
import { toast as sonnerToast } from "sonner";

const provedorLabels: Record<string, string> = {
  asaas: "Asaas",
  mercadopago: "Mercado Pago",
  stripe: "Stripe",
  v3pay: "V3Pay",
  ciabra: "Ciabra",
};

interface GatewayData {
  id: string;
  nome: string;
  provedor: string;
  ativo: boolean;
  ambiente: string;
  api_key_hash: string | null;
  public_key_hash: string | null;
  webhook_url: string | null;
}

export default function AdminGatewayConfig() {
  const { provider } = useParams<{ provider: string }>();
  const [gateway, setGateway] = useState<GatewayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const label = provedorLabels[provider || ""] || provider || "";

  useEffect(() => {
    document.title = `${label} | Admin Gateways`;
    const fetch_ = async () => {
      const { data } = await supabase
        .from("system_gateways")
        .select("*")
        .eq("provedor", provider)
        .maybeSingle();
      if (data) setGateway(data as GatewayData);
      setLoading(false);
    };
    fetch_();
  }, [provider]);

  const handleSave = async () => {
    if (!gateway) return;
    setSaving(true);
    try {
      const { id, ...payload } = gateway;
      if (id) {
        await supabase.from("system_gateways").update(payload).eq("id", id);
        toast({ title: "Gateway atualizado!" });
      } else {
        const { data } = await supabase.from("system_gateways").insert({ ...payload, provedor: provider! }).select().single();
        if (data) setGateway(data as GatewayData);
        toast({ title: "Gateway criado!" });
      }
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = () => {
    setGateway({
      id: "",
      nome: label,
      provedor: provider || "",
      ativo: false,
      ambiente: "sandbox",
      api_key_hash: "",
      public_key_hash: "",
      webhook_url: "",
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    sonnerToast.success("Copiado!");
  };

  const set = (key: keyof GatewayData, value: any) =>
    setGateway((g) => (g ? { ...g, [key]: value } : g));

  if (loading) return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;

  return (
    <div>
      <header className="rounded-lg border mb-6 overflow-hidden shadow">
        <div className="px-4 py-3 text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <h1 className="text-base font-semibold tracking-tight">Configuração do {label}</h1>
          </div>
          <p className="text-xs/6 opacity-90">Configure o gateway {label} para processar pagamentos de assinaturas.</p>
        </div>
      </header>

      {!gateway ? (
        <Card className="shadow-sm">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">Nenhuma configuração encontrada para {label}.</p>
            <Button onClick={handleCreate}>Configurar {label}</Button>
          </CardContent>
        </Card>
      ) : (
        <main className="space-y-4">
          <section className="grid gap-4 md:grid-cols-2">
            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Webhook className="h-4 w-4 text-foreground/70" />
                  <CardTitle className="text-sm">Webhook URL</CardTitle>
                </div>
                <CardDescription>URL para receber notificações de pagamento.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Input
                    value={gateway.webhook_url || ""}
                    onChange={(e) => set("webhook_url", e.target.value)}
                    placeholder="https://..."
                    className="font-mono text-xs"
                  />
                  {gateway.webhook_url && (
                    <Button variant="default" size="sm" onClick={() => copyToClipboard(gateway.webhook_url!)} className="shrink-0">
                      <Copy className="h-3 w-3 mr-1" /> Copiar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-foreground/70" />
                  <CardTitle className="text-sm">Status</CardTitle>
                </div>
                <CardDescription>Status e ambiente do gateway.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-md border px-3 py-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Gateway</span>
                  <div className="flex items-center gap-2">
                    <Switch checked={gateway.ativo} onCheckedChange={(v) => set("ativo", v)} />
                    <Badge variant={gateway.ativo ? "default" : "destructive"}>
                      {gateway.ativo ? "Ativado" : "Desativado"}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>Ambiente</Label>
                  <Select value={gateway.ambiente} onValueChange={(v) => set("ambiente", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox</SelectItem>
                      <SelectItem value="producao">Produção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </section>

          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-foreground/70" />
                <CardTitle className="text-sm">Credenciais</CardTitle>
              </div>
              <CardDescription>Chaves de API e configurações de autenticação do {label}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input value={gateway.nome} onChange={(e) => set("nome", e.target.value)} placeholder={`Ex: ${label} Produção`} />
              </div>
              <div>
                <Label>API Key / Token</Label>
                <Input
                  type="password"
                  value={gateway.api_key_hash || ""}
                  onChange={(e) => set("api_key_hash", e.target.value)}
                  placeholder="Cole a chave da API aqui"
                  className="font-mono text-sm"
                />
              </div>
              <div>
                <Label>Public Key (opcional)</Label>
                <Input
                  value={gateway.public_key_hash || ""}
                  onChange={(e) => set("public_key_hash", e.target.value)}
                  placeholder="Chave pública (se necessário)"
                  className="font-mono text-sm"
                />
              </div>
              <div className="flex justify-center border-t pt-4 mt-2">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar Configurações"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      )}
    </div>
  );
}
