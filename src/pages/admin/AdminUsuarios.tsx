import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Users, Ban, CheckCircle, Shield, Search, ChevronLeft, ChevronRight, UserX } from "lucide-react";
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

const PER_PAGE = 10;

export default function AdminUsuarios() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"todos" | "ativos" | "inativos">("todos");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { toast } = useToast();

  const filteredUsers = useMemo(() => users.filter((u) => {
    const term = search.toLowerCase();
    const matchesSearch = !term || u.email.toLowerCase().includes(term) || (u.full_name || "").toLowerCase().includes(term);
    if (!matchesSearch) return false;
    if (filter === "todos") return true;
    const isBanned = u.banned_until && new Date(u.banned_until) > new Date();
    return filter === "ativos" ? !isBanned : isBanned;
  }), [users, search, filter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  useEffect(() => { setPage(1); }, [search, filter]);

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
    <div className="space-y-3">
      <header className="rounded-lg border overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-card border-b border-border">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-foreground/70" />
            <h1 className="text-base font-semibold tracking-tight text-foreground">Gerenciar Usuários</h1>
          </div>
          <p className="text-xs/6 text-muted-foreground">Visualize e gerencie o acesso dos usuários do sistema.</p>
        </div>
      </header>

      <Card className="shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
          <div className="relative">
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
            <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <UserX className="h-10 w-10 opacity-40" />
              <p className="text-sm">Nenhum usuário encontrado.</p>
              {(search || filter !== "todos") && (
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setSearch(""); setFilter("todos"); }}>
                  Limpar filtros
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto -mx-6">
                <div className="min-w-[700px] px-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>E-mail</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead className="text-center">Clientes</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Cadastro</TableHead>
                        <TableHead>Último Login</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedUsers.map((u) => {
                        const isBanned = u.banned_until && new Date(u.banned_until) > new Date();
                        const isAdmin = u.role === "admin";
                        return (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium text-sm max-w-[200px] truncate">{u.email}</TableCell>
                            <TableCell className="text-sm">{u.full_name || "—"}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary">{u.clientes_count}</Badge>
                            </TableCell>
                            <TableCell>
                              {isBanned && !isAdmin ? (
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
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(u.created_at).toLocaleDateString("pt-BR")}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString("pt-BR") : "Nunca"}
                            </TableCell>
                            <TableCell className="text-right">
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
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
                  <p className="text-xs text-muted-foreground">
                    Mostrando {((currentPage - 1) * PER_PAGE) + 1}–{Math.min(currentPage * PER_PAGE, filteredUsers.length)} de {filteredUsers.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      disabled={currentPage <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <Button
                        key={p}
                        variant={p === currentPage ? "default" : "outline"}
                        size="sm"
                        className="h-8 w-8 p-0 text-xs"
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      disabled={currentPage >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}