import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CIABRA_BASE_URL = 'https://api.az.center';

async function triggerAutoRenewal(userId: string, clienteWhatsapp: string, gateway: string, chargeId: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  try {
    const resp = await fetch(`${supabaseUrl}/functions/v1/auto-renew-client`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
      body: JSON.stringify({ user_id: userId, cliente_whatsapp: clienteWhatsapp, gateway, gateway_charge_id: chargeId }),
    });
    const data = await resp.json();
    console.log(`🔄 Auto-renewal result:`, JSON.stringify(data));
    return data;
  } catch (err: any) {
    console.error(`❌ Auto-renewal failed:`, err.message);
    return { success: false, error: err.message };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 Ciabra Integration - Starting...');

    let body: any = {};
    if (req.method === 'POST') {
      const raw = await req.text();
      if (raw.trim()) body = JSON.parse(raw);
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if this is a webhook from Ciabra
    if (body.event || body.type === 'payment') {
      console.log('📩 Ciabra Webhook received:', body.event || body.type);
      
      const isPaid = body.event === 'payment.confirmed' || body.event === 'payment.approved' || body.status === 'paid';
      if (isPaid) {
        const chargeId = String(body.id || body.payment_id || body.charge_id || '');
        
        if (chargeId) {
          const { data: cobranca } = await supabaseAdmin
            .from('cobrancas')
            .select('*')
            .eq('gateway', 'ciabra')
            .eq('gateway_charge_id', chargeId)
            .eq('status', 'pendente')
            .maybeSingle();

          if (cobranca) {
            console.log(`📋 Cobrança Ciabra encontrada para: ${cobranca.cliente_whatsapp}`);
            await triggerAutoRenewal(cobranca.user_id, cobranca.cliente_whatsapp, 'ciabra', chargeId);
          }
        }
      }
      
      return new Response(JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const action = body.action;
    console.log('🎯 Action:', action);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    console.log('✅ User authenticated:', user.id);

    switch (action) {
      case 'configure': {
        const { apiKey, publicKey, webhookUrl } = body;

        if (!apiKey) {
          return new Response(
            JSON.stringify({ success: false, error: 'Chave Secreta é obrigatória' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        try {
          // Store full key as base64 for later PIX generation
          const keyEncoded = btoa(apiKey);

          const { data: existing } = await supabaseAdmin
            .from('ciabra_config')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (existing) {
            await supabaseAdmin
              .from('ciabra_config')
              .update({
                api_key_hash: keyEncoded,
                webhook_url: webhookUrl || null,
                is_configured: true,
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id);
          } else {
            await supabaseAdmin
              .from('ciabra_config')
              .insert({
                user_id: user.id,
                api_key_hash: keyEncoded,
                webhook_url: webhookUrl || null,
                is_configured: true
              });
          }

          return new Response(
            JSON.stringify({ success: true, message: 'Ciabra configurado com sucesso' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error: any) {
          console.error('Ciabra config save failed:', error);
          return new Response(
            JSON.stringify({ success: false, error: error.message || 'Erro ao salvar configuração' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }
      }

      case 'create-pix': {
        const { valor, descricao, cliente_nome } = body;

        if (!valor) {
          return new Response(
            JSON.stringify({ success: false, error: 'Valor é obrigatório' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        // Get stored API key
        const { data: config } = await supabaseAdmin
          .from('ciabra_config')
          .select('api_key_hash')
          .eq('user_id', user.id)
          .eq('is_configured', true)
          .maybeSingle();

        if (!config?.api_key_hash) {
          return new Response(
            JSON.stringify({ success: false, error: 'Ciabra não configurado' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        const apiKey = atob(config.api_key_hash);

        try {
          const chargeResp = await fetch(`${CIABRA_BASE_URL}/v1/charges`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              amount: Math.round(parseFloat(valor) * 100),
              payment_method: 'pix',
              description: descricao || `Cobrança - ${cliente_nome || 'Cliente'}`,
            }),
          });

          const chargeData = await chargeResp.json();
          console.log('📋 Ciabra charge response:', JSON.stringify(chargeData));

          if (!chargeResp.ok) {
            throw new Error(chargeData.message || chargeData.error || 'Erro ao criar cobrança Ciabra');
          }

          return new Response(
            JSON.stringify({
              success: true,
              charge_id: String(chargeData.id || chargeData.charge_id || ''),
              pix_qr_code: chargeData.pix?.qr_code_base64 || chargeData.qr_code_base64 || chargeData.pix_qr_code || null,
              pix_copia_cola: chargeData.pix?.qr_code || chargeData.pix_code || chargeData.pix_copia_cola || chargeData.br_code || null,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error: any) {
          console.error('Ciabra create-pix error:', error);
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action', available: ['configure', 'create-pix'] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
  } catch (error: any) {
    console.error('🚨 Ciabra Integration Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
