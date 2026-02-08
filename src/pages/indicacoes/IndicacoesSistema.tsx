import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wallet, 
  UserPlus, 
  DollarSign, 
  Trophy,
  Gift,
  FileText,
  MessageSquare,
  Users,
  History,
  Copy,
  Check,
  Link as LinkIcon,
  Share2
} from "lucide-react";
import { toast } from "sonner";

export default function IndicacoesSistema() {
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  
  // Mock data - would come from database in production
  const stats = {
    saldoDisponivel: 0,
    totalIndicacoes: 0,
    resgatesPagos: 0,
    nivel: "INICIANTE",
    progressoNivel: 0,
    proximoNivel: "Intermediário",
    indicacoesParaProximo: 5,
  };

  const userCode = "REF_" + Math.random().toString(36).substring(2, 14).toUpperCase();
  const baseUrl = window.location.origin;
  
  const links = {
    vendas: `${baseUrl}/site?ref=${userCode}`,
    cadastro: `${baseUrl}/register?ref=${userCode}`,
  };

  useEffect(() => {
    document.title = "Indique e Ganhe | Tech Play";
  }, []);

  const handleCopy = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(type);
      toast.success("Link copiado!");
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (error) {
      toast.error("Erro ao copiar link");
    }
  };

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
        <Button className="bg-primary hover:bg-primary/90">
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
              <p className="text-lg font-bold text-foreground">R$ {stats.saldoDisponivel.toFixed(2).replace('.', ',')}</p>
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
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold text-foreground">{stats.totalIndicacoes}</p>
                <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-primary/10 text-primary">
                  {stats.nivel}
                </span>
              </div>
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
              <p className="text-lg font-bold text-foreground">{stats.resgatesPagos}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Trophy className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Progresso de Nível</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-muted rounded-full h-1.5">
                  <div 
                    className="bg-primary h-1.5 rounded-full transition-all" 
                    style={{ width: `${stats.progressoNivel}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {stats.indicacoesParaProximo}/{stats.indicacoesParaProximo}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Content */}
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
          <TabsTrigger value="historico" className="gap-1.5 text-xs py-2">
            <History className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Histórico</span>
            <span className="sm:hidden">Hist.</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Indique & Ganhe! */}
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
                <Button 
                  size="sm"
                  onClick={() => handleCopy(links.vendas, 'vendas')}
                >
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
                <Button 
                  size="sm"
                  onClick={() => handleCopy(links.cadastro, 'cadastro')}
                >
                  {copiedLink === 'cadastro' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                ⓘ Leva direto para o cadastro - ideal para quem já conhece o sistema.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Materiais de Divulgação */}
        <TabsContent value="materiais" className="mt-3">
          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">Em breve: banners e materiais para divulgação.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Modelos de Mensagem */}
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
            <CardContent className="p-6 text-center">
              <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma indicação ainda. Compartilhe seu link!</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Histórico de Resgates */}
        <TabsContent value="historico" className="mt-3">
          <Card>
            <CardContent className="p-6 text-center">
              <History className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum resgate realizado ainda.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
