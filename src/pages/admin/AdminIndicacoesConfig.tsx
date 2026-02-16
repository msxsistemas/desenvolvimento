import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Settings, DollarSign, Users, Loader2, Edit, Search, Share2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface IndicacoesConfig {
  ativo: boolean;
  valor_bonus: number;
  tipo_bonus: string;
  descricao: string | null;
}

interface UserSummary {
  userId: string;
  nome: string;
  totalIndicacoes: number;
  totalAprovadas: number;
  bonusTotal: number;
  ultimoBonus: number;
}

export default function AdminIndicacoesConfig() {
  const [config, setConfig] = useState<IndicacoesConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [indicacoes, setIndicacoes] = useState<any[]>([]);
  const [loadingIndicacoes, setLoadingIndicacoes] = useState(true);
  const [searchUsers, setSearchUsers] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<{ userId: string; email: string; valor_bonus: number | null; tipo_bonus: string | null } | null>(null);
  const [savingUser, setSavingUser] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    document.title = "Configurações Indicações | Admin";
    fetchConfig();
    fetchIndicacoes();
  }, []);

  const fetchConfig = async () => {
    const { data } = await supabase.from("system_indicacoes_config").select("*").eq("id", 1).single();
    if (data) setConfig(data as IndicacoesConfig);
    setLoading(false);
  };

  const fetchIndicacoes = async () => {
    setLoadingIndicacoes(true);
    try {
      const { data: inds } = await supabase.from("indicacoes").select("*").order("created_at", { ascending: false });
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

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await supabase.from("system_indicacoes_config").update({
        ativo: config.ativo, valor_bonus: config.valor_bonus, tipo_bonus: config.tipo_bonus, descricao: config.descricao,
      }).eq("id", 1);
      toast({ title: "Configurações salvas!" });
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleSaveUserBonus = async () => {
    if (!editUser) return;
    setSavingUser(true);
    try {
      const { error } = await supabase.from("indicacoes").update({ bonus: editUser.valor_bonus || 0 }).eq("user_id", editUser.userId);
      if (error) throw error;
      toast({ title: "Bônus do usuário atualizado!" });
      setEditDialogOpen(false);
      fetchIndicacoes();
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
    finally { setSavingUser(false); }
  };

  const set = (key: keyof IndicacoesConfig, value: any) => setConfig(c => c ? { ...c, [key]: value } : c);

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

  if (loading) return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  if (!config) return <div className="text-center py-8 text-muted-foreground">Erro ao carregar configurações</div>;

  return (
    <div className="space-y-4">
      <header className="rounded-lg border overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-card border-b border-border">
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-foreground/70" />
            <h1 className="text-base font-semibold tracking-tight text-foreground">Configurações do Programa</h1>
          </div>
          <p className="text-xs/6 text-muted-foreground">Configure o programa de indicações do sistema.</p>
        </div>
      </header>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-foreground/70" />
            <CardTitle className="text-sm">Status do Programa</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border px-3 py-2 flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">Programa Ativo</span>
              <p className="text-xs text-muted-foreground">Permitir que usuários indiquem e ganhem bônus</p>
            </div>
            <Switch checked={config.ativo} onCheckedChange={v => set("ativo", v)} />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-foreground/70" />
            <CardTitle className="text-sm">Valores do Bônus (Padrão)</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tipo de Bônus</Label>
              <Select value={config.tipo_bonus} onValueChange={v => set("tipo_bonus", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixo">Valor Fixo (R$)</SelectItem>
                  <SelectItem value="percentual">Percentual (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{config.tipo_bonus === "fixo" ? "Valor do Bônus (R$)" : "Percentual do Bônus (%)"}</Label>
              <Input type="number" step="0.01" min="0" value={config.valor_bonus} onChange={e => set("valor_bonus", Number(e.target.value))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Descrição do Programa</Label>
            <Input value={config.descricao || ""} onChange={e => set("descricao", e.target.value)} placeholder="Indique amigos e ganhe bônus..." />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center pt-2">
        <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar Configurações"}</Button>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-foreground/70" />
              <CardTitle className="text-sm">Usuários do Sistema</CardTitle>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar usuário..." value={searchUsers} onChange={e => setSearchUsers(e.target.value)} className="pl-8" />
            </div>
          </div>
          <CardDescription>Gerencie o bônus individual de cada usuário.</CardDescription>
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
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map(user => (
                  <TableRow key={user.userId}>
                    <TableCell className="font-medium">{user.nome}</TableCell>
                    <TableCell>{user.totalIndicacoes}</TableCell>
                    <TableCell>{user.totalAprovadas}</TableCell>
                    <TableCell>
                      {config.tipo_bonus === "percentual" ? `${user.bonusTotal.toFixed(2).replace(".", ",")}%` : `R$ ${user.bonusTotal.toFixed(2).replace(".", ",")}`}
                    </TableCell>
                    <TableCell>
                      {config.tipo_bonus === "percentual" ? `${user.ultimoBonus.toFixed(2).replace(".", ",")}%` : `R$ ${user.ultimoBonus.toFixed(2).replace(".", ",")}`}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => { setEditUser({ userId: user.userId, email: user.nome, valor_bonus: user.ultimoBonus, tipo_bonus: config.tipo_bonus }); setEditDialogOpen(true); }}>
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
                <Label>Tipo de Bônus</Label>
                <Select value={editUser.tipo_bonus || "fixo"} onValueChange={v => setEditUser(prev => prev ? { ...prev, tipo_bonus: v } : prev)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixo">Valor Fixo (R$)</SelectItem>
                    <SelectItem value="percentual">Percentual (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{editUser.tipo_bonus === "percentual" ? "Percentual (%)" : "Valor (R$)"}</Label>
                <Input type="number" step="0.01" min="0" value={editUser.valor_bonus || 0} onChange={e => setEditUser(prev => prev ? { ...prev, valor_bonus: Number(e.target.value) } : prev)} />
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
