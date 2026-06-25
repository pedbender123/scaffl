import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api, Classroom, Disciplina, Activity, Institution } from '../lib/api';
import { 
  GraduationCap, 
  BookOpen, 
  Calendar, 
  Clock, 
  Sparkles, 
  AlertCircle, 
  Info, 
  FileText, 
  Building,
  School,
  ChevronRight,
  X
} from 'lucide-react';

export default function ClassPage() {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  
  // States para o Admin escolher a sala
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstId, setSelectedInstId] = useState('');
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState('');

  // Salas vinculadas ao estudante/professor logado
  const [myClasses, setMyClasses] = useState<Classroom[]>([]);

  // Modal de visualização de ementa
  const [activeDisciplina, setActiveDisciplina] = useState<Disciplina | null>(null);
  const [activeActivity, setActiveActivity] = useState<Activity | null>(null);

  useEffect(() => {
    if (userData?.isAdmin) {
      loadAdminData();
    } else {
      loadStudentMural();
    }
  }, [userData]);

  // Carregar dados de Mural para Aluno
  const loadStudentMural = async (classroomId?: string) => {
    try {
      setLoading(true);
      
      let currentClasses = myClasses;
      if (myClasses.length === 0) {
        currentClasses = await api.ava.getMyClasses();
        setMyClasses(currentClasses);
      }

      let targetClassroomId = classroomId;
      if (!targetClassroomId && currentClasses.length > 0) {
        targetClassroomId = currentClasses[0].id;
      }

      const res = await api.ava.getMyClass(targetClassroomId);
      setClassroom(res.classroom);
      setDisciplinas(res.disciplinas);
      setActivities(res.activities);
      if (res.classroom) {
        setSelectedClassroomId(res.classroom.id);
      }
    } catch (err) {
      console.error('Erro ao carregar mural:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentClassChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const classId = e.target.value;
    setSelectedClassroomId(classId);
    await loadStudentMural(classId);
  };

  // Carregar dados iniciais de Admin
  const loadAdminData = async () => {
    try {
      setLoading(true);
      const insts = await api.admin.institutions.getAll();
      setInstitutions(insts);
      if (insts.length > 0) {
        setSelectedInstId(insts[0].id);
        await loadClassroomsForInst(insts[0].id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Erro ao carregar dados de admin:', err);
      setLoading(false);
    }
  };

  // Carrega as salas da instituição selecionada pelo admin
  const loadClassroomsForInst = async (instId: string) => {
    try {
      const classes = await api.admin.classrooms.getByInstitution(instId);
      setClassrooms(classes);
      if (classes.length > 0) {
        setSelectedClassroomId(classes[0].id);
        await loadSpecificMural(classes[0].id);
      } else {
        setClassroom(null);
        setDisciplinas([]);
        setActivities([]);
        setLoading(false);
      }
    } catch (err) {
      console.error('Erro ao carregar salas:', err);
      setLoading(false);
    }
  };

  // Carrega o mural específico selecionado pelo admin
  const loadSpecificMural = async (classId: string) => {
    try {
      setLoading(true);
      const res = await api.ava.getClassMural(classId);
      setClassroom(res.classroom);
      setDisciplinas(res.disciplinas);
      setActivities(res.activities);
    } catch (err) {
      console.error('Erro ao carregar mural específico:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInstChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const instId = e.target.value;
    setSelectedInstId(instId);
    await loadClassroomsForInst(instId);
  };

  const handleClassChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const classId = e.target.value;
    setSelectedClassroomId(classId);
    await loadSpecificMural(classId);
  };

  // Utilitário para formatar a data de vencimento
  const formatDueDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) + 
           ' às ' + 
           d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  // Determinar badge de urgência do prazo
  const getUrgencyBadge = (dueDateStr: string) => {
    const now = new Date();
    const due = new Date(dueDateStr);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffTime < 0) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 border border-rose-500/20 text-rose-500">
          Expirado
        </span>
      );
    }
    if (diffDays <= 2) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/20 text-amber-500 animate-pulse">
          Urgente (prazo curto)
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
        Pendente
      </span>
    );
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">Carregando painel de sala...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-6 bg-white dark:bg-slate-950">
      
      {/* Header Admin Selector */}
      {userData?.isAdmin && (
        <div className="mb-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
            <School size={18} className="text-primary" />
            <span>Modo Admin: Visualizar Sala</span>
          </div>

          <div className="flex gap-3 ml-auto flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 dark:text-slate-550">Instituição:</label>
              <select 
                value={selectedInstId} 
                onChange={handleInstChange}
                className="text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 focus:outline-none focus:border-primary text-slate-800 dark:text-slate-200"
              >
                {institutions.map(inst => (
                  <option key={inst.id} value={inst.id}>{inst.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 dark:text-slate-550">Sala:</label>
              <select 
                value={selectedClassroomId} 
                onChange={handleClassChange}
                disabled={classrooms.length === 0}
                className="text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 focus:outline-none focus:border-primary text-slate-800 dark:text-slate-200 disabled:opacity-50"
              >
                {classrooms.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
                {classrooms.length === 0 && <option value="">Nenhuma sala encontrada</option>}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Header Selector para Usuário com múltiplas salas */}
      {!userData?.isAdmin && myClasses.length > 1 && (
        <div className="mb-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
            <School size={18} className="text-primary" />
            <span>Selecionar Sala de Aula</span>
          </div>

          <div className="flex gap-3 ml-auto flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 dark:text-slate-550">Sala:</label>
              <select 
                value={selectedClassroomId} 
                onChange={handleStudentClassChange}
                className="text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 focus:outline-none focus:border-primary text-slate-800 dark:text-slate-200"
              >
                {myClasses.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.institutionName})</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Se o usuário não estiver em nenhuma sala */}
      {!classroom ? (
        <div className="h-[70vh] flex flex-col items-center justify-center text-center max-w-md mx-auto p-4 select-none">
          <div className="w-20 h-20 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-lg mb-6">
            <GraduationCap size={36} className="text-slate-400 dark:text-slate-650" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Sem Sala de Aula Vinculada</h2>
          <p className="text-sm text-slate-500 dark:text-slate-450 leading-relaxed mb-6">
            Sua conta ainda não está vinculada a nenhuma sala de aula ativa. Utilize o código de convite enviado pelo seu professor nas configurações para se registrar em uma sala.
          </p>
        </div>
      ) : (
        <div className="space-y-8 animate-fadeIn">
          {/* Top Hero Banner */}
          <div className="relative p-8 rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center gap-4 relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-xl shadow-primary/20 text-white">
                <GraduationCap size={32} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-black bg-primary/20 text-primary border border-primary/20 px-2 py-0.5 rounded-full tracking-wider">
                    Sala de Aula Ativa
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    ID: {classroom.id}
                  </span>
                </div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                  Mural Virtual — {classroom.name}
                </h1>
              </div>
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Coluna 1: Disciplinas (Grid de 7 colunas no LG) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-900">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <BookOpen size={16} />
                </div>
                <h2 className="text-lg font-black text-slate-800 dark:text-slate-200">Disciplinas da Sala</h2>
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 ml-auto bg-slate-50 dark:bg-slate-900 px-2.5 py-1 rounded-full border border-slate-100 dark:border-slate-800">
                  {disciplinas.length} {disciplinas.length === 1 ? 'matéria' : 'matérias'}
                </span>
              </div>

              {disciplinas.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center text-slate-400 dark:text-slate-500">
                  <BookOpen size={28} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-semibold">Nenhuma disciplina cadastrada para esta sala.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {disciplinas.map(d => (
                    <div 
                      key={d.id}
                      onClick={() => setActiveDisciplina(d)}
                      className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:border-primary/30 hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col justify-between group h-40"
                    >
                      <div className="space-y-1.5">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                          <FileText size={16} />
                        </div>
                        <h3 className="font-black text-slate-800 dark:text-slate-200 leading-snug line-clamp-2">
                          {d.nome}
                        </h3>
                      </div>

                      <div className="flex items-center text-xs text-primary font-bold mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                        <span>Acessar ementário</span>
                        <ChevronRight size={14} className="ml-0.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Coluna 2: Atividades/Calendário (Grid de 5 colunas no LG) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-900">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Calendar size={16} />
                </div>
                <h2 className="text-lg font-black text-slate-800 dark:text-slate-200">Atividades e Cronograma</h2>
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 ml-auto bg-slate-50 dark:bg-slate-900 px-2.5 py-1 rounded-full border border-slate-100 dark:border-slate-800">
                  {activities.length} registradas
                </span>
              </div>

              {activities.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center text-slate-400 dark:text-slate-500">
                  <Calendar size={28} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-semibold">Nenhuma atividade pendente para esta sala.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.map(act => (
                    <div 
                      key={act.id}
                      onClick={() => setActiveActivity(act)}
                      className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 hover:border-primary/30 hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col gap-3 group relative overflow-hidden"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-black text-slate-800 dark:text-slate-200 text-base leading-snug group-hover:text-primary transition-colors">
                          {act.title}
                        </h3>
                        {getUrgencyBadge(act.dueDate)}
                      </div>

                      {act.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-450 leading-relaxed line-clamp-3">
                          {act.description}
                        </p>
                      )}

                      <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400 dark:text-slate-500">
                        <Clock size={12} />
                        <span>Entrega: {formatDueDate(act.dueDate)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Modal de Ementa de Disciplina */}
      {activeDisciplina && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-xl max-h-[80vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-slideUp">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white leading-snug">
                    {activeDisciplina.nome}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    Instituição: {activeDisciplina.institutionName || 'Global'}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setActiveDisciplina(null)}
                className="w-8 h-8 rounded-full bg-slate-200/50 dark:bg-slate-800 hover:bg-slate-250 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-450 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto flex-1 text-slate-750 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
              {activeDisciplina.conteudo ? activeDisciplina.conteudo : (
                <div className="text-center text-slate-400 dark:text-slate-550 py-12">
                  <Info size={36} className="mx-auto mb-2 opacity-30" />
                  <p>Nenhuma ementa ou material de apoio foi cadastrado para esta disciplina ainda.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
              <button 
                onClick={() => setActiveDisciplina(null)}
                className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-350 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-350 transition-colors"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal de Detalhes da Atividade */}
      {activeActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-xl max-h-[80vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-slideUp">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white leading-snug">
                    {activeActivity.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    {getUrgencyBadge(activeActivity.dueDate)}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setActiveActivity(null)}
                className="w-8 h-8 rounded-full bg-slate-200/50 dark:bg-slate-800 hover:bg-slate-250 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-450 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto flex-1 text-slate-750 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Prazo de Entrega</h4>
                <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-bold">
                  <Clock size={14} className="text-primary" />
                  <span>{formatDueDate(activeActivity.dueDate)}</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Instruções / Descrição</h4>
                {activeActivity.description ? (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 text-slate-700 dark:text-slate-350">
                    {activeActivity.description}
                  </div>
                ) : (
                  <div className="text-center text-slate-400 dark:text-slate-550 py-4">
                    <Info size={28} className="mx-auto mb-2 opacity-30" />
                    <p>Nenhuma instrução adicional foi adicionada para esta atividade.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
              <button 
                onClick={() => setActiveActivity(null)}
                className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-350 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-350 transition-colors"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
