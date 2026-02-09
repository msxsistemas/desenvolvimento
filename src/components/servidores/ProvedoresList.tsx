import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Check, Edit, Pause, RefreshCw, Trash2, Monitor, Plus } from "lucide-react";

// Lista de provedores IPTV disponíveis
export const PROVEDORES = [
  { id: 'playfast', nome: 'PLAYFAST', descricao: 'Painel IPTV Playfast' },
  { id: 'koffice-api', nome: 'KOFFICE API', descricao: 'Integração kOfficePanel API' },
  { id: 'koffice-v2', nome: 'KOFFICE V2', descricao: 'Painel kOffice versão 2' },
  { id: 'sigma-v2', nome: 'SIGMA/QPANEL V2 (NOVO)', descricao: 'Painel Sigma/QPanel versão 2' },
  { id: 'sigma-backup', nome: 'SIGMA BACKUP', descricao: 'Backup do Painel Sigma' },
  { id: 'now', nome: 'NOW', descricao: 'Painel NOW IPTV' },
  { id: 'thebest', nome: 'THEBEST', descricao: 'Painel TheBest IPTV' },
  { id: 'wplay', nome: 'WPLAY', descricao: 'Painel WPlay IPTV' },
  { id: 'natv', nome: 'NATV', descricao: 'Painel NATV' },
  { id: 'uniplay', nome: 'UNIPLAY E FRANQUIAS', descricao: 'Painel Uniplay e Franquias' },
  { id: 'tvs', nome: 'TVS E FRANQUIAS', descricao: 'Painel TVS e Franquias' },
  { id: 'mundogf', nome: 'MUNDOGF E FRANQUIAS', descricao: 'Painel MundoGF e Franquias' },
  { id: 'painelfoda', nome: 'PAINELFODA', descricao: 'Painel Foda IPTV' },
  { id: 'centralp2braz', nome: 'CENTRALP2BRAZ', descricao: 'Painel CentralP2Braz' },
  { id: 'clubtv', nome: 'CLUBTV', descricao: 'Painel ClubTV' },
  { id: 'easyplay', nome: 'EASYPLAY', descricao: 'Painel EasyPlay' },
  { id: 'blade', nome: 'BLADE', descricao: 'Painel Blade IPTV' },
  { id: 'live21', nome: 'LIVE21', descricao: 'Painel Live21' },
  { id: 'elite-office', nome: 'ELITE OFFICE', descricao: 'Painel Elite Office' },
  { id: 'unitv', nome: 'UNITV', descricao: 'Painel UniTV' },
];

export interface Panel {
  id: string;
  nome: string;
  url: string;
  usuario: string;
  senha: string;
  status: 'Ativo' | 'Inativo';
  autoRenovacao: boolean;
  provedor?: string;
}

interface ProvedoresListProps {
  filteredProvedores: typeof PROVEDORES;
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
          className={`px-4 py-2 text-xs font-medium rounded-md transition-all ${
            selectedProvider === provedor.id
              ? "bg-primary text-primary-foreground"
              : "bg-secondary/80 text-secondary-foreground/70 border border-border/30 hover:bg-secondary hover:text-secondary-foreground"
          }`}
        >
          {provedor.nome}
        </button>
      ))}
    </div>
  );
}

interface ProviderCardProps {
  provider: typeof PROVEDORES[0];
  stats: { total: number; ativos: number; inativos: number };
}

export function ProviderCard({ provider, stats }: ProviderCardProps) {
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

        {/* Estatísticas */}
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
                <Button onClick={() => onEditPanel(p)} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button onClick={() => onToggleStatus(p.id)} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10">
                  {p.status === 'Ativo' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button onClick={() => onTestPanel(p)} title="Testar conexão" disabled={isTestingConnection} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10">
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button onClick={() => onDeletePanel(p)} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
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
