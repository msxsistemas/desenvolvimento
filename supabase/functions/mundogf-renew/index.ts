import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

async function solve2Captcha(siteKey: string, pageUrl: string, mode: 'v2' | 'v3' | 'v2-invisible' = 'v2'): Promise<string | null> {
  const apiKey = Deno.env.get('TWOCAPTCHA_API_KEY');
  if (!apiKey) { console.log('⚠️ 2Captcha: API key não configurada'); return null; }
  try {
    console.log(`🤖 2Captcha: Enviando reCAPTCHA ${mode} para resolução...`);
    let submitUrl: string;
    if (mode === 'v3') {
      submitUrl = `https://2captcha.com/in.php?key=${apiKey}&method=userrecaptcha&googlekey=${siteKey}&pageurl=${encodeURIComponent(pageUrl)}&version=v3&action=login&min_score=0.3&json=1`;
    } else if (mode === 'v2-invisible') {
      submitUrl = `https://2captcha.com/in.php?key=${apiKey}&method=userrecaptcha&googlekey=${siteKey}&pageurl=${encodeURIComponent(pageUrl)}&invisible=1&json=1`;
    } else {
      // v2 standard checkbox
      submitUrl = `https://2captcha.com/in.php?key=${apiKey}&method=userrecaptcha&googlekey=${siteKey}&pageurl=${encodeURIComponent(pageUrl)}&json=1`;
    }
    const submitResp = await withTimeout(fetch(submitUrl), 15000);
    const submitJson = await submitResp.json();
    if (submitJson.status !== 1) { console.log(`❌ 2Captcha submit falhou: ${JSON.stringify(submitJson)}`); return null; }
    const taskId = submitJson.request;
    console.log(`🤖 2Captcha: Task ${taskId}, aguardando...`);
    for (let i = 0; i < 24; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const resultUrl = `https://2captcha.com/res.php?key=${apiKey}&action=get&id=${taskId}&json=1`;
      const resultResp = await withTimeout(fetch(resultUrl), 10000);
      const resultJson = await resultResp.json();
      if (resultJson.status === 1) { console.log(`✅ 2Captcha resolvido em ${(i+1)*5}s`); return resultJson.request; }
      if (resultJson.request !== 'CAPCHA_NOT_READY') { console.log(`❌ 2Captcha erro: ${resultJson.request}`); return null; }
    }
    console.log('❌ 2Captcha: timeout após 120s');
    return null;
  } catch (e: any) { console.log(`❌ 2Captcha erro: ${e.message}`); return null; }
}

function mergeSetCookies(existing: string, resp: Response): string {
  // Use getSetCookie() to capture ALL Set-Cookie headers (critical for Laravel sessions)
  let allSetCookies: string[] = [];
  try {
    allSetCookies = resp.headers.getSetCookie?.() || [];
  } catch {}
  // Fallback to get('set-cookie') if getSetCookie not available
  if (allSetCookies.length === 0) {
    const sc = resp.headers.get('set-cookie');
    if (sc) allSetCookies = sc.split(/,\s*(?=[A-Za-z_-]+=)/);
  }
  if (allSetCookies.length === 0) return existing;
  
  const existingParts = existing ? existing.split('; ').filter(Boolean) : [];
  const cookieMap = new Map<string, string>();
  for (const c of existingParts) { const n = c.split('=')[0]; if (n) cookieMap.set(n, c); }
  for (const raw of allSetCookies) {
    const c = raw.split(';')[0].trim();
    const n = c.split('=')[0];
    if (n) cookieMap.set(n, c);
  }
  return [...cookieMap.values()].join('; ');
}

async function loginMundoGF(baseUrl: string, username: string, password: string): Promise<{ success: boolean; cookies: string; csrf: string; error?: string }> {
  const cleanBase = baseUrl.replace(/\/$/, '');
  console.log(`🔐 MundoGF Login: ${cleanBase} (user: ${username})`);
  
  const loginResp = await withTimeout(fetch(`${cleanBase}/login`, {
    method: 'GET',
    headers: { 
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36', 
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8',
    },
  }), 10000);
  const loginHtml = await loginResp.text();
  
  const hasForm = loginHtml.includes('name="username"');
  const hasCloudflare = loginHtml.includes('cf-browser-verification') || loginHtml.includes('challenge-platform');
  console.log(`📄 Login page: ${loginResp.status}, hasForm=${hasForm}, cloudflare=${hasCloudflare}, length=${loginHtml.length}`);
  const csrfInput = loginHtml.match(/name=["']_token["']\s+value=["'](.*?)["']/);
  const csrfMeta = loginHtml.match(/<meta\s+name=["']csrf-token["']\s+content=["'](.*?)["']/);
  const csrfToken = (csrfInput ? csrfInput[1] : null) || (csrfMeta ? csrfMeta[1] : null) || '';
  
  // Detect reCAPTCHA siteKey
  const v3RenderMatch = loginHtml.match(/recaptcha[\/\w]*api\.js\?[^"']*render=([0-9A-Za-z_-]{20,})/i)
    || loginHtml.match(/grecaptcha\.execute\(\s*['"]([0-9A-Za-z_-]{20,})['"]/i);
  const v2Match = loginHtml.match(/sitekey['":\s]+['"]([0-9A-Za-z_-]{20,})['"]/i);
  const siteKey = v3RenderMatch ? v3RenderMatch[1] : (v2Match ? v2Match[1] : null);
  console.log(`🔑 reCAPTCHA: siteKey=${siteKey?.slice(0, 15) || 'none'}`);

  let allCookies = mergeSetCookies('', loginResp);
  console.log(`🍪 GET cookies: ${allCookies.slice(0, 200)}`);

  // Helper to attempt login POST with a captcha token
  async function attemptLogin(captchaToken: string, csrf: string, cookies: string): Promise<{ success: boolean; cookies: string; location: string; status: number }> {
    const formBody = new URLSearchParams();
    if (csrf) formBody.append('_token', csrf);
    formBody.append('username', username);
    formBody.append('password', password);
    if (captchaToken) formBody.append('g-recaptcha-response', captchaToken);
    
    const postHeaders: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'Origin': cleanBase,
      'Referer': `${cleanBase}/login`,
      'Cache-Control': 'no-cache',
    };
    if (cookies) postHeaders['Cookie'] = cookies;
    const xsrfMatch = cookies.match(/XSRF-TOKEN=([^;,\s]+)/);
    if (xsrfMatch) postHeaders['X-XSRF-TOKEN'] = decodeURIComponent(xsrfMatch[1]);

    const postResp = await withTimeout(fetch(`${cleanBase}/login`, {
      method: 'POST',
      headers: postHeaders,
      body: formBody.toString(),
      redirect: 'manual',
    }), 15000);

    const postLocation = postResp.headers.get('location') || '';
    const updatedCookies = mergeSetCookies(cookies, postResp);
    await postResp.text(); // consume body
    
    const isSuccess = (postResp.status === 302 || postResp.status === 301) && postLocation && !postLocation.toLowerCase().includes('/login');
    return { success: isSuccess, cookies: updatedCookies, location: postLocation, status: postResp.status };
  }

  // Try captcha versions: v2 standard first (most common), then v3, then v2-invisible
  const captchaVersions: Array<{ label: string; mode: 'v2' | 'v3' | 'v2-invisible' }> = siteKey 
    ? [{ label: 'v2', mode: 'v2' }, { label: 'v3', mode: 'v3' }, { label: 'v2-invisible', mode: 'v2-invisible' }]
    : [];

  for (const ver of captchaVersions) {
    console.log(`🤖 Tentando reCAPTCHA ${ver.label}...`);
    const solved = await solve2Captcha(siteKey!, `${cleanBase}/login`, ver.mode);
    if (!solved) {
      console.log(`❌ 2Captcha ${ver.label}: falhou, tentando próximo...`);
      continue;
    }

    // Need fresh CSRF + cookies for each attempt
    const freshResp = await withTimeout(fetch(`${cleanBase}/login`, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html' },
    }), 10000);
    const freshHtml = await freshResp.text();
    const freshCsrfInput = freshHtml.match(/name=["']_token["']\s+value=["'](.*?)["']/);
    const freshCsrfMeta = freshHtml.match(/<meta\s+name=["']csrf-token["']\s+content=["'](.*?)["']/);
    const freshCsrf = (freshCsrfInput ? freshCsrfInput[1] : null) || (freshCsrfMeta ? freshCsrfMeta[1] : null) || csrfToken;
    let freshCookies = mergeSetCookies('', freshResp);

    const result = await attemptLogin(solved, freshCsrf, freshCookies);
    console.log(`📊 Login ${ver.label} → status: ${result.status}, redirect: ${result.location.slice(0, 80)}, success: ${result.success}`);

    if (result.success) {
      // Follow redirect to capture session cookies and get fresh CSRF
      const followUrl = result.location.startsWith('http') ? result.location : `${cleanBase}${result.location}`;
      const followResp = await withTimeout(fetch(followUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html', 'Cookie': result.cookies },
        redirect: 'manual',
      }), 10000);
      const finalCookies = mergeSetCookies(result.cookies, followResp);
      const dashHtml = await followResp.text();
      const dashCsrf = dashHtml.match(/<meta\s+name=["']csrf-token["']\s+content=["'](.*?)["']/);
      const finalCsrf = dashCsrf ? dashCsrf[1] : freshCsrf;
      console.log(`✅ Login ${ver.label} bem-sucedido!`);
      return { success: true, cookies: finalCookies, csrf: finalCsrf };
    }
  }

  // No captcha or all captcha attempts failed - try without captcha
  if (!siteKey) {
    const result = await attemptLogin('', csrfToken, allCookies);
    if (result.success) {
      const followUrl = result.location.startsWith('http') ? result.location : `${cleanBase}${result.location}`;
      const followResp = await withTimeout(fetch(followUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html', 'Cookie': result.cookies },
        redirect: 'manual',
      }), 10000);
      const finalCookies = mergeSetCookies(result.cookies, followResp);
      const dashHtml = await followResp.text();
      const dashCsrf = dashHtml.match(/<meta\s+name=["']csrf-token["']\s+content=["'](.*?)["']/);
      return { success: true, cookies: finalCookies, csrf: dashCsrf ? dashCsrf[1] : csrfToken };
    }
  }

  return { success: false, cookies: '', csrf: '', error: `Login falhou após todas as tentativas de reCAPTCHA` };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, panelId } = body;

    // Get panel credentials from DB
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === 'get_credits') {
      // Get credits for a MundoGF panel
      const { data: panel, error: panelError } = await supabase
        .from('paineis_integracao')
        .select('*')
        .eq('id', panelId)
        .eq('provedor', 'mundogf')
        .single();
      
      if (panelError || !panel) {
        return new Response(JSON.stringify({ success: false, error: 'Painel não encontrado' }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
        });
      }

      const login = await loginMundoGF(panel.url, panel.usuario, panel.senha);
      if (!login.success) {
        return new Response(JSON.stringify({ success: false, error: login.error }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
        });
      }

      const creditsResp = await withTimeout(fetch(`${panel.url.replace(/\/$/, '')}/ajax/getUserCredits`, {
        method: 'GET',
        headers: { 'Cookie': login.cookies, 'X-Requested-With': 'XMLHttpRequest', 'User-Agent': 'Mozilla/5.0' },
      }), 10000);
      const creditsText = await creditsResp.text();
      let creditsJson: any = null;
      try { creditsJson = JSON.parse(creditsText); } catch {}

      return new Response(JSON.stringify({ success: true, credits: creditsJson?.credits ?? null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    if (action === 'list_clients') {
      const { data: panel } = await supabase.from('paineis_integracao').select('*').eq('id', panelId).eq('provedor', 'mundogf').single();
      if (!panel) return new Response(JSON.stringify({ success: false, error: 'Painel não encontrado' }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });

      const login = await loginMundoGF(panel.url, panel.usuario, panel.senha);
      if (!login.success) return new Response(JSON.stringify({ success: false, error: login.error }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });

      const cleanBase = panel.url.replace(/\/$/, '');
      const dtBody = new URLSearchParams();
      dtBody.append('draw', '1');
      dtBody.append('start', '0');
      dtBody.append('length', '1000');
      dtBody.append('search[value]', '');

      const clientsResp = await withTimeout(fetch(`${cleanBase}/ajax/getClients`, {
        method: 'POST',
        headers: {
          'Cookie': login.cookies,
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': login.csrf,
          'User-Agent': 'Mozilla/5.0',
          'Referer': `${cleanBase}/clients`,
        },
        body: dtBody.toString(),
      }), 15000);
      const clientsText = await clientsResp.text();
      let clientsJson: any = null;
      try { clientsJson = JSON.parse(clientsText); } catch {}

      if (!clientsJson?.data) {
        return new Response(JSON.stringify({ success: false, error: 'Não foi possível obter lista de clientes' }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
        });
      }

      // Clean HTML from data
      const clients = clientsJson.data.map((c: any) => ({
        user_id: c.user_id,
        username: c.username?.replace(/<[^>]*>/g, '') || '',
        password: c.password,
        status: c.status,
        expire: c.expire?.replace(/<[^>]*>/g, '') || '',
        max_cons: c.max_cons,
        online: c.online,
        notes: c.notes_full || c.notes || '',
        created_at: c.created_at,
      }));

      return new Response(JSON.stringify({ 
        success: true, 
        total: clientsJson.recordsTotal,
        clients 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    if (action === 'renew_client' || action === 'renew_by_username') {
      let { clientUserId, username, duration, durationIn, clienteScreens } = body;
      if ((!clientUserId && !username) || !duration || !durationIn) {
        return new Response(JSON.stringify({ success: false, error: 'clientUserId ou username, duration e durationIn são obrigatórios' }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
        });
      }

      const { data: panel } = await supabase.from('paineis_integracao').select('*').eq('id', panelId).eq('provedor', 'mundogf').single();
      if (!panel) return new Response(JSON.stringify({ success: false, error: 'Painel não encontrado' }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });

      console.log(`🔄 Renovando cliente ${clientUserId || username} no painel ${panel.nome} (${duration} ${durationIn}, Telas: ${clienteScreens || '?'})`);

      const login = await loginMundoGF(panel.url, panel.usuario, panel.senha);
      if (!login.success) return new Response(JSON.stringify({ success: false, error: login.error }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });

      const cleanBase = panel.url.replace(/\/$/, '');
      
      // If renew_by_username, first find the client user_id from the panel
      let resolvedUserId = clientUserId;
      if (!resolvedUserId && username) {
        const dtBody = new URLSearchParams();
        dtBody.append('draw', '1');
        dtBody.append('start', '0');
        dtBody.append('length', '1000');
        dtBody.append('search[value]', username);

        const searchResp = await withTimeout(fetch(`${cleanBase}/ajax/getClients`, {
          method: 'POST',
          headers: {
            'Cookie': login.cookies,
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-TOKEN': login.csrf,
            'User-Agent': 'Mozilla/5.0',
            'Referer': `${cleanBase}/clients`,
          },
          body: dtBody.toString(),
        }), 15000);
        const searchText = await searchResp.text();
        let searchJson: any = null;
        try { searchJson = JSON.parse(searchText); } catch {}

        if (searchJson?.data) {
          const match = searchJson.data.find((c: any) => {
            const cleanUsername = (c.username || '').replace(/<[^>]*>/g, '').trim();
            return cleanUsername.toLowerCase() === username.toLowerCase();
          });
          if (match) {
            resolvedUserId = match.user_id;
          }
        }

        if (!resolvedUserId) {
          return new Response(JSON.stringify({ success: false, error: `Usuário "${username}" não encontrado no painel MundoGF` }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
          });
        }
      }

      // Get client's current max_cons and valid option values before extending
      let maxCons = '1';
      let validOption = '';
      
      if (username) {
        // Fetch client info
        const dtBody2 = new URLSearchParams();
        dtBody2.append('draw', '1');
        dtBody2.append('start', '0');
        dtBody2.append('length', '50');
        dtBody2.append('search[value]', username);
        try {
          const infoResp = await withTimeout(fetch(`${cleanBase}/ajax/getClients`, {
            method: 'POST',
            headers: {
              'Cookie': login.cookies,
              'Content-Type': 'application/x-www-form-urlencoded',
              'X-Requested-With': 'XMLHttpRequest',
              'X-CSRF-TOKEN': login.csrf,
              'User-Agent': 'Mozilla/5.0',
              'Referer': `${cleanBase}/clients`,
            },
            body: dtBody2.toString(),
          }), 10000);
          const infoJson = await infoResp.json();
          const found = infoJson?.data?.find((c: any) => (c.username || '').replace(/<[^>]*>/g, '').trim().toLowerCase() === username.toLowerCase());
          if (found?.max_cons) maxCons = String(found.max_cons);
        } catch {}
      }

      // Fetch the extend modal to extract valid option values from dropdown
      // The endpoint is GET /clients/{id}/extend (returns HTML modal with select options)
      try {
        const extendPageResp = await withTimeout(fetch(`${cleanBase}/clients/${resolvedUserId}/extend`, {
          method: 'GET',
          headers: {
            'Cookie': login.cookies,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': '*/*',
            'Referer': `${cleanBase}/clients/${resolvedUserId}`,
          },
        }), 10000);
        const extendHtml = await extendPageResp.text();
        console.log(`📄 Extend page: ${extendPageResp.status}, length=${extendHtml.length}`);
        
        // Extract option values from the select dropdown
        // HTML format: <option value="92" data-credi...>1 Mês</option>
        const optionMatches = extendHtml.match(/<option\s[^>]*value=["']([^"']+)["'][^>]*>\s*([\s\S]*?)\s*<\/option>/gi);
        if (optionMatches) {
          const parsedOptions: { value: string; text: string }[] = [];
          for (const match of optionMatches) {
            const optionMatch = match.match(/<option\s[^>]*value=["']([^"']+)["'][^>]*>\s*([\s\S]*?)\s*<\/option>/i);
            if (optionMatch) {
              const val = optionMatch[1].trim();
              const txt = optionMatch[2].trim();
              // Skip non-numeric options like "custom" and "add_screens"
              if (val && txt && val !== 'custom' && val !== 'add_screens') {
                parsedOptions.push({ value: val, text: txt });
              }
            }
          }
          
          console.log(`📋 Parsed options: ${JSON.stringify(parsedOptions)}`);
          
          // Map duration to month count
          let targetMonths = Number(duration);
          if (durationIn === 'days') {
            targetMonths = Math.max(1, Math.ceil(Number(duration) / 30));
          }
          
          // Priority 1: Exact text match like "1 Mês" or "3 Meses"
          const exactMatch = parsedOptions.find(o => {
            const textLower = o.text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (targetMonths === 1 && (textLower === '1 mes' || textLower.includes('1 mes'))) return true;
            if (targetMonths > 1 && (textLower === `${targetMonths} meses` || textLower.includes(`${targetMonths} meses`))) return true;
            return false;
          });
          
          if (exactMatch) {
            validOption = exactMatch.value;
            console.log(`✅ Exact match: value="${exactMatch.value}", text="${exactMatch.text}"`);
          } else {
            // Priority 2: Contains the month number
            const partialMatch = parsedOptions.find(o => {
              const nums = o.text.match(/(\d+)/);
              return nums && Number(nums[1]) === targetMonths;
            });
            if (partialMatch) {
              validOption = partialMatch.value;
              console.log(`✅ Partial match: value="${partialMatch.value}", text="${partialMatch.text}"`);
            } else if (parsedOptions.length > 0) {
              // Priority 3: Use first available option as last resort
              validOption = parsedOptions[0].value;
              console.log(`⚠️ No month match, using first option: value="${parsedOptions[0].value}", text="${parsedOptions[0].text}"`);
            }
          }
        } else {
          console.log(`⚠️ No <option> tags found in extend page`);
        }
      } catch (e: any) {
        console.log(`⚠️ Could not fetch extend page: ${e.message}`);
      }

      // Build maxCons from clienteScreens parameter
      if (clienteScreens) {
        maxCons = String(clienteScreens);
        console.log(`📺 Usando telas do cliente: ${maxCons}`);
      }

      // Fallback to calculated option if not found in dropdown
      if (!validOption) {
        let months = Number(duration);
        if (durationIn === 'days') {
          months = Math.max(1, Math.ceil(months / 30));
        }
        validOption = String(months);
        console.log(`⚠️ Using fallback option: ${validOption}`);
      }

      console.log(`📤 Extend payload: user_id=${resolvedUserId}, option=${validOption}, connections=${maxCons}`);

      // POST /clients/{resolvedUserId}/extend
      const extendBody = new URLSearchParams();
      extendBody.append('_token', login.csrf);
      extendBody.append('option', validOption);
      extendBody.append('connections', maxCons);

      const extendResp = await withTimeout(fetch(`${cleanBase}/clients/${resolvedUserId}/extend`, {
        method: 'POST',
        headers: {
          'Cookie': login.cookies,
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': login.csrf,
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json',
          'Referer': `${cleanBase}/clients`,
        },
        body: extendBody.toString(),
      }), 15000);

      const extendText = await extendResp.text();
      let extendJson: any = null;
      try { extendJson = JSON.parse(extendText); } catch {}

      console.log(`📊 Extend → status: ${extendResp.status}, response: ${extendText.slice(0, 300)}`);

      if (extendResp.ok && extendJson?.success) {
        const authHeader = req.headers.get('authorization');
        let userId: string | null = null;
        if (authHeader) {
          const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
          const { data: { user } } = await anonClient.auth.getUser(authHeader.replace('Bearer ', ''));
          userId = user?.id || null;
        }

        if (userId) {
          await supabase.from('logs_painel').insert({
            user_id: userId,
            acao: `Renovação MundoGF: cliente ${username || resolvedUserId} → +${duration} ${durationIn} (Painel: ${panel.nome})`,
            tipo: 'renovacao',
          });
        }

        return new Response(JSON.stringify({ 
          success: true, 
          message: extendJson.message || 'Cliente renovado com sucesso',
          copyMessage: extendJson.copyMessage || null,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
        });
      }

      return new Response(JSON.stringify({ 
        success: false, 
        error: extendJson?.message || 'Falha ao renovar cliente',
        details: extendText.slice(0, 500),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    return new Response(JSON.stringify({ success: false, error: 'Action inválida. Use: get_credits, list_clients, renew_client' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
    });

  } catch (error) {
    console.error(`❌ Erro: ${(error as Error).message}`);
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
