import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Home, Video, Phone } from "lucide-react";
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

  // Function to render preview with sample data
  const renderPreview = () => {
    const sampleData: Record<string, string> = {
      "{saudacao}": "Bom dia",
      "{nome_cliente}": "Fulano",
      "{vencimento}": "10/10/2025",
      "{nome_plano}": "Plano Completo de Demonstração: R$ 40,00",
      "{desconto}": "R$ 5,00",
      "{subtotal}": "R$ 35,00",
      "{link_fatura}": "https://gestorv3.com.br/central/ver_fatura?r=C999000999009900",
      "{area_cliente}": "https://gestorv3.com.br/central",
      "{usuario}": "usuario123",
      "{senha}": "****",
      "{pix}": "pix@techplay.com",
      "{valor_plano}": "R$ 40,00",
      "{numero_fatura}": "999009900",
    };

    let preview = mensagens[selectedTemplate];
    
    // Replace variables with sample data
    Object.entries(sampleData).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    });
    
    // Replace {br} with actual line breaks
    preview = preview.replace(/{br}/g, '\n');
    
    return preview;
  };

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
            <div className="flex justify-center lg:sticky lg:top-6 self-start h-fit">
              <div className="w-[380px] bg-[#111b21] rounded-2xl overflow-hidden shadow-xl border border-border/30">
                {/* Phone Status Bar */}
                <div className="bg-[#202c33] px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-xs font-medium">TIM</span>
                    <span className="text-white text-xs">📶</span>
                  </div>
                  <span className="text-white text-xs font-medium">20:00</span>
                  <div className="flex items-center gap-1">
                    <span className="text-white text-xs">📡</span>
                    <span className="text-white text-xs">🔋 22%</span>
                  </div>
                </div>
                
                {/* WhatsApp Header */}
                <div className="bg-[#202c33] px-4 py-3 flex items-center gap-3 border-b border-[#2a3942]">
                  <div className="w-11 h-11 bg-[#25d366] rounded-full flex items-center justify-center">
                    <span className="text-white text-xl font-bold">G</span>
                  </div>
                  <div className="flex-1">
                    <span className="text-white font-semibold">GESTORv3</span>
                  </div>
                  <div className="flex items-center gap-4 text-[#8696a0]">
                    <Video className="w-5 h-5" />
                    <Phone className="w-5 h-5" />
                  </div>
                </div>

                {/* Template indicator */}
                <div className="bg-[#202c33]/50 px-3 py-2 text-center">
                  <span className="text-sm text-muted-foreground">Preview: <span className="text-purple-400 font-medium">{getTemplateTitle()}</span></span>
                </div>

                {/* Chat Area */}
                <div 
                  className="h-[450px] bg-[#0b141a] p-4 overflow-y-auto" 
                  style={{ 
                    backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23182229\" fill-opacity=\"0.4\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')" 
                  }}
                >
                  <div className="bg-[#005c4b] rounded-lg p-4 max-w-[95%] ml-auto shadow-md">
                    <p className="text-white text-sm whitespace-pre-wrap leading-relaxed">
                      {renderPreview().split('\n').map((line, index) => {
                        // Process bold text (text between asterisks)
                        const processedLine = line.split(/\*([^*]+)\*/g).map((part, i) => 
                          i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                        );
                        
                        // Check if line contains a URL
                        const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
                        if (urlMatch) {
                          return (
                            <span key={index}>
                              {line.split(urlMatch[0]).map((part, i) => (
                                <span key={i}>
                                  {part}
                                  {i === 0 && <span className="text-[#53bdeb] underline break-all">{urlMatch[0]}</span>}
                                </span>
                              ))}
                              {index < renderPreview().split('\n').length - 1 && <br />}
                            </span>
                          );
                        }
                        
                        return (
                          <span key={index}>
                            {processedLine}
                            {index < renderPreview().split('\n').length - 1 && <br />}
                          </span>
                        );
                      })}
                    </p>
                    <div className="flex justify-end mt-1">
                      <span className="text-[10px] text-[#8696a0]">20:00 ✓✓</span>
                    </div>
                  </div>
                </div>

                {/* Input Area */}
                <div className="bg-[#202c33] px-3 py-3 flex items-center gap-2">
                  <span className="text-[#8696a0] text-xl">+</span>
                  <div className="flex-1 bg-[#2a3942] rounded-full px-4 py-2">
                    <span className="text-[#8696a0] text-sm">Message</span>
                  </div>
                  <span className="text-[#8696a0]">📷</span>
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
