import React from 'react';
import { Menu, Home, Sparkles, Eye, Undo2, RotateCcw } from 'lucide-react';
import { cn } from '../../utils/cn';

interface EditorHeaderProps {
  activeEditMode: string;
  setActiveEditMode: (mode: any) => void;
  rawFiles: any[];
  editingPage: any;
  isSidebarHidden: boolean;
  setIsSidebarHidden: (v: boolean) => void;
  undo: () => void;
  redo: () => void;
  savePageEdits: () => void;
  onBack: () => void;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  activeEditMode,
  setActiveEditMode,
  rawFiles,
  editingPage,
  isSidebarHidden,
  setIsSidebarHidden,
  undo,
  redo,
  savePageEdits,
  onBack
}) => {
  return (
    <header className="h-[56px] md:bg-gradient-to-r md:from-[#00c4cc] md:to-[#2ce3d3] bg-white flex items-center px-4 justify-between shrink-0 z-[110] shadow-md border-b border-slate-200 md:border-white/10 relative">
      <div className="flex items-center gap-3 md:gap-5">
          <div 
            onClick={onBack}
            className="w-9 h-9 bg-slate-100 md:bg-white/15 rounded-lg flex items-center justify-center hover:bg-slate-200 md:hover:bg-white/25 cursor-pointer transition-colors group"
          >
              <Menu size={20} className="text-slate-600 md:text-white group-active:scale-95 transition-transform hidden sm:block" />
              <Home size={20} className="text-[#00c4cc] md:text-white group-active:scale-95 transition-transform sm:hidden" />
          </div>
          
          <nav className="hidden md:flex items-center gap-6 text-white text-[14px] font-bold tracking-tight h-full">
              <button onClick={() => setActiveEditMode('text')} className={cn("hover:text-white transition-colors py-4 border-b-2 border-transparent", activeEditMode === 'text' && "border-white")}>Fichier</button>
              <button className="hover:text-white transition-colors flex items-center gap-2 group">
                <Sparkles size={16} className="fill-white/20 group-hover:rotate-12 transition-transform" /> Transformation magique
              </button>
          </nav>
      </div>
      
      <div className="absolute left-1/2 -translate-x-1/2 hidden lg:block">
          <div className="bg-black/10 px-5 py-1.5 rounded-full text-white/80 text-[12px] font-bold border border-white/10 shadow-inner max-w-[200px] truncate">
              {rawFiles[editingPage?.sourceFileIndex]?.name || "Document en cours"}
          </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 scrollbar-none">
          <button 
              onClick={() => setIsSidebarHidden(!isSidebarHidden)} 
              className={cn("p-2 rounded-xl transition-all hidden md:flex items-center gap-2 px-3", isSidebarHidden ? "bg-white text-indigo-600 shadow-lg" : "text-white/60 hover:text-white hover:bg-white/10")}
              title={isSidebarHidden ? "Afficher les menus" : "Masquer les menus (Mode Zen)"}
          >
              {isSidebarHidden ? <Eye size={18} /> : <Eye size={18} className="opacity-50" />}
              <span className="text-[11px] font-black uppercase tracking-tight">{isSidebarHidden ? "Voir Outils" : "Mode Zen"}</span>
          </button>

          <div className="hidden lg:flex items-center gap-2 mr-4 bg-black/10 p-1 rounded-xl">
              <button onClick={() => setActiveEditMode('text')} className={cn("px-4 py-1.5 rounded-lg text-xs font-black transition-all", activeEditMode === 'text' ? "bg-white text-slate-900 shadow-sm" : "text-white/60 hover:text-white")}>Texte</button>
              <button onClick={() => setActiveEditMode('visual')} className={cn("px-4 py-1.5 rounded-lg text-xs font-black transition-all", activeEditMode === 'visual' ? "bg-white text-slate-900 shadow-sm" : "text-white/60 hover:text-white")}>Visuel</button>
          </div>

          <div className="flex sm:hidden items-center gap-4 mr-1 text-slate-400">
              <div className="flex bg-slate-100 rounded-full p-0.5">
                 <button onClick={undo} className="p-2 hover:bg-white rounded-full transition-all active:scale-90"><Undo2 size={18}/></button>
                 <button onClick={redo} className="p-2 hover:bg-white rounded-full transition-all active:scale-90"><RotateCcw size={18} className="rotate-180"/></button>
              </div>
              <button onClick={savePageEdits} className="bg-[#00c4cc] text-white px-5 py-2 rounded-full text-xs font-black shadow-lg active:scale-95 transition-all">Terminé</button>
          </div>

          <button onClick={savePageEdits} className="hidden sm:block bg-white text-[#00c4cc] px-6 py-2 rounded-xl text-[13px] font-black shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] hover:scale-[1.03] active:scale-95 transition-all">
              Enregistrer
          </button>
      </div>
    </header>
  );
};
