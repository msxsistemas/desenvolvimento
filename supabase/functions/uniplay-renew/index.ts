import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UNIPLAY_API_BASE = 'https://gesapioffice.com';

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then((v) => { clearTimeout(t); resolve(v); })
     .catch((e) => { clearTimeout(t); reject(e); });
  });
}

/** Normaliza o proxy URL para formato http://user:pass@host:port */
function normalizeProxyUrl(raw: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//.test(trimmed)) return trimmed;
  const parts = trimmed.split(':');
  if (parts.length === 4) {
    const [host, port, user, pass] = parts;
    return `http://${user}:${pass}@${host}:${port}`;
  }
  if (trimmed.includes('@')) return `http://${trimmed}`;
  return `http://${trimmed}`;
}

/** Cria um fetch que roteia pela proxy brasileira se configurada */
function createProxiedFetch(): typeof fetch {
  const proxyUrl = Deno.env.get('BRAZIL_PROXY_URL');
  if (!proxyUrl) {
    console.log('⚠️ BRAZIL_PROXY_URL não configurada, usando fetch direto');
    return fetch;
  }
  const normalizedUrl = normalizeProxyUrl(proxyUrl);
  console.log(`🌐 Proxy BR: ${normalizedUrl.replace(/\/\/.*@/, '//***@')}`);

  if (typeof (Deno as any).createHttpClient === 'function') {
    try {
      const client = (Deno as any).createHttpClient({ proxy: { url: normalizedUrl } });
      if (client) {
        console.log('✅ Proxy: Deno.createHttpClient criado');
        return (input: string | URL | Request, init?: RequestInit) => {
          return fetch(input, { ...init, client } as any);
        };
      }
    } catch (e) {
      console.log(`⚠️ Proxy createHttpClient falhou: ${(e as Error).message}`);
    }
  } else {
    console.log('⚠️ Deno.createHttpClient não disponível');
  }

  try {
    Deno.env.set('HTTP_PROXY', normalizedUrl);
    Deno.env.set('HTTPS_PROXY', normalizedUrl);
    console.log('🔄 Proxy: Env vars HTTP_PROXY/HTTPS_PROXY definidas');
  } catch (e) {
    console.log(`⚠️ Proxy env vars falhou: ${(e as Error).message}`);
  }

  return fetch;
}

const proxiedFetch = createProxiedFetch();

const API_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
  'Origin': 'https://gestordefender.com',
  'Referer': 'https://gestordefender.com/',
};

interface LoginResult {
  success: boolean;
  token: string;
  cryptPass: string;
  error?: string;
}

/**
 * Resolve reCAPTCHA v2 usando 2Captcha API
 */
async function solve2CaptchaV2(siteKey: string, pageUrl: string): Promise<string | null> {
  const apiKey = Deno.env.get('TWOCAPTCHA_API_KEY');
  if (!apiKey) {
    console.log('⚠️ TWOCAPTCHA_API_KEY não configurada');
    return null;
  }
  try {
    console.log(`🤖 2Captcha: Resolvendo reCAPTCHA v2...`);
    const submitUrl = `https://2captcha.com/in.php?key=${apiKey}&method=userrecaptcha&googlekey=${siteKey}&pageurl=${encodeURIComponent(pageUrl)}&json=1`;
    const submitResp = await withTimeout(fetch(submitUrl), 15000);
    const submitJson = await submitResp.json();
    if (submitJson.status !== 1) return null;
    const taskId = submitJson.request;
    for (let i = 0; i < 24; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const resultResp = await withTimeout(fetch(`https://2captcha.com/res.php?key=${apiKey}&action=get&id=${taskId}&json=1`), 10000);
      const resultJson = await resultResp.json();
      if (resultJson.status === 1) { console.log(`✅ reCAPTCHA v2 resolvido!`); return resultJson.request; }
      if (resultJson.request !== 'CAPCHA_NOT_READY') return null;
    }
    return null;
  } catch (e) { console.log(`❌ 2Captcha: ${(e as Error).message}`); return null; }
}

/**
 * Extrai ou usa siteKey conhecida do reCAPTCHA v2 do Uniplay
 */
const UNIPLAY_RECAPTCHA_SITEKEY = '6LfTwuwfAAAAAGfw3TatjhOOCP2jNuPqO4U2xske';

async function loginUniplay(username: string, password: string): Promise<LoginResult> {
  try {
    // Resolver reCAPTCHA v2 antes do login
    let captchaToken = '';
    const solved = await solve2CaptchaV2(UNIPLAY_RECAPTCHA_SITEKEY, 'https://gestordefender.com/login');
    if (solved) captchaToken = solved;

    const resp = await withTimeout(proxiedFetch(`${UNIPLAY_API_BASE}/api/login`, {
      method: 'POST',
      headers: API_HEADERS,
      body: JSON.stringify({ username, password, code: captchaToken }),
    }), 15000);

    const text = await resp.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch {}

    const token = json?.access_token;
    const cryptPass = json?.crypt_pass || '';

    if (resp.ok && token) {
      console.log(`✅ Uniplay login OK (token expires_in: ${json?.expires_in}s, crypt_pass: ${cryptPass ? 'sim' : 'não'})`);
      return { success: true, token, cryptPass };
    }

    return { success: false, token: '', cryptPass: '', error: json?.message || json?.error || text.slice(0, 200) };
  } catch (e) {
    return { success: false, token: '', cryptPass: '', error: (e as Error).message };
  }
}

function authHeaders(token: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': API_HEADERS['User-Agent'],
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, panelId, username, duration, durationIn } = body;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: panel } = await supabase
      .from('paineis_integracao')
      .select('*')
      .eq('id', panelId)
      .eq('provedor', 'uniplay')
      .single();

    if (!panel) {
      return new Response(JSON.stringify({ success: false, error: 'Painel Uniplay não encontrado' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    console.log(`🔗 Uniplay: Painel "${panel.nome}" → API: ${UNIPLAY_API_BASE}`);
    const login = await loginUniplay(panel.usuario, panel.senha);
    if (!login.success) {
      return new Response(JSON.stringify({ success: false, error: `Falha no login: ${login.error}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    const hdrs = authHeaders(login.token);

    // ==================== LIST USERS ====================
    if (action === 'list_users') {
      console.log(`📋 Uniplay: Listando usuários IPTV...`);
      try {
        const url = login.cryptPass
          ? `${UNIPLAY_API_BASE}/api/users-iptv?reg_password=${encodeURIComponent(login.cryptPass)}`
          : `${UNIPLAY_API_BASE}/api/users-iptv`;
        const resp = await withTimeout(proxiedFetch(url, { method: 'GET', headers: hdrs }), 15000);
        const text = await resp.text();
        let json: any = null;
        try { json = JSON.parse(text); } catch {}

        console.log(`📊 Uniplay users-iptv → status: ${resp.status}, items: ${Array.isArray(json?.data) ? json.data.length : Array.isArray(json) ? json.length : '?'}`);

        return new Response(JSON.stringify({
          success: resp.ok,
          users: json?.data || json || [],
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
        });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
        });
      }
    }

    // ==================== CREATE TEST P2P ====================
    if (action === 'create_test') {
      const { productId, clientName, note, testHours } = body;
      if (!productId || !clientName) {
        return new Response(JSON.stringify({ success: false, error: 'productId e clientName são obrigatórios' }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
        });
      }

      console.log(`🧪 Uniplay: Criando teste P2P para "${clientName}" (produto: ${productId}, horas: ${testHours || 6})`);
      try {
        const resp = await withTimeout(proxiedFetch(`${UNIPLAY_API_BASE}/api/users-p2p`, {
          method: 'POST',
          headers: hdrs,
          body: JSON.stringify({
            isOficial: false,
            productid: productId,
            credits: 1,
            name: clientName,
            nota: note || '',
            test_hours: testHours || 6,
          }),
        }), 15000);

        const text = await resp.text();
        let json: any = null;
        try { json = JSON.parse(text); } catch {}
        console.log(`📊 Uniplay create test → status: ${resp.status}, response: ${text.slice(0, 300)}`);

        if (resp.ok && json) {
          return new Response(JSON.stringify({ success: true, data: json }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
          });
        }

        return new Response(JSON.stringify({ success: false, error: json?.message || text.slice(0, 200) }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
        });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
        });
      }
    }

    // ==================== LIST PANEL USERS ====================
    if (action === 'list_panel_users') {
      const page = body.page || 1;
      const perPage = body.perPage || 50;
      console.log(`📋 Uniplay: Listando usuários do painel (page ${page})...`);
      try {
        const resp = await withTimeout(proxiedFetch(`${UNIPLAY_API_BASE}/api/reg-users?page=${page}&per_page=${perPage}`, {
          method: 'GET', headers: hdrs,
        }), 15000);
        const text = await resp.text();
        let json: any = null;
        try { json = JSON.parse(text); } catch {}
        console.log(`📊 Uniplay reg-users → status: ${resp.status}`);

        return new Response(JSON.stringify({ success: resp.ok, data: json }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
        });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
        });
      }
    }

    // ==================== RENEW BY USERNAME ====================
    if (action === 'renew_by_username') {
      if (!username || !duration || !durationIn) {
        return new Response(JSON.stringify({ success: false, error: 'username, duration e durationIn são obrigatórios' }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
        });
      }

      console.log(`🔄 Uniplay: Buscando cliente "${username}" para renovação...`);

      // Search user in IPTV users list
      let clientId: string | null = null;
      const searchUrl = login.cryptPass
        ? `${UNIPLAY_API_BASE}/api/users-iptv?reg_password=${encodeURIComponent(login.cryptPass)}`
        : `${UNIPLAY_API_BASE}/api/users-iptv`;

      try {
        const resp = await withTimeout(proxiedFetch(searchUrl, { method: 'GET', headers: hdrs }), 15000);
        const text = await resp.text();
        let json: any = null;
        try { json = JSON.parse(text); } catch {}

        if (resp.ok && json) {
          const items = json.data || (Array.isArray(json) ? json : []);
          const match = items.find((c: any) => {
            const u = (c.username || c.user || c.login || c.name || '').toLowerCase();
            return u === username.toLowerCase();
          });
          if (match) {
            clientId = String(match.id || match.user_id || match.client_id);
            console.log(`✅ Uniplay: Cliente encontrado (ID: ${clientId})`);
          }
        }
      } catch (e) {
        console.log(`⚠️ Uniplay search users-iptv: ${(e as Error).message}`);
      }

      if (!clientId) {
        return new Response(JSON.stringify({ success: false, error: `Usuário "${username}" não encontrado no painel Uniplay` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
        });
      }

      // Try extend endpoints
      console.log(`🔄 Uniplay: Renovando cliente ${clientId} → +${duration} ${durationIn}`);
      const extendEndpoints = [
        { url: `/api/users-iptv/${clientId}/extend`, method: 'POST' },
        { url: `/api/users-p2p/${clientId}/extend`, method: 'POST' },
        { url: `/api/clients/${clientId}/extend`, method: 'POST' },
        { url: `/api/users/${clientId}/extend`, method: 'POST' },
      ];

      for (const ep of extendEndpoints) {
        try {
          const resp = await withTimeout(proxiedFetch(`${UNIPLAY_API_BASE}${ep.url}`, {
            method: ep.method,
            headers: hdrs,
            body: JSON.stringify({ duration: Number(duration), duration_in: durationIn }),
          }), 15000);
          const text = await resp.text();
          let json: any = null;
          try { json = JSON.parse(text); } catch {}

          console.log(`📊 Uniplay extend ${ep.url} → status: ${resp.status}, response: ${text.slice(0, 300)}`);

          if (resp.ok && (json?.success || json?.status === 'ok' || json?.message)) {
            // Log renewal
            const authHeader = req.headers.get('authorization');
            if (authHeader) {
              const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
              const { data: { user } } = await anonClient.auth.getUser(authHeader.replace('Bearer ', ''));
              if (user?.id) {
                await supabase.from('logs_painel').insert({
                  user_id: user.id,
                  acao: `Renovação Uniplay: cliente ${username} → +${duration} ${durationIn} (Painel: ${panel.nome})`,
                  tipo: 'renovacao',
                });
              }
            }

            return new Response(JSON.stringify({
              success: true,
              message: json?.message || 'Cliente renovado com sucesso no Uniplay',
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
            });
          }
        } catch (e) {
          console.log(`⚠️ Uniplay extend ${ep.url}: ${(e as Error).message}`);
        }
      }

      return new Response(JSON.stringify({
        success: false,
        error: 'Não foi possível renovar no painel Uniplay. Endpoints de extensão não responderam.',
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Action inválida. Use: renew_by_username, list_users, create_test, list_panel_users',
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
    });
  } catch (error) {
    console.error(`❌ Erro: ${(error as Error).message}`);
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
