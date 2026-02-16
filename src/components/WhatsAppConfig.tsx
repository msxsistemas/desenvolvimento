import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Settings, Save, TestTube } from 'lucide-react';
import { toast } from 'sonner';
import { InlineError } from '@/components/ui/inline-error';
import { supabase } from '@/lib/supabase';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface WhatsAppConfigProps {
  onConfigSave: (config: { apiUrl: string; apiKey?: string; instanceName?: string }) => void;
  currentConfig?: { apiUrl: string; apiKey?: string; instanceName?: string };
}

export default function WhatsAppConfig({ onConfigSave, currentConfig }: WhatsAppConfigProps) {
  const { userId } = useCurrentUser();
  const [apiUrl, setApiUrl] = useState(currentConfig?.apiUrl || '');
  const [apiKey, setApiKey] = useState(currentConfig?.apiKey || '');
  const [instanceName, setInstanceName] = useState(currentConfig?.instanceName || 'default');
  const [testing, setTesting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const applyData = (sessionData: Record<string, unknown>) => {
    setApiUrl(String(sessionData.apiUrl || ''));
    setApiKey(String(sessionData.apiKey || ''));
    setInstanceName(String(sessionData.instanceName || 'default'));
  };

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from('whatsapp_sessions')
        .select('session_data')
        .eq('user_id', userId)
        .eq('session_id', 'api_config')
        .maybeSingle();
      if (data?.session_data) {
        applyData(data.session_data as Record<string, unknown>);
      }
    })();

    // Realtime subscription for cross-tab/device sync
    const channel = supabase
      .channel('whatsapp_config_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_sessions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (
            payload.new &&
            typeof payload.new === 'object' &&
            'session_id' in payload.new &&
            payload.new.session_id === 'api_config' &&
            'session_data' in payload.new
          ) {
            applyData(payload.new.session_data as Record<string, unknown>);
            toast.info('Configuração de WhatsApp atualizada em outro dispositivo');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleSave = async () => {
    if (!apiUrl) {
      setFormError('URL da API é obrigatória');
      return;
    }
    setFormError(null);

    const config = {
      apiUrl: apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl,
      apiKey: apiKey || undefined,
      instanceName: instanceName || 'default'
    };

    if (userId) {
      try {
        const { data: existing } = await supabase
          .from('whatsapp_sessions')
          .select('id')
          .eq('user_id', userId)
          .eq('session_id', 'api_config')
          .maybeSingle();

        if (existing) {
          await supabase
            .from('whatsapp_sessions')
            .update({ session_data: config, updated_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('session_id', 'api_config');
        } else {
          await supabase
            .from('whatsapp_sessions')
            .insert([{
              user_id: userId,
              session_id: 'api_config',
              status: 'config',
              session_data: config,
            }]);
        }
      } catch (err) {
        console.error('Erro ao salvar config WhatsApp no Supabase:', err);
      }
    }

    onConfigSave(config);
    toast.success('Configuração salva com sucesso!');
  };

  const testConnection = async () => {
    if (!apiUrl) {
      toast.error('Configure a URL da API primeiro');
      return;
    }

    setTesting(true);
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      };

      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const testUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
      
      const testEndpoints = [
        '/instances',
        '/instance', 
        '/health',
        '/status',
        '/api/status',
        '/docs',
        '/swagger',
        '/',
      ];

      let connected = false;
      const availableEndpoints = [];
      
      for (const endpoint of testEndpoints) {
        try {
          const response = await fetch(`${testUrl}${endpoint}`, {
            method: 'GET',
            headers,
          });
          
          if (response.ok) {
            connected = true;
            availableEndpoints.push(endpoint);
            
            if (endpoint === '/instances') {
              const data = await response.json();
              console.log('Resposta do /instances:', data);
            }
          }
        } catch {
          // Continuar tentando outros endpoints
        }
      }

      console.log('Endpoints disponíveis encontrados:', availableEndpoints);

      if (connected) {
        toast.success('✅ Conexão com a API estabelecida!');
      } else {
        toast.error('❌ Não foi possível conectar com a API. Verifique a URL e credenciais.');
      }
    } catch (error: any) {
      toast.error('Erro ao testar conexão: ' + error.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configuração da API WhatsApp
          <Badge variant="outline" className="text-xs">Personalizada</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure sua API de WhatsApp (Evolution API, Baileys, etc.)
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="api-url">URL da API *</Label>
              <Input
                id="api-url"
                required
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="http://localhost:8080 ou https://suaapi.com"
              />
              <p className="text-xs text-muted-foreground">
                URL base da sua API de WhatsApp
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="api-key">API Key (opcional)</Label>
              <Input
                id="api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Sua chave de API"
              />
              <p className="text-xs text-muted-foreground">
                Token de autenticação se necessário
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instance-name">Nome da Instância</Label>
            <Input
              id="instance-name"
              value={instanceName}
              onChange={(e) => setInstanceName(e.target.value)}
              placeholder="default"
            />
            <p className="text-xs text-muted-foreground">
              Nome da instância WhatsApp na sua API
            </p>
          </div>

          <InlineError message={formError} />

          <div className="flex gap-2">
            <Button type="submit" className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Salvar Configuração
            </Button>
            
            <Button 
              type="button"
              onClick={testConnection} 
              variant="outline" 
              disabled={testing || !apiUrl}
              className="flex items-center gap-2"
            >
              <TestTube className="h-4 w-4" />
              {testing ? 'Testando...' : 'Testar Conexão'}
            </Button>
          </div>
        </form>

        <div className="bg-muted/50 p-3 rounded-lg mt-4">
          <p className="text-xs text-muted-foreground">
            <strong>📋 APIs Suportadas:</strong><br />
            • Evolution API<br />
            • Baileys<br />
            • WhatsApp Web JS<br />
            • Outras APIs compatíveis
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
