import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Package, Settings, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useProdutos } from "@/hooks/useDatabase";

const formatCurrencyBRL = (value: string) => {
  const digits = (value ?? "").toString().replace(/\D/g, "");
  const number = Number(digits) / 100;
  if (isNaN(number)) return "R$ 0,00";
  return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export default function ProdutosCadastro() {
  const navigate = useNavigate();
  const { criar } = useProdutos();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    valor: "",
    creditos: "",
    descricao: "",
    configuracoesIptv: false,
    provedorIptv: "",
    renovacaoAutomatica: false,
  });

  useEffect(() => {
    document.title = "Adicionar Produto | Tech Play";
  }, []);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome.trim()) {
      toast({
        title: "Erro",
        description: "O campo Nome é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (!formData.valor.trim()) {
      toast({
        title: "Erro",
        description: "O campo Valor é obrigatório",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await criar({
        nome: formData.nome,
        valor: formData.valor,
        creditos: formData.creditos,
        descricao: formData.descricao,
        configuracoes_iptv: formData.configuracoesIptv,
        provedor_iptv: formData.provedorIptv,
        renovacao_automatica: formData.renovacaoAutomatica,
      });
      
      toast({
        title: "Sucesso",
        description: "Produto cadastrado com sucesso!",
      });
      
      navigate("/produtos");
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
      toast({
        title: "Erro",
        description: "Erro ao cadastrar produto",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom Dia" : hora < 18 ? "Boa Tarde" : "Boa Noite";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{saudacao}, Tech Play!</h1>
        <Button 
          variant="outline" 
          onClick={() => navigate("/produtos")}
          className="gap-2 border-border/50 hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>

      {/* Card do Formulário */}
      <Card className="bg-card border border-border/30">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Package className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Cadastrar Novo Produto</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Nome do Produto <span className="text-destructive">*</span></Label>
                <Input 
                  placeholder="Nome do produto" 
                  className="bg-background border-border"
                  value={formData.nome}
                  onChange={(e) => handleInputChange("nome", e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Valor <span className="text-destructive">*</span></Label>
                <Input 
                  type="text"
                  inputMode="numeric"
                  placeholder="R$ 0,00"
                  className="bg-background border-border"
                  value={formData.valor}
                  onChange={(e) => handleInputChange("valor", formatCurrencyBRL(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Créditos</Label>
                  <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <Input 
                  placeholder="Quantidade de créditos"
                  className="bg-background border-border"
                  value={formData.creditos}
                  onChange={(e) => handleInputChange("creditos", e.target.value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-medium">Descrição</Label>
                <Textarea 
                  placeholder="Descrição do produto"
                  className="bg-background border-border min-h-[100px] resize-none"
                  value={formData.descricao}
                  onChange={(e) => handleInputChange("descricao", e.target.value)}
                />
              </div>
            </div>

            {/* Configurações IPTV */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="configIptv"
                  checked={formData.configuracoesIptv}
                  onChange={(e) => handleInputChange("configuracoesIptv", e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="configIptv" className="cursor-pointer text-sm font-medium">Configurações IPTV</Label>
              </div>

              {formData.configuracoesIptv && (
                <div className="space-y-3 pl-6 border-l-2 border-border">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Provedor IPTV</Label>
                    <Select value={formData.provedorIptv} onValueChange={(value) => handleInputChange("provedorIptv", value)}>
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="provedor1">Provedor 1</SelectItem>
                        <SelectItem value="provedor2">Provedor 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Renovação Automática</Label>
                      <p className="text-xs text-muted-foreground">Renova automaticamente no servidor IPTV</p>
                    </div>
                    <Switch
                      checked={formData.renovacaoAutomatica}
                      onCheckedChange={(checked) => handleInputChange("renovacaoAutomatica", checked)}
                    />
                  </div>

                  <div className="flex items-center gap-2 text-warning text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Nenhum painel IPTV configurado</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate("/produtos")}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : "Cadastrar Produto"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
