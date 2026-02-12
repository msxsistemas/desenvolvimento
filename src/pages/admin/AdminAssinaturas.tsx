import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { UserCheck, Pencil } from "lucide-react";

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
  const { toast } = useToast();

  const fetch_ = async () => {
    const [subsRes, plansRes] = await Promise.all([
      supabase.from("user_subscriptions").select("*").order("created_at", { ascending: false }),
      supabase.from("system_plans").select("id, nome"),
    ]);
    
    const planMap: Record<string, string> = {};
    (plansRes.data || []).forEach(p => { planMap[p.id] = p.nome; });
    setPlans((plansRes.data || []) as Plan[]);

    // Get user emails via admin-api
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

  useEffect(() => { fetch_(); }, []);

  const openEdit = (s: Subscription) => { setEditSub(s); setEditStatus(s.status); setEditPlan(s.plan_id || ""); };

  const handleUpdate = async () => {
    if (!editSub) return;
    await supabase.from("user_subscriptions").update({ status: editStatus, plan_id: editPlan || null }).eq("id", editSub.id);
    toast({ title: "Assinatura atualizada!" });
    setEditSub(null);
    fetch_();
  };

  const statusColor = (s: string) => {
    if (s === "ativa") return "default";
    if (s === "trial") return "secondary";
    return "destructive";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Assinaturas</h1>
        <p className="text-muted-foreground">Gerenciar assinaturas dos usuários do sistema</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserCheck className="h-5 w-5" /> Assinaturas ({subs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : subs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhuma assinatura encontrada</div>
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
                  {subs.map(s => (
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
            <div>
              <p className="text-sm text-muted-foreground mb-2">Usuário: {editSub?.user_email}</p>
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
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                  <SelectItem value="expirada">Expirada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleUpdate} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
