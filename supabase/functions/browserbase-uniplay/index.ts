import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BROWSERBASE_API = "https://api.browserbase.com/v1";
const UNIPLAY_LOGIN_URL = "https://gestordefender.com/login";
const UNIPLAY_API_BASE = "https://gesapioffice.com";
const RECAPTCHA_SITEKEY = "6LfTwuwfAAAAAGfw3TatjhOOCP2jNuPqO4U2xske";

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then(v => { clearTimeout(t); resolve(v); }).catch(e => { clearTimeout(t); reject(e); });
  });
}

// ==================== 2Captcha ====================
async function solve2CaptchaV2(siteKey: string, pageUrl: string): Promise<string | null> {
  const apiKey = Deno.env.get("TWOCAPTCHA_API_KEY");
  if (!apiKey) { console.log("⚠️ TWOCAPTCHA_API_KEY não configurada"); return null; }
  try {
    console.log("🤖 2Captcha: Resolvendo reCAPTCHA v2...");
    const submitUrl = `https://2captcha.com/in.php?key=${apiKey}&method=userrecaptcha&googlekey=${siteKey}&pageurl=${encodeURIComponent(pageUrl)}&json=1`;
    const submitResp = await withTimeout(fetch(submitUrl), 15000);
    const submitJson = await submitResp.json();
    if (submitJson.status !== 1) return null;
    const taskId = submitJson.request;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const resultResp = await withTimeout(fetch(`https://2captcha.com/res.php?key=${apiKey}&action=get&id=${taskId}&json=1`), 10000);
      const resultJson = await resultResp.json();
      if (resultJson.status === 1) { console.log("✅ reCAPTCHA v2 resolvido!"); return resultJson.request; }
      if (resultJson.request !== "CAPCHA_NOT_READY") return null;
    }
    return null;
  } catch (e) { console.log(`❌ 2Captcha: ${(e as Error).message}`); return null; }
}

// ==================== Browserbase Session ====================
async function createBrowserbaseSession(): Promise<{ sessionId: string; connectUrl: string }> {
  const apiKey = Deno.env.get("BROWSERBASE_API_KEY")!;
  const projectId = Deno.env.get("BROWSERBASE_PROJECT_ID")!;

  // Try with proxies first, fallback to without
  for (const useProxies of [true, false]) {
    const bodyPayload: any = { projectId, browserSettings: { timeout: 120 } };
    if (useProxies) bodyPayload.proxies = true;

    const resp = await withTimeout(fetch(`${BROWSERBASE_API}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-BB-API-Key": apiKey },
      body: JSON.stringify(bodyPayload),
    }), 15000);

    if (resp.status === 402 && useProxies) {
      console.log("⚠️ Browserbase: Proxies não disponíveis no plano atual, tentando sem proxy...");
      await resp.text(); // consume body
      continue;
    }

    if (!resp.ok) {
      const text = await resp.text();
      if (!useProxies) throw new Error(`Browserbase create session failed (${resp.status}): ${text}`);
      console.log(`⚠️ Browserbase com proxy falhou (${resp.status}), tentando sem...`);
      continue;
    }

    const session = await resp.json();
    console.log(`🌐 Browserbase session criada: ${session.id} (proxy: ${useProxies})`);
    return { sessionId: session.id, connectUrl: session.connectUrl };
  }

  throw new Error("Browserbase: não foi possível criar sessão");
}

// ==================== CDP over WebSocket ====================
class CDPSession {
  private ws!: WebSocket;
  private id = 0;
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();
  private events: Array<{ method: string; params: any }> = [];
  private sessionId: string | null = null; // for Target-attached sessions

  async connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);
      const timeout = setTimeout(() => reject(new Error("CDP WebSocket timeout")), 30000);

      this.ws.onopen = () => { clearTimeout(timeout); console.log("✅ CDP conectado"); resolve(); };
      this.ws.onerror = () => { clearTimeout(timeout); reject(new Error("CDP WS error")); };
      this.ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(String(evt.data));
          if (msg.id !== undefined && this.pending.has(msg.id)) {
            const p = this.pending.get(msg.id)!;
            this.pending.delete(msg.id);
            if (msg.error) p.reject(new Error(msg.error.message));
            else p.resolve(msg.result);
          } else if (msg.method) {
            this.events.push({ method: msg.method, params: msg.params });
          }
        } catch {}
      };
    });
  }

  async send(method: string, params: any = {}): Promise<any> {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 30000);
      this.pending.set(id, {
        resolve: (v) => { clearTimeout(timeout); resolve(v); },
        reject: (e) => { clearTimeout(timeout); reject(e); },
      });
      const msg: any = { id, method, params };
      if (this.sessionId) msg.sessionId = this.sessionId;
      this.ws.send(JSON.stringify(msg));
    });
  }

  /** Attach to a page target so Page/Runtime/Network domains work */
  async attachToPage(): Promise<void> {
    // Discover targets
    const { targetInfos } = await this.send("Target.getTargets");
    console.log(`📋 CDP targets: ${(targetInfos || []).map((t: any) => `${t.type}:${t.url}`).join(', ')}`);

    let pageTarget = (targetInfos || []).find((t: any) => t.type === "page");

    if (!pageTarget) {
      // Create a new page target
      const { targetId } = await this.send("Target.createTarget", { url: "about:blank" });
      pageTarget = { targetId };
      console.log(`📄 Novo target criado: ${targetId}`);
    }

    // Attach to the page target with flatten=true for sessionId-based messaging
    const result = await this.send("Target.attachToTarget", { targetId: pageTarget.targetId, flatten: true });
    this.sessionId = result.sessionId;
    console.log(`🔗 Attached to page target (session: ${this.sessionId})`);
  }

  getEvents(methodFilter?: string) {
    return methodFilter ? this.events.filter(e => e.method === methodFilter) : this.events;
  }

  close() { try { this.ws.close(); } catch {} }
}

// ==================== Helper: Type text via CDP Input domain ====================
async function cdpTypeText(cdp: CDPSession, text: string): Promise<void> {
  for (const char of text) {
    await cdp.send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: char,
      text: char,
      unmodifiedText: char,
    });
    await cdp.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: char,
    });
    await new Promise(r => setTimeout(r, 30));
  }
}

// ==================== Automação de Login ====================
async function automateUniplayLogin(cdp: CDPSession, username: string, password: string): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    // Attach to a page target first (browser-level CDP)
    await cdp.attachToPage();

    // Now enable page-level CDP domains
    await cdp.send("Page.enable");
    await cdp.send("Network.enable");
    await cdp.send("Runtime.enable");

    // Navigate to login page
    console.log(`🌐 Navegando para ${UNIPLAY_LOGIN_URL}...`);
    await cdp.send("Page.navigate", { url: UNIPLAY_LOGIN_URL });
    await new Promise(r => setTimeout(r, 6000)); // Wait for page load

    // Log page state before filling
    const pageState = await cdp.send("Runtime.evaluate", {
      expression: `JSON.stringify({
        url: location.href,
        inputs: Array.from(document.querySelectorAll('input')).map(i => ({type: i.type, name: i.name, placeholder: i.placeholder, id: i.id})),
        buttons: Array.from(document.querySelectorAll('button')).map(b => ({type: b.type, text: b.textContent?.trim(), class: b.className})),
      })`,
      returnByValue: true,
    });
    console.log(`📋 Page state: ${pageState.result?.value}`);

    console.log("📝 Preenchendo formulário de login...");

    // Focus and type username using CDP Input domain (works with Angular/Vue/React)
    const focusedUser = await cdp.send("Runtime.evaluate", {
      expression: `
        const el = document.querySelector('input[name="username"], input[type="text"], input[placeholder*="usu"], input[placeholder*="user"], input[placeholder*="User"], #username, input[ng-model*="user"], input[formcontrolname*="user"]');
        if (el) { el.focus(); el.value = ''; el.dispatchEvent(new Event('focus', {bubbles:true})); }
        !!el;
      `,
      returnByValue: true,
    });
    console.log(`👤 Username field found: ${focusedUser.result?.value}`);
    await cdpTypeText(cdp, username);

    // Tab to password field or focus it directly
    await new Promise(r => setTimeout(r, 200));
    const focusedPass = await cdp.send("Runtime.evaluate", {
      expression: `
        const el = document.querySelector('input[name="password"], input[type="password"], #password, input[ng-model*="pass"], input[formcontrolname*="pass"]');
        if (el) { el.focus(); el.value = ''; el.dispatchEvent(new Event('focus', {bubbles:true})); }
        !!el;
      `,
      returnByValue: true,
    });
    console.log(`🔑 Password field found: ${focusedPass.result?.value}`);
    await cdpTypeText(cdp, password);

    await new Promise(r => setTimeout(r, 500));

    // Verify fields were filled
    const fieldValues = await cdp.send("Runtime.evaluate", {
      expression: `JSON.stringify({
        user: (document.querySelector('input[type="text"], input[name="username"]') || {}).value || '',
        pass: (document.querySelector('input[type="password"]') || {}).value ? '***filled***' : '',
      })`,
      returnByValue: true,
    });
    console.log(`📝 Field values: ${fieldValues.result?.value}`);

    // Solve reCAPTCHA
    const captchaToken = await solve2CaptchaV2(RECAPTCHA_SITEKEY, UNIPLAY_LOGIN_URL);
    if (captchaToken) {
      console.log("🔐 Injetando token reCAPTCHA...");
      await cdp.send("Runtime.evaluate", {
        expression: `
          // Set the response textarea
          const textarea = document.querySelector('#g-recaptcha-response, textarea[name="g-recaptcha-response"]');
          if (textarea) { textarea.value = ${JSON.stringify(captchaToken)}; textarea.style.display = 'block'; }
          
          // Try to find and call the reCAPTCHA callback
          let callbackCalled = false;
          try {
            if (typeof ___grecaptcha_cfg !== 'undefined') {
              const clients = ___grecaptcha_cfg.clients || {};
              for (const key of Object.keys(clients)) {
                const client = clients[key];
                // Traverse the client object to find callback functions
                const findCallback = (obj, depth) => {
                  if (!obj || depth > 4) return null;
                  if (typeof obj === 'function') return obj;
                  if (typeof obj === 'object') {
                    for (const k of Object.keys(obj)) {
                      if (k === 'callback' && typeof obj[k] === 'function') return obj[k];
                      const found = findCallback(obj[k], depth + 1);
                      if (found) return found;
                    }
                  }
                  return null;
                };
                const cb = findCallback(client, 0);
                if (cb) { cb(${JSON.stringify(captchaToken)}); callbackCalled = true; break; }
              }
            }
          } catch(e) { console.log('captcha callback error:', e); }
          callbackCalled;
        `,
        returnByValue: true,
      });
      await new Promise(r => setTimeout(r, 1000));
    }

    // Click login button
    console.log("🔘 Clicando botão de login...");
    const clickResult = await cdp.send("Runtime.evaluate", {
      expression: `
        const btn = document.querySelector('button[type="submit"], button.btn-primary, button.login-btn, .btn-login, input[type="submit"], button:not([type="button"])');
        if (btn) { 
          console.log('Clicking button:', btn.textContent?.trim());
          btn.click(); 
        }
        btn ? btn.textContent?.trim() : 'NOT FOUND';
      `,
      returnByValue: true,
    });
    console.log(`🔘 Button clicked: ${clickResult.result?.value}`);

    // Wait for navigation/response
    await new Promise(r => setTimeout(r, 10000));

    // First try to extract token from network responses (most reliable)
    console.log("🔍 Extraindo token de network responses...");
    const networkEvents = cdp.getEvents("Network.responseReceived");
    console.log(`📡 Network events: ${networkEvents.length} responses captured`);
    
    for (const evt of networkEvents) {
      const url = evt.params?.response?.url || "";
      if (url.includes("/api/login") || url.includes("/auth") || url.includes("/token") || url.includes("/oauth")) {
        console.log(`🔎 Checking network response: ${url} (status: ${evt.params?.response?.status})`);
        try {
          const bodyResult = await cdp.send("Network.getResponseBody", { requestId: evt.params.requestId });
          const bodyText = bodyResult.body || "";
          console.log(`📦 Response body preview: ${bodyText.substring(0, 200)}`);
          try {
            const body = JSON.parse(bodyText);
            const token = body.access_token || body.token || body.jwt || body.accessToken || body.data?.access_token || body.data?.token;
            if (token) {
              console.log("✅ Token encontrado via network response!");
              return { success: true, token };
            }
          } catch {}
        } catch (e) {
          console.log(`⚠️ Could not get response body: ${(e as Error).message}`);
        }
      }
    }

    // Then check localStorage/sessionStorage
    console.log("🔍 Extraindo token de storage...");
    const result = await cdp.send("Runtime.evaluate", {
      expression: `
        (function() {
          // Check localStorage for JWT-like tokens
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            const v = localStorage.getItem(k);
            if (v && (v.startsWith('eyJ') || k.toLowerCase().includes('token') || k.toLowerCase().includes('auth') || k.toLowerCase().includes('jwt'))) {
              return JSON.stringify({ source: 'localStorage', key: k, value: v });
            }
          }
          // Check sessionStorage
          for (let i = 0; i < sessionStorage.length; i++) {
            const k = sessionStorage.key(i);
            const v = sessionStorage.getItem(k);
            if (v && (v.startsWith('eyJ') || k.toLowerCase().includes('token') || k.toLowerCase().includes('auth'))) {
              return JSON.stringify({ source: 'sessionStorage', key: k, value: v });
            }
          }
          // Check cookies
          const cookies = document.cookie;
          // Report current state for debugging
          const allLSKeys = [];
          for (let i = 0; i < localStorage.length; i++) allLSKeys.push(localStorage.key(i));
          return JSON.stringify({ 
            source: 'none', 
            currentUrl: window.location.href, 
            hash: window.location.hash,
            localStorageKeys: allLSKeys,
            cookieCount: cookies.split(';').length,
            bodyText: document.body?.innerText?.substring(0, 300) || ''
          });
        })()
      `,
      returnByValue: true,
    });

    const tokenData = JSON.parse(result.result?.value || "{}");
    console.log(`📊 Token extraction: ${JSON.stringify(tokenData)}`);

    if (tokenData.source !== "none" && tokenData.value) {
      return { success: true, token: tokenData.value };
    }

    // Check if hash changed (SPA routing) - hash !== #/login means we navigated away
    const currentHash = tokenData.hash || "";
    const onLoginPage = currentHash === "" || currentHash === "#/login" || currentHash === "#/";
    
    if (!onLoginPage) {
      console.log(`✅ Hash changed to ${currentHash} - login succeeded (session-based)`);
      return { success: true, token: "" };
    }

    // Check page for error messages
    const pageText = tokenData.bodyText || "";
    console.log(`📄 Page text: ${pageText.substring(0, 200)}`);
    
    const errorCheck = await cdp.send("Runtime.evaluate", {
      expression: `
        const errorEl = document.querySelector('.error, .alert-danger, .toast-error, .swal2-popup, [class*="error"], [class*="alert"]');
        errorEl ? errorEl.textContent?.trim().substring(0, 200) : '';
      `,
      returnByValue: true,
    });

    const errorMsg = errorCheck.result?.value;
    return { success: false, error: errorMsg || "Login falhou - token não encontrado. Hash: " + currentHash };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ==================== Renovação via API com token ====================
async function renewWithToken(token: string, username: string, duration: number, durationIn: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const hdrs = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  };

  // First find the user
  console.log(`🔍 Buscando cliente "${username}"...`);
  try {
    const listResp = await withTimeout(fetch(`${UNIPLAY_API_BASE}/api/users-iptv`, { method: "GET", headers: hdrs }), 15000);
    const listJson = await listResp.json();
    const items = listJson.data || (Array.isArray(listJson) ? listJson : []);
    const match = items.find((c: any) => {
      const u = (c.username || c.user || c.login || c.name || "").toLowerCase();
      return u === username.toLowerCase();
    });

    if (!match) {
      return { success: false, error: `Usuário "${username}" não encontrado` };
    }

    const clientId = String(match.id || match.user_id || match.client_id);
    console.log(`✅ Cliente encontrado (ID: ${clientId}). Renovando...`);

    const extendEndpoints = [
      `/api/users-iptv/${clientId}/extend`,
      `/api/users-p2p/${clientId}/extend`,
      `/api/clients/${clientId}/extend`,
    ];

    for (const ep of extendEndpoints) {
      try {
        const resp = await withTimeout(fetch(`${UNIPLAY_API_BASE}${ep}`, {
          method: "POST",
          headers: hdrs,
          body: JSON.stringify({ duration, duration_in: durationIn }),
        }), 15000);
        const json = await resp.json();
        if (resp.ok && (json?.success || json?.status === "ok" || json?.message)) {
          return { success: true, message: json?.message || "Renovado com sucesso" };
        }
      } catch {}
    }
    return { success: false, error: "Endpoints de extensão não responderam" };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ==================== HANDLER ====================
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, panelId, username, duration, durationIn } = await req.json();

    const bbApiKey = Deno.env.get("BROWSERBASE_API_KEY");
    const bbProjectId = Deno.env.get("BROWSERBASE_PROJECT_ID");
    if (!bbApiKey || !bbProjectId) {
      return new Response(JSON.stringify({ success: false, error: "BROWSERBASE_API_KEY ou BROWSERBASE_PROJECT_ID não configurados" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: panel } = await supabase
      .from("paineis_integracao")
      .select("*")
      .eq("id", panelId)
      .eq("provedor", "uniplay")
      .single();

    if (!panel) {
      return new Response(JSON.stringify({ success: false, error: "Painel Uniplay não encontrado" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    console.log(`🚀 Browserbase Uniplay: action=${action}, painel="${panel.nome}"`);

    // Create Browserbase session
    const bbSession = await createBrowserbaseSession();
    const cdp = new CDPSession();

    try {
      await cdp.connect(bbSession.connectUrl);

      // Login via browser automation
      const loginResult = await automateUniplayLogin(cdp, panel.usuario, panel.senha);

      if (!loginResult.success) {
        return new Response(JSON.stringify({
          success: false, error: `Login falhou: ${loginResult.error}`,
          browserbaseSessionId: bbSession.sessionId,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
        });
      }

      console.log(`✅ Login Browserbase OK. Token: ${loginResult.token ? "sim" : "sessão"}`);

      // ============ TEST CONNECTION ============
      if (action === "test_connection") {
        return new Response(JSON.stringify({
          success: true,
          message: "Conexão via Browserbase bem-sucedida!",
          hasToken: !!loginResult.token,
          browserbaseSessionId: bbSession.sessionId,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
        });
      }

      // ============ RENEW ============
      if (action === "renew_by_username") {
        if (!username || !duration || !durationIn) {
          return new Response(JSON.stringify({ success: false, error: "username, duration e durationIn obrigatórios" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
          });
        }

        if (!loginResult.token) {
          return new Response(JSON.stringify({ success: false, error: "Login via browser não retornou token JWT. Renovação por API requer token." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
          });
        }

        const renewResult = await renewWithToken(loginResult.token, username, Number(duration), durationIn);

        if (renewResult.success) {
          // Log
          const authHeader = req.headers.get("authorization");
          if (authHeader) {
            const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
            const { data: { user } } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
            if (user?.id) {
              await supabase.from("logs_painel").insert({
                user_id: user.id,
                acao: `Renovação Uniplay (Browserbase): ${username} → +${duration} ${durationIn} (Painel: ${panel.nome})`,
                tipo: "renovacao",
              });
            }
          }
        }

        return new Response(JSON.stringify(renewResult), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
        });
      }

      // ============ LIST USERS ============
      if (action === "list_users") {
        if (!loginResult.token) {
          return new Response(JSON.stringify({ success: false, error: "Sem token JWT" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
          });
        }

        const hdrs = { Authorization: `Bearer ${loginResult.token}`, Accept: "application/json", "Content-Type": "application/json" };
        const resp = await withTimeout(fetch(`${UNIPLAY_API_BASE}/api/users-iptv`, { method: "GET", headers: hdrs }), 15000);
        const json = await resp.json();
        return new Response(JSON.stringify({ success: resp.ok, users: json?.data || json || [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
        });
      }

      return new Response(JSON.stringify({ success: false, error: "Action inválida. Use: test_connection, renew_by_username, list_users" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    } finally {
      cdp.close();
    }
  } catch (error) {
    console.error(`❌ Browserbase Uniplay erro: ${(error as Error).message}`);
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
