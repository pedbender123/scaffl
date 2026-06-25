import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api, Activity, Institution, Classroom } from '../lib/api';
import { 
  Calendar, 
  Trash2, 
  Plus, 
  X, 
  Info, 
  AlertCircle, 
  Check, 
  Building,
  School,
  FileText
} from 'lucide-react';

export default function ActivitiesAdminPage() {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<Activity[]>([]);
  
  // States para criação de atividade
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedInstId, setSelectedInstId] = useState('');
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassroomIds, setSelectedClassroomIds] = useState<string[]>([]);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (userData?.isAdmin) {
      loadData();
    }
  }, [userData]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [acts, insts] = await Promise.all([
        api.ava.getActivities(),
        api.admin.institutions.getAll()
      ]);
      setActivities(acts);
      setInstitutions(insts);
      if (insts.length > 0) {
        setSelectedInstId(insts[0].id);
        await loadClassroomsForInst(insts[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadClassroomsForInst = async (instId: string) => {
    try {
      const classes = await api.admin.classrooms.getByInstitution(instId);
      setClassrooms(classes);
      setSelectedClassroomIds([]); // Resetar seleção de salas
    } catch (err) {
      console.error('Erro ao carregar salas:', err);
    }
  };

  const handleInstChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const instId = e.target.value;
    setSelectedInstId(instId);
    await loadClassroomsForInst(instId);
  };

  const toggleClassroomSelection = (id: string) => {
    setSelectedClassroomIds(prev => 
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!title.trim()) return setError('O título da atividade é obrigatório.');
    if (!dueDate) return setError('A data limite de entrega é obrigatória.');
    if (!selectedInstId) return setError('Selecione uma instituição.');
    if (selectedClassroomIds.length === 0) return setError('Selecione pelo menos uma sala de aula.');

    try {
      setLoading(true);
      
      // Formata a data para ISO string
      const isoDueDate = new Date(dueDate).toISOString();

      await api.ava.createActivity({
        title,
        description,
        dueDate: isoDueDate,
        institutionId: selectedInstId,
        classroomIds: selectedClassroomIds
      });

      setSuccess('Atividade criada e enviada com sucesso para as salas!');
      setTitle('');
      setDescription('');
      setDueDate('');
      setSelectedClassroomIds([]);
      setIsModalOpen(false);
      
      // Recarregar dados
      const acts = await api.ava.getActivities();
      setActivities(acts);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar atividade.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteActivity = async (id: string) => {
    if (!confirm('Deseja realmente remover esta atividade? Isso apagará a atividade e as notificações dela.')) return;
    try {
      setLoading(true);
      await api.ava.deleteActivity(id);
      const acts = await api.ava.getActivities();
      setActivities(acts);
    } catch (err) {
      console.error('Erro ao deletar atividade:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!userData?.isAdmin) {
    return (
      <div className="h-full flex items-center justify-center p-8 bg-white dark:bg-slate-950">
        <div className="text-center max-w-sm">
          <AlertCircle size={40} className="text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2">Acesso Negado</h2>
          <p className="text-sm text-slate-500 dark:text-slate-450 leading-relaxed">
            Esta página é restrita apenas aos administradores do sistema.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-6 bg-white dark:bg-slate-950">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">
            Painel de Atividades
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-450 mt-1">
            Crie, programe e gerencie tarefas para as salas de aula de suas instituições.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer self-start md:self-auto"
        >
          <Plus size={16} />
          <span>Criar Nova Atividade</span>
        </button>
      </div>

      {/* Main List */}
      {loading && activities.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        </div>
      ) : activities.length === 0 ? (
        <div className="p-12 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center max-w-lg mx-auto select-none">
          <Calendar size={48} className="mx-auto mb-4 text-slate-400 dark:text-slate-650" />
          <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2">Nenhuma Atividade Encontrada</h3>
          <p className="text-sm text-slate-500 dark:text-slate-450 leading-relaxed mb-6">
            Nenhuma atividade foi programada no sistema ainda. Clique no botão acima para criar a primeira!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activities.map(act => (
            <div 
              key={act.id}
              className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between hover:border-slate-350 dark:hover:border-slate-700 transition-colors h-64"
            >
              <div>
                <div className="flex justify-between items-start gap-2 mb-2">
                  <h3 className="font-black text-slate-800 dark:text-slate-100 text-lg leading-snug line-clamp-2">
                    {act.title}
                  </h3>
                  <button 
                    onClick={() => handleDeleteActivity(act.id)}
                    className="w-8 h-8 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                    title="Excluir Atividade"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-450 leading-relaxed line-clamp-4 font-medium mb-4">
                  {act.description || 'Sem descrição cadastrada.'}
                </p>
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-800 mt-auto">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                  <Building size={12} className="text-primary/70" />
                  <span className="font-bold line-clamp-1">Inst: {act.institutionName || 'Nenhuma'}</span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                  <School size={12} className="text-primary/70" />
                  <span className="font-bold line-clamp-1" title={act.classroomsList}>Salas: {act.classroomsList || 'Nenhuma'}</span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                  <Calendar size={12} className="text-primary/70" />
                  <span>Entrega: {new Date(act.dueDate).toLocaleDateString('pt-BR')} às {new Date(act.dueDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Criar Atividade */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-slideUp">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white leading-snug">
                    Criar Nova Atividade
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    Programe tarefas e alerte as salas de aula.
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200/50 dark:bg-slate-800 hover:bg-slate-250 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-450 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateActivity} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {error && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold flex items-center gap-2">
                  <Check size={14} />
                  <span>{success}</span>
                </div>
              )}

              {/* Título */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Título da Atividade *</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Entrega do Relatório de Oxirredução"
                  className="w-full text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 focus:outline-none focus:border-primary text-slate-800 dark:text-slate-100"
                  required
                />
              </div>

              {/* Descrição */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Descrição/Instruções</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Instruções sobre o envio, objetivos e materiais recomendados..."
                  className="w-full text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 focus:outline-none focus:border-primary text-slate-800 dark:text-slate-100 h-24 resize-none"
                />
              </div>

              {/* Data de Vencimento */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Data Limite de Entrega *</label>
                <input 
                  type="datetime-local" 
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 focus:outline-none focus:border-primary text-slate-800 dark:text-slate-100"
                  required
                />
              </div>

              {/* Instituição */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Instituição *</label>
                <select 
                  value={selectedInstId}
                  onChange={handleInstChange}
                  className="w-full text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 focus:outline-none focus:border-primary text-slate-800 dark:text-slate-100"
                  required
                >
                  <option value="">Selecione uma instituição...</option>
                  {institutions.map(inst => (
                    <option key={inst.id} value={inst.id}>{inst.name}</option>
                  ))}
                </select>
              </div>

              {/* Salas de Aula Checkboxes */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Salas de Aula Alvo * (Selecione pelo menos uma)</label>
                
                {classrooms.length === 0 ? (
                  <p className="text-xs text-slate-450 dark:text-slate-550 italic">
                    Nenhuma sala cadastrada nesta instituição. Cadastre uma sala nas configurações primeiro.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 max-h-32 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850">
                    {classrooms.map(c => {
                      const isSelected = selectedClassroomIds.includes(c.id);
                      return (
                        <div 
                          key={c.id}
                          onClick={() => toggleClassroomSelection(c.id)}
                          className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer select-none transition-all ${
                            isSelected 
                              ? 'bg-primary/10 border-primary text-primary font-bold' 
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-primary border-primary text-white' : 'border-slate-300 bg-white dark:bg-slate-950'
                          }`}>
                            {isSelected && <Check size={10} strokeWidth={4} />}
                          </div>
                          <span className="text-xs truncate">{c.name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="pt-4 flex gap-3 justify-end border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-2xl bg-primary hover:bg-primary-dark text-white text-xs font-bold shadow-lg shadow-primary/15 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Salvar Atividade'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
