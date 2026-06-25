import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api, Classroom, Institution } from '../lib/api';
import { 
  Users2, 
  UserPlus, 
  Trash2, 
  Building, 
  School, 
  Plus, 
  Search, 
  Check, 
  User, 
  ArrowRight,
  Shield
} from 'lucide-react';

interface ClassUser {
  id: string;
  name: string;
  email: string;
  role: string;
  classRole?: 'student' | 'teacher';
}

export default function ClassroomsAdminPage() {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstId, setSelectedInstId] = useState('');
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState('');
  
  // Usuários na turma e disponíveis
  const [usersInClass, setUsersInClass] = useState<ClassUser[]>([]);
  const [availableUsers, setAvailableUsers] = useState<ClassUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userRolesToAssign, setUserRolesToAssign] = useState<Record<string, 'student' | 'teacher'>>({});

  // Criação de nova sala
  const [newClassName, setNewClassName] = useState('');
  const [creatingClass, setCreatingClass] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const insts = await api.admin.institutions.getAll();
      setInstitutions(insts);
      if (insts.length > 0) {
        setSelectedInstId(insts[0].id);
        await loadClassroomsForInst(insts[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar dados iniciais:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadClassroomsForInst = async (instId: string) => {
    try {
      const classes = await api.admin.classrooms.getByInstitution(instId);
      setClassrooms(classes);
      if (classes.length > 0) {
        setSelectedClassroomId(classes[0].id);
        await loadClassUsers(classes[0].id);
      } else {
        setSelectedClassroomId('');
        setUsersInClass([]);
        setAvailableUsers([]);
      }
    } catch (err) {
      console.error('Erro ao carregar salas:', err);
    }
  };

  const loadClassUsers = async (classId: string) => {
    try {
      setLoadingUsers(true);
      const res = await api.admin.classrooms.getUsers(classId);
      setUsersInClass(res.usersInClass);
      setAvailableUsers(res.availableUsers);
      
      // Inicializar papéis padrão para novos usuários
      const initialRoles: Record<string, 'student' | 'teacher'> = {};
      res.availableUsers.forEach(u => {
        initialRoles[u.id] = u.role === 'admin' ? 'teacher' : 'student';
      });
      setUserRolesToAssign(initialRoles);
    } catch (err) {
      console.error('Erro ao carregar usuários da sala:', err);
    } finally {
      setLoadingUsers(false);
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
    if (classId) {
      await loadClassUsers(classId);
    } else {
      setUsersInClass([]);
      setAvailableUsers([]);
    }
  };

  const handleAddUser = async (userId: string) => {
    if (!selectedClassroomId) return;
    const role = userRolesToAssign[userId] || 'student';
    try {
      await api.admin.classrooms.addUser(selectedClassroomId, userId, role);
      await loadClassUsers(selectedClassroomId);
    } catch (err) {
      console.error('Erro ao vincular usuário:', err);
      alert('Erro ao vincular usuário à turma.');
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!selectedClassroomId) return;
    if (!confirm('Tem certeza que deseja remover este usuário desta sala de aula?')) return;
    try {
      await api.admin.classrooms.removeUser(selectedClassroomId, userId);
      await loadClassUsers(selectedClassroomId);
    } catch (err) {
      console.error('Erro ao remover usuário:', err);
      alert('Erro ao desvincular usuário da turma.');
    }
  };

  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstId || !newClassName.trim()) return;
    try {
      setCreatingClass(true);
      await api.admin.classrooms.create(selectedInstId, newClassName.trim());
      setNewClassName('');
      await loadClassroomsForInst(selectedInstId);
    } catch (err) {
      console.error('Erro ao criar sala de aula:', err);
      alert('Erro ao criar sala de aula.');
    } finally {
      setCreatingClass(false);
    }
  };

  const handleRoleChange = (userId: string, role: 'student' | 'teacher') => {
    setUserRolesToAssign(prev => ({ ...prev, [userId]: role }));
  };

  // Filtrar usuários com base no termo de busca
  const filteredAvailableUsers = availableUsers.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredInClassUsers = usersInClass.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!userData?.isAdmin) {
    return (
      <div className="h-full flex items-center justify-center p-8 bg-white dark:bg-slate-950">
        <div className="text-center max-w-sm">
          <Shield className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2">Acesso Negado</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Apenas administradores gerais possuem autorização para gerenciar turmas e matrículas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-6 bg-white dark:bg-slate-950 flex flex-col gap-6">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <School className="text-primary" />
            Mural Administrativo de Turmas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Gerencie salas de aula e matricule estudantes ou associe professores em tempo real.
          </p>
        </div>
      </div>

      {/* Selectors and New Classroom form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Seletor */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-6 items-center">
          <div className="w-full md:w-1/2 space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Building size={14} className="text-slate-400" />
              Instituição
            </label>
            <select
              value={selectedInstId}
              onChange={handleInstChange}
              className="w-full text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 focus:outline-none focus:border-primary text-slate-800 dark:text-slate-100"
            >
              {institutions.map(inst => (
                <option key={inst.id} value={inst.id}>{inst.name}</option>
              ))}
              {institutions.length === 0 && <option value="">Sem instituições</option>}
            </select>
          </div>

          <div className="w-full md:w-1/2 space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <School size={14} className="text-slate-400" />
              Sala de Aula
            </label>
            <select
              value={selectedClassroomId}
              onChange={handleClassChange}
              disabled={classrooms.length === 0}
              className="w-full text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 focus:outline-none focus:border-primary text-slate-800 dark:text-slate-100 disabled:opacity-50"
            >
              {classrooms.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
              {classrooms.length === 0 && <option value="">Nenhuma sala cadastrada</option>}
            </select>
          </div>
        </div>

        {/* Criar sala */}
        <form onSubmit={handleCreateClassroom} className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col gap-3 justify-center">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nova Sala de Aula</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Nome da sala (ex: Alpha 2026)"
              value={newClassName}
              onChange={e => setNewClassName(e.target.value)}
              className="flex-1 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 focus:outline-none focus:border-primary text-slate-800 dark:text-slate-100"
              required
              disabled={!selectedInstId}
            />
            <button
              type="submit"
              disabled={creatingClass || !selectedInstId || !newClassName.trim()}
              className="px-4 bg-primary hover:bg-primary/95 text-white font-bold rounded-2xl flex items-center justify-center transition-colors disabled:opacity-50"
            >
              <Plus size={20} />
            </button>
          </div>
        </form>
      </div>

      {/* Main Grid: Users list */}
      {selectedClassroomId ? (
        <div className="flex-1 flex flex-col gap-6">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
            <input
              type="text"
              placeholder="Buscar usuários por nome ou email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-12 pr-4 py-3 focus:outline-none focus:border-primary text-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
            {/* Coluna 1: Usuários na Sala */}
            <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col h-[500px]">
              <h2 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2 mb-4">
                <Users2 className="text-emerald-500" />
                Matriculados nesta Turma ({usersInClass.length})
              </h2>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {loadingUsers ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                  </div>
                ) : filteredInClassUsers.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-550 select-none">
                    <Users2 size={36} className="opacity-30 mb-2" />
                    <p className="text-sm">Nenhum usuário cadastrado nesta turma.</p>
                  </div>
                ) : (
                  filteredInClassUsers.map(user => (
                    <div 
                      key={user.id} 
                      className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-850 flex items-center justify-between hover:border-slate-200 dark:hover:border-slate-800 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-500 font-bold">
                          {user.name[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                            {user.name}
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              user.classRole === 'teacher' 
                                ? 'bg-primary/10 text-primary border border-primary/20' 
                                : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-450 border border-slate-200 dark:border-slate-800'
                            }`}>
                              {user.classRole === 'teacher' ? 'Professor' : 'Estudante'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 dark:text-slate-500">{user.email}</div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveUser(user.id)}
                        className="p-2 text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Desvincular usuário"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Coluna 2: Adicionar à Sala */}
            <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col h-[500px]">
              <h2 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2 mb-4">
                <UserPlus className="text-primary" />
                Vincular Usuários da Instituição ({filteredAvailableUsers.length})
              </h2>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {loadingUsers ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                  </div>
                ) : filteredAvailableUsers.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-550 select-none">
                    <UserPlus size={36} className="opacity-30 mb-2" />
                    <p className="text-sm">Todos os usuários desta instituição já estão vinculados.</p>
                  </div>
                ) : (
                  filteredAvailableUsers.map(user => (
                    <div 
                      key={user.id} 
                      className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-850 flex items-center justify-between hover:border-slate-200 dark:hover:border-slate-800 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-500 font-bold">
                          {user.name[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                            {user.name}
                          </div>
                          <div className="text-xs text-slate-400 dark:text-slate-500">{user.email}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Seletor de Papel na Sala */}
                        <select
                          value={userRolesToAssign[user.id] || 'student'}
                          onChange={e => handleRoleChange(user.id, e.target.value as 'student' | 'teacher')}
                          className="text-[10px] font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 focus:outline-none focus:border-primary text-slate-800 dark:text-slate-200"
                        >
                          <option value="student">Estudante</option>
                          <option value="teacher">Professor</option>
                        </select>

                        <button
                          onClick={() => handleAddUser(user.id)}
                          className="p-2 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-xl transition-all"
                          title="Matricular na turma"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400 dark:text-slate-550 select-none">
          <School size={64} className="opacity-20 mb-4" />
          <h3 className="text-lg font-bold">Nenhuma Sala Selecionada</h3>
          <p className="text-sm max-w-xs text-center mt-1">
            Selecione uma instituição e uma sala de aula acima para gerenciar os estudantes e professores correspondentes.
          </p>
        </div>
      )}
    </div>
  );
}
