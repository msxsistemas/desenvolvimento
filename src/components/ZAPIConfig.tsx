import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Settings, Save, Eye, EyeOff, ExternalLink } from 'lucide-react';

interface ZAPIConfigProps {
  onSave: (config: { instanceId: string; token: string; clientToken: string }) => Promise<boolean>;
  currentConfig?: { instanceId: string; token: string; clientToken: string } | null;
}

export default function ZAPIConfig({ onSave, currentConfig }: ZAPIConfigProps) {
  const [instanceId, setInstanceId] = useState(currentConfig?.instanceId || '');
  const [token, setToken] = useState(currentConfig?.token || '');
  const [clientToken, setClientToken] = useState(currentConfig?.clientToken || '');
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showClientToken, setShowClientToken] = useState(false);

  useEffect(() => {
    if (currentConfig) {
      setInstanceId(currentConfig.instanceId || '');
      setToken(currentConfig.token || '');
      setClientToken(currentConfig.clientToken || '');
    }
  }, [currentConfig]);

  const handleSave = async () => {
    if (!instanceId || !token || !clientToken) return;
    setSaving(true);
    try {
      await onSave({ instanceId, token, clientToken });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configuração Z-API
          <Badge className="bg-primary/10 text-primary text-xs">WhatsApp</Badge>
        </CardTitle>
        <CardDescription>
          Configure suas credenciais da Z-API para conectar o WhatsApp
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="zapi-instance-id">Instance ID *</Label>
          <Input
            id="zapi-instance-id"
            value={instanceId}
            onChange={(e) => setInstanceId(e.target.value)}
            placeholder="Seu Instance ID da Z-API"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="zapi-token">Token *</Label>
          <div className="relative">
            <Input
              id="zapi-token"
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Seu Token da Z-API"
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowToken(!showToken)}
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="zapi-client-token">Client Token *</Label>
          <div className="relative">
            <Input
              id="zapi-client-token"
              type={showClientToken ? 'text' : 'password'}
              value={clientToken}
              onChange={(e) => setClientToken(e.target.value)}
              placeholder="Seu Client Token da Z-API"
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowClientToken(!showClientToken)}
            >
              {showClientToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving || !instanceId || !token || !clientToken}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Salvando...' : 'Salvar Configuração'}
        </Button>

        <div className="bg-primary/10 p-4 rounded-lg space-y-2">
          <h4 className="font-semibold text-primary flex items-center gap-2">
            📚 Como obter as credenciais Z-API
          </h4>
          <ul className="text-sm text-primary/80 space-y-1">
            <li>1. Acesse o painel da Z-API</li>
            <li>2. Crie ou selecione uma instância</li>
            <li>3. Copie o Instance ID, Token e Client Token</li>
            <li>4. Cole os valores nos campos acima</li>
          </ul>
          <a
            href="https://developer.z-api.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
          >
            <ExternalLink className="h-3 w-3" />
            Documentação Z-API
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
