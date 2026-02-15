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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { action } = body;

    console.log(`[Z-API] Action: ${action}, User: ${user.id}`);

    // Get saved Z-API config for user
    const getUserConfig = async () => {
      const { data: existing } = await serviceClient
        .from('zapi_config')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existing?.instance_id || !existing?.token || !existing?.client_token) {
        throw new Error('Z-API não configurado. Configure seu Instance ID, Token e Client Token primeiro.');
      }

      return {
        instanceId: existing.instance_id,
        token: existing.token,
        clientToken: existing.client_token,
      };
    };

    const makeRequest = async (instanceId: string, token: string, clientToken: string, endpoint: string, method: string = 'GET', requestBody?: any) => {
      const url = `https://api.z-api.io/instances/${instanceId}/token/${token}${endpoint}`;
      console.log(`[Z-API] ${method} ${url}`);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Client-Token': clientToken,
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
      case 'saveConfig': {
        const { instanceId, token, clientToken } = body;
        
        if (!instanceId || !token || !clientToken) {
          result = { error: 'Instance ID, Token e Client Token são obrigatórios.' };
          break;
        }

        await serviceClient
          .from('zapi_config')
          .upsert({
            user_id: user.id,
            instance_id: instanceId,
            token: token,
            client_token: clientToken,
            is_configured: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        result = { success: true, message: 'Configuração salva com sucesso!' };
        break;
      }

      case 'getConfig': {
        const { data: existing } = await serviceClient
          .from('zapi_config')
          .select('instance_id, token, client_token, is_configured')
          .eq('user_id', user.id)
          .maybeSingle();

        result = {
          config: existing ? {
            instanceId: existing.instance_id,
            token: existing.token,
            clientToken: existing.client_token,
            isConfigured: existing.is_configured,
          } : null,
        };
        break;
      }

      case 'connect': {
        const config = await getUserConfig();
        const { instanceId, token, clientToken } = config;

        // First check if already connected
        const statusCheck = await makeRequest(instanceId, token, clientToken, '/status');
        if (statusCheck.ok && statusCheck.data?.connected === true) {
          let phoneNumber = null;
          let profileName = null;
          try {
            const phoneResult = await makeRequest(instanceId, token, clientToken, '/phone');
            phoneNumber = phoneResult.data?.phone || null;
            profileName = phoneResult.data?.name || null;
          } catch (e) {
            console.log('[Z-API] Could not get phone details:', e);
          }
          result = { status: 'connected', phoneNumber, profileName };
          break;
        }

        // Get QR Code as base64 image
        const qrResult = await makeRequest(instanceId, token, clientToken, '/qr-code/image');

        if (qrResult.ok && qrResult.data?.value) {
          result = {
            status: 'connecting',
            qrCode: qrResult.data.value,
          };
        } else {
          result = { error: qrResult.data?.message || qrResult.data?.error || 'Erro ao gerar QR Code' };
        }
        break;
      }

      case 'status': {
        const config = await getUserConfig();
        const { instanceId, token, clientToken } = config;

        const statusResult = await makeRequest(instanceId, token, clientToken, '/status');
        const connected = statusResult.data?.connected;
        const smartphoneConnected = statusResult.data?.smartphoneConnected;

        if (connected === true) {
          let phoneNumber = null;
          let profileName = null;
          try {
            const phoneResult = await makeRequest(instanceId, token, clientToken, '/phone');
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
        const { data: existing } = await serviceClient
          .from('zapi_config')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (existing?.instance_id && existing?.token && existing?.client_token) {
          try {
            await makeRequest(existing.instance_id, existing.token, existing.client_token, '/disconnect', 'GET');
          } catch (e) {
            console.log('[Z-API] Disconnect error:', e);
          }
        }
        result = { status: 'disconnected' };
        break;
      }

      case 'sendMessage': {
        const config = await getUserConfig();
        const { instanceId, token, clientToken } = config;
        const { phone, message } = body;
        let formattedPhone = phone.replace(/\D/g, '');

        if (!formattedPhone.startsWith('55') && formattedPhone.length >= 10) {
          formattedPhone = '55' + formattedPhone;
        }

        const sendResult = await makeRequest(instanceId, token, clientToken, '/send-text', 'POST', {
          phone: formattedPhone,
          message: message,
        });

        if (sendResult.ok && !sendResult.data?.error) {
          result = { success: true, data: sendResult.data };
        } else {
          const errorMsg = sendResult.data?.message || sendResult.data?.error || 'Erro ao enviar mensagem';
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
