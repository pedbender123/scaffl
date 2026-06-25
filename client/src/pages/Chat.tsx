import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Send, Loader2, User as UserIcon, Plus, ChevronDown, Check } from 'lucide-react';
import Markdown from 'react-markdown';
import { cn } from '../lib/utils';
import { api, Chat as ChatType, Message, Persona, Disciplina } from '../lib/api';

function ProfessorAvatar({ persona, size = 'md' }: { persona: Persona | null; size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-14 h-14' : 'w-10 h-10';
  const radius = size === 'lg' ? 'rounded-2xl' : 'rounded-xl';
  if (persona?.imageUrl) {
    return (
      <img
        src={persona.imageUrl}
        alt={persona.nome}
        className={cn(dim, radius, 'object-cover shrink-0 border border-slate-200 dark:border-slate-700')}
      />
    );
  }
  const initial = persona?.nome?.charAt(0).toUpperCase() || '?';
  return (
    <div className={cn(dim, radius, 'bg-primary/10 flex items-center justify-center shrink-0 text-primary font-black border border-primary/20', size === 'sm' ? 'text-xs' : 'text-base')}>
      {initial}
    </div>
  );
}

export default function Chat() {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { user, refreshUserData } = useAuth();

  const [chat, setChat] = useState<ChatType | null>(null);
  const [allChats, setAllChats] = useState<ChatType[]>([]);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [allPersonas, setAllPersonas] = useState<Persona[]>([]);
  const [allDisciplinas, setAllDisciplinas] = useState<Disciplina[]>([]);
  const [selectedProfessorForNewChat, setSelectedProfessorForNewChat] = useState<Persona | null>(null);
  const [disciplina, setDisciplina] = useState<Disciplina | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!user) return;
    api.get<ChatType[]>('/api/chats').then(setAllChats).catch(console.error);
    api.get<Persona[]>('/api/personas').then(setAllPersonas).catch(console.error);
    api.get<Disciplina[]>('/api/disciplinas').then(setAllDisciplinas).catch(console.error);
  }, [user]);

  useEffect(() => {
    if (!chatId || !user) {
      setChat(null);
      setMessages([]);
      return;
    }
    const loadChat = async () => {
      setInitializing(true);
      try {
        const [chats, msgs, personas, disc] = await Promise.all([
          api.get<ChatType[]>('/api/chats'),
          api.get<Message[]>(`/api/chats/${chatId}/messages`),
          api.get<Persona[]>('/api/personas'),
          api.get<Disciplina[]>('/api/disciplinas').catch(() => [] as Disciplina[]),
        ]);
        setAllChats(chats);
        setAllPersonas(personas);
        setAllDisciplinas(disc);
        const currentChat = chats.find(c => c.id === chatId);
        if (!currentChat) { navigate('/chat'); return; }
        setChat(currentChat);
        setMessages(msgs);
        setPersona(personas.find(p => p.id === currentChat.personaDbId) || null);
        setDisciplina(currentChat.disciplinaId ? disc.find(d => d.id === currentChat.disciplinaId) || null : null);
      } catch {
        navigate('/chat');
      } finally {
        setInitializing(false);
      }
    };
    loadChat();
  }, [chatId, user, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || !chatId || !user) return;
    const currentInput = input;
    setInput('');
    setLoading(true);
    const tempId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: tempId, chatId, userId: user.id, role: 'user', content: currentInput, createdAt: new Date().toISOString(), tokensUsed: 0, creditsUsed: 0 }]);
    try {
      const { userMessage, modelMessage } = await api.post<any>(`/api/chats/${chatId}/messages`, { content: currentInput, provider: 'google' });
      setMessages(prev => [...prev.filter(m => m.id !== tempId), userMessage, modelMessage]);
      await refreshUserData();
    } catch (error: any) {
      alert(error.message || 'Erro ao enviar mensagem.');
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setInput(currentInput);
    } finally {
      setLoading(false);
    }
  };

  const onStartChat = async (personaId: string, disciplinaId?: string) => {
    try {
      const { chat: newChat } = await api.post<any>('/api/chats', { professorId: personaId, disciplinaId });
      setAllChats(prev => [newChat, ...prev]);
      setSelectedProfessorForNewChat(null);
      navigate(`/chat/${newChat.id}`);
    } catch {
      alert('Erro ao iniciar chat');
    }
  };

  // Empty state — no chat selected
  if (!chatId && !initializing) {
    const vinculadas = selectedProfessorForNewChat
      ? allDisciplinas.filter(d => d.professores_vinculados?.includes(selectedProfessorForNewChat.id))
      : [];

    return (
      <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10 shrink-0">
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
            {selectedProfessorForNewChat ? 'Selecionar Disciplina' : 'Chat'}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-4xl mx-auto space-y-6">
            {!selectedProfessorForNewChat ? (
              // Seleção de Professores
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-250">
                <div className="text-center md:text-left max-w-xl">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white font-display">Escolha um Professor</h2>
                  <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                    Inicie uma conversa direcionada com um dos nossos professores virtuais especializados.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {allPersonas.map(p => {
                    const discs = allDisciplinas.filter(d => d.professores_vinculados?.includes(p.id));
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          if (p.isGenerico || discs.length === 0) {
                            onStartChat(p.id);
                          } else if (discs.length === 1) {
                            onStartChat(p.id, discs[0].id);
                          } else {
                            setSelectedProfessorForNewChat(p);
                          }
                        }}
                        className="flex gap-4 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 text-left hover:border-primary/50 dark:hover:border-primary/40 hover:shadow-lg dark:hover:shadow-primary/5 transition-all group active:scale-[0.99]"
                      >
                        <ProfessorAvatar persona={p} size="lg" />
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                          <div>
                            <p className="text-base font-black text-slate-850 dark:text-slate-250 truncate group-hover:text-primary transition-colors leading-tight">
                              {p.nome}
                            </p>
                            <p className="text-xs text-slate-550 dark:text-slate-400 mt-1.5 line-clamp-2">
                              {p.descricao}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-1.5 mt-3">
                            <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400">
                              {p.isGenerico ? 'Generalista' : discs.length === 1 ? '1 Disciplina' : `${discs.length} Disciplinas`}
                            </span>
                            {discs.length > 0 && !p.isGenerico && (
                              <span className="text-[10px] font-black text-slate-400 truncate max-w-[150px]">
                                {discs.map(d => d.nome).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {allPersonas.length === 0 && (
                    <div className="col-span-2 text-center text-slate-400 py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                      Nenhum professor cadastrado.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Seleção de Disciplinas do Professor Selecionado
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-250">
                <div className="flex items-start gap-4">
                  <ProfessorAvatar persona={selectedProfessorForNewChat} size="md" />
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white font-display">
                      Disciplinas de {selectedProfessorForNewChat.nome}
                    </h2>
                    <p className="text-xs text-slate-550 dark:text-slate-400 mt-0.5">
                      Este professor leciona múltiplas disciplinas. Escolha com qual deseja trabalhar.
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {vinculadas.map(d => (
                    <button
                      key={d.id}
                      onClick={() => onStartChat(selectedProfessorForNewChat.id, d.id)}
                      className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left hover:border-primary/50 dark:hover:border-primary/40 hover:shadow-lg transition-all group active:scale-[0.99]"
                    >
                      <p className="text-sm font-black text-slate-850 dark:text-slate-250 group-hover:text-primary transition-colors">
                        {d.nome}
                      </p>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-3">
                        {d.conteudo}
                      </p>
                    </button>
                  ))}
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setSelectedProfessorForNewChat(null)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-650 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
                  >
                    Voltar para Professores
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 font-sans">
      {/* ── Header with chat switcher ── */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-10 shrink-0">
        {/* Switcher trigger */}
        <div className="relative flex-1 min-w-0" ref={switcherRef}>
          <button
            onClick={() => setSwitcherOpen(o => !o)}
            className="flex items-center gap-3 max-w-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl px-2 py-1.5 -mx-2 transition-all group"
          >
            <ProfessorAvatar persona={persona} size="md" />
            <div className="min-w-0 text-left">
              <p className="text-sm font-black text-slate-900 dark:text-slate-100 truncate leading-tight">
                {persona?.nome || 'Carregando...'}
              </p>
              {disciplina && (
                <p className="text-[11px] text-slate-400 truncate">{disciplina.nome}</p>
              )}
            </div>
            <ChevronDown size={15} className={cn('text-slate-400 shrink-0 transition-transform', switcherOpen && 'rotate-180')} />
          </button>

          {/* Dropdown */}
          {switcherOpen && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl shadow-black/10 z-50 overflow-hidden">
              <div className="p-2 max-h-72 overflow-y-auto custom-scrollbar">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 py-1">Conversas</p>
                {allChats.map(c => {
                  const p = allPersonas.find(p => p.id === c.personaDbId);
                  const isCurrent = c.id === chatId;
                  return (
                    <button
                      key={c.id}
                      onClick={() => { navigate(`/chat/${c.id}`); setSwitcherOpen(false); }}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-2 py-2 rounded-xl text-left transition-all',
                        isCurrent ? 'bg-primary/10 text-primary' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      )}
                    >
                      <ProfessorAvatar persona={p || null} size="sm" />
                      <span className="text-sm font-bold truncate flex-1">{c.title}</span>
                      {isCurrent && <Check size={14} className="text-primary shrink-0" />}
                    </button>
                  );
                })}
                {allChats.length === 0 && (
                  <p className="text-xs text-slate-400 px-2 py-3 text-center">Nenhuma conversa</p>
                )}
              </div>
              <div className="border-t border-slate-100 dark:border-slate-800 p-2">
                <button
                  onClick={() => { navigate('/chat'); setSelectedProfessorForNewChat(null); setSwitcherOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-primary hover:bg-primary/10 transition-all"
                >
                  <Plus size={16} />
                  Iniciar Novo Chat
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar">
        {initializing ? (
          <div className="h-full flex items-center justify-center gap-3">
            <Loader2 className="animate-spin text-primary" size={24} />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto w-full space-y-5">
            {messages.map(msg => (
              <MessageBubble key={msg.id} msg={msg} persona={persona} />
            ))}
            {loading && (
              <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <ProfessorAvatar persona={persona} size="sm" />
                <div className="bg-slate-100 dark:bg-slate-800/50 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-2" />
          </div>
        )}
      </div>

      {/* ── Input ── */}
      <div className="px-4 py-4 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSend} className="relative flex items-end gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
              placeholder={persona ? `Pergunte para ${persona.nome.split(' ')[0]}...` : 'Digite sua mensagem...'}
              disabled={initializing || !chatId}
              className="flex-1 max-h-40 min-h-[52px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3.5 pr-14 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-slate-900 dark:text-slate-100 text-sm leading-relaxed"
              rows={1}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading || initializing || !chatId}
              className="absolute right-2 bottom-2 w-10 h-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shadow-md shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send size={18} className="ml-0.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg, persona }: { msg: Message; persona: Persona | null }) {
  const isUser = msg.role === 'user';
  return (
    <div className={cn('flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div className={cn('shrink-0 mt-1', isUser ? 'w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center' : '')}>
        {isUser
          ? <UserIcon size={16} />
          : <ProfessorAvatar persona={persona} size="sm" />
        }
      </div>
      <div className={cn(
        'max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
        isUser
          ? 'bg-primary text-primary-foreground rounded-tr-sm'
          : 'bg-slate-100 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 rounded-tl-sm'
      )}>
        {isUser ? (
          <p className="whitespace-pre-wrap font-medium">{msg.content}</p>
        ) : (
          <div className="markdown-body prose dark:prose-invert prose-primary max-w-none text-sm leading-relaxed">
            <Markdown
              components={{
                a: ({ href, children }) => {
                  const isWhatsApp = href?.includes('wa.me');
                  if (isWhatsApp) {
                    return (
                      <span className="block my-2">
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#25D366] hover:bg-[#20ba59] active:bg-[#1caa4e] text-white font-semibold text-xs rounded-xl shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] no-underline focus:outline-none focus:ring-2 focus:ring-[#25D366]/50"
                        >
                          <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436.002 9.858-4.419 9.86-9.86.001-2.636-1.024-5.113-2.887-6.978C16.578 1.898 14.1 .874 11.465.874 6.03.874 1.61 5.293 1.607 10.733c-.001 1.705.447 3.371 1.298 4.843l-.926 3.382 3.471-.91c1.47.8 3.125 1.22 4.793 1.22a9.78 9.78 0 0 0 4.822-1.228zm10.966-7.633c-.301-.15-1.781-.879-2.056-.979-.275-.1-.475-.15-.675.15-.2.3-.775.979-.95 1.178-.175.2-.35.225-.65.075-.3-.15-1.265-.467-2.41-1.485-.89-.795-1.49-1.777-1.665-2.077-.175-.3-.018-.462.13-.61.135-.133.301-.35.451-.524.15-.174.2-.3.3-.5.1-.2.05-.375-.025-.526-.075-.15-.675-1.625-.925-2.225-.244-.588-.493-.507-.675-.516-.175-.008-.375-.01-.575-.01-.2 0-.525.075-.8.376-.275.301-1.05 1.027-1.05 2.505 0 1.477 1.075 2.903 1.225 3.102.15.2 2.11 3.224 5.117 4.522.715.31 1.273.495 1.71.635.717.227 1.369.195 1.884.118.574-.085 1.781-.727 2.031-1.43.25-.702.25-1.303.175-1.43-.075-.125-.275-.2-.575-.35z"/>
                          </svg>
                          {children}
                        </a>
                      </span>
                    );
                  }
                  return (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {children}
                    </a>
                  );
                }
              }}
            >
              {msg.content}
            </Markdown>
          </div>
        )}
        {!isUser && (
          <div className="flex items-center justify-between gap-4 mt-2">
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {msg.creditsUsed > 0 && (
              <span className="text-[9px] font-semibold text-slate-400/85 dark:text-slate-500/80 tracking-wide">
                Custo: {msg.creditsUsed.toLocaleString('pt-BR')} créditos
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
