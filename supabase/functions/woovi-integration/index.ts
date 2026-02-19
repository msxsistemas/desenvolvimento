import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  // Handle Woovi webhooks (charge completed)
  if (req.method === "POST") {
    try {
      const body = await req.json();
      console.log("Woovi webhook received:", JSON.stringify(body).substring(0, 500));

      // Woovi sends event type in body.event or body.type
      const eventType = body.event || body.type || "";
      const charge = body.charge || body.data?.charge || body;
      const correlationID = charge?.correlationID || body.correlationID || null;
      const status = (charge?.status || "").toUpperCase();

      if (correlationID && (["COMPLETED", "PAID", "CONFIRMED"].includes(status) || eventType.includes("COMPLETED") || eventType.includes("PAID"))) {
        console.log(`Woovi payment confirmed for correlationID: ${correlationID}`);

        // Update cobrancas
        const { data: cobranca } = await adminClient
          .from("cobrancas")
          .select("*")
          .eq("gateway_charge_id", correlationID)
          .maybeSingle();

        if (cobranca) {
          await adminClient
            .from("cobrancas")
            .update({ status: "pago", renovado: true, updated_at: new Date().toISOString() })
            .eq("id", cobranca.id);
          console.log(`✅ Cobranca ${cobranca.id} marked as paid`);

          // Trigger auto-renewal
          fetch(`${supabaseUrl}/functions/v1/auto-renew-client`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              user_id: cobranca.user_id,
              cliente_whatsapp: cobranca.cliente_whatsapp,
              gateway: "woovi",
              gateway_charge_id: correlationID,
            }),
          }).catch((e: any) => console.error("Auto-renewal trigger error:", e.message));
        }

        // Also update faturas
        const { data: fatura } = await adminClient
          .from("faturas")
          .select("id")
          .eq("gateway_charge_id", correlationID)
          .maybeSingle();

        if (fatura) {
          await adminClient
            .from("faturas")
            .update({ status: "pago", paid_at: new Date().toISOString() })
            .eq("id", fatura.id);
          console.log(`✅ Fatura ${fatura.id} marked as paid via Woovi webhook`);
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err: any) {
      console.error("Woovi webhook error:", err.message);
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
