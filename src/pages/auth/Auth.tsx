import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { User } from '@supabase/supabase-js';
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  User as UserIcon, 
  Phone, 
  Gift, 
  Loader2, 
  ArrowRight, 
  Sparkles, 
  KeyRound, 
  Send, 
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import logoMsx from '@/assets/logo-msx-circular.png';

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
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
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

  // Clear messages when switching tabs
  useEffect(() => {
    setFormError(null);
    setFormSuccess(null);
  }, [activeTab]);

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setFormError(null);
    setFormSuccess(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('signup-name') as string;
    const email = formData.get('signup-email') as string;
    const whatsapp = formData.get('signup-whatsapp') as string;
    const password = formData.get('signup-password') as string;
    const confirmPassword = formData.get('confirm-password') as string;
    const refCode = formData.get('referral-code') as string;

    if (!name.trim()) {
      setFormError('Por favor, informe seu nome');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setFormError('As senhas não coincidem');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setFormError('A senha deve ter pelo menos 6 caracteres');
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
          setFormError('Este email já está cadastrado. Tente fazer login.');
        } else {
          setFormError(error.message);
        }
      } else {
        setFormSuccess('Conta criada! Verifique seu email para confirmar.');
        toast.success('Conta criada com sucesso!');
      }
    } catch (error) {
      setFormError('Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setFormError(null);
    setFormSuccess(null);

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
          setFormError('Email ou senha incorretos');
        } else {
          setFormError(error.message);
        }
      } else {
        setFormSuccess('Login realizado com sucesso!');
        toast.success('Bem-vindo de volta!');
      }
    } catch (error) {
      setFormError('Erro ao fazer login. Tente novamente.');
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
        toast.success('Email de recuperação enviado!');
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
    setFormError(null);

    if (!newPassword.trim()) {
      setFormError('Por favor, informe a nova senha');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setFormError('A senha deve ter pelo menos 6 caracteres');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setFormError('As senhas não coincidem');
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
        setFormError(errorMessage);
      } else {
        toast.success('Senha atualizada com sucesso!');
        setIsRecovery(false);
        setNewPassword('');
        setConfirmNewPassword('');
        navigate('/');
      }
    } catch (error) {
      setFormError('Erro ao atualizar senha');
    } finally {
      setLoading(false);
    }
  };

  // Password recovery form
  if (isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0a0a0f]">
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-600/15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[150px]" />
        </div>
        
        {/* Grid overlay removido */}

        <div className="w-full max-w-md relative z-10">
          <div className="bg-[#12121a]/80 backdrop-blur-2xl border border-white/[0.08] rounded-3xl shadow-2xl shadow-black/50 p-8 animate-fade-in">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full blur-xl opacity-50" />
                <div className="relative w-20 h-20 rounded-full overflow-hidden ring-2 ring-cyan-400/30 shadow-xl shadow-blue-500/30">
                  <img src={logoMsx} alt="Logo" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>

            {/* Badge */}
            <div className="flex justify-center mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium">
                <KeyRound className="h-3.5 w-3.5" />
                Recuperação de Senha
              </span>
            </div>

            <h1 className="text-2xl font-bold text-white text-center mb-2">Redefinir Senha</h1>
            <p className="text-gray-400 text-sm text-center mb-8">Digite sua nova senha abaixo</p>

            {/* Error message */}
            {formError && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 animate-fade-in">
                <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
                <p className="text-red-400 text-sm">{formError}</p>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-sm font-medium text-gray-300">Nova Senha</Label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl opacity-0 group-focus-within:opacity-100 blur transition-opacity -m-0.5" />
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                    <Input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-12 pr-12 h-13 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-gray-500 rounded-xl focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-new-password" className="text-sm font-medium text-gray-300">Confirmar Senha</Label>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl opacity-0 group-focus-within:opacity-100 blur transition-opacity -m-0.5" />
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                    <Input
                      id="confirm-new-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirme sua nova senha"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="pl-12 pr-12 h-13 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-gray-500 rounded-xl focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-13 text-base font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl shadow-lg shadow-purple-500/25 border-0 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/30 hover:-translate-y-0.5"
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
    <div className="min-h-screen flex relative overflow-hidden bg-[#0a0a0f]">
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[200px]" />
      </div>
      
      {/* Grid overlay removido */}

      {/* Left side - Branding */}
      <div className="hidden lg:flex flex-1 items-center justify-center relative z-10">
        <div className="text-center px-12 animate-fade-in">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full blur-2xl opacity-40" />
              <div className="relative w-24 h-24 rounded-full overflow-hidden ring-4 ring-cyan-400/20 shadow-2xl shadow-blue-500/30">
                <img src={logoMsx} alt="Logo" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl font-bold text-white mb-4">Msx Gestor</h1>
          
          {/* Description */}
          <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto leading-relaxed">
            Gerencie seus clientes, planos e cobranças de forma simples e eficiente.
          </p>

          {/* Feature badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] border border-white/[0.08] text-gray-300 text-sm">
            <Sparkles className="h-4 w-4 text-purple-400" />
            Automação de cobranças
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-[#12121a]/80 backdrop-blur-2xl border border-white/[0.08] rounded-3xl shadow-2xl shadow-black/50 overflow-hidden animate-fade-in">
            {/* Mobile Logo header - only visible on mobile */}
            <div className="lg:hidden pt-8 pb-4 flex flex-col items-center">
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full blur-xl opacity-40" />
                <div className="relative w-16 h-16 rounded-full overflow-hidden ring-2 ring-cyan-400/20 shadow-lg shadow-blue-500/30">
                  <img src={logoMsx} alt="Logo" className="w-full h-full object-cover" />
                </div>
              </div>
              <h1 className="text-xl font-bold text-white mb-1">Msx Gestor</h1>
              <p className="text-gray-400 text-xs">Gerencie suas cobranças com eficiência</p>
            </div>

            {/* Desktop minimal header */}
            <div className="hidden lg:block pt-8 pb-2">
              <p className="text-gray-400 text-sm text-center">Acesse sua conta</p>
            </div>

          {/* Tab Switcher */}
          <div className="px-6 mb-6">
            <div className="relative bg-white/[0.03] p-1.5 rounded-2xl border border-white/[0.05]">
              {/* Sliding background */}
              <div 
                className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl shadow-lg transition-all duration-300 ease-out"
                style={{ 
                  left: activeTab === 'signin' ? '6px' : 'calc(50%)',
                }}
              />
              <div className="relative flex">
                <button
                  type="button"
                  onClick={() => setActiveTab('signin')}
                  className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-colors duration-300 ${
                    activeTab === 'signin' ? 'text-white' : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('signup')}
                  className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-colors duration-300 ${
                    activeTab === 'signup' ? 'text-white' : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Cadastrar
                </button>
              </div>
            </div>
          </div>

          <div className="px-6 pb-8">
            {/* Error message */}
            {formError && (
              <div className="mb-5 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 animate-fade-in">
                <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
                <p className="text-red-400 text-sm">{formError}</p>
              </div>
            )}

            {/* Success message */}
            {formSuccess && (
              <div className="mb-5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 animate-fade-in">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                <p className="text-emerald-400 text-sm">{formSuccess}</p>
              </div>
            )}

            {/* Sign In Form */}
            <div className={`transition-all duration-300 ${activeTab === 'signin' ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'}`}>
              {activeTab === 'signin' && (
                <form onSubmit={handleSignIn} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-sm font-medium text-gray-300">Email</Label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl opacity-0 group-focus-within:opacity-100 blur transition-opacity -m-0.5" />
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                        <Input
                          id="signin-email"
                          name="signin-email"
                          type="email"
                          placeholder="seu@email.com"
                          className="pl-12 h-13 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-gray-500 rounded-xl focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="signin-password" className="text-sm font-medium text-gray-300">Senha</Label>
                      <button 
                        type="button" 
                        onClick={() => setResetDialogOpen(true)}
                        className="text-xs text-purple-400 hover:text-purple-300 transition-colors font-medium"
                      >
                        Esqueceu a senha?
                      </button>
                    </div>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl opacity-0 group-focus-within:opacity-100 blur transition-opacity -m-0.5" />
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                        <Input
                          id="signin-password"
                          name="signin-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Sua senha"
                          className="pl-12 pr-12 h-13 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-gray-500 rounded-xl focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-13 text-base font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl shadow-lg shadow-purple-500/25 border-0 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/30 hover:-translate-y-0.5"
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
              )}
            </div>

            {/* Sign Up Form */}
            <div className={`transition-all duration-300 ${activeTab === 'signup' ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'}`}>
              {activeTab === 'signup' && (
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-sm font-medium text-gray-300">Nome completo</Label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl opacity-0 group-focus-within:opacity-100 blur transition-opacity -m-0.5" />
                      <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                        <Input
                          id="signup-name"
                          name="signup-name"
                          type="text"
                          placeholder="Seu nome completo"
                          className="pl-12 h-13 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-gray-500 rounded-xl focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-sm font-medium text-gray-300">Email</Label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl opacity-0 group-focus-within:opacity-100 blur transition-opacity -m-0.5" />
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                        <Input
                          id="signup-email"
                          name="signup-email"
                          type="email"
                          placeholder="seu@email.com"
                          className="pl-12 h-13 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-gray-500 rounded-xl focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-whatsapp" className="text-sm font-medium text-gray-300">
                      WhatsApp <span className="text-gray-500 text-xs">(opcional)</span>
                    </Label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl opacity-0 group-focus-within:opacity-100 blur transition-opacity -m-0.5" />
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                        <Input
                          id="signup-whatsapp"
                          name="signup-whatsapp"
                          type="tel"
                          placeholder="11999999999"
                          className="pl-12 h-13 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-gray-500 rounded-xl focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-sm font-medium text-gray-300">Senha</Label>
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl opacity-0 group-focus-within:opacity-100 blur transition-opacity -m-0.5" />
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                          <Input
                            id="signup-password"
                            name="signup-password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Mínimo 6"
                            className="pl-12 pr-10 h-13 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-gray-500 rounded-xl focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password" className="text-sm font-medium text-gray-300">Confirmar</Label>
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl opacity-0 group-focus-within:opacity-100 blur transition-opacity -m-0.5" />
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                          <Input
                            id="confirm-password"
                            name="confirm-password"
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="Confirme"
                            className="pl-12 pr-10 h-13 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-gray-500 rounded-xl focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Referral Code */}
                  <div className="space-y-2">
                    <Label htmlFor="referral-code" className="flex items-center gap-2 text-sm font-medium text-gray-300">
                      <Gift className="h-4 w-4 text-purple-400" />
                      Código de indicação <span className="text-gray-500 text-xs">(opcional)</span>
                    </Label>
                    <Input
                      id="referral-code"
                      name="referral-code"
                      type="text"
                      placeholder="REF_XXXXXXXX"
                      defaultValue={referralCode}
                      className="h-13 font-mono bg-white/[0.03] border-white/[0.08] text-white placeholder:text-gray-500 rounded-xl focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    />
                    {referralCode && (
                      <p className="text-xs text-purple-400 flex items-center gap-1.5 font-medium">
                        <Sparkles className="h-3.5 w-3.5" />
                        Código de indicação aplicado!
                      </p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-13 text-base font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl shadow-lg shadow-purple-500/25 border-0 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/30 hover:-translate-y-0.5"
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
              )}
            </div>
          </div>

          {/* Footer inside card */}
          <div className="px-6 pb-6">
            <p className="text-center text-xs text-gray-500">
              Ao continuar, você concorda com nossos{' '}
              <span className="text-purple-400 hover:text-purple-300 cursor-pointer transition-colors">termos</span>
              {' '}e{' '}
              <span className="text-purple-400 hover:text-purple-300 cursor-pointer transition-colors">privacidade</span>.
            </p>
          </div>
        </div>
      </div>
    </div>

      {/* Password Reset Modal */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="sm:max-w-md bg-[#12121a]/95 backdrop-blur-2xl border-white/[0.08] p-0 overflow-hidden rounded-3xl">
          {/* Header with gradient */}
          <div className="relative bg-gradient-to-br from-purple-600/20 via-blue-600/10 to-transparent p-8 text-center">
            <button
              onClick={() => setResetDialogOpen(false)}
              className="absolute right-4 top-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
            >
              <X className="h-4 w-4" />
            </button>
            
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-500/30 to-blue-500/20 flex items-center justify-center mb-4 ring-1 ring-white/10">
              <KeyRound className="h-8 w-8 text-purple-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Recuperar Senha</h2>
            <p className="text-gray-400 text-sm mt-2">Enviaremos um link para redefinir</p>
          </div>

          {/* Form */}
          <form onSubmit={handlePasswordReset} className="p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="reset-email" className="text-sm font-medium text-gray-300">Email</Label>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl opacity-0 group-focus-within:opacity-100 blur transition-opacity -m-0.5" />
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="pl-12 h-13 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-gray-500 rounded-xl focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    required
                  />
                </div>
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-13 text-base font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl shadow-lg shadow-purple-500/25 border-0 transition-all duration-300"
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

            <p className="text-center text-xs text-gray-500">
              Lembrou sua senha?{' '}
              <button 
                type="button"
                onClick={() => setResetDialogOpen(false)}
                className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
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
