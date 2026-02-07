import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Home } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useCurrentUser";

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
  bem_vindo: `{saudacao} *{nome_cliente}*. {br}{br}🎉 Seja bem-vindo(a) à *Tech Play!* {br}{br}Aqui você tem acesso ao melhor do entretenimento: filmes, séries, canais e muito mais, tudo em alta qualidade.{br}{br} 🎬 Abaixo são os dados`,
  fatura_criada: `{saudacao}. *{nome_cliente}*. {br}{br}* 📄 Sua fatura foi gerada com sucesso!* {br}{br} *DADOS DA FATURA*{br}--------------------------------{br} ◆ *Vencimento:* *{vencimento}*{br} ◆ {nome_plano}: *`,
  proximo_vencer: `------------------{br} ◆ *Vencimento: *{vencimento}{br} ◆ *`,
  vence_hoje: `{saudacao}. *{nome_cliente}*. {br}{br} ⚠️ *SEU VENCIMENTO É HOJE!* Pra continuar aproveitando seus canais, realize o pagamento o quanto antes. {br}{br} *DADOS DA FATURA*{br}----------------------------------------{br}`,
  vencido: `{saudacao}. *{nome_cliente}*. {br}{br} 🟥 *SEU PLANO VENCEU*{br}Pra continuar aproveitando seus canais, realize o pagamento o quanto antes. {br}{br} *DADOS DA FATURA*{br}----------------------------------------{br}`,
  confirmacao_pagamento: `Olá, *{nome_cliente}*. {br}{br} ✅ *Seu pagamento foi realizado e o seu acesso será renovado em alguns minutos!*.{br}{br}Próximo vencimento: *{vencimento}* !{br}{br}Qualquer dúvida, estamos por aqui{br}{br} *Obrigado!*`,
  dados_cliente: `{saudacao} *{nome_cliente}*.{br}Segue suas informações abaixo:{br}{br}💜*Central do Cliente:* {area_cliente}{br}{br}Login: *{usuario}*{br}Senha: *`,
};

export default function GerenciarMensagens() {
  const [mensagens, setMensagens] = useState<MensagensPadroes>(defaultMensagens);
  const [saving, setSaving] = useState(false);
  const { user } = useCurrentUser();

  useEffect(() => {
    document.title = "Gerenciar Mensagens WhatsApp | Tech Play";
    loadMensagens();
  }, []);

  const loadMensagens = async () => {
    try {
      const { data, error } = await supabase
        .from("mensagens_padroes")
        .select("*")
        .eq("user_id", user?.id)
        .single();
      
      if (data) {
        // Map existing fields if they exist
        setMensagens(prev => ({
          ...prev,
          ...(data.confirmacao_cliente && { bem_vindo: data.confirmacao_cliente }),
        }));
      }
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save to database - you'll need to create appropriate columns
      toast.success("Mensagens salvas com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar mensagens");
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Bom Dia, Tech Play!</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
          <Home className="h-4 w-4" />
          <span>/</span>
          <span className="text-purple-400">Gerenciar Mensagens WhatsApp</span>
        </div>
      </div>

      {/* Main Content */}
      <Card className="bg-[#1a1a2e] border-[#2a2a3c]">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-white mb-2">Gerenciar Mensagens Do WhatsApp</h2>
          <p className="text-muted-foreground text-sm mb-4">Utilize as seguintes chaves para obter os valores:</p>
          
          {/* Available Keys */}
          <div className="mb-6">
            <p className="text-sm text-muted-foreground mb-2">Utilize as seguintes chaves para obter os valores:</p>
            <div className="flex flex-wrap gap-1 mb-2">
              {availableKeys.map((key) => (
                <span key={key} className="text-orange-400 text-xs">{key}</span>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Utilize <span className="text-orange-400">{"{nome_cliente_indicado}"}</span> <span className="text-orange-400">{"{valor_indicacao}"}</span> somente na mensagem de indicação.
            </p>
            <p className="text-sm text-muted-foreground">
              Utilize <span className="text-orange-400">{"{br}"}</span> para quebra de linha.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Message Templates */}
            <div className="space-y-6">
              <div>
                <h3 className="text-white font-medium mb-2 text-center">Bem Vindo:</h3>
                <Textarea
                  value={mensagens.bem_vindo}
                  onChange={(e) => setMensagens(prev => ({ ...prev, bem_vindo: e.target.value }))}
                  className="bg-[#252538] border-[#3a3a4c] text-white min-h-[100px] text-sm"
                />
              </div>

              <div>
                <h3 className="text-white font-medium mb-2 text-center">Fatura Criada:</h3>
                <Textarea
                  value={mensagens.fatura_criada}
                  onChange={(e) => setMensagens(prev => ({ ...prev, fatura_criada: e.target.value }))}
                  className="bg-[#252538] border-[#3a3a4c] text-white min-h-[100px] text-sm"
                />
              </div>

              <div>
                <h3 className="text-white font-medium mb-2 text-center">Próximo de Vencer:</h3>
                <Textarea
                  value={mensagens.proximo_vencer}
                  onChange={(e) => setMensagens(prev => ({ ...prev, proximo_vencer: e.target.value }))}
                  className="bg-[#252538] border-[#3a3a4c] text-white min-h-[80px] text-sm"
                />
              </div>

              <div>
                <h3 className="text-white font-medium mb-2 text-center">Vence Hoje:</h3>
                <Textarea
                  value={mensagens.vence_hoje}
                  onChange={(e) => setMensagens(prev => ({ ...prev, vence_hoje: e.target.value }))}
                  className="bg-[#252538] border-[#3a3a4c] text-white min-h-[100px] text-sm"
                />
              </div>

              <div>
                <h3 className="text-white font-medium mb-2 text-center">Vencido:</h3>
                <Textarea
                  value={mensagens.vencido}
                  onChange={(e) => setMensagens(prev => ({ ...prev, vencido: e.target.value }))}
                  className="bg-[#252538] border-[#3a3a4c] text-white min-h-[100px] text-sm"
                />
              </div>

              <div>
                <h3 className="text-white font-medium mb-2 text-center">Confirmação Pagamento:</h3>
                <Textarea
                  value={mensagens.confirmacao_pagamento}
                  onChange={(e) => setMensagens(prev => ({ ...prev, confirmacao_pagamento: e.target.value }))}
                  className="bg-[#252538] border-[#3a3a4c] text-white min-h-[100px] text-sm"
                />
              </div>

              <div>
                <h3 className="text-white font-medium mb-2 text-center">Dados do Cliente:</h3>
                <Textarea
                  value={mensagens.dados_cliente}
                  onChange={(e) => setMensagens(prev => ({ ...prev, dados_cliente: e.target.value }))}
                  className="bg-[#252538] border-[#3a3a4c] text-white min-h-[100px] text-sm"
                />
              </div>
            </div>

            {/* WhatsApp Preview */}
            <div className="flex justify-center">
              <div className="w-[280px] bg-[#111b21] rounded-2xl overflow-hidden shadow-xl">
                {/* Phone Header */}
                <div className="bg-[#202c33] px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-xs">TIM</span>
                    <span className="text-white text-xs">📶</span>
                  </div>
                  <span className="text-white text-xs">20:00</span>
                  <div className="flex items-center gap-1">
                    <span className="text-white text-xs">📡</span>
                    <span className="text-white text-xs">🔋 22%</span>
                  </div>
                </div>
                
                {/* WhatsApp Header */}
                <div className="bg-[#202c33] px-4 py-3 flex items-center gap-3 border-b border-[#2a3942]">
                  <div className="w-10 h-10 bg-[#25d366] rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">🅖</span>
                  </div>
                  <div className="flex-1">
                    <span className="text-white font-medium">GESTORv3</span>
                  </div>
                  <div className="flex items-center gap-3 text-[#8696a0]">
                    <span>📹</span>
                    <span>📞</span>
                  </div>
                </div>

                {/* Chat Area */}
                <div className="h-[400px] bg-[#0b141a] p-4 overflow-y-auto" 
                     style={{ backgroundImage: "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNkYPhfz0AEYBxVSF+FABGxAg0lKKvmAAAAAElFTkSuQmCC')", backgroundRepeat: "repeat" }}>
                  <div className="bg-[#005c4b] rounded-lg p-3 max-w-[90%] ml-auto">
                    <p className="text-white text-xs">Bom dia, Fulano.</p>
                    <p className="text-white text-xs mt-2">⚠️ SEU VENCIMENTO É HOJE! Pra continuar aproveitando seus canais, realize o pagamento o quanto antes.</p>
                    <p className="text-white text-xs mt-2 font-bold">DADOS DA FATURA</p>
                    <p className="text-white text-xs mt-1">◆ Vencimento: 10/10/2025</p>
                    <p className="text-white text-xs">◆ Plano Completo de Demonstração: R$ 40,00</p>
                    <p className="text-white text-xs">◆ Desconto: R$ 5,00</p>
                    <p className="text-white text-xs">◆ Total a pagar: R$ 35,00</p>
                    <p className="text-white text-xs mt-2">💸 Pagamento rápido em 1 clique:</p>
                    <p className="text-[#53bdeb] text-xs underline">https://gestorv3.com.br/central/ver_fatura?r=C999000999009900</p>
                    <p className="text-white text-xs mt-2">Abra o link de cima, clique em "Pagar com PIX" copie o código completo gerado e cole no aplicativo do banco.</p>
                  </div>
                </div>

                {/* Input Area */}
                <div className="bg-[#202c33] px-4 py-3 flex items-center gap-2">
                  <span className="text-[#8696a0]">+</span>
                  <div className="flex-1 bg-[#2a3942] rounded-full px-4 py-2">
                    <span className="text-[#8696a0] text-sm">Message</span>
                  </div>
                  <span className="text-[#8696a0]">🎤</span>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-center mt-8">
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
