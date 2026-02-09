import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then((v) => { clearTimeout(t); resolve(v); })
     .catch((e) => { clearTimeout(t); reject(e); });
  });
}

async function testOnWaveLogin(
  url: string,
  username: string,
  password: string,
  extraHeaders: Record<string, string> = {},
  method: string = "POST",
  overridePayload?: any,
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    ...extraHeaders,
  };

  const defaultPayload = {
    captcha: "not-a-robot",
    captchaChecked: true,
    username: username,
    password: password,
    twofactor_code: "",
    twofactor_recovery_code: "",
    twofactor_trusted_device_id: ""
  };
  const payload = (overridePayload && typeof overridePayload === 'object') ? overridePayload : defaultPayload;

  console.log(`🔄 Fazendo ${method} para: ${url}`);
  console.log(`📝 Payload: ${JSON.stringify(payload, null, 2)}`);

  const res = await withTimeout(fetch(url, {
    method,
    headers,
    body: method.toUpperCase() === 'GET' ? undefined : JSON.stringify(payload),
  }), 15000);
  
  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch (_) {}
  
  return { status: res.status, ok: res.ok, contentType, text, json };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { baseUrl, username, password, extraHeaders, cf_clearance, cookie, endpointPath, endpointMethod, loginPayload } = await req.json();
    
    if (!baseUrl || !username || !password) {
      return new Response(JSON.stringify({ 
        success: false, 
        details: "Parâmetros ausentes: baseUrl, username e password são obrigatórios" 
      }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: 400 
      });
    }

    const cleanBase = String(baseUrl).replace(/\/$/, "");
    
    console.log(`🚀 Iniciando teste OnWave para: ${cleanBase}`);
    console.log(`👤 Username: ${username}`);

    // Configurar headers extras se fornecidos
    const hdrs: Record<string, string> = {};
    if (cf_clearance && !cookie) hdrs["Cookie"] = `cf_clearance=${cf_clearance}`;
    if (cookie) hdrs["Cookie"] = String(cookie);
    if (extraHeaders && typeof extraHeaders === 'object') {
      for (const [k, v] of Object.entries(extraHeaders as Record<string, string>)) {
        hdrs[k] = String(v);
      }
    }

    // First try to fetch the login page to discover API endpoints
    try {
      console.log('🔍 Descobrindo estrutura da API...');
      const loginPageResp = await withTimeout(fetch(`${cleanBase}/login`, {
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html' },
      }), 10000);
      const loginHtml = await loginPageResp.text();
      // Log key parts of the HTML that reveal API structure
      const actionMatch = loginHtml.match(/action=['"](.*?)['"]/g);
      const apiMatch = loginHtml.match(/['"](\/api\/[^'"]*)['"]/g);
      const axiosMatch = loginHtml.match(/axios\.(post|get)\(['"](.*?)['"]/g);
      const fetchMatch = loginHtml.match(/fetch\(['"](.*?)['"]/g);
      console.log(`📄 Form actions: ${JSON.stringify(actionMatch?.slice(0, 5))}`);
      console.log(`📄 API refs: ${JSON.stringify(apiMatch?.slice(0, 10))}`);
      console.log(`📄 Axios calls: ${JSON.stringify(axiosMatch?.slice(0, 5))}`);
      console.log(`📄 Fetch calls: ${JSON.stringify(fetchMatch?.slice(0, 5))}`);
      
      // Extract CSRF token if present
      const csrfMatch = loginHtml.match(/name=["']_token["']\s+value=["'](.*?)["']/);
      const csrf = csrfMatch ? csrfMatch[1] : null;
      console.log(`🔑 CSRF token: ${csrf ? csrf.slice(0, 20) + '...' : 'não encontrado'}`);
      
      // Log HTML snippet around form for debugging
      const formStart = loginHtml.indexOf('<form');
      if (formStart > -1) {
        console.log(`📄 Form HTML: ${loginHtml.slice(formStart, formStart + 500)}`);
      }
    } catch (e) {
      console.log(`⚠️ Erro ao buscar página de login: ${(e as Error).message}`);
    }

    const candidates = Array.from(new Set([
      endpointPath || '/api/auth/login',
      '/api/login',
      '/api/v1/login',
      '/api/v1/auth/login',
      '/api/v2/login',
      '/auth/login',
      '/login',
      '/admin/login',
      '/api/signin',
      '/api/auth/signin',
      '/admin/api/auth/login',
      '/api/authenticate',
      '/api/v1/authenticate',
    ]));

    let lastResp: any = null;
    let lastUrl = '';
    const logs: any[] = [];

    for (const path of candidates) {
      const url = `${cleanBase}${path.startsWith('/') ? '' : '/'}${path}`;
      console.log(`🧪 Testando endpoint: ${path}`);
      try {
        const resp = await testOnWaveLogin(url, username, password, hdrs, endpointMethod || 'POST', loginPayload);
        console.log(`📊 ${path} → status: ${resp.status}, ok: ${resp.ok}, snippet: ${String(resp.text).slice(0, 150)}`);
        
        logs.push({ url, status: resp.status, ok: resp.ok, snippet: String(resp.text).slice(0, 200) });
        lastResp = resp;
        lastUrl = url;

        // Check for token in various formats
        const token = resp.json?.token || resp.json?.jwt || resp.json?.access_token || resp.json?.data?.token || resp.json?.data?.access_token || null;
        // Also check kOffice-style result field
        const resultField = resp.json?.result;
        const isSuccess = resp.ok && (
          token || 
          resp.json?.success === true || 
          resp.json?.status === 'ok' || 
          resp.json?.user ||
          resultField === 'success' ||
          resultField === 'ok'
        );
        
        if (isSuccess) {
          console.log(`✅ Login bem-sucedido em: ${url}`);
          return new Response(JSON.stringify({
            success: true,
            endpoint: url,
            type: 'Panel',
            account: {
              status: 'Active',
              user: resp.json?.user || resp.json?.data?.user || null,
              token_received: !!token,
            },
            data: {
              token: token || null,
              user: resp.json?.user || resp.json?.data?.user || null,
              response: resp.json,
            },
            logs,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }
      } catch (e) {
        console.log(`⚠️ Erro ao tentar ${path}: ${(e as Error).message}`);
        logs.push({ url, error: (e as Error).message });
      }
    }

    // Check if any endpoint responded with a valid JSON that indicates auth failure (kOffice style)
    const hasAuthEndpoint = logs.some(l => l.ok && l.snippet && (l.snippet.includes('"result"') || l.snippet.includes('"success"')));
    
    let errorMessage = 'Falha na autenticação';
    if (hasAuthEndpoint) {
      errorMessage = '❌ Credenciais inválidas. O endpoint de login respondeu mas rejeitou as credenciais fornecidas.';
    } else if (lastResp?.status === 401) {
      errorMessage = '❌ Credenciais inválidas (usuário/senha incorretos)';
    } else if (lastResp?.status === 404) {
      errorMessage = '❌ Nenhum endpoint de login conhecido encontrado. Verifique a URL do painel';
    } else if (lastResp?.status === 405) {
      errorMessage = '❌ Método não permitido (o endpoint não aceita POST)';
    } else if (lastResp?.status === 403) {
      errorMessage = '❌ Acesso negado (possível proteção Cloudflare/WAF).';
    } else if (lastResp && !lastResp.ok) {
      errorMessage = `❌ Erro ${lastResp.status}: ${String(lastResp.text || '').slice(0, 200)}`;
    }

    return new Response(JSON.stringify({
      success: false,
      details: errorMessage,
      debug: {
        url: lastUrl || `${cleanBase}/api/auth/login`,
        method: endpointMethod || 'POST',
        status: lastResp?.status || 0,
        response: String(lastResp?.text || '').slice(0, 500),
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error(`❌ Erro geral: ${(error as Error).message}`);
    return new Response(JSON.stringify({ 
      success: false, 
      details: `Erro interno: ${(error as Error).message}` 
    }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" }, 
      status: 500 
    });
  }
});