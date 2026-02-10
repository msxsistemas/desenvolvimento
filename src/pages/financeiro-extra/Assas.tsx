import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Key, 
  Copy,
  Webhook,
  ExternalLink,
  XCircle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { useAssas } from "@/hooks/useAssas";

export default function Assas() {
  const [apiKey, setApiKey] = useState("");
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const {
    isConfigured,
    loading,
    configureAsaas,
  } = useAssas();

  // Webhook URL gerada automaticamente
  const webhookUrl = `https://dxxfablfqigoewcfmjzl.supabase.co/functions/v1/asaas-integration`;

  useEffect(() => {
    document.title = "Asaas - Gateway de Pagamentos | Gestor Tech Play";
  }, []);

  const handleConfigureAsaas = async () => {
    if (!apiKey.trim()) {
      toast.error("Por favor, insira o Token do Asaas");
      return;
    }

    const formatAsaasError = (raw: any) => {
      const msg = typeof raw === 'string' ? raw : raw?.message || JSON.stringify(raw);
      if (/Failed to fetch|NetworkError/i.test(msg)) return "Falha de rede ao acessar a função. Verifique sua conexão.";
      if (/Invalid token|Authorization required|401/i.test(msg)) return "Sessão expirada. Faça login novamente.";
      if (/API Key inválida/i.test(msg)) return "Token do Asaas inválido ou sem permissão.";
      return msg;
    };

    setErrorDetails(null);
    const delays = [0, 700, 1500];
    for (let i = 0; i < delays.length; i++) {
      if (delays[i] > 0) await new Promise((r) => setTimeout(r, delays[i]));
      try {
        await configureAsaas(apiKey, webhookUrl);
        setRetryCount(i);
        return;
      } catch (e: any) {
        if (i === delays.length - 1) {
          const friendly = formatAsaasError(e);
          setErrorDetails(friendly);
        }
      }
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  return (
    <main className="container mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">ASAAS</h1>
        <p className="text-muted-foreground text-sm">🏠 / ASAAS</p>
      </header>

      {/* TOKEN API ASAAS */}
      <Card className="border-border">
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              TOKEN API ASAAS
            </h2>
            <p className="text-sm text-muted-foreground">
              Configure seu <span className="text-primary font-medium">Asaas</span> para receber pagamentos dos seus clientes.
            </p>
            <p className="text-sm text-muted-foreground">
              Para obter seu <span className="text-primary font-medium">Token</span>, basta você abrir uma conta no Banco Asaas.
            </p>
          </div>

          <Separator />

          {/* WEBHOOK */}
          <div className="space-y-2">
            <h3 className="text-base font-bold flex items-center gap-2">
              <Webhook className="h-4 w-4 text-primary" />
              RETORNO AUTOMÁTICO - WEBHOOK
            </h3>
            <p className="text-sm text-muted-foreground">
              Configure a URL de retorno automático no sistema da <span className="text-primary font-medium">Asaas</span>
            </p>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">Copie a sua URL</p>
              <code className="text-xs text-primary bg-primary/10 px-2 py-1 rounded break-all">
                {webhookUrl}
              </code>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => copyToClipboard(webhookUrl, "URL do Webhook")}
                className="shrink-0"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copiar
              </Button>
            </div>
          </div>

          <div className="flex justify-center pt-2">
            <Button 
              variant="default"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => window.open("https://www.asaas.com/config/index", "_blank")}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Aprenda a Configurar o Asaas
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* TOKEN INPUT + STATUS */}
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-bold">Cole o seu Token Aqui!</label>
              <Input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmZjY..."
                className="font-mono text-sm"
              />
            </div>
            <div className="flex flex-col items-center gap-1 min-w-[80px]">
              <span className="text-sm font-bold">Status</span>
              {isConfigured ? (
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              ) : (
                <XCircle className="h-8 w-8 text-destructive" />
              )}
              <Badge variant={isConfigured ? "default" : "destructive"} className="text-[10px]">
                {isConfigured ? "ATIVADO" : "DESATIVADO"}
              </Badge>
            </div>
          </div>

          <Button 
            onClick={handleConfigureAsaas}
            disabled={loading}
            className="mt-4 bg-green-600 hover:bg-green-700 text-white"
          >
            {loading ? "Verificando..." : "Atualizar"}
          </Button>

          {errorDetails && (
            <p className="text-sm text-destructive mt-2">{errorDetails}</p>
          )}
        </CardContent>
      </Card>

      {/* WEBHOOK URL CARD */}
      <Card className="border-primary/30">
        <CardContent className="p-6 space-y-3">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Webhook className="h-4 w-4 text-primary" />
            URL do Webhook
          </h3>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={webhookUrl}
              className="font-mono text-sm bg-muted/50"
            />
            <Button
              onClick={() => copyToClipboard(webhookUrl, "URL do Webhook")}
              className="shrink-0 bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            → Adicione esta URL em: Asaas → Configurações → Integrações → Webhooks
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
