import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from './useCurrentUser';
import { logSistema } from '@/utils/logger';

interface ZAPISession {
  status: 'connecting' | 'connected' | 'disconnected';
  qrCode?: string;
  phoneNumber?: string;
  profileName?: string;
}

interface ZAPIConfig {
  instanceId: string;
  token: string;
  clientToken: string;
}

export const useZAPI = () => {
  const { userId } = useCurrentUser();
  const [session, setSession] = useState<ZAPISession | null>(null);
  const [config, setConfig] = useState<ZAPIConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const savingRef = useRef(false);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
      }
    };
  }, []);

  // Load config from edge function
  useEffect(() => {
    if (!userId) return;

    const loadConfig = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('zapi-integration', {
          body: { action: 'getConfig' },
        });
        if (!error && data?.config) {
          setConfig(data.config);
        }
      } catch (e) {
        console.error('Erro ao carregar config Z-API:', e);
      } finally {
        setConfigLoading(false);
      }
    };

    loadConfig();
  }, [userId]);

  // Load session from DB
  useEffect(() => {
    if (hasLoadedRef.current) return;

    const loadSessionFromDB = async (uid: string) => {
      try {
        const { data, error } = await supabase
          .from('whatsapp_sessions')
          .select('*')
          .eq('user_id', uid)
          .maybeSingle();

        if (error) {
          console.error('Erro ao carregar sessão:', error);
        } else if (data && data.status === 'connected') {
          setSession({
            status: 'connected',
            phoneNumber: data.phone_number || undefined,
            profileName: data.device_name || undefined,
          });
        }
      } catch (e) {
        console.error('Erro ao carregar sessão:', e);
      } finally {
        setHydrated(true);
        hasLoadedRef.current = true;
      }
    };

    if (userId) {
      loadSessionFromDB(userId);
    } else {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          loadSessionFromDB(user.id);
        } else {
          setHydrated(true);
          hasLoadedRef.current = true;
        }
      });
    }
  }, [userId]);

  const callZAPI = useCallback(async (action: string, extraData?: any) => {
    const { data, error } = await supabase.functions.invoke('zapi-integration', {
      body: { action, ...extraData },
    });

    if (error) {
      console.error('Z-API error:', error);
      throw new Error(error.message || 'Erro ao comunicar com Z-API');
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return data;
  }, []);

  // Save session to DB
  useEffect(() => {
    if (!userId || !hydrated || savingRef.current) return;

    const saveSessionToDB = async () => {
      savingRef.current = true;
      try {
        if (session?.status === 'connected') {
          const { error } = await supabase
            .from('whatsapp_sessions')
            .upsert({
              user_id: userId,
              session_id: `zapi_${userId}`,
              status: 'connected',
              phone_number: session.phoneNumber || null,
              device_name: session.profileName || null,
              last_activity: new Date().toISOString(),
            }, { onConflict: 'session_id' });

          if (error) {
            console.error('Erro ao salvar sessão:', error);
          }
        } else if (session === null) {
          await supabase
            .from('whatsapp_sessions')
            .delete()
            .eq('user_id', userId);
        }
      } catch (e) {
        console.error('Erro ao salvar sessão:', e);
      } finally {
        savingRef.current = false;
      }
    };

    saveSessionToDB();
  }, [userId, session, hydrated]);

  const saveConfig = useCallback(async (newConfig: { instanceId: string; token: string; clientToken: string }) => {
    try {
      const data = await callZAPI('saveConfig', newConfig);
      if (data?.success) {
        setConfig(newConfig);
        toast.success('Configuração Z-API salva!');
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar configuração');
      return false;
    }
  }, [callZAPI]);

  const checkStatus = useCallback(async (showToast = true, updateConnecting = true) => {
    if (!userId) return null;

    if (updateConnecting) setConnecting(true);
    try {
      const data = await callZAPI('status');

      if (data.status === 'connected') {
        setSession({
          status: 'connected',
          phoneNumber: data.phoneNumber,
          profileName: data.profileName,
        });
        if (statusIntervalRef.current) {
          clearInterval(statusIntervalRef.current);
          statusIntervalRef.current = null;
        }
        if (showToast) toast.success('WhatsApp conectado!');
      } else if (data.status === 'connecting') {
        setSession(prev => prev?.qrCode ? prev : { status: 'connecting' });
      } else {
        setSession(prev => {
          if (prev?.qrCode && statusIntervalRef.current) return prev;
          return null;
        });
        if (showToast) toast.info('WhatsApp desconectado');
      }

      return data.status;
    } catch (error) {
      console.error('Error checking status:', error);
      if (showToast) toast.error('Erro ao verificar status');
      return null;
    } finally {
      if (updateConnecting) setConnecting(false);
    }
  }, [userId, callZAPI]);

  const startStatusCheck = useCallback(() => {
    if (statusIntervalRef.current) {
      clearInterval(statusIntervalRef.current);
    }

    const interval = setInterval(async () => {
      const status = await checkStatus(false, false);
      if (status === 'connected') {
        clearInterval(interval);
        statusIntervalRef.current = null;
        toast.success('WhatsApp conectado com sucesso via Z-API!');
        logSistema("whatsapp", "WhatsApp conectado via Z-API", "success");
      }
    }, 3000);

    statusIntervalRef.current = interval;

    setTimeout(() => {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
        statusIntervalRef.current = null;
      }
    }, 120000);
  }, [checkStatus]);

  const connect = useCallback(async () => {
    if (!userId) {
      toast.error('Você precisa estar logado');
      return;
    }

    if (!config?.instanceId || !config?.token || !config?.clientToken) {
      toast.error('Configure o Instance ID, Token e Client Token primeiro');
      return;
    }

    setConnecting(true);
    try {
      const data = await callZAPI('connect');

      if (data.status === 'connected') {
        setSession({
          status: 'connected',
          phoneNumber: data.phoneNumber,
          profileName: data.profileName,
        });
        toast.success('WhatsApp já está conectado!');
      } else if (data.status === 'connecting' && data.qrCode) {
        setSession({
          status: 'connecting',
          qrCode: data.qrCode,
        });
        toast.success('QR Code gerado! Escaneie com seu WhatsApp');
        startStatusCheck();
      } else if (data.error) {
        toast.error(data.error);
      }
    } catch (error: any) {
      console.error('Error connecting:', error);
      toast.error(error.message || 'Erro ao conectar');
    } finally {
      setConnecting(false);
    }
  }, [userId, config, callZAPI, startStatusCheck]);

  const disconnect = useCallback(async () => {
    if (statusIntervalRef.current) {
      clearInterval(statusIntervalRef.current);
      statusIntervalRef.current = null;
    }

    try {
      await callZAPI('disconnect');
      setSession(null);
      toast.success('WhatsApp desconectado com sucesso!');
      logSistema("whatsapp", "WhatsApp desconectado (Z-API)", "warning");
    } catch (error: any) {
      console.error('Error disconnecting:', error);
      setSession(null);
      toast.success('WhatsApp desconectado');
    }
  }, [callZAPI]);

  const sendMessage = useCallback(async (phone: string, message: string) => {
    if (!userId) throw new Error('Você precisa estar logado');

    const normalizedPhone = phone.replace(/\D/g, '');
    const formattedPhone = !normalizedPhone.startsWith('55') && normalizedPhone.length >= 10
      ? '55' + normalizedPhone
      : normalizedPhone;

    setLoading(true);
    try {
      const data = await callZAPI('sendMessage', { phone: formattedPhone, message });

      if (data.success) {
        toast.success('Mensagem enviada com sucesso!');
        return data.data;
      } else {
        if (data.connectionLost) setSession(null);
        throw new Error(data.error || 'Erro ao enviar mensagem');
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [userId, callZAPI]);

  return {
    session,
    config,
    configLoading,
    loading,
    connecting,
    hydrated,
    saveConfig,
    connect,
    disconnect,
    checkStatus,
    sendMessage,
    isConnected: session?.status === 'connected',
    isConfigured: !!(config?.instanceId && config?.token && config?.clientToken),
  };
};
