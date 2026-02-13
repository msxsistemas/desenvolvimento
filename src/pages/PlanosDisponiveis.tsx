import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, Star, ArrowLeft } from 'lucide-react';
import logoPlay from '@/assets/logo-play.png';

interface SystemPlan {
  id: string;
  nome: string;
  descricao: string | null;
  valor: number;
  intervalo: string;
  destaque: boolean;
  recursos: any;
  ordem: number;
}

export default function PlanosDisponiveis() {
  const [plans, setPlans] = useState<SystemPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Planos Disponíveis | Msx Gestor';
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

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const getIntervalLabel = (intervalo: string) => {
    const labels: Record<string, string> = {
      mensal: '/mês',
      trimestral: '/trimestre',
      semestral: '/semestre',
      anual: '/ano',
    };
    return labels[intervalo] || `/${intervalo}`;
  };

  const getFeatures = (p: SystemPlan) => {
    const f: string[] = [];
    if (p.recursos && Array.isArray(p.recursos)) {
      p.recursos.forEach((r: any) => {
        if (typeof r === 'string') f.push(r);
        else if (r?.nome) f.push(r.nome);
      });
    }
    return f;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-9 h-9 rounded-full overflow-hidden shadow-md">
              <img src={logoPlay} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-lg font-bold text-foreground">Msx Gestor</span>
          </div>
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao painel
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-2">Escolha seu plano</h1>
          <p className="text-muted-foreground">Selecione o plano ideal para o seu negócio</p>
        </div>

        {plans.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum plano disponível no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative flex flex-col ${
                  plan.destaque
                    ? 'border-primary shadow-lg shadow-primary/10 scale-[1.02]'
                    : 'border-border'
                }`}
              >
                {plan.destaque && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground shadow-md">
                      <Star className="h-3 w-3 mr-1" />
                      Mais popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pt-8">
                  <CardTitle className="text-xl">{plan.nome}</CardTitle>
                  {plan.descricao && (
                    <CardDescription className="text-sm">{plan.descricao}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex-1 space-y-6">
                  <div className="text-center">
                    <span className="text-4xl font-bold text-foreground">
                      {formatCurrency(plan.valor)}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      {getIntervalLabel(plan.intervalo)}
                    </span>
                  </div>

                  {getFeatures(plan).length > 0 && (
                    <ul className="space-y-2.5">
                      {getFeatures(plan).map((feature, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm">
                          <Check className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
                <CardFooter>
                  <Button
                    className={`w-full h-11 ${
                      plan.destaque
                        ? 'bg-primary hover:bg-primary/90 shadow-md'
                        : ''
                    }`}
                    variant={plan.destaque ? 'default' : 'outline'}
                    onClick={() => navigate(`/ativar-plano?plan=${plan.id}`)}
                  >
                    {plan.valor === 0 ? 'Ativar grátis' : 'Escolher plano'}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
