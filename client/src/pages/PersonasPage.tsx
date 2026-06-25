import React, { useEffect, useRef, useState } from 'react';
import { api, Persona, Institution } from '../lib/api';
import { Plus, Edit2, Trash2, Copy, Check, Info, Building2, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import { useAuth } from '../contexts/AuthContext';

const EXTRACTION_PROMPT = `PROMPT DE EXTRAÇÃO DE PERFIL DIDÁTICO-PEDAGÓGICO
=================================================

Você é um especialista em design instrucional, pedagogia e análise de discurso educacional. Analise a seguinte transcrição de aula. 

SEU OBJETIVO NÃO É RESUMIR O CONTEÚDO DA AULA. 

Seu objetivo é criar um documento que descreva o MÉTODO DE ENSINO do professor — como ele ensina, não o que ele ensina. O perfil que você gerar será usado como instrução para uma IA tutora replicar o estilo pedagógico deste professor em qualquer área do conhecimento.

Analise e documente os seguintes aspectos:

1. TOM E LINGUAGEM
 - O professor é formal, informal ou híbrido?
 - Quais expressões coloquiais, gírias ou bordões ele usa repetidamente?
 - Qual é o tom emocional predominante? (calmo, enérgico, paternal, provocador, humorístico)
 - Como ele se dirige aos alunos? (você, vocês, pessoal, galera)

2. SAUDAÇÃO E ABERTURA
 - Como ele tipicamente inicia a interação? Existe uma saudação ou frase de abertura recorrente?

3. ESTRUTURA DA EXPLICAÇÃO
 - Como ele começa a explicar um conceito novo? (parte do abstrato? do concreto? de um exemplo?)
 - Como ele transiciona entre tópicos?
 - Existe um método ou checklist que ele repete sistematicamente?
 - Ele usa uma abordagem dedutiva (lei geral → exemplo) ou indutiva (exemplo → lei geral)?

4. USO DE ANALOGIAS E METÁFORAS
 - Ele usa analogias? Com que frequência?
 - As analogias são do cotidiano, visuais, técnicas ou humorísticas?
 - Liste as analogias específicas que ele usou e para quais conceitos.

5. SCAFFOLDING (ESTRATÉGIA DE SUPORTE)
 - Quando um aluno tem dúvida, ele dá a resposta diretamente ou guia com perguntas?
 - Ele usa dicas graduais? Descreva os níveis de ajuda que ele oferece.
 - Ele incentiva o aluno a tentar antes de ajudar?

6. TRATAMENTO DE ERROS E DÚVIDAS
 - Como ele reage quando o aluno erra? (corrige diretamente, normaliza o erro, usa o erro como trampolim)
 - Quais frases ele usa para validar dúvidas ou erros?

7. VERIFICAÇÃO DE COMPREENSÃO
 - Ele faz perguntas de verificação? Com que frequência?
 - Quais frases ele usa para verificar se o aluno entendeu?

8. RITMO
 - O ritmo é rápido, pausado ou variável?
 - Ele desacelera em pontos específicos? Quais?
 - Ele prioriza profundidade ou cobertura de conteúdo?

9. HUMOR E CONEXÃO
 - Ele usa humor? De que tipo? (sutil, irônico, autoirônico, referências pop)
 - Como ele cria rapport/conexão com os alunos?

10. FRASES E BORDÕES RECORRENTES
 - Liste todas as frases que ele repete com frequência — estas são a "marca registrada" do professor.

FORMATO DE SAÍDA:
Escreva o perfil como um documento corrido e descritivo, em linguagem clara, que possa ser usado diretamente como instrução para uma IA. Não use JSON. Escreva como se estivesse descrevendo o professor para alguém que vai imitá-lo. Seja específico — cite frases exatas, exemplos concretos e padrões observados.

=== TRANSCRIÇÃO DA AULA ===
[COLE A TRANSCRIÇÃO AQUI]`;

export default function PersonasPage() {
  const { userData } = useAuth();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    saudacao: '',
    documentoPedagogico: '',
    isGenerico: false,
    institutionId: '',
    imageUrl: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, [userData?.isAdmin]);

  const loadData = async () => {
    try {
      const [personasData, instData] = await Promise.all([
        api.get<Persona[]>('/api/personas'),
        userData?.isAdmin ? api.admin.institutions.getAll() : Promise.resolve([])
      ]);
      setPersonas(personasData);
      setInstitutions(instData as Institution[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { alert('Imagem muito grande. Máximo 3MB.'); return; }
    const reader = new FileReader();
    reader.onload = ev => setFormData(prev => ({ ...prev, imageUrl: ev.target?.result as string }));
    reader.readAsDataURL(file);
  };

  const handleOpenModal = (persona?: Persona) => {
    if (persona) {
      setEditingPersona(persona);
      setFormData({
        nome: persona.nome,
        descricao: persona.descricao,
        saudacao: persona.saudacao,
        documentoPedagogico: persona.documentoPedagogico,
        isGenerico: !!persona.isGenerico,
        institutionId: persona.institutionId || '',
        imageUrl: persona.imageUrl || '',
      });
    } else {
      setEditingPersona(null);
      setFormData({ nome: '', descricao: '', saudacao: '', documentoPedagogico: '', isGenerico: false, institutionId: institutions[0]?.id || '', imageUrl: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.imageUrl) { alert('Por favor, adicione uma foto para o professor.'); return; }
    try {
      if (editingPersona) {
        await api.put(`/api/personas/${editingPersona.id}`, formData);
      } else {
        await api.post('/api/personas', formData);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar persona');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta persona?')) return;
    try {
      await api.delete(`/api/personas/${id}`);
      loadData();
    } catch (err) {
      alert('Erro ao excluir persona');
    }
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(EXTRACTION_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Mural de Personas</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">Gerencie os perfis didáticos dos seus professores virtuais.</p>
        </div>
        {userData?.isAdmin && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-6 py-3 bg-primary hover:opacity-90 text-primary-foreground rounded-xl font-semibold transition-all shadow-lg shadow-primary/20 active:scale-95"
          >
            <Plus size={20} />
            Nova Persona
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-64 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {personas.map((persona) => (
            <motion.div
              layout
              key={persona.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 overflow-hidden flex items-center justify-center text-primary">
                    {persona.imageUrl
                      ? <img src={persona.imageUrl} alt={persona.nome} className="w-full h-full object-cover" />
                      : <span className="text-2xl font-black">{persona.nome.charAt(0)}</span>
                    }
                  </div>
                  {persona.isGenerico ? (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                    </span>
                  ) : null}
                </div>
                {(userData?.isAdmin || persona.userId === userData?.id) && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleOpenModal(persona)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-primary transition-colors">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete(persona.id)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-505 hover:text-red-650 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white truncate">{persona.nome}</h3>
                {persona.institutionName && (
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-500 uppercase rounded-full border border-slate-200 dark:border-slate-700 flex items-center gap-1 shrink-0">
                    <Building2 size={10} />
                    {persona.institutionName}
                  </span>
                )}
              </div>

              <p className="text-slate-550 dark:text-slate-400 text-sm line-clamp-2 mb-4 leading-relaxed">
                {persona.descricao || 'Sem descrição.'}
              </p>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-medium uppercase tracking-wider text-slate-400">
                <span>{persona.isGenerico ? 'Professor Generalista' : 'Professor Especialista'}</span>
                <span>{new Date(persona.createdAt).toLocaleDateString()}</span>
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
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {editingPersona ? 'Editar Persona' : 'Criar Nova Persona'}
                  </h2>
                  <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <input
                      type="checkbox"
                      id="isGenerico"
                      checked={formData.isGenerico}
                      onChange={e => setFormData({ ...formData, isGenerico: e.target.checked })}
                      className="rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="isGenerico" className="text-sm font-medium text-slate-650 dark:text-slate-400">Genérico</label>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Image upload — obrigatório */}
                  <div className="flex flex-col items-center gap-3">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="relative w-24 h-24 rounded-3xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 overflow-hidden cursor-pointer hover:border-primary transition-all group"
                    >
                      {formData.imageUrl ? (
                        <img src={formData.imageUrl} alt="preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-slate-400 group-hover:text-primary transition-colors">
                          <Camera size={24} />
                          <span className="text-[9px] font-black uppercase tracking-wider">Foto</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all" />
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    <div className="text-center">
                      <p className="text-xs font-bold text-slate-500">Foto do Professor <span className="text-red-500">*</span></p>
                      <p className="text-[10px] text-slate-400">JPG, PNG · máx 3MB</p>
                    </div>
                    {!formData.imageUrl && (
                      <p className="text-[10px] text-red-400 font-bold">Imagem obrigatória para criar um professor.</p>
                    )}
                  </div>

                  {!formData.isGenerico && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Instituição</label>
                      <select
                        required
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-slate-900 dark:text-white appearance-none"
                        value={formData.institutionId}
                        onChange={e => setFormData({ ...formData, institutionId: e.target.value })}
                      >
                        <option value="">Selecione uma instituição</option>
                        {institutions.map(inst => (
                          <option key={inst.id} value={inst.id}>{inst.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Nome do Professor</label>
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-slate-900 dark:text-white"
                      value={formData.nome}
                      onChange={e => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="Ex: Professor Agostinho Serrano"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Descrição Curta</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-slate-900 dark:text-white"
                      value={formData.descricao}
                      onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                      placeholder="Breve resumo para o card do mural"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Saudação Inicial</label>
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-slate-900 dark:text-white"
                      value={formData.saudacao}
                      onChange={e => setFormData({ ...formData, saudacao: e.target.value })}
                      placeholder="Olá! Eu sou o assistente do..."
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Documento Didático-Pedagógico</label>
                    <textarea
                      required
                      rows={8}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-slate-900 dark:text-white font-mono text-sm"
                      value={formData.documentoPedagogico}
                      onChange={e => setFormData({ ...formData, documentoPedagogico: e.target.value })}
                      placeholder="Descreva o MÉTODO de ensino: tom, ritmo, analogias, bordões..."
                    />

                    <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl p-6">
                      <div className="flex gap-4">
                        <div className="mt-1 text-primary">
                          <Info size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-primary mb-1">Não sabe como preencher?</h4>
                          <p className="text-sm text-primary/70 leading-relaxed mb-4">
                            Use o Prompt de Extração! Copie o prompt abaixo e cole em qualquer IA junto com a transcrição de uma aula do professor.
                          </p>
                          <button
                            type="button"
                            onClick={copyPrompt}
                            className={clsx(
                              "flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all active:scale-95",
                              copied
                                ? "bg-emerald-500 text-primary-foreground"
                                : "bg-primary text-primary-foreground hover:opacity-90"
                            )}
                          >
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                            {copied ? 'Prompt Copiado!' : 'Copiar Prompt de Extração'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-10 pt-6 border-t border-slate-100 dark:border-slate-800">
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
                    {editingPersona ? 'Salvar Alterações' : 'Criar Persona'}
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
