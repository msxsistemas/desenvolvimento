import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Users, Ban, CheckCircle, Shield } from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  last_sign_in_at: string | null;
  role: string;
  clientes_count: number;
}

export default function AdminUsuarios() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
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
      const result = await resp.json();
      if (result.success) setUsers(result.users);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Usuários | Admin Msx Gestor";
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(
        `https://dxxfablfqigoewcfmjzl.supabase.co/functions/v1/admin-api`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ action: "set_role", target_user_id: userId, role }),
        }
      );
      toast({ title: "Papel atualizado com sucesso" });
      fetchUsers();
    } catch {
      toast({ title: "Erro ao atualizar papel", variant: "destructive" });
    }
  };

  const handleToggleBan = async (userId: string, ban: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(
        `https://dxxfablfqigoewcfmjzl.supabase.co/functions/v1/admin-api`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ action: "toggle_user_ban", target_user_id: userId, ban }),
        }
      );
      toast({ title: ban ? "Usuário bloqueado" : "Usuário desbloqueado" });
      fetchUsers();
    } catch {
      toast({ title: "Erro ao alterar status", variant: "destructive" });
    }
  };

  return (
    <div>
      <header className="rounded-lg border mb-6 overflow-hidden shadow">
        <div className="px-4 py-3 text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <h1 className="text-base font-semibold tracking-tight">Gerenciar Usuários</h1>
          </div>
          <p className="text-xs/6 opacity-90">Visualize, edite papéis e gerencie o acesso dos usuários do sistema.</p>
        </div>
      </header>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-foreground/70" />
              <CardTitle className="text-sm">Usuários ({users.length})</CardTitle>
            </div>
          </div>
          <CardDescription>Lista de todos os usuários registrados na plataforma.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Clientes</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead>Último Login</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium text-sm">{u.email}</TableCell>
                      <TableCell className="text-sm">{u.full_name || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{u.clientes_count}</Badge>
                      </TableCell>
                      <TableCell>
                        <Select value={u.role} onValueChange={(val) => handleRoleChange(u.id, val)}>
                          <SelectTrigger className="w-28 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">Usuário</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString("pt-BR") : "Nunca"}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleToggleBan(u.id, true)} className="text-destructive hover:text-destructive h-8">
                          <Ban className="h-4 w-4" />
                        </Button>
                      </TableCell>
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
