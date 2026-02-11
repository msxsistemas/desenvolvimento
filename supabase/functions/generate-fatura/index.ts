import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const ASAAS_BASE_URL = 'https://www.asaas.com/api/v3';

function parseMoneyToNumber(input: unknown): number | null {
  if (typeof input === 'number') {
    return Number.isFinite(input) ? input : null;
  }

  if (typeof input !== 'string') return null;

  const raw = input.replace(/\u00A0/g, ' ').trim();
  if (!raw) return null;

  // Remove currency symbols/letters and keep digits and separators
  let cleaned = raw.replace(/[^0-9,.-]/g, '');
  if (!cleaned) return null;

  // If both dot and comma exist, assume dot is thousands and comma is decimal (pt-BR)
  if (cleaned.includes(',') && cleaned.includes('.')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',') && !cleaned.includes('.')) {
    // Only comma -> decimal
    cleaned = cleaned.replace(',', '.');
  }

  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;

  return n;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { action } = body;

    // Public action: get fatura by ID (no auth needed)
    if (action === 'get-fatura') {
      const { fatura_id } = body;
      if (!fatura_id) {
        return new Response(JSON.stringify({ error: 'fatura_id é obrigatório' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
      }

      const { data: fatura, error } = await supabaseAdmin
        .from('faturas')
        .select('*')
        .eq('id', fatura_id)
        .maybeSingle();

      if (error || !fatura) {
        return new Response(JSON.stringify({ error: 'Fatura não encontrada' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 });
      }

      // If pending, check payment status in real-time based on gateway
      if (fatura.status === 'pendente' && fatura.gateway_charge_id) {
        if (fatura.gateway === 'asaas') {
          const asaasApiKey = Deno.env.get('ASAAS_API_KEY');
          if (asaasApiKey) {
            try {
              const statusResp = await fetch(`${ASAAS_BASE_URL}/payments/${fatura.gateway_charge_id}`, {
                headers: { 'access_token': asaasApiKey, 'Content-Type': 'application/json' }
              });
              const statusData = await statusResp.json();

              if (statusResp.ok && (statusData.status === 'RECEIVED' || statusData.status === 'CONFIRMED')) {
                await supabaseAdmin
                  .from('faturas')
                  .update({ status: 'pago', paid_at: new Date().toISOString() })
                  .eq('id', fatura.id);

                fatura.status = 'pago';
                fatura.paid_at = new Date().toISOString();
                console.log(`✅ Fatura ${fatura.id} marked as paid via Asaas status check`);
              }
            } catch (err: any) {
              console.error('Asaas status check error:', err.message);
            }
          }
        } else if (fatura.gateway === 'mercadopago') {
          // Check MP payment status
          const { data: mpConfig } = await supabaseAdmin
            .from('mercadopago_config')
            .select('access_token_hash')
            .eq('user_id', fatura.user_id)
            .eq('is_configured', true)
            .maybeSingle();

          if (mpConfig?.access_token_hash) {
            try {
              const accessToken = atob(mpConfig.access_token_hash);
              const statusResp = await fetch(`https://api.mercadopago.com/v1/payments/${fatura.gateway_charge_id}`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
              });
              const statusData = await statusResp.json();

              if (statusResp.ok && statusData.status === 'approved') {
                await supabaseAdmin
                  .from('faturas')
                  .update({ status: 'pago', paid_at: new Date().toISOString() })
                  .eq('id', fatura.id);

                fatura.status = 'pago';
                fatura.paid_at = new Date().toISOString();
                console.log(`✅ Fatura ${fatura.id} marked as paid via MercadoPago status check`);
              }
            } catch (err: any) {
              console.error('MercadoPago status check error:', err.message);
            }
          }
        } else if (fatura.gateway === 'ciabra') {
          // Check Ciabra payment status
          const { data: ciabraConfig } = await supabaseAdmin
            .from('ciabra_config')
            .select('api_key_hash')
            .eq('user_id', fatura.user_id)
            .eq('is_configured', true)
            .maybeSingle();

          if (ciabraConfig?.api_key_hash) {
            try {
              const apiKey = atob(ciabraConfig.api_key_hash);
              const statusResp = await fetch(`https://api.az.center/v1/charges/${fatura.gateway_charge_id}`, {
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
              });
              const statusData = await statusResp.json();

              const isPaid = statusData.status === 'paid' || statusData.status === 'approved' || statusData.status === 'confirmed';
              if (statusResp.ok && isPaid) {
                await supabaseAdmin
                  .from('faturas')
                  .update({ status: 'pago', paid_at: new Date().toISOString() })
                  .eq('id', fatura.id);

                fatura.status = 'pago';
                fatura.paid_at = new Date().toISOString();
                console.log(`✅ Fatura ${fatura.id} marked as paid via Ciabra status check`);
              }
            } catch (err: any) {
              console.error('Ciabra status check error:', err.message);
            }
          }
        }
      }

      // If pending, also check cobrancas table for webhook-confirmed payments
      if (fatura.status === 'pendente' && fatura.gateway_charge_id) {
        const { data: cobranca } = await supabaseAdmin
          .from('cobrancas')
          .select('renovado')
          .eq('gateway_charge_id', fatura.gateway_charge_id)
          .maybeSingle();

        if (cobranca?.renovado) {
          await supabaseAdmin
            .from('faturas')
            .update({ status: 'pago', paid_at: new Date().toISOString() })
            .eq('id', fatura.id);

          fatura.status = 'pago';
          fatura.paid_at = new Date().toISOString();
          console.log(`✅ Fatura ${fatura.id} marked as paid via cobranca webhook`);
        }
      }

      return new Response(JSON.stringify({ success: true, fatura }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Auth required for other actions
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });
    }

    if (action === 'create') {
      const { cliente_id, cliente_nome, cliente_whatsapp, plano_nome, valor } = body;
      const parsedValor = parseMoneyToNumber(valor);

      if (!cliente_nome || !cliente_whatsapp || parsedValor === null) {
        return new Response(JSON.stringify({ error: 'Dados obrigatórios: cliente_nome, cliente_whatsapp, valor (ex: 25.00 ou 25,00)' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
      }

      // 1. Get checkout config
      const { data: checkoutConfig } = await supabaseAdmin
        .from('checkout_config')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      let gateway: string | null = null;
      let pix_qr_code: string | null = null;
      let pix_copia_cola: string | null = null;
      let pix_manual_key: string | null = null;
      let gateway_charge_id: string | null = null;

      // 2. Generate PIX based on checkout config and active gateway
      const gatewayAtivo = checkoutConfig?.gateway_ativo || 'asaas';
      
      if (checkoutConfig?.pix_enabled) {
        gateway = gatewayAtivo;

        if (gatewayAtivo === 'asaas') {
          const asaasApiKey = Deno.env.get('ASAAS_API_KEY');
          if (asaasApiKey) {
            try {
              const custResp = await fetch(`${ASAAS_BASE_URL}/customers`, {
                method: 'POST',
                headers: { 'access_token': asaasApiKey, 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: cliente_nome, phone: cliente_whatsapp })
              });
              let custData = await custResp.json();

              if (!custResp.ok && custData.errors?.[0]?.description?.includes('already exists')) {
                const searchResp = await fetch(`${ASAAS_BASE_URL}/customers?name=${encodeURIComponent(cliente_nome)}&limit=1`, {
                  headers: { 'access_token': asaasApiKey, 'Content-Type': 'application/json' }
                });
                const searchData = await searchResp.json();
                if (searchData.data?.[0]) custData = searchData.data[0];
              }

              if (custData.id) {
                const chargeResp = await fetch(`${ASAAS_BASE_URL}/payments`, {
                  method: 'POST',
                  headers: { 'access_token': asaasApiKey, 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    customer: custData.id,
                    billingType: 'PIX',
                    value: parsedValor,
                    description: `Renovação - ${plano_nome || 'Plano'}`,
                  })
                });
                const chargeData = await chargeResp.json();

                if (chargeResp.ok && chargeData.id) {
                  gateway_charge_id = chargeData.id;
                  const pixResp = await fetch(`${ASAAS_BASE_URL}/payments/${chargeData.id}/pixQrCode`, {
                    headers: { 'access_token': asaasApiKey, 'Content-Type': 'application/json' }
                  });
                  const pixData = await pixResp.json();
                  if (pixResp.ok) {
                    pix_qr_code = pixData.encodedImage || null;
                    pix_copia_cola = pixData.payload || null;
                  }

                  await supabaseAdmin.from('cobrancas').insert({
                    user_id: user.id, gateway: 'asaas', gateway_charge_id: chargeData.id,
                    cliente_whatsapp, cliente_nome, valor: parsedValor, status: 'pendente',
                  });
                }
              }
            } catch (err: any) {
              console.error('Asaas PIX error:', err.message);
            }
          }
        } else if (gatewayAtivo === 'v3pay') {
          // V3Pay PIX generation
          try {
            const { data: v3Config } = await supabaseAdmin
              .from('v3pay_config').select('*').eq('user_id', user.id).maybeSingle();
            if (v3Config) {
              const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
              const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
              console.log('📌 V3Pay gateway selected - charge creation delegated');
            }
          } catch (err: any) {
            console.error('V3Pay PIX error:', err.message);
          }
        } else if (gatewayAtivo === 'mercadopago') {
          try {
            const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
            const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
            const mpResp = await fetch(`${supabaseUrl}/functions/v1/mercadopago-integration`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
              },
              body: JSON.stringify({
                action: 'create-pix',
                valor: String(valor),
                descricao: `Renovação - ${plano_nome || 'Plano'}`,
                cliente_nome,
              }),
            });
            const mpData = await mpResp.json();
            console.log('📋 MercadoPago PIX result:', JSON.stringify(mpData));

            if (mpData.success && mpData.charge_id) {
              gateway_charge_id = mpData.charge_id;
              pix_qr_code = mpData.pix_qr_code || null;
              pix_copia_cola = mpData.pix_copia_cola || null;

              await supabaseAdmin.from('cobrancas').insert({
                user_id: user.id, gateway: 'mercadopago', gateway_charge_id: mpData.charge_id,
                cliente_whatsapp, cliente_nome, valor: parsedValor, status: 'pendente',
              });
            }
          } catch (err: any) {
            console.error('MercadoPago PIX error:', err.message);
          }
        } else if (gatewayAtivo === 'ciabra') {
          try {
            const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
            const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
            const ciabraResp = await fetch(`${supabaseUrl}/functions/v1/ciabra-integration`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
              },
              body: JSON.stringify({
                action: 'create-pix',
                valor: String(valor),
                descricao: `Renovação - ${plano_nome || 'Plano'}`,
                cliente_nome,
              }),
            });
            const ciabraData = await ciabraResp.json();
            console.log('📋 Ciabra PIX result:', JSON.stringify(ciabraData));

            if (ciabraData.success && ciabraData.charge_id) {
              gateway_charge_id = ciabraData.charge_id;
              pix_qr_code = ciabraData.pix_qr_code || null;
              pix_copia_cola = ciabraData.pix_copia_cola || null;

              await supabaseAdmin.from('cobrancas').insert({
                user_id: user.id, gateway: 'ciabra', gateway_charge_id: ciabraData.charge_id,
                cliente_whatsapp, cliente_nome, valor: parsedValor, status: 'pendente',
              });
            }
          } catch (err: any) {
            console.error('Ciabra PIX error:', err.message);
          }
        }
      }
      
      if (!gateway && checkoutConfig?.pix_manual_enabled && checkoutConfig?.pix_manual_key) {
        gateway = 'pix_manual';
        pix_manual_key = checkoutConfig.pix_manual_key;
      }

      // 3. Create fatura record
      const { data: fatura, error: insertError } = await supabaseAdmin
        .from('faturas')
        .insert({
          user_id: user.id,
          cliente_id: cliente_id || null,
          cliente_nome,
          cliente_whatsapp,
          plano_nome: plano_nome || null,
          valor: parsedValor,
          gateway,
          gateway_charge_id,
          pix_qr_code,
          pix_copia_cola,
          pix_manual_key,
          status: 'pendente',
        })
        .select()
        .single();

      if (insertError) {
        console.error('Insert fatura error:', insertError);
        return new Response(JSON.stringify({ error: 'Erro ao criar fatura' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
      }

      // 4. Send WhatsApp with invoice link
      const faturaUrl = `${req.headers.get('origin') || 'https://id-preview--bde754a3-9b0e-4fc4-b801-0602657a64ed.lovable.app'}/fatura/${fatura.id}`;
      
      try {
        const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
        const evolutionKey = Deno.env.get('EVOLUTION_API_KEY');
        
        if (evolutionUrl && evolutionKey) {
          // Get user's WhatsApp session
          const { data: sessions } = await supabaseAdmin
            .from('whatsapp_sessions')
            .select('session_id')
            .eq('user_id', user.id)
            .eq('status', 'connected')
            .limit(1);

          if (sessions && sessions.length > 0) {
            const sessionId = sessions[0].session_id;
            const phone = cliente_whatsapp.replace(/\D/g, '');
            const message = `Olá ${cliente_nome}! 🧾\n\nSua fatura de renovação está disponível:\n\n📋 *Plano:* ${plano_nome || 'N/A'}\n💰 *Valor:* R$ ${parsedValor.toFixed(2)}\n\n🔗 Acesse o link para pagar:\n${faturaUrl}\n\nObrigado! 🙏`;
            
            await fetch(`${evolutionUrl}/message/sendText/${sessionId}`, {
              method: 'POST',
              headers: { 'apikey': evolutionKey, 'Content-Type': 'application/json' },
              body: JSON.stringify({ number: phone, text: message })
            });
            console.log('✅ WhatsApp message sent to:', phone);
          }
        }
      } catch (whatsErr: any) {
        console.error('WhatsApp send error:', whatsErr.message);
      }

      return new Response(JSON.stringify({ success: true, fatura, url: faturaUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Ação inválida', available: ['create', 'get-fatura'] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });

  } catch (error: any) {
    console.error('🚨 Generate Fatura Error:', error);
    return new Response(JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});
