import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Settings, Percent, Gift, Users } from "lucide-react";
import { toast } from "sonner";

export default function IndicacoesSistema() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [config, setConfig] = useState({
    ativo: true,
    percentualDesconto: "10",
    bonusIndicador: "5",
    diasValidade: "30",
    minIndicacoes: "1",
    tipoBonus: "desconto" as "desconto" | "credito",
  });

  useEffect(() => {
    document.title = "Indicação do Sistema | Tech Play";
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Simular salvamento
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="space-y-4">
      {/* Header */}
      <header className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Indicação do Sistema</h1>
          <p className="text-sm text-muted-foreground">Configure as regras de indicação automática</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-primary hover:bg-primary/90"
        >
          {saving ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="text-lg font-bold text-foreground">{config.ativo ? "Ativo" : "Inativo"}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Percent className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Desconto Indicado</p>
              <p className="text-lg font-bold text-foreground">{config.percentualDesconto}%</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Gift className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Bônus Indicador</p>
              <p className="text-lg font-bold text-foreground">R$ {config.bonusIndicador}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Mín. Indicações</p>
              <p className="text-lg font-bold text-foreground">{config.minIndicacoes}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Configurações */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configurações Gerais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Sistema de Indicações Ativo</Label>
                <p className="text-sm text-muted-foreground">Habilita ou desabilita o sistema de indicações</p>
              </div>
              <Switch
                checked={config.ativo}
                onCheckedChange={(checked) => setConfig({ ...config, ativo: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label>Validade do Bônus (dias)</Label>
              <Input
                type="number"
                value={config.diasValidade}
                onChange={(e) => setConfig({ ...config, diasValidade: e.target.value })}
                placeholder="30"
              />
              <p className="text-xs text-muted-foreground">Dias que o bônus permanece disponível para uso</p>
            </div>

            <div className="space-y-2">
              <Label>Mínimo de Indicações para Bônus</Label>
              <Input
                type="number"
                value={config.minIndicacoes}
                onChange={(e) => setConfig({ ...config, minIndicacoes: e.target.value })}
                placeholder="1"
              />
              <p className="text-xs text-muted-foreground">Quantidade mínima de indicações para liberar bônus</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recompensas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Desconto para Indicado (%)</Label>
              <Input
                type="number"
                value={config.percentualDesconto}
                onChange={(e) => setConfig({ ...config, percentualDesconto: e.target.value })}
                placeholder="10"
              />
              <p className="text-xs text-muted-foreground">Percentual de desconto que o cliente indicado recebe</p>
            </div>

            <div className="space-y-2">
              <Label>Bônus para Indicador (R$)</Label>
              <Input
                type="number"
                value={config.bonusIndicador}
                onChange={(e) => setConfig({ ...config, bonusIndicador: e.target.value })}
                placeholder="5.00"
              />
              <p className="text-xs text-muted-foreground">Valor em reais que o indicador recebe por cada indicação</p>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Bônus</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tipoBonus"
                    checked={config.tipoBonus === "desconto"}
                    onChange={() => setConfig({ ...config, tipoBonus: "desconto" })}
                    className="w-4 h-4 text-primary"
                  />
                  <span className="text-sm">Desconto na Fatura</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tipoBonus"
                    checked={config.tipoBonus === "credito"}
                    onChange={() => setConfig({ ...config, tipoBonus: "credito" })}
                    className="w-4 h-4 text-primary"
                  />
                  <span className="text-sm">Crédito em Conta</span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Informações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Como Funciona</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">1</div>
              <p>O cliente indica um amigo informando seu nome ou código de indicação</p>
            </div>
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">2</div>
              <p>O indicado recebe {config.percentualDesconto}% de desconto na primeira mensalidade</p>
            </div>
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">3</div>
              <p>O indicador recebe R$ {config.bonusIndicador} de bônus após a confirmação do pagamento</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
