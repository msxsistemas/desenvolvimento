import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      console.error("❌ Variáveis de ambiente não configuradas");
      return new Response(
        JSON.stringify({ error: "Evolution API não configurada" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const { action, instanceName, phone, message } = await req.json();
    
    console.log(`🔄 Ação: ${action} | Instância: ${instanceName}`);

    const baseUrl = EVOLUTION_API_URL.replace(/\/$/, "");
    const headers = {
      "Content-Type": "application/json",
      "apikey": EVOLUTION_API_KEY,
    };

    let endpoint = "";
    let method = "GET";
    let body: any = undefined;

    switch (action) {
      case "checkStatus":
        endpoint = `/instance/connectionState/${instanceName}`;
        break;

      case "connect":
        endpoint = `/instance/connect/${instanceName}`;
        break;

      case "create":
        endpoint = "/instance/create";
        method = "POST";
        body = {
          instanceName,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
        };
        break;

      case "fetchInstances":
        endpoint = `/instance/fetchInstances?instanceName=${instanceName}`;
        break;

      case "sendMessage":
        endpoint = `/message/sendText/${instanceName}`;
        method = "POST";
        body = {
          number: phone.replace(/\D/g, ""),
          text: message,
          delay: 1200,
        };
        break;

      case "disconnect":
        endpoint = `/instance/logout/${instanceName}`;
        method = "DELETE";
        break;

      case "restart":
        endpoint = `/instance/restart/${instanceName}`;
        method = "POST";
        break;

      case "delete":
        endpoint = `/instance/delete/${instanceName}`;
        method = "DELETE";
        break;

      default:
        return new Response(
          JSON.stringify({ error: "Ação inválida" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
    }

    const url = `${baseUrl}${endpoint}`;
    console.log(`📡 ${method} ${url}`);

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    console.log(`✅ Resposta: ${response.status}`, JSON.stringify(data).slice(0, 200));

    return new Response(
      JSON.stringify(data),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: response.status,
      }
    );

  } catch (error) {
    console.error("❌ Erro:", (error as Error).message);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
