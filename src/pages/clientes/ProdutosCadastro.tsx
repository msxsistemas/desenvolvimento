import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Settings, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useProdutos } from "@/hooks/useDatabase";
import { supabase } from "@/lib/supabase";

const formatCurrencyBRL = (value: string) => {
  const digits = (value ?? "").toString().replace(/\D/g, "");
  const number = Number(digits) / 100;
  if (isNaN(number)) return "R$ 0,00";
  return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const PROVIDER_LABELS: Record<string, string> = {
  'mundogf': 'MundoGF',
  'sigma-v2': 'Sigma',
  'koffice-api': 'KOffice API',
  'koffice-v2': 'KOffice V2',
};

export default function ProdutosCadastro() {
  const navigate = useNavigate();
  const { criar } = useProdutos();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [paineis, setPaineis] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    nome: "",
    valor: "",
    creditos: "",
    descricao: "",
    configuracoesIptv: false,
    provedorIptv: "",
    painelId: "",
    renovacaoAutomatica: false,
  });

  useEffect(() => {
    document.title = "Adicionar Produto | Tech Play";
    carregarPaineis();
  }, []);

  const carregarPaineis = async () => {
    const { data } = await supabase
      .from('paineis_integracao')
      .select('id, nome, provedor')
      .order('nome');
    setPaineis(data || []);
  };

  // Filtrar painéis pelo provedor selecionado
  const paineisFiltrados = paineis.filter(p => p.provedor === formData.provedorIptv);
  const provedoresDisponiveis = [...new Set(paineis.map(p => p.provedor))];

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      // Limpar painel quando trocar provedor
      if (field === 'provedorIptv') updated.painelId = '';
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};
    if (!formData.nome.trim()) errors.nome = "Campo obrigatório";
    if (!formData.valor.trim()) errors.valor = "Campo obrigatório";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstErrorField = Object.keys(errors)[0];
      setTimeout(() => {
        const el = document.querySelector(`[data-field="${firstErrorField}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return;
    }
    setFieldErrors({});

    setLoading(true);
    try {
      // Use the Supabase client directly to include painel_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase.from('produtos').insert({
        nome: formData.nome,
        valor: formData.valor,
        creditos: formData.creditos,
        descricao: formData.descricao,
        configuracoes_iptv: formData.configuracoesIptv,
        provedor_iptv: formData.provedorIptv || null,
        painel_id: formData.painelId || null,
        renovacao_automatica: formData.renovacaoAutomatica,
        user_id: user.id,
      });

      if (error) throw error;
      
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

  return (
    <div className="space-y-6">

      {/* Card do Formulário */}
      <Card className="bg-card border border-border/30">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Package className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Cadastrar Novo Produto</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2" data-field="nome">
                <Label className="text-sm font-medium">Nome do Produto <span className="text-destructive">*</span></Label>
                <Input 
                  placeholder="Nome do produto" 
                  className={`bg-background border-border ${fieldErrors.nome ? 'border-destructive' : ''}`}
                  value={formData.nome}
                  onChange={(e) => { handleInputChange("nome", e.target.value); setFieldErrors(prev => ({ ...prev, nome: '' })); }}
                />
                {fieldErrors.nome && <span className="text-xs text-destructive">{fieldErrors.nome}</span>}
              </div>
              
              <div className="space-y-2" data-field="valor">
                <Label className="text-sm font-medium">Valor <span className="text-destructive">*</span></Label>
                <Input 
                  type="text"
                  inputMode="numeric"
                  placeholder="R$ 0,00"
                  className={`bg-background border-border ${fieldErrors.valor ? 'border-destructive' : ''}`}
                  value={formData.valor}
                  onChange={(e) => { handleInputChange("valor", formatCurrencyBRL(e.target.value)); setFieldErrors(prev => ({ ...prev, valor: '' })); }}
                />
                {fieldErrors.valor && <span className="text-xs text-destructive">{fieldErrors.valor}</span>}
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
                        <SelectValue placeholder="Selecione o provedor..." />
                      </SelectTrigger>
                      <SelectContent>
                        {provedoresDisponiveis.map((prov) => (
                          <SelectItem key={prov} value={prov}>
                            {PROVIDER_LABELS[prov] || prov}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.provedorIptv && paineisFiltrados.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Painel Específico</Label>
                      <Select value={formData.painelId} onValueChange={(value) => handleInputChange("painelId", value)}>
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue placeholder={paineisFiltrados.length === 1 ? paineisFiltrados[0].nome : "Selecione o painel..."} />
                        </SelectTrigger>
                        <SelectContent>
                          {paineisFiltrados.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {paineisFiltrados.length === 1 
                          ? "Único painel disponível — será usado automaticamente" 
                          : "Escolha qual painel será usado para renovação"}
                      </p>
                    </div>
                  )}

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

                  {provedoresDisponiveis.length === 0 ? (
                    <div className="flex items-center gap-2 text-warning text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Nenhum painel IPTV configurado. Configure em Servidores.</span>
                    </div>
                  ) : formData.provedorIptv && paineisFiltrados.length > 0 ? (
                    <div className="flex items-center gap-2 text-primary text-sm">
                      <CheckCircle className="h-4 w-4" />
                      <span>{paineisFiltrados.length} painel(éis) {PROVIDER_LABELS[formData.provedorIptv] || formData.provedorIptv} disponível(eis)</span>
                    </div>
                  ) : null}
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
