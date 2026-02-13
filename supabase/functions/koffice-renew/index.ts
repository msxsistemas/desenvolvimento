import { createClient } from "npm:@supabase/supabase-js@2";

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

function mergeSetCookies(existing: string, setCookieHeader: string | null): string {
  if (!setCookieHeader) return existing;
  const parts = setCookieHeader.split(/,\s*(?=[A-Za-z_-]+=)/).map(c => c.split(';')[0].trim());
  const existingParts = existing ? existing.split('; ').filter(Boolean) : [];
  const cookieMap = new Map<string, string>();
  for (const c of existingParts) { const n = c.split('=')[0]; if (n) cookieMap.set(n, c); }
  for (const c of parts) { const n = c.split('=')[0]; if (n) cookieMap.set(n, c); }
  return [...cookieMap.values()].join('; ');
}

// Shared: form login + get session cookies
async function formLogin(cleanBase: string, panelUser: string, panelPass: string): Promise<{ success: boolean; cookies: string; csrf: string; error?: string }> {
  const loginResp = await withTimeout(fetch(`${cleanBase}/login`, {
    method: 'GET',
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html' },
  }), 10000);
  const loginHtml = await loginResp.text();

  // Extract all form inputs to detect actual field names
  const inputMatches = [...loginHtml.matchAll(/<input[^>]*name=["']([^"']+)["'][^>]*/gi)];
  const formInputs = inputMatches.map(m => {
    const typeMatch = m[0].match(/type=["']([^"']+)["']/i);
    const valueMatch = m[0].match(/value=["']([^"']*?)["']/i);
    return { name: m[1], type: typeMatch?.[1] || 'text', value: valueMatch?.[1] || '' };
  });
  console.log(`📋 Login form inputs: ${JSON.stringify(formInputs)}`);

  // Also check form action
  const formActionMatch = loginHtml.match(/<form[^>]*action=["']([^"']*?)["']/i);
  const formAction = formActionMatch?.[1] || '/login';
  console.log(`📋 Form action: ${formAction}`);

  const csrfMatch = loginHtml.match(/name=["']csrf_token["']\s+value=["'](.*?)["']/);
  const laravelCsrf = loginHtml.match(/name=["']_token["']\s+value=["'](.*?)["']/);
  const metaCsrf = loginHtml.match(/<meta\s+name=["']csrf-token["']\s+content=["'](.*?)["']/);
  const csrfToken = (csrfMatch ? csrfMatch[1] : null) || (laravelCsrf ? laravelCsrf[1] : null) || (metaCsrf ? metaCsrf[1] : null) || '';

  let allCookies = mergeSetCookies('', loginResp.headers.get('set-cookie'));

  // Build form body dynamically
  const formBody = new URLSearchParams();
  
  // Add all hidden fields first (CSRF tokens, etc.)
  for (const input of formInputs) {
    if (input.type === 'hidden' && input.value) {
      formBody.append(input.name, input.value);
    }
  }
  
  // Find actual username/password field names
  const userField = formInputs.find(f => /user|email|login|uname/i.test(f.name) && f.type !== 'hidden');
  const passField = formInputs.find(f => /pass|pwd|senha/i.test(f.name));
  const userFieldName = userField?.name || 'username';
  const passFieldName = passField?.name || 'password';
  console.log(`🔑 Using fields: user="${userFieldName}", pass="${passFieldName}"`);
  
  formBody.append(userFieldName, panelUser);
  formBody.append(passFieldName, panelPass);

  // Resolve form action URL properly
  let postUrl = `${cleanBase}/login`;
  if (formAction && formAction !== '/login') {
    postUrl = formAction.startsWith('http') ? formAction : `${cleanBase}${formAction.startsWith('/') ? '' : '/'}${formAction}`;
  }
  console.log(`📤 POST URL: ${postUrl}`);

  const postHeaders: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Origin': cleanBase,
    'Referer': `${cleanBase}/login`,
    'X-Requested-With': 'XMLHttpRequest',
    'Cache-Control': 'no-cache',
  };
  if (allCookies) postHeaders['Cookie'] = allCookies;
  const xsrfMatch = allCookies.match(/XSRF-TOKEN=([^;,\s]+)/);
  if (xsrfMatch) postHeaders['X-XSRF-TOKEN'] = decodeURIComponent(xsrfMatch[1]);

  const postResp = await withTimeout(fetch(postUrl, {
    method: 'POST',
    headers: postHeaders,
    body: formBody.toString(),
    redirect: 'manual',
  }), 15000);

  // Log ALL response headers to understand the server behavior
  const allHeaders: Record<string, string> = {};
  postResp.headers.forEach((value, key) => { allHeaders[key] = value; });
  console.log(`📋 POST ALL headers: ${JSON.stringify(allHeaders)}`);
  
  // Try getSetCookie for multiple set-cookie headers
  let postSetCookieArr: string[] = [];
  try { postSetCookieArr = (postResp.headers as any).getSetCookie?.() || []; } catch {}
  console.log(`🍪 POST getSetCookie(): ${JSON.stringify(postSetCookieArr)}`);
  
  const postSetCookie = postSetCookieArr.length > 0 ? postSetCookieArr.join(', ') : postResp.headers.get('set-cookie');
  console.log(`🍪 GET cookies: ${allCookies}`);
  console.log(`🍪 POST set-cookie: ${postSetCookie}`);
  console.log(`📝 POST body sent: ${formBody.toString()}`);
  allCookies = mergeSetCookies(allCookies, postSetCookie);
  console.log(`🍪 Merged cookies: ${allCookies}`);
  const postBody = await postResp.text();
  console.log(`📄 POST response body (first 500): ${postBody.substring(0, 500)}`);
  const postLocation = postResp.headers.get('location') || '';
  console.log(`📊 Form login → status: ${postResp.status}, location: ${postLocation}`);

  // Follow redirect (may need multiple hops)
  if (postLocation) {
    let followUrl = postLocation.startsWith('http') ? postLocation : `${cleanBase}/${postLocation.replace(/^\.\//, '')}`;
    let hops = 0;
    while (hops < 5) {
      hops++;
      console.log(`🔗 Follow redirect #${hops}: ${followUrl}`);
      const followResp = await withTimeout(fetch(followUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html', 'Cookie': allCookies },
        redirect: 'manual',
      }), 10000);
      allCookies = mergeSetCookies(allCookies, followResp.headers.get('set-cookie'));
      const nextLocation = followResp.headers.get('location');
      console.log(`📊 Follow #${hops} → status: ${followResp.status}, location: ${nextLocation}, cookies: ${allCookies.substring(0, 100)}`);
      
      if (followResp.status >= 300 && followResp.status < 400 && nextLocation) {
        // Check if redirected back to login = failed
        if (nextLocation.includes('/login')) {
          await followResp.text();
          return { success: false, cookies: allCookies, csrf: csrfToken, error: 'Login falhou - redirecionado para login' };
        }
        followUrl = nextLocation.startsWith('http') ? nextLocation : `${cleanBase}/${nextLocation.replace(/^\.\//, '')}`;
        await followResp.text();
        continue;
      }
      
      const dashHtml = await followResp.text();
      console.log(`📄 Follow #${hops} body snippet: ${dashHtml.substring(0, 300)}`);
      
      // If we landed on dashboard (not login page), session is valid
      if (!dashHtml.includes('/login') && (dashHtml.includes('dashboard') || dashHtml.includes('Dashboard') || followResp.ok)) {
        const dashCsrf = dashHtml.match(/<meta\s+name=["']csrf-token["']\s+content=["'](.*?)["']/);
        return { success: true, cookies: allCookies, csrf: dashCsrf ? dashCsrf[1] : csrfToken };
      }
      
      // Landed on login page = failed
      if (dashHtml.includes('/login') || dashHtml.includes('try_login')) {
        return { success: false, cookies: allCookies, csrf: csrfToken, error: 'Login falhou - credenciais inválidas' };
      }
      break;
    }
  }

  // Verify session via API
  console.log(`🔍 Verifying session via API with cookies: ${allCookies.substring(0, 100)}`);
  const verifyResp = await withTimeout(fetch(`${cleanBase}/dashboard/api?get_info&month=0`, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
      'Cookie': allCookies,
      'Referer': `${cleanBase}/dashboard/`,
    },
  }), 10000);
  const verifyText = await verifyResp.text();
  console.log(`📊 Verify API → status: ${verifyResp.status}, snippet: ${verifyText.substring(0, 200)}`);
  let verifyJson: any = null;
  try { verifyJson = JSON.parse(verifyText); } catch {}

  if (verifyResp.ok && verifyJson && typeof verifyJson === 'object' && !verifyText.includes('/login')) {
    return { success: true, cookies: allCookies, csrf: csrfToken };
  }

  return { success: false, cookies: allCookies, csrf: csrfToken, error: 'Login falhou - sessão não validada' };
}

// Test connection - try multiple API key strategies, then form login
async function testConnection(baseUrl: string, panelUser: string, panelPass: string): Promise<{ success: boolean; clients_count?: string; active_clients_count?: string; error?: string }> {
  const cleanBase = baseUrl.replace(/\/$/, '');
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  
  // Strategy 1: Try Xtream/Panel API (stateless, no cookies needed)
  const apiPaths = ['/panel_api.php', '/api.php', '/player_api.php'];
  for (const path of apiPaths) {
    try {
      const apiUrl = `${cleanBase}${path}?username=${encodeURIComponent(panelUser)}&password=${encodeURIComponent(panelPass)}`;
      console.log(`🔍 Trying Xtream API: ${path}`);
      const resp = await withTimeout(fetch(apiUrl, {
        method: 'GET',
        headers: { 'User-Agent': ua, 'Accept': 'application/json' },
      }), 10000);
      const text = await resp.text();
      let json: any = null;
      try { json = JSON.parse(text); } catch {}
      console.log(`📊 Xtream ${path} → status: ${resp.status}, isJSON: ${!!json}, snippet: ${text.substring(0, 200)}`);
      
      if (resp.ok && json && typeof json === 'object') {
        if (json.user_info || json.server_info || json.result === true || json.success) {
          return {
            success: true,
            clients_count: json.clients_count || json.user_info?.max_connections || 'n/d',
            active_clients_count: json.user_info?.active_cons || json.active_clients_count || 'n/d',
          };
        }
        const keys = Object.keys(json);
        if (keys.length > 0 && !json.error && !json.message?.toLowerCase?.().includes('invalid')) {
          return { success: true, clients_count: String(keys.length), active_clients_count: 'n/d' };
        }
      }
    } catch (e) {
      console.log(`⚠️ Xtream ${path}: ${(e as Error).message}`);
    }
  }
  
  // Strategy 2: Try /api/login with multiple payload formats (this endpoint returned {"result":"failed"})
  const apiLoginPayloads = [
    { username: panelUser, api_key: panelPass },
    { username: panelUser, password: panelPass },
    { user: panelUser, api_key: panelPass },
    { user: panelUser, password: panelPass },
    { login: panelUser, api_key: panelPass },
    { email: panelUser, password: panelPass },
  ];
  
  for (const payload of apiLoginPayloads) {
    try {
      console.log(`🔑 Trying /api/login with payload keys: ${Object.keys(payload).join(', ')}`);
      const resp = await withTimeout(fetch(`${cleanBase}/api/login`, {
        method: 'POST',
        headers: {
          'User-Agent': ua,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify(payload),
      }), 10000);
      const text = await resp.text();
      let json: any = null;
      try { json = JSON.parse(text); } catch {}
      console.log(`📊 /api/login (${Object.keys(payload).join(',')}) → status: ${resp.status}, response: ${text.substring(0, 300)}`);
      
      if (json && json.result !== 'failed' && (json.token || json.access_token || json.success || json.result === 'success' || json.result === true || json.session_id || json.user)) {
        // Also try x-www-form-urlencoded format
        return {
          success: true,
          clients_count: json.clients_count || 'n/d',
          active_clients_count: json.active_clients_count || 'n/d',
        };
      }
    } catch (e) {
      console.log(`⚠️ /api/login: ${(e as Error).message}`);
    }
  }
  
  // Also try x-www-form-urlencoded format for /api/login
  for (const payload of apiLoginPayloads) {
    try {
      const formBody = new URLSearchParams();
      for (const [k, v] of Object.entries(payload)) formBody.append(k, v as string);
      console.log(`🔑 Trying /api/login (form) with: ${formBody.toString().substring(0, 100)}`);
      const resp = await withTimeout(fetch(`${cleanBase}/api/login`, {
        method: 'POST',
        headers: {
          'User-Agent': ua,
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: formBody.toString(),
      }), 10000);
      const text = await resp.text();
      let json: any = null;
      try { json = JSON.parse(text); } catch {}
      console.log(`📊 /api/login form (${Object.keys(payload).join(',')}) → status: ${resp.status}, response: ${text.substring(0, 300)}`);
      
      if (json && json.result !== 'failed' && (json.token || json.access_token || json.success || json.result === 'success' || json.result === true || json.session_id || json.user)) {
        return {
          success: true,
          clients_count: json.clients_count || 'n/d',
          active_clients_count: json.active_clients_count || 'n/d',
        };
      }
    } catch (e) {
      console.log(`⚠️ /api/login form: ${(e as Error).message}`);
    }
  }
  
  // Strategy 3: Try other API key endpoints
  const apiKeyEndpoints = [
    { url: `${cleanBase}/api/auth`, method: 'POST', body: JSON.stringify({ username: panelUser, api_key: panelPass }), ct: 'application/json' },
    { url: `${cleanBase}/dashboard/api?get_info&month=0`, method: 'GET', body: null, ct: null, useApiKey: true },
  ];
  for (const ep of apiKeyEndpoints) {
    try {
      const headers: Record<string, string> = {
        'User-Agent': ua,
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      };
      if (ep.ct) headers['Content-Type'] = ep.ct;
      // Try Basic Auth and API key header
      if (ep.useApiKey) {
        headers['Authorization'] = `Basic ${btoa(`${panelUser}:${panelPass}`)}`;
        headers['X-API-Key'] = panelPass;
      }
      
      console.log(`🔑 Trying API key auth: ${ep.method} ${ep.url}`);
      const resp = await withTimeout(fetch(ep.url, {
        method: ep.method,
        headers,
        body: ep.body || undefined,
      }), 10000);
      const text = await resp.text();
      let json: any = null;
      try { json = JSON.parse(text); } catch {}
      console.log(`📊 API key ${ep.url} → status: ${resp.status}, isJSON: ${!!json}, snippet: ${text.substring(0, 300)}`);
      
      if (resp.ok && json && typeof json === 'object') {
        // Check for valid auth response
        if (json.token || json.access_token || json.success || json.user_info || json.iptv || json.user || json.result === true) {
          return {
            success: true,
            clients_count: json.iptv?.clients_count || json.clients_count || 'n/d',
            active_clients_count: json.iptv?.active_clients_count || json.active_clients_count || 'n/d',
          };
        }
      }
    } catch (e) {
      console.log(`⚠️ API key endpoint: ${(e as Error).message}`);
    }
  }
  
  // Strategy 3: Try form-based login with API key as password (some panels accept it)
  console.log(`🔄 API key endpoints not available, trying form login with API key as password...`);
  const loginResult = await formLogin(cleanBase, panelUser, panelPass);

  if (!loginResult.success) {
    return { success: false, error: `Usuário ou API key inválidos. Verifique suas credenciais e tente novamente.` };
  }

  // Try to get dashboard info with session
  const infoResp = await withTimeout(fetch(`${cleanBase}/dashboard/api?get_info&month=0`, {
    method: 'GET',
    headers: {
      'User-Agent': ua,
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
      'Cookie': loginResult.cookies,
      'Referer': `${cleanBase}/dashboard/`,
    },
  }), 10000);

  const infoText = await infoResp.text();
  let infoJson: any = null;
  try { infoJson = JSON.parse(infoText); } catch {}

  if (infoResp.ok && infoJson?.iptv) {
    return {
      success: true,
      clients_count: infoJson.iptv.clients_count,
      active_clients_count: infoJson.iptv.active_clients_count,
    };
  }

  if (infoText.includes('/login')) {
    return { success: false, error: 'Usuário ou API key inválidos. Verifique suas credenciais e tente novamente.' };
  }

  return { success: false, error: 'Não foi possível verificar a sessão no painel.' };
}

// KOffice API (Xtream-style) renewal
async function xtreamRenew(baseUrl: string, panelUser: string, panelPass: string, clientUsername: string, duration: number, durationIn: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const cleanBase = baseUrl.replace(/\/$/, '');
  const apiPaths = ['/panel_api.php', '/api.php'];

  for (const path of apiPaths) {
    const searchUrl = `${cleanBase}${path}?username=${encodeURIComponent(panelUser)}&password=${encodeURIComponent(panelPass)}&action=user&sub=list`;
    try {
      console.log(`🔍 KOffice Xtream: Buscando clientes via ${path}`);
      const searchResp = await withTimeout(fetch(searchUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      }), 15000);
      const searchText = await searchResp.text();
      let searchJson: any = null;
      try { searchJson = JSON.parse(searchText); } catch {}

      if (!searchResp.ok || !searchJson) continue;

      let clientId: string | null = null;
      if (typeof searchJson === 'object' && !Array.isArray(searchJson)) {
        for (const [id, user] of Object.entries(searchJson as Record<string, any>)) {
          if ((user.username || '').toLowerCase() === clientUsername.toLowerCase()) {
            clientId = id;
            break;
          }
        }
      } else if (Array.isArray(searchJson)) {
        const match = searchJson.find((u: any) => (u.username || '').toLowerCase() === clientUsername.toLowerCase());
        if (match) clientId = String(match.id || match.user_id);
      }

      if (!clientId) {
        console.log(`⚠️ KOffice Xtream: Usuário "${clientUsername}" não encontrado via ${path}`);
        continue;
      }

      console.log(`✅ KOffice: Cliente encontrado (ID: ${clientId})`);

      const extendUrl = `${cleanBase}${path}?username=${encodeURIComponent(panelUser)}&password=${encodeURIComponent(panelPass)}&action=user&sub=extend&user_id=${clientId}&duration=${duration}&duration_in=${durationIn}`;
      const extendResp = await withTimeout(fetch(extendUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      }), 15000);
      const extendText = await extendResp.text();
      let extendJson: any = null;
      try { extendJson = JSON.parse(extendText); } catch {}

      if (extendResp.ok && (extendJson?.result === true || extendJson?.success || extendJson?.result === 1)) {
        return { success: true, message: 'Cliente renovado com sucesso via Xtream API' };
      }

      const altExtendUrl = `${cleanBase}${path}?username=${encodeURIComponent(panelUser)}&password=${encodeURIComponent(panelPass)}&action=edit_user&user_id=${clientId}&duration=${duration}&duration_in=${durationIn}`;
      const altResp = await withTimeout(fetch(altExtendUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      }), 15000);
      const altText = await altResp.text();
      let altJson: any = null;
      try { altJson = JSON.parse(altText); } catch {}

      if (altResp.ok && (altJson?.result === true || altJson?.success || altJson?.result === 1)) {
        return { success: true, message: 'Cliente renovado com sucesso via Xtream API' };
      }
    } catch (e) {
      console.log(`⚠️ KOffice Xtream ${path}: ${(e as Error).message}`);
    }
  }

  return { success: false, error: 'Não foi possível renovar via Xtream API' };
}

// KOffice V2 (form-based) renewal
async function kofficeV2Renew(baseUrl: string, panelUser: string, panelPass: string, clientUsername: string, duration: number, durationIn: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const cleanBase = baseUrl.replace(/\/$/, '');
  const loginResult = await formLogin(cleanBase, panelUser, panelPass);

  if (!loginResult.success) {
    return { success: false, error: `Login KOffice V2 falhou: ${loginResult.error}` };
  }

  console.log(`✅ KOffice V2: Login OK, buscando cliente "${clientUsername}"`);

  // Search for client
  const searchEndpoints = [
    { url: `${cleanBase}/clients/api/?get_clients`, method: 'POST', isDataTable: true },
    { url: `${cleanBase}/dashboard/api/?get_almost_expired_clients`, method: 'POST', isDataTable: true },
  ];

  let clientId: string | null = null;
  for (const ep of searchEndpoints) {
    try {
      const headers: Record<string, string> = {
        'Cookie': loginResult.cookies,
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
        'Referer': `${cleanBase}/`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-CSRF-TOKEN': loginResult.csrf,
      };

      const dtBody = new URLSearchParams();
      dtBody.append('draw', '1');
      dtBody.append('start', '0');
      dtBody.append('length', '1000');
      dtBody.append('search[value]', clientUsername);

      const resp = await withTimeout(fetch(ep.url, { method: 'POST', headers, body: dtBody.toString() }), 15000);
      const text = await resp.text();
      let json: any = null;
      try { json = JSON.parse(text); } catch {}

      if (!resp.ok || !json) continue;

      if (json.data && Array.isArray(json.data)) {
        for (const row of json.data) {
          // row[1] contains username (possibly with HTML)
          const usernameCell = String(row[1] || '').replace(/<[^>]*>/g, '').trim();
          if (usernameCell.toLowerCase() === clientUsername.toLowerCase()) {
            clientId = String(row[0]); // row[0] is the client ID
            console.log(`✅ KOffice V2: Cliente encontrado (ID: ${clientId})`);
            break;
          }
        }
        if (clientId) break;
      }
    } catch (e) {
      console.log(`⚠️ KOffice V2 search: ${(e as Error).message}`);
    }
  }

  if (!clientId) {
    return { success: false, error: `Usuário "${clientUsername}" não encontrado no painel KOffice` };
  }

  // Extend client
  const extendEndpoints = [
    `${cleanBase}/clients/${clientId}/extend`,
    `${cleanBase}/clients/api/?extend_client`,
  ];

  for (const url of extendEndpoints) {
    try {
      const extendBody = new URLSearchParams();
      extendBody.append('_token', loginResult.csrf);
      extendBody.append('duration', String(duration));
      extendBody.append('duration_in', durationIn);
      extendBody.append('user_id', clientId);

      const resp = await withTimeout(fetch(url, {
        method: 'POST',
        headers: {
          'Cookie': loginResult.cookies,
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': loginResult.csrf,
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json',
          'Referer': `${cleanBase}/clients`,
        },
        body: extendBody.toString(),
      }), 15000);

      const text = await resp.text();
      let json: any = null;
      try { json = JSON.parse(text); } catch {}

      console.log(`📊 KOffice V2 extend ${url} → status: ${resp.status}, response: ${text.slice(0, 300)}`);

      if (resp.ok && (json?.success || json?.result === true || json?.message)) {
        return { success: true, message: json?.message || 'Cliente renovado com sucesso no KOffice V2' };
      }
    } catch (e) {
      console.log(`⚠️ KOffice V2 extend: ${(e as Error).message}`);
    }
  }

  return { success: false, error: 'Não foi possível renovar no KOffice V2.' };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, panelId, username, duration, durationIn, url: directUrl, panelUser: directUser, panelPass: directPass } = body;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test connection action
    if (action === 'test_connection') {
      let testUrl: string, testUser: string, testPass: string;

      if (panelId) {
        const { data: panel } = await supabase
          .from('paineis_integracao')
          .select('*')
          .eq('id', panelId)
          .in('provedor', ['koffice-api', 'koffice-v2'])
          .single();
        if (!panel) {
          return new Response(JSON.stringify({ success: false, error: 'Painel não encontrado' }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
          });
        }
        testUrl = panel.url;
        testUser = panel.usuario;
        testPass = panel.senha;
      } else {
        testUrl = directUrl;
        testUser = directUser;
        testPass = directPass;
      }

      if (!testUrl || !testUser || !testPass) {
        return new Response(JSON.stringify({ success: false, error: 'URL, usuário e senha são obrigatórios' }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
        });
      }

      console.log(`🧪 KOffice test_connection: ${testUrl} (user: ${testUser})`);
      const result = await testConnection(testUrl, testUser, testPass);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    // Renew action
    const { data: panel } = await supabase
      .from('paineis_integracao')
      .select('*')
      .eq('id', panelId)
      .in('provedor', ['koffice-api', 'koffice-v2'])
      .single();

    if (!panel) {
      return new Response(JSON.stringify({ success: false, error: 'Painel KOffice não encontrado' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    if (action === 'renew_by_username') {
      if (!username || !duration || !durationIn) {
        return new Response(JSON.stringify({ success: false, error: 'username, duration e durationIn são obrigatórios' }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
        });
      }

      console.log(`🔄 KOffice (${panel.provedor}): Renovando "${username}" no painel ${panel.nome}`);

      let result;
      if (panel.provedor === 'koffice-api') {
        result = await xtreamRenew(panel.url, panel.usuario, panel.senha, username, Number(duration), durationIn);
      } else {
        result = await kofficeV2Renew(panel.url, panel.usuario, panel.senha, username, Number(duration), durationIn);
      }

      if (result.success) {
        const authHeader = req.headers.get('authorization');
        if (authHeader) {
          const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
          const { data: { user } } = await anonClient.auth.getUser(authHeader.replace('Bearer ', ''));
          if (user?.id) {
            await supabase.from('logs_painel').insert({
              user_id: user.id,
              acao: `Renovação KOffice: cliente ${username} → +${duration} ${durationIn} (Painel: ${panel.nome})`,
              tipo: 'renovacao',
            });
          }
        }
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    return new Response(JSON.stringify({ success: false, error: 'Action inválida. Use: test_connection, renew_by_username' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
    });
  } catch (error) {
    console.error(`❌ Erro: ${(error as Error).message}`);
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
