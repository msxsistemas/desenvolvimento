import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Key, 
  Copy,
  Webhook,
  ExternalLink,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function MercadoPago() {
  const [accessToken, setAccessToken] = useState("");
  const [isConfigured, setIsConfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const webhookUrl = `https://dxxfablfqigoewcfmjzl.supabase.co/functions/v1/mercadopago-integration`;

  useEffect(() => {
    document.title = "Mercado Pago - Gateway de Pagamentos | Gestor Tech Play";
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data } = await (supabase as any)
        .from('mercadopago_config')
        .select('*')
        .eq('is_configured', true)
        .maybeSingle();
      if (data) setIsConfigured(true);
    } catch (e) {
      console.error('Erro ao carregar config MP:', e);
    }
  };

  const handleConfigure = async () => {
    if (!accessToken.trim()) {
      toast.error("Por favor, insira o Access Token do Mercado Pago");
      return;
    }

    setErrorDetails(null);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mercadopago-integration', {
        body: { action: 'configure', accessToken, webhookUrl }
      });

      if (error) throw error;
      if (data?.success) {
        setIsConfigured(true);
        toast.success('Mercado Pago configurado com sucesso!');
      } else {
        throw new Error(data?.error || 'Erro ao configurar Mercado Pago');
      }
    } catch (e: any) {
      const msg = e?.message || 'Erro desconhecido';
      setErrorDetails(msg);
      toast.error(`Erro: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  return (
    <div>
      <header className="rounded-lg border mb-6 overflow-hidden shadow" aria-label="Configuração do Mercado Pago">
        <div className="px-4 py-3 text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" aria-hidden="true" />
            <h1 className="text-base font-semibold tracking-tight">Configuração do Mercado Pago</h1>
          </div>
          <p className="text-xs/6 opacity-90">Configure seu gateway de pagamentos Mercado Pago para receber pagamentos dos seus clientes.</p>
        </div>
      </header>

      <main className="space-y-4">
        <section className="grid gap-4 md:grid-cols-2">
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Webhook className="h-4 w-4 text-foreground/70" />
                <CardTitle className="text-sm">Webhook URL</CardTitle>
              </div>
              <CardDescription>
                Copie esta URL e adicione no painel do Mercado Pago em: Sua Aplicação → Webhooks → Notificações IPN.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Input readOnly value={webhookUrl} className="font-mono text-xs bg-muted/50" />
                <Button variant="default" size="sm" onClick={() => copyToClipboard(webhookUrl, "URL do Webhook")} className="shrink-0">
                  <Copy className="h-3 w-3 mr-1" />
                  Copiar
                </Button>
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
                Acesse o painel Mercado Pago → Seu Negócio → Configurações → Credenciais para obter seu Access Token.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border px-3 py-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Status Gateway</span>
                <div className="flex items-center gap-2">
                  <Switch checked={isConfigured} disabled />
                  <Badge variant={isConfigured ? "default" : "destructive"}>
                    {isConfigured ? "Ativado" : "Desativado"}
                  </Badge>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={() => window.open("https://www.mercadopago.com.br/developers/panel/app", "_blank")}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Abrir Painel do Mercado Pago
              </Button>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-foreground/70" />
                <CardTitle className="text-sm">Access Token Mercado Pago</CardTitle>
              </div>
              <CardDescription>
                Cole o Access Token de produção do Mercado Pago abaixo para ativar a integração.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Input
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="APP_USR-0000000000000000-000000-00000000000000000000000000000000-000000000"
                  className="font-mono text-sm"
                />
                {errorDetails && (
                  <p className="text-sm text-destructive">{errorDetails}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div>
                  <p className="text-sm font-medium">Finalizar Configuração</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Clique em "Ativar Mercado Pago" para validar seu token e ativar o gateway de pagamentos.
                  </p>
                </div>
                <Button size="lg" onClick={handleConfigure} disabled={loading}>
                  {loading ? "Verificando..." : "Ativar Mercado Pago"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}