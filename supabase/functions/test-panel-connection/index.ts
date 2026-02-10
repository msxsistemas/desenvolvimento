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

/**
 * Resolve reCAPTCHA usando 2Captcha API
 * @param version 'v2' ou 'v3'
 * @returns token do reCAPTCHA resolvido ou null se falhar
 */
async function solve2Captcha(siteKey: string, pageUrl: string, version: 'v2' | 'v3' = 'v3'): Promise<string | null> {
  const apiKey = Deno.env.get('TWOCAPTCHA_API_KEY');
  if (!apiKey) {
    console.log('⚠️ TWOCAPTCHA_API_KEY não configurada, pulando resolução de captcha');
    return null;
  }

  try {
    console.log(`🤖 2Captcha: Enviando reCAPTCHA ${version} para resolução (siteKey: ${siteKey.slice(0, 15)}...)`);
    
    // Step 1: Submit captcha task
    let submitUrl = `https://2captcha.com/in.php?key=${apiKey}&method=userrecaptcha&googlekey=${siteKey}&pageurl=${encodeURIComponent(pageUrl)}&json=1`;
    if (version === 'v3') {
      submitUrl += '&version=v3&action=login&min_score=0.3';
    }
    const submitResp = await withTimeout(fetch(submitUrl), 15000);
    const submitJson = await submitResp.json();
    
    if (submitJson.status !== 1) {
      console.log(`❌ 2Captcha submit error: ${JSON.stringify(submitJson)}`);
      return null;
    }
    
    const taskId = submitJson.request;
    console.log(`🤖 2Captcha: Task criada: ${taskId}, aguardando resolução...`);
    
    // Step 2: Poll for result (max ~120s with 5s intervals)
    for (let i = 0; i < 24; i++) {
      await new Promise(r => setTimeout(r, 5000));
      
      const resultUrl = `https://2captcha.com/res.php?key=${apiKey}&action=get&id=${taskId}&json=1`;
      const resultResp = await withTimeout(fetch(resultUrl), 10000);
      const resultJson = await resultResp.json();
      
      if (resultJson.status === 1) {
        console.log(`✅ 2Captcha: reCAPTCHA ${version} resolvido com sucesso! (${i * 5 + 5}s)`);
        return resultJson.request;
      }
      
      if (resultJson.request !== 'CAPCHA_NOT_READY') {
        console.log(`❌ 2Captcha error: ${JSON.stringify(resultJson)}`);
        return null;
      }
      
      console.log(`⏳ 2Captcha: Aguardando... (${(i + 1) * 5}s)`);
    }
    
    console.log('❌ 2Captcha: Timeout após 120s');
    return null;
  } catch (e) {
    console.log(`❌ 2Captcha error: ${(e as Error).message}`);
    return null;
  }
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
    const { baseUrl, username, password, extraHeaders, cf_clearance, cookie, endpointPath, endpointMethod, loginPayload, providerId, testSteps, frontendUrl } = await req.json();
    
    if (!baseUrl || !username || !password) {
      return new Response(JSON.stringify({ 
        success: false, 
        details: "Parâmetros ausentes: baseUrl, username e password são obrigatórios" 
      }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: 400 
      });
    }

    let cleanBase = String(baseUrl).replace(/\/$/, "");
    
    // Uniplay: usa a URL exata informada pelo usuário (sem mapeamento)
    const isUniplay = providerId === 'uniplay';
    
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
    // --- MundoGF: connectivity + form POST test (reCAPTCHA v3 blocks full auth) ---
    if (isMundogf) {
      try {
        console.log('🔄 MundoGF: teste de conectividade + validação via POST...');
        // Step 1: GET login page
        const loginPageResp = await withTimeout(fetch(`${cleanBase}/login`, {
          method: 'GET',
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html', ...hdrs },
        }), 10000);
        const loginHtml = await loginPageResp.text();
        const hasForm = loginHtml.includes('<form') && loginHtml.includes('username') && loginHtml.includes('password');
        
        if (!loginPageResp.ok || !hasForm) {
          return new Response(JSON.stringify({
            success: false,
            details: `Página de login não encontrada ou inválida (status: ${loginPageResp.status})`,
            debug: { url: `${cleanBase}/login`, status: loginPageResp.status, response: loginHtml.slice(0, 500) },
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
        }

        // Extract CSRF token and cookies
        const csrfInput = loginHtml.match(/name=["']_token["']\s+value=["'](.*?)["']/);
        const csrfMeta = loginHtml.match(/<meta\s+name=["']csrf-token["']\s+content=["'](.*?)["']/);
        const csrfToken = (csrfInput ? csrfInput[1] : null) || (csrfMeta ? csrfMeta[1] : null);
        const cookies = loginPageResp.headers.get('set-cookie') || '';
        const cookieParts = cookies.split(',').map(c => c.split(';')[0].trim()).join('; ');

        // Extract reCAPTCHA site key from the HTML
        const recaptchaSiteKeyMatch = loginHtml.match(/sitekey['":\s]+['"]([0-9A-Za-z_-]{20,})['"]/i) 
          || loginHtml.match(/grecaptcha\.execute\(\s*['"]([0-9A-Za-z_-]{20,})['"]/i)
          || loginHtml.match(/recaptcha[\/\w]*api\.js\?.*render=([0-9A-Za-z_-]{20,})/i);
        const recaptchaSiteKey = recaptchaSiteKeyMatch ? recaptchaSiteKeyMatch[1] : null;
        console.log(`🔑 CSRF: ${csrfToken ? csrfToken.slice(0, 20) + '...' : 'não'}, reCAPTCHA key: ${recaptchaSiteKey || 'não encontrada'}`);

        // ---- Resolve reCAPTCHA v3 via 2Captcha ----
        let recaptchaToken: string | null = null;
        if (recaptchaSiteKey) {
          recaptchaToken = await solve2Captcha(recaptchaSiteKey, `${cleanBase}/login`);
        }
        const captchaResponse = recaptchaToken || 'server-test-token';

        // ---- Strategy 1: Non-AJAX POST (follow redirects like a browser) ----
        console.log('🔄 Strategy 1: POST sem AJAX (simulando browser)...');
        const formBody1 = new URLSearchParams();
        if (csrfToken) formBody1.append('_token', csrfToken);
        formBody1.append('username', username);
        formBody1.append('password', password);
        formBody1.append('g-recaptcha-response', captchaResponse);

        const postHeaders1: Record<string, string> = {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Origin': cleanBase,
          'Referer': `${cleanBase}/login`,
        };
        if (cookieParts) postHeaders1['Cookie'] = cookieParts;
        const xsrfMatch = cookies.match(/XSRF-TOKEN=([^;]+)/);
        if (xsrfMatch) postHeaders1['X-XSRF-TOKEN'] = decodeURIComponent(xsrfMatch[1]);

        const postResp1 = await withTimeout(fetch(`${cleanBase}/login`, {
          method: 'POST',
          headers: postHeaders1,
          body: formBody1.toString(),
          redirect: 'manual',
        }), 15000);

        const postStatus1 = postResp1.status;
        const postLocation1 = postResp1.headers.get('location') || '';
        const postText1 = await postResp1.text();
        console.log(`📊 Strategy 1 → status: ${postStatus1}, location: ${postLocation1}, snippet: ${postText1.slice(0, 300)}`);

        // Success: redirect to dashboard (not back to /login)
        const loc1Lower = postLocation1.toLowerCase();
        const isRedirectSuccess = (postStatus1 === 302 || postStatus1 === 301) && postLocation1 && !loc1Lower.includes('/login');
        // Failed login: redirect back to /login - DON'T return yet, let Strategy 2 diagnose
        const isRedirectBackToLogin = (postStatus1 === 302 || postStatus1 === 301) && loc1Lower.includes('/login');

        if (isRedirectSuccess) {
          console.log('✅ Strategy 1: Login bem-sucedido (redirect para dashboard)');
          // Follow redirect to get session info
          const newCookies1 = postResp1.headers.get('set-cookie') || '';
          const allCookies = cookieParts + (newCookies1 ? '; ' + newCookies1.split(',').map(c => c.split(';')[0].trim()).join('; ') : '');
          
          // Try to get credits/account info
          let credits = null;
          try {
            const dashResp = await withTimeout(fetch(`${cleanBase}${postLocation1}`, {
              method: 'GET',
              headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html', 'Cookie': allCookies },
            }), 10000);
            const dashHtml = await dashResp.text();
            // Try to extract credits from dashboard
            const creditsMatch = dashHtml.match(/cr[eé]ditos?\s*:?\s*(\d+)/i) || dashHtml.match(/credits?\s*:?\s*(\d+)/i);
            if (creditsMatch) credits = parseInt(creditsMatch[1]);
            console.log(`📊 Dashboard credits: ${credits}`);
          } catch (_) {}

          return new Response(JSON.stringify({
            success: true,
            endpoint: `${cleanBase}/login`,
            type: 'MundoGF Session',
            account: { status: 'Active', user: { username }, token_received: false, credits },
            data: { connectivity: true, credentialsValidated: true, redirect: postLocation1, credits },
            logs,
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
        }

        if (isRedirectBackToLogin) {
          console.log('⚠️ Strategy 1: Redirect de volta ao /login — tentando Strategy 2 para diagnóstico...');
          // Don't return - fall through to Strategy 2 for proper credential diagnosis
        }

        // ---- Strategy 2: AJAX POST (to get JSON errors) ----
        console.log('🔄 Strategy 2: POST AJAX para diagnóstico...');
        // Get fresh CSRF + cookies
        const loginPageResp2 = await withTimeout(fetch(`${cleanBase}/login`, {
          method: 'GET',
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html', ...hdrs },
        }), 10000);
        const loginHtml2 = await loginPageResp2.text();
        const csrfInput2 = loginHtml2.match(/name=["']_token["']\s+value=["'](.*?)["']/);
        const csrfMeta2 = loginHtml2.match(/<meta\s+name=["']csrf-token["']\s+content=["'](.*?)["']/);
        const csrfToken2 = (csrfInput2 ? csrfInput2[1] : null) || (csrfMeta2 ? csrfMeta2[1] : null);
        const cookies2 = loginPageResp2.headers.get('set-cookie') || '';
        const cookieParts2 = cookies2.split(',').map(c => c.split(';')[0].trim()).join('; ');

        // Resolve fresh reCAPTCHA for Strategy 2 if needed and first one wasn't solved
        let captchaResponse2 = captchaResponse;
        if (recaptchaSiteKey && !recaptchaToken) {
          const freshToken = await solve2Captcha(recaptchaSiteKey, `${cleanBase}/login`);
          if (freshToken) captchaResponse2 = freshToken;
        }

        const formBody2 = new URLSearchParams();
        if (csrfToken2) formBody2.append('_token', csrfToken2);
        formBody2.append('username', username);
        formBody2.append('password', password);
        formBody2.append('g-recaptcha-response', captchaResponse2);

        const postHeaders2: Record<string, string> = {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Origin': cleanBase,
          'Referer': `${cleanBase}/login`,
        };
        if (cookieParts2) postHeaders2['Cookie'] = cookieParts2;
        const xsrfMatch2 = cookies2.match(/XSRF-TOKEN=([^;]+)/);
        if (xsrfMatch2) postHeaders2['X-XSRF-TOKEN'] = decodeURIComponent(xsrfMatch2[1]);

        const postResp2 = await withTimeout(fetch(`${cleanBase}/login`, {
          method: 'POST',
          headers: postHeaders2,
          body: formBody2.toString(),
          redirect: 'manual',
        }), 15000);

        const postStatus2 = postResp2.status;
        const postText2 = await postResp2.text();
        let postJson2: any = null;
        try { postJson2 = JSON.parse(postText2); } catch (_) {}
        console.log(`📊 Strategy 2 → status: ${postStatus2}, snippet: ${postText2.slice(0, 300)}`);

        // 422 with validation errors
        if (postStatus2 === 422 && postJson2?.errors) {
          const errorKeys = Object.keys(postJson2.errors);
          const hasCredentialError = errorKeys.includes('username') || errorKeys.includes('password');

          if (hasCredentialError) {
            return new Response(JSON.stringify({
              success: false,
              details: 'Falha na autenticação MundoGF: Login falhou – Usuário ou senha incorretos.',
              debug: { url: `${cleanBase}/login`, status: postStatus2, errors: postJson2.errors },
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
          }

          // Only recaptcha error = credentials might be valid but can't confirm password
          const onlyRecaptcha = errorKeys.length === 1 && errorKeys[0] === 'g-recaptcha-response';
          if (onlyRecaptcha) {
            const recaptchaNote = recaptchaToken
              ? 'Usuário encontrado mas o token reCAPTCHA resolvido pelo 2Captcha foi rejeitado. Tente novamente.'
              : 'Usuário encontrado no servidor. A senha não pôde ser verificada automaticamente pois o reCAPTCHA v3 impede a validação completa e a chave 2Captcha não está configurada.';
            return new Response(JSON.stringify({
              success: true,
              endpoint: `${cleanBase}/login`,
              type: 'MundoGF Session',
              account: { status: 'Active', user: { username }, token_received: false },
              data: {
                connectivity: true,
                credentialsValidated: false,
                usernameValidated: true,
                captchaSolved: !!recaptchaToken,
                note: recaptchaNote,
              },
              logs,
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
          }
        }

        // 200 with redirect in AJAX = success
        if (postStatus2 === 200 && postJson2?.redirect) {
          return new Response(JSON.stringify({
            success: true,
            endpoint: `${cleanBase}/login`,
            type: 'MundoGF Session',
            account: { status: 'Active', user: { username }, token_received: false },
            data: { connectivity: true, credentialsValidated: true, redirect: postJson2.redirect },
            logs,
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
        }

        // Fallback
        return new Response(JSON.stringify({
          success: false,
          details: 'Falha na autenticação MundoGF.',
          debug: { url: `${cleanBase}/login`, status: postStatus2, response: postText2.slice(0, 500), status1: postStatus1, location1: postLocation1 },
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

      } catch (e) {
        return new Response(JSON.stringify({
          success: false,
          details: `Erro ao conectar: ${(e as Error).message}`,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
      }
    }

    // --- Uniplay: API bloqueia por IP/geo. Teste deve ser feito pelo browser do usuário ---
    if (isUniplay) {
      // Edge function não consegue acessar gesapioffice.com (geo-block).
      // Retornar instrução para o frontend testar direto.
      return new Response(JSON.stringify({
        success: false,
        useDirectBrowserTest: true,
        details: 'Uniplay requer teste direto pelo browser.',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
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
      const isRedirectToApp = locationLower.includes('dashboard') || locationLower.includes('/home') || locationLower.includes('/admin') || locationLower.includes('/panel') || (isKoffice && (locationLower === './' || locationLower === '.'));
      // For MundoGF, redirect to '/' means success (it's the dashboard)
      const isRedirectToRoot = isMundogf && locationLower === '/';
      // For kOffice, './' means redirect to dashboard root (success), not back to login
      const isRelativeRoot = locationLower === './' || locationLower === '.';
      const isRedirectToLogin = !formLocation || (!isKoffice && isRelativeRoot) || locationLower.includes('/login');
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
        
        // Detect credential rejection (Uniplay returns 500 with "Credenciais inválidas")
        const respTextLower = String(resp.text || '').toLowerCase();
        const isCredentialRejection = !resp.ok && (
          respTextLower.includes('credenciais') || respTextLower.includes('credencias') || 
          respTextLower.includes('invalid credentials') || respTextLower.includes('unauthorized')
        );
        
        if (isCredentialRejection) {
          console.log(`❌ Credenciais rejeitadas em: ${url}`);
          return new Response(JSON.stringify({
            success: false,
            details: '❌ Credenciais inválidas. O painel rejeitou o usuário/senha fornecidos.',
            debug: { url, method: endpointMethod || 'POST', status: resp.status, response: String(resp.text).slice(0, 300) },
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
        }

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
          
          // Uniplay: buscar créditos via /api/dash-reseller
          let credits = null;
          if (isUniplay && token) {
            try {
              const dashResp = await withTimeout(fetch(`${cleanBase}/api/dash-reseller`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                },
                body: '{}',
              }), 10000);
              const dashText = await dashResp.text();
              let dashJson: any = null;
              try { dashJson = JSON.parse(dashText); } catch {}
              if (dashJson) {
                credits = dashJson.credits ?? dashJson.credit ?? dashJson.saldo ?? null;
                console.log(`💰 Uniplay créditos: ${credits}`);
              }
            } catch (e) {
              console.log(`⚠️ Uniplay dash-reseller: ${(e as Error).message}`);
            }
          }

          return new Response(JSON.stringify({
            success: true,
            endpoint: url,
            type: isUniplay ? 'Uniplay JWT' : 'Panel',
            account: {
              status: 'Active',
              user: resp.json?.user || resp.json?.data?.user || { username },
              token_received: !!token,
              credits,
            },
            data: {
              token: token || null,
              user: resp.json?.user || resp.json?.data?.user || null,
              credits,
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
