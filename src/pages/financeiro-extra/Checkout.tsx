import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, QrCode, Settings, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAssas } from "@/hooks/useAssas";
import { useV3Pay } from "@/hooks/useV3Pay";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface GatewayInfo {
  id: string;
  label: string;
  configured: boolean;
}

export default function Checkout() {
  const { toast } = useToast();
  const { isConfigured: asaasConfigured } = useAssas();
  const { isConfigured: v3payConfigured } = useV3Pay();
  const { user } = useCurrentUser();
  const [pixEnabled, setPixEnabled] = useState(false);
  const [creditCardEnabled, setCreditCardEnabled] = useState(false);
  const [pixManualEnabled, setPixManualEnabled] = useState(false);
  const [pixManualKey, setPixManualKey] = useState("");
  const [gatewayAtivo, setGatewayAtivo] = useState("asaas");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [ciabraConfigured, setCiabraConfigured] = useState(false);
  const [mercadoPagoConfigured, setMercadoPagoConfigured] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    loadConfiguration();
    checkGatewayConfigs();
  }, [user?.id]);

  const checkGatewayConfigs = async () => {
    if (!user?.id) return;
    const [ciabra, mp] = await Promise.all([
      supabase.from('ciabra_config').select('is_configured').eq('user_id', user.id).maybeSingle(),
      supabase.from('mercadopago_config').select('is_configured').eq('user_id', user.id).maybeSingle(),
    ]);
    setCiabraConfigured(!!(ciabra.data as any)?.is_configured);
    setMercadoPagoConfigured(!!(mp.data as any)?.is_configured);
  };

  const loadConfiguration = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('checkout_config')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Erro ao carregar configurações:', error);
        return;
      }

      if (data) {
        setPixEnabled(data.pix_enabled);
        setCreditCardEnabled(data.credit_card_enabled);
        setPixManualEnabled(data.pix_manual_enabled);
        setPixManualKey(data.pix_manual_key || "");
        setGatewayAtivo((data as any).gateway_ativo || "asaas");
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Checkout – Pagamentos | Gestor IPTV";
  }, []);

  const gateways: GatewayInfo[] = [
    { id: "asaas", label: "Asaas", configured: asaasConfigured },
    { id: "mercadopago", label: "Mercado Pago", configured: mercadoPagoConfigured },
    { id: "ciabra", label: "Ciabra", configured: ciabraConfigured },
    { id: "v3pay", label: "V3Pay", configured: v3payConfigured },
  ];

  const configuredGateways = gateways.filter(g => g.configured);

  useEffect(() => {
    if (configuredGateways.length > 0 && !configuredGateways.find(g => g.id === gatewayAtivo)) {
      setGatewayAtivo(configuredGateways[0].id);
    }
  }, [asaasConfigured, v3payConfigured, ciabraConfigured, mercadoPagoConfigured]);

  const handleSave = async () => {
    if (!user?.id) {
      toast({ title: "Erro", description: "Você precisa estar logado para salvar as configurações.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const configData = {
        user_id: user.id,
        pix_enabled: pixEnabled && configuredGateways.length > 0,
        credit_card_enabled: creditCardEnabled,
        pix_manual_enabled: pixManualEnabled,
        pix_manual_key: pixManualEnabled ? pixManualKey.trim() || null : null,
        gateway_ativo: gatewayAtivo,
      };

      const { error } = await supabase
        .from('checkout_config')
        .upsert(configData as any, { onConflict: 'user_id', ignoreDuplicates: false });

      if (error) {
        console.error('Erro ao salvar:', error);
        toast({ title: "Erro", description: "Erro ao salvar configurações. Tente novamente.", variant: "destructive" });
        return;
      }

      toast({ title: "Configurações salvas", description: "As preferências do checkout foram atualizadas com sucesso." });
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({ title: "Erro", description: "Erro ao salvar configurações. Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <header className="rounded-lg border mb-6 overflow-hidden shadow" aria-label="Configuração do Checkout">
        <div className="px-4 py-3 text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" aria-hidden="true" />
            <h1 className="text-base font-semibold tracking-tight">Configuração do Checkout</h1>
          </div>
          <p className="text-xs/6 opacity-90">Configure os métodos de pagamento disponíveis para seus clientes.</p>
        </div>
      </header>

      <main className="space-y-4">
        {/* Gateway Ativo + Status */}
        <section className="grid gap-4 md:grid-cols-2">
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-foreground/70" />
                <CardTitle className="text-sm">Gateway Ativo</CardTitle>
              </div>
              <CardDescription>
                Selecione qual gateway será usado para gerar cobranças PIX automaticamente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {configuredGateways.length === 0 ? (
                <div className="rounded-md border px-3 py-2">
                  <p className="text-sm text-muted-foreground">
                    Nenhum gateway configurado. Configure pelo menos um para habilitar pagamentos.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <a href="/configuracoes/asaas" className="text-xs text-primary underline">Asaas</a>
                    <a href="/configuracoes/mercado-pago" className="text-xs text-primary underline">Mercado Pago</a>
                    <a href="/configuracoes/ciabra" className="text-xs text-primary underline">Ciabra</a>
                    <a href="/configuracoes/v3pay" className="text-xs text-primary underline">V3Pay</a>
                  </div>
                </div>
              ) : (
                <Select value={gatewayAtivo} onValueChange={setGatewayAtivo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o gateway" />
                  </SelectTrigger>
                  <SelectContent>
                    {configuredGateways.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-foreground/70" />
                <CardTitle className="text-sm">Status dos Gateways</CardTitle>
              </div>
              <CardDescription>
                Veja quais gateways estão configurados e qual está ativo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {gateways.map((g) => (
                  <Badge
                    key={g.id}
                    variant={g.configured ? (g.id === gatewayAtivo ? "default" : "secondary") : "outline"}
                    className="text-xs"
                  >
                    {g.label}: {g.configured ? (g.id === gatewayAtivo ? "✅ Ativo" : "Configurado") : "Não configurado"}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* PIX Automático */}
        <section>
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <QrCode className="h-4 w-4 text-foreground/70" />
                <CardTitle className="text-sm">PIX Automático</CardTitle>
              </div>
              <CardDescription>
                Habilite o PIX automático usando o gateway ativo selecionado acima.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border px-3 py-2 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">PIX Automático</span>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={pixEnabled}
                    onCheckedChange={setPixEnabled}
                    id="pix-toggle"
                    disabled={configuredGateways.length === 0}
                  />
                  <Badge variant={pixEnabled ? "default" : "destructive"}>
                    {pixEnabled ? "Habilitado" : "Desabilitado"}
                  </Badge>
                </div>
              </div>
              {pixEnabled && configuredGateways.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  ✅ PIX ativo via <strong>{gateways.find(g => g.id === gatewayAtivo)?.label}</strong>
                </p>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Cartão de Crédito */}
        <section>
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-foreground/70" />
                <CardTitle className="text-sm">Cartão de Crédito</CardTitle>
              </div>
              <CardDescription>
                Configure o provedor utilizado para processar pagamentos com cartão de crédito.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border px-3 py-2 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Cartão de Crédito</span>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={creditCardEnabled}
                    onCheckedChange={setCreditCardEnabled}
                    id="credit-card-toggle"
                  />
                  <Badge variant={creditCardEnabled ? "default" : "destructive"}>
                    {creditCardEnabled ? "Habilitado" : "Desabilitado"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Salvar */}
        <section>
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div>
                  <p className="text-sm font-medium">Finalizar Configuração</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Clique em "Salvar Configurações" para aplicar as mudanças.
                  </p>
                </div>
                <Button size="lg" onClick={handleSave} disabled={loading}>
                  {loading ? "Salvando..." : "Salvar Configurações"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
