import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from './useCurrentUser';
import { logSistema } from '@/utils/logger';

interface EvolutionSession {
  status: 'connecting' | 'connected' | 'disconnected';
  qrCode?: string;
  phoneNumber?: string;
  profileName?: string;
  profilePicture?: string;
}

export const useEvolutionAPISimple = () => {
  const { userId } = useCurrentUser();
  const [session, setSession] = useState<EvolutionSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const savingRef = useRef(false);
  const hasLoadedRef = useRef(false);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
      }
    };
  }, []);

  // Carregar sessão do banco de dados ao montar - apenas uma vez quando userId estiver disponível
  useEffect(() => {
    // Se já carregou, não carrega novamente
    if (hasLoadedRef.current) return;

    // Função para carregar do banco
    const loadSessionFromDB = async (uid: string) => {
      try {
        const { data, error } = await supabase
          .from('whatsapp_sessions')
          .select('*')
          .eq('user_id', uid)
          .maybeSingle();

        if (error) {
          console.error('Erro ao carregar sessão do banco:', error);
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

    // Se tem userId, carrega do banco
    if (userId) {
      loadSessionFromDB(userId);
    } else {
      // Verificar diretamente se há usuário logado
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

  const callEvolutionAPI = useCallback(async (action: string, extraData?: any) => {
    const { data, error } = await supabase.functions.invoke('evolution-api', {
      body: { action, ...extraData },
    });

    if (error) {
      console.error('Evolution API error:', error);
      throw new Error(error.message || 'Erro ao comunicar com Evolution API');
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return data;
  }, []);

  // Salvar sessão no banco de dados quando mudar
  useEffect(() => {
    if (!userId || !hydrated || savingRef.current) return;

    const saveSessionToDB = async () => {
      savingRef.current = true;
      try {
        if (session?.status === 'connected') {
          // Upsert: inserir ou atualizar
          const { error } = await supabase
            .from('whatsapp_sessions')
            .upsert({
              user_id: userId,
              session_id: `user_${userId}`,
              status: 'connected',
              phone_number: session.phoneNumber || null,
              device_name: session.profileName || null,
              last_activity: new Date().toISOString(),
            }, {
              onConflict: 'session_id',
            });

          if (error) {
            console.error('Erro ao salvar sessão no banco:', error);
          }
        } else if (session === null) {
          // Remover sessão do banco
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

  // Monitorar desconexão na Evolution API (sem checar ao entrar na página)
  useEffect(() => {
    if (!userId) return;

    // Só monitora quando estiver conectado
    if (session?.status !== 'connected') {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
        statusIntervalRef.current = null;
      }
      return;
    }

    if (statusIntervalRef.current) return;

    // Checagem leve em background para detectar desconexão externa
    statusIntervalRef.current = setInterval(async () => {
      try {
        const data = await callEvolutionAPI('status');
        if (data.status !== 'connected') {
          setSession(null);
        }
      } catch {
        // se falhar, não derruba estado (evita piscar)
      }
    }, 60000);

    return () => {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
        statusIntervalRef.current = null;
      }
    };
  }, [userId, session?.status, callEvolutionAPI]);

  const checkStatus = useCallback(async () => {
    if (!userId) return null;

    try {
      const data = await callEvolutionAPI('status');
      
      if (data.status === 'connected') {
        setSession({
          status: 'connected',
          phoneNumber: data.phoneNumber,
          profileName: data.profileName,
          profilePicture: data.profilePicture,
        });

        // Stop status check if connected
        if (statusIntervalRef.current) {
          clearInterval(statusIntervalRef.current);
          statusIntervalRef.current = null;
        }
      } else if (data.status === 'connecting') {
        setSession(prev => prev ? { ...prev, status: 'connecting' } : null);
      } else {
        setSession(null);
      }

      return data.status;
    } catch (error) {
      console.error('Error checking status:', error);
      return null;
    }
  }, [userId, callEvolutionAPI]);

  const startStatusCheck = useCallback(() => {
    if (statusIntervalRef.current) {
      clearInterval(statusIntervalRef.current);
    }

    const interval = setInterval(async () => {
      const status = await checkStatus();
      if (status === 'connected') {
        clearInterval(interval);
        statusIntervalRef.current = null;
        toast.success('WhatsApp conectado com sucesso!');
        logSistema("whatsapp", "WhatsApp conectado via Evolution API", "success");
      }
    }, 3000);

    statusIntervalRef.current = interval;

    // Stop after 2 minutes
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

    setConnecting(true);
    try {
      const data = await callEvolutionAPI('connect');
      
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
  }, [userId, callEvolutionAPI, startStatusCheck]);

  const disconnect = useCallback(async () => {
    if (statusIntervalRef.current) {
      clearInterval(statusIntervalRef.current);
      statusIntervalRef.current = null;
    }

    try {
      await callEvolutionAPI('disconnect');
      setSession(null);
      toast.success('WhatsApp desconectado com sucesso!');
      logSistema("whatsapp", "WhatsApp desconectado", "warning");
    } catch (error: any) {
      console.error('Error disconnecting:', error);
      setSession(null);
      toast.success('WhatsApp desconectado');
    }
  }, [callEvolutionAPI]);

  // Função para normalizar número de telefone com código do país
  const normalizePhoneNumber = (phone: string): string => {
    // Remove tudo que não é dígito
    const digitsOnly = phone.replace(/\D/g, '');
    // Se não começar com 55, adiciona
    if (!digitsOnly.startsWith('55') && digitsOnly.length >= 10) {
      return '55' + digitsOnly;
    }
    return digitsOnly;
  };

  const sendMessage = useCallback(async (phone: string, message: string, skipRecord = false) => {
    if (!userId) {
      throw new Error('Você precisa estar logado');
    }

    // Normalizar número antes de enviar
    const normalizedPhone = normalizePhoneNumber(phone);

    setLoading(true);
    try {
      const data = await callEvolutionAPI('sendMessage', { phone: normalizedPhone, message });
      
      if (data.success) {
        // Registrar mensagem na tabela whatsapp_messages (se não for chamada da fila)
        if (!skipRecord) {
          try {
            await supabase.from('whatsapp_messages').insert({
              user_id: userId,
              session_id: `user_${userId}`,
              phone: normalizedPhone,
              message: message,
              status: 'sent',
              sent_at: new Date().toISOString(),
            });
          } catch (dbErr) {
            console.error('Erro ao registrar mensagem no banco:', dbErr);
          }
        }
        toast.success('Mensagem enviada com sucesso!');
        return data.data;
      } else {
        throw new Error(data.error || 'Erro ao enviar mensagem');
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error.message || 'Erro ao enviar mensagem');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [userId, callEvolutionAPI]);

  return {
    session,
    loading,
    connecting,
    hydrated,
    connect,
    disconnect,
    checkStatus,
    sendMessage,
    isConnected: session?.status === 'connected',
  };
};
