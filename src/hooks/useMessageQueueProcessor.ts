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
 * Global hook that processes scheduled/pending WhatsApp messages in the background,
 * respecting the user's envio_config (intervals, batch limits, pauses).
 * Does NOT use useEvolutionAPISimple to avoid hook count issues.
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

  const sendMessageDirect = useCallback(async (phone: string, message: string) => {
    // Normalize phone
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
      // Detect connection lost errors and update session status in DB
      if (errorStr.toLowerCase().includes('connection closed') || errorStr.toLowerCase().includes('not connected')) {
        console.warn('[QueueProcessor] WhatsApp desconectado detectado, atualizando status no banco');
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
      // Check DB status first (fast, no API call)
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

  const processNext = useCallback(async () => {
    if (!userId || processingRef.current || pausingRef.current) return;

    // Check connection status from DB
    const connected = await checkIsConnected();
    if (!connected) return;

    const config = configRef.current;

    const today = new Date().toISOString().slice(0, 10);
    if (lastDayRef.current !== today) {
      lastDayRef.current = today;
      dailySentRef.current = 0;
    }

    if (config.limite_diario && dailySentRef.current >= config.limite_diario) return;

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

      if (error || !pendentes || pendentes.length === 0) return;

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
      } catch (err) {
        console.error(`[QueueProcessor] Erro ao enviar para ${msg.phone}:`, err);
        await supabase
          .from('whatsapp_messages')
          .update({ status: 'failed', error_message: String(err), scheduled_for: null })
          .eq('id', msg.id);
      } finally {
        processingRef.current = false;
      }
    } catch (e) {
      console.error('[QueueProcessor] Erro geral:', e);
      processingRef.current = false;
    }
  }, [userId, sendMessageDirect, checkIsConnected]);

  useEffect(() => {
    if (!userId) return;

    loadConfig();
    const configInterval = setInterval(loadConfig, 60000);

    const scheduleNext = () => {
      const config = configRef.current;
      const delay = config.configuracoes_ativas
        ? getRandomInterval(config.tempo_minimo, config.tempo_maximo)
        : 5000;

      timeoutRef.current = setTimeout(async () => {
        await processNext();
        scheduleNext();
      }, delay);
    };

    processNext();
    scheduleNext();

    return () => {
      clearInterval(configInterval);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [userId, loadConfig, processNext]);
};
