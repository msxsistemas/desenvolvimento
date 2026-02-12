import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import { MessageSquare } from "lucide-react";

interface MsgPadrao {
  id: number;
  user_id: string;
  owner_email: string;
  confirmacao_cliente: string | null;
  expiracao_app: string | null;
  aniversario_cliente: string | null;
  bem_vindo: string | null;
  vencido: string | null;
  vence_hoje: string | null;
  proximo_vencer: string | null;
  fatura_criada: string | null;
  confirmacao_pagamento: string | null;
  dados_cliente: string | null;
  updated_at: string | null;
}

const MSG_FIELDS = [
  { key: "bem_vindo", label: "Boas-vindas" },
  { key: "confirmacao_cliente", label: "Confirmação" },
  { key: "confirmacao_pagamento", label: "Conf. Pagamento" },
  { key: "vencido", label: "Vencido" },
  { key: "vence_hoje", label: "Vence Hoje" },
  { key: "proximo_vencer", label: "Próximo Vencer" },
  { key: "fatura_criada", label: "Fatura Criada" },
  { key: "expiracao_app", label: "Expiração App" },
  { key: "aniversario_cliente", label: "Aniversário" },
  { key: "dados_cliente", label: "Dados Cliente" },
];

export default function AdminMensagens() {
  const [mensagens, setMensagens] = useState<MsgPadrao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const resp = await fetch(`https://dxxfablfqigoewcfmjzl.supabase.co/functions/v1/admin-api`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ action: "list_mensagens_padroes" }),
        });
        const result = await resp.json();
        if (result.success) setMensagens(result.mensagens);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, []);

  const truncate = (s: string | null) => s ? (s.length > 60 ? s.slice(0, 60) + "..." : s) : "—";

  const configuredCount = (m: MsgPadrao) =>
    MSG_FIELDS.filter(f => (m as any)[f.key]).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mensagens Padrões</h1>
        <p className="text-muted-foreground">Mensagens configuradas por cada usuário do sistema</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" /> Configurações de Mensagens ({mensagens.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : mensagens.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhuma configuração encontrada</div>
          ) : (
            <div className="space-y-4">
              {mensagens.map(m => (
                <Card key={m.id} className="border">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{m.owner_email}</CardTitle>
                      <span className="text-xs text-muted-foreground">{configuredCount(m)}/{MSG_FIELDS.length} configuradas</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                      {MSG_FIELDS.map(f => (
                        <div key={f.key} className="p-2 rounded bg-muted/50">
                          <span className="font-semibold">{f.label}:</span>
                          <p className="text-muted-foreground mt-0.5">{truncate((m as any)[f.key])}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
