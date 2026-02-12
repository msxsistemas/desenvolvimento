import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { Wallet } from "lucide-react";

interface GatewayItem {
  id: string;
  user_id: string;
  owner_email: string;
  is_configured?: boolean;
  gateway?: string;
  gateway_ativo?: string;
  pix_enabled?: boolean;
  credit_card_enabled?: boolean;
  pix_manual_enabled?: boolean;
  created_at: string;
}

interface GatewayData {
  asaas: GatewayItem[];
  mercadopago: GatewayItem[];
  ciabra: GatewayItem[];
  v3pay: GatewayItem[];
  checkout: GatewayItem[];
}

export default function AdminGateways() {
  const [data, setData] = useState<GatewayData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const resp = await fetch(`https://dxxfablfqigoewcfmjzl.supabase.co/functions/v1/admin-api`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ action: "list_gateways" }),
        });
        const result = await resp.json();
        if (result.success) setData(result.gateways);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, []);

  const renderTable = (items: GatewayItem[], gateway: string) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Usuário</TableHead>
          <TableHead>Status</TableHead>
          {gateway === "Checkout" && <TableHead>Gateway Ativo</TableHead>}
          {gateway === "Checkout" && <TableHead>PIX</TableHead>}
          {gateway === "Checkout" && <TableHead>Cartão</TableHead>}
          <TableHead>Criado em</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-4">Nenhuma configuração</TableCell></TableRow>
        ) : items.map(g => (
          <TableRow key={g.id}>
            <TableCell className="text-sm">{g.owner_email}</TableCell>
            <TableCell>
              <Badge variant={g.is_configured !== false ? "default" : "secondary"}>
                {g.is_configured !== false ? "Configurado" : "Pendente"}
              </Badge>
            </TableCell>
            {gateway === "Checkout" && <TableCell className="text-sm">{g.gateway_ativo || "—"}</TableCell>}
            {gateway === "Checkout" && <TableCell><Badge variant={g.pix_enabled ? "default" : "secondary"}>{g.pix_enabled ? "Sim" : "Não"}</Badge></TableCell>}
            {gateway === "Checkout" && <TableCell><Badge variant={g.credit_card_enabled ? "default" : "secondary"}>{g.credit_card_enabled ? "Sim" : "Não"}</Badge></TableCell>}
            <TableCell className="text-xs text-muted-foreground">{new Date(g.created_at).toLocaleDateString("pt-BR")}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const tabs = data ? [
    { key: "asaas", label: `Asaas (${data.asaas.length})`, items: data.asaas },
    { key: "mercadopago", label: `Mercado Pago (${data.mercadopago.length})`, items: data.mercadopago },
    { key: "ciabra", label: `Ciabra (${data.ciabra.length})`, items: data.ciabra },
    { key: "v3pay", label: `V3Pay (${data.v3pay.length})`, items: data.v3pay },
    { key: "checkout", label: `Checkout (${data.checkout.length})`, items: data.checkout },
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gateways de Pagamento</h1>
        <p className="text-muted-foreground">Configurações de gateways de todos os usuários</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" /> Gateways
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : (
            <Tabs defaultValue="asaas">
              <TabsList className="flex-wrap">
                {tabs.map(t => (
                  <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>
                ))}
              </TabsList>
              {tabs.map(t => (
                <TabsContent key={t.key} value={t.key}>
                  {renderTable(t.items, t.key === "checkout" ? "Checkout" : t.label.split(" (")[0])}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
