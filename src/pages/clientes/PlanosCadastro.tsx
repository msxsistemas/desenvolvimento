import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, List } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePlanos } from "@/hooks/useDatabase";

const formatCurrencyBRL = (value: string) => {
  const digits = (value ?? "").toString().replace(/\D/g, "");
  const number = Number(digits) / 100;
  if (isNaN(number)) return "R$ 0,00";
  return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export default function PlanosCadastro() {
  const navigate = useNavigate();
  const { criar } = usePlanos();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    valor: "",
    tipo: "meses",
    quantidade: "1",
    descricao: "",
  });

  useEffect(() => {
    document.title = "Adicionar Plano | Tech Play";
  }, []);

  const handleInputChange = (field: string, value: string) => {
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
      await criar(formData);
      
      toast({
        title: "Sucesso",
        description: "Plano cadastrado com sucesso!",
      });
      
      navigate("/planos");
    } catch (error) {
      console.error("Erro ao salvar plano:", error);
      toast({
        title: "Erro",
        description: "Erro ao cadastrar plano",
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
          onClick={() => navigate("/planos")}
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
            <List className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Cadastrar Novo Plano</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Nome do Plano <span className="text-destructive">*</span></Label>
                <Input 
                  placeholder="Nome do plano" 
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
                <Label className="text-sm font-medium">Quantidade</Label>
                <Input 
                  type="number"
                  min="1"
                  placeholder="1"
                  className="bg-background border-border"
                  value={formData.quantidade}
                  onChange={(e) => handleInputChange("quantidade", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Tipo</Label>
                <Select value={formData.tipo} onValueChange={(value) => handleInputChange("tipo", value)}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meses">Meses</SelectItem>
                    <SelectItem value="dias">Dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-medium">Descrição</Label>
                <Textarea 
                  placeholder="Descrição do plano"
                  className="bg-background border-border min-h-[100px] resize-none"
                  value={formData.descricao}
                  onChange={(e) => handleInputChange("descricao", e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate("/planos")}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : "Cadastrar Plano"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
