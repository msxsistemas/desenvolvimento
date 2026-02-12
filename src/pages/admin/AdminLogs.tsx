import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { ScrollText } from "lucide-react";

interface LogItem {
  id: string;
  user_id: string;
  owner_email: string;
  acao?: string;
  evento?: string;
  tipo?: string;
  nivel?: string;
  componente?: string;
  created_at: string;
}

export default function AdminLogs() {
  const [painelLogs, setPainelLogs] = useState<LogItem[]>([]);
  const [sistemaLogs, setSistemaLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const [r1, r2] = await Promise.all([
          fetch(`https://dxxfablfqigoewcfmjzl.supabase.co/functions/v1/admin-api`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
            body: JSON.stringify({ action: "list_logs", tipo: "painel" }),
          }),
          fetch(`https://dxxfablfqigoewcfmjzl.supabase.co/functions/v1/admin-api`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
            body: JSON.stringify({ action: "list_logs", tipo: "sistema" }),
          }),
        ]);
        const d1 = await r1.json();
        const d2 = await r2.json();
        if (d1.success) setPainelLogs(d1.logs);
        if (d2.success) setSistemaLogs(d2.logs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, []);

  const nivelColor = (n: string) => {
    if (n === "error") return "destructive";
    if (n === "warning" || n === "warn") return "secondary";
    return "default";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Logs do Sistema</h1>
        <p className="text-muted-foreground">Logs de todos os usuários</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ScrollText className="h-5 w-5" /> Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : (
            <Tabs defaultValue="painel">
              <TabsList>
                <TabsTrigger value="painel">Painel ({painelLogs.length})</TabsTrigger>
                <TabsTrigger value="sistema">Sistema ({sistemaLogs.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="painel">
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Ação</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {painelLogs.map(l => (
                        <TableRow key={l.id}>
                          <TableCell className="text-xs">{l.owner_email}</TableCell>
                          <TableCell className="text-sm max-w-xs truncate">{l.acao}</TableCell>
                          <TableCell><Badge variant="secondary">{l.tipo}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-BR")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              <TabsContent value="sistema">
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Evento</TableHead>
                        <TableHead>Componente</TableHead>
                        <TableHead>Nível</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sistemaLogs.map(l => (
                        <TableRow key={l.id}>
                          <TableCell className="text-xs">{l.owner_email}</TableCell>
                          <TableCell className="text-sm max-w-xs truncate">{l.evento}</TableCell>
                          <TableCell className="text-xs">{l.componente}</TableCell>
                          <TableCell><Badge variant={nivelColor(l.nivel || "info")}>{l.nivel}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-BR")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
