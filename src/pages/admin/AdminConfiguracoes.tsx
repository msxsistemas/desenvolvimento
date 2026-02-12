import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Settings, Palette, UserPlus, Wrench, Headphones } from "lucide-react";

interface SystemConfig {
  nome_sistema: string;
  manutencao: boolean;
  mensagem_manutencao: string | null;
  registro_aberto: boolean;
  trial_dias: number;
  cor_primaria: string;
  logo_url: string | null;
  termos_url: string | null;
  suporte_whatsapp: string | null;
  suporte_email: string | null;
}

export default function AdminConfiguracoes() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    document.title = "Configurações | Admin Msx Gestor";
    const fetch_ = async () => {
      const { data } = await supabase.from("system_config").select("*").eq("id", 1).single();
      if (data) setConfig(data as SystemConfig);
      setLoading(false);
    };
    fetch_();
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await supabase.from("system_config").update(config).eq("id", 1);
      toast({ title: "Configurações salvas!" });
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const set = (key: keyof SystemConfig, value: any) => setConfig(c => c ? { ...c, [key]: value } : c);

  if (loading) return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  if (!config) return <div className="text-center py-8 text-muted-foreground">Erro ao carregar configurações</div>;

  return (
    <div>
      <header className="rounded-lg border mb-6 overflow-hidden shadow">
        <div className="px-4 py-3 text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <h1 className="text-base font-semibold tracking-tight">Configurações do Sistema</h1>
          </div>
          <p className="text-xs/6 opacity-90">Configurações globais da plataforma Msx Gestor.</p>
        </div>
      </header>

      <main className="space-y-4">
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-foreground/70" />
              <CardTitle className="text-sm">Aparência & Geral</CardTitle>
            </div>
            <CardDescription>Nome, logo e cor primária do sistema.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nome do Sistema</Label>
                <Input value={config.nome_sistema} onChange={e => set("nome_sistema", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Cor Primária</Label>
                <div className="flex gap-2">
                  <Input type="color" value={config.cor_primaria} onChange={e => set("cor_primaria", e.target.value)} className="w-14 h-10 p-1" />
                  <Input value={config.cor_primaria} onChange={e => set("cor_primaria", e.target.value)} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Logo URL</Label>
                <Input value={config.logo_url || ""} onChange={e => set("logo_url", e.target.value)} placeholder="https://..." />
              </div>
              <div className="space-y-1.5">
                <Label>Termos de Uso URL</Label>
                <Input value={config.termos_url || ""} onChange={e => set("termos_url", e.target.value)} placeholder="https://..." />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-foreground/70" />
              <CardTitle className="text-sm">Registro & Trial</CardTitle>
            </div>
            <CardDescription>Controle de cadastro e período de teste.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border px-3 py-2 flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Registro Aberto</span>
                <p className="text-xs text-muted-foreground">Permitir novos cadastros no sistema</p>
              </div>
              <Switch checked={config.registro_aberto} onCheckedChange={v => set("registro_aberto", v)} />
            </div>
            <div className="space-y-1.5">
              <Label>Dias de Trial</Label>
              <Input type="number" value={config.trial_dias} onChange={e => set("trial_dias", Number(e.target.value))} className="max-w-[120px]" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-foreground/70" />
              <CardTitle className="text-sm">Manutenção</CardTitle>
            </div>
            <CardDescription>Ative o modo manutenção para bloquear acesso ao sistema.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border px-3 py-2 flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Modo Manutenção</span>
                <p className="text-xs text-muted-foreground">Bloqueia acesso com uma mensagem customizada</p>
              </div>
              <Switch checked={config.manutencao} onCheckedChange={v => set("manutencao", v)} />
            </div>
            {config.manutencao && (
              <div className="space-y-1.5">
                <Label>Mensagem de Manutenção</Label>
                <Input value={config.mensagem_manutencao || ""} onChange={e => set("mensagem_manutencao", e.target.value)} placeholder="Sistema em manutenção..." />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Headphones className="h-4 w-4 text-foreground/70" />
              <CardTitle className="text-sm">Suporte</CardTitle>
            </div>
            <CardDescription>Canais de suporte exibidos para os usuários.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>WhatsApp Suporte</Label>
                <Input value={config.suporte_whatsapp || ""} onChange={e => set("suporte_whatsapp", e.target.value)} placeholder="5511999999999" />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail Suporte</Label>
                <Input value={config.suporte_email || ""} onChange={e => set("suporte_email", e.target.value)} placeholder="suporte@exemplo.com" />
              </div>
            </div>
            <div className="flex justify-center border-t pt-4 mt-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Salvando..." : "Salvar Configurações"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
