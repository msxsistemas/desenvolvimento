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
              <div className="w-[380px] bg-[#111b21] rounded-[2.5rem] overflow-hidden shadow-2xl border border-[#2a3942]">
                {/* Phone Notch */}
                <div className="bg-black h-7 flex items-center justify-center">
                  <div className="w-24 h-5 bg-black rounded-b-2xl"></div>
                </div>
                
                {/* Phone Status Bar */}
                <div className="bg-[#1f2c34] px-5 py-1 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white text-[11px] font-semibold">Vivo</span>
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M2 17h2v4H2v-4zm4-5h2v9H6v-9zm4-4h2v13h-2V8zm4-4h2v17h-2V4zm4-2h2v19h-2V2z"/>
                    </svg>
                  </div>
                  <span className="text-white text-[11px] font-semibold">09:00</span>
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 3C6.95 3 3 5.95 3 9c0 2.13 1.5 4 3.68 5.03L5 21l4.22-2.63C10.13 18.45 11.05 18.5 12 18.5c5.05 0 9-2.45 9-5.5S17.05 3 12 3z"/>
                    </svg>
                    <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="2" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      <rect x="4" y="8" width="14" height="8" rx="1" fill="currentColor"/>
                      <rect x="20" y="9" width="2" height="6" rx="1" fill="currentColor"/>
                    </svg>
                    <span className="text-white text-[11px] font-semibold">100%</span>
                  </div>
                </div>
                
                {/* WhatsApp Header */}
                <div className="bg-[#1f2c34] px-4 py-2.5 flex items-center gap-3">
                  <svg className="w-5 h-5 text-[#8696a0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6"/>
                  </svg>
                  <div className="w-10 h-10 bg-[#25d366] rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-semibold text-[15px]">GESTORv3</p>
                    <p className="text-[#8696a0] text-xs">online</p>
                  </div>
                  <div className="flex items-center gap-5 text-[#8696a0]">
                    <Video className="w-5 h-5" />
                    <Phone className="w-5 h-5" />
                  </div>
                </div>

                {/* Template indicator */}
                <div className="bg-[#182229] px-3 py-1.5 text-center border-b border-[#2a3942]">
                  <span className="text-xs text-[#8696a0]">Preview: <span className="text-purple-400 font-medium">{getTemplateTitle()}</span></span>
                </div>

                {/* Chat Area */}
                <div 
                  className="h-[420px] bg-[#0b141a] p-4 overflow-y-auto" 
                  style={{ 
                    backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23182229\" fill-opacity=\"0.4\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')" 
                  }}
                >
                  <div className="bg-[#005c4b] rounded-lg p-3 max-w-[90%] ml-auto shadow-lg relative">
                    <div className="absolute -right-1 top-0 w-3 h-3 bg-[#005c4b]" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}></div>
                    <p className="text-white text-[13px] whitespace-pre-wrap leading-relaxed">
                      {renderPreview().split('\n').map((line, index) => {
                        const processedLine = line.split(/\*([^*]+)\*/g).map((part, i) => 
                          i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                        );
                        
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
                    <div className="flex justify-end items-center gap-1 mt-1">
                      <span className="text-[10px] text-[#ffffff99]">09:00</span>
                      <svg className="w-4 h-4 text-[#53bdeb]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M20 6L9 17l-5-5"/>
                        <path d="M15 6L4 17" strokeOpacity="0.5"/>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Input Area */}
                <div className="bg-[#1f2c34] px-3 py-2 flex items-center gap-2">
                  <div className="w-10 h-10 bg-[#2a3942] rounded-full flex items-center justify-center">
                    <span className="text-[#8696a0] text-xl">+</span>
                  </div>
                  <div className="flex-1 bg-[#2a3942] rounded-full px-4 py-2.5 flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#8696a0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                      <line x1="9" y1="9" x2="9.01" y2="9"/>
                      <line x1="15" y1="9" x2="15.01" y2="9"/>
                    </svg>
                    <span className="text-[#8696a0] text-sm">Mensagem</span>
                  </div>
                  <div className="w-10 h-10 bg-[#00a884] rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3z"/>
                      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                    </svg>
                  </div>
                </div>
                
                {/* Home Indicator */}
                <div className="bg-[#1f2c34] pb-2 flex justify-center">
                  <div className="w-32 h-1 bg-white/30 rounded-full"></div>
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
