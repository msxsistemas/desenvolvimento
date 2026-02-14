import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface WhatsAppSession {
  sessionId: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'failed';
  qrCode?: string;
  phoneNumber?: string;
  deviceName?: string;
}

interface WhatsAppMessage {
  id: string;
  sessionId: string;
  phone: string;
  message: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  messageId?: string;
  sentAt: string;
  deliveredAt?: string;
  readAt?: string;
  errorMessage?: string;
}

export const useWhatsApp = () => {
  const [session, setSession] = useState<WhatsAppSession | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Carregar sessão salva no localStorage
  useEffect(() => {
    const savedSessionId = localStorage.getItem('whatsapp_session');
    if (savedSessionId) {
      setSession({
        sessionId: savedSessionId,
        status: 'connected' // Assumir conectado se existe sessão salva
      });
    }
  }, []);

  // Gerar QR Code para conexão
  const generateQRCode = useCallback(async () => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-connection/generate-qr', {
        method: 'POST'
      });

      if (error) throw error;

      if (data.success) {
        setSession({
          sessionId: data.sessionId,
          status: 'connecting',
          qrCode: data.qr
        });

        // Salvar session no localStorage
        localStorage.setItem('whatsapp_session_data', JSON.stringify({
          sessionId: data.sessionId,
          status: 'connecting',
          qrCode: data.qr,
          timestamp: new Date().toISOString()
        }));

        return { qr: data.qr, sessionId: data.sessionId };
      } else {
        throw new Error(data.error || 'Erro ao gerar QR Code');
      }
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      setSession(null);
      throw error;
    } finally {
      setConnecting(false);
    }
  }, []);

  // Verificar status da conexão
  const checkConnectionStatus = useCallback(async (sessionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-connection/check-status', {
        method: 'POST',
        body: { sessionId }
      });

      if (error) throw error;

      if (data.connected && session?.sessionId === sessionId) {
        setSession(prev => prev ? { ...prev, status: 'connected' } : null);
        localStorage.setItem('whatsapp_session', sessionId);
        
        // Atualizar status no localStorage
        const sessionData = JSON.parse(localStorage.getItem('whatsapp_session_data') || '{}');
        localStorage.setItem('whatsapp_session_data', JSON.stringify({
          ...sessionData,
          status: 'connected',
          connectedAt: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        }));

        toast.success('WhatsApp conectado com sucesso!');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      return false;
    }
  }, [session?.sessionId]);

  // Enviar mensagem
  const sendMessage = useCallback(async (phone: string, message: string) => {
    if (!session || session.status !== 'connected') {
      throw new Error('WhatsApp não está conectado');
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-connection/send-message', {
        method: 'POST',
        body: { 
          sessionId: session.sessionId, 
          phone, 
          message 
        }
      });

      if (error) throw error;

      if (data.success) {
        // Adicionar mensagem ao estado local
        const newMessage: WhatsAppMessage = {
          id: data.messageId,
          sessionId: session.sessionId,
          phone,
          message,
          status: 'sent',
          messageId: data.messageId,
          sentAt: new Date().toISOString()
        };

        setMessages(prev => {
          const updatedMessages = [newMessage, ...prev];
          // Salvar mensagens no localStorage
          localStorage.setItem('whatsapp_messages', JSON.stringify(updatedMessages.slice(0, 50))); // Manter apenas 50 mensagens
          return updatedMessages;
        });

        toast.success('Mensagem enviada com sucesso!');
        return data.messageId;
      } else {
        throw new Error(data.error || 'Erro ao enviar mensagem');
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [session]);

  // Desconectar WhatsApp
  const disconnect = useCallback(async () => {
    if (!session) return;

    try {
      await supabase.functions.invoke('whatsapp-connection/disconnect', {
        method: 'POST',
        body: { sessionId: session.sessionId }
      });

      // Atualizar status no localStorage
      localStorage.setItem('whatsapp_session_data', JSON.stringify({
        sessionId: session.sessionId,
        status: 'disconnected',
        disconnectedAt: new Date().toISOString()
      }));

      setSession(null);
      localStorage.removeItem('whatsapp_session');
      toast.success('WhatsApp desconectado');
    } catch (error) {
      console.error('Erro ao desconectar:', error);
      toast.error('Erro ao desconectar WhatsApp');
    }
  }, [session]);

  // Buscar mensagens do usuário
  const loadMessages = useCallback(async () => {
    try {
      // Carregar mensagens do localStorage
      const savedMessages = localStorage.getItem('whatsapp_messages');
      if (savedMessages) {
        const messages = JSON.parse(savedMessages);
        setMessages(messages || []);
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  }, []);

  // Enviar mensagem para múltiplos contatos (respeitando configurações de envio)
  const sendBulkMessages = useCallback(async (contacts: Array<{ phone: string; message: string; name?: string }>) => {
    if (!session || session.status !== 'connected') {
      throw new Error('WhatsApp não está conectado');
    }

    // Carregar configurações de envio do Supabase
    const defaultCfg = { tempoMinimo: 10, tempoMaximo: 10, limiteLote: 10, pausaProlongada: 15, limiteDiario: '', variarIntervalo: true };
    let cfg = defaultCfg;
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.id) {
        const { data: envioData } = await supabase
          .from('envio_config')
          .select('*')
          .eq('user_id', userData.user.id)
          .maybeSingle();
        if (envioData) {
          cfg = {
            tempoMinimo: envioData.tempo_minimo,
            tempoMaximo: envioData.tempo_maximo,
            limiteLote: envioData.limite_lote,
            pausaProlongada: envioData.pausa_prolongada,
            limiteDiario: envioData.limite_diario != null ? String(envioData.limite_diario) : '',
            variarIntervalo: envioData.variar_intervalo,
          };
        }
      }
    } catch { /* use defaults */ }

    // Checar limite diário
    const dailyLimit = cfg.limiteDiario ? Number(cfg.limiteDiario) : Infinity;
    const contactsToSend = contacts.slice(0, dailyLimit);

    const results = [];
    setLoading(true);

    try {
      for (let i = 0; i < contactsToSend.length; i++) {
        const contact = contactsToSend[i];
        
        try {
          const messageId = await sendMessage(contact.phone, contact.message);
          results.push({ 
            phone: contact.phone, 
            name: contact.name,
            success: true, 
            messageId 
          });
        } catch (error) {
          results.push({ 
            phone: contact.phone, 
            name: contact.name,
            success: false, 
            error: (error as Error).message 
          });
        }

        // Delay entre mensagens
        if (i < contactsToSend.length - 1) {
          // Verificar se atingiu limite do lote → pausa prolongada
          if ((i + 1) % cfg.limiteLote === 0) {
            await new Promise(resolve => setTimeout(resolve, cfg.pausaProlongada * 1000));
          } else {
            // Intervalo normal (variado ou fixo)
            const delay = cfg.variarIntervalo
              ? (cfg.tempoMinimo + Math.random() * (cfg.tempoMaximo - cfg.tempoMinimo)) * 1000
              : cfg.tempoMinimo * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      const successCount = results.filter(r => r.success).length;
      toast.success(`${successCount}/${contactsToSend.length} mensagens enviadas com sucesso!`);
      
      return results;
    } finally {
      setLoading(false);
    }
  }, [session, sendMessage]);

  return {
    session,
    messages,
    loading,
    connecting,
    generateQRCode,
    checkConnectionStatus,
    sendMessage,
    sendBulkMessages,
    disconnect,
    loadMessages,
    isConnected: session?.status === 'connected'
  };
};