import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { UserCheck, Pencil, Receipt, Search } from "lucide-react";

interface Subscription {
  id: string;
  user_id: string;
  plan_id: string | null;
  status: string;
  inicio: string;
  expira_em: string | null;
  plan_name?: string;
  user_email?: string;
}

interface Plan { id: string; nome: string; }

export default function AdminAssinaturas() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editSub, setEditSub] = useState<Subscription | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editPlan, setEditPlan] = useState("");
  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") || "todas";
  const { toast } = useToast();

  const setStatusFilter = (v: string) => {
    if (v === "todas") { searchParams.delete("status"); } else { searchParams.set("status", v); }
    setSearchParams(searchParams);
  };

  const fetch_ = async () => {
    const [subsRes, plansRes] = await Promise.all([
      supabase.from("user_subscriptions").select("*").order("created_at", { ascending: false }),
      supabase.from("system_plans").select("id, nome"),
    ]);

    const planMap: Record<string, string> = {};
    (plansRes.data || []).forEach(p => { planMap[p.id] = p.nome; });
    setPlans((plansRes.data || []) as Plan[]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`https://dxxfablfqigoewcfmjzl.supabase.co/functions/v1/admin-api`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ action: "list_users" }),
      });
      const result = await resp.json();
      const emailMap: Record<string, string> = {};
      result.users?.forEach((u: any) => { emailMap[u.id] = u.email; });

      setSubs((subsRes.data || []).map(s => ({
        ...s,
        plan_name: planMap[s.plan_id] || "Sem plano",
        user_email: emailMap[s.user_id] || s.user_id,
      })) as Subscription[]);
    } catch {
      setSubs((subsRes.data || []).map(s => ({ ...s, plan_name: planMap[s.plan_id] || "—" })) as Subscription[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    document.title = "Assinaturas | Admin Msx Gestor";
    fetch_();
  }, []);

  const openEdit = (s: Subscription) => { setEditSub(s); setEditStatus(s.status); setEditPlan(s.plan_id || ""); };

  const handleUpdate = async () => {
    if (!editSub) return;
    await supabase.from("user_subscriptions").update({ status: editStatus, plan_id: editPlan || null }).eq("id", editSub.id);
    toast({ title: "Assinatura atualizada!" });
    setEditSub(null);
    fetch_();
  };

  const statusColor = (s: string) => {
    if (s === "ativa") return "default" as const;
    if (s === "trial") return "secondary" as const;
    return "destructive" as const;
  };

  const filtered = useMemo(() => {
    let list = subs;
    if (statusFilter !== "todas") list = list.filter(s => s.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s => s.user_email?.toLowerCase().includes(q) || s.plan_name?.toLowerCase().includes(q));
    }
    return list;
  }, [subs, statusFilter, search]);

  const STATUS_TABS = [
    { value: "todas", label: "Todas" },
    { value: "ativa", label: "Ativas" },
    { value: "trial", label: "Trial" },
    { value: "pendente", label: "Pendentes" },
    { value: "expirada", label: "Expiradas" },
    { value: "cancelada", label: "Canceladas" },
  ];

  return (
    <div>
      <header className="rounded-lg border mb-3 overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-card border-b border-border">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-foreground/70" />
            <h1 className="text-base font-semibold tracking-tight text-foreground">Assinaturas</h1>
          </div>
          <p className="text-xs/6 text-muted-foreground">Gerencie as assinaturas e status dos usuários do sistema.</p>
        </div>
      </header>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-foreground/70" />
                <CardTitle className="text-sm">Assinaturas ({filtered.length})</CardTitle>
              </div>
              <CardDescription>Altere planos e status das assinaturas.</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por e-mail ou plano..." className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-1 mt-2 flex-wrap">
            {STATUS_TABS.map(tab => (
              <Button key={tab.value} variant={statusFilter === tab.value ? "default" : "outline"} size="sm" className="h-7 text-xs" onClick={() => setStatusFilter(tab.value)}>
                {tab.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma assinatura encontrada
              {(search || statusFilter !== "todas") && (
                <div className="mt-2">
                  <Button variant="link" size="sm" onClick={() => { setSearch(""); setStatusFilter("todas"); }}>Limpar filtros</Button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Expira</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="text-sm">{s.user_email}</TableCell>
                      <TableCell className="font-medium">{s.plan_name}</TableCell>
                      <TableCell><Badge variant={statusColor(s.status)}>{s.status}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(s.inicio).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{s.expira_em ? new Date(s.expira_em).toLocaleDateString("pt-BR") : "—"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editSub} onOpenChange={() => setEditSub(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Assinatura</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border px-3 py-2">
              <p className="text-sm text-muted-foreground">Usuário: <span className="font-medium text-foreground">{editSub?.user_email}</span></p>
            </div>
            <div>
              <Select value={editPlan} onValueChange={setEditPlan}>
                <SelectTrigger><SelectValue placeholder="Selecionar plano" /></SelectTrigger>
                <SelectContent>
                  {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativa">Ativa</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                  <SelectItem value="expirada">Expirada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleUpdate} className="w-full">Salvar Alterações</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
