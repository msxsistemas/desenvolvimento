import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Plus, Pencil, Trash2, Star, Package, Users, MessageSquare, Smartphone, Monitor } from "lucide-react";

interface SystemPlan {
  id: string;
  nome: string;
  descricao: string | null;
  valor: number;
  intervalo: string;
  limite_clientes: number;
  limite_mensagens: number;
  limite_whatsapp_sessions: number;
  limite_paineis: number;
  recursos: string[];
  ativo: boolean;
  destaque: boolean;
  ordem: number;
}

export default function AdminPlanos() {
  const [plans, setPlans] = useState<SystemPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscriberCounts, setSubscriberCounts] = useState<Record<string, number>>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchPlans = async () => {
    const { data } = await supabase.from("system_plans").select("*").order("ordem");
    if (data) setPlans(data as SystemPlan[]);
    setLoading(false);
  };

  const fetchSubscriberCounts = async () => {
    const { data } = await supabase.from("user_subscriptions").select("plan_id, status");
    if (data) {
      const counts: Record<string, number> = {};
      data.forEach((sub) => {
        if (sub.plan_id && sub.status === "active") {
          counts[sub.plan_id] = (counts[sub.plan_id] || 0) + 1;
        }
      });
      setSubscriberCounts(counts);
    }
  };

  useEffect(() => {
    document.title = "Planos SaaS | Admin Msx Gestor";
    fetchPlans();
    fetchSubscriberCounts();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este plano?")) return;
    await supabase.from("system_plans").delete().eq("id", id);
    toast({ title: "Plano excluído" });
    fetchPlans();
  };

  const totalAtivos = plans.filter(p => p.ativo).length;
  const totalInativos = plans.filter(p => !p.ativo).length;
  const totalAssinantes = Object.values(subscriberCounts).reduce((a, b) => a + b, 0);

  return (
    <div>
      <header className="rounded-lg border mb-3 overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-card border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-foreground/70" />
                <h1 className="text-base font-semibold tracking-tight text-foreground">Planos SaaS</h1>
              </div>
              <p className="text-xs/6 text-muted-foreground">Gerencie os planos de assinatura disponíveis no sistema.</p>
            </div>
            <Button onClick={() => navigate("/admin/planos/novo")} size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> Novo Plano
            </Button>
          </div>
        </div>
      </header>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <Card className="shadow-sm">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Total de Planos</p>
            <p className="text-xl font-bold">{plans.length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Ativos</p>
            <p className="text-xl font-bold text-emerald-500">{totalAtivos}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Inativos</p>
            <p className="text-xl font-bold text-destructive">{totalInativos}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Assinantes Ativos</p>
            <p className="text-xl font-bold text-primary">{totalAssinantes}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-foreground/70" />
            <CardTitle className="text-sm">Planos ({plans.length})</CardTitle>
          </div>
          <CardDescription>Planos exibidos na página pública de preços.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : plans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhum plano cadastrado</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Intervalo</TableHead>
                    <TableHead>Limites</TableHead>
                    <TableHead>Recursos</TableHead>
                    <TableHead>Assinantes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {p.nome}
                          {p.destaque && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                        </div>
                        {p.descricao && <p className="text-xs text-muted-foreground mt-0.5 max-w-[200px] truncate">{p.descricao}</p>}
                      </TableCell>
                      <TableCell className="font-semibold">R$ {Number(p.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="capitalize">{p.intervalo}</TableCell>
                      <TableCell>
                        <div className="text-xs space-y-0.5">
                          <div className="flex items-center gap-1"><Users className="h-3 w-3 text-muted-foreground" />{p.limite_clientes}</div>
                          <div className="flex items-center gap-1"><MessageSquare className="h-3 w-3 text-muted-foreground" />{p.limite_mensagens}</div>
                          <div className="flex items-center gap-1"><Smartphone className="h-3 w-3 text-muted-foreground" />{p.limite_whatsapp_sessions}</div>
                          <div className="flex items-center gap-1"><Monitor className="h-3 w-3 text-muted-foreground" />{p.limite_paineis}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {p.recursos && p.recursos.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {p.recursos.slice(0, 3).map((r: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-[0.625rem] px-1.5 py-0">{r}</Badge>
                            ))}
                            {p.recursos.length > 3 && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">+{p.recursos.length - 3}</Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-sm">{subscriberCounts[p.id] || 0}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.ativo ? "default" : "secondary"}>{p.ativo ? "Ativo" : "Inativo"}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/planos/editar/${p.id}`)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
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
