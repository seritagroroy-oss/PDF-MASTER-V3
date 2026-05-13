import React from 'react';
import { Sparkles, Minus, Plus, Bold, Italic, Underline, Undo2, RotateCcw, X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface EditorContextualToolbarProps {
  activeEditMode: string;
  askAI: (action: string) => void;
  isAIProcessing: boolean;
  tempFontSize: number;
  setTempFontSize: (updater: (prev: number) => number) => void;
  brushSize: number;
  setBrushSize: (updater: (prev: number) => number) => void;
  tempColor: string;
  setTempColor: (val: string) => void;
  tempIsBold: boolean;
  setTempIsBold: (val: boolean) => void;
  tempIsItalic: boolean;
  setTempIsItalic: (val: boolean) => void;
  undo: () => void;
  redo: () => void;
  setEditingPage: (val: any) => void;
}

export const EditorContextualToolbar: React.FC<EditorContextualToolbarProps> = ({
  activeEditMode,
  askAI,
  isAIProcessing,
  tempFontSize,
  setTempFontSize,
  brushSize,
  setBrushSize,
  tempColor,
  setTempColor,
  tempIsBold,
  setTempIsBold,
  tempIsItalic,
  setTempIsItalic,
  undo,
  redo,
  setEditingPage
}) => {
  return (
    <div className="hidden md:flex h-[56px] bg-white border-b border-slate-200 items-center px-8 gap-4 shrink-0 z-50 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-x-auto no-scrollbar scroll-smooth">
        <button 
            onClick={() => activeEditMode === 'text' ? askAI('fix') : alert('Passez en mode texte pour utiliser l\'écriture magique')} 
            className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-[13px] font-black text-slate-800 transition-all border border-slate-200/50 shadow-sm"
        >
            <Sparkles size={18} className="text-indigo-600 fill-indigo-100" /> {isAIProcessing ? 'En cours...' : 'Écriture magique'}
        </button>
        <div className="h-6 w-px bg-slate-200 mx-1" />
        
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 hover:border-slate-300 cursor-pointer transition-all shadow-sm group">
            <span className="text-[13px] font-bold text-slate-800">Inter</span>
            <div className="flex items-center gap-1 border-l border-slate-200 pl-2 ml-1">
                <button onClick={() => setTempFontSize(prev => Math.max(8, prev - 2))} className="hover:text-[#00c4cc]"><Minus size={12}/></button>
                <span className="text-[11px] font-black w-6 text-center">{tempFontSize}</span>
                <button onClick={() => setTempFontSize(prev => Math.min(100, prev + 2))} className="hover:text-[#00c4cc]"><Plus size={12}/></button>
            </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1.5 shadow-sm">
            <button onClick={() => setBrushSize(prev => Math.max(1, prev - 1))} className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg text-slate-600 shadow-sm transition-all active:scale-90"><Minus size={18}/></button>
            <div className="px-3 text-[14px] font-black text-slate-900 min-w-[32px] text-center">{brushSize}</div>
            <button onClick={() => setBrushSize(prev => Math.min(50, prev + 1))} className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg text-slate-600 shadow-sm transition-all active:scale-90"><Plus size={18}/></button>
        </div>

        <div className="h-6 w-px bg-slate-200 mx-1" />
        
        <div className="flex items-center gap-1">
            <label className="w-10 h-10 flex items-center justify-center hover:bg-slate-50 rounded-xl transition-all cursor-pointer group relative border border-transparent hover:border-slate-200">
                <div className="w-7 h-7 rounded-lg border-2 border-white shadow-lg transition-transform group-active:scale-90 ring-1 ring-black/5" style={{ backgroundColor: tempColor }} />
                <input type="color" value={tempColor} onChange={(e) => setTempColor(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
            </label>
            <button onClick={() => setTempIsBold(!tempIsBold)} className={cn("w-10 h-10 flex items-center justify-center hover:bg-slate-50 rounded-xl transition-all font-black text-lg", tempIsBold ? "bg-slate-100 text-[#00c4cc]" : "text-slate-600")}><Bold size={18}/></button>
            <button onClick={() => setTempIsItalic(!tempIsItalic)} className={cn("w-10 h-10 flex items-center justify-center hover:bg-slate-50 rounded-xl transition-all italic text-lg", tempIsItalic ? "bg-slate-100 text-[#00c4cc]" : "text-slate-600")}><Italic size={18}/></button>
            <button className="w-10 h-10 flex items-center justify-center hover:bg-slate-50 rounded-xl transition-all"><Underline size={18} className="text-slate-600"/></button>
        </div>

        <div className="ml-auto flex items-center gap-2">
            <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-sm">
                <button onClick={undo} className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg text-slate-400 hover:text-slate-800 transition-all active:scale-90"><Undo2 size={18}/></button>
                <button onClick={redo} className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg text-slate-400 hover:text-slate-800 transition-all active:scale-90"><RotateCcw size={18} className="rotate-180"/></button>
            </div>
            <div className="h-6 w-px bg-slate-200 mx-1" />
            <button onClick={() => setEditingPage(null)} className="w-10 h-10 flex items-center justify-center hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-xl transition-all active:scale-90 bg-slate-50 border border-slate-200 shadow-sm"><X size={20}/></button>
        </div>
    </div>
  );
};
