import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function replaceTemplateVariables(
  template: string,
  clientData: Record<string, string>,
): string {
  if (!template) return '';

  const nomeCompleto = clientData.nome || '';
  const partes = nomeCompleto.trim().split(' ');
  const primeiroNome = partes[0] || '';
  const sobrenome = partes.length > 1 ? partes.slice(1).join(' ') : '';

  let vencimentoFormatado = '';
  if (clientData.data_vencimento) {
    try {
      const date = new Date(clientData.data_vencimento);
      vencimentoFormatado = date.toLocaleDateString('pt-BR');
    } catch {
      vencimentoFormatado = clientData.data_vencimento;
    }
  }

  const hour = new Date().getHours();
  const saudacao = hour >= 5 && hour < 12 ? 'Bom dia' : hour >= 12 && hour < 18 ? 'Boa tarde' : 'Boa noite';

  const replacements: Record<string, string> = {
    '{saudacao}': saudacao,
    '{nome_cliente}': nomeCompleto,
    '{nome}': primeiroNome,
    '{cliente}': nomeCompleto,
    '{sobrenome}': sobrenome,
    '{whatsapp}': clientData.whatsapp || '',
    '{email}': clientData.email || '',
    '{usuario}': clientData.usuario || '',
    '{senha}': clientData.senha || '',
    '{vencimento}': vencimentoFormatado,
    '{data_vencimento}': vencimentoFormatado,
    '{nome_plano}': clientData.plano_nome || '',
    '{plano}': clientData.plano_nome || '',
    '{valor_plano}': clientData.valor_plano || '',
    '{valor}': clientData.valor_plano || '',
    '{desconto}': clientData.desconto || '',
    '{obs}': clientData.observacao || '',
    '{app}': clientData.app || '',
    '{dispositivo}': clientData.dispositivo || '',
    '{telas}': clientData.telas || '',
    '{mac}': clientData.mac || '',
  };

  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
  }
  result = result.replace(/{br}/g, '\n');
  return result;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
    const evolutionKey = Deno.env.get('EVOLUTION_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!evolutionUrl || !evolutionKey) {
      console.log('⚠️ Evolution API not configured, skipping auto-notify');
      return new Response(JSON.stringify({ message: 'Evolution API not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all users who have mensagens_padroes configured
    const { data: allMensagens, error: msgErr } = await supabase
      .from('mensagens_padroes')
      .select('user_id, vencido, vence_hoje, proximo_vencer');

    if (msgErr) throw msgErr;
    if (!allMensagens || allMensagens.length === 0) {
      console.log('No mensagens_padroes configured for any user');
      return new Response(JSON.stringify({ message: 'No templates configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const tresDias = new Date(hoje);
    tresDias.setDate(tresDias.getDate() + 3);

    let totalSent = 0;
    let totalErrors = 0;

    for (const msg of allMensagens) {
      if (!msg.user_id) continue;
      const userId = msg.user_id;

      // Check if user has connected WhatsApp session
      const { data: sessions } = await supabase
        .from('whatsapp_sessions')
        .select('session_id')
        .eq('user_id', userId)
        .eq('status', 'connected')
        .limit(1);

      if (!sessions || sessions.length === 0) {
        console.log(`User ${userId}: no connected WhatsApp session, skipping`);
        continue;
      }

      const sessionId = sessions[0].session_id;

      // Get user's clients with expiration dates and lembretes enabled
      const { data: clientes, error: clientErr } = await supabase
        .from('clientes')
        .select('*')
        .eq('user_id', userId)
        .eq('lembretes', true)
        .not('data_vencimento', 'is', null);

      if (clientErr || !clientes || clientes.length === 0) continue;

      // Get user's planos for variable replacement
      const { data: planos } = await supabase
        .from('planos')
        .select('id, nome, valor')
        .eq('user_id', userId);

      const planosMap = new Map((planos || []).map((p: any) => [p.id, p]));

      for (const cliente of clientes) {
        if (!cliente.whatsapp || !cliente.data_vencimento) continue;

        const dataVenc = new Date(cliente.data_vencimento);
        dataVenc.setHours(0, 0, 0, 0);

        let templateMsg: string | null = null;
        let tipoNotificacao: string | null = null;

        if (dataVenc < hoje) {
          templateMsg = msg.vencido;
          tipoNotificacao = 'vencido';
        } else if (dataVenc.getTime() === hoje.getTime()) {
          templateMsg = msg.vence_hoje;
          tipoNotificacao = 'vence_hoje';
        } else if (dataVenc > hoje && dataVenc <= tresDias) {
          templateMsg = msg.proximo_vencer;
          tipoNotificacao = 'proximo_vencer';
        }

        if (!templateMsg || !tipoNotificacao) continue;

        // Check if we already sent this notification today to avoid duplicates
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const { data: existing } = await supabase
          .from('whatsapp_messages')
          .select('id')
          .eq('user_id', userId)
          .eq('phone', cliente.whatsapp)
          .eq('session_id', `auto_${tipoNotificacao}`)
          .gte('created_at', todayStart.toISOString())
          .lte('created_at', todayEnd.toISOString())
          .limit(1);

        if (existing && existing.length > 0) {
          continue; // Already notified today
        }

        // Build variable data
        const plano = cliente.plano ? planosMap.get(cliente.plano) : null;
        const planoNome = (plano as any)?.nome || '';
        const valorPlano = (plano as any)?.valor || '';

        const message = replaceTemplateVariables(templateMsg, {
          nome: cliente.nome || '',
          whatsapp: cliente.whatsapp || '',
          email: cliente.email || '',
          usuario: cliente.usuario || '',
          senha: cliente.senha || '',
          data_vencimento: cliente.data_vencimento || '',
          plano_nome: planoNome,
          valor_plano: valorPlano ? `R$ ${valorPlano}` : '',
          desconto: cliente.desconto || '',
          observacao: cliente.observacao || '',
          app: cliente.app || '',
          dispositivo: cliente.dispositivo || '',
          telas: cliente.telas?.toString() || '',
          mac: cliente.mac || '',
        });

        try {
          const phone = cliente.whatsapp.replace(/\D/g, '');

          // Send via Evolution API
          const sendResp = await fetch(`${evolutionUrl}/message/sendText/${sessionId}`, {
            method: 'POST',
            headers: { 'apikey': evolutionKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ number: phone, text: message }),
          });

          const status = sendResp.ok ? 'sent' : 'failed';

          // Log in whatsapp_messages
          await supabase.from('whatsapp_messages').insert({
            user_id: userId,
            phone: cliente.whatsapp,
            message: message,
            session_id: `auto_${tipoNotificacao}`,
            status,
            sent_at: new Date().toISOString(),
          });

          if (sendResp.ok) {
            totalSent++;
            console.log(`✅ [${tipoNotificacao}] Sent to ${cliente.nome} (${phone})`);
          } else {
            totalErrors++;
            console.error(`❌ [${tipoNotificacao}] Failed for ${cliente.nome}: ${sendResp.statusText}`);
          }
        } catch (sendErr: any) {
          totalErrors++;
          console.error(`❌ Send error for ${cliente.nome}:`, sendErr.message);
        }
      }
    }

    const summary = { totalSent, totalErrors, timestamp: new Date().toISOString() };
    console.log('📊 Auto-notify summary:', JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('🚨 Auto-notify error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
