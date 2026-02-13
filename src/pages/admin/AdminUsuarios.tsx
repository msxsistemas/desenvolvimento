import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Users, Ban, CheckCircle, Shield, Search } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  last_sign_in_at: string | null;
  role: string;
  clientes_count: number;
  banned_until: string | null;
}

export default function AdminUsuarios() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"todos" | "ativos" | "inativos">("todos");
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const filteredUsers = users.filter((u) => {
    const term = search.toLowerCase();
    const matchesSearch = !term || u.email.toLowerCase().includes(term) || (u.full_name || "").toLowerCase().includes(term);
    if (!matchesSearch) return false;
    if (filter === "todos") return true;
    const isBanned = u.banned_until && new Date(u.banned_until) > new Date();
    return filter === "ativos" ? !isBanned : isBanned;
  });

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
      <header className="rounded-lg border mb-3 overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-card border-b border-border">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-foreground/70" />
            <h1 className="text-base font-semibold tracking-tight text-foreground">Gerenciar Usuários</h1>
          </div>
          <p className="text-xs/6 text-muted-foreground">Visualize, edite papéis e gerencie o acesso dos usuários do sistema.</p>
        </div>
      </header>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-foreground/70" />
              <CardTitle className="text-sm">Usuários ({filteredUsers.length})</CardTitle>
            </div>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <TabsList className="h-8">
                <TabsTrigger value="todos" className="text-xs px-3 h-7">Todos</TabsTrigger>
                <TabsTrigger value="ativos" className="text-xs px-3 h-7">Ativos</TabsTrigger>
                <TabsTrigger value="inativos" className="text-xs px-3 h-7">Inativos</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <CardDescription>Lista de todos os usuários registrados na plataforma.</CardDescription>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por e-mail ou nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
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
                     <TableHead>Status</TableHead>
                     
                     <TableHead>Cadastro</TableHead>
                     <TableHead>Último Login</TableHead>
                     <TableHead>Ações</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {filteredUsers.map((u) => {
                     const isBanned = u.banned_until && new Date(u.banned_until) > new Date();
                     const isAdmin = u.role === "admin";
                     return (
                     <TableRow key={u.id}>
                       <TableCell className="font-medium text-sm">{u.email}</TableCell>
                       <TableCell className="text-sm">{u.full_name || "—"}</TableCell>
                       <TableCell>
                         <Badge variant="secondary">{u.clientes_count}</Badge>
                       </TableCell>
                       <TableCell>
                         {isAdmin ? (
                           <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
                             <CheckCircle className="h-3 w-3 mr-1" />
                             Ativo
                           </Badge>
                         ) : isBanned ? (
                           <Badge variant="destructive" className="bg-destructive/20 text-destructive border-destructive/30">
                             <Ban className="h-3 w-3 mr-1" />
                             Bloqueado
                           </Badge>
                         ) : (
                           <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
                             <CheckCircle className="h-3 w-3 mr-1" />
                             Ativo
                           </Badge>
                         )}
                       </TableCell>
                       <TableCell className="text-xs text-muted-foreground">
                         {new Date(u.created_at).toLocaleDateString("pt-BR")}
                       </TableCell>
                       <TableCell className="text-xs text-muted-foreground">
                         {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString("pt-BR") : "Nunca"}
                       </TableCell>
                       <TableCell>
                         {isAdmin ? (
                           <span className="text-xs text-muted-foreground italic">Protegido</span>
                         ) : isBanned ? (
                           <Button variant="ghost" size="sm" onClick={() => handleToggleBan(u.id, false)} className="text-green-400 hover:text-green-300 h-8">
                             <CheckCircle className="h-4 w-4 mr-1" />
                             <span className="text-xs">Desbloquear</span>
                           </Button>
                         ) : (
                           <Button variant="ghost" size="sm" onClick={() => handleToggleBan(u.id, true)} className="text-destructive hover:text-destructive h-8">
                             <Ban className="h-4 w-4 mr-1" />
                             <span className="text-xs">Bloquear</span>
                           </Button>
                         )}
                       </TableCell>
                     </TableRow>
                   )})}
                 </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
