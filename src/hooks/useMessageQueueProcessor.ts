import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from './useCurrentUser';
import { useEvolutionAPISimple } from './useEvolutionAPISimple';

/**
 * Global hook that processes scheduled/pending WhatsApp messages in the background.
 * Should be mounted once at the app layout level.
 */
export const useMessageQueueProcessor = () => {
  const { userId } = useCurrentUser();
  const { sendMessage, isConnected, hydrated } = useEvolutionAPISimple();
  const processingRef = useRef(false);

  useEffect(() => {
    if (!userId || !hydrated || !isConnected) return;

    const processNext = async () => {
      if (processingRef.current) return;

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
          await sendMessage(msg.phone, msg.message);
          await supabase
            .from('whatsapp_messages')
            .update({ status: 'sent', scheduled_for: null })
            .eq('id', msg.id);
          console.log(`[QueueProcessor] Mensagem enviada para ${msg.phone}`);
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
    };

    const interval = setInterval(processNext, 5000);
    processNext();

    return () => clearInterval(interval);
  }, [userId, hydrated, isConnected, sendMessage]);
};
