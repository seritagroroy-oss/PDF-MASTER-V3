import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { pdfjs } from '../pdfjs-setup';
import { MessageSquare, Upload, FileText, Send, Loader2, Sparkles, X, AlertCircle } from 'lucide-react';
import { cn } from '../utils/cn';


interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
}

export const PDFChat = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfText, setPdfText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const handleFile = async (f: File) => {
    setFile(f); setError(''); setIsExtracting(true); setMessages([]); setPdfText('');
    try {
      const arrayBuffer = await f.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;
      let fullText = '';

      for (let i = 1; i <= Math.min(numPages, 50); i++) { // Limit to 50 pages for token size
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map((item: any) => item.str);
        fullText += `\n--- PAGE ${i} ---\n` + strings.join(' ');
      }

      if (!fullText.trim()) throw new Error('NO_TEXT');

      setPdfText(fullText);
      setMessages([
        {
          id: 'welcome',
          role: 'ai',
          content: `J'ai terminé de lire **${f.name}** (${numPages} pages). Que souhaitez-vous savoir sur ce document ? Je peux vous faire un résumé ou chercher des informations précises.`
        }
      ]);
    } catch (e: any) {
      if (e.message === 'NO_TEXT') setError('Ce PDF ne contient pas de texte lisible (il s\'agit peut-être d\'images scannées).');
      else setError("Erreur lors de la lecture du fichier.");
      setFile(null);
    } finally {
      setIsExtracting(false);
    }
  };

  const askAI = async (message: string) => {
    // Récupération standard par Vite
    const OPENROUTER_API_KEY = (import.meta.env.VITE_OPENROUTER_API_KE as string);
    
    // Vérification rigoureuse
    if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY.trim() === "" || OPENROUTER_API_KEY.includes('YOUR_OPENROUTER')) {
      console.warn("API Key checking failed. Value is:", OPENROUTER_API_KEY ? "Present (but invalid or placeholder)" : "MISSING");
      throw new Error('API_KEY_MISSING');
    }

    const messagesBody = [
      {
        role: 'system',
        content: `Voici le contenu d'un document PDF. Tu es un assistant intelligent conçu pour aider l'utilisateur à extraire des informations, résumer et répondre aux questions basées uniquement sur ce document.\n\nContenu du PDF :\n${pdfText}`
      }
    ];

    for (const msg of messages.filter(m => m.id !== 'welcome')) {
      messagesBody.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      });
    }

    messagesBody.push({ role: 'user', content: message });

    const models = [
      "meta-llama/llama-3.1-8b-instruct:free",
      "google/gemma-2-9b-it:free",
      "meta-llama/llama-3.2-3b-instruct:free",
      "qwen/qwen-2.5-72b-instruct:free",
      "mistralai/mistral-7b-instruct:free",
      "microsoft/phi-3-mini-128k-instruct:free"
    ];

    let lastError = '';
    
    for (const model of models) {
      try {
        console.log(`Tentative avec le modèle : ${model}...`);
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://pdf-master.vercel.app', // Forcé pour éviter les blocages sur mobile/local
            'X-Title': 'PDF Master ROY' 
          },
          body: JSON.stringify({
            model: model,
            messages: messagesBody,
            temperature: 0.7,
            max_tokens: 1000
          })
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok && data.choices?.[0]?.message?.content) {
          return data.choices[0].message.content;
        } else {
          lastError = data?.error?.message || response.statusText || "Erreur inconnue";
          console.warn(`Le modèle ${model} a échoué : ${lastError}`);
          // On attend 500ms avant de tester le prochain modèle
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
      } catch (e: any) {
        lastError = e.message;
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }
    }

    throw new Error(`API_DETAIL:Tous les modèles ont échoué. Dernière erreur : ${lastError}`);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isThinking || !pdfText) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);
    setError('');

    try {
      const reply = await askAI(userMsg.content);
      setMessages(p => [...p, { id: Date.now().toString(), role: 'ai', content: reply }]);
    } catch (e: any) {
      if (e.message === 'API_KEY_MISSING') {
        setError("Clé API OpenRouter manquante. Veuillez configurer le fichier d'environnement.");
      } else if (e.message.startsWith('API_DETAIL:')) {
        setError(`Erreur OpenRouter : ${e.message.replace('API_DETAIL:', '')}`);
      } else {
        setError("L'IA Gemma via OpenRouter a rencontré une erreur technique.");
      }
      setMessages(p => p.slice(0, -1)); // Supprime le message de l'utilisateur en cas d'échec
    } finally {
      setIsThinking(false);
    }
  };

  // Markdown pseudo-formatter
  const formatText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col bg-white rounded-[2rem] shadow-xl overflow-hidden border border-slate-100">
      {/* HEADER */}
      <div className="shrink-0 flex items-center justify-between p-5 bg-gradient-to-br from-indigo-900 to-violet-900 text-white">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Sparkles size={20} className="text-indigo-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-lg">ChatPDF AI</h2>
              <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-[9px] font-black uppercase tracking-tighter">v1.2.1-FIX</span>
            </div>
            <p className="text-indigo-200 text-xs font-semibold">
              {isExtracting ? 'Analyse du document...' : file ? file.name : 'En attente d\'un fichier'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            title="Réinitialiser"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-white/70"
          >
            <Loader2 size={16} />
          </button>
          {file && !isExtracting && (
            <button onClick={() => { setFile(null); setMessages([]); setPdfText(''); }}
              className="p-2 rounded-xl bg-white/10 hover:bg-rose-500 hover:text-white transition-colors text-white/70">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {(!file || isExtracting) && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50">
          {!file && !isExtracting && (
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f?.type === 'application/pdf') handleFile(f); }}
              onClick={() => inputRef.current?.click()}
              className={cn('group w-full max-w-md flex flex-col items-center justify-center gap-6 rounded-[2rem] border-2 border-dashed p-12 cursor-pointer transition-all',
                isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/50')}
            >
              <div className={cn('h-16 w-16 rounded-2xl flex items-center justify-center transition-all', isDragging ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-600 group-hover:text-white')}>
                <Upload size={28} />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">Importer un PDF</p>
                <p className="mt-1 text-sm text-slate-500">Posez vos questions à l'IA</p>
              </div>
              <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ''; }} />
            </motion.div>
          )}

          {isExtracting && (
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center relative overflow-hidden">
                <FileText size={28} className="relative z-10" />
                <div className="absolute inset-x-0 bottom-0 bg-indigo-200/50 animate-pulse h-full transform origin-bottom" style={{ animationDuration: '2s' }} />
              </div>
              <p className="font-bold text-slate-700 animate-pulse">Extraction du texte ({file?.name})...</p>
              <p className="text-xs text-slate-400">Le document est en cours de lecture par le supercalculateur.</p>
            </div>
          )}

          {error && <div className="mt-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-sm font-bold flex flex-col items-center gap-2"><AlertCircle size={24} />{error}</div>}
        </div>
      )}

      {/* CHAT AREA */}
      {file && !isExtracting && (
        <>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50">
            {error && <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-bold w-full max-w-2xl mx-auto flex gap-2"><AlertCircle size={16} />{error}</div>}

            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map(msg => (
                <motion.div key={msg.id} initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                  className={cn("flex w-full gap-3", msg.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  {msg.role === 'ai' && (
                    <div className="shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center mt-auto shadow-sm">
                      <Sparkles size={14} />
                    </div>
                  )}
                  <div className={cn("px-5 py-3.5 rounded-2xl max-w-[85%] text-[15px] leading-relaxed",
                    msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-sm shadow-md shadow-indigo-200' : 'bg-white text-slate-700 rounded-bl-sm shadow-sm border border-slate-100'
                  )}>
                    {msg.role === 'ai' ? formatText(msg.content) : msg.content}
                  </div>
                </motion.div>
              ))}

              {isThinking && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex w-full gap-3 justify-start">
                  <div className="shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-sm">
                    <Loader2 size={14} className="animate-spin" />
                  </div>
                  <div className="px-5 py-3.5 rounded-2xl bg-white text-slate-400 rounded-bl-sm shadow-sm border border-slate-100 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </motion.div>
              )}
              <div ref={chatBottomRef} />
            </div>
          </div>

          {/* INPUT AREA */}
          <div className="shrink-0 p-4 bg-white border-t border-slate-100">
            <form onSubmit={handleSend} className="max-w-3xl mx-auto relative group">
              <input
                type="text"
                placeholder="Posez une question sur ce PDF..."
                value={input}
                onChange={e => setInput(e.target.value)}
                autoFocus
                disabled={isThinking}
                className="w-full bg-slate-100 border-2 border-slate-100 focus:border-indigo-400 focus:bg-white text-slate-700 py-4 pl-6 pr-14 rounded-[1.5rem] outline-none transition-all shadow-sm focus:shadow-md disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isThinking}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center disabled:bg-slate-300 disabled:text-slate-500 transition-colors hover:bg-indigo-700 shadow-sm"
              >
                <Send size={18} />
              </button>
            </form>
            <p className="text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-3">L'IA peut faire des erreurs. Vérifiez les informations critiques.</p>
          </div>
        </>
      )}
    </div>
  );
};
