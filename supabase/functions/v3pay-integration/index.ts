import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const V3PAY_BASE_URL = 'https://api.v3pay.com.br/v1';

async function verifyHmacSignature(data: any, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(JSON.stringify(data)));
  const expected = 'sha256=' + Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return expected === signature;
}

async function handleWebhook(body: any, supabaseAdmin: any) {
  const { event, data, signature } = body;

  if (!event || !data) {
    return new Response(JSON.stringify({ error: 'Invalid webhook payload: missing event or data' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
  }

  console.log('📩 V3Pay Webhook received:', event);

  // Try to find the user's config to validate signature if secret is set
  // V3Pay webhooks don't include user_id, so we check all configs with webhook_secret
  if (signature) {
    const { data: configs } = await supabaseAdmin
      .from('v3pay_config')
      .select('user_id, webhook_secret')
      .not('webhook_secret', 'is', null);

    let verified = false;
    if (configs) {
      for (const cfg of configs) {
        if (cfg.webhook_secret && await verifyHmacSignature(data, signature, cfg.webhook_secret)) {
          verified = true;
          console.log('✅ Webhook signature verified for user:', cfg.user_id);
          break;
        }
      }
    }
    if (!verified) {
      console.warn('⚠️ Webhook signature verification failed');
    }
  }

  // Process webhook events
  switch (event) {
    case 'order.paid': {
      console.log('💰 Order paid:', JSON.stringify(data));
      // Here you could update transaction status, activate client, etc.
      break;
    }
    case 'order.created': {
      console.log('📝 Order created:', JSON.stringify(data));
      break;
    }
    case 'login.detected': {
      console.log('🔐 Login detected:', JSON.stringify(data));
      break;
    }
    case 'ebook.delivered': {
      console.log('📚 eBook delivered:', JSON.stringify(data));
      break;
    }
    case 'giftcard.delivered': {
      console.log('🎁 Gift card delivered:', JSON.stringify(data));
      break;
    }
    default:
      console.log('ℹ️ Unknown event:', event, JSON.stringify(data));
  }

  return new Response(JSON.stringify({ success: true, event }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function handleAuthenticatedAction(action: string, body: any, user: any, supabaseAdmin: any) {
  switch (action) {
    case 'configure': {
      const { apiToken } = body;
      if (!apiToken) {
        return new Response(JSON.stringify({ success: false, error: 'Token da API é obrigatório' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
      }

      try {
        const testResp = await fetch(`${V3PAY_BASE_URL}/orders/0`, {
          headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' }
        });
        if (testResp.status === 401) {
          throw new Error('Token inválido');
        }
        console.log('✅ V3Pay token validated, status:', testResp.status);
      } catch (error: any) {
        if (error.message === 'Token inválido') {
          return new Response(JSON.stringify({ success: false, error: 'Token da API V3Pay inválido ou sem permissão.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
        }
        console.warn('⚠️ Could not validate token (network issue):', error.message);
      }

      const { error: upsertError } = await supabaseAdmin
        .from('v3pay_config')
        .upsert({
          user_id: user.id,
          api_token_hash: apiToken,
          is_configured: true,
        }, { onConflict: 'user_id' });

      if (upsertError) {
        console.error('DB error:', upsertError);
        return new Response(JSON.stringify({ success: false, error: 'Erro ao salvar configuração.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
      }

      return new Response(JSON.stringify({ success: true, message: 'V3Pay configurado com sucesso!' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    case 'create-charge': {
      const { data: config } = await supabaseAdmin
        .from('v3pay_config')
        .select('api_token_hash')
        .eq('user_id', user.id)
        .single();

      if (!config?.api_token_hash) {
        return new Response(JSON.stringify({ success: false, error: 'V3Pay não configurado.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
      }

      const { amount, description, customer_name, customer_email, customer_phone, customer_document } = body;
      if (!amount || !description) {
        return new Response(JSON.stringify({ success: false, error: 'Valor e descrição são obrigatórios.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
      }

      const chargeResp = await fetch(`${V3PAY_BASE_URL}/charges`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${config.api_token_hash}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          description,
          customer_name: customer_name || undefined,
          customer_email: customer_email || undefined,
          customer_phone: customer_phone || undefined,
          customer_document: customer_document || undefined,
          origin: 'Gestor IPTV',
        }),
      });

      const chargeData = await chargeResp.json();
      if (!chargeResp.ok) {
        return new Response(JSON.stringify({ success: false, error: chargeData.message || 'Erro ao criar cobrança.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: chargeResp.status });
      }

      return new Response(JSON.stringify({ success: true, charge: chargeData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    case 'create-order': {
      const { data: config } = await supabaseAdmin
        .from('v3pay_config')
        .select('api_token_hash')
        .eq('user_id', user.id)
        .single();

      if (!config?.api_token_hash) {
        return new Response(JSON.stringify({ success: false, error: 'V3Pay não configurado.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
      }

      const { product_id, customer_name, customer_email, customer_phone, customer_document } = body;
      if (!product_id || !customer_name || !customer_email) {
        return new Response(JSON.stringify({ success: false, error: 'product_id, customer_name e customer_email são obrigatórios.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
      }

      const orderResp = await fetch(`${V3PAY_BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${config.api_token_hash}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id, customer_name, customer_email,
          customer_phone: customer_phone || undefined,
          customer_document: customer_document || undefined,
          origin: 'Gestor IPTV',
        }),
      });

      const orderData = await orderResp.json();
      if (!orderResp.ok) {
        return new Response(JSON.stringify({ success: false, error: orderData.message || 'Erro ao criar pedido.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: orderResp.status });
      }

      return new Response(JSON.stringify({ success: true, order: orderData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    case 'get-order': {
      const { data: config } = await supabaseAdmin
        .from('v3pay_config')
        .select('api_token_hash')
        .eq('user_id', user.id)
        .single();

      if (!config?.api_token_hash) {
        return new Response(JSON.stringify({ success: false, error: 'V3Pay não configurado.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
      }

      const { orderId } = body;
      if (!orderId) {
        return new Response(JSON.stringify({ success: false, error: 'orderId é obrigatório.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
      }

      const resp = await fetch(`${V3PAY_BASE_URL}/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${config.api_token_hash}`, 'Content-Type': 'application/json' },
      });

      const data = await resp.json();
      if (!resp.ok) {
        return new Response(JSON.stringify({ success: false, error: data.message || 'Erro ao consultar pedido.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: resp.status });
      }

      return new Response(JSON.stringify({ success: true, order: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    default:
      return new Response(JSON.stringify({
        error: 'Invalid action',
        available: ['configure', 'create-charge', 'create-order', 'get-order']
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 V3Pay Integration - Starting request processing...');

    let body: any = {};
    if (req.method === 'POST') {
      const raw = await req.text();
      if (raw.trim()) body = JSON.parse(raw);
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // If the body has an "event" field, treat as webhook from V3Pay (no auth required)
    if (body.event) {
      return await handleWebhook(body, supabaseAdmin);
    }

    // Otherwise, it's an authenticated user action
    const action = body.action;
    console.log('🎯 Action:', action);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });
    }

    console.log('✅ User authenticated:', user.id);
    return await handleAuthenticatedAction(action, body, user, supabaseAdmin);

  } catch (error: any) {
    console.error('🚨 V3Pay Error:', error);
    return new Response(JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});
