import React from 'react';
import { motion } from 'framer-motion';
import { Type, X, FileText, PenTool, MousePointer2, PlusCircle as AddIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface TextSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  setVisualTool: (tool: any) => void;
  setActiveEditMode: (mode: 'text' | 'visual') => void;
  setSelectedTextModel: (model: any) => void;
}

export const TextSidebar: React.FC<TextSidebarProps> = ({ isOpen, onClose, setVisualTool, setActiveEditMode, setSelectedTextModel }) => {
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
            <Type size={20} className="text-indigo-600" /> Modèles de Texte
          </h4>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-8">
            <div className="space-y-4">
                <h5 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Styles de base</h5>
                <p className="text-[10px] text-slate-500 font-medium bg-slate-50 p-3 rounded-xl">Choisissez un style puis cliquez sur le document pour l'ajouter.</p>
                <div className="flex flex-col gap-3">
                    {[
                        { id: 'h1', label: 'Grand Titre', style: 'font-black text-2xl', size: 36, bold: true, text: 'Nouveau Titre' },
                        { id: 'h2', label: 'Sous-titre', style: 'font-bold text-xl', size: 24, bold: true, text: 'Sous-titre' },
                        { id: 'p', label: 'Corps de texte', style: 'font-medium text-sm', size: 16, text: 'Saisissez votre texte ici...' },
                        { id: 'small', label: 'Petite légende', style: 'font-medium text-[10px] text-slate-500', size: 12, text: 'Notes de bas de page' },
                    ].map(model => (
                        <button 
                            key={model.id}
                            onClick={() => {
                                setVisualTool('text');
                                setActiveEditMode('visual');
                                setSelectedTextModel({
                                    text: model.text,
                                    fontSize: model.size,
                                    isBold: !!model.bold,
                                    isItalic: false,
                                    isHighlighted: false
                                });
                                onClose();
                            }}
                            className="w-full text-left p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-slate-50 transition-all group"
                        >
                          <div className="flex justify-between items-center">
                            <span className={cn("block text-slate-900", model.style)}>{model.label}</span>
                            <AddIcon size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                          </div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <h5 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Modèles avancés</h5>
                <div className="grid grid-cols-1 gap-3">
                     <button 
                        onClick={() => {
                            setVisualTool('text');
                            setActiveEditMode('visual');
                            setSelectedTextModel({
                                text: 'Note importante...',
                                fontSize: 14,
                                isBold: true,
                                isItalic: false,
                                isHighlighted: true
                            });
                            onClose();
                        }}
                        className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl hover:bg-amber-100 transition-all group"
                     >
                         <div className="w-10 h-10 bg-amber-200 rounded-xl flex items-center justify-center text-amber-700 shadow-sm">
                             <FileText size={20} />
                         </div>
                         <div className="flex flex-col text-left">
                             <span className="text-xs font-black text-amber-900">Note surlignée</span>
                             <span className="text-[9px] font-bold text-amber-600">Texte avec fond jaune</span>
                         </div>
                     </button>
                     
                     <button 
                        onClick={() => {
                            setVisualTool('text');
                            setActiveEditMode('visual');
                            onClose();
                            setSelectedTextModel({
                                text: 'Signature ici',
                                fontSize: 18,
                                isBold: false,
                                isItalic: true,
                                isHighlighted: false
                            });
                        }}
                        className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl hover:bg-indigo-100 transition-all group"
                    >
                         <div className="w-10 h-10 bg-indigo-200 rounded-xl flex items-center justify-center text-indigo-700 shadow-sm">
                             <PenTool size={20} />
                         </div>
                         <div className="flex flex-col text-left">
                             <span className="text-xs font-black text-indigo-900">Zone de signature</span>
                             <span className="text-[9px] font-bold text-indigo-600">Style cursif</span>
                         </div>
                     </button>
                </div>
            </div>
        </div>

        <div className="mt-auto p-4 bg-slate-50 rounded-2xl border border-slate-100">
             <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-indigo-600 text-white rounded-lg"><MousePointer2 size={16}/></div>
                <span className="text-[11px] font-black text-slate-900">Astuce</span>
             </div>
             <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Une fois l'élément placé, vous pourrez encore modifier son contenu en tapant directement.</p>
        </div>
      </div>
    </motion.div>
  );
};
