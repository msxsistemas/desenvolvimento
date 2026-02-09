import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { WhatsAppPhonePreview } from "@/components/whatsapp/WhatsAppPhonePreview";

interface MensagensPadroes {
  bem_vindo: string;
  fatura_criada: string;
  proximo_vencer: string;
  vence_hoje: string;
  vencido: string;
  confirmacao_pagamento: string;
  dados_cliente: string;
}

const emptyMensagens: MensagensPadroes = {
  bem_vindo: "",
  fatura_criada: "",
  proximo_vencer: "",
  vence_hoje: "",
  vencido: "",
  confirmacao_pagamento: "",
  dados_cliente: "",
};

export default function GerenciarMensagens() {
  const [mensagens, setMensagens] = useState<MensagensPadroes>(emptyMensagens);
  const [saving, setSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<keyof MensagensPadroes>("vence_hoje");
  const { user } = useCurrentUser();

  useEffect(() => {
    document.title = "Gerenciar Mensagens WhatsApp | Tech Play";
    if (user?.id) {
      loadMensagens();
    }
  }, [user?.id]);

  const loadMensagens = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from("mensagens_padroes")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (data) {
        setMensagens(prev => ({
          ...prev,
          ...(data.bem_vindo && { bem_vindo: data.bem_vindo }),
          ...(data.fatura_criada && { fatura_criada: data.fatura_criada }),
          ...(data.proximo_vencer && { proximo_vencer: data.proximo_vencer }),
          ...(data.vence_hoje && { vence_hoje: data.vence_hoje }),
          ...(data.vencido && { vencido: data.vencido }),
          ...(data.confirmacao_pagamento && { confirmacao_pagamento: data.confirmacao_pagamento }),
          ...(data.dados_cliente && { dados_cliente: data.dados_cliente }),
        }));
      }
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
    }
  };

  const handleSave = async () => {
    if (!user?.id) {
      toast.error("Você precisa estar logado para salvar");
      return;
    }
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("mensagens_padroes")
        .upsert({
          user_id: user.id,
          bem_vindo: mensagens.bem_vindo,
          fatura_criada: mensagens.fatura_criada,
          proximo_vencer: mensagens.proximo_vencer,
          vence_hoje: mensagens.vence_hoje,
          vencido: mensagens.vencido,
          confirmacao_pagamento: mensagens.confirmacao_pagamento,
          dados_cliente: mensagens.dados_cliente,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast.success("Mensagens salvas com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar mensagens:", error);
      toast.error("Erro ao salvar mensagens");
    } finally {
      setSaving(false);
    }
  };

  const handleLimparMensagens = async () => {
    if (!user?.id) return;
    
    try {
      setSaving(true);
      const { error } = await supabase
        .from("mensagens_padroes")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      setMensagens(emptyMensagens);
      toast.success("Mensagens limpas com sucesso!");
    } catch (error) {
      console.error("Erro ao limpar mensagens:", error);
      toast.error("Erro ao limpar mensagens");
    } finally {
      setSaving(false);
    }
  };

  const availableKeys = [
    "{area_cliente}", "{credito}", "{dados_servidor}", "{desconto}", "{indicacao}", "{link_fatura}",
    "{nome_cliente}", "{nome_plano}", "{nome_servidor}", "{numero_fatura}", "{obs}", "{pix}",
    "{saudacao}", "{senha}", "{sobrenome}", "{subtotal}", "{usuario}", "{valor_plano}", 
    "{vencimento}", "{hora_vencimento}", "{info1}", "{info2}", "{info3}"
  ];

  const getTemplateTitle = () => {
    const titles: Record<keyof MensagensPadroes, string> = {
      bem_vindo: "Bem Vindo",
      fatura_criada: "Fatura Criada",
      proximo_vencer: "Próximo de Vencer",
      vence_hoje: "Vence Hoje",
      vencido: "Vencido",
      confirmacao_pagamento: "Confirmação Pagamento",
      dados_cliente: "Dados do Cliente",
    };
    return titles[selectedTemplate];
  };

  return (
    <main className="space-y-4">
      {/* Header */}
      <header className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Mensagens Automáticas</h1>
          <p className="text-sm text-muted-foreground">Configure as mensagens padrão do sistema</p>
        </div>
        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">
                Limpar Mensagens
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Limpar todas as mensagens</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja apagar todas as mensagens? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleLimparMensagens} className="bg-destructive hover:bg-destructive/90">
                  Apagar Todas
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90">
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </header>

      {/* Available Keys */}
      <div className="rounded-lg border border-border bg-card p-4">
        <Label className="text-muted-foreground mb-2 block">Chaves disponíveis:</Label>
        <div className="flex flex-wrap gap-1">
          {availableKeys.map((key) => (
            <span key={key} className="text-primary text-xs bg-primary/10 px-2 py-1 rounded">{key}</span>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Use <span className="text-primary">{"{br}"}</span> para quebra de linha.
        </p>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Message Templates */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground font-medium">Bem Vindo:</Label>
              <Textarea
                value={mensagens.bem_vindo}
                onChange={(e) => setMensagens(prev => ({ ...prev, bem_vindo: e.target.value }))}
                onFocus={() => setSelectedTemplate("bem_vindo")}
                className="min-h-[140px] text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground font-medium">Fatura Criada:</Label>
              <Textarea
                value={mensagens.fatura_criada}
                onChange={(e) => setMensagens(prev => ({ ...prev, fatura_criada: e.target.value }))}
                onFocus={() => setSelectedTemplate("fatura_criada")}
                className="min-h-[160px] text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground font-medium">Próximo de Vencer:</Label>
              <Textarea
                value={mensagens.proximo_vencer}
                onChange={(e) => setMensagens(prev => ({ ...prev, proximo_vencer: e.target.value }))}
                onFocus={() => setSelectedTemplate("proximo_vencer")}
                className="min-h-[140px] text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground font-medium">Vence Hoje:</Label>
              <Textarea
                value={mensagens.vence_hoje}
                onChange={(e) => setMensagens(prev => ({ ...prev, vence_hoje: e.target.value }))}
                onFocus={() => setSelectedTemplate("vence_hoje")}
                className="min-h-[160px] text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground font-medium">Vencido:</Label>
              <Textarea
                value={mensagens.vencido}
                onChange={(e) => setMensagens(prev => ({ ...prev, vencido: e.target.value }))}
                onFocus={() => setSelectedTemplate("vencido")}
                className="min-h-[160px] text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground font-medium">Confirmação Pagamento:</Label>
              <Textarea
                value={mensagens.confirmacao_pagamento}
                onChange={(e) => setMensagens(prev => ({ ...prev, confirmacao_pagamento: e.target.value }))}
                onFocus={() => setSelectedTemplate("confirmacao_pagamento")}
                className="min-h-[140px] text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground font-medium">Dados do Cliente:</Label>
              <Textarea
                value={mensagens.dados_cliente}
                onChange={(e) => setMensagens(prev => ({ ...prev, dados_cliente: e.target.value }))}
                onFocus={() => setSelectedTemplate("dados_cliente")}
                className="min-h-[140px] text-sm"
              />
            </div>
          </div>
        </div>

        {/* WhatsApp Preview */}
        <div className="lg:sticky lg:top-4">
          <WhatsAppPhonePreview 
            message={mensagens[selectedTemplate]}
            templateLabel={getTemplateTitle()}
            contactName="Gestor MSX"
            time="09:00"
            carrier="Vivo"
            battery="100%"
          />
        </div>
      </div>
    </main>
  );
}
