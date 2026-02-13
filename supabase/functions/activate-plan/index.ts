import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { action, plan_id, charge_id } = await req.json();

    if (action === "activate") {
      // Get plan details
      const { data: plan, error: planError } = await adminClient
        .from("system_plans")
        .select("*")
        .eq("id", plan_id)
        .eq("ativo", true)
        .maybeSingle();

      if (planError || !plan) {
        return new Response(
          JSON.stringify({ error: "Plano não encontrado ou inativo" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Free plan - activate directly
      if (plan.valor === 0) {
        await activateSubscription(adminClient, user.id, plan);
        return new Response(
          JSON.stringify({ activated: true, message: "Plano gratuito ativado" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get active system gateway
      const { data: gateway } = await adminClient
        .from("system_gateways")
        .select("*")
        .eq("ativo", true)
        .limit(1)
        .maybeSingle();

      if (!gateway) {
        // No gateway configured - activate directly (admin manages manually)
        await activateSubscription(adminClient, user.id, plan);
        return new Response(
          JSON.stringify({
            activated: true,
            message: "Plano ativado (sem gateway configurado, pagamento será gerenciado manualmente)",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate payment via gateway
      const paymentResult = await generatePayment(adminClient, gateway, plan, user);

      if (paymentResult.error) {
        return new Response(JSON.stringify({ error: paymentResult.error }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Store pending subscription activation
      await adminClient.from("user_subscriptions").upsert(
        {
          user_id: user.id,
          plan_id: plan.id,
          status: "pendente",
          inicio: new Date().toISOString(),
          expira_em: calculateExpiration(plan.intervalo),
          gateway_subscription_id: paymentResult.charge_id,
        },
        { onConflict: "user_id", ignoreDuplicates: false }
      );

      return new Response(
        JSON.stringify({
          payment: {
            pix_qr_code: paymentResult.pix_qr_code,
            pix_copia_cola: paymentResult.pix_copia_cola,
            gateway_charge_id: paymentResult.charge_id,
            gateway: gateway.provedor,
            status: "pending",
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "check-payment") {
      if (!charge_id) {
        return new Response(JSON.stringify({ error: "charge_id obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check subscription status
      const { data: sub } = await adminClient
        .from("user_subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("gateway_subscription_id", charge_id)
        .maybeSingle();

      if (sub?.status === "ativa") {
        return new Response(JSON.stringify({ paid: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check payment status on gateway
      const { data: gateway } = await adminClient
        .from("system_gateways")
        .select("*")
        .eq("ativo", true)
        .limit(1)
        .maybeSingle();

      if (gateway) {
        const paid = await checkPaymentStatus(gateway, charge_id);
        if (paid && sub) {
          // Activate subscription
          const { data: plan } = await adminClient
            .from("system_plans")
            .select("*")
            .eq("id", sub.plan_id)
            .maybeSingle();

          if (plan) {
            await activateSubscription(adminClient, user.id, plan);
          }
          return new Response(JSON.stringify({ paid: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      return new Response(JSON.stringify({ paid: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message || "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function activateSubscription(client: any, userId: string, plan: any) {
  const expiration = calculateExpiration(plan.intervalo);

  // Check if user has existing subscription
  const { data: existing } = await client
    .from("user_subscriptions")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    await client
      .from("user_subscriptions")
      .update({
        plan_id: plan.id,
        status: "ativa",
        inicio: new Date().toISOString(),
        expira_em: expiration,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await client.from("user_subscriptions").insert({
      user_id: userId,
      plan_id: plan.id,
      status: "ativa",
      inicio: new Date().toISOString(),
      expira_em: expiration,
    });
  }
}

function calculateExpiration(intervalo: string): string {
  const now = new Date();
  switch (intervalo) {
    case "mensal":
      now.setMonth(now.getMonth() + 1);
      break;
    case "trimestral":
      now.setMonth(now.getMonth() + 3);
      break;
    case "semestral":
      now.setMonth(now.getMonth() + 6);
      break;
    case "anual":
      now.setFullYear(now.getFullYear() + 1);
      break;
    default:
      now.setMonth(now.getMonth() + 1);
  }
  return now.toISOString();
}

async function generatePayment(
  client: any,
  gateway: any,
  plan: any,
  user: any
): Promise<any> {
  try {
    const provedor = gateway.provedor?.toLowerCase();

    if (provedor === "asaas") {
      return await generateAsaasPayment(gateway, plan, user);
    }

    if (provedor === "mercadopago") {
      return await generateMercadoPagoPayment(gateway, plan, user);
    }

    if (provedor === "ciabra") {
      return await generateCiabraPayment(gateway, plan, user);
    }

    if (provedor === "v3pay") {
      return await generateV3PayPayment(gateway, plan, user);
    }

    // Fallback: no specific gateway handler
    return { error: `Gateway "${gateway.provedor}" não suportado para pagamentos de plano` };
  } catch (err: any) {
    console.error("Payment generation error:", err);
    return { error: err.message || "Erro ao gerar pagamento" };
  }
}

async function generateAsaasPayment(gateway: any, plan: any, user: any) {
  const apiKey = gateway.api_key_hash;
  if (!apiKey) return { error: "Gateway Asaas sem API key configurada" };

  const baseUrl = gateway.ambiente === "producao"
    ? "https://api.asaas.com/v3"
    : "https://sandbox.asaas.com/api/v3";

  // Find or create customer
  const customerResp = await fetch(`${baseUrl}/customers?email=${encodeURIComponent(user.email)}`, {
    headers: { access_token: apiKey },
  });
  const customerData = await customerResp.json();

  let customerId: string;
  if (customerData.data?.length > 0) {
    customerId = customerData.data[0].id;
  } else {
    const createResp = await fetch(`${baseUrl}/customers`, {
      method: "POST",
      headers: { "Content-Type": "application/json", access_token: apiKey },
      body: JSON.stringify({
        name: user.user_metadata?.full_name || user.email,
        email: user.email,
        phone: user.user_metadata?.whatsapp || null,
      }),
    });
    const created = await createResp.json();
    if (!created.id) return { error: "Erro ao criar cliente no Asaas" };
    customerId = created.id;
  }

  // Create PIX charge
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 1);

  const chargeResp = await fetch(`${baseUrl}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", access_token: apiKey },
    body: JSON.stringify({
      customer: customerId,
      billingType: "PIX",
      value: plan.valor,
      dueDate: dueDate.toISOString().split("T")[0],
      description: `Plano ${plan.nome} - Msx Gestor`,
    }),
  });

  const charge = await chargeResp.json();
  if (!charge.id) return { error: charge.errors?.[0]?.description || "Erro ao criar cobrança" };

  // Get PIX QR Code
  const pixResp = await fetch(`${baseUrl}/payments/${charge.id}/pixQrCode`, {
    headers: { access_token: apiKey },
  });
  const pixData = await pixResp.json();

  return {
    charge_id: charge.id,
    pix_qr_code: pixData.encodedImage,
    pix_copia_cola: pixData.payload,
  };
}

async function generateMercadoPagoPayment(gateway: any, plan: any, user: any) {
  const accessToken = gateway.api_key_hash;
  if (!accessToken) return { error: "Gateway MercadoPago sem access token" };

  const resp = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      transaction_amount: plan.valor,
      description: `Plano ${plan.nome} - Msx Gestor`,
      payment_method_id: "pix",
      payer: { email: user.email },
    }),
  });

  const data = await resp.json();
  if (!data.id) return { error: data.message || "Erro ao criar pagamento" };

  return {
    charge_id: String(data.id),
    pix_qr_code: data.point_of_interaction?.transaction_data?.qr_code_base64,
    pix_copia_cola: data.point_of_interaction?.transaction_data?.qr_code,
  };
}

async function generateCiabraPayment(gateway: any, plan: any, user: any) {
  const secretKey = gateway.api_key_hash;
  const publicKey = gateway.public_key_hash || "";
  if (!secretKey) return { error: "Gateway Ciabra sem chave secreta configurada" };

  const CIABRA_BASE_URL = "https://api.az.center";
  const basicToken = btoa(`${publicKey}:${secretKey}`);
  const headers = {
    Authorization: `Basic ${basicToken}`,
    "Content-Type": "application/json",
  };

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";

  try {
    // 1. Registrar cliente na Ciabra (obrigatório antes de criar fatura)
    // Garantir nome válido com mínimo 3 caracteres
    const customerName = (user.user_metadata?.full_name || user.email?.split("@")[0] || "Cliente").trim();
    const safeName = customerName.length >= 3 ? customerName : customerName.padEnd(3, "_");

    const customerResp = await fetch(`${CIABRA_BASE_URL}/invoices/applications/customers`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        fullName: safeName,
        email: user.email || "",
        phone: user.user_metadata?.whatsapp || user.phone || "",
        document: user.user_metadata?.cpf || "00000000000",
      }),
    });

    let customerId: string | null = null;
    const customerText = await customerResp.text();
    try {
      const customerData = JSON.parse(customerText);
      customerId = customerData.id ? String(customerData.id) : null;
      if (!customerId && customerData.customer?.id) {
        customerId = String(customerData.customer.id);
      }
      // Tentar também data.id caso venha em wrapper
      if (!customerId && customerData.data?.id) {
        customerId = String(customerData.data.id);
      }
    } catch { /* */ }

    console.log("Ciabra customer response:", customerResp.status, customerText);

    if (!customerId) {
      return { error: `Erro ao registrar cliente na Ciabra: ${customerText}` };
    }

    // 2. Criar fatura com customer_id
    const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const invoiceBody: any = {
      description: `Plano ${plan.nome} - Msx Gestor`,
      dueDate,
      installmentCount: 1,
      invoiceType: "SINGLE",
      items: [],
      price: plan.valor,
      paymentTypes: ["PIX"],
      webhooks: [
        { hookType: "PAYMENT_CONFIRMED", url: `${supabaseUrl}/functions/v1/ciabra-integration` },
      ],
      notifications: [],
    };

    invoiceBody.customerId = customerId;
    console.log("Ciabra invoice body:", JSON.stringify(invoiceBody));

    const chargeResp = await fetch(`${CIABRA_BASE_URL}/invoices/applications/invoices`, {
      method: "POST",
      headers,
      body: JSON.stringify(invoiceBody),
    });

    const chargeText = await chargeResp.text();
    let chargeData: any = {};
    try { chargeData = JSON.parse(chargeText); } catch { /* */ }

    console.log("Ciabra invoice response:", chargeResp.status, chargeText);

    if (!chargeResp.ok) {
      return { error: chargeData.message || chargeData.error || `Erro Ciabra (${chargeResp.status}): ${chargeText}` };
    }

    return {
      charge_id: String(chargeData.id || ""),
      pix_qr_code: chargeData.payment?.pix?.qrCode || null,
      pix_copia_cola: chargeData.payment?.pix?.brCode || null,
    };
  } catch (err: any) {
    console.error("Ciabra payment error:", err);
    return { error: err.message || "Erro ao criar pagamento Ciabra" };
  }
}

async function generateV3PayPayment(gateway: any, plan: any, user: any) {
  const apiToken = gateway.api_key_hash;
  if (!apiToken) return { error: "Gateway V3Pay sem token configurado" };

  try {
    const resp = await fetch("https://api.v3pay.com.br/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        amount: Math.round(plan.valor * 100),
        description: `Plano ${plan.nome} - Msx Gestor`,
        payment_method: "pix",
        payer: { email: user.email },
      }),
    });

    const data = await resp.json();
    if (!data.id) return { error: data.message || "Erro ao criar pagamento V3Pay" };

    return {
      charge_id: String(data.id),
      pix_qr_code: data.pix?.qr_code_base64 || data.qr_code_base64 || null,
      pix_copia_cola: data.pix?.qr_code || data.pix_copia_cola || null,
    };
  } catch (err: any) {
    return { error: err.message || "Erro ao criar pagamento V3Pay" };
  }
}

async function checkPaymentStatus(gateway: any, chargeId: string): Promise<boolean> {
  try {
    const provedor = gateway.provedor?.toLowerCase();

    if (provedor === "asaas") {
      const baseUrl = gateway.ambiente === "producao"
        ? "https://api.asaas.com/v3"
        : "https://sandbox.asaas.com/api/v3";

      const resp = await fetch(`${baseUrl}/payments/${chargeId}`, {
        headers: { access_token: gateway.api_key_hash },
      });
      const data = await resp.json();
      return ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(data.status);
    }

    if (provedor === "mercadopago") {
      const resp = await fetch(`https://api.mercadopago.com/v1/payments/${chargeId}`, {
        headers: { Authorization: `Bearer ${gateway.api_key_hash}` },
      });
      const data = await resp.json();
      return data.status === "approved";
    }

    if (provedor === "ciabra") {
      const secretKey = gateway.api_key_hash;
      const publicKey = gateway.public_key_hash || "";
      const basicToken = btoa(`${publicKey}:${secretKey}`);

      const resp = await fetch(`https://api.az.center/invoices/applications/invoices/${chargeId}`, {
        headers: { Authorization: `Basic ${basicToken}` },
      });
      const data = await resp.json();
      const status = (data.status || "").toUpperCase();
      if (["PAID", "CONFIRMED", "RECEIVED"].includes(status)) return true;
      // Check installments
      const installments = data.installments || [];
      for (const inst of installments) {
        if ((inst.status || "").toUpperCase() === "PAID") return true;
      }
      return false;
    }

    if (provedor === "v3pay") {
      const resp = await fetch(`https://api.v3pay.com.br/v1/payments/${chargeId}`, {
        headers: { Authorization: `Bearer ${gateway.api_key_hash}` },
      });
      const data = await resp.json();
      return data.status === "approved" || data.status === "paid";
    }

    return false;
  } catch {
    return false;
  }
}
