import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MP_BASE_URL = 'https://api.mercadopago.com';

serve(async (req) => {
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

    const action = body.action;
    console.log('🎯 Action:', action);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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

        // Validate token with MP API
        try {
          const testResp = await fetch(`${MP_BASE_URL}/v1/payment_methods`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });

          if (!testResp.ok) {
            throw new Error('Access Token inválido');
          }

          // Save config to DB
          const tokenHash = btoa(accessToken.substring(0, 10) + accessToken.substring(accessToken.length - 10));

          const { data: existing } = await supabaseAdmin
            .from('mercadopago_config')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (existing) {
            await supabaseAdmin
              .from('mercadopago_config')
              .update({
                access_token_hash: tokenHash,
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
                access_token_hash: tokenHash,
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

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action', available: ['configure'] }),
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