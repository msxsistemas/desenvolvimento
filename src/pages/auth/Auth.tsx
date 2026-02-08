import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { User } from '@supabase/supabase-js';
import { Eye, EyeOff, Mail, Lock, User as UserIcon, Phone, Gift, Loader2, ArrowRight, Sparkles, KeyRound, Send, X, Shield, Zap, Users } from 'lucide-react';
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

  // Password recovery form
  if (isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(220,25%,8%)] p-4 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0">
          <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] bg-[hsl(var(--brand))]/20 rounded-full blur-[150px] animate-pulse" />
          <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-[hsl(var(--brand-2))]/15 rounded-full blur-[150px] animate-pulse delay-1000" />
        </div>

        <div className="w-full max-w-md relative z-10">
          <div className="bg-[hsl(220,20%,12%)]/80 backdrop-blur-2xl border border-white/5 rounded-3xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full overflow-hidden ring-4 ring-[hsl(var(--brand))]/30 shadow-xl shadow-[hsl(var(--brand))]/30">
                <img src={logoPlay} alt="Logo" className="w-full h-full object-cover" />
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[hsl(var(--brand-2))]/10 border border-[hsl(var(--brand-2))]/20 text-[hsl(var(--brand-2))] text-xs font-medium mb-4">
                <KeyRound className="h-3 w-3" />
                Recuperação
              </div>
              <h1 className="text-2xl font-bold text-white">Redefinir Senha</h1>
              <p className="text-white/50 text-sm mt-2">Digite sua nova senha abaixo</p>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-sm font-medium text-white/70">Nova Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
                  <Input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-12 pr-12 h-14 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-[hsl(var(--brand-2))] focus:ring-2 focus:ring-[hsl(var(--brand-2))]/20"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-new-password" className="text-sm font-medium text-white/70">Confirmar Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
                  <Input
                    id="confirm-new-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirme sua nova senha"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="pl-12 pr-12 h-14 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-[hsl(var(--brand-2))] focus:ring-2 focus:ring-[hsl(var(--brand-2))]/20"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full h-14 text-base font-semibold bg-gradient-to-r from-[hsl(var(--brand))] to-[hsl(var(--brand-2))] hover:opacity-90 text-white rounded-xl shadow-lg shadow-[hsl(var(--brand))]/30 border-0"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  <>
                    Atualizar Senha
                    <ArrowRight className="ml-2 h-5 w-5" />
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
    <div className="min-h-screen flex bg-[hsl(220,25%,8%)] relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,hsl(var(--brand)/0.15),transparent_50%)]" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_right,hsl(var(--brand-2)/0.1),transparent_50%)]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[hsl(var(--brand))]/5 rounded-full blur-[200px]" />
      </div>

      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-[55%] items-center justify-center p-16 relative">
        <div className="max-w-lg relative z-10">
          {/* Logo with glow */}
          <div className="relative mb-10">
            <div className="absolute inset-0 w-32 h-32 bg-[hsl(var(--brand))]/40 rounded-full blur-3xl" />
            <div className="relative w-32 h-32 rounded-full overflow-hidden ring-4 ring-white/10 shadow-2xl shadow-[hsl(var(--brand))]/40">
              <img src={logoPlay} alt="Logo" className="w-full h-full object-cover" />
            </div>
          </div>
          
          <h1 className="text-6xl font-bold text-white mb-6 tracking-tight leading-tight">
            Msx Gestor
          </h1>
          
          <p className="text-xl text-white/60 mb-12 leading-relaxed">
            A plataforma completa para gerenciar seus clientes, planos e cobranças de forma inteligente.
          </p>

          {/* Feature cards */}
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(var(--brand))]/20 to-[hsl(var(--brand))]/5 flex items-center justify-center">
                <Zap className="h-6 w-6 text-[hsl(var(--brand))]" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Automação Inteligente</h3>
                <p className="text-white/50 text-sm">Cobranças automáticas via WhatsApp</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(var(--brand-2))]/20 to-[hsl(var(--brand-2))]/5 flex items-center justify-center">
                <Users className="h-6 w-6 text-[hsl(var(--brand-2))]" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Gestão Completa</h3>
                <p className="text-white/50 text-sm">Clientes, planos e produtos em um só lugar</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(var(--success))]/20 to-[hsl(var(--success))]/5 flex items-center justify-center">
                <Shield className="h-6 w-6 text-[hsl(var(--success))]" />
              </div>
              <div>
                <h3 className="text-white font-semibold">100% Seguro</h3>
                <p className="text-white/50 text-sm">Seus dados protegidos e criptografados</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <div className="relative inline-block">
              <div className="absolute inset-0 w-24 h-24 bg-[hsl(var(--brand))]/30 rounded-full blur-2xl" />
              <div className="relative w-24 h-24 mx-auto rounded-full overflow-hidden ring-4 ring-white/10 shadow-xl shadow-[hsl(var(--brand))]/30">
                <img src={logoPlay} alt="Logo" className="w-full h-full object-cover" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mt-6">Msx Gestor</h1>
          </div>

          {/* Form Card */}
          <div className="bg-[hsl(220,20%,12%)]/80 backdrop-blur-2xl border border-white/5 rounded-3xl shadow-2xl overflow-hidden">
            {/* Tab Switcher */}
            <div className="p-2 bg-black/20">
              <div className="flex bg-white/5 rounded-2xl p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('signin')}
                  className={`flex-1 py-3.5 text-sm font-semibold transition-all duration-300 rounded-xl ${
                    activeTab === 'signin'
                      ? 'bg-gradient-to-r from-[hsl(var(--brand))] to-[hsl(var(--brand-2))] text-white shadow-lg'
                      : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('signup')}
                  className={`flex-1 py-3.5 text-sm font-semibold transition-all duration-300 rounded-xl ${
                    activeTab === 'signup'
                      ? 'bg-gradient-to-r from-[hsl(var(--brand))] to-[hsl(var(--brand-2))] text-white shadow-lg'
                      : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  Cadastrar
                </button>
              </div>
            </div>

            <div className="p-6 lg:p-8">
              {activeTab === 'signin' ? (
                <>
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-white">Bem-vindo de volta!</h2>
                    <p className="text-white/50 text-sm mt-2">Entre com suas credenciais para continuar</p>
                  </div>

                  <form onSubmit={handleSignIn} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email" className="text-sm font-medium text-white/70">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
                        <Input
                          id="signin-email"
                          name="signin-email"
                          type="email"
                          placeholder="seu@email.com"
                          className="pl-12 h-14 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-[hsl(var(--brand-2))] focus:ring-2 focus:ring-[hsl(var(--brand-2))]/20 transition-all"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="signin-password" className="text-sm font-medium text-white/70">Senha</Label>
                        <button 
                          type="button" 
                          onClick={() => setResetDialogOpen(true)}
                          className="text-xs text-[hsl(var(--brand-2))] hover:text-[hsl(var(--brand))] transition-colors font-medium"
                        >
                          Esqueceu a senha?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
                        <Input
                          id="signin-password"
                          name="signin-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Sua senha"
                          className="pl-12 pr-12 h-14 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-[hsl(var(--brand-2))] focus:ring-2 focus:ring-[hsl(var(--brand-2))]/20 transition-all"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                    
                    <div className="pt-3">
                      <Button 
                        type="submit" 
                        className="w-full h-14 text-base font-semibold bg-gradient-to-r from-[hsl(var(--brand))] to-[hsl(var(--brand-2))] hover:opacity-90 text-white rounded-xl shadow-lg shadow-[hsl(var(--brand))]/30 border-0 transition-all duration-300 hover:shadow-xl hover:shadow-[hsl(var(--brand))]/40"
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
                    </div>
                  </form>
                </>
              ) : (
                <>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white">Criar conta</h2>
                    <p className="text-white/50 text-sm mt-2">Preencha os dados para começar</p>
                  </div>

                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="text-sm font-medium text-white/70">Nome completo</Label>
                      <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
                        <Input
                          id="signup-name"
                          name="signup-name"
                          type="text"
                          placeholder="Seu nome completo"
                          className="pl-12 h-14 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-[hsl(var(--brand-2))] focus:ring-2 focus:ring-[hsl(var(--brand-2))]/20"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-sm font-medium text-white/70">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
                        <Input
                          id="signup-email"
                          name="signup-email"
                          type="email"
                          placeholder="seu@email.com"
                          className="pl-12 h-14 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-[hsl(var(--brand-2))] focus:ring-2 focus:ring-[hsl(var(--brand-2))]/20"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-whatsapp" className="text-sm font-medium text-white/70">
                        WhatsApp <span className="text-white/30 text-xs">(opcional)</span>
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
                        <Input
                          id="signup-whatsapp"
                          name="signup-whatsapp"
                          type="tel"
                          placeholder="11999999999"
                          className="pl-12 h-14 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-[hsl(var(--brand-2))] focus:ring-2 focus:ring-[hsl(var(--brand-2))]/20"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="signup-password" className="text-sm font-medium text-white/70">Senha</Label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
                          <Input
                            id="signup-password"
                            name="signup-password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Mínimo 6"
                            className="pl-12 pr-10 h-14 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-[hsl(var(--brand-2))] focus:ring-2 focus:ring-[hsl(var(--brand-2))]/20"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password" className="text-sm font-medium text-white/70">Confirmar</Label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
                          <Input
                            id="confirm-password"
                            name="confirm-password"
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="Confirme"
                            className="pl-12 pr-10 h-14 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-[hsl(var(--brand-2))] focus:ring-2 focus:ring-[hsl(var(--brand-2))]/20"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Referral Code */}
                    <div className="space-y-2">
                      <Label htmlFor="referral-code" className="flex items-center gap-2 text-sm font-medium text-white/70">
                        <Gift className="h-4 w-4 text-[hsl(var(--brand))]" />
                        Código de indicação <span className="text-white/30 text-xs">(opcional)</span>
                      </Label>
                      <Input
                        id="referral-code"
                        name="referral-code"
                        type="text"
                        placeholder="REF_XXXXXXXX"
                        defaultValue={referralCode}
                        className="h-14 font-mono bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-[hsl(var(--brand-2))] focus:ring-2 focus:ring-[hsl(var(--brand-2))]/20"
                      />
                      {referralCode && (
                        <p className="text-xs text-[hsl(var(--brand))] flex items-center gap-1 font-medium">
                          <Sparkles className="h-3 w-3" />
                          Código de indicação aplicado!
                        </p>
                      )}
                    </div>

                    <div className="pt-2">
                      <Button 
                        type="submit" 
                        className="w-full h-14 text-base font-semibold bg-gradient-to-r from-[hsl(var(--brand))] to-[hsl(var(--brand-2))] hover:opacity-90 text-white rounded-xl shadow-lg shadow-[hsl(var(--brand))]/30 border-0"
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
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-white/40 mt-6">
            Ao continuar, você concorda com nossos{' '}
            <span className="text-[hsl(var(--brand-2))] hover:underline cursor-pointer">termos</span>
            {' '}e{' '}
            <span className="text-[hsl(var(--brand-2))] hover:underline cursor-pointer">privacidade</span>.
          </p>
        </div>
      </div>

      {/* Password Reset Modal */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="sm:max-w-md bg-[hsl(220,20%,12%)]/95 backdrop-blur-2xl border-white/10 p-0 overflow-hidden rounded-3xl">
          {/* Header */}
          <div className="relative bg-gradient-to-br from-[hsl(var(--brand))]/20 to-[hsl(var(--brand-2))]/10 p-8 text-center">
            <button
              onClick={() => setResetDialogOpen(false)}
              className="absolute right-4 top-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all"
            >
              <X className="h-4 w-4" />
            </button>
            
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[hsl(var(--brand-2))]/30 to-[hsl(var(--brand-2))]/10 flex items-center justify-center mb-4 ring-1 ring-white/10">
              <KeyRound className="h-8 w-8 text-[hsl(var(--brand-2))]" />
            </div>
            <h2 className="text-xl font-bold text-white">Recuperar Senha</h2>
            <p className="text-white/50 text-sm mt-2">Enviaremos um link para redefinir</p>
          </div>

          {/* Form */}
          <form onSubmit={handlePasswordReset} className="p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="reset-email" className="text-sm font-medium text-white/70">Email</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="pl-12 h-14 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-[hsl(var(--brand-2))] focus:ring-2 focus:ring-[hsl(var(--brand-2))]/20"
                  required
                />
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-14 text-base font-semibold bg-gradient-to-r from-[hsl(var(--brand))] to-[hsl(var(--brand-2))] hover:opacity-90 text-white rounded-xl shadow-lg shadow-[hsl(var(--brand))]/30 border-0"
              disabled={resetLoading}
            >
              {resetLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-5 w-5" />
                  Enviar link
                </>
              )}
            </Button>

            <p className="text-center text-xs text-white/40">
              Lembrou sua senha?{' '}
              <button 
                type="button"
                onClick={() => setResetDialogOpen(false)}
                className="text-[hsl(var(--brand-2))] hover:underline font-medium"
              >
                Voltar ao login
              </button>
            </p>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
