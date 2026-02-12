import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { DollarSign } from "lucide-react";

interface Transacao {
  id: string;
  valor: number;
  tipo: string;
  descricao: string;
  data_transacao: string;
  user_id: string;
  owner_email: string;
  created_at: string;
}

export default function AdminTransacoes() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const resp = await fetch(`https://dxxfablfqigoewcfmjzl.supabase.co/functions/v1/admin-api`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ action: "list_transacoes" }),
        });
        const result = await resp.json();
        if (result.success) setTransacoes(result.transacoes);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, []);

  const totalReceita = transacoes.filter(t => t.tipo === "receita" || t.tipo === "entrada").reduce((s, t) => s + Number(t.valor), 0);
  const totalDespesa = transacoes.filter(t => t.tipo === "despesa" || t.tipo === "saida").reduce((s, t) => s + Number(t.valor), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transações Financeiras</h1>
        <p className="text-muted-foreground">Todas as transações de todos os usuários</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Receitas</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">R$ {totalReceita.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Despesas</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-600">R$ {totalDespesa.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Saldo</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">R$ {(totalReceita - totalDespesa).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Transações ({transacoes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : transacoes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhuma transação encontrada</div>
          ) : (
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transacoes.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs">{t.owner_email}</TableCell>
                      <TableCell className="text-sm">{t.descricao}</TableCell>
                      <TableCell>
                        <Badge variant={(t.tipo === "receita" || t.tipo === "entrada") ? "default" : "destructive"}>
                          {t.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">R$ {Number(t.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{t.data_transacao ? new Date(t.data_transacao).toLocaleDateString("pt-BR") : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
