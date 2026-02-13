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

const provedorDescriptions: Record<string, string> = {
  asaas: "Configure o gateway Asaas para processar pagamentos de assinaturas.",
  mercadopago: "Configure o gateway Mercado Pago para processar pagamentos de assinaturas.",
  stripe: "Configure o gateway Stripe para processar pagamentos de assinaturas.",
  v3pay: "Configure o gateway V3Pay para processar pagamentos PIX, cartão e boleto.",
  ciabra: "Configure o gateway Ciabra Invoice para processar pagamentos de assinaturas.",
};

const provedorWebhookDescriptions: Record<string, string> = {
  asaas: "Copie esta URL e adicione no painel do Asaas em: Configurações → Integrações → Webhooks.",
  mercadopago: "Copie esta URL e adicione no painel do Mercado Pago em: Sua Aplicação → Webhooks → Notificações IPN.",
  stripe: "Copie esta URL e adicione no painel do Stripe em: Developers → Webhooks.",
  v3pay: "Copie esta URL e adicione no painel V3Pay para receber notificações de pagamento.",
  ciabra: "Copie esta URL e adicione na plataforma Ciabra em: Integração → Webhooks.",
};

const provedorDocsDescriptions: Record<string, string> = {
  asaas: "Acesse o painel Asaas → Configurações → Integrações → API para obter sua chave.",
  mercadopago: "Acesse o painel Mercado Pago → Seu Negócio → Configurações → Credenciais para obter seu Access Token.",
  stripe: "Acesse o painel Stripe → Developers → API Keys para obter sua chave secreta.",
  v3pay: "Acesse o painel V3Pay para obter seu token de API.",
  ciabra: "Acesse a plataforma Ciabra → Integração → API Keys para obter sua chave de API.",
};

const provedorDocsUrls: Record<string, string> = {
  asaas: "https://www.asaas.com/config/index",
  mercadopago: "https://www.mercadopago.com.br/developers/panel/app",
  stripe: "https://dashboard.stripe.com/apikeys",
  v3pay: "https://app.v3pay.com.br",
  ciabra: "https://plataforma.ciabra.com.br",
};

const provedorDocsButtonLabels: Record<string, string> = {
  asaas: "Abrir Configurações do Asaas",
  mercadopago: "Abrir Painel do Mercado Pago",
  stripe: "Abrir Dashboard Stripe",
  v3pay: "Abrir Painel V3Pay",
  ciabra: "Abrir Plataforma Ciabra",
};

const provedorTokenLabels: Record<string, string> = {
  asaas: "Token API Asaas",
  mercadopago: "Access Token Mercado Pago",
  stripe: "Secret Key Stripe",
  v3pay: "Token API V3Pay",
  ciabra: "Chaves de API Ciabra",
};

const provedorTokenDescriptions: Record<string, string> = {
  asaas: "Cole o token da API do Asaas abaixo para ativar a integração com o gateway de pagamentos.",
  mercadopago: "Cole o Access Token de produção do Mercado Pago abaixo para ativar a integração.",
  stripe: "Cole a Secret Key do Stripe abaixo para ativar a integração.",
  v3pay: "Cole o token da API do V3Pay abaixo para ativar a integração.",
  ciabra: "Acesse a plataforma Ciabra → Integração → Chave da API para obter sua Chave Pública e Chave Secreta.",
};

const provedorTokenPlaceholders: Record<string, string> = {
  asaas: "$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmZjY...",
  mercadopago: "APP_USR-0000000000000000-000000-00000000000000000000000000000000-000000000",
  stripe: "sk_live_...",
  v3pay: "Seu token Bearer da API V3Pay...",
  ciabra: "sk_live_...",
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
  const isCiabra = provider === "ciabra";

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

  const copyToClipboard = (text: string, copyLabel: string) => {
    navigator.clipboard.writeText(text);
    sonnerToast.success(`${copyLabel} copiado!`);
  };

  const set = (key: keyof GatewayData, value: any) =>
    setGateway((g) => (g ? { ...g, [key]: value } : g));

  if (loading) return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;

  return (
    <div>
      <header className="rounded-lg border mb-6 overflow-hidden shadow" aria-label={`Configuração do ${label}`}>
        <div className="px-4 py-3 text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" aria-hidden="true" />
            <h1 className="text-base font-semibold tracking-tight">Configuração do {label}</h1>
          </div>
          <p className="text-xs/6 opacity-90">{provedorDescriptions[provider || ""] || `Configure o gateway ${label} para processar pagamentos.`}</p>
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
          {/* Top row: Webhook + Status/Docs */}
          <section className="grid gap-4 md:grid-cols-2">
            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Webhook className="h-4 w-4 text-foreground/70" />
                  <CardTitle className="text-sm">Webhook URL</CardTitle>
                </div>
                <CardDescription>
                  {provedorWebhookDescriptions[provider || ""] || "URL para receber notificações de pagamento."}
                </CardDescription>
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
                    <Button variant="default" size="sm" onClick={() => copyToClipboard(gateway.webhook_url!, "URL do Webhook")} className="shrink-0">
                      <Copy className="h-3 w-3 mr-1" />
                      Copiar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-foreground/70" />
                  <CardTitle className="text-sm">Documentação</CardTitle>
                </div>
                <CardDescription>
                  {provedorDocsDescriptions[provider || ""] || "Acesse o painel do provedor para obter suas credenciais."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border px-3 py-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Status Gateway</span>
                  <div className="flex items-center gap-2">
                    <Switch checked={gateway.ativo} onCheckedChange={(v) => set("ativo", v)} />
                    <Badge variant={gateway.ativo ? "default" : "destructive"}>
                      {gateway.ativo ? "Ativado" : "Desativado"}
                    </Badge>
                  </div>
                </div>
                {provedorDocsUrls[provider || ""] && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => window.open(provedorDocsUrls[provider || ""], "_blank")}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    {provedorDocsButtonLabels[provider || ""] || `Abrir Painel ${label}`}
                  </Button>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Bottom: Credentials */}
          <section>
            <Card className="shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-foreground/70" />
                  <CardTitle className="text-sm">{provedorTokenLabels[provider || ""] || "Credenciais"}</CardTitle>
                </div>
                <CardDescription>
                  {provedorTokenDescriptions[provider || ""] || `Chaves de API e configurações de autenticação do ${label}.`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {isCiabra ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Chave Pública</label>
                        <Input
                          value={gateway.public_key_hash || ""}
                          onChange={(e) => set("public_key_hash", e.target.value)}
                          placeholder="pk_live_..."
                          className="font-mono text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Chave Secreta</label>
                        <Input
                          type="password"
                          value={gateway.api_key_hash || ""}
                          onChange={(e) => set("api_key_hash", e.target.value)}
                          placeholder="sk_live_..."
                          className="font-mono text-sm"
                        />
                      </div>
                    </div>
                  ) : (
                    <Input
                      type="password"
                      value={gateway.api_key_hash || ""}
                      onChange={(e) => set("api_key_hash", e.target.value)}
                      placeholder={provedorTokenPlaceholders[provider || ""] || "Cole a chave da API aqui"}
                      className="font-mono text-sm"
                    />
                  )}
                </div>
                <div className="space-y-3 mt-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Nome</Label>
                      <Input value={gateway.nome} onChange={(e) => set("nome", e.target.value)} placeholder={`Ex: ${label} Produção`} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Ambiente</Label>
                      <Select value={gateway.ambiente} onValueChange={(v) => set("ambiente", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sandbox">Sandbox</SelectItem>
                          <SelectItem value="producao">Produção</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div className="flex justify-center border-t pt-4 mt-4">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? "Salvando..." : `Salvar ${label}`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </main>
      )}
    </div>
  );
}
