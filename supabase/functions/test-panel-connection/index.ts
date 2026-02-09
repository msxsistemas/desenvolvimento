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

// --- Test step handlers ---

async function tryXtream(cleanBase: string, username: string, password: string, endpoints: string[], hdrs: Record<string, string>, logs: any[]) {
  for (const path of endpoints) {
    const url = `${cleanBase}${path}?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
    console.log(`🧪 Xtream: ${path}`);
    try {
      const res = await withTimeout(fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'application/json', ...hdrs },
      }), 15000);
      const text = await res.text();
      let json: any = null;
      try { json = JSON.parse(text); } catch (_) {}
      console.log(`📊 ${path} → ${res.status}, snippet: ${text.slice(0, 200)}`);
      logs.push({ url: `${cleanBase}${path}`, status: res.status, ok: res.ok, snippet: text.slice(0, 200) });

      if (res.ok && json && (json.user_info || json.server_info)) {
        console.log(`✅ Xtream OK: ${path}`);
        return {
          success: true, endpoint: `${cleanBase}${path}`, type: 'Xtream/kOffice',
          account: { status: json.user_info?.status || 'Active', user: json.user_info || null, token_received: false },
          data: { user_info: json.user_info || null, server_info: json.server_info || null, response: json },
          logs,
        };
      }
    } catch (e) {
      console.log(`⚠️ Xtream ${path}: ${(e as Error).message}`);
      logs.push({ url: `${cleanBase}${path}`, error: (e as Error).message });
    }
  }
  return null;
}

async function tryFormLogin(cleanBase: string, username: string, password: string, endpoints: string[], hdrs: Record<string, string>, logs: any[]) {
  const loginPath = endpoints[0] || '/login';
  try {
    console.log(`🔄 Form login: ${loginPath}`);
    const loginPageResp = await withTimeout(fetch(`${cleanBase}${loginPath}`, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html', ...hdrs },
      redirect: 'manual',
    }), 10000);
    const loginHtml = await loginPageResp.text();
    const cookies = loginPageResp.headers.get('set-cookie') || '';

    const csrfMatch = loginHtml.match(/name=["']csrf_token["']\s+value=["'](.*?)["']/);
    const csrf = csrfMatch ? csrfMatch[1] : null;
    console.log(`🔑 CSRF: ${csrf ? csrf.slice(0, 20) + '...' : 'não encontrado'}`);

    // Always attempt form POST (some panels don't have CSRF or form-login class)
    {
      const formBody = new URLSearchParams();
      formBody.append('try_login', '1');
      if (csrf) formBody.append('csrf_token', csrf);
      formBody.append('username', username);
      formBody.append('password', password);

      const formHeaders: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Origin': cleanBase,
        'Referer': `${cleanBase}${loginPath}`,
        ...hdrs,
      };
      if (cookies) {
        const cookieParts = cookies.split(',').map(c => c.split(';')[0].trim()).join('; ');
        formHeaders['Cookie'] = formHeaders['Cookie'] ? `${formHeaders['Cookie']}; ${cookieParts}` : cookieParts;
      }

      const formResp = await withTimeout(fetch(`${cleanBase}${loginPath}`, {
        method: 'POST', headers: formHeaders, body: formBody.toString(), redirect: 'manual',
      }), 15000);

      const formStatus = formResp.status;
      const formLocation = formResp.headers.get('location') || '';
      const formText = await formResp.text();
      console.log(`📊 Form → ${formStatus}, location: ${formLocation}`);
      logs.push({ url: `${cleanBase}${loginPath} (form)`, status: formStatus, location: formLocation, snippet: formText.slice(0, 200) });

      const loc = formLocation.toLowerCase();
      const isRedirectToApp = loc.includes('dashboard') || loc.includes('/home') || loc.includes('/admin') || loc.includes('/panel');
      const isRedirectToLogin = !formLocation || loc === './' || loc === '.' || loc.includes('/login') || loc === '/';

      const isFormSuccess = (
        (formStatus === 302 || formStatus === 301) && isRedirectToApp && !isRedirectToLogin
      ) || (
        formStatus === 200 && formText.includes('dashboard') && !formText.includes('form-login') && !formText.includes('login_error')
      );

      if (isFormSuccess) {
        console.log(`✅ Form login OK`);
        return {
          success: true, endpoint: `${cleanBase}${loginPath}`, type: 'Form Login',
          account: { status: 'Active', user: { username }, token_received: false },
          data: { redirect: formLocation || null, response: formText.slice(0, 500) },
          logs,
        };
    }
  }
  } catch (e) {
    console.log(`⚠️ Form login: ${(e as Error).message}`);
    logs.push({ url: `${cleanBase}${loginPath} (form)`, error: (e as Error).message });
  }
  return null;
}

async function tryJsonPost(
  cleanBase: string, username: string, password: string,
  endpoints: string[], hdrs: Record<string, string>, logs: any[],
  method: string, loginPayload: any,
) {
  for (const path of endpoints) {
    const url = `${cleanBase}${path.startsWith('/') ? '' : '/'}${path}`;
    console.log(`🧪 JSON POST: ${path}`);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json", "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        ...hdrs,
      };
      const payload = (loginPayload && typeof loginPayload === 'object')
        ? loginPayload
        : { captcha: "not-a-robot", captchaChecked: true, username, password, twofactor_code: "", twofactor_recovery_code: "", twofactor_trusted_device_id: "" };

      const res = await withTimeout(fetch(url, {
        method: method || 'POST', headers,
        body: (method || 'POST').toUpperCase() === 'GET' ? undefined : JSON.stringify(payload),
      }), 15000);

      const text = await res.text();
      let json: any = null;
      try { json = JSON.parse(text); } catch (_) {}
      console.log(`📊 ${path} → ${res.status}, snippet: ${text.slice(0, 150)}`);
      logs.push({ url, status: res.status, ok: res.ok, snippet: text.slice(0, 200) });

      const token = json?.token || json?.jwt || json?.access_token || json?.data?.token || json?.data?.access_token || null;
      const resultField = json?.result;
      const isSuccess = res.ok && (
        token || json?.success === true || json?.status === 'ok' || json?.user || resultField === 'success' || resultField === 'ok'
      );

      if (isSuccess) {
        console.log(`✅ JSON POST OK: ${url}`);
        return {
          success: true, endpoint: url, type: 'Panel',
          account: { status: 'Active', user: json?.user || json?.data?.user || null, token_received: !!token },
          data: { token: token || null, user: json?.user || json?.data?.user || null, response: json },
          logs,
        };
      }
    } catch (e) {
      console.log(`⚠️ JSON POST ${path}: ${(e as Error).message}`);
      logs.push({ url, error: (e as Error).message });
    }
  }
  return null;
}

// --- Main handler ---

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { baseUrl, username, password, extraHeaders, cf_clearance, cookie, endpointPath, endpointMethod, loginPayload, providerId, testSteps } = await req.json();

    if (!baseUrl || !username || !password) {
      return new Response(JSON.stringify({
        success: false, details: "Parâmetros ausentes: baseUrl, username e password são obrigatórios"
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
    }

    const cleanBase = String(baseUrl).replace(/\/$/, "");
    console.log(`🚀 Teste: ${cleanBase} (provedor: ${providerId || 'auto'})`);
    console.log(`👤 Username: ${username}`);

    const hdrs: Record<string, string> = {};
    if (cf_clearance && !cookie) hdrs["Cookie"] = `cf_clearance=${cf_clearance}`;
    if (cookie) hdrs["Cookie"] = String(cookie);
    if (extraHeaders && typeof extraHeaders === 'object') {
      for (const [k, v] of Object.entries(extraHeaders as Record<string, string>)) {
        hdrs[k] = String(v);
      }
    }

    // Skip discovery - go straight to test steps to avoid triggering rate limits

    const logs: any[] = [];

    // Use test steps from frontend if provided, otherwise fallback to universal
    const steps = Array.isArray(testSteps) && testSteps.length > 0
      ? testSteps
      : [
          { type: 'xtream', endpoints: ['/player_api.php', '/panel_api.php', '/api.php'] },
          { type: 'form', endpoints: ['/login'] },
          { type: 'json-post', endpoints: endpointPath ? [endpointPath] : ['/api/auth/login', '/api/login', '/api/v1/login', '/auth/login', '/login'] },
        ];

    // Execute steps in order
    for (const step of steps) {
      console.log(`📋 Step: ${step.label || step.type}`);
      let result: any = null;

      if (step.type === 'xtream') {
        result = await tryXtream(cleanBase, username, password, step.endpoints || [], hdrs, logs);
      } else if (step.type === 'form') {
        result = await tryFormLogin(cleanBase, username, password, step.endpoints || ['/login'], hdrs, logs);
      } else if (step.type === 'json-post') {
        result = await tryJsonPost(cleanBase, username, password, step.endpoints || [endpointPath || '/api/auth/login'], hdrs, logs, endpointMethod || 'POST', loginPayload);
      }

      if (result) {
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
        });
      }
    }

    // Error
    const lastLog = logs[logs.length - 1];
    const lastStatus = lastLog?.status || 0;
    let errorMessage = 'Falha na autenticação';
    if (lastStatus === 401) errorMessage = '❌ Credenciais inválidas (usuário/senha incorretos)';
    else if (lastStatus === 404) errorMessage = '❌ Nenhum endpoint de login encontrado. Verifique a URL do painel';
    else if (lastStatus === 403) errorMessage = '❌ Acesso negado (possível proteção Cloudflare/WAF)';
    else if (lastStatus === 405) errorMessage = '❌ Método não permitido';

    return new Response(JSON.stringify({
      success: false, details: errorMessage,
      debug: { url: lastLog?.url || cleanBase, method: endpointMethod || 'POST', status: lastStatus, response: lastLog?.snippet || '' },
      logs,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    console.error(`❌ Erro: ${(error as Error).message}`);
    return new Response(JSON.stringify({
      success: false, details: `Erro interno: ${(error as Error).message}`
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});
