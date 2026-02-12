import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { useSubscription } from '@/hooks/useSubscription';
import TrialExpiredGate from './TrialExpiredGate';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const { loading: subLoading, isTrialExpired, daysLeft, isTrial } = useSubscription(user?.id ?? null);

  if (authLoading || subLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (isTrialExpired) {
    return <TrialExpiredGate daysLeft={daysLeft} isTrial={isTrial} />;
  }

  return (
    <>
      {/* Trial banner */}
      {isTrial && daysLeft !== null && daysLeft > 0 && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 text-center text-sm flex items-center justify-center gap-2">
          <Clock className="h-3.5 w-3.5 text-primary" />
          <span className="text-foreground">
            Período de teste: <strong>{daysLeft} dia{daysLeft !== 1 ? 's' : ''}</strong> restante{daysLeft !== 1 ? 's' : ''}
          </span>
          <Badge variant="outline" className="ml-2 text-xs border-primary/30 text-primary cursor-pointer hover:bg-primary/10"
            onClick={() => window.location.href = '/planos'}
          >
            Ativar plano
          </Badge>
        </div>
      )}
      {children ? <>{children}</> : <Outlet />}
    </>
  );
}

export default ProtectedRoute;
