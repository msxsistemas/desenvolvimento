import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Info, Shield, Eye, CheckCircle, XCircle, Edit, Pause, RefreshCw, Trash2, Check, Play, Search, Monitor, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Lista de provedores IPTV disponíveis
const PROVEDORES = [
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

export default function ClientesIntegracoes() {
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [autoRenewal, setAutoRenewal] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('playfast');
  
  const [testResultModal, setTestResultModal] = useState<{
    isOpen: boolean;
    success: boolean;
    message: string;
    details?: string;
    type?: 'sigma' | 'koffice';
  }>({
    isOpen: false,
    success: false,
    message: "",
    details: "",
    type: 'sigma'
  });
  
  const [formData, setFormData] = useState({
    nomePainel: "",
    urlPainel: "",
    usuario: "",
    senha: ""
  });

  // kOfficePanel form data
  const [kofficeFormData, setKofficeFormData] = useState({
    nomeServidor: "",
    linkPainel: "",
    usuario: "",
    chaveApi: ""
  });
  const [isKofficeModalOpen, setIsKofficeModalOpen] = useState(false);
  const [isTestingKoffice, setIsTestingKoffice] = useState(false);
  const [kofficeIntegrations, setKofficeIntegrations] = useState<Array<{
    id: string;
    nomeServidor: string;
    linkPainel: string;
    usuario: string;
    chaveApi: string;
  }>>([]);

  // Testar conexão kOfficePanel API
  const handleTestKofficeConnection = async () => {
    if (!kofficeFormData.linkPainel.trim() || !kofficeFormData.usuario.trim() || !kofficeFormData.chaveApi.trim()) {
      setTestResultModal({
        isOpen: true,
        success: false,
        message: "Dados Obrigatórios Ausentes",
        details: "❌ Preencha Link do Painel, Usuário e Chave API antes de testar.",
        type: 'koffice'
      });
      return;
    }

    setIsTestingKoffice(true);
    try {
      const baseUrl = kofficeFormData.linkPainel.trim().replace(/\/$/, '');
      
      const response = await fetch(`${baseUrl}/api.php?action=user&sub=info&username=${encodeURIComponent(kofficeFormData.usuario)}&password=${encodeURIComponent(kofficeFormData.chaveApi)}`, {
        method: "GET",
        headers: {
          "Accept": "application/json"
        }
      });

      const data = await response.json();

      if (response.ok && (data?.result === true || data?.user_data || data?.status === 'success' || !data?.error)) {
        setTestResultModal({
          isOpen: true,
          success: true,
          message: "CONEXÃO kOfficePanel BEM-SUCEDIDA!",
          details: `✅ Servidor: ${kofficeFormData.nomeServidor || 'N/A'}\n🔗 Endpoint: ${baseUrl}/api.php\n👤 Usuário: ${kofficeFormData.usuario}\n📡 Status: OK\n\n${data?.user_data ? `Dados recebidos: ${JSON.stringify(data.user_data).slice(0, 100)}...` : 'API respondeu com sucesso!'}`,
          type: 'koffice'
        });
      } else {
        setTestResultModal({
          isOpen: true,
          success: false,
          message: "FALHA NA AUTENTICAÇÃO kOfficePanel",
          details: data?.message || data?.error || "Usuário/Chave API inválidos ou URL incorreta.",
          type: 'koffice'
        });
      }
    } catch (error: any) {
      setTestResultModal({
        isOpen: true,
        success: false,
        message: "Erro no Teste kOfficePanel",
        details: `Erro inesperado durante o teste: ${error.message}\n\nVerifique se a URL está correta e acessível.`,
        type: 'koffice'
      });
    } finally {
      setIsTestingKoffice(false);
    }
  };

  const { toast, dismiss } = useToast();

  const [panels, setPanels] = useState<Array<{
    id: string;
    nome: string;
    url: string;
    usuario: string;
    senha: string;
    status: 'Ativo' | 'Inativo';
    autoRenovacao: boolean;
    provedor?: string;
  }>>([]);

  const [createResultModal, setCreateResultModal] = useState<{ isOpen: boolean; message: string }>({
    isOpen: false,
    message: "",
  });

  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; panel: { id: string; nome: string } | null }>({
    isOpen: false,
    panel: null,
  });

  useEffect(() => {
    document.title = "Clientes - Integrações | Gestor Tech Play";
    loadPanels();
  }, []);

  // Carregar painéis do banco de dados
  const loadPanels = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      const { data, error } = await supabase
        .from('paineis_integracao' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setPanels(data.map((p: any) => ({
          id: String(p.id),
          nome: p.nome,
          url: p.url,
          usuario: p.usuario,
          senha: p.senha,
          status: p.status as 'Ativo' | 'Inativo',
          autoRenovacao: p.auto_renovacao,
          provedor: p.provedor || 'playfast'
        })));
      }
    } catch (error: any) {
      console.error('Erro ao carregar painéis:', error);
      toast({ title: "Erro", description: "Não foi possível carregar os painéis" });
    }
  };

  const handleCreatePanel = async () => {
    const baseUrl = formData.urlPainel.trim().replace(/\/$/, "");
    if (!formData.nomePainel.trim() || !formData.usuario.trim() || !formData.senha.trim() || !baseUrl) {
      toast({ title: "Campos obrigatórios", description: "Preencha todos os campos marcados com *" });
      return;
    }
    const urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(baseUrl)) {
      toast({ title: "URL inválida", description: "Informe uma URL válida iniciando com http:// ou https://" });
      return;
    }

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast({ title: "Erro", description: "Você precisa estar logado" });
        return;
      }

      const { data, error } = await supabase
        .from('paineis_integracao' as any)
        .insert([{
          user_id: session.session.user.id,
          nome: formData.nomePainel.trim(),
          url: baseUrl,
          usuario: formData.usuario.trim(),
          senha: formData.senha.trim(),
          status: 'Ativo',
          auto_renovacao: autoRenewal
        }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setPanels((prev) => [...prev, {
          id: String((data as any).id),
          nome: (data as any).nome,
          url: (data as any).url,
          usuario: (data as any).usuario,
          senha: (data as any).senha,
          status: (data as any).status as 'Ativo' | 'Inativo',
          autoRenovacao: (data as any).auto_renovacao,
          provedor: selectedProvider
        }]);
      }

      setCreateResultModal({ isOpen: true, message: `Painel '${formData.nomePainel}' criado com sucesso!` });
      setFormData({ nomePainel: "", urlPainel: "", usuario: "", senha: "" });
    } catch (error: any) {
      console.error('Erro ao criar painel:', error);
      toast({ title: "Erro", description: "Não foi possível criar o painel" });
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    try {
      const baseUrl = formData.urlPainel.trim().replace(/\/$/, '');
      const usuario = formData.usuario.trim();
      const senha = formData.senha.trim();
      const nomePainel = formData.nomePainel.trim();

      if (!nomePainel || !usuario || !senha || !baseUrl) {
        setTestResultModal({
          isOpen: true,
          success: false,
          message: "Dados Obrigatórios Ausentes",
          details: "❌ Preencha nome, URL, usuário e senha com dados reais antes de testar."
        });
        return;
      }

      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          captcha: "not-a-robot",
          captchaChecked: true,
          username: usuario,
          password: senha,
          twofactor_code: "",
          twofactor_recovery_code: "",
          twofactor_trusted_device_id: ""
        })
      });

      const data = await response.json();

      if (response.ok && data?.token) {
        localStorage.setItem("auth_token", data.token);

        setTestResultModal({
          isOpen: true,
          success: true,
          message: "CONEXÃO REAL BEM-SUCEDIDA!",
          details: `✅ Painel: ${nomePainel}\n🔗 Endpoint: ${baseUrl}/api/auth/login\n👤 Usuário: ${usuario}\n📡 Status: OK\n\nToken recebido: ${data.token.slice(0, 20)}...`
        });
      } else {
        setTestResultModal({
          isOpen: true,
          success: false,
          message: "FALHA NA AUTENTICAÇÃO",
          details: data?.message || "Usuário/senha inválidos ou URL incorreta."
        });
      }
    } catch (error: any) {
      setTestResultModal({
        isOpen: true,
        success: false,
        message: "Erro no Teste",
        details: `Erro inesperado durante o teste: ${error.message}`
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const testPanel = async (panel: { id: string; nome: string; url: string; usuario: string; senha: string }) => {
    setIsTestingConnection(true);
    try {
      const baseUrl = panel.url.trim().replace(/\/$/, '');

      const { data, error } = await supabase.functions.invoke('test-panel-connection', {
        body: {
          baseUrl,
          username: panel.usuario,
          password: panel.senha,
          endpointPath: '/api/auth/login',
          endpointMethod: 'POST',
          loginPayload: {
            captcha: 'not-a-robot',
            captchaChecked: true,
            username: panel.usuario,
            password: panel.senha,
            twofactor_code: '',
            twofactor_recovery_code: '',
            twofactor_trusted_device_id: ''
          },
          extraHeaders: { Accept: 'application/json' }
        },
      });

      if (error || !data) {
        setTestResultModal({
          isOpen: true,
          success: false,
          message: 'Erro no Teste',
          details: `Não foi possível executar o teste agora. ${error?.message ?? ''}`.trim(),
        });
        return;
      }

      if (data.success) {
        const account = data.account;
        setTestResultModal({
          isOpen: true,
          success: true,
          message: 'CONEXÃO REAL BEM-SUCEDIDA!',
          details: `✅ Painel: ${panel.nome}\n🔗 Endpoint: ${data.endpoint}\n👤 Usuário: ${panel.usuario}\n📡 Status: ${(account?.status ?? 'OK')}\n⏱️ Expira: ${account?.exp_date ?? 'n/d'}\n\n✅ Autenticação realizada com sucesso no painel.`,
        });
      } else {
        const logs = Array.isArray(data.logs)
          ? data.logs
              .slice(0, 4)
              .map((l: any) => {
                const s = [
                  l.status ? `status: ${l.status}` : null,
                  l.ok !== undefined ? `ok: ${l.ok}` : null,
                ]
                  .filter(Boolean)
                  .join(', ');
                const head = s ? `(${s})` : '';
                return `• ${l.url} ${head}\n${(l.snippet || '').slice(0, 200)}`;
              })
              .join('\n\n')
          : '';

        setTestResultModal({
          isOpen: true,
          success: false,
          message: 'FALHA NA AUTENTICAÇÃO',
          details: `${data.details || 'Usuário/senha inválidos ou URL incorreta.'}${logs ? '\n\nTentativas:\n' + logs : ''}`,
        });
      }
    } catch (error: any) {
      setTestResultModal({
        isOpen: true,
        success: false,
        message: 'Erro no Teste',
        details: `Erro inesperado durante o teste: ${error.message}`,
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Edit modal state and handlers
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<{ id: string; nome: string; url: string }>({ id: "", nome: "", url: "" });

  const startEditPanel = (panel: { id: string; nome: string; url: string; status: 'Ativo' | 'Inativo'; autoRenovacao: boolean; }) => {
    setEditForm({ id: panel.id, nome: panel.nome, url: panel.url });
    setIsEditModalOpen(true);
  };

  const handleSaveEditPanel = async () => {
    dismiss();

    if (!editForm.nome.trim() || !editForm.url.trim()) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha nome e URL' });
      return;
    }
    const baseUrl = editForm.url.trim().replace(/\/$/, '');
    const urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(baseUrl)) {
      toast({ title: 'URL inválida', description: 'Informe uma URL válida iniciando com http:// ou https://' });
      return;
    }

    try {
      const { error } = await supabase
        .from('paineis_integracao' as any)
        .update({
          nome: editForm.nome.trim(),
          url: baseUrl
        })
        .eq('id', editForm.id);

      if (error) throw error;

      setPanels((prev) => prev.map((p) => (p.id === editForm.id ? { ...p, nome: editForm.nome.trim(), url: baseUrl } : p)));
      setIsEditModalOpen(false);
      setCreateResultModal({ isOpen: true, message: `Painel '${editForm.nome}' atualizado com sucesso!` });
    } catch (error: any) {
      console.error('Erro ao atualizar painel:', error);
      toast({ title: "Erro", description: "Não foi possível atualizar o painel" });
    }
  };

  const handleToggleStatus = async (id: string) => {
    const panel = panels.find(p => p.id === id);
    if (!panel) return;

    const newStatus = panel.status === 'Ativo' ? 'Inativo' : 'Ativo';

    try {
      const { error } = await supabase
        .from('paineis_integracao' as any)
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setPanels((prev) => prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p)));
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      toast({ title: "Erro", description: "Não foi possível atualizar o status" });
    }
  };

  const openDeleteConfirm = (panel: { id: string; nome: string; url: string; status: 'Ativo' | 'Inativo'; autoRenovacao: boolean; }) => {
    setDeleteConfirmModal({ isOpen: true, panel: { id: panel.id, nome: panel.nome } });
  };

  const handleDeletePanel = async () => {
    if (!deleteConfirmModal.panel) return;

    try {
      const { error } = await supabase
        .from('paineis_integracao' as any)
        .delete()
        .eq('id', deleteConfirmModal.panel.id);

      if (error) throw error;

      setPanels((prev) => prev.filter((p) => p.id !== deleteConfirmModal.panel!.id));
      setDeleteConfirmModal({ isOpen: false, panel: null });
      setCreateResultModal({ isOpen: true, message: `Painel '${deleteConfirmModal.panel.nome}' excluído com sucesso!` });
    } catch (error: any) {
      console.error('Erro ao excluir painel:', error);
      toast({ title: "Erro", description: "Não foi possível excluir o painel" });
      setDeleteConfirmModal({ isOpen: false, panel: null });
    }
  };

  // Filtrar provedores baseado na busca
  const filteredProvedores = PROVEDORES.filter(p => 
    p.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Obter provedor selecionado
  const currentProvider = PROVEDORES.find(p => p.id === selectedProvider);

  // Filtrar painéis pelo provedor selecionado
  const providerPanels = panels.filter(p => p.provedor === selectedProvider || (!p.provedor && selectedProvider === 'playfast'));

  // Estatísticas do provedor selecionado
  const providerStats = {
    total: providerPanels.length,
    ativos: providerPanels.filter(p => p.status === 'Ativo').length,
    inativos: providerPanels.filter(p => p.status === 'Inativo').length
  };

  return (
    <main className="space-y-4">
      {/* Header Ciano */}
      <div className="bg-primary rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-5 h-5 bg-white/20 rounded flex items-center justify-center">
            <span className="text-xs">≡</span>
          </div>
          <h1 className="text-base font-semibold text-primary-foreground">Credenciais Dos Servidores IPTV</h1>
        </div>
        <p className="text-sm text-primary-foreground/80">Configure e gerencie seus painéis IPTV</p>
      </div>

      {/* Barra de Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar provedor..."
          className="pl-10 h-9"
        />
      </div>

      {/* Grid de Provedores */}
      <div className="flex flex-wrap gap-2">
        {filteredProvedores.map((provedor) => (
          <Button
            key={provedor.id}
            variant={selectedProvider === provedor.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedProvider(provedor.id)}
            className={`h-8 text-xs font-medium ${
              selectedProvider === provedor.id
                ? "bg-primary hover:bg-primary/90"
                : "hover:bg-muted"
            }`}
          >
            {provedor.nome}
          </Button>
        ))}
      </div>

      {/* Card do Provedor Selecionado */}
      {currentProvider && (
        <div className="rounded-lg p-4 bg-card border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <Play className="w-4 h-4 text-white fill-white" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{currentProvider.nome}</h3>
                <p className="text-sm text-muted-foreground">{currentProvider.descricao}</p>
              </div>
            </div>

            {/* Estatísticas */}
            <div className="flex gap-2">
              <div className="border border-primary/50 rounded-lg px-4 py-2 text-center min-w-[70px]">
                <div className="text-lg font-bold text-primary">{providerStats.total}</div>
                <div className="text-[10px] text-muted-foreground">Total</div>
              </div>
              <div className="border border-green-500/50 rounded-lg px-4 py-2 text-center min-w-[70px]">
                <div className="text-lg font-bold text-green-500">{providerStats.ativos}</div>
                <div className="text-[10px] text-muted-foreground">Ativos</div>
              </div>
              <div className="border border-destructive/50 bg-destructive/5 rounded-lg px-4 py-2 text-center min-w-[70px]">
                <div className="text-lg font-bold text-destructive">{providerStats.inativos}</div>
                <div className="text-[10px] text-muted-foreground">Inativos</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Área de Painéis Configurados */}
      <div className="border-2 border-dashed border-border rounded-lg p-8 bg-card/50 min-h-[200px] flex flex-col items-center justify-center">
        {providerPanels.length === 0 ? (
          <>
            <div className="w-14 h-14 bg-muted rounded-lg flex items-center justify-center mb-4">
              <Monitor className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-foreground font-medium mb-1">Nenhum painel configurado</p>
            <p className="text-sm text-muted-foreground mb-4">
              Configure seu <span className="text-primary">primeiro painel {currentProvider?.nome}</span> para começar
            </p>
            <Button 
              onClick={() => setIsConfigModalOpen(true)}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Painel {currentProvider?.nome}
            </Button>
          </>
        ) : (
          <div className="w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Painéis Configurados</h3>
              <Button 
                onClick={() => setIsConfigModalOpen(true)}
                className="bg-green-500 hover:bg-green-600 text-white"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Painel
              </Button>
            </div>
            <div className="divide-y divide-border">
              {providerPanels.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3">
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
                      <Button onClick={() => startEditPanel(p)} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"><Edit className="h-4 w-4" /></Button>
                      <Button onClick={() => handleToggleStatus(p.id)} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10">{p.status === 'Ativo' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button>
                      <Button onClick={() => testPanel(p)} title="Testar conexão" disabled={isTestingConnection} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"><RefreshCw className="h-4 w-4" /></Button>
                      <Button onClick={() => openDeleteConfirm(p)} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Configuration Modal */}
      <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="sr-only">Configurar Painel {currentProvider?.nome}</DialogTitle>
            <DialogDescription className="sr-only">Formulário de configuração do painel IPTV</DialogDescription>
          </DialogHeader>
          
          {/* Header */}
          <div className="bg-cyan-500 -m-6 mb-6 p-6 text-white">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-white/20 rounded flex items-center justify-center">
                <span className="text-xs">≡</span>
              </div>
              <h1 className="text-lg font-semibold">Adicionar Painel {currentProvider?.nome}</h1>
            </div>
            <p className="text-sm text-white/90">Configure suas credenciais para integração</p>
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center justify-between gap-2 text-sm mb-6">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Dashboard</span>
              <span className="text-gray-400">&gt;</span>
              <span className="text-white">{currentProvider?.nome}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsConfigModalOpen(false)}
              className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>

          {/* Add New Panel Section */}
          <div className="bg-green-500 rounded-lg p-4 text-white mb-6">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span className="font-medium">Adicionar Novo Painel {currentProvider?.nome}</span>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-center justify-between bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-orange-400 text-xs">⚠️</span>
              <span className="text-sm font-medium text-orange-400">IMPORTANTE:</span>
              <span className="text-sm text-gray-300">Desabilite 2FA no painel se necessário</span>
            </div>
            
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/10">
                <Info className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/10">
                <Shield className="w-4 h-4 mr-2" />
                AES-256 Criptografado
              </Button>
            </div>
          </div>

          {/* Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <Label className="text-cyan-400 flex items-center gap-2">
                <span className="text-cyan-400">💼</span>
                Nome do Painel *
              </Label>
              <Input
                value={formData.nomePainel}
                onChange={(e) => setFormData(prev => ({ ...prev, nomePainel: e.target.value }))}
                placeholder="Ex: Meu Painel Principal"
                className="bg-slate-700 border-slate-600 text-white"
              />
              <p className="text-xs text-gray-400">Nome para identificar este painel</p>
            </div>

            <div className="space-y-2">
              <Label className="text-cyan-400 flex items-center gap-2">
                <span className="text-cyan-400">🔗</span>
                URL do Painel *
              </Label>
              <Input
                value={formData.urlPainel}
                onChange={(e) => setFormData(prev => ({ ...prev, urlPainel: e.target.value }))}
                placeholder="https://painel.exemplo.com"
                className="bg-slate-700 border-slate-600 text-white"
              />
              <p className="text-xs text-gray-400">URL do seu painel</p>
            </div>

            <div className="space-y-2">
              <Label className="text-cyan-400 flex items-center gap-2">
                <span className="text-cyan-400">👤</span>
                Usuário do Painel *
              </Label>
              <Input
                value={formData.usuario}
                onChange={(e) => setFormData(prev => ({ ...prev, usuario: e.target.value }))}
                placeholder="seu_usuario"
                className="bg-slate-700 border-slate-600 text-white"
              />
              <p className="text-xs text-gray-400">Username usado para acessar o painel</p>
            </div>

            <div className="space-y-2">
              <Label className="text-red-400 flex items-center gap-2">
                <span className="text-red-400">🔒</span>
                Senha do Painel *
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={formData.senha}
                  onChange={(e) => setFormData(prev => ({ ...prev, senha: e.target.value }))}
                  placeholder="sua_senha"
                  className="bg-slate-700 border-slate-600 text-white pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-gray-400 hover:text-white"
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-400">Senha para acessar o painel</p>
            </div>
          </div>

          {/* Configurações Section */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-2 text-cyan-400">
              <span className="text-sm">⚙️</span>
              <h3 className="font-medium">Configurações</h3>
            </div>
            
            <div className="flex items-center justify-between bg-slate-700/50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">🔄</span>
                </div>
                <div>
                  <p className="text-white font-medium">Renovação Automática</p>
                  <p className="text-sm text-gray-400">Clientes serão renovados automaticamente neste painel</p>
                </div>
              </div>
              <Switch 
                checked={autoRenewal}
                onCheckedChange={setAutoRenewal}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button 
              onClick={handleCreatePanel}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Painel
            </Button>
            
            <Button 
              onClick={handleTestConnection}
              variant="outline" 
              className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/10"
              disabled={isTestingConnection}
            >
              <span className="mr-2">🔧</span>
              {isTestingConnection ? "Testando..." : "Testar Conexão"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Result Modal */}
      <Dialog open={createResultModal.isOpen} onOpenChange={(open) => setCreateResultModal((prev) => ({ ...prev, isOpen: open }))}>
        <DialogContent className="max-w-md bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="sr-only">Resultado da Operação</DialogTitle>
            <DialogDescription className="sr-only">Mensagem de sucesso</DialogDescription>
          </DialogHeader>
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-green-400 mb-2">Sucesso</h3>
            <p className="text-sm text-green-300 mb-6">{createResultModal.message}</p>
            <Button 
              onClick={() => {
                setCreateResultModal((prev) => ({ ...prev, isOpen: false }));
                setIsConfigModalOpen(false);
              }} 
              className="w-full bg-green-500 hover:bg-green-600 text-white"
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Panel Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-lg bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Editar Painel</DialogTitle>
            <DialogDescription className="text-gray-300">Atualize as informações do painel selecionado</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-cyan-400">Nome do Painel</Label>
              <Input
                value={editForm.nome}
                onChange={(e) => setEditForm((prev) => ({ ...prev, nome: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-cyan-400">URL do Painel</Label>
              <Input
                value={editForm.url}
                onChange={(e) => setEditForm((prev) => ({ ...prev, url: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
              <Button className="bg-green-500 hover:bg-green-600 text-white" onClick={handleSaveEditPanel}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Test Result Modal */}
      <Dialog open={testResultModal.isOpen} onOpenChange={(open) => setTestResultModal(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="max-w-md bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="sr-only">Resultado do Teste de Conexão</DialogTitle>
            <DialogDescription className="sr-only">Resultado do teste de conexão com o painel</DialogDescription>
          </DialogHeader>
          
          <div className="text-center p-6">
            <div className="mb-4">
              {testResultModal.success ? (
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
              ) : (
                <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-8 h-8 text-white" />
                </div>
              )}
            </div>
            
            <h3 className={`text-lg font-semibold mb-2 ${testResultModal.success ? 'text-green-400' : 'text-red-400'}`}>
              {testResultModal.success ? "Teste - Sucesso" : "Teste - Erro"}
            </h3>
            
            <p className={`text-sm mb-4 ${testResultModal.success ? 'text-green-300' : 'text-red-300'}`}>
              {testResultModal.message}
            </p>
            
            {testResultModal.details && (
              <div className="bg-slate-700/50 rounded-lg p-3 mb-4 text-left">
                <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                  {testResultModal.details}
                </pre>
              </div>
            )}
            
            <Button 
              onClick={() => setTestResultModal(prev => ({ ...prev, isOpen: false }))}
              className={`w-full ${testResultModal.success ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-600 hover:bg-gray-700'} text-white`}
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteConfirmModal.isOpen} onOpenChange={(open) => setDeleteConfirmModal(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="max-w-md bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmar Exclusão</DialogTitle>
            <DialogDescription className="text-gray-300">
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          
          <div className="text-center p-4">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-white" />
            </div>
            
            <h3 className="text-lg font-semibold mb-2 text-red-400">
              Excluir Painel
            </h3>
            
            <p className="text-sm mb-4 text-gray-300">
              Tem certeza que deseja excluir o painel "{deleteConfirmModal.panel?.nome}"?
            </p>
            
            <div className="flex gap-2 justify-center">
              <Button 
                variant="outline" 
                onClick={() => setDeleteConfirmModal({ isOpen: false, panel: null })}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleDeletePanel}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                Excluir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
