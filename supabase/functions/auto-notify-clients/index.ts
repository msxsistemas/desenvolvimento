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

  // Use Brazil timezone for greeting
  const brTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const hour = brTime.getHours();
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
    '{pix}': clientData.pix || '',
    '{link_fatura}': clientData.link_fatura || '',
    '{fatura_pdf}': clientData.fatura_pdf || '',
  };

  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
  }
  result = result.replace(/{br}/g, '\n');
  return result;
}

async function sendNotification(
  supabase: any,
  evolutionUrl: string,
  evolutionKey: string,
  sessionId: string,
  userId: string,
  cliente: any,
  templateMsg: string,
  tipoNotificacao: string,
  planosMap: Map<string, any>,
): Promise<'sent' | 'error' | 'skipped'> {
  // Use Brazil timezone for dedup check
  const brTodayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const todayStart = new Date(brTodayStr + 'T00:00:00-03:00');
  const todayEnd = new Date(brTodayStr + 'T23:59:59-03:00');

  // Check if already sent successfully today (skip failed ones so they can be retried)
  const { data: existing } = await supabase
    .from('whatsapp_messages')
    .select('id')
    .eq('user_id', userId)
    .eq('phone', cliente.whatsapp)
    .eq('session_id', `auto_${tipoNotificacao}`)
    .eq('status', 'sent')
    .gte('created_at', todayStart.toISOString())
    .lte('created_at', todayEnd.toISOString())
    .limit(1);

  if (existing && existing.length > 0) return 'skipped';

  const plano = cliente.plano ? planosMap.get(cliente.plano) : null;
  const planoNome = (plano as any)?.nome || cliente.plano || '';
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
    pix: '',
    link_fatura: '',
    fatura_pdf: '',
  });

  try {
    const phone = cliente.whatsapp.replace(/\D/g, '');
    const normalizedPhone = !phone.startsWith('55') && phone.length >= 10 ? '55' + phone : phone;

    const sendResp = await fetch(`${evolutionUrl}/message/sendText/${sessionId}`, {
      method: 'POST',
      headers: { 'apikey': evolutionKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: normalizedPhone, text: message }),
    });

    const status = sendResp.ok ? 'sent' : 'failed';

    await supabase.from('whatsapp_messages').insert({
      user_id: userId,
      phone: cliente.whatsapp,
      message,
      session_id: `auto_${tipoNotificacao}`,
      status,
      sent_at: new Date().toISOString(),
    });

    if (sendResp.ok) {
      console.log(`✅ [${tipoNotificacao}] Sent to ${cliente.nome} (${normalizedPhone})`);
      return 'sent';
    } else {
      const errText = await sendResp.text().catch(() => 'unknown');
      console.error(`❌ [${tipoNotificacao}] Failed for ${cliente.nome}: ${sendResp.status} - ${errText}`);
      return 'error';
    }
  } catch (sendErr: any) {
    console.error(`❌ Send error for ${cliente.nome}:`, sendErr.message);

    await supabase.from('whatsapp_messages').insert({
      user_id: userId,
      phone: cliente.whatsapp,
      message,
      session_id: `auto_${tipoNotificacao}`,
      status: 'failed',
      error_message: sendErr.message,
      sent_at: new Date().toISOString(),
    });

    return 'error';
  }
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
      .select('user_id, vencido, vence_hoje, proximo_vencer, fatura_criada, aniversario_cliente, confirmacao_pagamento');

    if (msgErr) throw msgErr;
    if (!allMensagens || allMensagens.length === 0) {
      console.log('No mensagens_padroes configured for any user');
      return new Response(JSON.stringify({ message: 'No templates configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use Brazil timezone for date comparisons
    const hojeStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }); // YYYY-MM-DD
    const hoje = new Date(hojeStr + 'T00:00:00');

    let totalSent = 0;
    let totalErrors = 0;
    let totalSkipped = 0;

    for (const msg of allMensagens) {
      if (!msg.user_id) continue;
      const userId = msg.user_id;

      // Load user's notification config
      const { data: notifConfig } = await supabase
        .from('notificacoes_config')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const diasProximoVencer = notifConfig?.dias_proximo_vencer ?? 3;
      const diasAposVencimento = notifConfig?.dias_apos_vencimento ?? 2;
      const notifVencendoHoje = notifConfig?.notif_vencendo_hoje ?? true;

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

      // Convert session_id to Evolution API instance name format (underscores instead of hyphens)
      const sessionId = `user_${userId.replace(/-/g, '_')}`;

      // Get user's clients with lembretes enabled
      const { data: clientes, error: clientErr } = await supabase
        .from('clientes')
        .select('*')
        .eq('user_id', userId)
        .eq('lembretes', true)
        .not('data_vencimento', 'is', null);

      if (clientErr) {
        console.error(`Error fetching clientes for ${userId}:`, clientErr.message);
      }

      // Get ALL clients for birthday check
      const { data: allClientes } = await supabase
        .from('clientes')
        .select('*')
        .eq('user_id', userId);

      // Get user's planos
      const { data: planos } = await supabase
        .from('planos')
        .select('id, nome, valor')
        .eq('user_id', userId);

      const planosMap = new Map((planos || []).map((p: any) => [p.id, p]));
      // Also map by name for fallback
      (planos || []).forEach((p: any) => planosMap.set(p.nome, p));

      // --- Expiration notifications ---
      if (clientes && clientes.length > 0) {
        const limiteProximoVencer = new Date(hoje);
        limiteProximoVencer.setDate(limiteProximoVencer.getDate() + diasProximoVencer);

        const limiteVencido = new Date(hoje);
        limiteVencido.setDate(limiteVencido.getDate() - diasAposVencimento);

        for (const cliente of clientes) {
          if (!cliente.whatsapp || !cliente.data_vencimento) continue;

          const dataVenc = new Date(cliente.data_vencimento);
          dataVenc.setHours(0, 0, 0, 0);

          let templateMsg: string | null = null;
          let tipoNotificacao: string | null = null;

          // Vencido (within configured days after expiration)
          if (dataVenc < hoje && dataVenc >= limiteVencido && msg.vencido) {
            templateMsg = msg.vencido;
            tipoNotificacao = 'vencido';
          }
          // Vence hoje
          else if (dataVenc.getTime() === hoje.getTime() && notifVencendoHoje && msg.vence_hoje) {
            templateMsg = msg.vence_hoje;
            tipoNotificacao = 'vence_hoje';
          }
          // Próximo de vencer (within configured days before expiration, skip 0 = disabled)
          else if (diasProximoVencer > 0 && dataVenc > hoje && dataVenc <= limiteProximoVencer && msg.proximo_vencer) {
            templateMsg = msg.proximo_vencer;
            tipoNotificacao = 'proximo_vencer';
          }

          if (!templateMsg || !tipoNotificacao) continue;

          const result = await sendNotification(supabase, evolutionUrl, evolutionKey, sessionId, userId, cliente, templateMsg, tipoNotificacao, planosMap);
          if (result === 'sent') totalSent++;
          else if (result === 'error') totalErrors++;
          else totalSkipped++;
        }
      }

      // --- Birthday notifications ---
      const notifAniversario = notifConfig?.notif_aniversario ?? true;
      if (notifAniversario && msg.aniversario_cliente && allClientes && allClientes.length > 0) {
        const hojeMonth = hoje.getMonth() + 1;
        const hojeDay = hoje.getDate();

        for (const cliente of allClientes) {
          if (!cliente.whatsapp || !cliente.aniversario) continue;

          let bDay: number | null = null;
          let bMonth: number | null = null;
          const aniv = cliente.aniversario.trim();

          if (aniv.includes('/')) {
            const parts = aniv.split('/');
            bDay = parseInt(parts[0], 10);
            bMonth = parseInt(parts[1], 10);
          } else if (aniv.includes('-')) {
            const parts = aniv.split('-');
            if (parts[0].length === 4) {
              bMonth = parseInt(parts[1], 10);
              bDay = parseInt(parts[2], 10);
            } else {
              bDay = parseInt(parts[0], 10);
              bMonth = parseInt(parts[1], 10);
            }
          }

          if (!bDay || !bMonth) continue;
          if (bMonth !== hojeMonth || bDay !== hojeDay) continue;

          const result = await sendNotification(supabase, evolutionUrl, evolutionKey, sessionId, userId, cliente, msg.aniversario_cliente, 'aniversario', planosMap);
          if (result === 'sent') totalSent++;
          else if (result === 'error') totalErrors++;
          else totalSkipped++;
        }
      }
    }

    const summary = { totalSent, totalErrors, totalSkipped, timestamp: new Date().toISOString() };
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
