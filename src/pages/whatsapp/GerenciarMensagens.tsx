import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Home } from "lucide-react";
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

const defaultMensagens: MensagensPadroes = {
  bem_vindo: `{saudacao} *{nome_cliente}*

🎉 Seja bem-vindo(a) à *Tech Play!*

Aqui você tem acesso ao melhor do entretenimento: filmes, séries, canais e muito mais, tudo em alta qualidade.

🎬 Abaixo são os dados`,
  fatura_criada: `{saudacao}. *{nome_cliente}*

📄 *Sua fatura foi gerada com sucesso!*

*DADOS DA FATURA*
--------------------------------
◆ *Vencimento:* *{vencimento}*
◆ {nome_plano}
◆ Desconto: {desconto}
◆ Total a pagar: {subtotal}

💸 Pagamento rápido em 1 clique:
{link_fatura}`,
  proximo_vencer: `{saudacao}. *{nome_cliente}*

⚠️ *Passando só pra avisar que seu Plano vence amanhã!*

*DADOS DA FATURA*
------------------
◆ *Vencimento:* {vencimento}
◆ {nome_plano}

💸 Pagamento rápido em 1 clique:
{link_fatura}`,
  vence_hoje: `{saudacao}. *{nome_cliente}*

⚠️ *SEU VENCIMENTO É HOJE!*
Pra continuar aproveitando seus canais, realize o pagamento o quanto antes.

*DADOS DA FATURA*
----------------------------------------
◆ *Vencimento:* {vencimento}
◆ {nome_plano}
◆ Total a pagar: {subtotal}

💸 Pagamento rápido em 1 clique:
{link_fatura}`,
  vencido: `{saudacao}. *{nome_cliente}*

🟥 *SEU PLANO VENCEU*
Pra continuar aproveitando seus canais, realize o pagamento o quanto antes.

*DADOS DA FATURA*
----------------------------------------
◆ *Vencimento:* {vencimento}
◆ {nome_plano}
◆ Total a pagar: {subtotal}

💸 Pagamento rápido em 1 clique:
{link_fatura}`,
  confirmacao_pagamento: `Olá, *{nome_cliente}*

✅ *Seu pagamento foi realizado e o seu acesso será renovado em alguns minutos!*

Próximo vencimento: *{vencimento}*

Qualquer dúvida, estamos por aqui

*Obrigado!*`,
  dados_cliente: `{saudacao} *{nome_cliente}*
Segue suas informações abaixo:

💜 *Central do Cliente:* {area_cliente}

Login: *{usuario}*
Senha: *{senha}*`,
};

export default function GerenciarMensagens() {
  const [mensagens, setMensagens] = useState<MensagensPadroes>(defaultMensagens);
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
      // Usar upsert para inserir ou atualizar com base no user_id
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

  const handleRestaurarPadrao = () => {
    setMensagens(defaultMensagens);
    toast.success("Mensagens restauradas para o padrão!");
  };

  const availableKeys = [
    "{area_cliente}", "{credito}", "{dados_servidor}", "{desconto}", "{indicacao}", "{link_fatura}",
    "{nome_cliente}", "{nome_plano}", "{nome_servidor}", "{numero_fatura}", "{obs}", "{pix}",
    "{saudacao}", "{senha}", "{sobrenome}", "{subtotal}", "{usuario}", "{valor_plano}", 
    "{vencimento}", "{hora_vencimento}", "{info1}", "{info2}", "{info3}"
  ];

  // Get template title
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bom Dia, Tech Play!</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
          <Home className="h-4 w-4" />
          <span>/</span>
          <span className="text-purple-400">Gerenciar Mensagens WhatsApp</span>
        </div>
      </div>

      {/* Main Content */}
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-2">Gerenciar Mensagens Do WhatsApp</h2>
          <p className="text-muted-foreground text-sm mb-4">Utilize as seguintes chaves para obter os valores:</p>
          
          {/* Available Keys */}
          <div className="mb-6">
            <p className="text-sm text-muted-foreground mb-2">Utilize as seguintes chaves para obter os valores:</p>
            <div className="flex flex-wrap gap-1 mb-3">
              {availableKeys.map((key) => (
                <span key={key} className="text-orange-400 text-xs">{key}</span>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Utilize <span className="text-orange-400">{"{nome_cliente_indicado}"}</span> <span className="text-orange-400">{"{valor_indicacao}"}</span> somente na mensagem de indicação.
            </p>
            <p className="text-sm text-muted-foreground">
              Use <span className="text-green-400">Enter</span> para quebra de linha ou <span className="text-orange-400">{"{br}"}</span> para compatibilidade.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Message Templates */}
            <div className="space-y-6">
              <div>
                <h3 className="text-foreground font-medium mb-2 text-center">Bem Vindo:</h3>
                <Textarea
                  value={mensagens.bem_vindo}
                  onChange={(e) => setMensagens(prev => ({ ...prev, bem_vindo: e.target.value }))}
                  onFocus={() => setSelectedTemplate("bem_vindo")}
                  className="bg-muted border-border text-foreground min-h-[180px] text-sm"
                />
              </div>

              <div>
                <h3 className="text-foreground font-medium mb-2 text-center">Fatura Criada:</h3>
                <Textarea
                  value={mensagens.fatura_criada}
                  onChange={(e) => setMensagens(prev => ({ ...prev, fatura_criada: e.target.value }))}
                  onFocus={() => setSelectedTemplate("fatura_criada")}
                  className="bg-muted border-border text-foreground min-h-[200px] text-sm"
                />
              </div>

              <div>
                <h3 className="text-foreground font-medium mb-2 text-center">Próximo de Vencer:</h3>
                <Textarea
                  value={mensagens.proximo_vencer}
                  onChange={(e) => setMensagens(prev => ({ ...prev, proximo_vencer: e.target.value }))}
                  onFocus={() => setSelectedTemplate("proximo_vencer")}
                  className="bg-muted border-border text-foreground min-h-[180px] text-sm"
                />
              </div>

              <div>
                <h3 className="text-foreground font-medium mb-2 text-center">Vence Hoje:</h3>
                <Textarea
                  value={mensagens.vence_hoje}
                  onChange={(e) => setMensagens(prev => ({ ...prev, vence_hoje: e.target.value }))}
                  onFocus={() => setSelectedTemplate("vence_hoje")}
                  className="bg-muted border-border text-foreground min-h-[200px] text-sm"
                />
              </div>

              <div>
                <h3 className="text-foreground font-medium mb-2 text-center">Vencido:</h3>
                <Textarea
                  value={mensagens.vencido}
                  onChange={(e) => setMensagens(prev => ({ ...prev, vencido: e.target.value }))}
                  onFocus={() => setSelectedTemplate("vencido")}
                  className="bg-muted border-border text-foreground min-h-[200px] text-sm"
                />
              </div>

              <div>
                <h3 className="text-foreground font-medium mb-2 text-center">Confirmação Pagamento:</h3>
                <Textarea
                  value={mensagens.confirmacao_pagamento}
                  onChange={(e) => setMensagens(prev => ({ ...prev, confirmacao_pagamento: e.target.value }))}
                  onFocus={() => setSelectedTemplate("confirmacao_pagamento")}
                  className="bg-muted border-border text-foreground min-h-[180px] text-sm"
                />
              </div>

              <div>
                <h3 className="text-foreground font-medium mb-2 text-center">Dados do Cliente:</h3>
                <Textarea
                  value={mensagens.dados_cliente}
                  onChange={(e) => setMensagens(prev => ({ ...prev, dados_cliente: e.target.value }))}
                  onFocus={() => setSelectedTemplate("dados_cliente")}
                  className="bg-muted border-border text-foreground min-h-[180px] text-sm"
                />
              </div>
            </div>

            {/* WhatsApp Preview */}
            <WhatsAppPhonePreview 
              message={mensagens[selectedTemplate]}
              templateLabel={getTemplateTitle()}
              contactName="Gestor MSX"
              time="09:00"
              carrier="Vivo"
              battery="100%"
            />
          </div>

          {/* Save Buttons */}
          <div className="flex justify-center gap-4 mt-8">
            <Button 
              variant="outline"
              onClick={handleRestaurarPadrao}
            >
              Restaurar Padrão
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saving}
              className="bg-purple-600 hover:bg-purple-700 px-8"
            >
              {saving ? "Salvando..." : "Salvar dados"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
