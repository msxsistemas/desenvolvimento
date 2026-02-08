import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { User } from '@supabase/supabase-js';
import { Eye, EyeOff, Mail, Lock, User as UserIcon, Phone, Gift, Loader2, ArrowRight, Sparkles, KeyRound, Send, X } from 'lucide-react';
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

  // Get referral code from URL
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

  // If there's a referral code, default to signup tab
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

  // Reusable input component with icon
  const InputWithIcon = ({ 
    icon: Icon, 
    className = "", 
    ...props 
  }: { 
    icon: React.ElementType;
    className?: string;
  } & React.ComponentProps<typeof Input>) => (
    <div className="relative group">
      <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center pointer-events-none">
        <div className="w-8 h-8 rounded-lg bg-secondary/80 flex items-center justify-center group-focus-within:bg-[hsl(var(--brand-2))]/20 transition-colors duration-300">
          <Icon className="h-4 w-4 text-muted-foreground group-focus-within:text-[hsl(var(--brand-2))] transition-colors duration-300" />
        </div>
      </div>
      <Input
        className={`pl-14 h-12 bg-secondary/30 border-border/30 hover:border-border/60 focus:border-[hsl(var(--brand-2))] focus:ring-2 focus:ring-[hsl(var(--brand-2))]/10 transition-all duration-300 rounded-xl ${className}`}
        {...props}
      />
    </div>
  );

  // Reusable password input component
  const PasswordInput = ({ 
    show, 
    onToggle, 
    className = "", 
    ...props 
  }: { 
    show: boolean;
    onToggle: () => void;
    className?: string;
  } & React.ComponentProps<typeof Input>) => (
    <div className="relative group">
      <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center pointer-events-none">
        <div className="w-8 h-8 rounded-lg bg-secondary/80 flex items-center justify-center group-focus-within:bg-[hsl(var(--brand-2))]/20 transition-colors duration-300">
          <Lock className="h-4 w-4 text-muted-foreground group-focus-within:text-[hsl(var(--brand-2))] transition-colors duration-300" />
        </div>
      </div>
      <Input
        type={show ? 'text' : 'password'}
        className={`pl-14 pr-12 h-12 bg-secondary/30 border-border/30 hover:border-border/60 focus:border-[hsl(var(--brand-2))] focus:ring-2 focus:ring-[hsl(var(--brand-2))]/10 transition-all duration-300 rounded-xl ${className}`}
        {...props}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-all duration-200"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );

  // Gradient button component
  const GradientButton = ({ 
    children, 
    loading: isLoading, 
    loadingText,
    ...props 
  }: { 
    loading?: boolean;
    loadingText?: string;
  } & React.ComponentProps<typeof Button>) => (
    <Button 
      className="w-full h-12 text-base font-semibold bg-gradient-to-r from-[hsl(var(--brand))] to-[hsl(var(--brand-2))] hover:from-[hsl(var(--brand-2))] hover:to-[hsl(var(--brand))] text-white transition-all duration-500 rounded-xl shadow-lg shadow-[hsl(var(--brand))]/25 hover:shadow-[hsl(var(--brand-2))]/30 border-0 hover:scale-[1.02] active:scale-[0.98]" 
      disabled={isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </Button>
  );

  // Password recovery form
  if (isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        {/* Background effects */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[hsl(var(--brand))]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[hsl(var(--brand-2))]/10 rounded-full blur-3xl" />
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Card glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-[hsl(var(--brand))] via-[hsl(var(--brand-2))] to-[hsl(var(--brand))] rounded-3xl opacity-15 blur-xl animate-pulse" />
          
          <div className="relative bg-card/90 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl overflow-hidden shadow-xl shadow-[hsl(var(--brand))]/20 ring-2 ring-border/30">
                <img src={logoPlay} alt="Logo" className="w-full h-full object-cover" />
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[hsl(var(--brand-2))]/10 text-[hsl(var(--brand-2))] text-xs font-medium mb-4">
                <KeyRound className="h-3 w-3" />
                Recuperação de Senha
              </div>
              <h1 className="text-2xl font-bold text-foreground">Redefinir Senha</h1>
              <p className="text-muted-foreground text-sm mt-2">Digite sua nova senha abaixo</p>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-sm font-medium text-foreground/80">Nova Senha</Label>
                <PasswordInput
                  id="new-password"
                  show={showPassword}
                  onToggle={() => setShowPassword(!showPassword)}
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-new-password" className="text-sm font-medium text-foreground/80">Confirmar Nova Senha</Label>
                <PasswordInput
                  id="confirm-new-password"
                  show={showConfirmPassword}
                  onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                  placeholder="Confirme sua nova senha"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="pt-2">
                <GradientButton type="submit" loading={loading} loadingText="Atualizando...">
                  Atualizar Senha
                  <ArrowRight className="ml-2 h-4 w-4" />
                </GradientButton>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[hsl(var(--brand))]/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-[hsl(var(--brand-2))]/8 rounded-full blur-3xl" />
      </div>

      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 relative">
        <div className="max-w-md text-center relative z-10">
          <div className="w-28 h-28 mx-auto mb-8 rounded-2xl overflow-hidden shadow-2xl shadow-[hsl(var(--brand))]/30 ring-4 ring-border/20">
            <img src={logoPlay} alt="Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-5xl font-bold text-foreground mb-4 tracking-tight">
            Msx Gestor
          </h1>
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            Gerencie seus clientes, planos e cobranças de forma simples e eficiente.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border/30">
            <Sparkles className="h-4 w-4 text-[hsl(var(--brand))]" />
            <span className="text-sm text-muted-foreground">Automação de cobranças</span>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl overflow-hidden shadow-xl shadow-[hsl(var(--brand))]/20 ring-2 ring-border/30">
              <img src={logoPlay} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Msx Gestor</h1>
          </div>

          {/* Card Container */}
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-[hsl(var(--brand))] via-[hsl(var(--brand-2))] to-[hsl(var(--brand))] rounded-3xl opacity-15 blur-xl" />
            
            <div className="relative bg-card/90 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden">
              {/* Tab Switcher */}
              <div className="flex bg-secondary/20 p-1.5 m-4 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveTab('signin')}
                  className={`flex-1 py-3 text-sm font-semibold transition-all duration-300 rounded-lg ${
                    activeTab === 'signin'
                      ? 'bg-background text-foreground shadow-md'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('signup')}
                  className={`flex-1 py-3 text-sm font-semibold transition-all duration-300 rounded-lg ${
                    activeTab === 'signup'
                      ? 'bg-background text-foreground shadow-md'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Cadastrar
                </button>
              </div>

              <div className="px-6 pb-6 lg:px-8 lg:pb-8">
                {activeTab === 'signin' ? (
                  <>
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-foreground">Bem-vindo de volta!</h2>
                      <p className="text-sm text-muted-foreground mt-1">Entre com suas credenciais para continuar</p>
                    </div>

                    <form onSubmit={handleSignIn} className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email" className="text-sm font-medium text-foreground/80">Email</Label>
                        <InputWithIcon
                          icon={Mail}
                          id="signin-email"
                          name="signin-email"
                          type="email"
                          placeholder="seu@email.com"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="signin-password" className="text-sm font-medium text-foreground/80">Senha</Label>
                          <button 
                            type="button" 
                            onClick={() => setResetDialogOpen(true)}
                            className="text-xs text-[hsl(var(--brand-2))] hover:text-[hsl(var(--brand))] transition-colors font-medium"
                          >
                            Esqueceu a senha?
                          </button>
                        </div>
                        <PasswordInput
                          id="signin-password"
                          name="signin-password"
                          show={showPassword}
                          onToggle={() => setShowPassword(!showPassword)}
                          placeholder="Sua senha"
                          required
                        />
                      </div>
                      
                      <div className="pt-2">
                        <GradientButton type="submit" loading={loading} loadingText="Entrando...">
                          Entrar
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </GradientButton>
                      </div>
                    </form>
                  </>
                ) : (
                  <>
                    <div className="mb-5">
                      <h2 className="text-2xl font-bold text-foreground">Criar sua conta</h2>
                      <p className="text-sm text-muted-foreground mt-1">Preencha os dados para começar</p>
                    </div>

                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-name" className="text-sm font-medium text-foreground/80">Nome completo</Label>
                        <InputWithIcon
                          icon={UserIcon}
                          id="signup-name"
                          name="signup-name"
                          type="text"
                          placeholder="Seu nome completo"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-email" className="text-sm font-medium text-foreground/80">Email</Label>
                        <InputWithIcon
                          icon={Mail}
                          id="signup-email"
                          name="signup-email"
                          type="email"
                          placeholder="seu@email.com"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-whatsapp" className="text-sm font-medium text-foreground/80">
                          WhatsApp <span className="text-muted-foreground text-xs font-normal">(opcional)</span>
                        </Label>
                        <InputWithIcon
                          icon={Phone}
                          id="signup-whatsapp"
                          name="signup-whatsapp"
                          type="tel"
                          placeholder="11999999999"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="signup-password" className="text-sm font-medium text-foreground/80">Senha</Label>
                          <PasswordInput
                            id="signup-password"
                            name="signup-password"
                            show={showPassword}
                            onToggle={() => setShowPassword(!showPassword)}
                            placeholder="Mínimo 6"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirm-password" className="text-sm font-medium text-foreground/80">Confirmar</Label>
                          <PasswordInput
                            id="confirm-password"
                            name="confirm-password"
                            show={showConfirmPassword}
                            onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                            placeholder="Confirme"
                            required
                          />
                        </div>
                      </div>

                      {/* Referral Code Field */}
                      <div className="space-y-2">
                        <Label htmlFor="referral-code" className="flex items-center gap-2 text-sm font-medium text-foreground/80">
                          <Gift className="h-4 w-4 text-[hsl(var(--brand))]" />
                          Código de indicação <span className="text-muted-foreground text-xs font-normal">(opcional)</span>
                        </Label>
                        <Input
                          id="referral-code"
                          name="referral-code"
                          type="text"
                          placeholder="REF_XXXXXXXX"
                          defaultValue={referralCode}
                          className="h-12 font-mono bg-secondary/30 border-border/30 hover:border-border/60 focus:border-[hsl(var(--brand-2))] focus:ring-2 focus:ring-[hsl(var(--brand-2))]/10 transition-all duration-300 rounded-xl"
                        />
                        {referralCode && (
                          <p className="text-xs text-[hsl(var(--brand))] flex items-center gap-1 font-medium">
                            <Sparkles className="h-3 w-3" />
                            Código de indicação aplicado!
                          </p>
                        )}
                      </div>

                      <div className="pt-2">
                        <GradientButton type="submit" loading={loading} loadingText="Cadastrando...">
                          Criar conta
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </GradientButton>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Ao continuar, você concorda com nossos{' '}
            <span className="text-[hsl(var(--brand-2))] hover:underline cursor-pointer">termos de uso</span>
            {' '}e{' '}
            <span className="text-[hsl(var(--brand-2))] hover:underline cursor-pointer">política de privacidade</span>.
          </p>
        </div>
      </div>

      {/* Password Reset Modal */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-border/50 p-0 overflow-hidden">
          {/* Modal Header */}
          <div className="relative bg-gradient-to-r from-[hsl(var(--brand))]/10 via-[hsl(var(--brand-2))]/10 to-[hsl(var(--brand))]/10 p-6 pb-8">
            <button
              onClick={() => setResetDialogOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-all"
            >
              <X className="h-4 w-4" />
            </button>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[hsl(var(--brand))]/20 to-[hsl(var(--brand-2))]/20 flex items-center justify-center mb-4 ring-1 ring-border/30">
                <KeyRound className="h-7 w-7 text-[hsl(var(--brand-2))]" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Recuperar Senha</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Enviaremos um link para redefinir sua senha
              </p>
            </div>
          </div>

          {/* Modal Body */}
          <form onSubmit={handlePasswordReset} className="p-6 pt-4 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="reset-email" className="text-sm font-medium text-foreground/80">
                Endereço de email
              </Label>
              <InputWithIcon
                icon={Mail}
                id="reset-email"
                type="email"
                placeholder="seu@email.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
              />
            </div>
            
            <GradientButton type="submit" loading={resetLoading} loadingText="Enviando...">
              <Send className="mr-2 h-4 w-4" />
              Enviar link de recuperação
            </GradientButton>

            <p className="text-center text-xs text-muted-foreground">
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
