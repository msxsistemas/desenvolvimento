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

  if (req.method === "POST") {
    try {
      const body = await req.json();
      const action = body.action;

      // ── User panel actions (require auth) ──────────────────────────
      if (action === "check" || action === "configure") {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await userClient.auth.getUser();
        if (!user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (action === "check") {
          const { data } = await adminClient
            .from("woovi_config")
            .select("is_configured")
            .eq("user_id", user.id)
            .maybeSingle();
          return new Response(JSON.stringify({ configured: !!(data as any)?.is_configured }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (action === "configure") {
          const appId = body.app_id;
          if (!appId) {
            return new Response(JSON.stringify({ error: "app_id é obrigatório" }), {
              status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          // Store App ID securely in vault
          const { error: vaultError } = await userClient.rpc("store_gateway_secret", {
            p_user_id: user.id,
            p_gateway: "woovi",
            p_secret_name: "app_id",
            p_secret_value: appId,
          });
          if (vaultError) {
            console.error("vault store error:", vaultError.message);
            return new Response(JSON.stringify({ error: vaultError.message }), {
              status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          // Save config record to woovi_config table (same pattern as other gateways)
          const appIdHash = btoa(appId.substring(0, 8) + appId.substring(appId.length - 8));
          const { error: upsertError } = await adminClient
            .from("woovi_config")
            .upsert({
              user_id: user.id,
              app_id_hash: appIdHash,
              is_configured: true,
              webhook_url: `${supabaseUrl}/functions/v1/woovi-integration`,
            }, { onConflict: "user_id" });

          if (upsertError) {
            console.error("woovi_config upsert error:", upsertError.message);
            return new Response(JSON.stringify({ error: upsertError.message }), {
              status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          return new Response(JSON.stringify({ ok: true, configured: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // ── Webhook handler (from Woovi servers) ──────────────────────
      console.log("Woovi webhook received:", JSON.stringify(body).substring(0, 500));

      const eventType = body.event || body.type || "";
      const charge = body.charge || body.data?.charge || body;
      const correlationID = charge?.correlationID || body.correlationID || null;
      const status = (charge?.status || "").toUpperCase();

      if (correlationID && (["COMPLETED", "PAID", "CONFIRMED"].includes(status) || eventType.includes("COMPLETED") || eventType.includes("PAID"))) {
        console.log(`Woovi payment confirmed for correlationID: ${correlationID}`);

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
      console.error("Woovi error:", err.message);
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
