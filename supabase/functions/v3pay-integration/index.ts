import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const V3PAY_BASE_URL = 'https://api.v3pay.com.br/v1';

async function getVaultSecret(supabaseAdmin: any, userId: string, gateway: string, secretName: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.rpc('get_gateway_secret', {
    p_user_id: userId,
    p_gateway: gateway,
    p_secret_name: secretName,
  });
  if (error) {
    console.error('Vault read error:', error.message);
    return null;
  }
  return data;
}

async function storeVaultSecret(supabaseAdmin: any, userId: string, gateway: string, secretName: string, secretValue: string): Promise<void> {
  const { error } = await supabaseAdmin.rpc('store_gateway_secret', {
    p_user_id: userId,
    p_gateway: gateway,
    p_secret_name: secretName,
    p_secret_value: secretValue,
  });
  if (error) throw new Error('Vault store error: ' + error.message);
}

async function verifyHmacSignature(data: any, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(JSON.stringify(data)));
  const expected = 'sha256=' + Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return expected === signature;
}

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
    console.log(`🔄 Auto-renewal result for ${clienteWhatsapp}:`, JSON.stringify(data));
    return data;
  } catch (err: any) {
    console.error(`❌ Auto-renewal failed:`, err.message);
    return { success: false, error: err.message };
  }
}

async function handleWebhook(body: any, supabaseAdmin: any) {
  const { event, data, signature } = body;

  if (!event || !data) {
    return new Response(JSON.stringify({ error: 'Invalid webhook payload: missing event or data' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
  }

  console.log('📩 V3Pay Webhook received:', event);

  let verifiedUserId: string | null = null;

  if (signature) {
    const { data: configs } = await supabaseAdmin
      .from('v3pay_config')
      .select('user_id, webhook_secret')
      .not('webhook_secret', 'is', null);

    if (configs) {
      for (const cfg of configs) {
        if (cfg.webhook_secret && await verifyHmacSignature(data, signature, cfg.webhook_secret)) {
          verifiedUserId = cfg.user_id;
          console.log('✅ Webhook signature verified for user:', cfg.user_id);
          break;
        }
      }
    }
    if (!verifiedUserId) {
      console.warn('⚠️ Webhook signature verification failed - rejecting');
      return new Response(JSON.stringify({ error: 'Invalid webhook signature' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });
    }
  } else {
    console.warn('⚠️ No webhook signature provided - rejecting');
    return new Response(JSON.stringify({ error: 'Missing webhook signature' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });
  }

  switch (event) {
    case 'order.paid': {
      console.log('💰 Order paid:', JSON.stringify(data));
      
      const chargeId = data.id || data.order_id || data.charge_id || '';
      if (chargeId) {
        const { data: cobranca } = await supabaseAdmin
          .from('cobrancas')
          .select('*')
          .eq('gateway', 'v3pay')
          .eq('gateway_charge_id', String(chargeId))
          .eq('status', 'pendente')
          .maybeSingle();

        if (cobranca) {
          console.log(`📋 Cobrança encontrada para cliente: ${cobranca.cliente_whatsapp}`);
          await triggerAutoRenewal(cobranca.user_id, cobranca.cliente_whatsapp, 'v3pay', String(chargeId));
        } else if (verifiedUserId && data.customer_phone) {
          console.log(`📋 Usando telefone do webhook: ${data.customer_phone}`);
          await triggerAutoRenewal(verifiedUserId, data.customer_phone, 'v3pay', String(chargeId));
        } else {
          console.warn('⚠️ Não foi possível identificar o cliente para renovação automática');
        }
      }
      break;
    }
    case 'order.created':
      console.log('📝 Order created:', JSON.stringify(data));
      break;
    case 'login.detected':
      console.log('🔐 Login detected:', JSON.stringify(data));
      break;
    case 'ebook.delivered':
      console.log('📚 eBook delivered:', JSON.stringify(data));
      break;
    case 'giftcard.delivered':
      console.log('🎁 Gift card delivered:', JSON.stringify(data));
      break;
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

      // Store token in Supabase Vault (encrypted at rest)
      await storeVaultSecret(supabaseAdmin, user.id, 'v3pay', 'api_token', apiToken);

      const { error: upsertError } = await supabaseAdmin
        .from('v3pay_config')
        .upsert({
          user_id: user.id,
          api_token_hash: 'vault',
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
      // Get token from Vault
      const apiToken = await getVaultSecret(supabaseAdmin, user.id, 'v3pay', 'api_token');

      if (!apiToken) {
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
        headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
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

      if (customer_phone && chargeData.id) {
        await supabaseAdmin.from('cobrancas').insert({
          user_id: user.id,
          gateway: 'v3pay',
          gateway_charge_id: String(chargeData.id),
          cliente_whatsapp: customer_phone,
          cliente_nome: customer_name || null,
          valor: parseFloat(amount),
          status: 'pendente',
        });
      }

      return new Response(JSON.stringify({ success: true, charge: chargeData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    case 'create-order': {
      const apiToken = await getVaultSecret(supabaseAdmin, user.id, 'v3pay', 'api_token');

      if (!apiToken) {
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
        headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
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
      const apiToken = await getVaultSecret(supabaseAdmin, user.id, 'v3pay', 'api_token');

      if (!apiToken) {
        return new Response(JSON.stringify({ success: false, error: 'V3Pay não configurado.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
      }

      const { orderId } = body;
      if (!orderId) {
        return new Response(JSON.stringify({ success: false, error: 'orderId é obrigatório.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
      }

      const resp = await fetch(`${V3PAY_BASE_URL}/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
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

Deno.serve(async (req) => {
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

    if (body.event) {
      return await handleWebhook(body, supabaseAdmin);
    }

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