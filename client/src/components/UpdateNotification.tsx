import React, { useState, useEffect } from 'react';
import { X, Sparkles, CheckCircle2, Rocket, Zap, FlaskConical } from 'lucide-react';
import { cn } from '../lib/utils';

export default function UpdateNotification() {
  const [isOpen, setIsOpen] = useState(false);
  const [showClose, setShowClose] = useState(false);

  useEffect(() => {
    const hasSeenUpdate = localStorage.getItem('tutorai_v2_update_seen');
    if (!hasSeenUpdate) {
      // Pequeno delay para não aparecer junto com o load da página
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setShowClose(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('tutorai_v2_update_seen', 'true');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm animate-in fade-in duration-500">
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-zinc-800 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
        
        {/* Banner Decorativo */}
        <div className="h-32 bg-gradient-to-br from-primary via-primary/80 to-indigo-600 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-60 h-60 bg-indigo-400 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-xl">
              <Sparkles className="text-white w-8 h-8 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="px-8 pt-8 pb-10">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
              TutorAI <span className="text-primary italic font-serif">V2.5</span> está aqui!
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2 font-medium">
              A evolução da pedagogia assistida por IA acaba de dar um salto.
            </p>
          </div>

          <div className="space-y-4">
            <UpdateItem 
              icon={<FlaskConical className="w-5 h-5 text-emerald-500" />}
              title="Lab Agent Reestruturado"
              description="Novo fluxo de raciocínio (Pensando, Entendendo, Codando) para simulações mais precisas."
            />
            <UpdateItem
              icon={<Zap className="w-5 h-5 text-amber-500" />}
              title="IA de Última Geração"
              description="Motor de IA atualizado com maior contexto e menor latência."
            />
            <UpdateItem 
              icon={<CheckCircle2 className="w-5 h-5 text-blue-500" />}
              title="Cadastro por Convite"
              description="O registro de novos usuários agora requer um código de convite de sala de aula."
            />
            <UpdateItem 
              icon={<Rocket className="w-5 h-5 text-purple-500" />}
              title="Mini Cloud Code"
              description="Simulações modulares e standalone com padrões de engenharia de ponta."
            />
          </div>

          {showClose && (
            <button
              onClick={handleClose}
              className="mt-10 w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black py-4 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-zinc-900/10 dark:shadow-white/5 animate-in fade-in slide-in-from-bottom-2 duration-700"
            >
              Começar a explorar
            </button>
          )}

          {!showClose && (
            <div className="mt-10 h-[56px] flex items-center justify-center">
              <div className="flex gap-1.5 opacity-40">
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" />
              </div>
            </div>
          )}
        </div>

        {/* Botão de fechar (opcional se tiver o botão grande, mas o usuário pediu "botão de fechar") */}
        {showClose && (
          <button 
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 text-white/50 hover:text-white transition-colors animate-in fade-in duration-500"
          >
            <X size={20} />
          </button>
        )}
      </div>
    </div>
  );
}

function UpdateItem({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="flex gap-4 items-start group">
      <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center shrink-0 border border-zinc-100 dark:border-zinc-800 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div className="space-y-0.5">
        <h4 className="text-sm font-black text-zinc-900 dark:text-white">{title}</h4>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
