import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Settings, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useProdutos } from "@/hooks/useDatabase";

const formatCurrencyBRL = (value: string) => {
  const digits = (value ?? "").toString().replace(/\D/g, "");
  const number = Number(digits) / 100;
  if (isNaN(number)) return "R$ 0,00";
  return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export default function ProdutosEditar() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { atualizar, buscarPorId } = useProdutos();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
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
    document.title = "Editar Produto | Tech Play";
    
    const carregar = async () => {
      if (!id) { navigate("/produtos"); return; }
      setLoadingData(true);
      try {
        const produto = await buscarPorId(id);
        if (produto) {
          setFormData({
            nome: produto.nome || "",
            valor: produto.valor ? (produto.valor.toString().trim().startsWith("R$") ? produto.valor : formatCurrencyBRL(produto.valor.toString())) : "",
            creditos: produto.creditos || "",
            descricao: produto.descricao || "",
            configuracoesIptv: (produto as any).configuracoes_iptv ?? false,
            provedorIptv: (produto as any).provedor_iptv ?? "",
            renovacaoAutomatica: (produto as any).renovacao_automatica ?? false,
          });
        } else {
          toast({ title: "Erro", description: "Produto não encontrado", variant: "destructive" });
          navigate("/produtos");
        }
      } catch (error) {
        console.error("Erro ao carregar produto:", error);
        toast({ title: "Erro", description: "Erro ao carregar dados do produto", variant: "destructive" });
        navigate("/produtos");
      } finally {
        setLoadingData(false);
      }
    };
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      toast({ title: "Erro", description: "O campo Nome é obrigatório", variant: "destructive" });
      return;
    }
    if (!formData.valor.trim()) {
      toast({ title: "Erro", description: "O campo Valor é obrigatório", variant: "destructive" });
      return;
    }
    if (!id) return;

    setLoading(true);
    try {
      await atualizar(id, {
        nome: formData.nome,
        valor: formData.valor,
        creditos: formData.creditos,
        descricao: formData.descricao,
        configuracoes_iptv: formData.configuracoesIptv,
        provedor_iptv: formData.provedorIptv,
        renovacao_automatica: formData.renovacaoAutomatica,
      });
      toast({ title: "Sucesso", description: "Produto atualizado com sucesso!" });
      navigate("/produtos");
    } catch (error) {
      console.error("Erro ao atualizar produto:", error);
      toast({ title: "Erro", description: "Erro ao atualizar produto", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="space-y-6">
        <Card className="bg-card border border-border/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-center py-8">
              <span className="text-muted-foreground">Carregando dados do produto...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card border border-border/30">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Package className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Editar Produto</h2>
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
              <Button type="button" variant="outline" onClick={() => navigate("/produtos")}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
