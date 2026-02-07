import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useCurrentUser } from './useCurrentUser';

interface EvolutionSession {
  instanceName: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'close';
  qrCode?: string;
  phoneNumber?: string;
  profileName?: string;
  profilePicture?: string;
}

interface EvolutionConfig {
  apiUrl: string;
  apiKey: string;
  instanceName: string;
}

const STORAGE_KEY = 'evolution_api_config';
const SESSION_STORAGE_KEY = 'evolution_api_session';

export const useEvolutionAPI = () => {
  const { userId } = useCurrentUser();
  const [config, setConfig] = useState<EvolutionConfig | null>(null);
  const [session, setSession] = useState<EvolutionSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [statusInterval, setStatusInterval] = useState<NodeJS.Timeout | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Carregar configuração e sessão do usuário
  useEffect(() => {
    if (userId) {
      loadConfig();
      loadSession();
    }
  }, [userId]);

  // Verificar status real da conexão após carregar a sessão
  useEffect(() => {
    if (config && session?.status === 'connected' && !initialized) {
      setInitialized(true);
      // Verificar se realmente está conectado
      verifyConnectionOnLoad();
    }
  }, [config, session, initialized]);

  // Limpar interval ao desmontar
  useEffect(() => {
    return () => {
      if (statusInterval) clearInterval(statusInterval);
    };
  }, [statusInterval]);

  // Persistir sessão sempre que mudar
  useEffect(() => {
    if (userId && session) {
      localStorage.setItem(`${SESSION_STORAGE_KEY}_${userId}`, JSON.stringify(session));
    }
  }, [userId, session]);

  const loadSession = () => {
    if (!userId) return;
    
    try {
      const stored = localStorage.getItem(`${SESSION_STORAGE_KEY}_${userId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Restaurar sessão salva
        setSession(parsed);
      }
    } catch (error) {
      console.error('Erro ao carregar sessão:', error);
    }
  };

  const loadConfig = () => {
    if (!userId) return;

    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setConfig({
          apiUrl: parsed.apiUrl,
          apiKey: parsed.apiKey,
          instanceName: parsed.instanceName,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    }
  };

  // Verificar conexão ao carregar (sem mostrar toasts)
  const verifyConnectionOnLoad = async () => {
    if (!config) return;

    try {
      const response = await fetch(`${config.apiUrl}/instance/connectionState/${config.instanceName}`, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': config.apiKey,
        },
      });

      if (response.ok) {
        const statusData = await response.json();
        const state = statusData.instance?.state || statusData.state;

        if (state === 'open') {
          // Ainda conectado, manter sessão
          console.log('✅ WhatsApp ainda conectado');
        } else {
          // Desconectou, limpar sessão
          console.log('⚠️ WhatsApp desconectado, limpando sessão');
          setSession(null);
          if (userId) {
            localStorage.removeItem(`${SESSION_STORAGE_KEY}_${userId}`);
          }
        }
      } else {
        // Erro ao verificar, limpar sessão
        setSession(null);
        if (userId) {
          localStorage.removeItem(`${SESSION_STORAGE_KEY}_${userId}`);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar conexão:', error);
      // Em caso de erro de rede, manter a sessão para tentar novamente depois
    }
  };

  const saveConfig = async (newConfig: EvolutionConfig) => {
    if (!userId) {
      toast.error('Você precisa estar logado');
      return false;
    }

    try {
      const configToSave = {
        apiUrl: newConfig.apiUrl.replace(/\/$/, ''),
        apiKey: newConfig.apiKey,
        instanceName: newConfig.instanceName,
        updatedAt: new Date().toISOString(),
      };

      localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(configToSave));

      setConfig(newConfig);
      toast.success('Configuração salva com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast.error('Erro ao salvar configuração');
      return false;
    }
  };

  // Função para fazer requisições à Evolution API
  const makeRequest = useCallback(async (
    endpoint: string, 
    method: 'GET' | 'POST' | 'DELETE' = 'GET', 
    body?: any
  ) => {
    if (!config) throw new Error('Evolution API não configurada');

    const url = `${config.apiUrl}${endpoint}`;
    console.log(`📡 ${method} ${url}`);

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Evolution API Error:', data);
      throw new Error(data.message || data.error || `Erro ${response.status}`);
    }

    return data;
  }, [config]);

  // Criar instância na Evolution API
  const createInstance = useCallback(async () => {
    if (!config) {
      toast.error('Configure a Evolution API primeiro');
      return null;
    }

    setConnecting(true);
    try {
      // Primeiro, tentar buscar a instância existente
      try {
        const existingInstance = await makeRequest(`/instance/fetchInstances?instanceName=${config.instanceName}`);
        console.log('Instância existente:', existingInstance);
        
        if (existingInstance && existingInstance.length > 0) {
          const instance = existingInstance[0];
          if (instance.instance?.state === 'open') {
            setSession({
              instanceName: config.instanceName,
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
      const createData = await makeRequest('/instance/create', 'POST', {
        instanceName: config.instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      });

      console.log('Instância criada:', createData);

      if (createData.qrcode?.base64) {
        setSession({
          instanceName: config.instanceName,
          status: 'connecting',
          qrCode: createData.qrcode.base64,
        });
        
        // Iniciar verificação de status
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
  }, [config, makeRequest]);

  // Conectar instância existente (gerar QR Code)
  const connectInstance = useCallback(async () => {
    if (!config) {
      toast.error('Configure a Evolution API primeiro');
      return null;
    }

    setConnecting(true);
    try {
      // Tentar conectar a instância existente
      const connectData = await makeRequest(`/instance/connect/${config.instanceName}`);
      console.log('Connect response:', connectData);

      if (connectData.base64 || connectData.qrcode?.base64) {
        const qrCode = connectData.base64 || connectData.qrcode?.base64;
        setSession({
          instanceName: config.instanceName,
          status: 'connecting',
          qrCode: qrCode,
        });

        // Iniciar verificação de status
        startStatusCheck();

        toast.success('QR Code gerado! Escaneie com seu WhatsApp');
        return connectData;
      }

      // Se já estiver conectado
      if (connectData.instance?.state === 'open') {
        setSession({
          instanceName: config.instanceName,
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
  }, [config, makeRequest, createInstance]);

  // Verificar status da conexão
  const checkStatus = useCallback(async () => {
    if (!config) return null;

    try {
      const statusData = await makeRequest(`/instance/connectionState/${config.instanceName}`);
      console.log('Status:', statusData);

      const state = statusData.instance?.state || statusData.state;

      if (state === 'open') {
        // Buscar informações do perfil
        try {
          const fetchData = await makeRequest(`/instance/fetchInstances?instanceName=${config.instanceName}`);
          const instanceInfo = fetchData[0];
          
          setSession({
            instanceName: config.instanceName,
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
  }, [config, makeRequest, statusInterval]);

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
    if (!config) {
      throw new Error('Evolution API não configurada');
    }

    setLoading(true);
    try {
      // Formatar número (remover caracteres especiais)
      let formattedPhone = phone.replace(/\D/g, '');
      
      // Evolution API v2 formato correto
      const data = await makeRequest(`/message/sendText/${config.instanceName}`, 'POST', {
        number: formattedPhone,
        text: message,
        delay: 1200,
      });

      console.log('Mensagem enviada:', data);
      toast.success('Mensagem enviada com sucesso!');
      return data;
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error);
      
      // Tentar formato alternativo se o primeiro falhar
      try {
        let formattedPhone = phone.replace(/\D/g, '');
        const data = await makeRequest(`/message/sendText/${config.instanceName}`, 'POST', {
          number: formattedPhone,
          textMessage: {
            text: message
          },
        });
        console.log('Mensagem enviada (formato alternativo):', data);
        toast.success('Mensagem enviada com sucesso!');
        return data;
      } catch (altError: any) {
        console.error('Erro no formato alternativo:', altError);
        toast.error(error.message || 'Erro ao enviar mensagem');
        throw error;
      }
    } finally {
      setLoading(false);
    }
  }, [config, makeRequest]);

  // Enviar mensagem com mídia
  const sendMedia = useCallback(async (
    phone: string, 
    mediaUrl: string, 
    mediaType: 'image' | 'video' | 'audio' | 'document',
    caption?: string,
    fileName?: string
  ) => {
    if (!config) throw new Error('Evolution API não configurada');

    setLoading(true);
    try {
      const formattedPhone = phone.replace(/\D/g, '');
      
      const endpoint = `/message/sendMedia/${config.instanceName}`;
      const data = await makeRequest(endpoint, 'POST', {
        number: formattedPhone,
        mediatype: mediaType,
        media: mediaUrl,
        caption: caption,
        fileName: fileName,
      });

      toast.success('Mídia enviada com sucesso!');
      return data;
    } catch (error: any) {
      console.error('Erro ao enviar mídia:', error);
      toast.error(error.message || 'Erro ao enviar mídia');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [config, makeRequest]);

  // Desconectar (logout) - força reset completo deletando e recriando instância
  const disconnect = useCallback(async () => {
    if (!config) return;

    if (statusInterval) {
      clearInterval(statusInterval);
      setStatusInterval(null);
    }

    try {
      // Primeiro tenta logout normal
      try {
        await makeRequest(`/instance/logout/${config.instanceName}`, 'DELETE');
      } catch (e) {
        console.log('Logout falhou, continuando com delete...');
      }
      
      // Deleta a instância para forçar novo QR na próxima conexão
      try {
        await makeRequest(`/instance/delete/${config.instanceName}`, 'DELETE');
      } catch (e) {
        console.log('Delete falhou:', e);
      }
      
      // Limpar sessão do estado e localStorage
      setSession(null);
      if (userId) {
        localStorage.removeItem(`${SESSION_STORAGE_KEY}_${userId}`);
      }
      toast.success('WhatsApp desconectado! Clique em "Conectar" para gerar novo QR Code.');
    } catch (error: any) {
      console.error('Erro ao desconectar:', error);
      setSession(null);
      if (userId) {
        localStorage.removeItem(`${SESSION_STORAGE_KEY}_${userId}`);
      }
      toast.success('WhatsApp desconectado');
    }
  }, [config, makeRequest, statusInterval, userId]);

  // Reiniciar instância
  const restartInstance = useCallback(async () => {
    if (!config) return;

    try {
      await makeRequest(`/instance/restart/${config.instanceName}`, 'POST');
      toast.success('Instância reiniciada');
      
      // Verificar status após reiniciar
      setTimeout(() => {
        connectInstance();
      }, 2000);
    } catch (error: any) {
      console.error('Erro ao reiniciar:', error);
      toast.error(error.message || 'Erro ao reiniciar');
    }
  }, [config, makeRequest, connectInstance]);

  // Deletar instância
  const deleteInstance = useCallback(async () => {
    if (!config) return;

    try {
      await makeRequest(`/instance/delete/${config.instanceName}`, 'DELETE');
      setSession(null);
      toast.success('Instância deletada');
    } catch (error: any) {
      console.error('Erro ao deletar instância:', error);
      toast.error(error.message || 'Erro ao deletar');
    }
  }, [config, makeRequest]);

  // Testar conexão com a API
  const testConnection = useCallback(async (testConfig?: EvolutionConfig) => {
    const cfg = testConfig || config;
    if (!cfg) {
      toast.error('Configure a Evolution API primeiro');
      return false;
    }

    try {
      const response = await fetch(`${cfg.apiUrl}/instance/fetchInstances`, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': cfg.apiKey,
        },
      });

      if (response.ok) {
        toast.success('Conexão com Evolution API estabelecida!');
        return true;
      } else {
        const error = await response.json();
        toast.error(error.message || 'Falha na autenticação');
        return false;
      }
    } catch (error: any) {
      console.error('Erro ao testar conexão:', error);
      toast.error('Não foi possível conectar à Evolution API');
      return false;
    }
  }, [config]);

  return {
    config,
    session,
    loading,
    connecting,
    saveConfig,
    loadConfig,
    testConnection,
    createInstance,
    connectInstance,
    checkStatus,
    sendMessage,
    sendMedia,
    disconnect,
    restartInstance,
    deleteInstance,
    isConnected: session?.status === 'connected',
    isConfigured: !!config,
  };
};
