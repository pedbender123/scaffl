import React, { useEffect, useState } from 'react';
import { api, Disciplina, Persona, Institution } from '../lib/api';
import { Plus, Edit2, Trash2, BookOpen, GraduationCap, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import { useAuth } from '../contexts/AuthContext';

export default function DisciplinasPage() {
  const { userData } = useAuth();
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDisciplina, setEditingDisciplina] = useState<Disciplina | null>(null);

  const [formData, setFormData] = useState({
    nome: '',
    conteudo: '',
    institutionId: '',
    professores_vinculados: [] as string[]
  });

  useEffect(() => {
    loadData();
  }, [userData?.isAdmin]);

  const loadData = async () => {
    try {
      const [discData, persData, instData] = await Promise.all([
        api.get<Disciplina[]>('/api/disciplinas'),
        api.get<Persona[]>('/api/personas'),
        userData?.isAdmin ? api.admin.institutions.getAll() : Promise.resolve([])
      ]);
      setDisciplinas(discData);
      setPersonas(persData);
      setInstitutions(instData as Institution[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (disciplina?: Disciplina) => {
    if (disciplina) {
      setEditingDisciplina(disciplina);
      setFormData({
        nome: disciplina.nome,
        conteudo: disciplina.conteudo,
        institutionId: disciplina.institutionId,
        professores_vinculados: disciplina.professores_vinculados || []
      });
    } else {
      setEditingDisciplina(null);
      setFormData({
        nome: '',
        conteudo: '',
        institutionId: institutions[0]?.id || '',
        professores_vinculados: []
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDisciplina) {
        await api.put(`/api/disciplinas/${editingDisciplina.id}`, formData);
      } else {
        await api.post('/api/disciplinas', formData);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar disciplina');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta disciplina?')) return;
    try {
      await api.delete(`/api/disciplinas/${id}`);
      loadData();
    } catch (err) {
      alert('Erro ao excluir disciplina');
    }
  };

  const toggleProfessor = (personaId: string) => {
    setFormData(prev => ({
      ...prev,
      professores_vinculados: prev.professores_vinculados.includes(personaId)
        ? prev.professores_vinculados.filter(id => id !== personaId)
        : [...prev.professores_vinculados, personaId]
    }));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Gestão de Disciplinas</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">Organize os conteúdos acadêmicos e vincule-os aos professores.</p>
        </div>
        {userData?.isAdmin && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-6 py-3 bg-primary hover:opacity-90 text-primary-foreground rounded-xl font-semibold transition-all shadow-lg shadow-primary/20 active:scale-95"
          >
            <Plus size={20} />
            Nova Disciplina
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-48 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {disciplinas.map((disc) => (
            <motion.div
              layout
              key={disc.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <BookOpen size={24} />
                </div>
                {(userData?.isAdmin || disc.userId === userData?.id) && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleOpenModal(disc)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-primary transition-colors">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete(disc.id)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-red-600 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white truncate">{disc.nome}</h3>
                {disc.institutionName && (
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-500 uppercase rounded-full border border-slate-200 dark:border-slate-700 flex items-center gap-1 shrink-0">
                    <Building2 size={10} />
                    {disc.institutionName}
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2 leading-relaxed">
                  {disc.conteudo || 'Sem conteúdo cadastrado.'}
                </p>
                
                <div className="flex flex-wrap gap-1">
                  {disc.professores_vinculados && disc.professores_vinculados.length > 0 ? (
                    disc.professores_vinculados.map(pId => {
                      const prof = personas.find(p => p.id === pId);
                      return prof ? (
                        <span key={pId} className="px-2 py-1 bg-slate-100 dark:bg-slate-800/50 text-[10px] font-bold text-slate-600 dark:text-slate-400 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center gap-1">
                          <GraduationCap size={10} />
                          {prof.nome.split(' ').pop()}
                        </span>
                      ) : null;
                    })
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">Nenhum professor vinculado</span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal CRUD */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800"
            >
              <form onSubmit={handleSubmit} className="p-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
                  {editingDisciplina ? 'Editar Disciplina' : 'Criar Nova Disciplina'}
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Instituição</label>
                    <select
                      required
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary appearance-none outline-none text-slate-900 dark:text-white"
                      value={formData.institutionId}
                      onChange={e => setFormData({ ...formData, institutionId: e.target.value })}
                    >
                      <option value="">Selecione uma instituição</option>
                      {institutions.map(inst => (
                        <option key={inst.id} value={inst.id}>{inst.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Nome da Disciplina</label>
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary outline-none text-slate-900 dark:text-white"
                      value={formData.nome}
                      onChange={e => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="Ex: Física Mecânica I"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Conteúdo Base (Knowledge Base)</label>
                    <textarea
                      required
                      rows={10}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary outline-none text-slate-900 dark:text-white text-sm leading-relaxed"
                      value={formData.conteudo}
                      onChange={e => setFormData({ ...formData, conteudo: e.target.value })}
                      placeholder="Cole aqui o conteúdo programático, textos, fórmulas ou lições que a IA deve saber..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Vincular Professores (Personas)</label>
                    <div className="grid grid-cols-2 gap-2">
                      {personas.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => toggleProfessor(p.id)}
                          className={clsx(
                            "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border",
                            formData.professores_vinculados.includes(p.id)
                              ? "bg-primary/10 border-primary text-primary"
                              : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-505"
                          )}
                        >
                          <div className={clsx("w-2 h-2 rounded-full", formData.professores_vinculados.includes(p.id) ? "bg-primary" : "bg-slate-300")} />
                          {p.nome}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-2 px-10 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-colors shadow-lg shadow-primary/20"
                  >
                    {editingDisciplina ? 'Salvar Alterações' : 'Criar Disciplina'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

