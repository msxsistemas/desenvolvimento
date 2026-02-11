import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UNIPLAY_API_BASE = 'https://gesapioffice.com';

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then((v) => { clearTimeout(t); resolve(v); })
     .catch((e) => { clearTimeout(t); reject(e); });
  });
}

/**
 * Faz uma requisição via VPS Relay brasileiro.
 * O relay recebe { url, method, headers, body } e encaminha a requisição.
 */
async function relayFetch(
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  const relayUrl = Deno.env.get('VPS_RELAY_URL');
  const relaySecret = Deno.env.get('VPS_RELAY_SECRET');

  if (!relayUrl || !relaySecret) {
    console.log('⚠️ VPS_RELAY_URL ou VPS_RELAY_SECRET não configurados, usando fetch direto');
    return fetch(url, init);
  }

  console.log(`🌐 Relay: ${init.method || 'GET'} ${url}`);

  const relayBody: Record<string, unknown> = {
    url,
    method: init.method || 'GET',
    headers: init.headers || {},
  };

  if (init.body) {
    relayBody.body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
  }

  const resp = await fetch(`${relayUrl}/proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-relay-secret': relaySecret,
    },
    body: JSON.stringify(relayBody),
  });

  return resp;
}

const API_HEADERS: Record<string, string> = {
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

const UNIPLAY_RECAPTCHA_SITEKEY = '6LfTwuwfAAAAAGfw3TatjhOOCP2jNuPqO4U2xske';

async function loginUniplay(username: string, password: string): Promise<LoginResult> {
  try {
    let captchaToken = '';
    const solved = await solve2CaptchaV2(UNIPLAY_RECAPTCHA_SITEKEY, 'https://gestordefender.com/login');
    if (solved) captchaToken = solved;

    const resp = await withTimeout(relayFetch(`${UNIPLAY_API_BASE}/api/login`, {
      method: 'POST',
      headers: API_HEADERS,
      body: JSON.stringify({ username, password, code: captchaToken }),
    }), 30000);

    const text = await resp.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch {}

    // O relay retorna { status, headers, body } — precisamos extrair
    if (json?.body) {
      // Resposta veio empacotada pelo relay
      const relayData = typeof json.body === 'string' ? JSON.parse(json.body) : json.body;
      const token = relayData?.access_token;
      const cryptPass = relayData?.crypt_pass || '';

      if (json.status < 400 && token) {
        console.log(`✅ Uniplay login OK via relay (token, crypt_pass: ${cryptPass ? 'sim' : 'não'})`);
        return { success: true, token, cryptPass };
      }
      return { success: false, token: '', cryptPass: '', error: relayData?.message || relayData?.error || JSON.stringify(relayData).slice(0, 200) };
    }

    // Resposta direta (fallback sem relay)
    const token = json?.access_token;
    const cryptPass = json?.crypt_pass || '';

    if (resp.ok && token) {
      console.log(`✅ Uniplay login OK (token, crypt_pass: ${cryptPass ? 'sim' : 'não'})`);
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

/**
 * Helper para parsear resposta do relay.
 * O relay retorna { status, headers, body } onde body pode ser string ou object.
 */
function parseRelayResponse(text: string): { status: number; data: any; raw: string } {
  let json: any = null;
  try { json = JSON.parse(text); } catch {}

  // Se a resposta veio empacotada pelo relay
  if (json && typeof json.status === 'number' && json.body !== undefined) {
    let data = json.body;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch {}
    }
    return { status: json.status, data, raw: text };
  }

  // Resposta direta (fallback)
  return { status: 200, data: json, raw: text };
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

    console.log(`🔗 Uniplay: Painel "${panel.nome}" → API: ${UNIPLAY_API_BASE} (via VPS Relay)`);
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
        const resp = await withTimeout(relayFetch(url, { method: 'GET', headers: hdrs }), 30000);
        const text = await resp.text();
        const { status, data } = parseRelayResponse(text);

        console.log(`📊 Uniplay users-iptv → status: ${status}, items: ${Array.isArray(data?.data) ? data.data.length : Array.isArray(data) ? data.length : '?'}`);

        return new Response(JSON.stringify({
          success: status < 400,
          users: data?.data || data || [],
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
        const resp = await withTimeout(relayFetch(`${UNIPLAY_API_BASE}/api/users-p2p`, {
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
        }), 30000);

        const text = await resp.text();
        const { status, data } = parseRelayResponse(text);
        console.log(`📊 Uniplay create test → status: ${status}, response: ${JSON.stringify(data).slice(0, 300)}`);

        if (status < 400 && data) {
          return new Response(JSON.stringify({ success: true, data }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
          });
        }

        return new Response(JSON.stringify({ success: false, error: data?.message || JSON.stringify(data).slice(0, 200) }), {
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
        const resp = await withTimeout(relayFetch(`${UNIPLAY_API_BASE}/api/reg-users?page=${page}&per_page=${perPage}`, {
          method: 'GET', headers: hdrs,
        }), 30000);
        const text = await resp.text();
        const { data } = parseRelayResponse(text);
        console.log(`📊 Uniplay reg-users → OK`);

        return new Response(JSON.stringify({ success: true, data }), {
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

      let clientId: string | null = null;
      const searchUrl = login.cryptPass
        ? `${UNIPLAY_API_BASE}/api/users-iptv?reg_password=${encodeURIComponent(login.cryptPass)}`
        : `${UNIPLAY_API_BASE}/api/users-iptv`;

      try {
        const resp = await withTimeout(relayFetch(searchUrl, { method: 'GET', headers: hdrs }), 30000);
        const text = await resp.text();
        const { status, data } = parseRelayResponse(text);

        if (status < 400 && data) {
          const items = data.data || (Array.isArray(data) ? data : []);
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

      console.log(`🔄 Uniplay: Renovando cliente ${clientId} → +${duration} ${durationIn}`);
      const extendEndpoints = [
        { url: `/api/users-iptv/${clientId}/extend`, method: 'POST' },
        { url: `/api/users-p2p/${clientId}/extend`, method: 'POST' },
        { url: `/api/clients/${clientId}/extend`, method: 'POST' },
        { url: `/api/users/${clientId}/extend`, method: 'POST' },
      ];

      for (const ep of extendEndpoints) {
        try {
          const resp = await withTimeout(relayFetch(`${UNIPLAY_API_BASE}${ep.url}`, {
            method: ep.method,
            headers: hdrs,
            body: JSON.stringify({ duration: Number(duration), duration_in: durationIn }),
          }), 30000);
          const text = await resp.text();
          const { status, data } = parseRelayResponse(text);

          console.log(`📊 Uniplay extend ${ep.url} → status: ${status}, response: ${JSON.stringify(data).slice(0, 300)}`);

          if (status < 400 && (data?.success || data?.status === 'ok' || data?.message)) {
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
              message: data?.message || 'Cliente renovado com sucesso no Uniplay',
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
