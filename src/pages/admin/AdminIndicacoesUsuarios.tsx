import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Users, Loader2, Edit, Search } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface UserSummary {
  userId: string;
  nome: string;
  totalIndicacoes: number;
  totalAprovadas: number;
  bonusTotal: number;
  ultimoBonus: number;
}

export default function AdminIndicacoesUsuarios() {
  const [indicacoes, setIndicacoes] = useState<any[]>([]);
  const [loadingIndicacoes, setLoadingIndicacoes] = useState(true);
  const [searchUsers, setSearchUsers] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<{ userId: string; email: string; valor_bonus: number | null; tipo_bonus: string | null } | null>(null);
  const [savingUser, setSavingUser] = useState(false);
  const [tipoBonus, setTipoBonus] = useState("fixo");
  const { toast } = useToast();

  useEffect(() => {
    document.title = "Usuários Indicações | Admin";
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoadingIndicacoes(true);
    try {
      const [{ data: configData }, { data: inds }] = await Promise.all([
        supabase.from("system_indicacoes_config").select("tipo_bonus").eq("id", 1).single(),
        supabase.from("indicacoes").select("*").order("created_at", { ascending: false }),
      ]);
      if (configData?.tipo_bonus) setTipoBonus(configData.tipo_bonus);
      if (!inds?.length) { setIndicacoes([]); setLoadingIndicacoes(false); return; }
      const userIds = [...new Set(inds.map(i => i.user_id))];
      const profileMap = new Map<string, string>();
      if (userIds.length) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, nome_completo").in("user_id", userIds);
        profiles?.forEach(p => profileMap.set(p.user_id, p.nome_completo || "Sem nome"));
      }
      setIndicacoes(inds.map(i => ({ ...i, user_email: profileMap.get(i.user_id) || i.user_id.substring(0, 8) + "..." })));
    } catch (err) { console.error(err); }
    finally { setLoadingIndicacoes(false); }
  };

  const handleSaveUserBonus = async () => {
    if (!editUser) return;
    setSavingUser(true);
    try {
      const { error } = await supabase.from("indicacoes").update({ bonus: editUser.valor_bonus || 0 }).eq("user_id", editUser.userId);
      if (error) throw error;
      toast({ title: "Bônus do usuário atualizado!" });
      setEditDialogOpen(false);
      fetchData();
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
    finally { setSavingUser(false); }
  };

  const userSummaries: UserSummary[] = (() => {
    const map = new Map<string, UserSummary>();
    indicacoes.forEach(ind => {
      const existing = map.get(ind.user_id);
      if (existing) {
        existing.totalIndicacoes += 1;
        if (ind.status === "aprovado" || ind.status === "pago") existing.totalAprovadas += 1;
        existing.bonusTotal += Number(ind.bonus);
        existing.ultimoBonus = Number(ind.bonus);
      } else {
        map.set(ind.user_id, {
          userId: ind.user_id,
          nome: ind.user_email || ind.user_id.substring(0, 8) + "...",
          totalIndicacoes: 1,
          totalAprovadas: (ind.status === "aprovado" || ind.status === "pago") ? 1 : 0,
          bonusTotal: Number(ind.bonus),
          ultimoBonus: Number(ind.bonus),
        });
      }
    });
    return Array.from(map.values());
  })();

  const filteredUsers = userSummaries.filter(u => u.nome.toLowerCase().includes(searchUsers.toLowerCase()));

  const formatBonus = (val: number) =>
    tipoBonus === "percentual" ? `${val.toFixed(2).replace(".", ",")}%` : `R$ ${val.toFixed(2).replace(".", ",")}`;

  return (
    <div className="space-y-4">
      <header className="rounded-lg border overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-card border-b border-border">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-foreground/70" />
            <h1 className="text-base font-semibold tracking-tight text-foreground">Usuários do Sistema</h1>
          </div>
          <p className="text-xs/6 text-muted-foreground">Gerencie o bônus individual de cada usuário.</p>
        </div>
      </header>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-foreground/70" />
              <CardTitle className="text-sm">Usuários com Indicações</CardTitle>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar usuário..." value={searchUsers} onChange={e => setSearchUsers(e.target.value)} className="pl-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingIndicacoes ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-6 text-center"><Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" /><p className="text-sm text-muted-foreground">Nenhum usuário com indicações.</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Total Indicações</TableHead>
                  <TableHead>Aprovadas</TableHead>
                  <TableHead>Bônus Total</TableHead>
                  <TableHead>Valor/Indicação</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map(user => (
                  <TableRow key={user.userId}>
                    <TableCell className="font-medium">{user.nome}</TableCell>
                    <TableCell>{user.totalIndicacoes}</TableCell>
                    <TableCell>{user.totalAprovadas}</TableCell>
                    <TableCell>{formatBonus(user.bonusTotal)}</TableCell>
                    <TableCell>{formatBonus(user.ultimoBonus)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {tipoBonus === "percentual" ? "%" : "R$"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => { setEditUser({ userId: user.userId, email: user.nome, valor_bonus: user.ultimoBonus, tipo_bonus: tipoBonus }); setEditDialogOpen(true); }}>
                        <Edit className="h-3.5 w-3.5" /> Editar Valor
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Bônus do Usuário</DialogTitle>
            <DialogDescription>Altere o valor do bônus para: {editUser?.email}</DialogDescription>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>{tipoBonus === "percentual" ? "Percentual (%)" : "Valor (R$)"}</Label>
                <Input type="number" step="0.01" min="0" value={editUser.valor_bonus || 0} onChange={e => setEditUser(prev => prev ? { ...prev, valor_bonus: Number(e.target.value) } : prev)} />
                <p className="text-xs text-muted-foreground">Tipo atual do programa: {tipoBonus === "percentual" ? "Percentual (%)" : "Valor Fixo (R$)"}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveUserBonus} disabled={savingUser}>{savingUser ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
