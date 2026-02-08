import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAplicativos } from "@/hooks/useDatabase";

export default function AplicativosCadastro() {
  const navigate = useNavigate();
  const { criar } = useAplicativos();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
  });

  useEffect(() => {
    document.title = "Adicionar Aplicativo | Tech Play";
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

    setLoading(true);
    try {
      await criar(formData);
      
      toast({
        title: "Sucesso",
        description: "Aplicativo cadastrado com sucesso!",
      });
      
      navigate("/aplicativos");
    } catch (error) {
      console.error("Erro ao salvar aplicativo:", error);
      toast({
        title: "Erro",
        description: "Erro ao cadastrar aplicativo",
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
          onClick={() => navigate("/aplicativos")}
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
            <h2 className="text-xl font-semibold text-foreground">Cadastrar Novo Aplicativo</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Nome do Aplicativo <span className="text-destructive">*</span></Label>
                <Input 
                  placeholder="Nome do aplicativo" 
                  className="bg-background border-border"
                  value={formData.nome}
                  onChange={(e) => handleInputChange("nome", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Descrição</Label>
                <Textarea 
                  placeholder="Descrição do aplicativo"
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
                onClick={() => navigate("/aplicativos")}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : "Cadastrar Aplicativo"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
