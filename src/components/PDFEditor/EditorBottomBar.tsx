import React from 'react';
import { FileText, Layout, RotateCw, Settings, Minus, Plus } from 'lucide-react';

interface EditorBottomBarProps {
  editorZoom: number;
  setEditorZoom: (updater: (prev: number) => number) => void;
  editingPage: any;
}

export const EditorBottomBar: React.FC<EditorBottomBarProps> = ({
  editorZoom,
  setEditorZoom,
  editingPage
}) => {
  return (
    <footer className="hidden md:flex h-[44px] bg-white border-t border-slate-200 items-center justify-between px-6 shrink-0 z-50 text-[12px] font-bold text-slate-500 shadow-[0_-2px_10px_rgba(0,0,0,0.03)] focus-within:ring-0">
        <div className="flex items-center gap-8">
            <button className="flex items-center gap-2 hover:text-slate-900 transition-colors group"><FileText size={16} className="group-hover:scale-110 transition-transform" /> Notes</button>
            <button className="flex items-center gap-2 hover:text-slate-900 transition-colors group"><Layout size={16} className="group-hover:scale-110 transition-transform"/> Plan</button>
            <button className="flex items-center gap-2 hover:text-slate-900 transition-colors group"><RotateCw size={16} className="opacity-80 group-hover:rotate-180 transition-all duration-500"/> Minuteur</button>
        </div>
        
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-4 bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100 shadow-inner">
               <button onClick={() => setEditorZoom(prev => Math.max(0.1, prev - 0.1))} className="hover:text-slate-900 transition-colors active:scale-75"><Minus size={16} /></button>
               <div className="w-32 h-1.5 bg-slate-200 rounded-full relative group cursor-pointer overflow-hidden">
                   <div className="absolute top-0 left-0 h-full bg-[#00c4cc] transition-all duration-300 shadow-[0_0_8px_#00c4cc]" style={{ width: `${(editorZoom / 3) * 100}%` }} />
               </div>
               <button onClick={() => setEditorZoom(prev => Math.min(3, prev + 0.1))} className="hover:text-slate-900 transition-colors active:scale-75"><Plus size={16} /></button>
               <span className="w-14 text-center text-slate-900 font-black">{Math.round(editorZoom * 100)}%</span>
           </div>
           <div className="flex items-center gap-4 border-l border-slate-200 pl-6 ml-2">
               <button className="hover:text-slate-900 hover:rotate-45 transition-transform"><Settings size={18} /></button>
               <button className="hover:text-slate-900 active:rotate-180 transition-transform"><RotateCw size={18} /></button>
               <button className="bg-slate-900 text-white w-20 py-1.5 rounded-lg hover:bg-slate-800 transition-colors shadow-lg active:scale-95">Page: {editingPage.index + 1}</button>
           </div>
        </div>
    </footer>
  );
};
