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
    const { baseUrl, username, password, extraHeaders, cf_clearance, cookie, endpointPath, endpointMethod, loginPayload, providerId, testSteps } = await req.json();
    
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
    
    console.log(`🚀 Iniciando teste para: ${cleanBase} (provedor: ${providerId || 'auto'})`);
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

    const isKoffice = providerId === 'koffice-api' || providerId === 'koffice-v2';
    const isMundogf = providerId === 'mundogf';
    const isSigma = providerId === 'sigma-v2';

    // Only discover API structure for unknown providers
    if (!providerId || isKoffice || isMundogf) {
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
    } // end if !providerId || isKoffice

    const logs: any[] = [];
    let lastResp: any = null;
    let lastUrl = '';

    // --- Try Xtream/kOffice style: only for koffice-api or unknown providers ---
    if (!providerId || providerId === 'koffice-api') {
    const xtreamPaths = ['/player_api.php', '/panel_api.php', '/api.php'];

    for (const path of xtreamPaths) {
      const url = `${cleanBase}${path}?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
      console.log(`🧪 Testando Xtream endpoint: ${path}`);
      try {
        const res = await withTimeout(fetch(url, {
          method: 'GET',
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'application/json', ...hdrs },
        }), 15000);
        const text = await res.text();
        let json: any = null;
        try { json = JSON.parse(text); } catch (_) {}
        console.log(`📊 ${path} → status: ${res.status}, snippet: ${text.slice(0, 200)}`);
        logs.push({ url: `${cleanBase}${path}`, status: res.status, ok: res.ok, snippet: text.slice(0, 200) });
        lastResp = { status: res.status, ok: res.ok, text, json };
        lastUrl = `${cleanBase}${path}`;

        // Xtream API returns user_info on success
        if (res.ok && json && (json.user_info || json.server_info)) {
          console.log(`✅ Login Xtream bem-sucedido em: ${path}`);
          return new Response(JSON.stringify({
            success: true,
            endpoint: `${cleanBase}${path}`,
            type: 'Xtream/kOffice',
            account: {
              status: json.user_info?.status || 'Active',
              user: json.user_info || null,
              token_received: false,
            },
            data: {
              user_info: json.user_info || null,
              server_info: json.server_info || null,
              response: json,
            },
            logs,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }
      } catch (e) {
        console.log(`⚠️ Erro Xtream ${path}: ${(e as Error).message}`);
        logs.push({ url: `${cleanBase}${path}`, error: (e as Error).message });
      }
    }
    } // end xtream block

    // --- Try form-based login (only for koffice-v2 or unknown providers) ---
    // --- MundoGF: connectivity-only test (reCAPTCHA v3 blocks server-side login) ---
    if (isMundogf) {
      try {
        console.log('🔄 MundoGF: teste de conectividade (reCAPTCHA v3 impede login server-side)...');
        const loginPageResp = await withTimeout(fetch(`${cleanBase}/login`, {
          method: 'GET',
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html', ...hdrs },
        }), 10000);
        const loginHtml = await loginPageResp.text();
        const hasForm = loginHtml.includes('<form') && loginHtml.includes('username') && loginHtml.includes('password');
        const hasCsrf = loginHtml.includes('csrf-token') || loginHtml.includes('_token');
        console.log(`📊 Login page → status: ${loginPageResp.status}, hasForm: ${hasForm}, hasCsrf: ${hasCsrf}`);

        if (loginPageResp.ok && hasForm) {
          return new Response(JSON.stringify({
            success: true,
            endpoint: `${cleanBase}/login`,
            type: 'MundoGF Connectivity',
            account: {
              status: 'Active',
              user: { username },
              token_received: false,
            },
            data: {
              connectivity: true,
              hasForm,
              hasCsrf,
              note: 'Teste de conectividade OK. O painel possui reCAPTCHA v3, autenticação completa será feita pelo sistema.',
            },
            logs,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        } else {
          return new Response(JSON.stringify({
            success: false,
            details: `Página de login não encontrada ou inválida (status: ${loginPageResp.status})`,
            debug: { url: `${cleanBase}/login`, status: loginPageResp.status, response: loginHtml.slice(0, 500) },
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }
      } catch (e) {
        return new Response(JSON.stringify({
          success: false,
          details: `Erro ao conectar: ${(e as Error).message}`,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
    }

    if (!providerId || isKoffice) {
    try {
      console.log('🔄 Tentando login via formulário HTML (kOffice style)...');
      // Step 1: GET login page to extract CSRF token and session cookie
      const loginPageResp2 = await withTimeout(fetch(`${cleanBase}/login`, {
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html', ...hdrs },
        redirect: 'manual',
      }), 10000);
      const loginHtml2 = await loginPageResp2.text();
      const cookies = loginPageResp2.headers.get('set-cookie') || '';
      
      // Extract CSRF token from multiple sources
      const csrfMatch2 = loginHtml2.match(/name=["']csrf_token["']\s+value=["'](.*?)["']/);
      const csrf2 = csrfMatch2 ? csrfMatch2[1] : null;
      // Laravel-style _token hidden input
      const laravelCsrf = loginHtml2.match(/name=["']_token["']\s+value=["'](.*?)["']/);
      // Laravel meta tag: <meta name="csrf-token" content="...">
      const metaCsrf = loginHtml2.match(/<meta\s+name=["']csrf-token["']\s+content=["'](.*?)["']/);
      const csrfToken = csrf2 || (laravelCsrf ? laravelCsrf[1] : null) || (metaCsrf ? metaCsrf[1] : null);
      console.log(`🔑 CSRF token extraído: ${csrfToken ? csrfToken.slice(0, 20) + '...' : 'não encontrado'}`);
      console.log(`🍪 Cookies: ${cookies.slice(0, 200)}`);

      // Step 2: POST form-encoded login
      const formBody = new URLSearchParams();
      if (!isMundogf) formBody.append('try_login', '1');
      if (csrfToken) {
        if (!isMundogf) formBody.append('csrf_token', csrfToken);
        formBody.append('_token', csrfToken);
      }
      formBody.append('username', username);
      formBody.append('password', password);

      const formHeaders: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/json',
        'Origin': cleanBase,
        'Referer': `${cleanBase}/login`,
        ...hdrs,
      };
      // Extract XSRF-TOKEN from cookies for Laravel X-XSRF-TOKEN header
      const xsrfMatch = cookies.match(/XSRF-TOKEN=([^;]+)/);
      if (xsrfMatch) {
        formHeaders['X-XSRF-TOKEN'] = decodeURIComponent(xsrfMatch[1]);
      }
      // Collect session cookies
      let sessionCookies = '';
      if (cookies) {
        const cookieParts = cookies.split(',').map(c => c.split(';')[0].trim()).join('; ');
        sessionCookies = cookieParts;
        formHeaders['Cookie'] = formHeaders['Cookie'] ? `${formHeaders['Cookie']}; ${cookieParts}` : cookieParts;
      }

      console.log(`🔄 POST form-encoded para: ${cleanBase}/login`);
      const formResp = await withTimeout(fetch(`${cleanBase}/login`, {
        method: 'POST',
        headers: formHeaders,
        body: formBody.toString(),
        redirect: 'manual',
      }), 15000);

      const formStatus = formResp.status;
      const formLocation = formResp.headers.get('location') || '';
      const formSetCookies = formResp.headers.get('set-cookie') || '';
      const formText = await formResp.text();
      console.log(`📊 Form login → status: ${formStatus}, location: ${formLocation}, snippet: ${formText.slice(0, 200)}`);
      console.log(`🍪 New cookies: ${formSetCookies.slice(0, 200)}`);
      logs.push({ url: `${cleanBase}/login (form)`, status: formStatus, location: formLocation, snippet: formText.slice(0, 200) });

      // Merge new cookies from login response
      if (formSetCookies) {
        const newParts = formSetCookies.split(',').map(c => c.split(';')[0].trim()).join('; ');
        sessionCookies = sessionCookies ? `${sessionCookies}; ${newParts}` : newParts;
      }

      // Success indicators: redirect to dashboard/home OR 200 with dashboard content
      const locationLower = formLocation.toLowerCase();
      const isRedirectToApp = locationLower.includes('dashboard') || locationLower.includes('/home') || locationLower.includes('/admin') || locationLower.includes('/panel');
      // For MundoGF, redirect to '/' means success (it's the dashboard)
      const isRedirectToRoot = isMundogf && locationLower === '/';
      const isRedirectToLogin = !formLocation || locationLower === './' || locationLower === '.' || locationLower.includes('/login');
      const isRedirectToLoginOnly = isRedirectToLogin && !isRedirectToRoot;
      
      const isFormLoginSuccess = (
        (formStatus === 302 || formStatus === 301) && !isRedirectToLoginOnly
      ) || (
        formStatus === 200 && !formText.includes('form-login') && !formText.includes('login_error') && !formText.includes('Invalid')
      );

      if (isFormLoginSuccess) {
        console.log(`✅ Login via formulário parece OK, verificando com API...`);
        
        // Determine verify endpoints based on provider
        const verifyEndpoints = isMundogf
          ? ['/bonus/stats', '/ajax/getClientsStats2']
          : ['/dashboard/api?get_info&month=0'];

        // Step 3: Verify session
        for (const verifyPath of verifyEndpoints) {
          try {
            const verifyHeaders: Record<string, string> = {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'application/json, text/javascript, */*; q=0.01',
              'X-Requested-With': 'XMLHttpRequest',
              'Referer': `${cleanBase}/`,
            };
            if (sessionCookies) verifyHeaders['Cookie'] = sessionCookies;

            console.log(`🔍 Verificando sessão: GET ${cleanBase}${verifyPath}`);
            const verifyResp = await withTimeout(fetch(`${cleanBase}${verifyPath}`, {
              method: 'GET',
              headers: verifyHeaders,
            }), 10000);

            const verifyText = await verifyResp.text();
            let verifyJson: any = null;
            try { verifyJson = JSON.parse(verifyText); } catch (_) {}
            console.log(`📊 Verify → status: ${verifyResp.status}, snippet: ${verifyText.slice(0, 300)}`);
            logs.push({ url: `${cleanBase}${verifyPath}`, status: verifyResp.status, snippet: verifyText.slice(0, 200) });

            if (verifyResp.ok && verifyJson && typeof verifyJson === 'object') {
              console.log(`✅ Sessão verificada com sucesso via ${verifyPath}!`);
              return new Response(JSON.stringify({
                success: true,
                endpoint: `${cleanBase}${verifyPath}`,
                type: isMundogf ? 'MundoGF Session' : 'kOffice Session',
                account: {
                  status: 'Active',
                  user: { username },
                  token_received: false,
                },
                data: {
                  dashboard_info: verifyJson,
                  redirect: formLocation || null,
                },
                logs,
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
              });
            }
          } catch (verifyErr) {
            console.log(`⚠️ Erro ao verificar sessão via ${verifyPath}: ${(verifyErr as Error).message}`);
          }
        }

        // Even without verify, if redirect was to dashboard, consider success
        if (isRedirectToApp || isRedirectToRoot) {
          console.log(`✅ Login via formulário bem-sucedido (redirect para dashboard)!`);
          return new Response(JSON.stringify({
            success: true,
            endpoint: `${cleanBase}/login`,
            type: 'kOffice Form',
            account: {
              status: 'Active',
              user: { username },
              token_received: false,
            },
            data: {
              redirect: formLocation || null,
              response: formText.slice(0, 500),
            },
            logs,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }
      }
    } catch (e) {
      console.log(`⚠️ Erro form login: ${(e as Error).message}`);
      logs.push({ url: `${cleanBase}/login (form)`, error: (e as Error).message });
    }
    } // end form-based login block

    // --- Fallback: Try standard POST JSON login endpoints (sigma and others) ---
    // Build candidates from testSteps if available, otherwise use endpointPath or defaults
    let candidates: string[] = [];
    if (Array.isArray(testSteps) && testSteps.length > 0) {
      // Extract all endpoints from json-post steps first, then form steps
      for (const step of testSteps) {
        if (step.type === 'json-post' && Array.isArray(step.endpoints)) {
          candidates.push(...step.endpoints);
        }
      }
      // If no json-post endpoints found, try all step endpoints
      if (candidates.length === 0) {
        for (const step of testSteps) {
          if (Array.isArray(step.endpoints)) {
            candidates.push(...step.endpoints);
          }
        }
      }
    }
    
    if (candidates.length === 0) {
      candidates = providerId && endpointPath
        ? [endpointPath]
        : Array.from(new Set([
            endpointPath || '/api/auth/login',
            '/api/login',
            '/api/v1/login',
            '/api/v1/auth/login',
            '/auth/login',
            '/login',
            '/admin/login',
          ]));
    }
    
    // Deduplicate
    candidates = Array.from(new Set(candidates));

    for (const path of candidates) {
      const url = `${cleanBase}${path.startsWith('/') ? '' : '/'}${path}`;
      console.log(`🧪 Testando POST endpoint: ${path}`);
      try {
        const resp = await testOnWaveLogin(url, username, password, hdrs, endpointMethod || 'POST', loginPayload);
        console.log(`📊 ${path} → status: ${resp.status}, ok: ${resp.ok}, snippet: ${String(resp.text).slice(0, 150)}`);
        logs.push({ url, status: resp.status, ok: resp.ok, snippet: String(resp.text).slice(0, 200) });
        lastResp = resp;
        lastUrl = url;

        const token = resp.json?.token || resp.json?.jwt || resp.json?.access_token || resp.json?.data?.token || resp.json?.data?.access_token || null;
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
        console.log(`⚠️ Erro POST ${path}: ${(e as Error).message}`);
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
