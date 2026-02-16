import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MP_BASE_URL = 'https://api.mercadopago.com';

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 Mercado Pago Integration - Starting...');

    let body: any = {};
    if (req.method === 'POST') {
      const raw = await req.text();
      if (raw.trim()) body = JSON.parse(raw);
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if this is a webhook from Mercado Pago
    if (body.type === 'payment' || body.action === 'payment.updated' || body.action === 'payment.created') {
      console.log('📩 MP Webhook received:', body.type || body.action);

      const paymentId = body.data?.id;
      if (paymentId) {
        // Look up configured MP users to verify payment via API
        const { data: mpConfigs } = await supabaseAdmin
          .from('mercadopago_config')
          .select('user_id')
          .eq('is_configured', true)
          .limit(5);

        let paymentVerified = false;
        let verifiedPaymentStatus = '';
        if (mpConfigs) {
          for (const cfg of mpConfigs) {
            try {
              const token = await getVaultSecret(supabaseAdmin, cfg.user_id, 'mercadopago', 'access_token');
              if (!token) continue;
              const verifyResp = await fetch(`${MP_BASE_URL}/v1/payments/${paymentId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (verifyResp.ok) {
                const paymentData = await verifyResp.json();
                verifiedPaymentStatus = paymentData.status;
                paymentVerified = true;
                break;
              }
            } catch { /* try next config */ }
          }
        }

        if (!paymentVerified) {
          console.warn('⚠️ Could not verify MP webhook payment - rejecting');
          return new Response(JSON.stringify({ error: 'Unverified webhook' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });
        }

        console.log('✅ MP webhook verified, payment status:', verifiedPaymentStatus);

        if (verifiedPaymentStatus === 'approved') {
          const chargeId = String(paymentId);
          
          const { data: cobranca } = await supabaseAdmin
            .from('cobrancas')
            .select('*')
            .eq('gateway', 'mercadopago')
            .eq('gateway_charge_id', chargeId)
            .eq('status', 'pendente')
            .maybeSingle();

          if (cobranca) {
            console.log(`📋 Cobrança MP encontrada para: ${cobranca.cliente_whatsapp}`);
            await triggerAutoRenewal(cobranca.user_id, cobranca.cliente_whatsapp, 'mercadopago', chargeId);
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
        const { accessToken, webhookUrl } = body;

        if (!accessToken) {
          return new Response(
            JSON.stringify({ success: false, error: 'Access Token é obrigatório' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        try {
          const testResp = await fetch(`${MP_BASE_URL}/v1/payment_methods`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });

          if (!testResp.ok) {
            throw new Error('Access Token inválido');
          }

          // Store token in Supabase Vault (encrypted at rest)
          await storeVaultSecret(supabaseAdmin, user.id, 'mercadopago', 'access_token', accessToken);

          const { data: existing } = await supabaseAdmin
            .from('mercadopago_config')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (existing) {
            await supabaseAdmin
              .from('mercadopago_config')
              .update({
                access_token_hash: 'vault',
                webhook_url: webhookUrl || null,
                is_configured: true,
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id);
          } else {
            await supabaseAdmin
              .from('mercadopago_config')
              .insert({
                user_id: user.id,
                access_token_hash: 'vault',
                webhook_url: webhookUrl || null,
                is_configured: true
              });
          }

          return new Response(
            JSON.stringify({ success: true, message: 'Mercado Pago configurado com sucesso' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error: any) {
          console.error('MP validation failed:', error);
          return new Response(
            JSON.stringify({ success: false, error: 'Access Token inválido ou sem permissão' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }
      }

      case 'create-pix': {
        const { valor, descricao, cliente_nome, cliente_email } = body;

        if (!valor) {
          return new Response(
            JSON.stringify({ success: false, error: 'Valor é obrigatório' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        // Get access token from Vault
        const accessToken = await getVaultSecret(supabaseAdmin, user.id, 'mercadopago', 'access_token');

        if (!accessToken) {
          return new Response(
            JSON.stringify({ success: false, error: 'Mercado Pago não configurado' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        try {
          const paymentResp = await fetch(`${MP_BASE_URL}/v1/payments`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'X-Idempotency-Key': crypto.randomUUID(),
            },
            body: JSON.stringify({
              transaction_amount: parseFloat(valor),
              description: descricao || `Cobrança - ${cliente_nome || 'Cliente'}`,
              payment_method_id: 'pix',
              payer: {
                email: cliente_email || `${Date.now()}@placeholder.com`,
                first_name: cliente_nome || 'Cliente',
              },
            }),
          });

          const paymentData = await paymentResp.json();
          console.log('📋 MP payment response status:', paymentResp.status);

          if (!paymentResp.ok) {
            const errMsg = paymentData.message || paymentData.cause?.[0]?.description || 'Erro ao criar pagamento MP';
            throw new Error(errMsg);
          }

          const txData = paymentData.point_of_interaction?.transaction_data;

          return new Response(
            JSON.stringify({
              success: true,
              charge_id: String(paymentData.id),
              pix_qr_code: txData?.qr_code_base64 || null,
              pix_copia_cola: txData?.qr_code || null,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error: any) {
          console.error('MP create-pix error:', error);
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
    console.error('🚨 MP Integration Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});