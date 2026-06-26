import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation, useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api, AppNotification } from '../lib/api';
import {
  Settings, LogOut, Menu, X, GraduationCap, BookOpen,
  ChevronLeft, ChevronRight, FlaskConical,
  Home, ChevronDown, Monitor, Users2, Sparkles, MessageSquare,
  Bell, BellRing, Check, Calendar, AlertCircle, Info, School
} from 'lucide-react';
import { cn } from '../lib/utils';

type SectionId = 'home' | 'lab' | 'class';

export default function Layout() {
  const { user, logout, userData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { chatId } = useParams<{ chatId: string }>();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState<Set<SectionId>>(new Set(['home']));
  
  // States de Notificações
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [alertNotifs, setAlertNotifs] = useState<AppNotification[]>([]); // Notificações pendentes de pop-up invasivo
  const [showApology, setShowApology] = useState(false);

  useEffect(() => {
    if (user && userData && !userData.isAdmin) {
      const dismissed = localStorage.getItem('scaffl_apology_dismissed');
      if (!dismissed) {
        setShowApology(true);
      }
    }
  }, [user, userData]);

  const handleDismissApology = () => {
    localStorage.setItem('scaffl_apology_dismissed', 'true');
    setShowApology(false);
  };
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fechar o dropdown de notificações se clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Buscar notificações na inicialização
  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, location.pathname]);

  const fetchNotifications = async () => {
    try {
      const list = await api.notifications.getAll();
      setNotifications(list);
      
      // Filtra as que o usuário ainda não viu no pop-up invasivo
      const unseen = list.filter(n => n.seen === 0);
      if (unseen.length > 0) {
        setAlertNotifs(unseen);
      }
    } catch (err) {
      console.error('Erro ao buscar notificações:', err);
    }
  };

  // Marca notificação como visualizada no pop-up invasivo
  const handleDismissAlert = async () => {
    try {
      for (const n of alertNotifs) {
        await api.notifications.markAsSeen(n.id);
      }
      setAlertNotifs([]);
      // Atualiza lista local de notificações
      fetchNotifications();
    } catch (err) {
      console.error('Erro ao marcar alertas como vistos:', err);
    }
  };

  // Descartar notificação individualmente da lista flutuante (arquivar/limpar)
  const handleDismissSingleNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.notifications.dismiss(id);
      // Remove do estado local
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Erro ao descartar notificação:', err);
    }
  };

  // Auto-open section based on current route
  useEffect(() => {
    if (location.pathname.startsWith('/lab')) {
      setOpenSections(prev => new Set([...prev, 'lab']));
    } else if (location.pathname.startsWith('/class')) {
      setOpenSections(prev => new Set([...prev, 'class']));
    } else {
      setOpenSections(prev => new Set([...prev, 'home']));
    }
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleSection = (id: SectionId) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isActive = (path: string) =>
    path === '/lab'
      ? location.pathname.startsWith('/lab')
      : location.pathname === path || location.pathname.startsWith(path + '/');

  const SubLink = ({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) => (
    <Link
      to={to}
      onClick={() => setSidebarOpen(false)}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ml-2',
        isActive(to)
          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50',
      )}
    >
      <Icon size={15} className="shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );

  const SectionHeader = ({ id, icon: Icon, label }: { id: SectionId; icon: React.ElementType; label: string }) => {
    const open = openSections.has(id);
    return (
      <button
        onClick={() => toggleSection(id)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all',
          isCollapsed ? 'md:justify-center' : 'justify-between',
          'text-slate-500 dark:text-slate-400 hover:bg-slate-200/40 dark:hover:bg-slate-800/40',
        )}
        title={isCollapsed ? label : undefined}
      >
        <div className="flex items-center gap-3">
          <Icon size={17} className="shrink-0 text-primary" />
          {!isCollapsed && <span>{label}</span>}
        </div>
        {!isCollapsed && (
          <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} />
        )}
      </button>
    );
  };

  // Notificações não descartadas (dismissed = 0)
  const activeNotifications = notifications.filter(n => n.dismissed === 0);

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-slate-950 overflow-hidden font-sans text-slate-900 dark:text-slate-50">

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed md:static inset-y-0 left-0 z-50 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 ease-in-out',
        sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0',
        isCollapsed ? 'md:w-20' : 'md:w-64',
      )}>
        {/* Logo */}
        <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 h-16 shrink-0">
          <Link to="/" className={cn('flex items-center gap-3 text-primary font-bold text-xl tracking-wider', isCollapsed && 'md:hidden')}>
            <div className="bg-primary text-primary-foreground p-1.5 rounded-xl shrink-0">
              <FlaskConical size={20} />
            </div>
            <span className="font-display tracking-tight font-black scaffl-logo-text">SCAFFL</span>
          </Link>
          {isCollapsed && (
            <Link to="/" className="hidden md:flex bg-primary text-primary-foreground p-1.5 rounded-xl shrink-0 mx-auto">
              <FlaskConical size={20} />
            </Link>
          )}
          <div className="flex items-center gap-2">
            <button className="hidden md:flex text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
              {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
            <button className="md:hidden text-slate-500 p-1" onClick={() => setSidebarOpen(false)}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Sections */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar p-3 space-y-1">

          {/* ── HOME ── */}
          <SectionHeader id="home" icon={Home} label="Home" />
          {openSections.has('home') && !isCollapsed && (
            <div className="space-y-1 mb-1">
              <SubLink to="/chat" icon={MessageSquare} label="Chat" />
              {!!userData?.isAdmin && (
                <>
                  <SubLink to="/mural" icon={Users2} label="Professores" />
                  <SubLink to="/disciplinas" icon={BookOpen} label="Disciplinas" />
                  <SubLink to="/activities-admin" icon={Calendar} label="Atividades Admin" />
                  <SubLink to="/classrooms-admin" icon={School} label="Turmas Admin" />
                  <SubLink to="/ia-usage-admin" icon={Sparkles} label="Consumo de IA" />
                </>
              )}
            </div>
          )}

          {/* ── LAB ── */}
          <SectionHeader id="lab" icon={FlaskConical} label="Lab" />
          {openSections.has('lab') && !isCollapsed && (
            <div className="space-y-1 mb-1">
              <SubLink to="/lab" icon={Monitor} label="Simuladores" />
            </div>
          )}

          {/* ── CLASS ── */}
          <SectionHeader id="class" icon={GraduationCap} label="Class" />
          {openSections.has('class') && !isCollapsed && (
            <div className="space-y-1 mb-1">
              <SubLink to="/class" icon={GraduationCap} label="Mural" />
            </div>
          )}

          {/* Collapsed: direct icon nav */}
          {isCollapsed && (
            <div className="hidden md:flex flex-col items-center gap-2 mt-2">
              <Link to="/chat" className={cn('p-2 rounded-xl transition-all', isActive('/chat') ? 'bg-primary text-primary-foreground' : 'text-slate-400 hover:bg-slate-800/50')} title="Chat">
                <MessageSquare size={18} />
              </Link>
              <Link to="/lab" className={cn('p-2 rounded-xl transition-all', isActive('/lab') ? 'bg-primary text-primary-foreground' : 'text-slate-400 hover:bg-slate-800/50')} title="Simuladores">
                <Monitor size={18} />
              </Link>
              <Link to="/class" className={cn('p-2 rounded-xl transition-all', isActive('/class') ? 'bg-primary text-primary-foreground' : 'text-slate-400 hover:bg-slate-800/50')} title="Mural">
                <GraduationCap size={18} />
              </Link>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2 shrink-0">
          <button
            onClick={() => { navigate('/settings'); setSidebarOpen(false); }}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all text-sm cursor-pointer',
              location.pathname === '/settings'
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50',
              isCollapsed && 'md:justify-center',
            )}
            title={isCollapsed ? 'Configurações' : undefined}
          >
            <Settings size={18} className="shrink-0" />
            {!isCollapsed && <span>Configurações</span>}
          </button>

          <div className={cn('flex items-center gap-3 p-3 bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl mt-2', isCollapsed && 'md:justify-center md:px-0')}>
            <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">
              {userData?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </div>
            {!isCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-slate-900 dark:text-slate-100 truncate">{userData?.name || 'Usuário'}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                </div>
                <button onClick={handleLogout} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 cursor-pointer" title="Sair">
                  <LogOut size={16} />
                </button>
              </>
            )}
          </div>
          {isCollapsed && (
            <button onClick={handleLogout} className="w-full hidden md:flex items-center justify-center p-2 mt-1 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" title="Sair">
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Global Unified Header */}
        <header className="h-16 shrink-0 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 bg-white dark:bg-slate-900 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="text-slate-500 p-1 md:hidden cursor-pointer">
              <Menu size={22} />
            </button>
            <span className="font-display tracking-tight font-black text-slate-800 dark:text-white text-lg">
              {location.pathname === '/class' ? 'Mural (AVA)' : 
               location.pathname.startsWith('/chat') ? 'Monitorias de Chat' : 
               location.pathname.startsWith('/lab') ? 'Laboratório de Simuladores' : 
               location.pathname === '/settings' ? 'Configurações' :
               location.pathname === '/mural' ? 'Gerenciador de Personas' : 
               location.pathname === '/disciplinas' ? 'Ementas de Disciplinas' : 
               location.pathname === '/activities-admin' ? 'Painel de Atividades' : 'SCAFFL'}
            </span>
          </div>

          {/* Notifications area */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className={cn(
                "relative w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors cursor-pointer",
                activeNotifications.length > 0 && "text-primary dark:text-primary-light"
              )}
            >
              {activeNotifications.length > 0 ? (
                <>
                  <BellRing size={18} className="animate-wiggle" />
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 border border-white dark:border-slate-900 text-[10px] font-black text-white flex items-center justify-center shadow-md animate-pulse">
                    {activeNotifications.length}
                  </span>
                </>
              ) : (
                <Bell size={18} />
              )}
            </button>

            {/* Notification Dropdown Panel */}
            {showNotifDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-slideUp">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                  <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                    Notificações e Avisos
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                    {activeNotifications.length} ativos
                  </span>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {activeNotifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 dark:text-slate-550">
                      <Bell size={24} className="mx-auto mb-2 opacity-35" />
                      <p className="text-xs font-semibold">Tudo limpo por aqui!</p>
                    </div>
                  ) : (
                    activeNotifications.map(n => (
                      <div 
                        key={n.id}
                        className="p-4 flex gap-3 hover:bg-slate-50 dark:hover:bg-slate-850/30 transition-colors group relative"
                      >
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                          <Calendar size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                            {n.title}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-450 leading-relaxed mt-0.5 break-words">
                            {n.content}
                          </p>
                          <span className="text-[9px] text-slate-400 dark:text-slate-600 block mt-1">
                            {new Date(n.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>

                        <button
                          onClick={(e) => handleDismissSingleNotification(n.id, e)}
                          className="absolute right-2 top-2 w-6 h-6 rounded-md bg-slate-100 hover:bg-rose-500/10 dark:bg-slate-800 hover:text-rose-500 flex items-center justify-center text-slate-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                          title="Limpar Notificação"
                        >
                          <Check size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-center">
                  <Link 
                    to="/class" 
                    onClick={() => setShowNotifDropdown(false)}
                    className="text-[10px] font-bold text-primary hover:underline block py-1"
                  >
                    Ver todas as atividades no mural
                  </Link>
                </div>
              </div>
            )}
          </div>
        </header>

        {showApology && (
          <div className="bg-gradient-to-r from-violet-600/90 to-indigo-600/90 backdrop-blur-md text-white px-6 py-4 flex items-center justify-between gap-4 border-b border-indigo-500/20 animate-fadeIn relative shrink-0 shadow-md">
            <div className="flex items-center gap-3.5 max-w-5xl">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-indigo-200 shrink-0">
                <Sparkles size={18} className="animate-pulse" />
              </div>
              <div className="text-xs md:text-sm text-indigo-50 leading-relaxed">
                <span className="font-extrabold text-white">Novidade:</span> O assistente de IA <span className="font-extrabold text-white">Petrus</span> está ativo! Converse com ele para tirar dúvidas, explorar conceitos e receber orientações socrática durante seus estudos.
              </div>
            </div>
            <button 
              onClick={handleDismissApology}
              className="p-1.5 hover:bg-white/10 rounded-xl transition-all text-indigo-200 hover:text-white cursor-pointer shrink-0"
              title="Fechar Aviso"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-auto relative">
          <Outlet />
        </div>
      </main>

      {/* Modal de Alerta Invasivo / Primeiras Notificações */}
      {alertNotifs.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 text-center animate-slideUp">
            
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mx-auto mb-4 animate-bounce">
              <AlertCircle size={28} />
            </div>

            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">
              Novidades e Prazos Disponíveis!
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-450 leading-relaxed mb-6">
              Você possui {alertNotifs.length} {alertNotifs.length === 1 ? 'nova atividade cadastrada' : 'novas atividades cadastradas'} para a sua sala de aula. Confira os prazos no seu painel.
            </p>

            {/* Listagem rápida no modal */}
            <div className="space-y-3 mb-6 max-h-40 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-955 rounded-2xl border border-slate-100 dark:border-slate-850">
              {alertNotifs.map(n => (
                <div key={n.id} className="p-3 text-left bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Calendar size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{n.title}</p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{n.content}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleDismissAlert}
              className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-bold text-sm rounded-2xl shadow-lg shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
            >
              Estou Ciente
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
