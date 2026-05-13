import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, X, Loader2, Zap } from 'lucide-react';

interface AISidebarProps {
  isOpen: boolean;
  onClose: () => void;
  askAI: (type: 'summary' | 'explain' | 'fix' | 'translate' | 'keywords' | 'general' | 'detect_wm') => void;
  isAIProcessing: boolean;
  aiResponse: string;
}

export const AISidebar: React.FC<AISidebarProps> = ({ isOpen, onClose, askAI, isAIProcessing, aiResponse }) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="absolute inset-y-0 right-0 w-80 lg:w-96 border-l border-slate-200 bg-white flex flex-col z-[105] shadow-2xl"
    >
      <div className="p-6 space-y-6 flex flex-col h-full bg-[#f8f9fa]">
        <div className="flex justify-between items-center border-b border-slate-200 pb-4">
          <h4 className="font-black flex items-center gap-2 text-slate-900 tracking-tight">
            <Sparkles size={20} className="text-[#00c4cc]" /> Assistant Intelligence
          </h4>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => askAI('summary')} className="p-4 bg-white border border-slate-200 rounded-2xl text-[11px] font-black hover:bg-cyan-50 hover:border-cyan-200 transition-all shadow-sm">Résumé Automatique</button>
          <button onClick={() => askAI('translate')} className="p-4 bg-white border border-slate-200 rounded-2xl text-[11px] font-black hover:bg-cyan-50 hover:border-cyan-200 transition-all shadow-sm">Traduction Directe</button>
        </div>
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-6 overflow-auto text-sm leading-relaxed whitespace-pre-wrap font-medium text-slate-700 shadow-inner">
          {isAIProcessing ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <Loader2 size={32} className="animate-spin text-[#00c4cc]" />
              <span className="text-slate-400 font-bold animate-pulse">L'IA parcourt votre document...</span>
            </div>
          ) : aiResponse || "Posez une question ou utilisez un outil pour analyser cette page."}
        </div>
        <div className="mt-4 p-4 bg-cyan-900 rounded-2xl text-white text-[11px] font-bold flex items-center gap-2 overflow-hidden">
          <Zap size={14} className="fill-white shrink-0" /> Propulsé par Google Gemini
        </div>
      </div>
    </motion.div>
  );
};
