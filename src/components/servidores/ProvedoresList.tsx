import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Check, Edit, Pause, RefreshCw, Trash2, Monitor, Plus, Lock } from "lucide-react";
import { ProviderConfig, Panel } from "@/config/provedores";

// Re-export types for backward compatibility
export type { ProviderConfig, Panel } from "@/config/provedores";
export { PROVEDORES } from "@/config/provedores";

interface ProvedoresListProps {
  filteredProvedores: ProviderConfig[];
  selectedProvider: string;
  onSelectProvider: (id: string) => void;
}

export function ProvedoresList({ filteredProvedores, selectedProvider, onSelectProvider }: ProvedoresListProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {filteredProvedores.map((provedor) => (
        <button
          key={provedor.id}
          onClick={() => onSelectProvider(provedor.id)}
          className={`px-4 py-2 text-xs font-medium rounded-md transition-all relative ${
            selectedProvider === provedor.id
              ? "bg-primary text-primary-foreground"
              : provedor.integrado
                ? "bg-secondary/80 text-secondary-foreground/70 border border-border/30 hover:bg-secondary hover:text-secondary-foreground"
                : "bg-secondary/40 text-muted-foreground/50 border border-border/20 cursor-default"
          }`}
        >
          {provedor.nome}
          {!provedor.integrado && (
            <Lock className="inline-block w-3 h-3 ml-1 opacity-50" />
          )}
        </button>
      ))}
    </div>
  );
}

interface ProviderCardProps {
  provider: ProviderConfig;
  stats: { total: number; ativos: number; inativos: number };
}

export function ProviderCard({ provider, stats }: ProviderCardProps) {
  if (!provider.integrado) {
    return (
      <div className="rounded-lg p-6 bg-card border border-border">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
              <Lock className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{provider.nome}</h3>
              <p className="text-sm text-muted-foreground">{provider.descricao}</p>
            </div>
          </div>
          <Badge variant="outline" className="text-amber-400 border-amber-400/50 bg-amber-400/10">
            Em breve
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          A integração com <span className="font-medium text-foreground">{provider.nome}</span> ainda não está disponível. Em breve você poderá configurar seus painéis aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg p-4 bg-card border border-border">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <Play className="w-4 h-4 text-white fill-white" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{provider.nome}</h3>
            <p className="text-sm text-muted-foreground">{provider.descricao}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="border border-primary/50 rounded-lg px-4 py-2 text-center min-w-[70px]">
            <div className="text-lg font-bold text-primary">{stats.total}</div>
            <div className="text-[10px] text-muted-foreground">Total</div>
          </div>
          <div className="border border-green-500/50 rounded-lg px-4 py-2 text-center min-w-[70px]">
            <div className="text-lg font-bold text-green-500">{stats.ativos}</div>
            <div className="text-[10px] text-muted-foreground">Ativos</div>
          </div>
          <div className="border border-destructive/50 bg-destructive/5 rounded-lg px-4 py-2 text-center min-w-[70px]">
            <div className="text-lg font-bold text-destructive">{stats.inativos}</div>
            <div className="text-[10px] text-muted-foreground">Inativos</div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PanelsListProps {
  panels: Panel[];
  providerName: string;
  isTestingConnection: boolean;
  onAddPanel: () => void;
  onEditPanel: (panel: Panel) => void;
  onToggleStatus: (id: string) => void;
  onTestPanel: (panel: Panel) => void;
  onDeletePanel: (panel: Panel) => void;
}

export function PanelsList({ 
  panels, 
  providerName, 
  isTestingConnection, 
  onAddPanel, 
  onEditPanel, 
  onToggleStatus, 
  onTestPanel, 
  onDeletePanel 
}: PanelsListProps) {
  if (panels.length === 0) {
    return (
      <div className="border-2 border-dashed border-border rounded-lg p-8 bg-card/50 min-h-[200px] flex flex-col items-center justify-center">
        <div className="w-14 h-14 bg-muted rounded-lg flex items-center justify-center mb-4">
          <Monitor className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="text-foreground font-medium mb-1">Nenhum painel configurado</p>
        <p className="text-sm text-muted-foreground mb-4">
          Configure seu <span className="text-primary">primeiro painel {providerName}</span> para começar
        </p>
        <Button onClick={onAddPanel} className="bg-green-500 hover:bg-green-600 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Painel {providerName}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-semibold text-foreground">Painéis Configurados</h3>
        <Button onClick={onAddPanel} size="sm" className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Painel
        </Button>
      </div>
      <div className="divide-y divide-border">
        {panels.map((p) => (
          <div key={p.id} className="flex items-center justify-between p-4">
            <div className="flex items-start gap-3">
              <div className={`w-6 h-6 ${p.status === 'Ativo' ? 'bg-green-500' : 'bg-muted'} rounded-full flex items-center justify-center mt-0.5`}>
                <Check className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-foreground font-medium">{p.nome}</div>
                <a href={p.url} target="_blank" rel="noreferrer" className="text-primary text-xs hover:underline">
                  {p.url}
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={p.status === 'Ativo' ? 'default' : 'secondary'} className={p.status === 'Ativo' ? 'bg-green-500 hover:bg-green-500' : ''}>
                {p.status}
              </Badge>
              <div className="flex gap-1">
                <Button onClick={() => onEditPanel(p)} variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary/80">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button onClick={() => onToggleStatus(p.id)} variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary/80">
                  {p.status === 'Ativo' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button onClick={() => onTestPanel(p)} title="Testar conexão" disabled={isTestingConnection} variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary/80">
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button onClick={() => onDeletePanel(p)} variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive/80">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
