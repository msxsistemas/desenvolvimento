import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save } from "lucide-react";

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configurações do Sistema</h1>
          <p className="text-muted-foreground">Configurações globais da plataforma</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2"><Save className="h-4 w-4" /> Salvar</Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Geral</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Nome do Sistema</Label><Input value={config.nome_sistema} onChange={e => set("nome_sistema", e.target.value)} /></div>
              <div><Label>Cor Primária</Label><div className="flex gap-2"><Input type="color" value={config.cor_primaria} onChange={e => set("cor_primaria", e.target.value)} className="w-14 h-10 p-1" /><Input value={config.cor_primaria} onChange={e => set("cor_primaria", e.target.value)} /></div></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Logo URL</Label><Input value={config.logo_url || ""} onChange={e => set("logo_url", e.target.value)} placeholder="https://..." /></div>
              <div><Label>Termos de Uso URL</Label><Input value={config.termos_url || ""} onChange={e => set("termos_url", e.target.value)} placeholder="https://..." /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Registro & Trial</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Registro Aberto</Label>
                <p className="text-sm text-muted-foreground">Permitir novos cadastros no sistema</p>
              </div>
              <Switch checked={config.registro_aberto} onCheckedChange={v => set("registro_aberto", v)} />
            </div>
            <div>
              <Label>Dias de Trial</Label>
              <Input type="number" value={config.trial_dias} onChange={e => set("trial_dias", Number(e.target.value))} className="max-w-[120px]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Manutenção</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Modo Manutenção</Label>
                <p className="text-sm text-muted-foreground">Bloqueia acesso ao sistema com uma mensagem</p>
              </div>
              <Switch checked={config.manutencao} onCheckedChange={v => set("manutencao", v)} />
            </div>
            {config.manutencao && (
              <div><Label>Mensagem de Manutenção</Label><Input value={config.mensagem_manutencao || ""} onChange={e => set("mensagem_manutencao", e.target.value)} placeholder="Sistema em manutenção..." /></div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Suporte</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>WhatsApp Suporte</Label><Input value={config.suporte_whatsapp || ""} onChange={e => set("suporte_whatsapp", e.target.value)} placeholder="5511999999999" /></div>
              <div><Label>E-mail Suporte</Label><Input value={config.suporte_email || ""} onChange={e => set("suporte_email", e.target.value)} placeholder="suporte@exemplo.com" /></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
