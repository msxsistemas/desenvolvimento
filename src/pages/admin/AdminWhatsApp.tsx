import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { Smartphone } from "lucide-react";

interface Session {
  id: string;
  session_id: string;
  user_id: string;
  owner_email: string;
  status: string;
  phone_number: string | null;
  device_name: string | null;
  last_activity: string | null;
  created_at: string;
}

export default function AdminWhatsApp() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const resp = await fetch(`https://dxxfablfqigoewcfmjzl.supabase.co/functions/v1/admin-api`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ action: "list_whatsapp_sessions" }),
        });
        const result = await resp.json();
        if (result.success) setSessions(result.sessions);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, []);

  const statusColor = (s: string) => {
    if (s === "connected") return "default";
    if (s === "connecting") return "secondary";
    return "destructive";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sessões WhatsApp</h1>
        <p className="text-muted-foreground">Sessões de WhatsApp de todos os usuários</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Smartphone className="h-5 w-5" /> Sessões ({sessions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhuma sessão encontrada</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Dispositivo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Última Atividade</TableHead>
                    <TableHead>Criado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="text-sm">{s.owner_email}</TableCell>
                      <TableCell>{s.phone_number || "—"}</TableCell>
                      <TableCell>{s.device_name || "—"}</TableCell>
                      <TableCell><Badge variant={statusColor(s.status || "")}>{s.status}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{s.last_activity ? new Date(s.last_activity).toLocaleString("pt-BR") : "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString("pt-BR")}</TableCell>
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
