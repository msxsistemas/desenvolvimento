import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useProfile } from "@/hooks/useProfile";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { User, Building2, Mail, Save, Shield, Calendar, CreditCard, LogOut } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Perfil() {
  const { userId, user } = useCurrentUser();
  const { profile, loading, updateProfile } = useProfile(userId);
  const { subscription, daysLeft, isTrial, isActive } = useSubscription(userId);
  const { signOut } = useAuth();

  const [nomeCompleto, setNomeCompleto] = useState('');
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [telefone, setTelefone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setNomeCompleto(profile.nome_completo || '');
      setNomeEmpresa(profile.nome_empresa || '');
      setTelefone(profile.telefone || '');
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    await updateProfile({
      nome_completo: nomeCompleto,
      nome_empresa: nomeEmpresa,
      telefone,
    });
    setSaving(false);
  };

  const getInitials = () => {
    if (nomeCompleto) {
      const parts = nomeCompleto.trim().split(' ');
      if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      return nomeCompleto.substring(0, 2).toUpperCase();
    }
    return user?.email?.substring(0, 2).toUpperCase() || 'U';
  };

  const getStatusBadge = () => {
    if (isTrial) return <Badge variant="outline" className="text-amber-400 border-amber-400/30">Trial</Badge>;
    if (isActive) return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-400/30">Ativo</Badge>;
    return <Badge variant="destructive">Expirado</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Meu Perfil</h1>
        <p className="text-muted-foreground text-sm">Gerencie suas informações pessoais e da empresa.</p>
      </div>

      {/* Profile Header Card */}
      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary/30 to-primary/10" />
        <CardContent className="relative pt-0 pb-6 px-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10">
            <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 pb-1">
              <h2 className="text-xl font-bold truncate">{nomeCompleto || 'Seu Nome'}</h2>
              <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
            </div>
            <div className="flex items-center gap-2 pb-1">
              {getStatusBadge()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Informações Pessoais
          </CardTitle>
          <CardDescription>Dados exibidos no seu perfil e no sistema.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo</Label>
              <Input
                id="nome"
                value={nomeCompleto}
                onChange={(e) => setNomeCompleto(e.target.value)}
                placeholder="Seu nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="empresa" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Nome da Empresa
            </Label>
            <Input
              id="empresa"
              value={nomeEmpresa}
              onChange={(e) => setNomeEmpresa(e.target.value)}
              placeholder="Nome da sua empresa"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </Label>
            <Input value={user?.email || ''} disabled className="opacity-60" />
            <p className="text-xs text-muted-foreground">O email não pode ser alterado.</p>
          </div>

          <Separator />

          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </CardContent>
      </Card>

      {/* Subscription Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Assinatura
          </CardTitle>
          <CardDescription>Informações sobre seu plano atual.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-1">
              <p className="text-xs text-muted-foreground">Status</p>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm capitalize">
                  {subscription?.status || 'Sem plano'}
                </span>
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 space-y-1">
              <p className="text-xs text-muted-foreground">Início</p>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">
                  {subscription?.inicio
                    ? format(new Date(subscription.inicio), "dd/MM/yyyy", { locale: ptBR })
                    : '—'}
                </span>
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 space-y-1">
              <p className="text-xs text-muted-foreground">Expira em</p>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">
                  {subscription?.expira_em
                    ? `${format(new Date(subscription.expira_em), "dd/MM/yyyy", { locale: ptBR })} (${daysLeft ?? 0} dias)`
                    : '—'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-destructive">
            <LogOut className="h-5 w-5" />
            Conta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Membro desde{' '}
            {user?.created_at
              ? format(new Date(user.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
              : '—'}
          </p>
          <Button variant="destructive" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair da conta
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
