import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PROVEDORES, Panel, ProviderConfig, getTestStrategy } from "@/config/provedores";
import { resolveUniplayApiUrl, UNIPLAY_API_BASE } from "@/config/provedores/uniplay";
import { PLAYFAST_API_BASE } from "@/config/provedores/playfast";

export function useServidorPage(providerId: string) {
  const provider = PROVEDORES.find(p => p.id === providerId) || null;

  const [panels, setPanels] = useState<Panel[]>([]);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [autoRenewal, setAutoRenewal] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [formData, setFormData] = useState({ nomePainel: "", urlPainel: "", usuario: "", senha: "" });

  const [testResultModal, setTestResultModal] = useState<{
    isOpen: boolean; success: boolean; message: string; details?: string;
  }>({ isOpen: false, success: false, message: "", details: "" });

  const [createResultModal, setCreateResultModal] = useState<{ isOpen: boolean; message: string }>({
    isOpen: false, message: "",
  });

  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; panel: { id: string; nome: string } | null }>({
    isOpen: false, panel: null,
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<{ id: string; nome: string; url: string }>({ id: "", nome: "", url: "" });

  const { toast, dismiss } = useToast();

  useEffect(() => {
    loadPanels();
  }, [providerId]);

  const loadPanels = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      const { data, error } = await supabase
        .from('paineis_integracao' as any)
        .select('*')
        .eq('provedor', providerId)
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
          provedor: p.provedor || providerId,
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
    if (!/^https?:\/\/.+/.test(baseUrl)) {
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
          auto_renovacao: autoRenewal,
          provedor: providerId,
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
          provedor: providerId,
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
          isOpen: true, success: false,
          message: "Dados Obrigatórios Ausentes",
          details: "❌ Preencha nome, URL, usuário e senha com dados reais antes de testar.",
        });
        return;
      }

      // Playfast: usa Edge Function diretamente (TOKEN + secret)
      if (providerId === 'playfast') {
        try {
          const { data, error } = await supabase.functions.invoke('playfast-renew', {
            body: { token: usuario, secret: senha, action: 'profile' },
          });

          if (error) {
            setTestResultModal({
              isOpen: true, success: false, message: "Erro no Teste",
              details: `❌ Painel: ${nomePainel}\n\n❌ Não foi possível conectar à API Playfast.\nErro: ${error.message}`,
            });
            return;
          }

          if (data?.success) {
            setTestResultModal({
              isOpen: true, success: true, message: "CONEXÃO REAL BEM-SUCEDIDA!",
              details: `✅ Painel: ${nomePainel}\n🔗 API: ${PLAYFAST_API_BASE}\n👤 Usuário: ${data.username || usuario}\n💰 Créditos: ${data.credits ?? 'n/d'}\n📧 Email: ${data.email || 'n/d'}\n📡 Status: ${data.status === 1 ? 'Ativo' : 'Inativo'}\n\n✅ Autenticação realizada com sucesso.`,
            });
          } else {
            setTestResultModal({
              isOpen: true, success: false, message: "FALHA NA AUTENTICAÇÃO",
              details: `❌ Painel: ${nomePainel}\n🔗 API: ${PLAYFAST_API_BASE}\n\n❌ ${data?.error || 'TOKEN ou Secret inválidos.'}`,
            });
          }
        } catch (err: any) {
          setTestResultModal({
            isOpen: true, success: false, message: "Erro no Teste",
            details: `Erro inesperado: ${err.message}`,
          });
        }
        return;
      }

      // KOffice API/V2: usa Edge Function dedicada para teste (form login + verify)
      if (providerId === 'koffice-api' || providerId === 'koffice-v2') {
        try {
          const { data, error } = await supabase.functions.invoke('koffice-renew', {
            body: { action: 'test_connection', url: baseUrl, panelUser: usuario, panelPass: senha },
          });

          if (error) {
            setTestResultModal({
              isOpen: true, success: false, message: "Erro no Teste",
              details: `❌ Painel: ${nomePainel}\n\n❌ Não foi possível conectar ao painel KOffice.\nErro: ${error.message}`,
            });
            return;
          }

          if (data?.success) {
            setTestResultModal({
              isOpen: true, success: true, message: "CONEXÃO REAL BEM-SUCEDIDA!",
              details: `✅ Painel: ${nomePainel}\n🔗 URL: ${baseUrl}\n👤 Usuário: ${usuario}\n👥 Total Clientes: ${data.clients_count ?? 'n/d'}\n✅ Clientes Ativos: ${data.active_clients_count ?? 'n/d'}\n\n✅ Autenticação realizada com sucesso no painel.`,
            });
          } else {
            setTestResultModal({
              isOpen: true, success: false, message: "FALHA NA AUTENTICAÇÃO",
              details: `❌ Painel: ${nomePainel}\n🔗 URL: ${baseUrl}\n👤 Usuário: ${usuario}\n\n❌ ${data?.error || 'Usuário ou API key inválidos. Verifique suas credenciais e tente novamente.'}`,
            });
          }
        } catch (err: any) {
          setTestResultModal({
            isOpen: true, success: false, message: "Erro no Teste",
            details: `Erro inesperado: ${err.message}`,
          });
        }
        return;
      }

      // Uniplay: todas as franquias usam gesapioffice.com como API
      const resolvedBaseUrl = providerId === 'uniplay' ? UNIPLAY_API_BASE : baseUrl;

      // Uniplay: usar Edge Function para teste (servidor BR, sem bloqueio geo)
      if (providerId === 'uniplay') {
        try {
          const { data, error } = await supabase.functions.invoke('test-panel-connection', {
            body: {
              baseUrl: resolvedBaseUrl, username: usuario, password: senha,
              endpointPath: '/api/login',
              endpointMethod: 'POST',
              loginPayload: { username: usuario, password: senha, code: '' },
              providerId: 'uniplay',
              testSteps: [{ type: 'json-post', endpoints: ['/api/login'], label: 'Uniplay JWT API' }],
              extraHeaders: { Accept: 'application/json' },
            },
          });

          if (error || !data) {
            setTestResultModal({
              isOpen: true, success: false, message: 'Erro no Teste',
              details: `Não foi possível executar o teste. ${error?.message ?? ''}`.trim(),
            });
            return;
          }

          if (data.success) {
            const account = data.account;
            setTestResultModal({
              isOpen: true, success: true, message: "CONEXÃO REAL BEM-SUCEDIDA!",
              details: `✅ Painel: ${nomePainel}\n🔗 Endpoint: ${data.endpoint}\n👤 Usuário: ${usuario}\n📡 Status: ${account?.status ?? 'OK'}${account?.credits ? `\n💰 Créditos: ${account.credits}` : ''}${data.data?.expires_in ? `\n⏰ Token expira em: ${Math.round(data.data.expires_in / 3600)}h` : ''}\n\n✅ Autenticação JWT realizada com sucesso.`,
            });
          } else {
            setTestResultModal({
              isOpen: true, success: false, message: "FALHA NA AUTENTICAÇÃO",
              details: `❌ Painel: ${nomePainel}\n🔗 API: ${resolvedBaseUrl}/api/login\n👤 Usuário: ${usuario}\n\n❌ ${data.details || 'Credenciais inválidas.'}`,
            });
          }
        } catch (err: any) {
          setTestResultModal({
            isOpen: true, success: false, message: "Erro no Teste",
            details: `Erro inesperado: ${err.message}`,
          });
        }
        return;
      }

      const endpoint = provider?.loginEndpoint || '/api/auth/login';
      const payload = provider?.buildLoginPayload
        ? provider.buildLoginPayload(usuario, senha)
        : { username: usuario, password: senha };

      // Fallback: via Edge Function (outros provedores)
      const fallbackStrategy = getTestStrategy(providerId);
      const originalFrontendUrl = formData.urlPainel.trim().replace(/\/$/, '');
      const { data, error } = await supabase.functions.invoke('test-panel-connection', {
        body: {
          baseUrl: resolvedBaseUrl, username: usuario, password: senha,
          endpointPath: endpoint,
          endpointMethod: provider?.loginMethod || 'POST',
          loginPayload: payload,
          providerId,
          testSteps: fallbackStrategy.steps,
          extraHeaders: { Accept: 'application/json' },
          frontendUrl: originalFrontendUrl,
        },
      });

      if (error || !data) {
        setTestResultModal({
          isOpen: true, success: false, message: 'Erro no Teste',
          details: `Não foi possível executar o teste. ${error?.message ?? ''}`.trim(),
        });
        return;
      }

      if (data.success) {
        const account = data.account;
        if (data.data?.token) localStorage.setItem("auth_token", data.data.token);
        const isPartialValidation = data.data?.usernameValidated && !data.data?.credentialsValidated;
        const detailsMsg = isPartialValidation
          ? `✅ Painel: ${nomePainel}\n🔗 Endpoint: ${data.endpoint}\n👤 Usuário: ${usuario}\n📡 Status: Conectado com sucesso!\n\n⚠️ Nota: O reCAPTCHA v3 do painel impede a verificação completa da senha pelo servidor. O usuário foi validado com sucesso.`
          : `✅ Painel: ${nomePainel}\n🔗 Endpoint: ${data.endpoint}\n👤 Usuário: ${usuario}\n📡 Status: ${account?.status ?? 'OK'}${account?.credits ? `\n💰 Créditos: ${account.credits}` : ''}\n\n✅ Autenticação realizada com sucesso no painel.`;
        setTestResultModal({
          isOpen: true, success: true, message: "CONEXÃO REAL BEM-SUCEDIDA!",
          details: detailsMsg,
        });
      } else {
        setTestResultModal({
          isOpen: true, success: false, message: "FALHA NA AUTENTICAÇÃO",
          details: data.details || "Credenciais inválidas ou URL incorreta.",
        });
      }
    } catch (error: any) {
      setTestResultModal({
        isOpen: true, success: false, message: "Erro no Teste",
        details: `Erro inesperado durante o teste: ${error.message}`,
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const testPanel = async (panel: Panel) => {
    setIsTestingConnection(true);
    try {
      const baseUrl = panel.url.trim().replace(/\/$/, '');
      const prov = PROVEDORES.find(p => p.id === panel.provedor);
      const endpoint = prov?.loginEndpoint || '/api/auth/login';
      const payload = prov?.buildLoginPayload
        ? prov.buildLoginPayload(panel.usuario, panel.senha)
        : { username: panel.usuario, password: panel.senha };

      const strategy = getTestStrategy(panel.provedor || providerId);
      const { data, error } = await supabase.functions.invoke('test-panel-connection', {
        body: {
          baseUrl, username: panel.usuario, password: panel.senha,
          endpointPath: endpoint,
          endpointMethod: prov?.loginMethod || 'POST',
          loginPayload: payload,
          providerId: panel.provedor || providerId,
          testSteps: strategy.steps,
          extraHeaders: { Accept: 'application/json' },
        },
      });

      if (error || !data) {
        setTestResultModal({
          isOpen: true, success: false, message: 'Erro no Teste',
          details: `Não foi possível executar o teste agora. ${error?.message ?? ''}`.trim(),
        });
        return;
      }

      if (data.success) {
        const account = data.account;
        const isPartialValidation = data.data?.usernameValidated && !data.data?.credentialsValidated;
        const detailsMsg = isPartialValidation
          ? `✅ Painel: ${panel.nome}\n🔗 Endpoint: ${data.endpoint}\n👤 Usuário: ${panel.usuario}\n📡 Status: Conectado com sucesso!\n\n⚠️ Nota: O reCAPTCHA v3 impede verificação completa da senha.`
          : `✅ Painel: ${panel.nome}\n🔗 Endpoint: ${data.endpoint}\n👤 Usuário: ${panel.usuario}\n📡 Status: ${account?.status ?? 'OK'}\n⏱️ Expira: ${account?.exp_date ?? 'n/d'}\n\n✅ Autenticação realizada com sucesso no painel.`;
        setTestResultModal({
          isOpen: true, success: true, message: 'CONEXÃO REAL BEM-SUCEDIDA!',
          details: detailsMsg,
        });
      } else {
        const logs = Array.isArray(data.logs)
          ? data.logs.slice(0, 4).map((l: any) => {
              const s = [l.status ? `status: ${l.status}` : null, l.ok !== undefined ? `ok: ${l.ok}` : null].filter(Boolean).join(', ');
              return `• ${l.url} ${s ? `(${s})` : ''}\n${(l.snippet || '').slice(0, 200)}`;
            }).join('\n\n')
          : '';
        setTestResultModal({
          isOpen: true, success: false, message: 'FALHA NA AUTENTICAÇÃO',
          details: `${data.details || 'Usuário/senha inválidos ou URL incorreta.'}${logs ? '\n\nTentativas:\n' + logs : ''}`,
        });
      }
    } catch (error: any) {
      setTestResultModal({
        isOpen: true, success: false, message: 'Erro no Teste',
        details: `Erro inesperado durante o teste: ${error.message}`,
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const startEditPanel = (panel: Panel) => {
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
    if (!/^https?:\/\/.+/.test(baseUrl)) {
      toast({ title: 'URL inválida', description: 'Informe uma URL válida iniciando com http:// ou https://' });
      return;
    }

    try {
      const { error } = await supabase
        .from('paineis_integracao' as any)
        .update({ nome: editForm.nome.trim(), url: baseUrl })
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

  const openDeleteConfirm = (panel: Panel) => {
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

  const stats = {
    total: panels.length,
    ativos: panels.filter(p => p.status === 'Ativo').length,
    inativos: panels.filter(p => p.status === 'Inativo').length,
  };

  const openAddPanel = () => {
    const defaultUrl = providerId === 'playfast' ? PLAYFAST_API_BASE : '';
    setFormData({ nomePainel: "", urlPainel: defaultUrl, usuario: "", senha: "" });
    setAutoRenewal(false);
    setIsConfigModalOpen(true);
  };

  return {
    provider, panels, stats,
    isConfigModalOpen, setIsConfigModalOpen,
    showPassword, setShowPassword,
    autoRenewal, setAutoRenewal,
    isTestingConnection,
    formData, setFormData,
    testResultModal, setTestResultModal,
    createResultModal, setCreateResultModal,
    deleteConfirmModal, setDeleteConfirmModal,
    isEditModalOpen, setIsEditModalOpen,
    editForm, setEditForm,
    openAddPanel,
    handleCreatePanel, handleTestConnection,
    testPanel, startEditPanel, handleSaveEditPanel,
    handleToggleStatus, openDeleteConfirm, handleDeletePanel,
  };
}
