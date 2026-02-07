import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      console.error('Evolution API not configured');
      return new Response(
        JSON.stringify({ error: 'Evolution API não configurada no servidor' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    const { action } = await req.json();
    const instanceName = `user_${user.id.replace(/-/g, '_')}`;
    const apiUrl = EVOLUTION_API_URL.replace(/\/$/, '');

    console.log(`[Evolution API] Action: ${action}, Instance: ${instanceName}`);

    const makeRequest = async (endpoint: string, method: string = 'GET', body?: any) => {
      const url = `${apiUrl}${endpoint}`;
      console.log(`[Evolution API] ${method} ${url}`);
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();
      console.log(`[Evolution API] Response status: ${response.status}`, data);
      
      return { ok: response.ok, status: response.status, data };
    };

    let result;

    switch (action) {
      case 'connect': {
        // First check if instance exists
        const fetchResult = await makeRequest(`/instance/fetchInstances?instanceName=${instanceName}`);
        
        if (fetchResult.ok && fetchResult.data?.length > 0) {
          const instance = fetchResult.data[0];
          if (instance.instance?.state === 'open') {
            result = {
              status: 'connected',
              phoneNumber: instance.instance?.owner,
              profileName: instance.instance?.profileName,
            };
            break;
          }
          
          // Instance exists but not connected, try to connect
          const connectResult = await makeRequest(`/instance/connect/${instanceName}`);
          if (connectResult.ok) {
            const qrCode = connectResult.data.base64 || connectResult.data.qrcode?.base64;
            if (qrCode) {
              result = { status: 'connecting', qrCode };
              break;
            }
            if (connectResult.data.instance?.state === 'open') {
              result = {
                status: 'connected',
                phoneNumber: connectResult.data.instance?.owner,
                profileName: connectResult.data.instance?.profileName,
              };
              break;
            }
          }
        }

        // Create new instance
        const createResult = await makeRequest('/instance/create', 'POST', {
          instanceName,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
        });

        if (createResult.ok && createResult.data.qrcode?.base64) {
          result = { status: 'connecting', qrCode: createResult.data.qrcode.base64 };
        } else {
          result = { error: createResult.data.message || 'Erro ao criar instância' };
        }
        break;
      }

      case 'status': {
        const statusResult = await makeRequest(`/instance/connectionState/${instanceName}`);
        
        if (!statusResult.ok) {
          result = { status: 'disconnected' };
          break;
        }

        const state = statusResult.data.instance?.state || statusResult.data.state;
        
        if (state === 'open') {
          const fetchResult = await makeRequest(`/instance/fetchInstances?instanceName=${instanceName}`);
          const instanceInfo = fetchResult.data?.[0];
          
          result = {
            status: 'connected',
            phoneNumber: instanceInfo?.instance?.owner || statusResult.data.instance?.owner,
            profileName: instanceInfo?.instance?.profileName,
            profilePicture: instanceInfo?.instance?.profilePictureUrl,
          };
        } else if (state === 'connecting') {
          result = { status: 'connecting' };
        } else {
          result = { status: 'disconnected' };
        }
        break;
      }

      case 'disconnect': {
        try {
          await makeRequest(`/instance/logout/${instanceName}`, 'DELETE');
        } catch (e) {
          console.log('Logout failed, continuing with delete');
        }
        
        try {
          await makeRequest(`/instance/delete/${instanceName}`, 'DELETE');
        } catch (e) {
          console.log('Delete failed:', e);
        }
        
        result = { status: 'disconnected' };
        break;
      }

      case 'sendMessage': {
        const { phone, message } = await req.json();
        const formattedPhone = phone.replace(/\D/g, '');
        
        const sendResult = await makeRequest(`/message/sendText/${instanceName}`, 'POST', {
          number: formattedPhone,
          text: message,
          delay: 1200,
        });

        if (sendResult.ok) {
          result = { success: true, data: sendResult.data };
        } else {
          result = { error: sendResult.data.message || 'Erro ao enviar mensagem' };
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
    console.error('Error in evolution-api function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
