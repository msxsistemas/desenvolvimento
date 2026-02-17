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
import { InlineError } from '@/components/ui/inline-error';
import { useSystemLogo } from '@/hooks/useSystemLogo';
import iconMsx from '@/assets/icon-msx.png';

export default function Auth() {
  const logoUrl = useSystemLogo();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Get referral code from URL
  const referralCode = searchParams.get('ref') || '';

  useEffect(() => {
    document.title = isSignUp ? 'Cadastro | Msx Gestor' : 'Entrar | Msx Gestor';
  }, [isSignUp]);

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
        const planParam = searchParams.get('plan');
        navigate(planParam ? `/ativar-plano?plan=${planParam}` : '/');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      } else if (session?.user && !isRecovery) {
        setUser(session.user);
        const planParam = searchParams.get('plan');
        navigate(planParam ? `/ativar-plano?plan=${planParam}` : '/');
      } else if (!session) {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, isRecovery]);

  // If there's a referral code, default to signup
  useEffect(() => {
    if (referralCode) {
      setIsSignUp(true);
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

    // name is validated by required attribute

    if (password !== confirmPassword) {
      setAuthError('As senhas não coincidem');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setAuthError('A senha deve ter pelo menos 6 caracteres');
      setLoading(false);
      return;
    }
    setAuthError(null);

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
        } else if (error.message.includes('rate limit') || error.message.includes('429')) {
          toast.error('Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.');
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
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('Email não confirmado. Verifique sua caixa de entrada.');
        } else if (error.message.includes('rate limit') || error.message.includes('429')) {
          toast.error('Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.');
        } else if (error.message.includes('User not found')) {
          toast.error('Usuário não encontrado.');
        } else {
          toast.error('Erro ao fazer login. Tente novamente.');
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

    // resetEmail is validated by required attribute

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

    // newPassword is validated by required attribute

    if (newPassword.length < 6) {
      setAuthError('A senha deve ter pelo menos 6 caracteres');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setAuthError('As senhas não coincidem');
      setLoading(false);
      return;
    }
    setAuthError(null);

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
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full overflow-hidden shadow-lg">
                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Redefinir Senha</h1>
              <p className="text-muted-foreground text-sm mt-1">Digite sua nova senha abaixo</p>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 bg-secondary border-border"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-new-password">Confirmar Nova Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm-new-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirme sua nova senha"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 bg-secondary border-border"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <InlineError message={authError} />
              <Button 
                type="submit" 
                className="w-full h-12 text-base bg-gradient-to-r from-[hsl(280,70%,50%)] to-[hsl(199,89%,48%)] hover:from-[hsl(280,70%,45%)] hover:to-[hsl(199,89%,43%)] text-white border-0" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  <>
                    Atualizar Senha
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center p-12">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(220,25%,12%)] via-[hsl(220,20%,16%)] to-[hsl(220,25%,10%)]" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, hsl(199,89%,48%) 0%, transparent 50%), radial-gradient(circle at 75% 75%, hsl(280,70%,50%) 0%, transparent 50%)' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(hsl(0,0%,100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0,0%,100%) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        
        <div className="relative z-10 max-w-md text-center">
          {/* Logo circle with glow */}
          <div className="relative w-28 h-28 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[hsl(199,89%,48%)] to-[hsl(280,70%,50%)] opacity-30 blur-xl animate-pulse" />
            <div className="relative w-28 h-28 rounded-full border-2 border-[hsl(199,89%,48%)]/30 overflow-hidden shadow-2xl bg-[hsl(220,25%,15%)] flex items-center justify-center">
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
            </div>
          </div>

          <h1 className="text-4xl font-bold text-white mb-2">
            Gestor <span className="text-transparent bg-clip-text bg-gradient-to-r from-[hsl(199,89%,58%)] to-[hsl(199,89%,48%)]">MSX</span>
          </h1>
          <p className="text-[hsl(220,15%,60%)] text-lg mb-10">
            Gerencie seus clientes, planos e cobranças de forma simples e eficiente.
          </p>

          {/* Feature pills */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/10">
              <div className="w-8 h-8 rounded-lg bg-[hsl(199,89%,48%)]/15 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-[hsl(199,89%,48%)]" />
              </div>
              <span className="text-[hsl(220,15%,75%)] text-sm">Automação de cobranças</span>
            </div>
            <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/10">
              <div className="w-8 h-8 rounded-lg bg-[hsl(280,70%,50%)]/15 flex items-center justify-center">
                <Zap className="h-4 w-4 text-[hsl(280,70%,50%)]" />
              </div>
              <span className="text-[hsl(220,15%,75%)] text-sm">Integração com WhatsApp</span>
            </div>
            <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/10">
              <div className="w-8 h-8 rounded-lg bg-[hsl(150,60%,40%)]/15 flex items-center justify-center">
                <Users className="h-4 w-4 text-[hsl(150,60%,45%)]" />
              </div>
              <span className="text-[hsl(220,15%,75%)] text-sm">Gestão completa de clientes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <img src={iconMsx} alt="MSX" className="w-10 h-10 rounded-lg" />
              <h1 className="text-2xl font-bold text-foreground">
                Gestor <span className="text-primary">MSX</span>
              </h1>
            </div>
            <p className="text-muted-foreground text-sm">Gerencie seus clientes com facilidade</p>
          </div>

          <div className="bg-card border border-border rounded-3xl p-8 lg:p-10 shadow-2xl">
            {!isSignUp ? (
              // Login Form
              <div className="space-y-5">
                <div className="text-center space-y-1">
                  <h2 className="text-2xl font-bold text-foreground">Entrar</h2>
                  <p className="text-muted-foreground text-sm">Acesse sua conta para continuar</p>
                </div>

                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="signin-email" className="text-sm font-medium">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-email"
                        name="signin-email"
                        type="email"
                        placeholder="seu@email.com"
                        className="pl-11 h-12 bg-secondary/50 border-border/50 rounded-xl focus:border-primary/50 transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="signin-password" className="text-sm font-medium">Senha</Label>
                      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                        <DialogTrigger asChild>
                          <button type="button" className="text-xs text-primary hover:underline font-medium">
                            Esqueceu a senha?
                          </button>
                        </DialogTrigger>
                        <DialogContent>
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
                            <Button 
                              type="submit" 
                              className="w-full h-12 rounded-xl bg-gradient-to-r from-[hsl(280,70%,50%)] to-[hsl(199,89%,48%)] hover:from-[hsl(280,70%,45%)] hover:to-[hsl(199,89%,43%)] text-white border-0" 
                              disabled={resetLoading}
                            >
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
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-password"
                        name="signin-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Sua senha"
                        className="pl-11 pr-11 h-12 bg-secondary/50 border-border/50 rounded-xl focus:border-primary/50 transition-colors"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base rounded-xl bg-gradient-to-r from-[hsl(280,70%,50%)] to-[hsl(199,89%,48%)] hover:from-[hsl(280,70%,45%)] hover:to-[hsl(199,89%,43%)] text-white border-0 font-medium shadow-lg shadow-[hsl(280,70%,50%)]/20" 
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

                {/* Separator */}
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/50" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-4 text-muted-foreground font-medium">OU</span>
                  </div>
                </div>

                {/* Create account link */}
                <div className="text-center">
                  <p className="text-muted-foreground text-sm">
                    Ainda não tem conta?{' '}
                    <button
                      type="button"
                      onClick={() => setIsSignUp(true)}
                      className="text-primary hover:underline font-semibold"
                    >
                      Criar conta gratuita
                    </button>
                  </p>
                </div>
              </div>
            ) : (
              // Signup Form
              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-muted-foreground text-sm">Crie sua conta</p>
                  <h2 className="text-2xl font-bold text-foreground mt-2">Cadastrar</h2>
                  <p className="text-muted-foreground text-sm mt-1">Preencha seus dados para começar</p>
                </div>

                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome completo</Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-name"
                        name="signup-name"
                        type="text"
                        placeholder="Seu nome"
                        className="pl-10 h-12 bg-secondary border-border"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        name="signup-email"
                        type="email"
                        placeholder="seu@email.com"
                        className="pl-10 h-12 bg-secondary border-border"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-whatsapp">WhatsApp (opcional)</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-whatsapp"
                        name="signup-whatsapp"
                        type="tel"
                        placeholder="(00) 00000-0000"
                        maxLength={15}
                        className="pl-10 h-12 bg-secondary border-border"
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, '');
                          if (value.length > 11) value = value.slice(0, 11);
                          if (value.length > 7) {
                            value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
                          } else if (value.length > 2) {
                            value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
                          } else if (value.length > 0) {
                            value = `(${value}`;
                          }
                          e.target.value = value;
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        name="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Mínimo 6 caracteres"
                        className="pl-10 pr-10 h-12 bg-secondary border-border"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirm-password"
                        name="confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirme sua senha"
                        className="pl-10 pr-10 h-12 bg-secondary border-border"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="referral-code">Código de indicação (opcional)</Label>
                    <div className="relative">
                      <Gift className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="referral-code"
                        name="referral-code"
                        type="text"
                        placeholder="REF_XXXXXX"
                        defaultValue={referralCode}
                        className="pl-10 h-12 bg-secondary border-border"
                      />
                    </div>
                  </div>

                  <InlineError message={authError} />

                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base bg-gradient-to-r from-[hsl(280,70%,50%)] to-[hsl(199,89%,48%)] hover:from-[hsl(280,70%,45%)] hover:to-[hsl(199,89%,43%)] text-white border-0" 
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando conta...
                      </>
                    ) : (
                      <>
                        Criar conta
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>

                {/* Separator */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-4 text-muted-foreground">OU</span>
                  </div>
                </div>

                {/* Login link */}
                <div className="text-center">
                  <p className="text-muted-foreground text-sm">
                    Já tem uma conta?{' '}
                    <button
                      type="button"
                      onClick={() => setIsSignUp(false)}
                      className="text-primary hover:underline font-medium"
                    >
                      Fazer login
                    </button>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
