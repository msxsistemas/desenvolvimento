import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const ASAAS_BASE_URL = 'https://www.asaas.com/api/v3';

// Generate a valid CPF for Asaas customer creation
function generateValidCpf(): string {
  const rnd = (n: number) => Math.floor(Math.random() * n);
  const digits = Array.from({ length: 9 }, () => rnd(9));
  for (let j = 0; j < 2; j++) {
    const len = digits.length;
    let sum = 0;
    for (let i = 0; i < len; i++) sum += digits[i] * (len + 1 - i);
    const rest = sum % 11;
    digits.push(rest < 2 ? 0 : 11 - rest);
  }
  return digits.join('');
}

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

Deno.serve(async (req) => {
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

      // Fetch company name from profile
      let nome_empresa: string | null = null;
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('nome_empresa')
        .eq('user_id', fatura.user_id)
        .maybeSingle();
      if (profile?.nome_empresa) {
        nome_empresa = profile.nome_empresa;
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
            .select('api_key_hash, public_key_hash')
            .eq('user_id', fatura.user_id)
            .eq('is_configured', true)
            .maybeSingle();

          if (ciabraConfig?.api_key_hash) {
            try {
              const privateKey = atob(ciabraConfig.api_key_hash);
              const publicKey = ciabraConfig.public_key_hash ? atob(ciabraConfig.public_key_hash) : '';
              const basicToken = btoa(`${publicKey}:${privateKey}`);
              const ciabraHeaders = { 'Authorization': `Basic ${basicToken}`, 'Content-Type': 'application/json' };
              
              // Check invoice status
              const statusResp = await fetch(`https://api.az.center/invoices/applications/invoices/${fatura.gateway_charge_id}`, {
                headers: ciabraHeaders
              });
              const statusText = await statusResp.text();
              console.log(`🔍 Ciabra status check for ${fatura.gateway_charge_id}: ${statusText.substring(0, 300)}`);
              let statusData: any = {};
              try { statusData = JSON.parse(statusText); } catch { /* empty */ }

              const invoiceStatus = (statusData.status || '').toUpperCase();
              let isPaid = ['PAID', 'APPROVED', 'CONFIRMED', 'COMPLETED'].includes(invoiceStatus);

              // Also check installment/PIX payment status if invoice level doesn't show paid
              if (!isPaid && statusResp.ok && statusData.installments?.[0]?.id) {
                const installmentId = statusData.installments[0].id;
                const payResp = await fetch(`https://api.az.center/payments/applications/installments/${installmentId}`, {
                  headers: ciabraHeaders
                });
                const payText = await payResp.text();
                console.log(`🔍 Ciabra installment status: ${payText.substring(0, 300)}`);
                let payData: any = {};
                try { payData = JSON.parse(payText); } catch { /* */ }
                const payment = Array.isArray(payData) ? payData[0] : payData;
                const pixStatus = (payment?.pix?.status || payment?.status || '').toUpperCase();
                isPaid = ['PAID', 'APPROVED', 'CONFIRMED', 'COMPLETED'].includes(pixStatus);
              }

              if (statusResp.ok && isPaid) {
                await supabaseAdmin
                  .from('faturas')
                  .update({ status: 'pago', paid_at: new Date().toISOString() })
                  .eq('id', fatura.id);

                fatura.status = 'pago';
                fatura.paid_at = new Date().toISOString();
                console.log(`✅ Fatura ${fatura.id} marked as paid via Ciabra status check`);

                // Trigger auto-renewal in background (non-blocking)
                const renewPromise = fetch(`${Deno.env.get('SUPABASE_URL')!}/functions/v1/auto-renew-client`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!}` },
                  body: JSON.stringify({
                    user_id: fatura.user_id,
                    cliente_whatsapp: fatura.cliente_whatsapp,
                    gateway: 'ciabra',
                    gateway_charge_id: fatura.gateway_charge_id,
                  }),
                }).then(() => console.log(`🔄 Auto-renewal triggered for ${fatura.cliente_whatsapp}`))
                  .catch((e: any) => console.error('Auto-renewal trigger error:', e.message));
                
                // Use EdgeRuntime.waitUntil if available, otherwise fire-and-forget
                if (typeof (globalThis as any).EdgeRuntime?.waitUntil === 'function') {
                  (globalThis as any).EdgeRuntime.waitUntil(renewPromise);
                }
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

      return new Response(JSON.stringify({ success: true, fatura: { ...fatura, nome_empresa } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Public action: generate PIX for existing fatura (no auth needed)
    if (action === 'generate-pix') {
      const { fatura_id } = body;
      if (!fatura_id) {
        return new Response(JSON.stringify({ error: 'fatura_id é obrigatório' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
      }

      const { data: fatura, error: faturaErr } = await supabaseAdmin
        .from('faturas')
        .select('*')
        .eq('id', fatura_id)
        .maybeSingle();

      if (faturaErr || !fatura) {
        console.error(`Fatura ${fatura_id} not found:`, faturaErr);
        return new Response(JSON.stringify({ error: 'Fatura não encontrada' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 });
      }

      if (fatura.status === 'pago') {
        return new Response(JSON.stringify({ success: true, fatura, message: 'Fatura já paga' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // If PIX data already exists, just return it
      if (fatura.pix_qr_code || fatura.pix_copia_cola || (fatura.gateway === 'pix_manual' && fatura.pix_manual_key)) {
        return new Response(JSON.stringify({ success: true, fatura }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Get checkout config from the fatura owner
      const { data: checkoutConfig } = await supabaseAdmin
        .from('checkout_config')
        .select('*')
        .eq('user_id', fatura.user_id)
        .maybeSingle();

      const gatewayAtivo = checkoutConfig?.gateway_ativo || fatura.gateway || 'asaas';
      let pix_qr_code: string | null = null;
      let pix_copia_cola: string | null = null;
      let pix_manual_key: string | null = null;
      let gateway_charge_id: string | null = fatura.gateway_charge_id;
      let gateway = fatura.gateway;

      if (checkoutConfig?.pix_enabled) {
        gateway = gatewayAtivo;

        if (gatewayAtivo === 'asaas') {
          const asaasApiKey = Deno.env.get('ASAAS_API_KEY');
          console.log(`Asaas ApiKey exists: ${!!asaasApiKey}, gateway_charge_id: ${fatura.gateway_charge_id}`);
          if (asaasApiKey) {
            try {
              // If already has a charge ID, try to get PIX data from it
              if (fatura.gateway_charge_id) {
                console.log(`Fetching PIX for existing charge ${fatura.gateway_charge_id}`);
                const pixResp = await fetch(`${ASAAS_BASE_URL}/payments/${fatura.gateway_charge_id}/pixQrCode`, {
                  headers: { 'access_token': asaasApiKey, 'Content-Type': 'application/json' }
                });
                const pixData = await pixResp.json();
                console.log(`PixResp status: ${pixResp.ok}, pixData: ${JSON.stringify(pixData).substring(0, 200)}`);
                if (pixResp.ok) {
                  pix_qr_code = pixData.encodedImage || null;
                  pix_copia_cola = pixData.payload || null;
                  console.log(`✅ PIX data retrieved for existing charge`);
                }
              } else {
                console.log(`No gateway_charge_id, creating new charge...`);
                // Create or find customer
                const custResp = await fetch(`${ASAAS_BASE_URL}/customers`, {
                  method: 'POST',
                  headers: { 'access_token': asaasApiKey, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: fatura.cliente_nome, phone: fatura.cliente_whatsapp, cpfCnpj: generateValidCpf() })
                });
                let custData = await custResp.json();
                console.log(`Customer response status: ${custResp.ok}, custData id: ${custData.id || 'error'}`);

                if (!custResp.ok) {
                  // Search for existing customer by phone
                  const searchResp = await fetch(`${ASAAS_BASE_URL}/customers?phone=${encodeURIComponent(fatura.cliente_whatsapp)}&limit=1`, {
                    headers: { 'access_token': asaasApiKey, 'Content-Type': 'application/json' }
                  });
                  const searchData = await searchResp.json();
                  if (searchData.data?.[0]) {
                    custData = searchData.data[0];
                    // Update customer with cpfCnpj if missing
                    if (!custData.cpfCnpj) {
                      await fetch(`${ASAAS_BASE_URL}/customers/${custData.id}`, {
                        method: 'PUT',
                        headers: { 'access_token': asaasApiKey, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ cpfCnpj: generateValidCpf() })
                      });
                    }
                  }
                }

                if (custData.id) {
                  const chargeResp = await fetch(`${ASAAS_BASE_URL}/payments`, {
                    method: 'POST',
                    headers: { 'access_token': asaasApiKey, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      customer: custData.id,
                      billingType: 'PIX',
                      value: fatura.valor,
                      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                      description: `Renovação - ${fatura.plano_nome || 'Plano'}`,
                    })
                  });
                  const chargeData = await chargeResp.json();
                  console.log(`Charge response ok: ${chargeResp.ok}, chargeData: ${JSON.stringify(chargeData).substring(0, 300)}`);

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

                    await supabaseAdmin.from('cobrancas').upsert({
                      user_id: fatura.user_id, gateway: 'asaas', gateway_charge_id: chargeData.id,
                      cliente_whatsapp: fatura.cliente_whatsapp, cliente_nome: fatura.cliente_nome,
                      valor: fatura.valor, status: 'pendente',
                    }, { onConflict: 'gateway_charge_id' });
                  }
                }
              }
            } catch (err: any) {
              console.error('Asaas PIX generate error:', err.message);
            }
          }
        } else if (gatewayAtivo === 'mercadopago') {
          try {
            const { data: mpConfig } = await supabaseAdmin
              .from('mercadopago_config')
              .select('access_token_hash')
              .eq('user_id', fatura.user_id)
              .eq('is_configured', true)
              .maybeSingle();

            if (mpConfig?.access_token_hash) {
              const accessToken = atob(mpConfig.access_token_hash);
              const mpResp = await fetch('https://api.mercadopago.com/v1/payments', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  transaction_amount: fatura.valor,
                  description: `Renovação - ${fatura.plano_nome || 'Plano'}`,
                  payment_method_id: 'pix',
                  payer: { email: `${fatura.cliente_whatsapp}@fatura.com` },
                }),
              });
              const mpData = await mpResp.json();

              if (mpResp.ok && mpData.id) {
                gateway_charge_id = String(mpData.id);
                pix_qr_code = mpData.point_of_interaction?.transaction_data?.qr_code_base64 || null;
                pix_copia_cola = mpData.point_of_interaction?.transaction_data?.qr_code || null;

                await supabaseAdmin.from('cobrancas').upsert({
                  user_id: fatura.user_id, gateway: 'mercadopago', gateway_charge_id: String(mpData.id),
                  cliente_whatsapp: fatura.cliente_whatsapp, cliente_nome: fatura.cliente_nome,
                  valor: fatura.valor, status: 'pendente',
                }, { onConflict: 'gateway_charge_id' });
              }
            }
          } catch (err: any) {
            console.error('MercadoPago PIX generate error:', err.message);
          }
        } else if (gatewayAtivo === 'ciabra') {
          try {
            const { data: ciabraConfig } = await supabaseAdmin
              .from('ciabra_config')
              .select('api_key_hash, public_key_hash')
              .eq('user_id', fatura.user_id)
              .eq('is_configured', true)
              .maybeSingle();

            if (ciabraConfig?.api_key_hash) {
              const privateKey = atob(ciabraConfig.api_key_hash);
              const publicKey = ciabraConfig.public_key_hash ? atob(ciabraConfig.public_key_hash) : '';
              const basicToken = btoa(`${publicKey}:${privateKey}`);
              const externalId = `fatura-${fatura.id.substring(0, 8)}`;
              const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
              const ciabraHeaders = { 'Authorization': `Basic ${basicToken}`, 'Content-Type': 'application/json' };

              // Step 1: Create or find customer in Ciabra
              let customerId = '';
              try {
                const phone = fatura.cliente_whatsapp ? `+55${fatura.cliente_whatsapp.replace(/\D/g, '')}` : '';
                const customerResp = await fetch('https://api.az.center/invoices/applications/customers', {
                  method: 'POST',
                  headers: ciabraHeaders,
                  body: JSON.stringify({
                    fullName: fatura.cliente_nome || 'Cliente',
                    phone: phone,
                    document: generateValidCpf().replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'),
                  }),
                });
                const custText = await customerResp.text();
                console.log(`Ciabra customer response: ${customerResp.status}, body: ${custText.substring(0, 300)}`);
                let custData: any = {};
                try { custData = JSON.parse(custText); } catch { /* */ }
                customerId = custData.id || '';
              } catch (custErr: any) {
                console.error('Ciabra customer creation error:', custErr.message);
              }

              const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/ciabra-integration`;
              const ciabraPayload: any = {
                description: `Cobrança - ${fatura.cliente_nome || 'Cliente'}`,
                dueDate: dueDate,
                installmentCount: 1,
                invoiceType: "SINGLE",
                items: [],
                price: parseFloat(fatura.valor.toString()),
                externalId: externalId,
                paymentTypes: ["PIX"],
                webhooks: [
                  { hookType: "INVOICE_CREATED", url: webhookUrl },
                  { hookType: "PAYMENT_GENERATED", url: webhookUrl },
                  { hookType: "PAYMENT_CONFIRMED", url: webhookUrl }
                ],
                notifications: []
              };
              
              if (customerId) {
                ciabraPayload.customerId = customerId;
              }
              
              console.log(`📋 Ciabra invoice payload:`, JSON.stringify(ciabraPayload));

              const ciabraResp = await fetch('https://api.az.center/invoices/applications/invoices', {
                method: 'POST',
                headers: ciabraHeaders,
                body: JSON.stringify(ciabraPayload),
              });
              const ciabraText = await ciabraResp.text();
              console.log(`Ciabra response status: ${ciabraResp.status}, body: ${ciabraText.substring(0, 800)}`);
              let ciabraData: any = {};
              try { ciabraData = JSON.parse(ciabraText); } catch { console.error('Ciabra returned non-JSON response'); }

              let invoiceId = ciabraData.id || '';

              // If invoice was created but response had error, try to get details via GET
              if (!ciabraResp.ok && !invoiceId) {
                console.log('⚠️ Ciabra POST failed, but charge may have been created. Skipping PIX extraction.');
              }

              if (invoiceId) {
                gateway_charge_id = invoiceId;
                
                // Try to extract PIX from create response first
                pix_qr_code = ciabraData.payment?.pix?.qrCode || null;
                pix_copia_cola = ciabraData.payment?.pix?.brCode || null;
                
                // If no PIX data in create response, fetch invoice details
                if (!pix_qr_code && !pix_copia_cola) {
                  console.log(`🔍 Fetching Ciabra invoice details for ${invoiceId}...`);
                  try {
                    const detailResp = await fetch(`https://api.az.center/invoices/applications/invoices/${invoiceId}`, {
                      method: 'GET',
                      headers: ciabraHeaders,
                    });
                    const detailText = await detailResp.text();
                    console.log(`Ciabra detail response: ${detailResp.status}, body: ${detailText.substring(0, 800)}`);
                    let detailData: any = {};
                    try { detailData = JSON.parse(detailText); } catch { /* */ }
                    
                    // Extract payment URL as fallback
                    const paymentUrl = detailData.url || ciabraData.url || '';
                    
                    const installmentId = detailData.installments?.[0]?.id;
                    if (installmentId) {
                      // Try up to 3 times with delay to wait for PIX generation
                      for (let attempt = 0; attempt < 3; attempt++) {
                        if (attempt > 0) {
                          console.log(`⏳ Waiting 3s for PIX generation (attempt ${attempt + 1})...`);
                          await new Promise(r => setTimeout(r, 3000));
                        }
                        console.log(`🔍 Fetching payment details for installment ${installmentId} (attempt ${attempt + 1})...`);
                        const payResp = await fetch(`https://api.az.center/payments/applications/installments/${installmentId}`, {
                          method: 'GET',
                          headers: ciabraHeaders,
                        });
                        const payText = await payResp.text();
                        console.log(`Ciabra payment response: ${payResp.status}, body: ${payText.substring(0, 800)}`);
                        let payData: any = {};
                        try { payData = JSON.parse(payText); } catch { /* */ }
                        
                        const payment = Array.isArray(payData) ? payData[0] : payData;
                        const pixObj = payment?.pix || payment;
                        const emv = pixObj?.emv || pixObj?.brCode || pixObj?.pixCode || null;
                        const qr = pixObj?.qrCode || null;
                        
                        if (emv) {
                          pix_copia_cola = emv;
                          pix_qr_code = qr;
                          console.log(`✅ PIX EMV obtained on attempt ${attempt + 1}`);
                          break;
                        }
                        
                        if (pixObj?.status === 'GENERATING') {
                          console.log(`⏳ PIX still generating...`);
                          continue;
                        }
                      }
                    }
                    
                    // If still no PIX data, use payment URL as pix_copia_cola fallback
                    if (!pix_copia_cola && paymentUrl) {
                      pix_copia_cola = paymentUrl;
                      console.log(`📎 Using payment URL as fallback: ${paymentUrl}`);
                    }
                    
                    if (!pix_qr_code) {
                      pix_qr_code = detailData.payment?.pix?.qrCode || detailData.pix?.qrCode || null;
                    }
                  } catch (detailErr: any) {
                    console.error('Ciabra detail fetch error:', detailErr.message);
                  }
                }

                await supabaseAdmin.from('cobrancas').upsert({
                  user_id: fatura.user_id, gateway: 'ciabra', gateway_charge_id: invoiceId,
                  cliente_whatsapp: fatura.cliente_whatsapp, cliente_nome: fatura.cliente_nome,
                  valor: fatura.valor, status: 'pendente',
                }, { onConflict: 'gateway_charge_id' });
              }
            }
          } catch (err: any) {
            console.error('Ciabra PIX generate error:', err.message);
          }
        } else if (gatewayAtivo === 'v3pay') {
          try {
            const { data: v3Config } = await supabaseAdmin
              .from('v3pay_config')
              .select('api_token_hash')
              .eq('user_id', fatura.user_id)
              .eq('is_configured', true)
              .maybeSingle();

            if (v3Config?.api_token_hash) {
              const chargeResp = await fetch('https://api.v3pay.com.br/v1/charges', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${v3Config.api_token_hash}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  amount: parseFloat(fatura.valor.toString()),
                  description: `Renovação - ${fatura.plano_nome || 'Plano'}`,
                  customer_name: fatura.cliente_nome,
                  customer_phone: fatura.cliente_whatsapp,
                  origin: 'Gestor IPTV',
                }),
              });
              const chargeData = await chargeResp.json();
              console.log('📋 V3Pay generate-pix result:', JSON.stringify(chargeData).substring(0, 500));

              if (chargeResp.ok && chargeData.id) {
                gateway_charge_id = String(chargeData.id);
                pix_qr_code = chargeData.pix?.qr_code || chargeData.pix_qr_code || null;
                pix_copia_cola = chargeData.pix?.pix_code || chargeData.pix_copia_cola || null;

                await supabaseAdmin.from('cobrancas').upsert({
                  user_id: fatura.user_id, gateway: 'v3pay', gateway_charge_id: String(chargeData.id),
                  cliente_whatsapp: fatura.cliente_whatsapp, cliente_nome: fatura.cliente_nome,
                  valor: fatura.valor, status: 'pendente',
                }, { onConflict: 'gateway_charge_id' });
              }
            }
          } catch (err: any) {
            console.error('V3Pay PIX generate error:', err.message);
          }
        }
      }

      // Fallback to PIX manual only if automatic PIX is DISABLED
      if (!pix_qr_code && !pix_copia_cola && !checkoutConfig?.pix_enabled && checkoutConfig?.pix_manual_enabled && checkoutConfig?.pix_manual_key) {
        gateway = 'pix_manual';
        pix_manual_key = checkoutConfig.pix_manual_key;
      }

      // Update fatura with PIX data
      const updateData: Record<string, unknown> = {};
      if (pix_qr_code) updateData.pix_qr_code = pix_qr_code;
      if (pix_copia_cola) updateData.pix_copia_cola = pix_copia_cola;
      if (pix_manual_key) updateData.pix_manual_key = pix_manual_key;
      if (gateway) updateData.gateway = gateway;
      if (gateway_charge_id) updateData.gateway_charge_id = gateway_charge_id;

      if (Object.keys(updateData).length > 0) {
        await supabaseAdmin.from('faturas').update(updateData).eq('id', fatura.id);
      }

      const updatedFatura = { ...fatura, ...updateData };
      console.log(`✅ PIX generated on-demand for fatura ${fatura.id}, gateway: ${gateway}`);

      return new Response(JSON.stringify({ success: true, fatura: updatedFatura }),
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
                body: JSON.stringify({ name: cliente_nome, phone: cliente_whatsapp, cpfCnpj: generateValidCpf() })
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
                    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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
            const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
            const v3Resp = await fetch(`${supabaseUrl}/functions/v1/v3pay-integration`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
              },
              body: JSON.stringify({
                action: 'create-charge',
                amount: String(parsedValor),
                description: `Renovação - ${plano_nome || 'Plano'}`,
                customer_name: cliente_nome,
                customer_phone: cliente_whatsapp,
              }),
            });
            const v3Data = await v3Resp.json();
            console.log('📋 V3Pay PIX result:', JSON.stringify(v3Data));

            if (v3Data.success && v3Data.charge) {
              gateway_charge_id = String(v3Data.charge.id);
              pix_qr_code = v3Data.charge.pix?.qr_code || v3Data.charge.pix_qr_code || null;
              pix_copia_cola = v3Data.charge.pix?.pix_code || v3Data.charge.pix_copia_cola || null;
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
      
      if (!gateway && !checkoutConfig?.pix_enabled && checkoutConfig?.pix_manual_enabled && checkoutConfig?.pix_manual_key) {
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

      // 4. Send WhatsApp with invoice link using template from mensagens_padroes
      const faturaUrl = `https://gestormsx.lovable.app/fatura/${fatura.id}`;
      
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

            // Fetch fatura_criada template from mensagens_padroes
            const { data: mensagensPadroes } = await supabaseAdmin
              .from('mensagens_padroes')
              .select('fatura_criada')
              .eq('user_id', user.id)
              .maybeSingle();

            let message: string;

            if (mensagensPadroes?.fatura_criada) {
              // Replace template variables
              const template = mensagensPadroes.fatura_criada;
              const hour = new Date().getHours();
              const saudacao = hour >= 5 && hour < 12 ? 'Bom dia' : hour >= 12 && hour < 18 ? 'Boa tarde' : 'Boa noite';
              const partes = (cliente_nome || '').trim().split(' ');
              const primeiroNome = partes[0] || '';
              const sobrenome = partes.length > 1 ? partes.slice(1).join(' ') : '';

              const replacements: Record<string, string> = {
                '{saudacao}': saudacao,
                '{nome_cliente}': cliente_nome || '',
                '{nome}': primeiroNome,
                '{cliente}': cliente_nome || '',
                '{sobrenome}': sobrenome,
                '{whatsapp}': cliente_whatsapp || '',
                '{nome_plano}': plano_nome || '',
                '{plano}': plano_nome || '',
                '{valor_plano}': `R$ ${parsedValor.toFixed(2)}`,
                '{valor}': `R$ ${parsedValor.toFixed(2)}`,
                '{link_fatura}': faturaUrl,
                '{subtotal}': `R$ ${parsedValor.toFixed(2)}`,
              };

              message = template;
              for (const [key, value] of Object.entries(replacements)) {
                message = message.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
              }
              message = message.replace(/{br}/g, '\n');
            } else {
              // Fallback hardcoded message
              message = `Olá ${cliente_nome}! 🧾\n\nSua fatura de renovação está disponível:\n\n📋 *Plano:* ${plano_nome || 'N/A'}\n💰 *Valor:* R$ ${parsedValor.toFixed(2)}\n\n🔗 Acesse o link para pagar:\n${faturaUrl}\n\nObrigado! 🙏`;
            }
            
            await fetch(`${evolutionUrl}/message/sendText/${sessionId}`, {
              method: 'POST',
              headers: { 'apikey': evolutionKey, 'Content-Type': 'application/json' },
              body: JSON.stringify({ number: phone, text: message })
            });
            console.log('✅ WhatsApp fatura_criada message sent to:', phone);
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
