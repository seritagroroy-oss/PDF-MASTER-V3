import React from 'react';
import { motion } from 'framer-motion';
import { Shapes, X, Square as SquareIcon, Circle, ArrowRight, CheckCircle2, Star, Heart, Check, PenTool, Lock, AlertCircle, MousePointer2, PlusCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ElementsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  visualTool: string;
  stampType: string;
  setVisualTool: (tool: any) => void;
  setStampType: (type: any) => void;
  setActiveEditMode: (mode: 'text' | 'visual') => void;
  triggerImageUpload: () => void;
}

export const ElementsSidebar: React.FC<ElementsSidebarProps> = ({ 
    isOpen, 
    onClose, 
    visualTool, 
    stampType, 
    setVisualTool, 
    setStampType, 
    setActiveEditMode, 
    triggerImageUpload 
}) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="absolute inset-y-0 right-0 w-80 lg:w-96 border-l border-slate-200 bg-white flex flex-col z-[105] shadow-2xl"
    >
      <div className="p-6 space-y-6 flex flex-col h-full bg-white overflow-y-auto no-scrollbar">
        <div className="flex justify-between items-center border-b border-slate-200 pb-4">
          <h4 className="font-black flex items-center gap-2 text-slate-900 tracking-tight">
            <Shapes size={20} className="text-indigo-600" /> Elements
          </h4>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
            <div className="space-y-4">
                <h5 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Formes</h5>
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { id: 'rect', label: 'Carre', icon: SquareIcon },
                        { id: 'circle', label: 'Cercle', icon: Circle },
                        { id: 'arrow', label: 'Fleche', icon: ArrowRight },
                    ].map(shape => (
                        <button 
                            key={shape.id}
                            onClick={() => { setVisualTool(shape.id as any); setActiveEditMode('visual'); onClose(); }}
                            className={cn(
                                "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all active:scale-95",
                                visualTool === shape.id ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-slate-50 border-transparent hover:border-slate-200 text-slate-600"
                            )}
                        >
                            <shape.icon size={24} />
                            <span className="text-[10px] font-bold">{shape.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <h5 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Symboles</h5>
                <div className="grid grid-cols-4 gap-2">
                    {[
                        { id: 'check', label: 'Valider', icon: CheckCircle2, color: 'text-emerald-500' },
                        { id: 'x', label: 'Refuser', icon: X, color: 'text-rose-500' },
                        { id: 'star', label: 'Etoile', icon: Star, color: 'text-amber-500' },
                        { id: 'heart', label: 'Coeur', icon: Heart, color: 'text-pink-500' },
                        { id: 'approved', label: 'Approuve', icon: Check, color: 'text-indigo-500' },
                        { id: 'sign', label: 'Signature', icon: PenTool, color: 'text-slate-700' },
                        { id: 'confidential', label: 'Prive', icon: Lock, color: 'text-red-600' },
                        { id: 'warning', label: 'Alerte', icon: AlertCircle, color: 'text-orange-500' },
                    ].map(sym => (
                        <button 
                            key={sym.id}
                            onClick={() => { 
                                setVisualTool('stamp'); 
                                setStampType(sym.id as any); 
                                setActiveEditMode('visual'); 
                                onClose(); 
                            }}
                            className={cn(
                                "flex flex-col items-center justify-center aspect-square rounded-xl border transition-all active:scale-95 group",
                                (visualTool === 'stamp' && stampType === sym.id) ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-slate-50 border-transparent hover:border-slate-200 text-slate-400 hover:text-slate-600"
                            )}
                            title={sym.label}
                        >
                            <sym.icon size={20} className={cn("transition-transform group-hover:scale-110", sym.color)} />
                            <span className="text-[10px] font-bold mt-1 truncate w-full text-center">{sym.label}</span>
                        </button>
                    ))}
                </div>
            </div>

             <div className="space-y-4">
                <h5 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Medias</h5>
                <button 
                    onClick={() => { triggerImageUpload(); onClose(); }}
                    className={cn(
                        "w-full flex items-center justify-between p-4 rounded-2xl border transition-all group",
                        visualTool === 'image' ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-slate-50 border-transparent hover:border-slate-200 text-slate-600"
                    )}
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                            <PlusCircle size={20} className="text-indigo-500" />
                        </div>
                        <span className="text-xs font-black">Ajouter une Image</span>
                    </div>
                    <div className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-bold">Nouveau</div>
                </button>
            </div>

             <div className="space-y-4">
                <h5 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Outils</h5>
                <button 
                    onClick={() => { setVisualTool('move'); onClose(); }}
                    className={cn(
                        "w-full flex items-center gap-3 p-4 rounded-2xl border transition-all",
                        visualTool === 'move' ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-slate-50 border-transparent hover:border-slate-200 text-slate-600"
                    )}
                >
                    <MousePointer2 size={20} />
                    <span className="text-xs font-bold">Selectionner</span>
                </button>
            </div>
        </div>
      </div>
    </motion.div>
  );
};
