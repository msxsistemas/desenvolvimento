import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timeout após ${ms}ms`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); })
     .catch((e) => { clearTimeout(t); reject(e); });
  });
}

/**
 * Auto-renew a client after payment confirmation.
 * 
 * Expects POST body:
 * {
 *   user_id: string,           // Owner user ID
 *   cliente_whatsapp: string,   // Client WhatsApp to find
 *   gateway: string,            // Gateway name for logging
 *   gateway_charge_id?: string  // Optional charge ID for tracking
 * }
 * 
 * This function:
 * 1. Finds the client by WhatsApp number
 * 2. Gets their plan to calculate renewal duration
 * 3. Updates the client's expiration date
 * 4. If product has auto-renewal + linked panel, triggers server renewal
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { user_id, cliente_whatsapp, gateway, gateway_charge_id } = body;

    if (!user_id || !cliente_whatsapp) {
      return new Response(JSON.stringify({ success: false, error: 'user_id e cliente_whatsapp são obrigatórios' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }

    console.log(`🔄 Auto-renovação iniciada - WhatsApp: ***${String(cliente_whatsapp).slice(-4)}, Gateway: ${gateway}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Find client by WhatsApp
    // Normalize WhatsApp: remove non-digits for comparison
    const normalizedWhatsapp = cliente_whatsapp.replace(/\D/g, '');
    
    const { data: clientes, error: clienteError } = await supabase
      .from('clientes')
      .select('*')
      .eq('user_id', user_id)
      .eq('ativo', true);

    if (clienteError || !clientes || clientes.length === 0) {
      console.error('❌ Nenhum cliente encontrado');
      return new Response(JSON.stringify({ success: false, error: 'Nenhum cliente encontrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 });
    }

    // Match by normalized WhatsApp
    const cliente = clientes.find(c => {
      const clienteNorm = (c.whatsapp || '').replace(/\D/g, '');
      return clienteNorm === normalizedWhatsapp || 
             clienteNorm.endsWith(normalizedWhatsapp) || 
             normalizedWhatsapp.endsWith(clienteNorm);
    });

    if (!cliente) {
      console.error(`❌ Cliente com WhatsApp ***${String(cliente_whatsapp).slice(-4)} não encontrado`);
      return new Response(JSON.stringify({ success: false, error: `Cliente com WhatsApp ${cliente_whatsapp} não encontrado` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 });
    }

    console.log(`✅ Cliente encontrado (ID: ${cliente.id})`);

    // 2. Get the plan to calculate duration
    let renewalMonths = 1; // default: 1 month
    let renewalDays = 30;

    if (cliente.plano) {
      const { data: plano } = await supabase
        .from('planos')
        .select('*')
        .eq('user_id', user_id)
        .eq('nome', cliente.plano)
        .maybeSingle();

      if (plano) {
        const quantidade = parseInt(plano.quantidade || '1') || 1;
        const tipo = plano.tipo || 'meses';
        
        if (tipo === 'meses') {
          renewalMonths = quantidade;
          renewalDays = quantidade * 30;
        } else if (tipo === 'dias') {
          renewalMonths = 0;
          renewalDays = quantidade;
        }
        console.log(`📋 Plano "${plano.nome}": ${quantidade} ${tipo}`);
      }
    }

    // 3. Calculate new expiration date
    const now = new Date();
    const currentExpiry = cliente.data_vencimento ? new Date(cliente.data_vencimento) : now;
    const baseDate = currentExpiry > now ? currentExpiry : now;
    
    const newExpiry = new Date(baseDate);
    if (renewalMonths > 0) {
      newExpiry.setMonth(newExpiry.getMonth() + renewalMonths);
    } else {
      newExpiry.setDate(newExpiry.getDate() + renewalDays);
    }

    console.log(`📅 Nova data de vencimento: ${newExpiry.toISOString()}`);

    // 4. Update client expiration and mark as paid
    const { error: updateError } = await supabase
      .from('clientes')
      .update({
        data_vencimento: newExpiry.toISOString(),
        fatura: 'Pago',
      })
      .eq('id', cliente.id);

    if (updateError) {
      console.error('❌ Erro ao atualizar cliente:', updateError);
      return new Response(JSON.stringify({ success: false, error: 'Erro ao atualizar data de vencimento' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
    }

    console.log(`✅ Cliente ${cliente.nome} atualizado - vencimento: ${newExpiry.toISOString()}`);

    // 5. If product has auto-renewal and linked panel, trigger server renewal
    let serverRenewalResult: any = null;

    if (cliente.produto) {
      // produto field may contain UUID (id) or name - try both
      let produto: any = null;
      const { data: produtoById } = await supabase
        .from('produtos')
        .select('*, paineis_integracao(*)')
        .eq('user_id', user_id)
        .eq('id', cliente.produto)
        .maybeSingle();
      
      if (produtoById) {
        produto = produtoById;
      } else {
        const { data: produtoByNome } = await supabase
          .from('produtos')
          .select('*, paineis_integracao(*)')
          .eq('user_id', user_id)
          .eq('nome', cliente.produto)
          .maybeSingle();
        produto = produtoByNome;
      }

      if (produto?.renovacao_automatica && produto?.painel_id && produto?.paineis_integracao) {
        const painel = produto.paineis_integracao;
        console.log(`🔄 Renovação no servidor - Provedor: ${painel.provedor}, Painel: ${painel.nome}`);

        const providerFunctionMap: Record<string, string> = {
          'mundogf': 'mundogf-renew',
          'sigma-v2': 'sigma-renew',
          'uniplay': 'uniplay-renew',
          'koffice-api': 'koffice-renew',
          'koffice-v2': 'koffice-renew',
          'playfast': 'playfast-renew',
        };
        const functionName = providerFunctionMap[painel.provedor] || 'playfast-renew';

        try {
          let renewBody: any;

          if (functionName === 'playfast-renew') {
            renewBody = {
              token: painel.url.split('/').pop() || painel.usuario,
              secret: painel.senha,
              username: cliente.usuario,
              month: renewalMonths || Math.ceil(renewalDays / 30),
              action: 'renew',
            };
          } else {
            renewBody = {
              action: 'renew_by_username',
              panelId: painel.id,
              username: cliente.usuario,
              duration: renewalMonths > 0 ? renewalMonths : renewalDays,
              durationIn: renewalMonths > 0 ? 'months' : 'days',
              clienteScreens: cliente.telas || 1,
            };
          }

          // MundoGF needs longer timeout due to 2Captcha solving (~50s)
          const renewTimeout = functionName === 'mundogf-renew' ? 90000 : 30000;
          console.log(`⏱️ Chamando ${functionName} (timeout: ${renewTimeout/1000}s)`);
          
          const renewResp = await withTimeout(
            fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify(renewBody),
            }),
            renewTimeout
          );

          const renewData = await renewResp.json();
          serverRenewalResult = renewData;

          if (renewData.success) {
            console.log(`✅ Renovação no servidor concluída: ${JSON.stringify(renewData)}`);
          } else {
            console.warn(`⚠️ Renovação no servidor falhou: ${renewData.error || 'Erro desconhecido'}`);
          }
        } catch (err: any) {
          console.error(`❌ Erro na renovação do servidor: ${err.message}`);
          serverRenewalResult = { success: false, error: err.message };
        }
      }
    }

    // 6. Log the auto-renewal
    await supabase.from('logs_painel').insert({
      user_id: user_id,
      acao: `Renovação automática via ${gateway}: ${cliente.nome} (${cliente_whatsapp}) → +${renewalMonths > 0 ? renewalMonths + ' meses' : renewalDays + ' dias'}${serverRenewalResult?.success ? ' + servidor renovado' : ''}`,
      tipo: 'renovacao',
    });

    // 7. Update cobranca status if charge_id provided
    if (gateway_charge_id) {
      await supabase
        .from('cobrancas')
        .update({ status: 'pago', renovado: true })
        .eq('gateway', gateway)
        .eq('gateway_charge_id', gateway_charge_id)
        .eq('user_id', user_id);
    }

    // 8. Send WhatsApp confirmation message
    let whatsappResult: any = null;
    try {
      // Get confirmation message template
      const { data: mensagensPadroes } = await supabase
        .from('mensagens_padroes')
        .select('confirmacao_pagamento')
        .eq('user_id', user_id)
        .maybeSingle();

      const templateMsg = mensagensPadroes?.confirmacao_pagamento;
      if (templateMsg) {
        // Get plan value for variable replacement
        let valorPlano = '';
        if (cliente.plano) {
          const { data: planoData } = await supabase
            .from('planos')
            .select('valor')
            .eq('user_id', user_id)
            .eq('nome', cliente.plano)
            .maybeSingle();
          if (planoData?.valor) {
            valorPlano = `R$ ${parseFloat(planoData.valor).toFixed(2).replace('.', ',')}`;
          }
        }

        // Replace variables in template
        const nomeCompleto = cliente.nome || '';
        const partes = nomeCompleto.trim().split(' ');
        const sobrenome = partes.length > 1 ? partes[partes.length - 1] : '';
        const hour = new Date().getHours();
        const saudacao = hour >= 5 && hour < 12 ? 'Bom dia' : hour >= 12 && hour < 18 ? 'Boa tarde' : 'Boa noite';
        const vencFormatado = newExpiry.toLocaleDateString('pt-BR');

        const replacements: Record<string, string> = {
          '{saudacao}': saudacao,
          '{nome_cliente}': nomeCompleto,
          '{sobrenome}': sobrenome,
          '{whatsapp}': cliente.whatsapp || '',
          '{email}': cliente.email || '',
          '{usuario}': cliente.usuario || '',
          '{senha}': cliente.senha || '',
          '{vencimento}': vencFormatado,
          '{nome_plano}': cliente.plano || '',
          '{valor_plano}': valorPlano,
          '{desconto}': cliente.desconto || '',
          '{obs}': cliente.observacao || '',
          '{app}': cliente.app || '',
          '{dispositivo}': cliente.dispositivo || '',
          '{telas}': cliente.telas?.toString() || '',
          '{mac}': cliente.mac || '',
        };

        let finalMsg = templateMsg;
        Object.entries(replacements).forEach(([key, value]) => {
          finalMsg = finalMsg.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
        });
        finalMsg = finalMsg.replace(/{br}/g, '\n');

        // Send via Evolution API
        const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
        const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');

        if (EVOLUTION_API_URL && EVOLUTION_API_KEY) {
          const instanceName = `user_${user_id.replace(/-/g, '_')}`;
          const apiUrl = EVOLUTION_API_URL.replace(/\/$/, '');
          const formattedPhone = (cliente.whatsapp || '').replace(/\D/g, '');

          const sendResp = await withTimeout(
            fetch(`${apiUrl}/message/sendText/${instanceName}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
              body: JSON.stringify({ number: formattedPhone, text: finalMsg, delay: 1200 }),
            }),
            15000
          );
          const sendData = await sendResp.json();
          whatsappResult = { success: sendResp.ok, data: sendData };
          console.log(`📱 WhatsApp enviado para ***${formattedPhone.slice(-4)}: ${sendResp.ok ? '✅' : '❌'}`);
        } else {
          console.warn('⚠️ Evolution API não configurada, mensagem não enviada');
          whatsappResult = { success: false, error: 'Evolution API não configurada' };
        }
      } else {
        console.log('ℹ️ Sem template de confirmação de pagamento configurado');
        whatsappResult = { success: false, error: 'Template não configurado' };
      }
    } catch (whatsErr: any) {
      console.error(`❌ Erro ao enviar WhatsApp: ${whatsErr.message}`);
      whatsappResult = { success: false, error: whatsErr.message };
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Cliente ${cliente.nome} renovado com sucesso`,
      cliente_nome: cliente.nome,
      nova_data_vencimento: newExpiry.toISOString(),
      server_renewal: serverRenewalResult,
      whatsapp_message: whatsappResult,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('🚨 Auto-renew error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});
