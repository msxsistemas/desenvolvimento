import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from auth
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Z-API config from database using service role
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: zapiConfig, error: configError } = await serviceClient
      .from('zapi_config')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (configError || !zapiConfig) {
      console.error('Z-API config not found:', configError);
      return new Response(
        JSON.stringify({ error: 'Z-API não configurada. Configure suas credenciais primeiro.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { instance_id, token, client_token } = zapiConfig;
    const baseUrl = `https://api.z-api.io/instances/${instance_id}/token/${token}`;

    const body = await req.json();
    const { action } = body;

    console.log(`[Z-API] Action: ${action}, Instance: ${instance_id}`);

    const makeRequest = async (endpoint: string, method: string = 'GET', requestBody?: any) => {
      const url = `${baseUrl}${endpoint}`;
      console.log(`[Z-API] ${method} ${url}`);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Client-Token': client_token,
      };

      const response = await fetch(url, {
        method,
        headers,
        body: requestBody ? JSON.stringify(requestBody) : undefined,
      });

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.log('[Z-API] Non-JSON response:', text);
        data = { message: text };
      }

      console.log(`[Z-API] Response status: ${response.status}`, JSON.stringify(data));
      return { ok: response.ok, status: response.status, data };
    };

    let result;

    switch (action) {
      case 'connect': {
        // Get QR Code
        const qrResult = await makeRequest('/qr-code');

        if (qrResult.ok && qrResult.data?.value) {
          result = {
            status: 'connecting',
            qrCode: qrResult.data.value, // base64 QR code
          };
        } else if (qrResult.data?.connected === true) {
          // Already connected, get phone info
          const phoneResult = await makeRequest('/phone');
          result = {
            status: 'connected',
            phoneNumber: phoneResult.data?.phone || null,
            profileName: phoneResult.data?.name || null,
          };
        } else {
          result = { error: qrResult.data?.message || qrResult.data?.error || 'Erro ao gerar QR Code' };
        }
        break;
      }

      case 'status': {
        const statusResult = await makeRequest('/status');
        console.log('[Z-API] Status result:', JSON.stringify(statusResult));

        const connected = statusResult.data?.connected;
        const smartphoneConnected = statusResult.data?.smartphoneConnected;

        if (connected === true) {
          // Get phone details
          let phoneNumber = null;
          let profileName = null;
          try {
            const phoneResult = await makeRequest('/phone');
            phoneNumber = phoneResult.data?.phone || null;
            profileName = phoneResult.data?.name || null;
          } catch (e) {
            console.log('[Z-API] Could not get phone details:', e);
          }

          result = {
            status: 'connected',
            phoneNumber,
            profileName,
            smartphoneConnected,
          };
        } else if (statusResult.data?.statusReason === 'browserOpen') {
          result = { status: 'connecting' };
        } else {
          result = { status: 'disconnected' };
        }
        break;
      }

      case 'disconnect': {
        try {
          await makeRequest('/disconnect', 'POST');
        } catch (e) {
          console.log('[Z-API] Disconnect error:', e);
        }
        result = { status: 'disconnected' };
        break;
      }

      case 'sendMessage': {
        const { phone, message } = body;
        let formattedPhone = phone.replace(/\D/g, '');

        // Ensure country code
        if (!formattedPhone.startsWith('55') && formattedPhone.length >= 10) {
          formattedPhone = '55' + formattedPhone;
        }

        const sendResult = await makeRequest('/send-text', 'POST', {
          phone: formattedPhone,
          message: message,
        });

        if (sendResult.ok && !sendResult.data?.error) {
          result = { success: true, data: sendResult.data };
        } else {
          const errorMsg = sendResult.data?.message || sendResult.data?.error || 'Erro ao enviar mensagem';

          // Check connection issues
          const isConnectionError = errorMsg.includes('not connected') ||
            errorMsg.includes('desconectado') ||
            sendResult.data?.connected === false;

          if (isConnectionError) {
            await serviceClient
              .from('whatsapp_sessions')
              .update({ status: 'disconnected' })
              .eq('user_id', user.id);

            result = { error: 'WhatsApp desconectado. Reconecte em "Parear WhatsApp".', connectionLost: true };
          } else {
            result = { error: errorMsg };
          }
        }
        break;
      }

      default:
        result = { error: 'Ação inválida' };
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in zapi-integration function:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
