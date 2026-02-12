import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Plus, Pencil, Trash2, Star } from "lucide-react";

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

const emptyPlan: Omit<SystemPlan, "id"> = {
  nome: "", descricao: "", valor: 0, intervalo: "mensal",
  limite_clientes: 50, limite_mensagens: 500, limite_whatsapp_sessions: 1,
  limite_paineis: 1, recursos: [], ativo: true, destaque: false, ordem: 0,
};

export default function AdminPlanos() {
  const [plans, setPlans] = useState<SystemPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SystemPlan | null>(null);
  const [form, setForm] = useState(emptyPlan);
  const [recursoInput, setRecursoInput] = useState("");
  const { toast } = useToast();

  const fetchPlans = async () => {
    const { data } = await supabase.from("system_plans").select("*").order("ordem");
    if (data) setPlans(data as SystemPlan[]);
    setLoading(false);
  };

  useEffect(() => { fetchPlans(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyPlan); setDialogOpen(true); };
  const openEdit = (p: SystemPlan) => { setEditing(p); setForm({ ...p }); setDialogOpen(true); };

  const handleSave = async () => {
    try {
      const payload = { ...form, recursos: form.recursos };
      if (editing) {
        await supabase.from("system_plans").update(payload).eq("id", editing.id);
        toast({ title: "Plano atualizado!" });
      } else {
        await supabase.from("system_plans").insert(payload);
        toast({ title: "Plano criado!" });
      }
      setDialogOpen(false);
      fetchPlans();
    } catch {
      toast({ title: "Erro ao salvar plano", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este plano?")) return;
    await supabase.from("system_plans").delete().eq("id", id);
    toast({ title: "Plano excluído" });
    fetchPlans();
  };

  const addRecurso = () => {
    if (recursoInput.trim()) {
      setForm(f => ({ ...f, recursos: [...f.recursos, recursoInput.trim()] }));
      setRecursoInput("");
    }
  };

  const removeRecurso = (i: number) => setForm(f => ({ ...f, recursos: f.recursos.filter((_, idx) => idx !== i) }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Planos SaaS</h1>
          <p className="text-muted-foreground">Gerencie os planos de assinatura do sistema</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Novo Plano</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Planos ({plans.length})</CardTitle>
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
                      </TableCell>
                      <TableCell>R$ {Number(p.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="capitalize">{p.intervalo}</TableCell>
                      <TableCell>
                        <div className="text-xs space-y-0.5">
                          <div>{p.limite_clientes} clientes</div>
                          <div>{p.limite_mensagens} msgs</div>
                          <div>{p.limite_whatsapp_sessions} WhatsApp</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.ativo ? "default" : "secondary"}>{p.ativo ? "Ativo" : "Inativo"}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Plano" : "Novo Plano"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Nome</Label><Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></div>
              <div><Label>Valor (R$)</Label><Input type="number" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: Number(e.target.value) }))} /></div>
            </div>
            <div><Label>Descrição</Label><Input value={form.descricao || ""} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Intervalo</Label>
                <Select value={form.intervalo} onValueChange={v => setForm(f => ({ ...f, intervalo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                    <SelectItem value="semestral">Semestral</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Ordem</Label><Input type="number" value={form.ordem} onChange={e => setForm(f => ({ ...f, ordem: Number(e.target.value) }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Limite Clientes</Label><Input type="number" value={form.limite_clientes} onChange={e => setForm(f => ({ ...f, limite_clientes: Number(e.target.value) }))} /></div>
              <div><Label>Limite Mensagens</Label><Input type="number" value={form.limite_mensagens} onChange={e => setForm(f => ({ ...f, limite_mensagens: Number(e.target.value) }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Limite WhatsApp</Label><Input type="number" value={form.limite_whatsapp_sessions} onChange={e => setForm(f => ({ ...f, limite_whatsapp_sessions: Number(e.target.value) }))} /></div>
              <div><Label>Limite Painéis</Label><Input type="number" value={form.limite_paineis} onChange={e => setForm(f => ({ ...f, limite_paineis: Number(e.target.value) }))} /></div>
            </div>
            <div>
              <Label>Recursos</Label>
              <div className="flex gap-2 mt-1">
                <Input value={recursoInput} onChange={e => setRecursoInput(e.target.value)} placeholder="Ex: Suporte prioritário" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addRecurso())} />
                <Button type="button" variant="outline" onClick={addRecurso}>+</Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {form.recursos.map((r, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 cursor-pointer" onClick={() => removeRecurso(i)}>{r} ×</Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.ativo} onCheckedChange={v => setForm(f => ({ ...f, ativo: v }))} />
                <Label>Ativo</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.destaque} onCheckedChange={v => setForm(f => ({ ...f, destaque: v }))} />
                <Label>Destaque</Label>
              </div>
            </div>
            <Button onClick={handleSave} className="w-full">{editing ? "Salvar Alterações" : "Criar Plano"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
