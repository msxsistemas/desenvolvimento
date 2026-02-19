import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useWoovi = () => {
  const [isConfigured, setIsConfigured] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkConfiguration = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('woovi-integration', {
        body: { action: 'check' },
      });
      setIsConfigured(!error && !!data?.configured);
    } catch {
      setIsConfigured(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkConfiguration();
  }, [checkConfiguration]);

  return { isConfigured, loading };
};
