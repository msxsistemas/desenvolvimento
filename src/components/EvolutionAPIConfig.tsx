import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Settings, Save, TestTube, ExternalLink, Eye, EyeOff } from 'lucide-react';

interface EvolutionAPIConfigProps {
  onSave: (config: { apiUrl: string; apiKey: string; instanceName: string }) => Promise<boolean>;
  onTest: (config: { apiUrl: string; apiKey: string; instanceName: string }) => Promise<boolean>;
  currentConfig?: { apiUrl: string; apiKey: string; instanceName: string } | null;
}

export default function EvolutionAPIConfig({ onSave, onTest, currentConfig }: EvolutionAPIConfigProps) {
  const [apiUrl, setApiUrl] = useState(currentConfig?.apiUrl || '');
  const [apiKey, setApiKey] = useState(currentConfig?.apiKey || '');
  const [instanceName, setInstanceName] = useState(currentConfig?.instanceName || '');
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    if (currentConfig) {
      setApiUrl(currentConfig.apiUrl || '');
      setApiKey(currentConfig.apiKey || '');
      setInstanceName(currentConfig.instanceName || '');
    }
  }, [currentConfig]);

  const handleSave = async () => {
    if (!apiUrl || !apiKey || !instanceName) {
      return;
    }

    setSaving(true);
    try {
      await onSave({
        apiUrl: apiUrl.replace(/\/$/, ''),
        apiKey,
        instanceName,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!apiUrl || !apiKey) {
      return;
    }

    setTesting(true);
    try {
      await onTest({
        apiUrl: apiUrl.replace(/\/$/, ''),
        apiKey,
        instanceName,
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configuração Evolution API
          <Badge variant="secondary" className="bg-green-100 text-green-800">v2</Badge>
        </CardTitle>
        <CardDescription>
          Configure sua Evolution API para conectar o WhatsApp
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="api-url">URL da Evolution API *</Label>
            <Input
              id="api-url"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://sua-evolution-api.com"
            />
            <p className="text-xs text-muted-foreground">
              Ex: https://api.evolution.com.br
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-key">API Key (Global Token) *</Label>
            <div className="relative">
              <Input
                id="api-key"
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Sua chave de API"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Token de autenticação da Evolution API
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="instance-name">Nome da Instância *</Label>
          <Input
            id="instance-name"
            value={instanceName}
            onChange={(e) => setInstanceName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
            placeholder="minha-instancia"
          />
          <p className="text-xs text-muted-foreground">
            Nome único para sua conexão WhatsApp (sem espaços ou caracteres especiais)
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={handleSave} 
            disabled={saving || !apiUrl || !apiKey || !instanceName}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Salvando...' : 'Salvar Configuração'}
          </Button>
          
          <Button 
            onClick={handleTest} 
            variant="outline" 
            disabled={testing || !apiUrl || !apiKey}
            className="flex items-center gap-2"
          >
            <TestTube className="h-4 w-4" />
            {testing ? 'Testando...' : 'Testar Conexão'}
          </Button>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg space-y-2">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
            📚 Como obter a Evolution API
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>1. Acesse a documentação oficial da Evolution API</li>
            <li>2. Faça o deploy da API em seu servidor (VPS, Docker, etc.)</li>
            <li>3. Configure o Global API Key no arquivo de configuração</li>
            <li>4. Copie a URL e o API Key para os campos acima</li>
          </ul>
          <a 
            href="https://doc.evolution-api.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-2"
          >
            <ExternalLink className="h-3 w-3" />
            Documentação Evolution API
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
