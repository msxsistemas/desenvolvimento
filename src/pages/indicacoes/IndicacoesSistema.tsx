import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { 
  Wallet, UserPlus, DollarSign, Gift, FileText, MessageSquare, Users,
  History, Copy, Check, Link as LinkIcon, Share2, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIndicacoes } from "@/hooks/useIndicacoes";

interface SaqueRow {
  id: string;
  valor: number;
  chave_pix: string;
  status: string;
  motivo_rejeicao: string | null;
  created_at: string;
}

export default function IndicacoesSistema() {
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const { indicacoes, clientesIndicados, stats, isLoading } = useIndicacoes();
  
  // Withdrawal state
  const [saqueDialogOpen, setSaqueDialogOpen] = useState(false);
  const [saqueValor, setSaqueValor] = useState("");
  const [chavePix, setChavePix] = useState("");
  const [loadingChavePix, setLoadingChavePix] = useState(false);
  const [savingSaque, setSavingSaque] = useState(false);
  const [saques, setSaques] = useState<SaqueRow[]>([]);
  const [loadingSaques, setLoadingSaques] = useState(true);

  const userCode = useMemo(() => {
    if (!userId) return "CARREGANDO...";
    return "REF_" + userId.replace(/-/g, "").substring(0, 12).toUpperCase();
  }, [userId]);

  const baseUrl = window.location.origin;
  
  const links = useMemo(() => ({
    vendas: `${baseUrl}/site?ref=${userCode}`,
    cadastro: `${baseUrl}/register?ref=${userCode}`,
  }), [baseUrl, userCode]);

  useEffect(() => {
    document.title = "Indique e Ganhe | Tech Play";
    
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        fetchSavedPixKey(user.id);
        fetchSaques(user.id);
      }
    };
    getUser();
  }, []);

  const fetchSavedPixKey = async (uid: string) => {
    setLoadingChavePix(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("chave_pix_indicacao")
        .eq("user_id", uid)
        .single();
      if (data?.chave_pix_indicacao) {
        setChavePix(data.chave_pix_indicacao);
      }
    } catch (err) {
      console.error("Erro ao carregar chave PIX:", err);
    } finally {
      setLoadingChavePix(false);
    }
  };

  const fetchSaques = async (uid: string) => {
    setLoadingSaques(true);
    try {
      const { data, error } = await supabase
        .from("saques_indicacao")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setSaques(data || []);
    } catch (err) {
      console.error("Erro ao carregar saques:", err);
    } finally {
      setLoadingSaques(false);
    }
  };

  const handleOpenSaqueDialog = () => {
    setSaqueValor("");
    setSaqueDialogOpen(true);
  };

  const handleSolicitarSaque = async () => {
    if (!userId) return;
    
    const valor = parseFloat(saqueValor.replace(",", "."));
    if (!valor || valor <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    if (valor > stats.saldoDisponivel) {
      toast.error("Saldo insuficiente");
      return;
    }
    if (!chavePix.trim()) {
      toast.error("Informe sua chave PIX");
      return;
    }

    setSavingSaque(true);
    try {
      // Save PIX key to profile
      await supabase
        .from("profiles")
        .update({ chave_pix_indicacao: chavePix.trim() })
        .eq("user_id", userId);

      // Create withdrawal request
      const { error } = await supabase.from("saques_indicacao").insert({
        user_id: userId,
        valor,
        chave_pix: chavePix.trim(),
        status: "pendente",
      });

      if (error) throw error;

      toast.success("Solicitação de saque enviada! Aguarde aprovação.");
      setSaqueDialogOpen(false);
      fetchSaques(userId);
    } catch (err: any) {
      toast.error("Erro ao solicitar saque: " + (err.message || ""));
    } finally {
      setSavingSaque(false);
    }
  };

  const handleCopy = async (text: string, type: string) => {
    if (userCode === "CARREGANDO...") {
      toast.error("Aguarde o carregamento do código");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(type);
      toast.success("Link copiado para a área de transferência!");
      setTimeout(() => setCopiedLink(null), 2000);
    } catch {
      toast.error("Erro ao copiar link");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "aprovado":
        return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Aprovado</Badge>;
      case "pago":
        return <Badge className="bg-primary/10 text-primary hover:bg-primary/20">Pago</Badge>;
      case "rejeitado":
        return <Badge variant="destructive">Rejeitado</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  const getSaqueStatusBadge = (status: string) => {
    switch (status) {
      case "aprovado":
        return <Badge className="bg-yellow-500/10 text-yellow-500">Aprovado</Badge>;
      case "pago":
        return <Badge className="bg-green-500/10 text-green-500">Pago</Badge>;
      case "rejeitado":
        return <Badge variant="destructive">Rejeitado</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  // Calculate pending withdrawals to show correct available balance
  const saquePendente = saques
    .filter(s => s.status === "pendente" || s.status === "aprovado")
    .reduce((acc, s) => acc + Number(s.valor), 0);

  const saldoReal = stats.saldoDisponivel - saquePendente;

  return (
    <main className="space-y-4">
      {/* Header */}
      <header className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Share2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Indique e Ganhe</h1>
            <p className="text-sm text-muted-foreground">Ganhe comissões indicando novos clientes</p>
          </div>
        </div>
        <Button 
          className="bg-primary hover:bg-primary/90"
          onClick={handleOpenSaqueDialog}
          disabled={saldoReal <= 0}
        >
          <DollarSign className="h-4 w-4 mr-2" />
          Solicitar Resgate
        </Button>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Saldo Disponível</p>
              <p className="text-lg font-bold text-foreground">R$ {saldoReal.toFixed(2).replace('.', ',')}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <UserPlus className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Total de Indicações</p>
              <p className="text-lg font-bold text-foreground">{stats.totalIndicacoes}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Resgates Pagos</p>
              <p className="text-lg font-bold text-foreground">R$ {stats.resgatesPagos.toFixed(2).replace('.', ',')}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Clientes Indicados</p>
              <p className="text-lg font-bold text-foreground">{clientesIndicados.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Código do usuário */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Seu código de indicação:</p>
              <p className="text-lg font-mono font-bold text-primary">{userCode}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => handleCopy(userCode, 'code')}>
              {copiedLink === 'code' ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              Copiar Código
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="indique" className="w-full">
        <TabsList className="w-full grid grid-cols-2 md:grid-cols-5 h-auto gap-1 bg-muted/50 p-1 rounded-lg">
          <TabsTrigger value="indique" className="gap-1.5 text-xs py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Gift className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Indique & Ganhe</span>
            <span className="sm:hidden">Indicar</span>
          </TabsTrigger>
          <TabsTrigger value="materiais" className="gap-1.5 text-xs py-2">
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Materiais</span>
            <span className="sm:hidden">Mídias</span>
          </TabsTrigger>
          <TabsTrigger value="modelos" className="gap-1.5 text-xs py-2">
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Mensagens</span>
            <span className="sm:hidden">Msgs</span>
          </TabsTrigger>
          <TabsTrigger value="indicacoes" className="gap-1.5 text-xs py-2">
            <Users className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Suas Indicações</span>
            <span className="sm:hidden">Lista</span>
          </TabsTrigger>
          <TabsTrigger value="saques" className="gap-1.5 text-xs py-2">
            <History className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Meus Saques</span>
            <span className="sm:hidden">Saques</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Indique & Ganhe */}
        <TabsContent value="indique" className="mt-3 space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-primary" />
                Link da Página de Vendas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2">
                <div className="flex-1 bg-muted rounded-md px-3 py-2 text-xs text-muted-foreground font-mono truncate">
                  {links.vendas}
                </div>
                <Button size="sm" onClick={() => handleCopy(links.vendas, 'vendas')}>
                  {copiedLink === 'vendas' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                ★ Ideal para divulgação! Leva para a página de apresentação completa.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" />
                Link de Cadastro Direto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2">
                <div className="flex-1 bg-muted rounded-md px-3 py-2 text-xs text-muted-foreground font-mono truncate">
                  {links.cadastro}
                </div>
                <Button size="sm" onClick={() => handleCopy(links.cadastro, 'cadastro')}>
                  {copiedLink === 'cadastro' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                ⓘ Leva direto para o cadastro - ideal para quem já conhece o sistema.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Materiais */}
        <TabsContent value="materiais" className="mt-3">
          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">Em breve: banners e materiais para divulgação.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Modelos */}
        <TabsContent value="modelos" className="mt-3">
          <Card>
            <CardContent className="p-6 text-center">
              <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">Em breve: modelos de mensagens prontas.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Suas Indicações */}
        <TabsContent value="indicacoes" className="mt-3">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : clientesIndicados.length === 0 ? (
                <div className="p-6 text-center">
                  <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhuma indicação ainda. Compartilhe seu link!</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>WhatsApp</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientesIndicados.map((cliente: any) => (
                      <TableRow key={cliente.id}>
                        <TableCell className="font-medium">{cliente.nome}</TableCell>
                        <TableCell>{cliente.whatsapp}</TableCell>
                        <TableCell>{cliente.plano || "-"}</TableCell>
                        <TableCell>
                          {new Date(cliente.indicacao_created_at || cliente.created_at).toLocaleDateString("pt-BR")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Meus Saques */}
        <TabsContent value="saques" className="mt-3">
          <Card>
            <CardContent className="p-0">
              {loadingSaques ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : saques.length === 0 ? (
                <div className="p-6 text-center">
                  <Wallet className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhum saque solicitado ainda.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Valor</TableHead>
                      <TableHead>Chave PIX</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Observação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {saques.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">R$ {Number(s.valor).toFixed(2).replace(".", ",")}</TableCell>
                        <TableCell className="font-mono text-xs">{s.chave_pix}</TableCell>
                        <TableCell>{getSaqueStatusBadge(s.status)}</TableCell>
                        <TableCell>{new Date(s.created_at).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{s.motivo_rejeicao || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Solicitar Saque */}
      <Dialog open={saqueDialogOpen} onOpenChange={setSaqueDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar Resgate</DialogTitle>
            <DialogDescription>
              Saldo disponível: R$ {saldoReal.toFixed(2).replace(".", ",")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Valor do Resgate (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={saldoReal}
                placeholder="0,00"
                value={saqueValor}
                onChange={e => setSaqueValor(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Chave PIX</Label>
              <Input
                placeholder="CPF, e-mail, telefone ou chave aleatória"
                value={chavePix}
                onChange={e => setChavePix(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Sua chave PIX será salva para futuros saques. Você pode alterá-la a qualquer momento.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaqueDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSolicitarSaque} disabled={savingSaque}>
              {savingSaque ? "Enviando..." : "Solicitar Resgate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
