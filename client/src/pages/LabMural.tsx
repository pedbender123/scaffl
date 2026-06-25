import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api, LabProject } from '../lib/api';
import { FlaskConical, Plus, Clock, User, Trash2, Loader2, Building2, Star } from 'lucide-react';
import { cn } from '../lib/utils';

export default function LabMural() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [projects, setProjects] = useState<LabProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState<'mine' | 'institution'>('mine');

  useEffect(() => {
    api.lab.getProjects()
      .then(setProjects)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const project = await api.lab.createProject({ title: 'Novo Projeto' });
      navigate(`/lab/${project.id}`);
    } catch (err: any) {
      alert(err.message || 'Erro ao criar projeto.');
      setCreating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (!confirm('Tem certeza que deseja deletar este projeto?')) return;
    try {
      await api.lab.deleteProject(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
    } catch (err: any) {
      alert(err.message || 'Erro ao deletar projeto.');
    }
  };

  const myProjects = projects.filter(p => p.userId === userData?.id);
  const othersProjects = projects.filter(p => p.userId !== userData?.id);
  const hasInstitution = (userData?.institutions?.length || 0) > 0;
  const projectLimit = hasInstitution ? 10 : 5;
  const atLimit = myProjects.length >= projectLimit;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-8 py-5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <FlaskConical size={24} />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Lab</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Simuladores e experiências pedagógicas interativas</p>
              </div>
            </div>
            {tab === 'mine' && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400">
                  {myProjects.length}/{projectLimit} projetos
                </span>
                <button
                  onClick={handleCreate}
                  disabled={creating || atLimit}
                  title={atLimit ? `Limite de ${projectLimit} projetos atingido` : undefined}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-2xl font-black text-sm shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                  Novo Projeto
                </button>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
            <button
              onClick={() => setTab('mine')}
              className={cn(
                'px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all',
                tab === 'mine'
                  ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                  : 'text-slate-400 hover:text-slate-650 dark:hover:text-slate-300'
              )}
            >
              Meus Projetos
            </button>
            {hasInstitution && (
              <button
                onClick={() => setTab('institution')}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all',
                  tab === 'institution'
                    ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                    : 'text-slate-400 hover:text-slate-650 dark:hover:text-slate-300'
                )}
              >
                <Building2 size={11} />
                Mural da Instituição
                {othersProjects.length > 0 && (
                  <span className={cn(
                    'ml-1 px-1.5 py-0.5 rounded-md text-[9px] font-black',
                    tab === 'institution' ? 'bg-primary/20 text-primary' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                  )}>
                    {othersProjects.length}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* Aba: Meus Projetos */}
        {tab === 'mine' && (
          <div>
            {myProjects.length === 0 ? (
              <div
                onClick={!atLimit ? handleCreate : undefined}
                className={cn(
                  'border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-16 flex flex-col items-center justify-center gap-4',
                  !atLimit && 'cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group'
                )}
              >
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                  <FlaskConical size={32} />
                </div>
                <div className="text-center">
                  <p className="font-black text-slate-500 dark:text-slate-400 group-hover:text-primary transition-colors">Nenhum projeto ainda</p>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Clique para criar seu primeiro simulador</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {myProjects.map(project => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    isOwner
                    onClick={() => navigate(`/lab/${project.id}`)}
                    onDelete={e => handleDelete(e, project.id)}
                  />
                ))}
                {!atLimit && (
                  <button
                    onClick={handleCreate}
                    disabled={creating}
                    className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8 flex flex-col items-center justify-center gap-3 hover:border-primary hover:bg-primary/5 transition-all group disabled:opacity-40"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                      <Plus size={20} />
                    </div>
                    <span className="text-sm font-black text-slate-400 group-hover:text-primary transition-colors">Novo Projeto</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Aba: Mural da Instituição */}
        {tab === 'institution' && hasInstitution && (
          <div>
            {othersProjects.length === 0 ? (
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-16 flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                  <Building2 size={32} />
                </div>
                <div>
                  <p className="font-black text-slate-500 dark:text-slate-400">Nenhum projeto compartilhado ainda</p>
                  <p className="text-sm text-slate-400 mt-1">Projetos criados por outros membros da instituição aparecerão aqui</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {othersProjects.map(project => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    isOwner={false}
                    onClick={() => navigate(`/lab/${project.id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StarRating({ 
  value, 
  onChange, 
  readonly = false 
}: { 
  value: number; 
  onChange?: (val: number) => void; 
  readonly?: boolean;
}) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={(e) => {
            e.stopPropagation();
            onChange?.(star);
          }}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={cn(
            "p-0.5 transition-all outline-none",
            readonly ? "cursor-default" : "cursor-pointer hover:scale-110 active:scale-95"
          )}
        >
          <Star
            size={14}
            className={cn(
              "transition-colors",
              (hover || value) >= star
                ? "fill-amber-400 text-amber-400"
                : "text-slate-300 dark:text-slate-700"
            )}
          />
        </button>
      ))}
      {readonly && value > 0 && (
        <span className="ml-1 text-[10px] font-black text-amber-500">{value.toFixed(1)}</span>
      )}
    </div>
  );
}

function ProjectCard({
  project,
  isOwner,
  onClick,
  onDelete,
}: {
  project: LabProject;
  isOwner: boolean;
  onClick: () => void;
  onDelete?: (e: React.MouseEvent) => void;
}) {
  const hasPreview = !!project.htmlContent;
  const updatedAt = new Date(project.updatedAt).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden cursor-pointer hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 hover:-translate-y-1 transition-all group"
    >
      <div className="h-36 bg-slate-50 dark:bg-slate-800 relative overflow-hidden border-b border-slate-100 dark:border-slate-800">
        {hasPreview ? (
          <iframe
            srcDoc={project.htmlContent}
            sandbox="allow-scripts"
            className="w-full h-full pointer-events-none scale-[0.5] origin-top-left"
            style={{ width: '200%', height: '200%' }}
            title={project.title}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <FlaskConical size={40} className="text-slate-300 dark:text-slate-600" />
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-black text-slate-900 dark:text-slate-100 text-sm leading-tight truncate group-hover:text-primary transition-colors">
            {project.title}
          </h3>
          {isOwner && onDelete && (
            <button
              onClick={onDelete}
              className="shrink-0 p-1 text-slate-350 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
              title="Deletar projeto"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-400 font-medium">
          <span className="flex items-center gap-1">
            <User size={11} />
            {project.authorName}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {updatedAt}
          </span>
        </div>
        
        {/* Rating Section */}
        <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
          <StarRating 
            value={project.avgStars || 0} 
            readonly={isOwner} 
            onChange={async (stars) => {
              if (isOwner) return;
              try {
                await api.lab.rateProject(project.id, stars);
                alert('Avaliação enviada!');
              } catch (err: any) {
                alert(err.message || 'Erro ao avaliar.');
              }
            }}
          />
          {project.feedbackCreator !== 0 && (
            <div className={cn(
              "text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-md",
              project.feedbackCreator === 1 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            )}>
              {project.feedbackCreator === 1 ? 'Objetivo Atingido' : 'Review Pendente'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
