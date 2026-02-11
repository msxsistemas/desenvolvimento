import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const relayUrl = Deno.env.get('VPS_RELAY_URL');
  const relaySecret = Deno.env.get('VPS_RELAY_SECRET');

  const results: any[] = [];

  try {
    const resp = await fetch(`${relayUrl}/proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-relay-secret': relaySecret || '' },
      body: JSON.stringify({
        url: 'https://gestordefender.com/js/app.c1e0883d.js',
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*' },
      }),
    });
    const text = await resp.text();
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch {}
    const jsCode = typeof parsed?.data === 'string' ? parsed.data : text;

    // The URL is: _0x2d667b(0x3370) + 'sapioffice' + _0x2d667b(0x2300) + _0x2d667b(0x35a7) + _0x2d667b(0x218e)
    // _0x2d667b is likely a lookup function into a string array
    // Let's find the string array at the beginning of the file
    // Common pattern: var _0xNNNN = ['string1','string2',...]
    
    // Find all string literals that could be URL parts
    // gesapioffice.com → 'ge' + 'sapioffice' + '.com' + possible path
    // So we need: something like 'https://ge' or 'http://ge' or just 'ge'
    
    // Let's search for strings containing '.com' near sapioffice
    const dotComContexts: string[] = [];
    let idx = 0;
    // Look for '.com/' patterns which would indicate API path
    while (idx < jsCode.length && dotComContexts.length < 10) {
      const pos = jsCode.indexOf(".com/", idx);
      if (pos === -1) break;
      dotComContexts.push(jsCode.slice(Math.max(0, pos - 30), pos + 50));
      idx = pos + 5;
    }

    // Let's try intercepting network requests instead - try all possible API domains 
    // with different URL patterns
    const apiDomains = [
      'https://gesapioffice.com',
      'https://api.gesapioffice.com', 
      'https://gesapioffice.com/api',
      'https://gestordefender.com',
      'https://gestordefender.com/api',
    ];
    
    const loginPaths = ['/login', '/api/login', '/auth/login'];
    
    for (const domain of apiDomains) {
      for (const path of loginPaths) {
        const url = `${domain}${path}`;
        try {
          const r = await fetch(`${relayUrl}/proxy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-relay-secret': relaySecret || '' },
            body: JSON.stringify({
              url,
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Origin': 'https://gestordefender.com',
                'Referer': 'https://gestordefender.com/',
              },
              body: { username: 'test', password: 'test', code: '' },
            }),
          });
          const t = await r.text();
          let p: any = null;
          try { p = JSON.parse(t); } catch {}
          const status = p?.status || r.status;
          // Only log non-404 responses (interesting ones)
          if (status !== 404) {
            results.push({ url, status, body: (typeof p?.data === 'string' ? p.data : t).slice(0, 300) });
          } else {
            results.push({ url, status: 404 });
          }
        } catch (e) {
          results.push({ url, error: (e as Error).message });
        }
      }
    }

    // Also try: maybe the URL is gesapioffice.com but needs /api/v1/login or specific Content-Type
    const specialTests = [
      { url: 'https://gesapioffice.com/login', contentType: 'application/x-www-form-urlencoded', body: 'username=test&password=test&code=' },
      { url: 'https://gesapioffice.com/login', contentType: 'multipart/form-data', body: JSON.stringify({ username: 'test', password: 'test' }) },
    ];
    
    for (const t of specialTests) {
      try {
        const r = await fetch(`${relayUrl}/proxy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-relay-secret': relaySecret || '' },
          body: JSON.stringify({
            url: t.url,
            method: 'POST',
            headers: {
              'Content-Type': t.contentType,
              'Accept': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Origin': 'https://gestordefender.com',
              'Referer': 'https://gestordefender.com/',
            },
            body: t.body,
          }),
        });
        const txt = await r.text();
        let p: any = null;
        try { p = JSON.parse(txt); } catch {}
        results.push({ url: t.url, contentType: t.contentType, status: p?.status || r.status, body: (typeof p?.data === 'string' ? p.data : txt).slice(0, 300) });
      } catch (e) {
        results.push({ url: t.url, contentType: t.contentType, error: (e as Error).message });
      }
    }

    results.push({ dotComContexts: dotComContexts.slice(0, 10) });

  } catch (e) { results.push({ error: (e as Error).message }); }

  return new Response(JSON.stringify({ results }, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
