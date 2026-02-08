import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { User } from '@supabase/supabase-js';
import { Eye, EyeOff, Mail, Lock, User as UserIcon, Phone, Gift, Loader2, ArrowRight, Sparkles, Shield, Zap, Users } from 'lucide-react';
import logoMsx from '@/assets/logo-msx.png';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const referralCode = searchParams.get('ref') || '';

  useEffect(() => {
    document.title = activeTab === 'signin' ? 'Entrar | Msx Gestor' : 'Cadastro | Msx Gestor';
  }, [activeTab]);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    
    if (type === 'recovery') {
      setIsRecovery(true);
      return;
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
        navigate('/');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      } else if (session?.user && !isRecovery) {
        setUser(session.user);
        navigate('/');
      } else if (!session) {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, isRecovery]);

  useEffect(() => {
    if (referralCode) {
      setActiveTab('signup');
    }
  }, [referralCode]);

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('signup-name') as string;
    const email = formData.get('signup-email') as string;
    const whatsapp = formData.get('signup-whatsapp') as string;
    const password = formData.get('signup-password') as string;
    const confirmPassword = formData.get('confirm-password') as string;
    const refCode = formData.get('referral-code') as string;

    if (!name.trim()) {
      toast.error('Por favor, informe seu nome');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: name.trim(),
            whatsapp: whatsapp?.trim() || null,
            referral_code: refCode?.trim() || null,
          }
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast.error('Este email já está cadastrado. Tente fazer login.');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success('Conta criada com sucesso! Verifique seu email para confirmar.');
      }
    } catch (error) {
      toast.error('Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('signin-email') as string;
    const password = formData.get('signin-password') as string;

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Email ou senha incorretos');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success('Login realizado com sucesso!');
      }
    } catch (error) {
      toast.error('Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResetLoading(true);

    if (!resetEmail.trim()) {
      toast.error('Por favor, informe seu email');
      setResetLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Email de recuperação enviado! Verifique sua caixa de entrada.');
        setResetDialogOpen(false);
        setResetEmail('');
      }
    } catch (error) {
      toast.error('Erro ao enviar email de recuperação');
    } finally {
      setResetLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    if (!newPassword.trim()) {
      toast.error('Por favor, informe a nova senha');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error('As senhas não coincidem');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        let errorMessage = error.message;
        if (error.message.includes('New password should be different from the old password')) {
          errorMessage = 'A nova senha deve ser diferente da senha anterior';
        } else if (error.message.includes('Password should be at least')) {
          errorMessage = 'A senha deve ter pelo menos 6 caracteres';
        }
        toast.error(errorMessage);
      } else {
        toast.success('Senha atualizada com sucesso!');
        setIsRecovery(false);
        setNewPassword('');
        setConfirmNewPassword('');
        navigate('/');
      }
    } catch (error) {
      toast.error('Erro ao atualizar senha');
    } finally {
      setLoading(false);
    }
  };

  // Password recovery form
  if (isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-[radial-gradient(circle,hsl(var(--brand)/0.15)_0%,transparent_50%)] animate-pulse" />
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-[radial-gradient(circle,hsl(var(--brand-2)/0.1)_0%,transparent_50%)] animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="w-full max-w-md relative z-10">
          <div className="backdrop-blur-xl bg-card/80 border border-border/50 rounded-3xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl overflow-hidden shadow-lg ring-2 ring-border/50 bg-gradient-to-br from-card to-background p-1">
                <img src={logoMsx} alt="Logo" className="w-full h-full object-contain rounded-xl" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Redefinir Senha</h1>
              <p className="text-muted-foreground text-sm mt-2">Digite sua nova senha abaixo</p>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-sm font-medium">Nova Senha</Label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                  <Input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-11 pr-11 h-12 bg-background/50 border-border/50 focus:border-ring focus:ring-2 focus:ring-ring/20 rounded-xl transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-new-password" className="text-sm font-medium">Confirmar Nova Senha</Label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                  <Input
                    id="confirm-new-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirme sua nova senha"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="pl-11 pr-11 h-12 bg-background/50 border-border/50 focus:border-ring focus:ring-2 focus:ring-ring/20 rounded-xl transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-[hsl(var(--brand))] to-[hsl(var(--brand-2))] hover:opacity-90 transition-opacity shadow-lg" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  'Atualizar Senha'
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-[radial-gradient(circle,hsl(var(--brand)/0.12)_0%,transparent_60%)] blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-[radial-gradient(circle,hsl(var(--brand-2)/0.08)_0%,transparent_60%)] blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-[radial-gradient(circle,hsl(var(--ring)/0.05)_0%,transparent_50%)]" />
      </div>

      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-[45%] items-center justify-center p-12 relative">
        <div className="max-w-lg text-center relative z-10">
          {/* Logo with glow effect */}
          <div className="relative inline-block mb-10">
            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--brand))] to-[hsl(var(--brand-2))] rounded-3xl blur-2xl opacity-30 scale-110" />
            <div className="relative w-28 h-28 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-border/30 bg-gradient-to-br from-card to-background p-2">
              <img src={logoMsx} alt="Logo" className="w-full h-full object-contain rounded-2xl" />
            </div>
          </div>
          
          <h1 className="text-5xl font-bold text-foreground mb-4 tracking-tight">
            Msx Gestor
          </h1>
          <p className="text-lg text-muted-foreground mb-12 leading-relaxed">
            A plataforma completa para gerenciar seus clientes, planos e cobranças de forma inteligente.
          </p>

          {/* Feature cards */}
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-card/40 backdrop-blur-sm border border-border/30 text-left">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(var(--success))] to-[hsl(var(--success)/0.7)] flex items-center justify-center shrink-0">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Automação Inteligente</h3>
                <p className="text-sm text-muted-foreground">Cobranças automáticas via WhatsApp</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-card/40 backdrop-blur-sm border border-border/30 text-left">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(var(--brand-2))] to-[hsl(var(--brand-2)/0.7)] flex items-center justify-center shrink-0">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Gestão Completa</h3>
                <p className="text-sm text-muted-foreground">Clientes, planos e produtos em um só lugar</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-card/40 backdrop-blur-sm border border-border/30 text-left">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(var(--brand))] to-[hsl(var(--brand)/0.7)] flex items-center justify-center shrink-0">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Seguro e Confiável</h3>
                <p className="text-sm text-muted-foreground">Seus dados sempre protegidos</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--brand))] to-[hsl(var(--brand-2))] rounded-2xl blur-xl opacity-30 scale-110" />
              <div className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-xl ring-1 ring-border/30 bg-gradient-to-br from-card to-background p-1.5">
                <img src={logoMsx} alt="Logo" className="w-full h-full object-contain rounded-xl" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Msx Gestor</h1>
          </div>

          <div className="backdrop-blur-xl bg-card/60 border border-border/40 rounded-3xl shadow-2xl overflow-hidden">
            {/* Tab Switcher */}
            <div className="flex p-1.5 m-4 mb-0 rounded-2xl bg-background/50">
              <button
                type="button"
                onClick={() => setActiveTab('signin')}
                className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all duration-300 ${
                  activeTab === 'signin'
                    ? 'bg-gradient-to-r from-[hsl(var(--brand))] to-[hsl(var(--brand-2))] text-white shadow-lg'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('signup')}
                className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all duration-300 ${
                  activeTab === 'signup'
                    ? 'bg-gradient-to-r from-[hsl(var(--brand))] to-[hsl(var(--brand-2))] text-white shadow-lg'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Cadastrar
              </button>
            </div>

            <div className="p-6 lg:p-8">
              {activeTab === 'signin' ? (
                <>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-foreground">Bem-vindo de volta!</h2>
                    <p className="text-sm text-muted-foreground mt-1">Entre com suas credenciais para continuar</p>
                  </div>

                  <form onSubmit={handleSignIn} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email" className="text-sm font-medium">Email</Label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                        <Input
                          id="signin-email"
                          name="signin-email"
                          type="email"
                          placeholder="seu@email.com"
                          className="pl-11 h-12 bg-background/50 border-border/50 focus:border-ring focus:ring-2 focus:ring-ring/20 rounded-xl transition-all"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="signin-password" className="text-sm font-medium">Senha</Label>
                        <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                          <DialogTrigger asChild>
                            <button type="button" className="text-xs font-medium text-[hsl(var(--brand-2))] hover:text-[hsl(var(--brand))] transition-colors">
                              Esqueceu a senha?
                            </button>
                          </DialogTrigger>
                          <DialogContent className="rounded-2xl">
                            <DialogHeader>
                              <DialogTitle>Recuperar senha</DialogTitle>
                              <DialogDescription>
                                Digite seu email para receber o link de recuperação.
                              </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handlePasswordReset} className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="reset-email">Email</Label>
                                <Input
                                  id="reset-email"
                                  type="email"
                                  placeholder="seu@email.com"
                                  value={resetEmail}
                                  onChange={(e) => setResetEmail(e.target.value)}
                                  className="h-12 rounded-xl"
                                  required
                                />
                              </div>
                              <Button type="submit" className="w-full h-12 rounded-xl" disabled={resetLoading}>
                                {resetLoading ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Enviando...
                                  </>
                                ) : (
                                  'Enviar link'
                                )}
                              </Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                        <Input
                          id="signin-password"
                          name="signin-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Sua senha"
                          className="pl-11 pr-11 h-12 bg-background/50 border-border/50 focus:border-ring focus:ring-2 focus:ring-ring/20 rounded-xl transition-all"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-[hsl(var(--brand))] to-[hsl(var(--brand-2))] hover:opacity-90 transition-opacity shadow-lg" 
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Entrando...
                        </>
                      ) : (
                        <>
                          Entrar
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                </>
              ) : (
                <>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-foreground">Criar sua conta</h2>
                    <p className="text-sm text-muted-foreground mt-1">Preencha os dados para começar</p>
                  </div>

                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="text-sm font-medium">Nome completo</Label>
                      <div className="relative group">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                        <Input
                          id="signup-name"
                          name="signup-name"
                          type="text"
                          placeholder="Seu nome completo"
                          className="pl-11 h-12 bg-background/50 border-border/50 focus:border-ring focus:ring-2 focus:ring-ring/20 rounded-xl transition-all"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-sm font-medium">Email</Label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                        <Input
                          id="signup-email"
                          name="signup-email"
                          type="email"
                          placeholder="seu@email.com"
                          className="pl-11 h-12 bg-background/50 border-border/50 focus:border-ring focus:ring-2 focus:ring-ring/20 rounded-xl transition-all"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-whatsapp" className="text-sm font-medium">
                        WhatsApp <span className="text-muted-foreground text-xs font-normal">(opcional)</span>
                      </Label>
                      <div className="relative group">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                        <Input
                          id="signup-whatsapp"
                          name="signup-whatsapp"
                          type="tel"
                          placeholder="11999999999"
                          className="pl-11 h-12 bg-background/50 border-border/50 focus:border-ring focus:ring-2 focus:ring-ring/20 rounded-xl transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="signup-password" className="text-sm font-medium">Senha</Label>
                        <div className="relative group">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                          <Input
                            id="signup-password"
                            name="signup-password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Mínimo 6"
                            className="pl-10 pr-10 h-12 bg-background/50 border-border/50 focus:border-ring focus:ring-2 focus:ring-ring/20 rounded-xl transition-all"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password" className="text-sm font-medium">Confirmar</Label>
                        <div className="relative group">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                          <Input
                            id="confirm-password"
                            name="confirm-password"
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="Confirme"
                            className="pl-10 pr-10 h-12 bg-background/50 border-border/50 focus:border-ring focus:ring-2 focus:ring-ring/20 rounded-xl transition-all"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Referral Code Field */}
                    <div className="space-y-2">
                      <Label htmlFor="referral-code" className="text-sm font-medium flex items-center gap-2">
                        <Gift className="h-4 w-4 text-[hsl(var(--brand))]" />
                        Código de indicação <span className="text-muted-foreground text-xs font-normal">(opcional)</span>
                      </Label>
                      <Input
                        id="referral-code"
                        name="referral-code"
                        type="text"
                        placeholder="REF_XXXXXXXX"
                        defaultValue={referralCode}
                        className="h-12 font-mono bg-background/50 border-border/50 focus:border-ring focus:ring-2 focus:ring-ring/20 rounded-xl transition-all"
                      />
                      {referralCode && (
                        <p className="text-xs text-[hsl(var(--success))] flex items-center gap-1.5 font-medium">
                          <Sparkles className="h-3 w-3" />
                          Código de indicação aplicado!
                        </p>
                      )}
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-[hsl(var(--brand))] to-[hsl(var(--brand-2))] hover:opacity-90 transition-opacity shadow-lg" 
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Cadastrando...
                        </>
                      ) : (
                        <>
                          Criar conta
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                </>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Ao continuar, você concorda com nossos termos de uso e política de privacidade.
          </p>
        </div>
      </div>
    </div>
  );
}
