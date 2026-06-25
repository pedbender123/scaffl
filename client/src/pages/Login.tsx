import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FlaskConical, Loader2, Mail, Lock, User, ShieldAlert, Sparkles, ChevronRight, Sun, Moon } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme, ACCENT_COLORS } from '../contexts/ThemeContext';

export default function Login() {
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get('invite') || '';
  
  const [isLogin, setIsLogin] = useState(!inviteCode); // Se tiver invite code, vai direto pro Cadastro
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Estado para informações da sala de convite
  const [inviteInfo, setInviteInfo] = useState<{ className: string; instName: string } | null>(null);
  const [checkingInvite, setCheckingInvite] = useState(!!inviteCode);

  const { login, register } = useAuth();
  const { themeMode, accentColor, setThemeMode, setAccentColor } = useTheme();
  const navigate = useNavigate();

  const colorNames: Record<string, string> = {
    cyberSky: 'Cyber Sky',
    quantumGreen: 'Quantum Green',
    auraViolet: 'Aura Violet',
    white: 'Branco',
  };

  // Buscar informações do convite se houver código na URL
  useEffect(() => {
    if (!inviteCode) return;

    const fetchInviteInfo = async () => {
      try {
        const API_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:3001');
        const res = await fetch(`${API_URL}/api/auth/invite/${inviteCode}`);
        if (res.ok) {
          const data = await res.json();
          setInviteInfo(data);
        } else {
          setError('Link de convite inválido ou expirado.');
          setIsLogin(true); // Redireciona para o login
        }
      } catch (err) {
        console.error('Failed to fetch invite details:', err);
      } finally {
        setCheckingInvite(false);
      }
    };

    fetchInviteInfo();
  }, [inviteCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(name, email, password, inviteCode);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-zinc-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors duration-200">
      
      {/* PAINEL ESQUERDO: Manifesto e Branding SCAFFL (Somente em telas médias/grandes) */}
      <div 
        className="hidden lg:flex lg:w-1/2 relative border-r border-slate-200 dark:border-slate-800 flex-col justify-between p-12 overflow-hidden animate-in fade-in duration-500"
        style={{ background: 'linear-gradient(135deg, #047857 0%, #10b981 25%, #06b6d4 50%, #3b82f6 75%, #8b5cf6 100%)' }}
      >
        {/* Background Grafismos (Andaime Cognitivo) */}
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff15_1px,transparent_1px),linear-gradient(to_bottom,#ffffff15_1px,transparent_1px)] bg-[size:24px_24px]" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/10 rounded-full filter blur-3xl animate-pulse animate-duration-1000" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/10 rounded-full filter blur-3xl animate-pulse animate-duration-1500" />
        </div>

        {/* Topo Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-900 shadow-lg shadow-black/10">
            <FlaskConical size={20} className="text-emerald-600" />
          </div>
          <span className="font-display font-black text-xl tracking-wider text-white">SCAFFL</span>
        </div>

        {/* Centro: Manifesto */}
        <div className="relative max-w-lg my-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 border border-white/20 rounded-full text-[11px] font-medium text-white tracking-wider uppercase">
            <Sparkles size={12} className="text-cyan-300 animate-pulse" /> Andaime Cognitivo Científico
          </div>
          <h1 className="text-4xl font-extrabold text-white leading-tight font-display">
            A ciência não é feita para ser assistida. É feita para ser construída.
          </h1>
          <p className="text-slate-100/90 leading-relaxed text-sm">
            A SCAFFL não entrega respostas prontas; ela fornece a estrutura necessária para você modelar seu próprio entendimento. Uma parceria inteligente entre estudantes, professores e tecnologia para expandir o potencial acadêmico.
          </p>
        </div>

        {/* Rodapé Manifesto */}
        <div className="relative text-xs text-white/70 flex items-center gap-2">
          <span>© 2026 SCAFFL Platform. Todos os direitos reservados.</span>
        </div>
      </div>

      {/* PAINEL DIREITO: Formulário de Autenticação */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-8 sm:p-12 md:p-16 relative">
        {/* Controles de Aparência no Topo Direito */}
        <div className="absolute top-4 right-4 flex items-center gap-3 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200/50 dark:border-slate-800/50 shadow-sm z-10">
          {/* Botão de Tema */}
          <button
            type="button"
            onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-primary transition-all active:scale-90 cursor-pointer"
            title={themeMode === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
          >
            {themeMode === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          
          {/* Divisor */}
          <span className="w-px h-4 bg-slate-200 dark:bg-slate-800" />

          {/* Seletor de Cores */}
          <div className="flex gap-1.5">
            {Object.entries(ACCENT_COLORS).map(([name, hex]) => (
              <button
                key={name}
                type="button"
                onClick={() => setAccentColor(name)}
                className={cn(
                  "w-4 h-4 rounded-full transition-all border hover:scale-110 active:scale-90 relative cursor-pointer",
                  accentColor === name 
                    ? "border-primary scale-110 ring-2 ring-primary/20" 
                    : "border-slate-300 dark:border-slate-700"
                )}
                style={{ backgroundColor: hex }}
                title={colorNames[name] || name}
              >
                {accentColor === name && (
                  <span className={cn(
                    "absolute inset-0.5 rounded-full",
                    name === 'white' ? "bg-black" : "bg-white"
                  )} />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full max-w-md mx-auto my-auto space-y-8">
          
          {/* Logo mobile */}
          <div className="flex lg:hidden flex-col items-center mb-6">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/25 mb-3">
              <FlaskConical size={24} />
            </div>
            <span className="font-display font-black text-2xl tracking-wider scaffl-logo-text">SCAFFL</span>
          </div>

          <div className="space-y-3 text-center lg:text-left">
            <h2 className="text-3xl font-extrabold tracking-tight font-display">
              {isLogin ? 'Faça login' : 'Crie sua conta'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isLogin 
                ? 'Entre para continuar suas atividades científicas.' 
                : 'Insira seus dados para se registrar.'}
            </p>
          </div>

          {/* Banner do Código de Convite ativo */}
          {inviteInfo && !isLogin && (
            <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex gap-3 items-start animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-500 shrink-0">
                <Sparkles size={16} />
              </div>
              <div className="text-xs">
                <p className="font-bold text-emerald-600 dark:text-emerald-400">Convite Verificado</p>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                  Você está se registrando na sala <strong className="text-slate-800 dark:text-slate-200">{inviteInfo.className}</strong> de <strong className="text-slate-800 dark:text-slate-200">{inviteInfo.instName}</strong>.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/5 dark:bg-red-500/10 border border-red-500/25 rounded-2xl p-4 flex gap-3 text-sm text-red-600 dark:text-red-400 animate-in fade-in duration-200">
              <ShieldAlert size={20} className="shrink-0 text-red-500" />
              <div>
                <p className="font-bold">Ocorreu um problema</p>
                <p className="text-xs mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {checkingInvite ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 className="animate-spin text-primary" size={24} />
              <span>Validando convite da instituição...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Nome Completo</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
                      placeholder="Ex: João Silva"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">E-mail</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
                    placeholder="nome@exemplo.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Senha</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
                    placeholder="••••••••"
                    minLength={6}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    <span>{isLogin ? 'Entrar na Plataforma' : 'Finalizar Registro'}</span>
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Opções de alternância de login/cadastro ou aviso de cadastro privado */}
          {!checkingInvite && (
            <div className="text-center text-sm pt-4 border-t border-slate-200 dark:border-slate-900">
              {isLogin ? (
                inviteCode ? (
                  <>
                    <span className="text-slate-500 dark:text-slate-400">Usando o link de convite?</span>{' '}
                    <button
                      onClick={() => setIsLogin(false)}
                      className="text-primary font-bold hover:underline cursor-pointer"
                    >
                      Cadastre-se agora
                    </button>
                  </>
                ) : (
                  <div className="bg-slate-500/5 dark:bg-slate-500/10 border border-slate-200 dark:border-slate-900 p-4 rounded-2xl text-xs text-slate-500 dark:text-slate-400 text-left">
                    <p className="font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-300 mb-1">
                      <Lock size={12} /> Cadastro Restrito
                    </p>
                    O auto-cadastro público está desabilitado. Para se registrar na plataforma, você precisa utilizar o link ou ler o QR Code fornecido pela sua instituição de ensino.
                  </div>
                )
              ) : (
                <>
                  <span className="text-slate-500 dark:text-slate-400">Já possui uma conta?</span>{' '}
                  <button
                    onClick={() => setIsLogin(true)}
                    className="text-primary font-bold hover:underline cursor-pointer"
                  >
                    Faça login
                  </button>
                </>
              )}
            </div>
          )}

        </div>
        <div className="text-xs text-center text-slate-400 dark:text-slate-600 mt-8 shrink-0">
          SCAFFL Platform · Versão Experimental 2026
        </div>
      </div>
    </div>
  );
}
