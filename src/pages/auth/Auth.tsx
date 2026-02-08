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
import logoPlay from '@/assets/logo-play.png';

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

  const features = [
    { icon: Zap, title: 'Automação Inteligente', desc: 'Cobranças automáticas via WhatsApp' },
    { icon: Users, title: 'Gestão de Clientes', desc: 'Controle completo dos seus clientes' },
    { icon: Shield, title: 'Seguro & Confiável', desc: 'Seus dados sempre protegidos' },
  ];

  // Password recovery form
  if (isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-brand/20 via-transparent to-transparent rounded-full blur-3xl" />
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-brand-2/20 via-transparent to-transparent rounded-full blur-3xl" />
        </div>

        <div className="w-full max-w-md relative z-10">
          <div className="backdrop-blur-xl bg-card/80 border border-border/50 rounded-3xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl overflow-hidden shadow-lg ring-2 ring-brand/30">
                <img src={logoPlay} alt="Logo" className="w-full h-full object-cover" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Redefinir Senha</h1>
              <p className="text-muted-foreground text-sm mt-2">Digite sua nova senha abaixo</p>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-sm font-medium">Nova Senha</Label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-brand transition-colors" />
                  <Input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-12 pr-12 h-14 bg-secondary/50 border-border/50 rounded-xl focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-new-password" className="text-sm font-medium">Confirmar Nova Senha</Label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-brand transition-colors" />
                  <Input
                    id="confirm-new-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirme sua nova senha"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="pl-12 pr-12 h-14 bg-secondary/50 border-border/50 rounded-xl focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full h-14 text-base font-semibold rounded-xl bg-gradient-to-r from-brand to-brand-2 hover:opacity-90 transition-opacity shadow-lg shadow-brand/25" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
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
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-brand/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-brand-2/10 rounded-full blur-[100px] translate-x-1/4 translate-y-1/4" />
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-brand/5 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* Left side - Branding (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 relative">
        <div className="max-w-lg relative z-10">
          {/* Logo & Title */}
          <div className="mb-12">
            <div className="w-24 h-24 mb-8 rounded-2xl overflow-hidden shadow-2xl ring-4 ring-brand/20">
              <img src={logoPlay} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-5xl font-bold text-foreground mb-4 tracking-tight">
              Msx <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-brand-2">Gestor</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              A plataforma completa para gerenciar seus clientes, planos e cobranças de forma simples e eficiente.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-6">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="flex items-start gap-4 p-4 rounded-2xl bg-card/40 backdrop-blur-sm border border-border/30 transition-all hover:bg-card/60 hover:border-border/50"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand/20 to-brand-2/20 flex items-center justify-center shrink-0">
                  <feature.icon className="w-6 h-6 text-brand" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl overflow-hidden shadow-lg ring-2 ring-brand/20">
              <img src={logoPlay} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">
              Msx <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-brand-2">Gestor</span>
            </h1>
          </div>

          {/* Form Card */}
          <div className="backdrop-blur-xl bg-card/80 border border-border/50 rounded-3xl shadow-2xl overflow-hidden">
            {/* Tab Switcher */}
            <div className="flex p-2 bg-secondary/30">
              <button
                type="button"
                onClick={() => setActiveTab('signin')}
                className={`flex-1 py-3.5 text-sm font-semibold rounded-xl transition-all duration-300 ${
                  activeTab === 'signin'
                    ? 'bg-gradient-to-r from-brand to-brand-2 text-primary-foreground shadow-lg shadow-brand/25'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('signup')}
                className={`flex-1 py-3.5 text-sm font-semibold rounded-xl transition-all duration-300 ${
                  activeTab === 'signup'
                    ? 'bg-gradient-to-r from-brand to-brand-2 text-primary-foreground shadow-lg shadow-brand/25'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Cadastrar
              </button>
            </div>

            <div className="p-6 lg:p-8">
              {activeTab === 'signin' ? (
                <>
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-foreground">Bem-vindo de volta!</h2>
                    <p className="text-muted-foreground mt-2">Entre com suas credenciais para continuar</p>
                  </div>

                  <form onSubmit={handleSignIn} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email" className="text-sm font-medium">Email</Label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-brand transition-colors" />
                        <Input
                          id="signin-email"
                          name="signin-email"
                          type="email"
                          placeholder="seu@email.com"
                          className="pl-12 h-14 bg-secondary/50 border-border/50 rounded-xl focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="signin-password" className="text-sm font-medium">Senha</Label>
                        <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                          <DialogTrigger asChild>
                            <button type="button" className="text-sm text-brand hover:text-brand-2 transition-colors font-medium">
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
                                  className="h-14 rounded-xl"
                                  required
                                />
                              </div>
                              <Button type="submit" className="w-full h-14 rounded-xl bg-gradient-to-r from-brand to-brand-2" disabled={resetLoading}>
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
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-brand transition-colors" />
                        <Input
                          id="signin-password"
                          name="signin-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Sua senha"
                          className="pl-12 pr-12 h-14 bg-secondary/50 border-border/50 rounded-xl focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full h-14 text-base font-semibold rounded-xl bg-gradient-to-r from-brand to-brand-2 hover:opacity-90 transition-opacity shadow-lg shadow-brand/25" 
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Entrando...
                        </>
                      ) : (
                        <>
                          Entrar
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>
                  </form>
                </>
              ) : (
                <>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-foreground">Criar sua conta</h2>
                    <p className="text-muted-foreground mt-2">Preencha os dados para começar</p>
                  </div>

                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="text-sm font-medium">Nome completo</Label>
                      <div className="relative group">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-brand transition-colors" />
                        <Input
                          id="signup-name"
                          name="signup-name"
                          type="text"
                          placeholder="Seu nome completo"
                          className="pl-12 h-14 bg-secondary/50 border-border/50 rounded-xl focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-sm font-medium">Email</Label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-brand transition-colors" />
                        <Input
                          id="signup-email"
                          name="signup-email"
                          type="email"
                          placeholder="seu@email.com"
                          className="pl-12 h-14 bg-secondary/50 border-border/50 rounded-xl focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-whatsapp" className="text-sm font-medium">
                        WhatsApp <span className="text-muted-foreground font-normal">(opcional)</span>
                      </Label>
                      <div className="relative group">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-brand transition-colors" />
                        <Input
                          id="signup-whatsapp"
                          name="signup-whatsapp"
                          type="tel"
                          placeholder="11999999999"
                          className="pl-12 h-14 bg-secondary/50 border-border/50 rounded-xl focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="signup-password" className="text-sm font-medium">Senha</Label>
                        <div className="relative group">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-brand transition-colors" />
                          <Input
                            id="signup-password"
                            name="signup-password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Mínimo 6"
                            className="pl-12 pr-10 h-14 bg-secondary/50 border-border/50 rounded-xl focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
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
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-brand transition-colors" />
                          <Input
                            id="confirm-password"
                            name="confirm-password"
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="Confirme"
                            className="pl-12 pr-10 h-14 bg-secondary/50 border-border/50 rounded-xl focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
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
                        <Gift className="h-4 w-4 text-brand" />
                        Código de indicação <span className="text-muted-foreground font-normal">(opcional)</span>
                      </Label>
                      <Input
                        id="referral-code"
                        name="referral-code"
                        type="text"
                        placeholder="REF_XXXXXXXX"
                        defaultValue={referralCode}
                        className="h-14 font-mono bg-secondary/50 border-border/50 rounded-xl focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all"
                      />
                      {referralCode && (
                        <p className="text-sm text-brand flex items-center gap-2 bg-brand/10 px-3 py-2 rounded-lg">
                          <Sparkles className="h-4 w-4" />
                          Código de indicação aplicado!
                        </p>
                      )}
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-14 text-base font-semibold rounded-xl bg-gradient-to-r from-brand to-brand-2 hover:opacity-90 transition-opacity shadow-lg shadow-brand/25" 
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Cadastrando...
                        </>
                      ) : (
                        <>
                          Criar conta
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>
                  </form>
                </>
              )}
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Ao continuar, você concorda com nossos{' '}
            <a href="#" className="text-brand hover:underline">termos de uso</a>
            {' '}e{' '}
            <a href="#" className="text-brand hover:underline">política de privacidade</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
