import React from 'react';
import { Minus, Plus, GripVertical, Pencil } from 'lucide-react';
import { cn } from '../../utils/cn';

interface MobileFloatingToolbarProps {
  editorZoom: number;
  setEditorZoom: (updater: (prev: number) => number) => void;
  visualTool: string;
  setVisualTool: (val: any) => void;
  brushSize: number;
  setBrushSize: (updater: (prev: number) => number) => void;
  tempColor: string;
  setTempColor: (val: string) => void;
}

export const MobileFloatingToolbar: React.FC<MobileFloatingToolbarProps> = ({
  editorZoom,
  setEditorZoom,
  visualTool,
  setVisualTool,
  brushSize,
  setBrushSize,
  tempColor,
  setTempColor
}) => {
  return (
    <div className="md:hidden flex overflow-x-auto no-scrollbar px-4 py-3 gap-3 bg-white/90 backdrop-blur-md border-t border-slate-100 z-50">
         {/* Zoom Controls */}
         <div className="flex items-center gap-2 bg-slate-100 rounded-full px-3 py-1.5 shadow-inner shrink-0">
             <button onClick={() => setEditorZoom(prev => Math.max(0.1, prev - 0.1))} className="text-slate-400 p-1"><Minus size={16}/></button>
             <span className="text-[10px] font-black text-slate-800 w-8 text-center">{Math.round(editorZoom * 100)}%</span>
             <button onClick={() => setEditorZoom(prev => Math.min(3, prev + 0.1))} className="text-slate-400 p-1"><Plus size={16}/></button>
         </div>

         {/* Move Tool */}
         <button 
            onClick={() => setVisualTool('move')} 
            className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all", visualTool === 'move' ? "bg-[#00c4cc] text-white shadow-lg" : "bg-slate-100 text-slate-500")}
         >
            <GripVertical size={20} />
         </button>

         {visualTool === 'pen' || visualTool === 'eraser' ? (
             <div className="flex items-center gap-3 bg-slate-100 rounded-full px-4 py-2 shadow-inner w-full justify-between min-w-[150px]">
                 <div className="flex items-center gap-4">
                     <button onClick={() => setBrushSize(prev => Math.max(1, prev - 1))} className="text-slate-400"><Minus size={18}/></button>
                     <span className="text-xs font-black text-slate-800 w-6 text-center">{brushSize}</span>
                     <button onClick={() => setBrushSize(prev => Math.min(50, prev + 1))} className="text-slate-400"><Plus size={18}/></button>
                 </div>
                 <label className="flex items-center gap-2">
                     <div className="w-6 h-6 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: tempColor }} />
                     <input type="color" className="hidden" value={tempColor} onChange={(e) => setTempColor(e.target.value)} />
                 </label>
             </div>
         ) : (
             <button onClick={() => setVisualTool('pen')} className="bg-indigo-600 text-white w-full py-2.5 rounded-full text-xs font-black flex items-center justify-center gap-2 shadow-lg shrink-0 px-6"><Pencil size={16}/> Dessiner</button>
         )}
    </div>
  );
};
