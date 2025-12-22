import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface EvolutionSession {
  instanceName: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'close';
  qrCode?: string;
  phoneNumber?: string;
  profileName?: string;
  profilePicture?: string;
}

const INSTANCE_NAME = 'Whatsapp';

export const useEvolutionAPI = () => {
  const [session, setSession] = useState<EvolutionSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [statusInterval, setStatusInterval] = useState<NodeJS.Timeout | null>(null);

  // Limpar interval ao desmontar
  useEffect(() => {
    return () => {
      if (statusInterval) clearInterval(statusInterval);
    };
  }, [statusInterval]);

  // Função para fazer requisições à Edge Function
  const makeRequest = useCallback(async (action: string, params: any = {}) => {
    console.log(`📡 Evolution API: ${action}`);

    const { data, error } = await supabase.functions.invoke('evolution-api', {
      body: { action, instanceName: INSTANCE_NAME, ...params },
    });

    if (error) {
      console.error('Evolution API Error:', error);
      throw new Error(error.message || 'Erro na Evolution API');
    }

    return data;
  }, []);

  // Criar instância na Evolution API
  const createInstance = useCallback(async () => {
    setConnecting(true);
    try {
      // Primeiro, tentar buscar a instância existente
      try {
        const existingInstance = await makeRequest('fetchInstances');
        console.log('Instância existente:', existingInstance);
        
        if (existingInstance && existingInstance.length > 0) {
          const instance = existingInstance[0];
          if (instance.instance?.state === 'open') {
            setSession({
              instanceName: INSTANCE_NAME,
              status: 'connected',
              phoneNumber: instance.instance?.owner,
              profileName: instance.instance?.profileName,
            });
            toast.success('WhatsApp já está conectado!');
            return instance;
          }
        }
      } catch (e) {
        console.log('Instância não existe, criando nova...');
      }

      // Criar nova instância
      const createData = await makeRequest('create');
      console.log('Instância criada:', createData);

      if (createData.qrcode?.base64) {
        setSession({
          instanceName: INSTANCE_NAME,
          status: 'connecting',
          qrCode: createData.qrcode.base64,
        });
        
        startStatusCheck();
        toast.success('QR Code gerado! Escaneie com seu WhatsApp');
        return createData;
      }

      return createData;
    } catch (error: any) {
      console.error('Erro ao criar instância:', error);
      toast.error(error.message || 'Erro ao criar instância');
      return null;
    } finally {
      setConnecting(false);
    }
  }, [makeRequest]);

  // Conectar instância existente (gerar QR Code)
  const connectInstance = useCallback(async () => {
    setConnecting(true);
    try {
      const connectData = await makeRequest('connect');
      console.log('Connect response:', connectData);

      if (connectData.base64 || connectData.qrcode?.base64) {
        const qrCode = connectData.base64 || connectData.qrcode?.base64;
        setSession({
          instanceName: INSTANCE_NAME,
          status: 'connecting',
          qrCode: qrCode,
        });

        startStatusCheck();
        toast.success('QR Code gerado! Escaneie com seu WhatsApp');
        return connectData;
      }

      // Se já estiver conectado
      if (connectData.instance?.state === 'open') {
        setSession({
          instanceName: INSTANCE_NAME,
          status: 'connected',
          phoneNumber: connectData.instance?.owner,
          profileName: connectData.instance?.profileName,
        });
        toast.success('WhatsApp já está conectado!');
      }

      return connectData;
    } catch (error: any) {
      console.error('Erro ao conectar:', error);
      
      // Se a instância não existe, criar
      if (error.message?.includes('not found') || error.message?.includes('404')) {
        return createInstance();
      }
      
      toast.error(error.message || 'Erro ao conectar');
      return null;
    } finally {
      setConnecting(false);
    }
  }, [makeRequest, createInstance]);

  // Verificar status da conexão
  const checkStatus = useCallback(async () => {
    try {
      const statusData = await makeRequest('checkStatus');
      console.log('Status:', statusData);

      const state = statusData.instance?.state || statusData.state;

      if (state === 'open') {
        // Buscar informações do perfil
        try {
          const fetchData = await makeRequest('fetchInstances');
          const instanceInfo = fetchData[0];
          
          setSession({
            instanceName: INSTANCE_NAME,
            status: 'connected',
            phoneNumber: instanceInfo?.instance?.owner || statusData.instance?.owner,
            profileName: instanceInfo?.instance?.profileName,
            profilePicture: instanceInfo?.instance?.profilePictureUrl,
          });

          // Parar verificação de status
          if (statusInterval) {
            clearInterval(statusInterval);
            setStatusInterval(null);
          }

          return 'connected';
        } catch (e) {
          setSession(prev => prev ? { ...prev, status: 'connected' } : null);
          return 'connected';
        }
      } else if (state === 'connecting') {
        return 'connecting';
      } else {
        setSession(prev => prev ? { ...prev, status: 'disconnected' } : null);
        return 'disconnected';
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      return null;
    }
  }, [makeRequest, statusInterval]);

  // Iniciar verificação de status periódica
  const startStatusCheck = useCallback(() => {
    if (statusInterval) clearInterval(statusInterval);

    const interval = setInterval(async () => {
      const status = await checkStatus();
      if (status === 'connected') {
        clearInterval(interval);
        setStatusInterval(null);
        toast.success('WhatsApp conectado com sucesso!');
      }
    }, 3000);

    setStatusInterval(interval);

    // Parar após 2 minutos
    setTimeout(() => {
      clearInterval(interval);
      setStatusInterval(null);
    }, 120000);
  }, [checkStatus, statusInterval]);

  // Enviar mensagem de texto
  const sendMessage = useCallback(async (phone: string, message: string) => {
    setLoading(true);
    try {
      const data = await makeRequest('sendMessage', { phone, message });
      console.log('Mensagem enviada:', data);
      toast.success('Mensagem enviada com sucesso!');
      return data;
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error(error.message || 'Erro ao enviar mensagem');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [makeRequest]);

  // Desconectar (logout)
  const disconnect = useCallback(async () => {
    if (statusInterval) {
      clearInterval(statusInterval);
      setStatusInterval(null);
    }

    try {
      await makeRequest('disconnect');
      setSession(null);
      toast.success('WhatsApp desconectado');
    } catch (error: any) {
      console.error('Erro ao desconectar:', error);
      toast.error(error.message || 'Erro ao desconectar');
    }
  }, [makeRequest, statusInterval]);

  // Reiniciar instância
  const restartInstance = useCallback(async () => {
    try {
      await makeRequest('restart');
      toast.success('Instância reiniciada');
      
      setTimeout(() => {
        connectInstance();
      }, 2000);
    } catch (error: any) {
      console.error('Erro ao reiniciar:', error);
      toast.error(error.message || 'Erro ao reiniciar');
    }
  }, [makeRequest, connectInstance]);

  // Deletar instância
  const deleteInstance = useCallback(async () => {
    try {
      await makeRequest('delete');
      setSession(null);
      toast.success('Instância deletada');
    } catch (error: any) {
      console.error('Erro ao deletar instância:', error);
      toast.error(error.message || 'Erro ao deletar');
    }
  }, [makeRequest]);

  // Testar conexão com a API
  const testConnection = useCallback(async () => {
    try {
      await makeRequest('fetchInstances');
      toast.success('Conexão com Evolution API estabelecida!');
      return true;
    } catch (error: any) {
      console.error('Erro ao testar conexão:', error);
      toast.error('Não foi possível conectar à Evolution API');
      return false;
    }
  }, [makeRequest]);

  return {
    session,
    loading,
    connecting,
    testConnection,
    createInstance,
    connectInstance,
    checkStatus,
    sendMessage,
    disconnect,
    restartInstance,
    deleteInstance,
    isConnected: session?.status === 'connected',
    isConfigured: true,
  };
};
