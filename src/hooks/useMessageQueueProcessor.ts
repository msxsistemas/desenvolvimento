import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from './useCurrentUser';

interface EnvioConfig {
  configuracoes_ativas: boolean;
  tempo_minimo: number;
  tempo_maximo: number;
  limite_lote: number;
  pausa_prolongada: number;
  limite_diario: number | null;
  variar_intervalo: boolean;
}

const DEFAULT_CONFIG: EnvioConfig = {
  configuracoes_ativas: false,
  tempo_minimo: 10,
  tempo_maximo: 15,
  limite_lote: 10,
  pausa_prolongada: 15,
  limite_diario: null,
  variar_intervalo: true,
};

function getRandomInterval(min: number, max: number): number {
  return (Math.floor(Math.random() * (max - min + 1)) + min) * 1000;
}

/**
 * Processes scheduled/pending WhatsApp messages ONLY when they exist in the queue.
 * Uses Supabase realtime to detect new messages instead of constant polling.
 */
export const useMessageQueueProcessor = () => {
  const { userId } = useCurrentUser();
  const processingRef = useRef(false);
  const batchCountRef = useRef(0);
  const pausingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const configRef = useRef<EnvioConfig>(DEFAULT_CONFIG);
  const dailySentRef = useRef(0);
  const lastDayRef = useRef<string>('');
  const activeRef = useRef(false);

  const clearScheduled = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const sendMessageDirect = useCallback(async (phone: string, message: string) => {
    const digitsOnly = phone.replace(/\D/g, '');
    const normalizedPhone = !digitsOnly.startsWith('55') && digitsOnly.length >= 10
      ? '55' + digitsOnly
      : digitsOnly;

    const { data, error } = await supabase.functions.invoke('evolution-api', {
      body: { action: 'sendMessage', phone: normalizedPhone, message },
    });

    if (error) throw new Error(error.message || 'Erro ao enviar mensagem');
    if (data?.error) {
      const errorStr = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
      if (errorStr.toLowerCase().includes('connection closed') || errorStr.toLowerCase().includes('not connected')) {
        console.warn('[QueueProcessor] WhatsApp desconectado detectado');
        await supabase
          .from('whatsapp_sessions')
          .update({ status: 'disconnected', last_activity: new Date().toISOString() })
          .eq('user_id', userId || '');
      }
      throw new Error(errorStr);
    }
    return data;
  }, [userId]);

  const checkIsConnected = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    try {
      const { data } = await supabase
        .from('whatsapp_sessions')
        .select('status')
        .eq('user_id', userId)
        .maybeSingle();
      return data?.status === 'connected';
    } catch {
      return false;
    }
  }, [userId]);

  const loadConfig = useCallback(async () => {
    if (!userId) return;
    try {
      const { data } = await supabase
        .from('envio_config')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (data && data.configuracoes_ativas) {
        configRef.current = {
          configuracoes_ativas: data.configuracoes_ativas,
          tempo_minimo: data.tempo_minimo,
          tempo_maximo: data.tempo_maximo,
          limite_lote: data.limite_lote,
          pausa_prolongada: data.pausa_prolongada,
          limite_diario: data.limite_diario,
          variar_intervalo: data.variar_intervalo,
        };
      } else {
        configRef.current = DEFAULT_CONFIG;
      }
    } catch {
      configRef.current = DEFAULT_CONFIG;
    }
  }, [userId]);

  const processNext = useCallback(async (): Promise<boolean> => {
    if (!userId || processingRef.current || pausingRef.current) return false;

    const connected = await checkIsConnected();
    if (!connected) return false;

    const config = configRef.current;
    const today = new Date().toISOString().slice(0, 10);
    if (lastDayRef.current !== today) {
      lastDayRef.current = today;
      dailySentRef.current = 0;
    }

    if (config.limite_diario && dailySentRef.current >= config.limite_diario) return false;

    try {
      const agora = new Date().toISOString();
      const { data: pendentes, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['pending', 'scheduled'])
        .or(`scheduled_for.is.null,scheduled_for.lte.${agora}`)
        .order('created_at', { ascending: true })
        .limit(1);

      if (error || !pendentes || pendentes.length === 0) return false;

      const msg = pendentes[0];
      processingRef.current = true;

      try {
        await sendMessageDirect(msg.phone, msg.message);
        await supabase
          .from('whatsapp_messages')
          .update({ status: 'sent', scheduled_for: null })
          .eq('id', msg.id);
        console.log(`[QueueProcessor] Mensagem enviada para ${msg.phone}`);

        batchCountRef.current++;
        dailySentRef.current++;

        if (batchCountRef.current >= config.limite_lote) {
          batchCountRef.current = 0;
          pausingRef.current = true;
          console.log(`[QueueProcessor] Lote atingido, pausando ${config.pausa_prolongada}s`);
          setTimeout(() => { pausingRef.current = false; }, config.pausa_prolongada * 1000);
        }
        return true;
      } catch (err) {
        console.error(`[QueueProcessor] Erro ao enviar para ${msg.phone}:`, err);
        await supabase
          .from('whatsapp_messages')
          .update({ status: 'failed', error_message: String(err), scheduled_for: null })
          .eq('id', msg.id);
        return true;
      } finally {
        processingRef.current = false;
      }
    } catch (e) {
      console.error('[QueueProcessor] Erro geral:', e);
      processingRef.current = false;
      return false;
    }
  }, [userId, sendMessageDirect, checkIsConnected]);

  // Start processing loop - only called when we know there are messages
  const startProcessingLoop = useCallback(() => {
    if (activeRef.current) return;
    activeRef.current = true;
    console.log('[QueueProcessor] Iniciando processamento da fila');

    const scheduleNext = async () => {
      const hadWork = await processNext();
      if (hadWork) {
        // There might be more messages, continue with configured delay
        const config = configRef.current;
        const delay = config.configuracoes_ativas
          ? getRandomInterval(config.tempo_minimo, config.tempo_maximo)
          : 5000;
        timeoutRef.current = setTimeout(scheduleNext, delay);
      } else {
        // No more messages, stop the loop
        activeRef.current = false;
        console.log('[QueueProcessor] Fila vazia, aguardando novas mensagens');
      }
    };

    scheduleNext();
  }, [processNext]);

  useEffect(() => {
    if (!userId) return;

    loadConfig();

    // Subscribe to new pending/scheduled messages via realtime
    const channel = supabase
      .channel('queue-processor')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const status = (payload.new as any)?.status;
          if (status === 'pending' || status === 'scheduled') {
            console.log('[QueueProcessor] Nova mensagem detectada na fila');
            startProcessingLoop();
          }
        }
      )
      .subscribe();

    // One-time initial check for any pending messages left over
    const checkInitial = async () => {
      const { data } = await supabase
        .from('whatsapp_messages')
        .select('id')
        .eq('user_id', userId)
        .in('status', ['pending', 'scheduled'])
        .limit(1);

      if (data && data.length > 0) {
        startProcessingLoop();
      }
    };

    checkInitial();

    return () => {
      supabase.removeChannel(channel);
      clearScheduled();
      activeRef.current = false;
    };
  }, [userId, loadConfig, startProcessingLoop]);
};
