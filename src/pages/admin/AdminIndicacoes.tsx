import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Share2, DollarSign, Settings, Users, Loader2, Edit, Search } from "lucide-react";

interface IndicacoesConfig {
  ativo: boolean;
  valor_bonus: number;
  tipo_bonus: string;
  descricao: string | null;
}

interface IndicacaoRow {
  id: string;
  user_id: string;
  cliente_indicado_id: string | null;
  codigo_indicacao: string;
  bonus: number;
  status: string;
  created_at: string;
  user_email?: string;
  cliente_nome?: string;
}

interface UserBonusConfig {
  userId: string;
  email: string;
  valor_bonus: number | null;
  tipo_bonus: string | null;
}

export default function AdminIndicacoes() {
  const [config, setConfig] = useState<IndicacoesConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [indicacoes, setIndicacoes] = useState<IndicacaoRow[]>([]);
  const [loadingIndicacoes, setLoadingIndicacoes] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editUser, setEditUser] = useState<UserBonusConfig | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    document.title = "Indicações | Admin";
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
      // Fetch all indicacoes (admin has access via RLS or service role)
      const { data: inds, error } = await supabase
        .from("indicacoes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!inds?.length) {
        setIndicacoes([]);
        setLoadingIndicacoes(false);
        return;
      }

      // Resolve user emails and client names
      const userIds = [...new Set(inds.map(i => i.user_id))];
      const clienteIds = [...new Set(inds.map(i => i.cliente_indicado_id).filter(Boolean))] as string[];

      // Fetch profiles for user names
      const profileMap = new Map<string, string>();
      if (userIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, nome_completo")
          .in("user_id", userIds);
        profiles?.forEach(p => profileMap.set(p.user_id, p.nome_completo || "Sem nome"));
      }

      // Fetch client names
      const clienteMap = new Map<string, string>();
      if (clienteIds.length) {
        const { data: clientes } = await supabase
          .from("clientes")
          .select("id, nome")
          .in("id", clienteIds);
        clientes?.forEach(c => clienteMap.set(c.id, c.nome));
      }

      const resolved: IndicacaoRow[] = inds.map(i => ({
        ...i,
        user_email: profileMap.get(i.user_id) || i.user_id.substring(0, 8) + "...",
        cliente_nome: i.cliente_indicado_id ? (clienteMap.get(i.cliente_indicado_id) || "-") : "-",
      }));

      setIndicacoes(resolved);
    } catch (err) {
      console.error("Erro ao carregar indicações:", err);
    } finally {
      setLoadingIndicacoes(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await supabase.from("system_indicacoes_config").update({
        ativo: config.ativo,
        valor_bonus: config.valor_bonus,
        tipo_bonus: config.tipo_bonus,
        descricao: config.descricao,
      }).eq("id", 1);
      toast({ title: "Configurações de indicação salvas!" });
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("indicacoes").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    } else {
      toast({ title: "Status atualizado!" });
      fetchIndicacoes();
    }
  };

  const handleEditUserBonus = (ind: IndicacaoRow) => {
    setEditUser({
      userId: ind.user_id,
      email: ind.user_email || "",
      valor_bonus: ind.bonus,
      tipo_bonus: config?.tipo_bonus || "fixo",
    });
    setEditDialogOpen(true);
  };

  const handleSaveUserBonus = async () => {
    if (!editUser) return;
    setSavingUser(true);
    try {
      // Update all indicacoes for this user with the new bonus value
      const { error } = await supabase
        .from("indicacoes")
        .update({ bonus: editUser.valor_bonus || 0 })
        .eq("user_id", editUser.userId);

      if (error) throw error;
      toast({ title: "Bônus do usuário atualizado!" });
      setEditDialogOpen(false);
      fetchIndicacoes();
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSavingUser(false);
    }
  };

  const set = (key: keyof IndicacoesConfig, value: any) => setConfig(c => c ? { ...c, [key]: value } : c);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "aprovado":
        return <Badge className="bg-green-500/10 text-green-500">Aprovado</Badge>;
      case "pago":
        return <Badge className="bg-primary/10 text-primary">Pago</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  const filtered = indicacoes.filter(i =>
    (i.user_email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (i.cliente_nome || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.codigo_indicacao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  if (!config) return <div className="text-center py-8 text-muted-foreground">Erro ao carregar configurações</div>;

  return (
    <div>
      <header className="rounded-lg border mb-3 overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-card border-b border-border">
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-foreground/70" />
            <h1 className="text-base font-semibold tracking-tight text-foreground">Indique e Ganhe</h1>
          </div>
          <p className="text-xs/6 text-muted-foreground">Configure o programa de indicações do sistema.</p>
        </div>
      </header>

      <main className="space-y-4">
        {/* Configurações Globais */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-foreground/70" />
              <CardTitle className="text-sm">Status do Programa</CardTitle>
            </div>
            <CardDescription>Ative ou desative o programa de indicações.</CardDescription>
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
            <CardDescription>Configure o valor padrão do bônus por indicação.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tipo de Bônus</Label>
                <Select value={config.tipo_bonus} onValueChange={v => set("tipo_bonus", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixo">Valor Fixo (R$)</SelectItem>
                    <SelectItem value="percentual">Percentual (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>
                  {config.tipo_bonus === "fixo" ? "Valor do Bônus (R$)" : "Percentual do Bônus (%)"}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={config.valor_bonus}
                  onChange={e => set("valor_bonus", Number(e.target.value))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição do Programa</Label>
              <Input
                value={config.descricao || ""}
                onChange={e => set("descricao", e.target.value)}
                placeholder="Indique amigos e ganhe bônus..."
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>

        {/* Todas as Indicações */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-foreground/70" />
                <CardTitle className="text-sm">Todas as Indicações</CardTitle>
              </div>
              <div className="flex items-center gap-2 w-64">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            </div>
            <CardDescription>Indicações de todos os usuários do sistema.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loadingIndicacoes ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center">
                <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma indicação encontrada.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Cliente Indicado</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Bônus</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(ind => (
                    <TableRow key={ind.id}>
                      <TableCell className="font-medium">{ind.user_email}</TableCell>
                      <TableCell>{ind.cliente_nome}</TableCell>
                      <TableCell className="font-mono text-xs">{ind.codigo_indicacao}</TableCell>
                      <TableCell>R$ {Number(ind.bonus).toFixed(2).replace(".", ",")}</TableCell>
                      <TableCell>{getStatusBadge(ind.status)}</TableCell>
                      <TableCell>{new Date(ind.created_at).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Select
                            value={ind.status}
                            onValueChange={v => handleUpdateStatus(ind.id, v)}
                          >
                            <SelectTrigger className="h-7 w-28 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pendente">Pendente</SelectItem>
                              <SelectItem value="aprovado">Aprovado</SelectItem>
                              <SelectItem value="pago">Pago</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleEditUserBonus(ind)}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Dialog para editar bônus do usuário */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Bônus do Usuário</DialogTitle>
            <DialogDescription>
              Altere o valor do bônus para: {editUser?.email}
            </DialogDescription>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Tipo de Bônus</Label>
                <Select
                  value={editUser.tipo_bonus || "fixo"}
                  onValueChange={v => setEditUser(prev => prev ? { ...prev, tipo_bonus: v } : prev)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixo">Valor Fixo (R$)</SelectItem>
                    <SelectItem value="percentual">Percentual (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>
                  {editUser.tipo_bonus === "percentual" ? "Percentual (%)" : "Valor (R$)"}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editUser.valor_bonus || 0}
                  onChange={e => setEditUser(prev => prev ? { ...prev, valor_bonus: Number(e.target.value) } : prev)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveUserBonus} disabled={savingUser}>
              {savingUser ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
