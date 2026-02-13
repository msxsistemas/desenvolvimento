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

async function loginSigma(baseUrl: string, username: string, password: string): Promise<{ success: boolean; token: string; error?: string }> {
  const cleanBase = baseUrl.replace(/\/$/, '');
  const endpoints = ['/api/auth/login', '/login', '/api/login'];

  for (const ep of endpoints) {
    try {
      const resp = await withTimeout(fetch(`${cleanBase}${ep}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        body: JSON.stringify({
          captcha: 'not-a-robot',
          captchaChecked: true,
          username,
          password,
          twofactor_code: '',
          twofactor_recovery_code: '',
          twofactor_trusted_device_id: '',
        }),
      }), 15000);

      const text = await resp.text();
      let json: any = null;
      try { json = JSON.parse(text); } catch {}

      const token = json?.token || json?.jwt || json?.access_token || json?.data?.token || json?.data?.access_token;
      if (resp.ok && token) {
        console.log(`✅ Sigma login OK em ${ep}`);
        return { success: true, token };
      }

      if (resp.ok && (json?.success || json?.status === 'ok' || json?.user)) {
        return { success: true, token: token || '' };
      }
    } catch (e) {
      console.log(`⚠️ Sigma login falhou em ${ep}: ${(e as Error).message}`);
    }
  }

  return { success: false, token: '', error: 'Login Sigma falhou em todos os endpoints' };
}

Deno.serve(async (req) => {
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
      .eq('provedor', 'sigma-v2')
      .single();

    if (!panel) {
      return new Response(JSON.stringify({ success: false, error: 'Painel Sigma não encontrado' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    const cleanBase = panel.url.replace(/\/$/, '');
    const login = await loginSigma(cleanBase, panel.usuario, panel.senha);
    if (!login.success) {
      return new Response(JSON.stringify({ success: false, error: login.error }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    const authHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    if (login.token) authHeaders['Authorization'] = `Bearer ${login.token}`;

    if (action === 'renew_by_username') {
      if (!username || !duration || !durationIn) {
        return new Response(JSON.stringify({ success: false, error: 'username, duration e durationIn são obrigatórios' }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
        });
      }

      console.log(`🔄 Sigma: Buscando cliente "${username}" no painel ${panel.nome}`);

      // Try multiple search endpoints
      const searchEndpoints = [
        `/api/clients?search=${encodeURIComponent(username)}`,
        `/api/users?search=${encodeURIComponent(username)}`,
        `/api/lines?search=${encodeURIComponent(username)}`,
        `/api/client?search=${encodeURIComponent(username)}`,
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
                console.log(`✅ Sigma: Cliente encontrado (ID: ${clientId}) via ${ep}`);
                break;
              }
            }
          }
        } catch (e) {
          console.log(`⚠️ Sigma search ${ep}: ${(e as Error).message}`);
        }
      }

      if (!clientId) {
        return new Response(JSON.stringify({ success: false, error: `Usuário "${username}" não encontrado no painel Sigma` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
        });
      }

      // Try multiple extend endpoints
      console.log(`🔄 Sigma: Renovando cliente ${clientId} → +${duration} ${durationIn}`);
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

          console.log(`📊 Sigma extend ${ep.url} → status: ${resp.status}, response: ${text.slice(0, 300)}`);

          if (resp.ok && (json?.success || json?.status === 'ok' || json?.message)) {
            // Log renewal
            const authHeader = req.headers.get('authorization');
            if (authHeader) {
              const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
              const { data: { user } } = await anonClient.auth.getUser(authHeader.replace('Bearer ', ''));
              if (user?.id) {
                await supabase.from('logs_painel').insert({
                  user_id: user.id,
                  acao: `Renovação Sigma: cliente ${username} → +${duration} ${durationIn} (Painel: ${panel.nome})`,
                  tipo: 'renovacao',
                });
              }
            }

            return new Response(JSON.stringify({
              success: true,
              message: json?.message || 'Cliente renovado com sucesso no Sigma',
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
            });
          }
        } catch (e) {
          console.log(`⚠️ Sigma extend ${ep.url}: ${(e as Error).message}`);
        }
      }

      return new Response(JSON.stringify({
        success: false,
        error: 'Não foi possível renovar no painel Sigma. Endpoints de extensão não responderam.',
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
