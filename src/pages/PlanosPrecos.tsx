import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, Zap, Shield, ArrowRight, Loader2 } from 'lucide-react';
import logoPlay from '@/assets/logo-play.png';

interface SystemPlan {
  id: string;
  nome: string;
  descricao: string | null;
  valor: number;
  intervalo: string;
  limite_clientes: number | null;
  limite_mensagens: number | null;
  limite_whatsapp_sessions: number | null;
  limite_paineis: number | null;
  recursos: any;
  destaque: boolean;
  ativo: boolean;
}

export default function PlanosPrecos() {
  const [plans, setPlans] = useState<SystemPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Planos e Preços | Msx Gestor';
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('system_plans')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getIntervalLabel = (intervalo: string) => {
    switch (intervalo) {
      case 'mensal': return '/mês';
      case 'trimestral': return '/trimestre';
      case 'semestral': return '/semestre';
      case 'anual': return '/ano';
      default: return `/${intervalo}`;
    }
  };

  const handleSelectPlan = async (planId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      navigate(`/ativar-plano?plan=${planId}`);
    } else {
      navigate(`/auth?plan=${planId}`);
    }
  };

  const getFeaturesList = (plan: SystemPlan) => {
    const features: string[] = [];
    if (plan.limite_clientes) features.push(`Até ${plan.limite_clientes} clientes`);
    if (plan.limite_mensagens) features.push(`Até ${plan.limite_mensagens} mensagens/mês`);
    if (plan.limite_whatsapp_sessions) features.push(`${plan.limite_whatsapp_sessions} sessão${plan.limite_whatsapp_sessions > 1 ? 'ões' : ''} WhatsApp`);
    if (plan.limite_paineis) features.push(`${plan.limite_paineis} painel${plan.limite_paineis > 1 ? 'is' : ''} integrado`);
    
    if (plan.recursos && Array.isArray(plan.recursos)) {
      plan.recursos.forEach((r: any) => {
        if (typeof r === 'string') features.push(r);
        else if (r?.nome) features.push(r.nome);
      });
    }

    return features;
  };

  const planIcons = [Zap, Sparkles, Shield];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-9 h-9 rounded-full overflow-hidden shadow-md">
              <img src={logoPlay} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-lg font-bold text-foreground">Msx Gestor</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/auth')} className="text-muted-foreground">
              Entrar
            </Button>
            <Button onClick={() => navigate('/auth')} className="bg-primary hover:bg-primary/90">
              Criar Conta
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 md:py-24 text-center px-4">
        <div className="container mx-auto max-w-3xl">
          <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm bg-primary/10 text-primary border-primary/20">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Escolha seu plano
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            Planos que crescem com{' '}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              seu negócio
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Gerencie seus clientes, automatize cobranças e escale suas operações com o plano ideal para você.
          </p>
        </div>
      </section>

      {/* Plans Grid */}
      <section className="pb-20 px-4">
        <div className="container mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">Nenhum plano disponível no momento.</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/auth')}>
                Criar conta gratuita
              </Button>
            </div>
          ) : (
            <div className={`grid gap-6 mx-auto ${
              plans.length === 1 ? 'max-w-md grid-cols-1' : 
              plans.length === 2 ? 'max-w-2xl grid-cols-1 md:grid-cols-2' : 
              'max-w-5xl grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            }`}>
              {plans.map((plan, index) => {
                const Icon = planIcons[index % planIcons.length];
                const features = getFeaturesList(plan);
                const isHighlighted = plan.destaque;

                return (
                  <Card
                    key={plan.id}
                    className={`relative flex flex-col transition-all duration-300 hover:scale-[1.02] ${
                      isHighlighted
                        ? 'border-primary shadow-[0_0_30px_-5px_hsl(var(--primary)/0.3)] bg-gradient-to-b from-primary/5 to-card'
                        : 'border-border bg-card hover:border-primary/30'
                    }`}
                  >
                    {isHighlighted && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground shadow-lg px-4">
                          Mais Popular
                        </Badge>
                      </div>
                    )}

                    <CardHeader className="text-center pb-2 pt-8">
                      <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${
                        isHighlighted ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                      }`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <CardTitle className="text-xl">{plan.nome}</CardTitle>
                      {plan.descricao && (
                        <CardDescription className="text-sm">{plan.descricao}</CardDescription>
                      )}
                    </CardHeader>

                    <CardContent className="text-center pb-4 flex-1">
                      <div className="mb-6">
                        <span className="text-4xl font-bold text-foreground">
                          {formatCurrency(plan.valor)}
                        </span>
                        <span className="text-muted-foreground text-sm">
                          {getIntervalLabel(plan.intervalo)}
                        </span>
                      </div>

                      <ul className="space-y-3 text-left">
                        {features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm">
                            <Check className={`h-4 w-4 mt-0.5 shrink-0 ${
                              isHighlighted ? 'text-primary' : 'text-success'
                            }`} />
                            <span className="text-muted-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>

                    <CardFooter className="pt-2">
                      <Button
                        className={`w-full h-12 text-base ${
                          isHighlighted
                            ? 'bg-primary hover:bg-primary/90 shadow-lg'
                            : ''
                        }`}
                        variant={isHighlighted ? 'default' : 'outline'}
                        onClick={() => handleSelectPlan(plan.id)}
                      >
                        Começar agora
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Msx Gestor. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}
