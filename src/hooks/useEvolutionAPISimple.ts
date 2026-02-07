import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from './useCurrentUser';

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
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
      }
    };
  }, []);

  // Check status on mount
  useEffect(() => {
    if (userId) {
      checkStatus();
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
    } catch (error: any) {
      console.error('Error disconnecting:', error);
      setSession(null);
      toast.success('WhatsApp desconectado');
    }
  }, [callEvolutionAPI]);

  const sendMessage = useCallback(async (phone: string, message: string) => {
    if (!userId) {
      throw new Error('Você precisa estar logado');
    }

    setLoading(true);
    try {
      const data = await callEvolutionAPI('sendMessage', { phone, message });
      
      if (data.success) {
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
    connect,
    disconnect,
    checkStatus,
    sendMessage,
    isConnected: session?.status === 'connected',
  };
};
