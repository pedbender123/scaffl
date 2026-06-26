import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api, LabProject, LabMessage } from '../lib/api';
import { Send, Loader2, User as UserIcon, Bot, FlaskConical, ArrowLeft, Pencil, Check, X, RefreshCw, PanelLeftClose, PanelLeftOpen, Maximize2, Minimize2, ThumbsUp, ThumbsDown, Terminal, Cpu } from 'lucide-react';
import Markdown from 'react-markdown';
import { cn } from '../lib/utils';
import html2canvas from 'html2canvas';

export default function LabEditor() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState<LabProject | null>(null);
  const [messages, setMessages] = useState<LabMessage[]>([]);
  const [htmlContent, setHtmlContent] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [previewKey, setPreviewKey] = useState(0);
  const [chatHidden, setChatHidden] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [loadingStage, setLoadingStage] = useState<'thinking' | 'coding' | null>(null);
  const [queueWarning, setQueueWarning] = useState(false);

  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingColor, setDrawingColor] = useState('#ef4444');
  const [drawingSize, setDrawingSize] = useState(5);
  const [drawingTool, setDrawingTool] = useState<'pencil' | 'eraser' | 'text'>('pencil');
  const [textValue, setTextValue] = useState('');
  const [textInputPos, setTextInputPos] = useState<{ x: number; y: number } | null>(null);
  const [textSize, setTextSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [hasDrawing, setHasDrawing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const hasDrawingRef = useRef(false);
  useEffect(() => {
    hasDrawingRef.current = hasDrawing;
  }, [hasDrawing]);

  useEffect(() => {
    if (!projectId) return;
    api.lab.getProject(projectId)
      .then(data => {
        const { messages: msgs, ...proj } = data;
        setProject(proj);
        setMessages(msgs);
        setHtmlContent(proj.htmlContent || '');
        setTitleInput(proj.title);
      })
      .catch(() => navigate('/lab'))
      .finally(() => setInitializing(false));
  }, [projectId, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (editingTitle) titleInputRef.current?.focus();
  }, [editingTitle]);

  const initCanvas = () => {
    if (drawingCanvasRef.current && previewRef.current) {
      const canvas = drawingCanvasRef.current;
      const width = previewRef.current.clientWidth;
      const height = previewRef.current.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        // Salvar imagem atual se houver para restaurar após o redimensionamento
        let tempImgData: string | null = null;
        if (canvas.width > 0 && canvas.height > 0 && hasDrawingRef.current) {
          tempImgData = canvas.toDataURL();
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          if (tempImgData) {
            const img = new Image();
            img.onload = () => {
              ctx.drawImage(img, 0, 0, width, height);
            };
            img.src = tempImgData;
          }
        }
      }
    }
  };

  useEffect(() => {
    if (isDrawing) {
      initCanvas();
    }
  }, [isDrawing]);

  useEffect(() => {
    if (htmlContent) {
      // Limpar o canvas quando uma nova simulação é carregada (pois a tela mudou)
      if (drawingCanvasRef.current) {
        const canvas = drawingCanvasRef.current;
        if (previewRef.current) {
          canvas.width = previewRef.current.clientWidth;
          canvas.height = previewRef.current.clientHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
          }
        }
      }
      setHasDrawing(false);
      setIsDrawing(false);
    }
  }, [htmlContent]);

  // Observer de redimensionamento para o preview
  useEffect(() => {
    if (!previewRef.current) return;
    
    const resizeObserver = new ResizeObserver(() => {
      initCanvas();
    });
    
    resizeObserver.observe(previewRef.current);
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (drawingTool === 'text') {
      const rect = drawingCanvasRef.current?.getBoundingClientRect();
      if (rect) {
        setTextInputPos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
      return;
    }
    isDrawingRef.current = true;
    const rect = drawingCanvasRef.current?.getBoundingClientRect();
    if (rect) {
      lastPosRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !drawingCanvasRef.current) return;
    const ctx = drawingCanvasRef.current.getContext('2d');
    if (!ctx) return;

    const rect = drawingCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(x, y);

    if (drawingTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = drawingSize * 3;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = drawingColor;
      ctx.lineWidth = drawingSize;
    }

    ctx.stroke();
    lastPosRef.current = { x, y };
    setHasDrawing(true);
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const commitText = () => {
    if (textValue.trim() && textInputPos && drawingCanvasRef.current) {
      const ctx = drawingCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = drawingColor;
        ctx.font = `bold ${textSize === 'sm' ? '12px' : textSize === 'md' ? '18px' : '28px'} sans-serif`;
        ctx.fillText(textValue, textInputPos.x, textInputPos.y);
        setHasDrawing(true);
      }
    }
    setTextValue('');
    setTextInputPos(null);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || !projectId || !user) return;

    const currentInput = input;
    setInput('');
    setLoading(true);
    setLoadingStage('thinking');

    const stageTimer = setTimeout(() => setLoadingStage('coding'), 3000);
    const queueWarningTimer = setTimeout(() => setQueueWarning(true), 15_000);

    let drawingScreenshotUrl: string | undefined = undefined;

    // Se o aluno desenhou algo (hasDrawing), capturamos a tela do simulador com o desenho sobreposto
    if (hasDrawing && previewRef.current) {
      try {
        const canvas = await html2canvas(previewRef.current, {
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        // Redimensionar para 360p de altura mantendo o aspecto original para economizar tokens de visão
        const resizedCanvas = document.createElement('canvas');
        const targetHeight = 360;
        const scale = targetHeight / canvas.height;
        resizedCanvas.width = Math.round(canvas.width * scale);
        resizedCanvas.height = targetHeight;
        const resizedCtx = resizedCanvas.getContext('2d');
        if (resizedCtx) {
          resizedCtx.drawImage(canvas, 0, 0, resizedCanvas.width, resizedCanvas.height);
          drawingScreenshotUrl = resizedCanvas.toDataURL('image/jpeg', 0.85);
        } else {
          drawingScreenshotUrl = canvas.toDataURL('image/jpeg', 0.85);
        }
      } catch (snapErr) {
        console.error('Erro ao tirar screenshot do simulador + desenho:', snapErr);
      }
    }

    const tempId = crypto.randomUUID();
    const optimisticMsg: LabMessage = {
      id: tempId,
      projectId: projectId!,
      userId: user.id,
      role: 'user',
      content: currentInput,
      tokensUsed: 0,
      creditsUsed: 0,
      createdAt: new Date().toISOString(),
      imageUrl: drawingScreenshotUrl || null,
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const { userMessage, assistantMessage, htmlContent: newHtml } = await api.lab.sendMessage(projectId!, currentInput, undefined, drawingScreenshotUrl);
      setMessages(prev => [...prev.filter(m => m.id !== tempId), userMessage, assistantMessage]);
      if (newHtml !== htmlContent) {
        setHtmlContent(newHtml);
        setPreviewKey(k => k + 1);
      }
      
      // Limpar o canvas de desenho APENAS após o sucesso do envio
      if (drawingCanvasRef.current) {
        const ctx = drawingCanvasRef.current.getContext('2d');
        ctx?.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
      }
      setIsDrawing(false);
      setHasDrawing(false);
    } catch (error: any) {
      alert(error.message || 'Erro ao enviar mensagem.');
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setInput(currentInput);
    } finally {
      setLoading(false);
      setLoadingStage(null);
      setQueueWarning(false);
      clearTimeout(stageTimer);
      clearTimeout(queueWarningTimer);
    }
  };

  const handleSaveTitle = async () => {
    if (!titleInput.trim() || !projectId) return;
    try {
      await api.lab.renameProject(projectId, titleInput.trim());
      setProject(prev => prev ? { ...prev, title: titleInput.trim() } : prev);
      setEditingTitle(false);
    } catch (err: any) {
      alert(err.message || 'Erro ao renomear projeto.');
    }
  };

  const handleCancelTitle = () => {
    setTitleInput(project?.title || '');
    setEditingTitle(false);
  };

  const isOwner = project?.userId === user?.id;

  const handleFullscreen = () => {
    if (!fullscreen) {
      previewRef.current?.requestFullscreen?.().catch(() => {});
      setFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setFullscreen(false);
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) setFullscreen(false);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  if (initializing) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="flex h-full bg-white dark:bg-slate-950 font-sans overflow-hidden">
      {/* ====== LEFT: Chat ====== */}
      <div className={cn(
        'shrink-0 flex flex-col border-r border-slate-100 dark:border-slate-800 transition-all duration-300 overflow-hidden',
        chatHidden ? "w-0 overflow-hidden border-0" : "w-[450px] min-w-[450px]"
      )}>
        {/* Chat Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shrink-0">
          <button
            onClick={() => navigate('/lab')}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <FlaskConical size={18} />
          </div>

          <div className="flex-1 min-w-0">
            {editingTitle && isOwner ? (
              <div className="flex items-center gap-1">
                <input
                  ref={titleInputRef}
                  value={titleInput}
                  onChange={e => setTitleInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') handleCancelTitle();
                  }}
                  className="flex-1 text-sm font-black bg-slate-100 dark:bg-slate-800 rounded-lg px-2 py-1 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button onClick={handleSaveTitle} className="p-1 text-emerald-500 hover:text-emerald-600 transition-colors">
                  <Check size={14} />
                </button>
                <button onClick={handleCancelTitle} className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group/title">
                <p className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">{project?.title || 'Projeto'}</p>
                {isOwner && (
                  <button
                    onClick={() => setEditingTitle(true)}
                    className="opacity-0 group-hover/title:opacity-100 p-1 text-slate-300 hover:text-slate-500 transition-all rounded"
                  >
                    <Pencil size={12} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 custom-scrollbar">
          {messages.length === 0 && !loading && (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <FlaskConical size={32} />
              </div>
              <div>
                <p className="font-black text-slate-700 dark:text-slate-300">Descreva sua simulação</p>
                <p className="text-sm text-slate-400 mt-1">Ex: "Crie um simulador de lançamento de projétil onde posso ajustar o ângulo e a velocidade inicial"</p>
              </div>
            </div>
          )}

          {messages.map(msg => (
            <LabMessageBubble key={msg.id} msg={msg} />
          ))}

          {loading && (
            <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Bot size={16} />
              </div>
              <div className="bg-slate-100 dark:bg-slate-800/50 rounded-2xl rounded-tl-sm px-4 py-3 flex flex-col gap-2 min-w-[180px]">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                  </div>
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    {loadingStage === 'coding' ? 'Gerando código...' : 'Pensando...'}
                  </span>
                </div>
                <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className={cn("h-full bg-primary transition-all duration-1000 ease-in-out", loadingStage === 'coding' ? "w-[80%]" : "w-[20%]")} />
                </div>
                {queueWarning && (
                  <p className="text-[11px] text-amber-500 text-center mt-1">
                    Alto número de pedidos simultâneos — não feche nem recarregue a página.
                  </p>
                )}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area: Premium Toolbar & Integrated Textarea */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <div className="max-w-3xl mx-auto space-y-3">
            {/* Feedback buttons */}
            {isOwner && (
              <div className="flex justify-end px-1">
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={async () => { await api.lab.giveFeedback(projectId!, 'like'); alert('Feedback enviado! 👍'); }}
                    className="p-1.5 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-400 hover:text-green-600 transition-all cursor-pointer"
                    title="Atingiu o original"
                  >
                    <ThumbsUp size={12} />
                  </button>
                  <div className="w-[1px] h-3 bg-slate-200 dark:bg-slate-700 mx-0.5" />
                  <button
                    onClick={async () => { await api.lab.giveFeedback(projectId!, 'dislike'); alert('Feedback enviado! 👎'); }}
                    className="p-1.5 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 transition-all cursor-pointer"
                    title="Não atingiu o original"
                  >
                    <ThumbsDown size={12} />
                  </button>
                </div>
              </div>
            )}

            {/* Aviso visual do desenho anexado pendente de envio */}
            {hasDrawing && (
              <div className="flex items-center justify-between bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 dark:border-amber-500/30 rounded-2xl p-3 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-2.5">
                  <span className="text-amber-500 shrink-0">🎨</span>
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                    O seu desenho sobre o simulador será enviado na próxima mensagem!
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (drawingCanvasRef.current) {
                      const ctx = drawingCanvasRef.current.getContext('2d');
                      ctx?.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
                      setHasDrawing(false);
                    }
                  }}
                  className="text-xs font-black text-red-500 hover:text-red-650 transition-colors uppercase cursor-pointer"
                >
                  Descartar
                </button>
              </div>
            )}

            <form onSubmit={handleSend} className="relative flex items-end gap-2">
              <div className="relative flex-1 group">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e as any);
                    }
                  }}
                  placeholder={isOwner ? 'Descreva o que quer criar ou modificar...' : 'Apenas o criador pode editar este projeto.'}
                  disabled={loading || !isOwner}
                  className="w-full max-h-40 min-h-[52px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5 pr-14 resize-none focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-slate-900 dark:text-slate-100 font-medium text-sm leading-relaxed disabled:opacity-50"
                  rows={1}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading || !isOwner}
                  className="absolute right-2 bottom-2 w-9 h-9 bg-primary text-primary-foreground rounded-xl flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-40 cursor-pointer"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
            
            <div className="flex items-center justify-center gap-2 px-1">
               <div className="h-[1px] flex-1 bg-slate-100 dark:bg-slate-800" />
               <p className="text-[9px] font-black text-slate-300 dark:text-slate-655 uppercase tracking-[0.3em] whitespace-nowrap">
                Lab · IA Generativa
              </p>
              <div className="h-[1px] flex-1 bg-slate-100 dark:bg-slate-800" />
            </div>
          </div>
        </div>
      </div>

      {/* ====== RIGHT: Preview ====== */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-950">
        {/* Preview Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setChatHidden(h => !h)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-black text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 uppercase tracking-widest rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              title={chatHidden ? 'Mostrar chat' : 'Esconder chat'}
            >
              {chatHidden ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
              {chatHidden ? 'Chat' : 'Esconder'}
            </button>
            <p className="text-xs font-black text-slate-300 dark:text-slate-655 uppercase tracking-widest">Preview</p>
          </div>
          <div className="flex items-center gap-1">
            {htmlContent && (
              <>
                <button
                  onClick={() => {
                    setIsDrawing(prev => !prev);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer",
                    isDrawing
                      ? "bg-amber-500 text-white hover:bg-amber-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                  title={isDrawing ? 'Fechar modo desenho' : 'Ativar modo desenho'}
                >
                  🎨 {isDrawing ? 'Parar Desenho' : 'Desenhar'}
                </button>
                <button
                  onClick={() => setPreviewKey(k => k + 1)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-black text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 uppercase tracking-widest rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <RefreshCw size={12} />
                  Reiniciar
                </button>
              </>
            )}
            <button
              onClick={handleFullscreen}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-black text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 uppercase tracking-widest rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              title={fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            >
              {fullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              {fullscreen ? 'Sair' : 'Tela Cheia'}
            </button>
          </div>
        </div>

        {/* Preview Content Container: Fluid full-screen area */}
        <div className="flex-1 bg-white dark:bg-slate-950 relative overflow-hidden flex flex-col">
          {htmlContent ? (
            <div
              ref={previewRef}
              className="relative flex-1 w-full h-full bg-white dark:bg-slate-950 overflow-hidden"
            >
              <iframe
                key={previewKey}
                srcDoc={htmlContent}
                sandbox="allow-scripts allow-forms"
                className="w-full h-full border-0 bg-white"
                title="Preview da simulação"
              />

              {/* Canvas de desenho fica montado sempre que há simulação ativa */}
              <canvas
                ref={drawingCanvasRef}
                className={cn(
                  "absolute inset-0 w-full h-full z-10 touch-none bg-transparent transition-all",
                  isDrawing ? "cursor-crosshair pointer-events-auto" : "pointer-events-none"
                )}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />

              {/* Absolute TextInput Box */}
              {isDrawing && textInputPos && (
                <div
                  className="absolute z-25"
                  style={{ left: textInputPos.x, top: textInputPos.y - 12 }}
                >
                  <input
                    type="text"
                    autoFocus
                    value={textValue}
                    onChange={e => setTextValue(e.target.value)}
                    onBlur={commitText}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitText();
                      if (e.key === 'Escape') setTextInputPos(null);
                    }}
                    style={{
                      color: drawingColor,
                      fontSize: textSize === 'sm' ? '12px' : textSize === 'md' ? '18px' : '28px',
                      fontWeight: 'bold',
                      background: 'rgba(255,255,255,0.95)',
                      border: `1px solid ${drawingColor}`,
                      borderRadius: '4px',
                      padding: '2px 6px',
                      outline: 'none',
                    }}
                    placeholder="Escreva..."
                  />
                </div>
              )}

              {isDrawing && (
                <>
                  {/* Drawing Toolbar Overlay */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200 dark:border-slate-800 rounded-full px-3 py-1.5 flex items-center gap-2.5 shadow-xl select-none animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => setDrawingTool('pencil')}
                        className={cn("px-2 py-1 rounded text-[9px] font-bold uppercase transition-all cursor-pointer", drawingTool === 'pencil' ? "bg-white dark:bg-slate-700 text-primary shadow-sm" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300")}
                      >
                        Lápis
                      </button>
                      <button
                        type="button"
                        onClick={() => setDrawingTool('eraser')}
                        className={cn("px-2 py-1 rounded text-[9px] font-bold uppercase transition-all cursor-pointer", drawingTool === 'eraser' ? "bg-white dark:bg-slate-700 text-primary shadow-sm" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300")}
                      >
                        Borracha
                      </button>
                      <button
                        type="button"
                        onClick={() => setDrawingTool('text')}
                        className={cn("px-2 py-1 rounded text-[9px] font-bold uppercase transition-all cursor-pointer", drawingTool === 'text' ? "bg-white dark:bg-slate-700 text-primary shadow-sm" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300")}
                      >
                        Texto
                      </button>
                    </div>

                    <div className="w-[1px] h-3.5 bg-slate-200 dark:bg-slate-850" />

                    <div className="flex items-center gap-1">
                      {[
                        { val: '#ef4444', label: 'Vermelho' },
                        { val: '#22c55e', label: 'Verde' },
                        { val: '#3b82f6', label: 'Azul' },
                        { val: '#eab308', label: 'Amarelo' },
                        { val: '#0f172a', label: 'Preto' },
                        { val: '#ffffff', label: 'Branco' }
                      ].map(c => (
                        <button
                          key={c.val}
                          type="button"
                          onClick={() => setDrawingColor(c.val)}
                          className={cn("w-3.5 h-3.5 rounded-full border transition-all hover:scale-110 cursor-pointer", drawingColor === c.val ? "ring-2 ring-primary ring-offset-1 border-transparent scale-105" : "border-slate-300 dark:border-slate-700")}
                          style={{ backgroundColor: c.val }}
                          title={c.label}
                        />
                      ))}
                    </div>

                    <div className="w-[1px] h-3.5 bg-slate-200 dark:bg-slate-850" />

                    {drawingTool === 'text' ? (
                      <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-md p-0.5 text-[8px] font-bold">
                        {(['sm', 'md', 'lg'] as const).map(sz => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => setTextSize(sz)}
                            className={cn("px-1.5 py-0.5 rounded transition-all cursor-pointer", textSize === sz ? "bg-white dark:bg-slate-700 text-primary shadow-sm" : "text-slate-400")}
                          >
                            {sz === 'sm' ? 'P' : sz === 'md' ? 'M' : 'G'}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-md p-0.5 text-[8px] font-bold">
                        {[
                          { val: 2, label: 'F' },
                          { val: 5, label: 'M' },
                          { val: 10, label: 'G' }
                        ].map(sz => (
                          <button
                            key={sz.val}
                            type="button"
                            onClick={() => setDrawingSize(sz.val)}
                            className={cn("px-1.5 py-0.5 rounded transition-all cursor-pointer", drawingSize === sz.val ? "bg-white dark:bg-slate-700 text-primary shadow-sm" : "text-slate-400")}
                            title={sz.label}
                          >
                            {sz.label}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="w-[1px] h-3.5 bg-slate-200 dark:bg-slate-850" />

                    <button
                      type="button"
                      onClick={() => {
                        if (drawingCanvasRef.current) {
                          const ctx = drawingCanvasRef.current.getContext('2d');
                          ctx?.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
                          setHasDrawing(false);
                        }
                      }}
                      className="text-[9px] font-bold text-red-500 hover:text-red-655 transition-colors uppercase cursor-pointer"
                    >
                      Limpar
                    </button>

                    <div className="w-[1px] h-3.5 bg-slate-200 dark:bg-slate-850" />

                    <button
                      type="button"
                      onClick={() => setIsDrawing(false)}
                      className="text-[9px] font-bold text-emerald-500 hover:text-emerald-600 transition-colors uppercase flex items-center gap-1 cursor-pointer"
                    >
                      <Check size={12} />
                      Concluir
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-5 text-center px-8">
              <div className="w-20 h-20 rounded-3xl bg-slate-200 dark:bg-slate-805 flex items-center justify-center text-slate-400">
                <FlaskConical size={40} />
              </div>
              <div>
                <p className="text-lg font-black text-slate-500 dark:text-slate-400">Nenhuma simulação ainda</p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-2 max-w-sm">
                  Descreva o que você quer criar no chat ao lado e o Lab Agent irá gerar a simulação aqui.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LabMessageBubble({ msg }: { msg: LabMessage }) {
  const isUser = msg.role === 'user';
  return (
    <div className={cn('flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-400', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div className={cn(
        'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
        isUser ? 'bg-primary text-primary-foreground' : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-primary'
      )}>
        {isUser ? <UserIcon size={15} /> : <Bot size={16} />}
      </div>
      <div className={cn(
        'max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] dark:shadow-none',
        isUser
          ? 'bg-primary text-primary-foreground rounded-tr-sm'
          : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-sm'
      )}>
        {!isUser && (msg.edit_scope || (msg.tokensUsed > 0)) && (
          <div className="mb-2.5 flex flex-col gap-1.5 bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-100 dark:border-slate-805 font-mono text-[10px] leading-normal tracking-tight text-slate-500 dark:text-slate-400 shadow-inner">
            <div className="flex flex-wrap items-center gap-1.5">
              {msg.edit_scope === 'surgical' && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">
                  <Terminal size={10} />
                  Patch Cirúrgico
                </span>
              )}
              {msg.edit_scope === 'full_rewrite' && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
                  <Cpu size={10} />
                  Reescrita Total
                </span>
              )}
              
              <div className="ml-auto flex items-center gap-1.5 text-slate-400 dark:text-slate-500 font-bold">
                <span>{msg.tokensUsed?.toLocaleString() || 0} tkn</span>
                <span>•</span>
                <span className="text-emerald-500 dark:text-emerald-400">{msg.creditsUsed?.toLocaleString() || 0} crd</span>
              </div>
            </div>

            {msg.patched_functions && (() => {
              try {
                const fns = JSON.parse(msg.patched_functions);
                if (Array.isArray(fns) && fns.length > 0) {
                  return (
                    <div className="flex items-start gap-1 text-[9px] text-slate-400 border-t border-slate-100 dark:border-slate-900 pt-1.5">
                      <span className="font-bold shrink-0">Funções afetadas:</span>
                      <code className="text-slate-600 dark:text-slate-300 font-bold truncate max-w-full" title={fns.join(', ')}>
                        {fns.join(', ')}
                      </code>
                    </div>
                  );
                }
              } catch (_) {
                return (
                  <div className="flex items-start gap-1 text-[9px] text-slate-400 border-t border-slate-100 dark:border-slate-900 pt-1.5">
                    <span className="font-bold shrink-0">Funções afetadas:</span>
                    <code className="text-slate-600 dark:text-slate-300 font-bold truncate max-w-full">
                      {msg.patched_functions}
                    </code>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        )}

        {isUser ? (
          <div className="flex flex-col gap-2">
            {msg.content && <p className="whitespace-pre-wrap font-medium leading-relaxed">{msg.content}</p>}
            {msg.imageUrl && (
              <div className="mt-1 rounded-lg overflow-hidden border border-white/20 max-w-[280px] shadow-sm bg-black/5 dark:bg-black/20">
                <img
                  src={msg.imageUrl.startsWith('/') ? ((import.meta as any).env?.DEV ? `http://localhost:3001${msg.imageUrl}` : msg.imageUrl) : msg.imageUrl}
                  alt="Desenho explicativo"
                  className="w-full h-auto cursor-pointer max-h-[210px] object-contain hover:opacity-95 transition-opacity"
                  onClick={() => window.open(msg.imageUrl!.startsWith('/') ? ((import.meta as any).env?.DEV ? `http://localhost:3001${msg.imageUrl}` : msg.imageUrl) : msg.imageUrl, '_blank')}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="markdown-body prose dark:prose-invert prose-primary max-w-none text-[14px] leading-relaxed font-medium">
            <Markdown>{msg.content}</Markdown>
          </div>
        )}
      </div>
    </div>
  );
}
