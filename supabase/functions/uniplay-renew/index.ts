import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mapeamento de URLs frontend → API
const URL_MAP: Record<string, string> = {
  'gestordefender.com': 'gesapioffice.com',
  'www.gestordefender.com': 'gesapioffice.com',
};

function resolveApiUrl(inputUrl: string): string {
  try {
    const url = new URL(inputUrl.replace(/\/$/, ''));
    const host = url.hostname.toLowerCase();
    const apiHost = URL_MAP[host];
    if (apiHost) return `${url.protocol}//${apiHost}`;
    return url.origin;
  } catch {
    return inputUrl.replace(/\/$/, '');
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then((v) => { clearTimeout(t); resolve(v); })
     .catch((e) => { clearTimeout(t); reject(e); });
  });
}

async function solveRecaptchaV2(siteKey: string, pageUrl: string): Promise<string | null> {
  const apiKey = Deno.env.get('TWOCAPTCHA_API_KEY');
  if (!apiKey) return null;
  try {
    const submitUrl = `https://2captcha.com/in.php?key=${apiKey}&method=userrecaptcha&googlekey=${siteKey}&pageurl=${encodeURIComponent(pageUrl)}&json=1`;
    const submitResp = await withTimeout(fetch(submitUrl), 15000);
    const submitJson = await submitResp.json();
    if (submitJson.status !== 1) return null;
    const taskId = submitJson.request;
    for (let i = 0; i < 24; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const resultResp = await withTimeout(fetch(`https://2captcha.com/res.php?key=${apiKey}&action=get&id=${taskId}&json=1`), 10000);
      const resultJson = await resultResp.json();
      if (resultJson.status === 1) return resultJson.request;
      if (resultJson.request !== 'CAPCHA_NOT_READY') return null;
    }
    return null;
  } catch { return null; }
}

async function extractSiteKey(frontendUrl: string): Promise<string | null> {
  try {
    const resp = await withTimeout(fetch(`${frontendUrl}/login`, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html' },
    }), 10000);
    const html = await resp.text();
    const match = html.match(/data-sitekey=["']([0-9A-Za-z_-]{20,})["']/i)
      || html.match(/sitekey['":\s]+['"]([0-9A-Za-z_-]{20,})['"]/i);
    return match ? match[1] : null;
  } catch { return null; }
}

async function loginUniplay(baseUrl: string, username: string, password: string, frontendUrl?: string): Promise<{ success: boolean; token: string; error?: string }> {
  const cleanBase = baseUrl.replace(/\/$/, '');

  try {
    // Try to solve reCAPTCHA v2 if frontend URL available
    let recaptchaToken: string | null = null;
    if (frontendUrl) {
      const siteKey = await extractSiteKey(frontendUrl);
      if (siteKey) {
        console.log(`🔑 reCAPTCHA sitekey found: ${siteKey.slice(0, 15)}...`);
        recaptchaToken = await solveRecaptchaV2(siteKey, `${frontendUrl}/login`);
        console.log(`🤖 reCAPTCHA solved: ${!!recaptchaToken}`);
      }
    }

    const payload: Record<string, string> = { username, password };
    if (recaptchaToken) payload['g-recaptcha-response'] = recaptchaToken;

    const resp = await withTimeout(fetch(`${cleanBase}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: JSON.stringify(payload),
    }), 15000);

    const text = await resp.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch {}

    const token = json?.access_token || json?.token || json?.jwt;
    if (resp.ok && token) {
      console.log(`✅ Uniplay login OK`);
      return { success: true, token };
    }

    return { success: false, token: '', error: json?.message || json?.error || `Login falhou (${resp.status})` };
  } catch (e) {
    return { success: false, token: '', error: (e as Error).message };
  }
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

    const cleanBase = resolveApiUrl(panel.url);
    const frontendUrl = panel.url.replace(/\/$/, '');
    console.log(`🔗 Uniplay: URL original: ${panel.url} → API: ${cleanBase}`);
    const login = await loginUniplay(cleanBase, panel.usuario, panel.senha, frontendUrl);
    if (!login.success) {
      return new Response(JSON.stringify({ success: false, error: login.error }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    const authHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${login.token}`,
    };

    if (action === 'renew_by_username') {
      if (!username || !duration || !durationIn) {
        return new Response(JSON.stringify({ success: false, error: 'username, duration e durationIn são obrigatórios' }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
        });
      }

      console.log(`🔄 Uniplay: Buscando cliente "${username}" no painel ${panel.nome}`);

      // Search for user
      const searchEndpoints = [
        `/api/clients?search=${encodeURIComponent(username)}`,
        `/api/users?search=${encodeURIComponent(username)}`,
        `/api/lines?search=${encodeURIComponent(username)}`,
        `/api/client?search=${encodeURIComponent(username)}`,
        `/api/dash-reseller?search=${encodeURIComponent(username)}`,
      ];

      let clientId: string | null = null;
      for (const ep of searchEndpoints) {
        try {
          const resp = await withTimeout(fetch(`${cleanBase}${ep}`, {
            method: 'GET',
            headers: authHeaders,
          }), 15000);
          const text = await resp.text();
          let json: any = null;
          try { json = JSON.parse(text); } catch {}

          if (resp.ok && json) {
            const items = json.data || json.clients || json.users || json.lines || (Array.isArray(json) ? json : null);
            if (Array.isArray(items)) {
              const match = items.find((c: any) => {
                const u = (c.username || c.user || c.login || '').toLowerCase();
                return u === username.toLowerCase();
              });
              if (match) {
                clientId = String(match.id || match.user_id || match.client_id);
                console.log(`✅ Uniplay: Cliente encontrado (ID: ${clientId}) via ${ep}`);
                break;
              }
            }
          }
        } catch (e) {
          console.log(`⚠️ Uniplay search ${ep}: ${(e as Error).message}`);
        }
      }

      if (!clientId) {
        return new Response(JSON.stringify({ success: false, error: `Usuário "${username}" não encontrado no painel Uniplay` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
        });
      }

      // Try extend endpoints
      console.log(`🔄 Uniplay: Renovando cliente ${clientId} → +${duration} ${durationIn}`);
      const extendEndpoints = [
        { url: `/api/clients/${clientId}/extend`, method: 'POST' },
        { url: `/api/users/${clientId}/extend`, method: 'POST' },
        { url: `/api/lines/${clientId}/extend`, method: 'POST' },
        { url: `/api/client/${clientId}/extend`, method: 'PUT' },
      ];

      for (const ep of extendEndpoints) {
        try {
          const resp = await withTimeout(fetch(`${cleanBase}${ep.url}`, {
            method: ep.method,
            headers: authHeaders,
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

    return new Response(JSON.stringify({ success: false, error: 'Action inválida. Use: renew_by_username' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
    });
  } catch (error) {
    console.error(`❌ Erro: ${(error as Error).message}`);
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
