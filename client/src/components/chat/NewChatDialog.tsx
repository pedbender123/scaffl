import React, { useEffect, useState } from 'react';
import { api, Persona, Disciplina } from '../../lib/api';
import { X, Bot, BookOpen, Check, ArrowRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';

interface NewChatDialogProps {
 isOpen: boolean;
 onClose: () => void;
 onStartChat: (personaId: string, disciplinaId?: string) => void;
}

export default function NewChatDialog({ isOpen, onClose, onStartChat }: NewChatDialogProps) {
 const [step, setStep] = useState<'persona' | 'disciplina'>('persona');
 const [personas, setPersonas] = useState<Persona[]>([]);
 const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
 const [loading, setLoading] = useState(true);
 
 const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
 const [selectedDisciplina, setSelectedDisciplina] = useState<Disciplina | null>(null);

 useEffect(() => {
 if (isOpen) {
 loadData();
 setStep('persona');
 setSelectedPersona(null);
 setSelectedDisciplina(null);
 }
 }, [isOpen]);

 const loadData = async () => {
 setLoading(true);
 try {
 const [prs, dsc] = await Promise.all([
 api.get<Persona[]>('/api/personas'),
 api.get<Disciplina[]>('/api/disciplinas')
 ]);
 setPersonas(prs);
 setDisciplinas(dsc);
 } catch (err) {
 console.error(err);
 } finally {
 setLoading(false);
 }
 };

 const handleSelectPersona = (persona: Persona) => {
 setSelectedPersona(persona);
 if (persona.isGenerico) {
 onStartChat(persona.id);
 } else {
 setStep('disciplina');
 }
 };

 const filteredDisciplinas = disciplinas.filter(d => 
 selectedPersona && d.professores_vinculados?.includes(selectedPersona.id)
);

 return (
 <AnimatePresence>
 {isOpen && (
 <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 onClick={onClose}
 className="absolute inset-0 bg-black/60 backdrop-blur-md"
 />
 
 <motion.div
 initial={{ scale: 0.9, opacity: 0, y: 20 }}
 animate={{ scale: 1, opacity: 1, y: 0 }}
 exit={{ scale: 0.9, opacity: 0, y: 20 }}
 className="relative bg-white dark:bg-zinc-900 w-full max-w-2xl overflow-hidden rounded-[2.5rem] shadow-2xl border border-zinc-200 dark:border-zinc-800"
 >
 {/* Header */}
 <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
 <div>
 <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
 {step === 'persona' ? 'Escolha o Professor' : 'Selecione a Disciplina'}
 </h2>
 <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mt-1">
 {step === 'persona' 
 ? 'Com quem você deseja "pensar junto"hoje?' 
 : `Qual assunto você quer tratar com ${selectedPersona?.nome}?`}
 </p>
 </div>
 <button 
 onClick={onClose}
 className="p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-2xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
 >
 <X size={20} />
 </button>
 </div>

 {/* Content */}
 <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
 {loading ? (
 <div className="flex flex-col items-center justify-center py-10 gap-4">
 <Loader2 className="animate-spin text-primary"size={32} />
 <p className="text-sm font-bold text-zinc-400">Carregando opções...</p>
 </div>
) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {step === 'persona' ? (
 personas.map((persona) => (
 <button
 key={persona.id}
 onClick={() => handleSelectPersona(persona)}
 className="group flex flex-col p-6 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] hover:border-primary/50 hover:bg-white dark:hover:bg-zinc-900 transition-all text-left"
 >
 <div className="w-12 h-12 rounded-2xl bg-primary/10 overflow-hidden flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform shrink-0">
 {persona.imageUrl
   ? <img src={persona.imageUrl} alt={persona.nome} className="w-full h-full object-cover" />
   : <span className="text-lg font-black">{persona.nome.charAt(0)}</span>
 }
 </div>
 <h4 className="font-black text-lg text-zinc-900 dark:text-zinc-100 leading-tight mb-1">{persona.nome}</h4>
 <p className="text-xs text-zinc-500 dark:text-zinc-500 font-medium line-clamp-2">{persona.descricao}</p>
 </button>
))
) : (
 <>
 {filteredDisciplinas.map((disciplina) => (
 <button
 key={disciplina.id}
 onClick={() => setSelectedDisciplina(disciplina)}
 className={clsx(
 "flex items-center gap-4 p-5 rounded-[1.5rem] border transition-all text-left",
 selectedDisciplina?.id === disciplina.id
 ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/30"
 : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-primary/30"
)}
 >
 <div className={clsx(
 "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
 selectedDisciplina?.id === disciplina.id ? "bg-white/20": "bg-primary/10 dark:bg-primary/10 text-primary dark:text-primary"
)}>
 <BookOpen size={20} />
 </div>
 <span className="font-bold text-sm truncate">{disciplina.nome}</span>
 </button>
))}
 
 {filteredDisciplinas.length === 0 && (
 <div className="col-span-full py-10 text-center">
 <p className="text-zinc-400 text-sm font-bold">O professor {selectedPersona?.nome} não possui disciplinas vinculadas.</p>
 <button 
 onClick={() => setStep('persona')}
 className="mt-4 text-primary dark:text-primary font-bold text-sm hover:underline"
 >
 Voltar e escolher outro professor
 </button>
 </div>
)}
 </>
)}
 </div>
)}
 </div>

 {/* Footer */}
 <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
 {step === 'disciplina' && (
 <button
 onClick={() => setStep('persona')}
 className="text-zinc-500 dark:text-zinc-400 font-bold text-sm hover:text-primary transition-colors"
 >
 Voltar
 </button>
)}
 <div className="flex-1"/>
 {step === 'disciplina' && selectedDisciplina && (
 <button
 onClick={() => onStartChat(selectedPersona!.id, selectedDisciplina.id)}
 className="flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-2xl font-black text-sm shadow-xl shadow-primary/20 hover:opacity-90 active:scale-95 transition-all"
 >
 Iniciar Conversa
 <ArrowRight size={18} />
 </button>
)}
 </div>
 </motion.div>
 </div>
)}
 </AnimatePresence>
);
}
