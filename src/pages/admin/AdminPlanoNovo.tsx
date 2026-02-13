import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Package, Users, MessageSquare, Smartphone, Monitor, ListChecks, Settings2, Sparkles, X } from "lucide-react";

const emptyPlan = {
  nome: "", descricao: "", valor: 0, intervalo: "mensal",
  limite_clientes: 50, limite_mensagens: 500, limite_whatsapp_sessions: 1,
  limite_paineis: 1, recursos: [] as string[], ativo: true, destaque: false, ordem: 0,
};

export default function AdminPlanoNovo() {
  const [form, setForm] = useState(emptyPlan);
  const [recursoInput, setRecursoInput] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const addRecurso = () => {
    if (recursoInput.trim()) {
      setForm(f => ({ ...f, recursos: [...f.recursos, recursoInput.trim()] }));
      setRecursoInput("");
    }
  };

  const removeRecurso = (i: number) => setForm(f => ({ ...f, recursos: f.recursos.filter((_, idx) => idx !== i) }));

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("system_plans").insert({ ...form });
      if (error) throw error;
      toast({ title: "Plano criado com sucesso!" });
      navigate("/admin/planos");
    } catch {
      toast({ title: "Erro ao criar plano", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <header className="rounded-lg border overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-card border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-foreground/70" />
                <h1 className="text-base font-semibold tracking-tight text-foreground">Novo Plano</h1>
              </div>
              <p className="text-xs/6 text-muted-foreground">Preencha os dados para criar um novo plano SaaS.</p>
            </div>
            <Button onClick={() => navigate("/admin/planos")} size="sm" variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
          </div>
        </div>
      </header>

      {/* Informações Básicas */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-foreground/70" />
            <CardTitle className="text-sm">Informações Básicas</CardTitle>
          </div>
          <CardDescription>Nome, valor e descrição do plano.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Label>Nome do Plano</Label>
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Básico, Profissional, Enterprise" />
            </div>
            <div>
              <Label>Valor (R$)</Label>
              <Input type="number" min={0} step={0.01} value={form.valor} onChange={e => setForm(f => ({ ...f, valor: Number(e.target.value) }))} placeholder="0,00" />
            </div>
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={form.descricao || ""} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descreva os benefícios do plano..." rows={3} className="resize-none" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Intervalo de Cobrança</Label>
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
            <div>
              <Label>Ordem de Exibição</Label>
              <Input type="number" min={0} value={form.ordem} onChange={e => setForm(f => ({ ...f, ordem: Number(e.target.value) }))} placeholder="0" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Limites */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-foreground/70" />
            <CardTitle className="text-sm">Limites do Plano</CardTitle>
          </div>
          <CardDescription>Defina os limites de uso para os assinantes deste plano.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                Clientes
              </Label>
              <Input type="number" min={0} value={form.limite_clientes} onChange={e => setForm(f => ({ ...f, limite_clientes: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                Mensagens
              </Label>
              <Input type="number" min={0} value={form.limite_mensagens} onChange={e => setForm(f => ({ ...f, limite_mensagens: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                WhatsApp
              </Label>
              <Input type="number" min={0} value={form.limite_whatsapp_sessions} onChange={e => setForm(f => ({ ...f, limite_whatsapp_sessions: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
                Painéis
              </Label>
              <Input type="number" min={0} value={form.limite_paineis} onChange={e => setForm(f => ({ ...f, limite_paineis: Number(e.target.value) }))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recursos */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-foreground/70" />
            <CardTitle className="text-sm">Recursos Inclusos</CardTitle>
          </div>
          <CardDescription>Adicione recursos que serão exibidos na página de planos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={recursoInput}
              onChange={e => setRecursoInput(e.target.value)}
              placeholder="Ex: Suporte prioritário, Relatórios avançados..."
              onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addRecurso())}
            />
            <Button type="button" variant="outline" onClick={addRecurso} className="shrink-0">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {form.recursos.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {form.recursos.map((r, i) => (
                <Badge key={i} variant="secondary" className="gap-1.5 py-1 px-2.5 text-xs">
                  {r}
                  <button onClick={() => removeRecurso(i)} className="ml-0.5 hover:text-destructive transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Nenhum recurso adicionado. Pressione Enter ou clique em + para adicionar.</p>
          )}
        </CardContent>
      </Card>

      {/* Status e Ação */}
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.ativo} onCheckedChange={v => setForm(f => ({ ...f, ativo: v }))} />
                <Label className="text-sm">Ativo</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.destaque} onCheckedChange={v => setForm(f => ({ ...f, destaque: v }))} />
                <Label className="text-sm">Destaque</Label>
              </div>
            </div>
          </div>
          <Separator className="my-4" />
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Criando..." : "Criar Plano"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
