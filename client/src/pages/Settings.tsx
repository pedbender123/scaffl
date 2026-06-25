import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, ACCENT_COLORS } from '../contexts/ThemeContext';
import { Moon, Sun, Palette, Zap, Shield, Building2, Users, Plus, Mail, Globe, X, ShieldAlert, ChevronLeft, UserCheck, UserX, PanelRightOpen, PanelRightClose, Eye, EyeOff, ShieldCheck, Terminal, RefreshCw, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronRight, MoreVertical, QrCode, Edit3, Trash2, Copy, Check, Lock } from 'lucide-react';
import { cn } from '../lib/utils';
import { api, Institution, UserAdmin } from '../lib/api';
import { motion, AnimatePresence } from 'motion/react';

export default function Settings() {
  const { userData, refreshUserData } = useAuth();
  const { themeMode, accentColor, setThemeMode, setAccentColor } = useTheme();
  const [activeTab, setActiveTab] = useState<'usage' | 'appearance' | 'admin' | 'security'>('usage');

  // Security State
  const [secRuns, setSecRuns] = useState<any[]>([]);
  const [secLoading, setSecLoading] = useState(false);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [runDetail, setRunDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Admin State
  const [adminTab, setAdminTab] = useState<'users' | 'institutions'>('institutions');
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [users, setUsers] = useState<UserAdmin[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  // Institution detail
  const [selectedInst, setSelectedInst] = useState<Institution | null>(null);
  const [membersOpen, setMembersOpen] = useState(true);

  // Classrooms State
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loadingClassrooms, setLoadingClassrooms] = useState(false);
  const [showNewClassroom, setShowNewClassroom] = useState(false);
  const [newClassroomName, setNewClassroomName] = useState('');
  const [editingClassroomId, setEditingClassroomId] = useState<string | null>(null);
  const [editingClassroomName, setEditingClassroomName] = useState('');
  const [inviteClassroom, setInviteClassroom] = useState<Classroom | null>(null);
  const [activeActionsMenu, setActiveActionsMenu] = useState<string | null>(null);

  // New Institution Form
  const [showNewInst, setShowNewInst] = useState(false);
  const [newInst, setNewInst] = useState({ name: '', domain: '' });

  // New User Form
  const [showNewUser, setShowNewUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);

  useEffect(() => {
    if (activeTab === 'admin' && userData?.isAdmin) {
      loadAdminData();
    }
    if (activeTab === 'security' && userData?.isAdmin) {
      loadSecurityRuns();
    }
  }, [activeTab, userData?.isAdmin]);

  const loadSecurityRuns = async () => {
    setSecLoading(true);
    try {
      const runs = await api.get<any[]>('/api/admin/security/runs');
      setSecRuns(runs);
    } catch (e) {
      console.error(e);
    } finally {
      setSecLoading(false);
    }
  };

  const toggleRunDetail = async (runId: string) => {
    if (expandedRun === runId) { setExpandedRun(null); setRunDetail(null); return; }
    setExpandedRun(runId);
    setLoadingDetail(true);
    try {
      const data = await api.get<any>(`/api/admin/security/runs/${runId}`);
      setRunDetail(data);
    } catch (e) { console.error(e); }
    finally { setLoadingDetail(false); }
  };

  // Reset institution detail on tab change
  useEffect(() => {
    setSelectedInst(null);
  }, [adminTab]);

  const loadAdminData = async () => {
    setLoadingAdmin(true);
    try {
      const [insts, usrs] = await Promise.all([
        api.admin.institutions.getAll(),
        api.admin.users.getAll()
      ]);
      setInstitutions(insts);
      setUsers(usrs);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoadingAdmin(false);
    }
  };

  const handleCreateInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.admin.institutions.create(newInst);
      setNewInst({ name: '', domain: '' });
      setShowNewInst(false);
      loadAdminData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingUser(true);
    try {
      await api.post('/api/admin/users', newUser);
      setNewUser({ name: '', email: '', password: '' });
      setShowNewUser(false);
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Erro ao criar usuário.');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleToggleMembership = async (userId: string, instId: string, isMember: boolean) => {
    try {
      if (isMember) {
        await api.delete(`/api/admin/users/${userId}/institutions/${instId}`);
      } else {
        await api.post(`/api/admin/users/${userId}/institutions`, { institutionId: instId });
      }
      await loadAdminData();
      if (userId === userData?.id) await refreshUserData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Classrooms Effects and Handlers
  useEffect(() => {
    if (!selectedInst) {
      setClassrooms([]);
      return;
    }
    const fetchClassrooms = async () => {
      setLoadingClassrooms(true);
      try {
        const data = await api.admin.classrooms.getByInstitution(selectedInst.id);
        setClassrooms(data);
      } catch (err) {
        console.error('Failed to load classrooms:', err);
      } finally {
        setLoadingClassrooms(false);
      }
    };
    fetchClassrooms();
  }, [selectedInst]);

  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInst || !newClassroomName.trim()) return;
    try {
      const newClass = await api.admin.classrooms.create(selectedInst.id, newClassroomName.trim());
      setClassrooms(prev => [...prev, newClass]);
      setNewClassroomName('');
      setShowNewClassroom(false);
    } catch (err: any) {
      alert(err.message || 'Erro ao criar sala.');
    }
  };

  const handleRenameClassroom = async (id: string) => {
    if (!editingClassroomName.trim()) return;
    try {
      const updated = await api.admin.classrooms.update(id, editingClassroomName.trim());
      setClassrooms(prev => prev.map(c => c.id === id ? { ...c, name: updated.name } : c));
      setEditingClassroomId(null);
      setEditingClassroomName('');
    } catch (err: any) {
      alert(err.message || 'Erro ao renomear sala.');
    }
  };

  const handleDeleteClassroom = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta sala? Os alunos vinculados serão desassociados.')) return;
    try {
      await api.admin.classrooms.delete(id);
      setClassrooms(prev => prev.filter(c => c.id !== id));
      if (activeActionsMenu === id) setActiveActionsMenu(null);
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir sala.');
    }
  };

  if (!userData) return null;

  const creditsMonthly = userData.creditsMonthly || 0;
  const hasInstitution = (userData.institutions?.length || 0) > 0;
  const limitMonthly = hasInstitution ? 1_000_000 : 100_000;
  const projectLimit = hasInstitution ? 10 : 5;
  const usageMonthly = Math.min((creditsMonthly / limitMonthly) * 100, 100);

  return (
    <div className="p-5 max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Configurações</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-sm">Gerencie sua conta e preferências do sistema.</p>
      </div>

      {/* Main tabs */}
      <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 w-fit">
        <button onClick={() => setActiveTab('usage')} className={cn("px-3 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5", activeTab === 'usage' ? "bg-white dark:bg-slate-800 text-primary shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>
          <Zap size={14} /> Uso
        </button>
        <button onClick={() => setActiveTab('appearance')} className={cn("px-3 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5", activeTab === 'appearance' ? "bg-white dark:bg-slate-800 text-primary shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>
          <Palette size={14} /> Aparência
        </button>
        {!!userData.isAdmin && (
          <button onClick={() => setActiveTab('admin')} className={cn("px-3 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5", activeTab === 'admin' ? "bg-white dark:bg-slate-800 text-primary shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>
            <Shield size={14} /> Admin
          </button>
        )}
        {!!userData.isAdmin && (
          <button onClick={() => setActiveTab('security')} className={cn("px-3 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5", activeTab === 'security' ? "bg-white dark:bg-slate-800 text-primary shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>
            <ShieldCheck size={14} /> Segurança
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* ===== USO ===== */}
        {activeTab === 'usage' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><Zap size={20} /></div>
              <div>
                <h2 className="text-base font-bold">Consumo Mensal</h2>
                <p className="text-xs text-slate-505">Acompanhamento do uso de créditos de IA.</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Créditos Gastos</span>
                  <p className="text-2xl font-black text-primary">{creditsMonthly.toLocaleString()}</p>
                </div>
                <div className="text-right space-y-0.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Limite da Cota</span>
                  <p className="text-lg font-bold text-slate-400">{limitMonthly.toLocaleString()}</p>
                </div>
              </div>
              <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
                <motion.div initial={{ width: 0 }} animate={{ width: `${usageMonthly}%` }} className={cn("h-full rounded-full transition-all duration-500", usageMonthly > 90 ? "bg-red-500" : usageMonthly > 75 ? "bg-yellow-500" : "bg-primary")} />
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400 leading-relaxed space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Plano</span>
                  <span className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg", hasInstitution ? "bg-primary/10 text-primary" : "bg-slate-200 dark:bg-slate-800 text-slate-500")}>
                    {hasInstitution ? 'Institucional' : 'Gratuito'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Projetos no Lab</span>
                  <span className="text-[10px] font-black text-slate-500">até {projectLimit} projetos</span>
                </div>
                <p className="text-[11px] pt-1 border-t border-slate-200 dark:border-slate-800">O SCAFFL opera em créditos de baixo custo (1 crédito = 1 token). Seu saldo é renovado automaticamente todo mês.</p>
              </div>
            </div>
          </div>
        )}

        {/* ===== APARÊNCIA ===== */}
        {activeTab === 'appearance' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><Palette size={20} /></div>
              <div>
                <h2 className="text-base font-bold">Personalização</h2>
                <p className="text-xs text-slate-500">Ajuste o visual do seu ambiente de estudos.</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Sun size={14} /> Tema do Sistema</h3>
                <div className="flex gap-3">
                  <button onClick={() => setThemeMode('light')} className={cn("flex-1 flex flex-col items-center justify-center gap-3 py-6 rounded-2xl border-2 transition-all", themeMode === 'light' ? "border-primary bg-primary/5 text-primary" : "border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 grayscale opacity-70")}>
                    <Sun size={24} /><span className="font-bold text-sm">Claro</span>
                  </button>
                  <button onClick={() => setThemeMode('dark')} className={cn("flex-1 flex flex-col items-center justify-center gap-3 py-6 rounded-2xl border-2 transition-all", themeMode === 'dark' ? "border-primary bg-primary/5 text-primary" : "border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 grayscale opacity-70")}>
                    <Moon size={24} /><span className="font-bold text-sm">Escuro</span>
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Palette size={14} /> Cor de Destaque</h3>
                <div className="grid grid-cols-4 gap-3">
                  {Object.entries(ACCENT_COLORS).map(([name, hex]) => {
                    const colorNames: Record<string, string> = {
                      cyberSky: 'Cyber Sky (IA)',
                      quantumGreen: 'Quantum Green (Ciência)',
                      auraViolet: 'Aura Violet (Insight)',
                      white: 'Branco Dinâmico',
                    };
                    return (
                      <button key={name} onClick={() => setAccentColor(name)} className={cn("group relative w-full aspect-square rounded-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 border-2", accentColor === name ? "border-primary shadow-lg shadow-primary/20" : "border-transparent")} style={{ backgroundColor: hex }} title={colorNames[name] || name}>
                        {accentColor === name ? <div className={cn("w-3 h-3 rounded-full shadow-sm", name === 'white' ? "bg-black" : "bg-white")} /> : <div className="w-0 h-0 group-hover:w-2 group-hover:h-2 rounded-full bg-white/30 transition-all" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== ADMIN ===== */}
        {activeTab === 'admin' && !!userData.isAdmin && (
          <div className="space-y-4">
            {/* Admin sub-tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 w-fit">
              <button onClick={() => setAdminTab('institutions')} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all", adminTab === 'institutions' ? "bg-white dark:bg-slate-800 text-primary shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>
                <Building2 size={14} /> Instituições
              </button>
              <button onClick={() => setAdminTab('users')} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all", adminTab === 'users' ? "bg-white dark:bg-slate-800 text-primary shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>
                <Users size={14} /> Usuários
              </button>
            </div>

            {loadingAdmin && (
              <div className="p-10 text-center animate-pulse text-primary font-bold">Carregando...</div>
            )}

            {/* ---- Sub-tab: INSTITUIÇÕES ---- */}
            {adminTab === 'institutions' && !loadingAdmin && (
              selectedInst ? (
                /* Detalhe da Instituição */
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  {/* Header da instituição */}
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                    <button onClick={() => setSelectedInst(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                      <ChevronLeft size={18} />
                    </button>
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Building2 size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-900 dark:text-slate-100">{selectedInst.name}</p>
                      <p className="text-[11px] text-slate-400 font-medium">{selectedInst.domain}</p>
                    </div>
                    <button
                      onClick={() => setMembersOpen(o => !o)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black text-slate-505 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                    >
                      {membersOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
                      {membersOpen ? 'Esconder membros' : 'Gerenciar membros'}
                    </button>
                  </div>

                  {/* Corpo: info + painel lateral de membros */}
                  <div className="flex min-h-[350px]">
                    {/* Info + Classrooms */}
                    <div className="flex-1 p-6 flex flex-col gap-6 overflow-hidden">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/60">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Membros</p>
                          <p className="text-2xl font-black text-primary">
                            {users.filter(u => u.institutions.includes(selectedInst.id)).length}
                          </p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/60">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Domínio</p>
                          <p className="text-sm font-black text-slate-600 dark:text-slate-400 truncate">{selectedInst.domain || '—'}</p>
                        </div>
                      </div>

                      {/* Classrooms Section */}
                      <div className="flex-1 flex flex-col min-h-[250px] bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 overflow-hidden">
                        <div className="flex justify-between items-center mb-4 shrink-0">
                          <div>
                            <h3 className="text-sm font-black text-slate-850 dark:text-slate-200 uppercase tracking-wider">Salas de Aula</h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">Salas criadas sob esta instituição.</p>
                          </div>
                          <button
                            onClick={() => setShowNewClassroom(!showNewClassroom)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90 transition-all shadow-sm"
                          >
                            <Plus size={14} />
                            <span>Nova Sala</span>
                          </button>
                        </div>

                        {/* Nova sala inline form */}
                        <AnimatePresence>
                          {showNewClassroom && (
                            <motion.form
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              onSubmit={handleCreateClassroom}
                              className="mb-4 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl flex gap-2 items-center"
                            >
                              <input
                                required
                                type="text"
                                placeholder="Nome da sala (ex: 2º Ano A)"
                                className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary text-slate-800 dark:text-slate-100"
                                value={newClassroomName}
                                onChange={e => setNewClassroomName(e.target.value)}
                              />
                              <button type="submit" className="px-3 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90">
                                Salvar
                              </button>
                              <button
                                type="button"
                                onClick={() => { setShowNewClassroom(false); setNewClassroomName(''); }}
                                className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
                              >
                                <X size={14} />
                              </button>
                            </motion.form>
                          )}
                        </AnimatePresence>

                        {/* Listagem de salas */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                          {loadingClassrooms ? (
                            <div className="text-center text-xs text-slate-400 py-6">Carregando salas...</div>
                          ) : classrooms.length === 0 ? (
                            <div className="text-center text-xs text-slate-400 py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                              Nenhuma sala criada. Crie uma para começar a convidar alunos.
                            </div>
                          ) : (
                            classrooms.map(c => {
                              const isEditing = editingClassroomId === c.id;
                              const isActionsOpen = activeActionsMenu === c.id;

                              return (
                                <div
                                  key={c.id}
                                  className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-3 rounded-2xl flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                                >
                                  {isEditing ? (
                                    <div className="flex-1 flex gap-2 items-center">
                                      <input
                                        required
                                        type="text"
                                        className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary text-slate-800 dark:text-slate-100"
                                        value={editingClassroomName}
                                        onChange={e => setEditingClassroomName(e.target.value)}
                                        autoFocus
                                      />
                                      <button
                                        onClick={() => handleRenameClassroom(c.id)}
                                        className="px-3 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90"
                                      >
                                        Salvar
                                      </button>
                                      <button
                                        onClick={() => { setEditingClassroomId(null); setEditingClassroomName(''); }}
                                        className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-slate-850 dark:text-slate-200 truncate">{c.name}</p>
                                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                          ID: <span className="font-mono">{c.id}</span>
                                        </p>
                                      </div>
                                      <div className="relative shrink-0 flex items-center gap-1">
                                        <button
                                          onClick={() => {
                                            setActiveActionsMenu(isActionsOpen ? null : c.id);
                                          }}
                                          className="p-1.5 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all"
                                        >
                                          <MoreVertical size={14} />
                                        </button>

                                        {/* Dropdown de Ações */}
                                        {isActionsOpen && (
                                          <>
                                            <div
                                              className="fixed inset-0 z-10"
                                              onClick={() => setActiveActionsMenu(null)}
                                            />
                                            <div className="absolute right-0 top-8 z-20 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                                              <button
                                                onClick={() => {
                                                  setInviteClassroom(c);
                                                  setActiveActionsMenu(null);
                                                }}
                                                className="w-full px-3 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-355 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                              >
                                                <QrCode size={13} className="text-slate-400" />
                                                <span>Link de Cadastro</span>
                                              </button>
                                              <button
                                                onClick={() => {
                                                  setEditingClassroomId(c.id);
                                                  setEditingClassroomName(c.name);
                                                  setActiveActionsMenu(null);
                                                }}
                                                className="w-full px-3 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-355 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                              >
                                                <Edit3 size={13} className="text-slate-400" />
                                                <span>Renomear</span>
                                              </button>
                                              <div className="h-[1px] bg-slate-100 dark:bg-slate-800 my-1" />
                                              <button
                                                onClick={() => handleDeleteClassroom(c.id)}
                                                className="w-full px-3 py-2 text-left text-xs font-bold text-red-600 dark:text-red-405 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2"
                                              >
                                                <Trash2 size={13} />
                                                <span>Excluir</span>
                                              </button>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Painel lateral de membros */}
                    <AnimatePresence>
                      {membersOpen && (
                        <motion.div
                          initial={{ width: 0, opacity: 0 }}
                          animate={{ width: 280, opacity: 1 }}
                          exit={{ width: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-l border-slate-100 dark:border-slate-800 overflow-hidden shrink-0"
                        >
                          <div className="w-[280px] h-full flex flex-col">
                            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Membros da Instituição</p>
                            </div>
                            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                              {users.map(u => {
                                const isMember = u.institutions.includes(selectedInst.id);
                                return (
                                  <div key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-950/30 transition-colors">
                                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black text-xs shrink-0">
                                      {u.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{u.name}</p>
                                      <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                                    </div>
                                    <button
                                      onClick={() => handleToggleMembership(u.id, selectedInst.id, isMember)}
                                      title={isMember ? 'Remover da instituição' : 'Adicionar à instituição'}
                                      className={cn(
                                        'shrink-0 p-1.5 rounded-lg transition-all',
                                        isMember
                                          ? 'text-primary bg-primary/10 hover:bg-red-50 hover:text-red-505 dark:hover:bg-red-900/20'
                                          : 'text-slate-300 hover:text-primary hover:bg-primary/10'
                                      )}
                                    >
                                      {isMember ? <UserCheck size={14} /> : <UserX size={14} />}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ) : (
                /* Lista de Instituições */
                <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Building2 className="text-primary" size={22} />
                      <div>
                        <h2 className="text-base font-bold">Instituições</h2>
                        <p className="text-xs text-zinc-500">Clique em uma para ver detalhes e gerenciar membros.</p>
                      </div>
                    </div>
                    <button onClick={() => setShowNewInst(!showNewInst)} className="p-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-all shadow-sm shadow-primary/20">
                      <Plus size={18} />
                    </button>
                  </div>

                  <AnimatePresence>
                    {showNewInst && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
                        <form onSubmit={handleCreateInstitution} className="p-5 grid md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Nome</label>
                            <input required type="text" placeholder="Ex: Universidade Federal" className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary" value={newInst.name} onChange={e => setNewInst({ ...newInst, name: e.target.value })} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Domínio</label>
                            <input required type="text" placeholder="Ex: @universidade.edu" className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary" value={newInst.domain} onChange={e => setNewInst({ ...newInst, domain: e.target.value })} />
                          </div>
                          <div className="flex items-end gap-2">
                            <button type="submit" className="flex-1 bg-primary text-primary-foreground py-2 rounded-xl font-bold text-sm shadow-sm hover:opacity-90">Salvar</button>
                            <button onClick={() => setShowNewInst(false)} type="button" className="p-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-500 rounded-xl"><X size={18} /></button>
                          </div>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {institutions.map(inst => {
                      const memberCount = users.filter(u => u.institutions.includes(inst.id)).length;
                      return (
                        <button
                          key={inst.id}
                          onClick={() => { setSelectedInst(inst); setMembersOpen(true); }}
                          className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-950/30 transition-colors text-left group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                              <Building2 size={18} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-primary transition-colors">{inst.name}</p>
                              <div className="flex items-center gap-2">
                                <Globe size={11} className="text-zinc-400" />
                                <p className="text-[11px] font-medium text-zinc-400">{inst.domain}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-black text-zinc-400 flex items-center gap-1">
                              <Users size={11} /> {memberCount}
                            </span>
                            <ChevronLeft size={16} className="text-zinc-300 group-hover:text-primary rotate-180 transition-all" />
                          </div>
                        </button>
                      );
                    })}
                    {institutions.length === 0 && (
                      <div className="p-10 text-center text-zinc-400 italic text-sm">Nenhuma instituição cadastrada.</div>
                    )}
                  </div>
                </div>
              )
            )}

            {/* ---- Sub-tab: USUÁRIOS ---- */}
            {adminTab === 'users' && !loadingAdmin && (
              <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="text-primary" size={22} />
                    <div>
                      <h2 className="text-base font-bold">Usuários</h2>
                      <p className="text-xs text-zinc-500">Visão geral dos membros cadastrados.</p>
                    </div>
                  </div>
                  <button onClick={() => setShowNewUser(v => !v)} className="p-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-all shadow-sm shadow-primary/20">
                    <Plus size={18} />
                  </button>
                </div>

                <AnimatePresence>
                  {showNewUser && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
                      <form onSubmit={handleCreateUser} className="p-5 grid md:grid-cols-4 gap-4 items-end">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Nome</label>
                          <input required type="text" placeholder="Nome completo" className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">E-mail</label>
                          <input required type="email" placeholder="email@exemplo.com" className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Senha</label>
                          <div className="relative">
                            <input required type={showPassword ? 'text' : 'password'} placeholder="Mínimo 6 caracteres" minLength={6} className="w-full px-4 py-2 pr-10 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
                            <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button type="submit" disabled={creatingUser} className="flex-1 bg-primary text-primary-foreground py-2 rounded-xl font-bold text-sm shadow-sm hover:opacity-90 disabled:opacity-60">
                            {creatingUser ? 'Criando...' : 'Criar'}
                          </button>
                          <button type="button" onClick={() => setShowNewUser(false)} className="p-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-500 rounded-xl"><X size={18} /></button>
                        </div>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {users.map(u => (
                    <div key={u.id} className="flex items-center gap-4 px-5 py-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm shrink-0">
                        {u.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{u.name}</p>
                          {u.isAdmin && (
                            <span className="flex items-center gap-1 text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase shrink-0">
                              <ShieldAlert size={10} /> Admin
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                          <Mail size={10} />
                          {u.email}
                        </div>
                      </div>
                      {/* Badges de instituições */}
                      <div className="flex flex-wrap gap-1 justify-end">
                        {u.institutions.length === 0 ? (
                          <span className="text-[10px] font-bold text-zinc-300 dark:text-zinc-600 italic">Sem instituição</span>
                        ) : (
                          u.institutions.map(instId => {
                            const inst = institutions.find(i => i.id === instId);
                            return inst ? (
                              <span key={instId} className="px-2 py-0.5 bg-primary/10 text-primary rounded-lg text-[10px] font-black">
                                {inst.name}
                              </span>
                            ) : null;
                          })
                        )}
                      </div>
                    </div>
                  ))}
                  {users.length === 0 && (
                    <div className="p-10 text-center text-zinc-400 italic text-sm">Nenhum usuário encontrado.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        {/* ===== SEGURANÇA ===== */}
        {activeTab === 'security' && !!userData.isAdmin && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                    <Terminal size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold">Monitor de Segurança</h2>
                    <p className="text-xs text-zinc-500">Histórico dos testes de penetração executados localmente.</p>
                  </div>
                </div>
                <button
                  onClick={loadSecurityRuns}
                  disabled={secLoading}
                  className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-xl text-xs font-bold hover:bg-primary/10 hover:text-primary transition-all disabled:opacity-50"
                >
                  <RefreshCw size={13} className={secLoading ? 'animate-spin' : ''} />
                  Atualizar
                </button>
              </div>

              {/* How to run */}
              <div className="mx-5 mt-4 mb-3 p-3 bg-zinc-950 rounded-xl border border-zinc-800 font-mono text-xs text-zinc-400">
                <span className="text-zinc-600">$ </span>
                <span className="text-emerald-400">cd server</span>
                <span className="text-zinc-400"> &amp;&amp; </span>
                <span className="text-emerald-400">npx tsx security/runner.ts</span>
                <span className="ml-2 text-zinc-600"># roda localmente e salva aqui</span>
              </div>

              {secLoading && (
                <div className="p-10 text-center animate-pulse text-primary font-bold text-sm">Carregando runs...</div>
              )}

              {!secLoading && secRuns.length === 0 && (
                <div className="p-10 text-center">
                  <ShieldCheck size={32} className="mx-auto text-zinc-300 dark:text-zinc-700 mb-3" />
                  <p className="text-sm text-zinc-400 font-medium">Nenhum teste executado ainda.</p>
                  <p className="text-xs text-zinc-500 mt-1">Execute o runner no terminal para ver os resultados aqui.</p>
                </div>
              )}

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {secRuns.map(run => {
                  const isExpanded = expandedRun === run.id;
                  const score = run.totalTests > 0 ? Math.round((run.passed / run.totalTests) * 100) : 0;
                  const scoreColor = score === 100 ? 'text-emerald-500' : score >= 70 ? 'text-yellow-500' : 'text-red-500';
                  return (
                    <div key={run.id}>
                      <button
                        onClick={() => toggleRunDetail(run.id)}
                        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-950/30 transition-colors text-left"
                      >
                        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-sm', score === 100 ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500' : run.failed > 0 ? 'bg-red-50 dark:bg-red-500/10 text-red-500' : 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-500')}>
                          {score}%
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            Run #{run.id.slice(0, 8)}
                          </p>
                          <p className="text-[11px] text-zinc-400">
                            {new Date(run.createdAt).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="flex items-center gap-1 text-[11px] font-black text-emerald-500"><CheckCircle size={12} />{run.passed}</span>
                          <span className="flex items-center gap-1 text-[11px] font-black text-red-500"><XCircle size={12} />{run.failed}</span>
                          <span className="flex items-center gap-1 text-[11px] font-black text-yellow-500"><AlertTriangle size={12} />{run.warnings}</span>
                          {isExpanded ? <ChevronDown size={15} className="text-zinc-400" /> : <ChevronRight size={15} className="text-zinc-400" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="bg-zinc-50 dark:bg-zinc-950/50 border-t border-zinc-100 dark:border-zinc-800">
                          {loadingDetail && !runDetail && (
                            <div className="p-6 text-center text-xs text-zinc-400 animate-pulse">Carregando resultados...</div>
                          )}
                          {runDetail?.id === run.id && runDetail.results?.map((r: any) => {
                            const statusIcon = r.status === 'pass' ? <CheckCircle size={13} className="text-emerald-500 shrink-0" /> : r.status === 'fail' ? <XCircle size={13} className="text-red-500 shrink-0" /> : <AlertTriangle size={13} className="text-yellow-500 shrink-0" />;
                            const severityColor: Record<string, string> = { critical: 'text-red-500 bg-red-50 dark:bg-red-500/10', high: 'text-orange-500 bg-orange-50 dark:bg-orange-500/10', medium: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-500/10', low: 'text-zinc-500 bg-zinc-100 dark:bg-zinc-800', info: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10' };
                            return (
                              <div key={r.id} className="flex items-start gap-3 px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                                {statusIcon}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[10px] font-black text-zinc-400 font-mono">{r.testId}</span>
                                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{r.name}</span>
                                    <span className={cn('text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md', severityColor[r.severity] || severityColor.low)}>
                                      {r.severity}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-zinc-500 mt-0.5">{r.message}</p>
                                  {r.details && r.status !== 'pass' && (
                                    <p className="text-[10px] text-zinc-400 mt-0.5 font-mono truncate">{r.details}</p>
                                  )}
                                </div>
                                <span className={cn('text-[9px] font-black uppercase px-2 py-0.5 rounded-lg shrink-0', r.status === 'pass' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' : r.status === 'fail' ? 'bg-red-50 dark:bg-red-500/10 text-red-600' : 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600')}>
                                  {r.status}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Convite / QR Code */}
      <AnimatePresence>
        {inviteClassroom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white font-display">Acesso de Cadastro</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Sala: {inviteClassroom.name}</p>
                </div>
                <button
                  onClick={() => setInviteClassroom(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={16} />
                </button>
              </div>

              {/* QR Code */}
              <div className="bg-slate-100 dark:bg-slate-950 p-4 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-900">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`${window.location.origin}/login?invite=${inviteClassroom.id}`)}`}
                  alt="QR Code de cadastro"
                  className="w-48 h-48 rounded-lg shadow-sm"
                />
              </div>

              {/* Link de cadastro */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Link de Registro</label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    type="text"
                    value={`${window.location.origin}/login?invite=${inviteClassroom.id}`}
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono select-all outline-none text-slate-700 dark:text-slate-300"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/login?invite=${inviteClassroom.id}`);
                      alert('Link copiado para a área de transferência!');
                    }}
                    className="p-2.5 bg-primary text-primary-foreground rounded-xl hover:opacity-90 active:scale-95 transition-all"
                    title="Copiar link"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>

              <div className="text-center">
                <p className="text-[10px] text-slate-400 leading-normal">
                  Os estudantes que lerem o QR Code ou acessarem o link acima serão direcionados diretamente para o formulário de cadastro vinculados a esta sala e instituição.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
