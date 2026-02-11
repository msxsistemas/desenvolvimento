import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { CreditCard } from "lucide-react";

interface PlanoInfo {
  nome: string;
  valor: string;
  tipo: string;
  quantidade: string;
  ativo: boolean;
  user_email?: string;
  user_id: string;
}

export default function AdminPlanos() {
  const [planos, setPlanos] = useState<PlanoInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlanos = async () => {
      try {
        // Admin RLS policy allows reading all plans
        const { data } = await supabase
          .from("planos")
          .select("*")
          .order("created_at", { ascending: false });

        if (data) {
          // Get unique user IDs to fetch emails
          const userIds = [...new Set(data.map((p) => p.user_id).filter(Boolean))];
          
          // We need the admin-api to get user emails
          const { data: { session } } = await supabase.auth.getSession();
          const resp = await fetch(
            `https://dxxfablfqigoewcfmjzl.supabase.co/functions/v1/admin-api`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session?.access_token}`,
              },
              body: JSON.stringify({ action: "list_users" }),
            }
          );
          const usersResult = await resp.json();
          const emailMap: Record<string, string> = {};
          usersResult.users?.forEach((u: any) => {
            emailMap[u.id] = u.email;
          });

          setPlanos(
            data.map((p) => ({
              nome: p.nome,
              valor: p.valor,
              tipo: p.tipo || "meses",
              quantidade: p.quantidade || "1",
              ativo: p.ativo ?? true,
              user_id: p.user_id || "",
              user_email: emailMap[p.user_id || ""] || "—",
            }))
          );
        }
      } catch (err) {
        console.error("Failed to fetch planos:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlanos();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Planos do Sistema</h1>
        <p className="text-muted-foreground">Todos os planos cadastrados por usuários</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Planos ({planos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : planos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhum plano cadastrado</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Usuário</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {planos.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{p.nome}</TableCell>
                      <TableCell>R$ {p.valor}</TableCell>
                      <TableCell>
                        {p.quantidade} {p.tipo === "meses" ? "meses" : "dias"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.ativo ? "default" : "secondary"}>
                          {p.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.user_email}</TableCell>
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
