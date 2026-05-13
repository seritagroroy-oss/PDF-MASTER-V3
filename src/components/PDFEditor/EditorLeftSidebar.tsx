import React from 'react';
import { LayoutGrid, Shapes, Type, Upload, Pencil, Eraser, Sparkles, Folder, Grid } from 'lucide-react';
import { cn } from '../../utils/cn';

interface EditorLeftSidebarProps {
  isSidebarHidden: boolean;
  visualTool: string;
  isAISidebarOpen: boolean;
  isElementsSidebarOpen: boolean;
  isTextSidebarOpen: boolean;
  toggleElementsSidebar: () => void;
  toggleTextSidebar: () => void;
  toggleAISidebar: () => void;
  setVisualTool: (tool: any) => void;
  setActiveEditMode: (mode: any) => void;
  setIsElementsSidebarOpen: (v: boolean) => void;
  setIsAISidebarOpen: (v: boolean) => void;
}

export const EditorLeftSidebar: React.FC<EditorLeftSidebarProps> = ({
  isSidebarHidden,
  visualTool,
  isAISidebarOpen,
  isElementsSidebarOpen,
  isTextSidebarOpen,
  toggleElementsSidebar,
  toggleTextSidebar,
  toggleAISidebar,
  setVisualTool,
  setActiveEditMode,
  setIsElementsSidebarOpen,
  setIsAISidebarOpen
}) => {
  return (
    <aside className={cn(
      "hidden sm:flex w-[82px] bg-[#1d1e21] flex-col items-center py-6 gap-8 z-[100] shrink-0 border-r border-white/5 shadow-2xl relative overflow-y-auto no-scrollbar transition-all duration-300",
      isSidebarHidden && "sm:hidden"
    )}>
        {[
            { label: 'Modèles', icon: LayoutGrid, action: () => alert("Fonctionnalité Modèles de page bientôt disponible !") },
            { label: 'Éléments', icon: Shapes, action: toggleElementsSidebar },
            { label: 'Texte', icon: Type, action: toggleTextSidebar },
            { label: 'Image', icon: Upload },
            { label: 'Pinceau', icon: Pencil, tool: 'pen' },
            { label: 'Gomme', icon: Eraser, tool: 'eraser' },
            { label: 'Gomme IA', icon: Sparkles, tool: 'magic-eraser' },
            { label: 'Projets', icon: Folder },
            { label: 'Assistant', icon: Sparkles, color: 'cyan', action: toggleAISidebar },
        ].map(item => (
            <button 
                key={item.label}
                onClick={() => {
                    if ((item as any).action) {
                      (item as any).action();
                    } else if ((item as any).tool) {
                      setVisualTool((item as any).tool as any); 
                      setActiveEditMode('visual');
                      setIsElementsSidebarOpen(false);
                      setIsAISidebarOpen(false);
                    } else if (item.label === 'Assistant') {
                      setIsAISidebarOpen(!isAISidebarOpen);
                      setIsElementsSidebarOpen(false);
                    }
                }}
                className={cn(
                    "flex flex-col items-center gap-1.5 w-full transition-all group relative px-1", 
                    (((item as any).tool && visualTool === (item as any).tool) || (item.label === 'Assistant' && isAISidebarOpen) || (item.label === 'Éléments' && isElementsSidebarOpen) || (item.label === 'Texte' && isTextSidebarOpen)) ? "text-white" : "text-white/50 hover:text-white/90"
                )}
            >
                <div className={cn(
                    "p-3 rounded-2xl transition-all group-hover:bg-white/10 group-active:scale-90",
                    (((item as any).tool && visualTool === (item as any).tool) || (item.label === 'Assistant' && isAISidebarOpen) || (item.label === 'Éléments' && isElementsSidebarOpen) || (item.label === 'Texte' && isTextSidebarOpen)) && "bg-white/15 text-white shadow-inner"
                )}>
                    <item.icon size={26} className={cn("transition-transform", (item.label === 'Assistant' || item.label === 'Gomme IA') && "text-cyan-400")} />
                </div>
                <span className="text-[11px] font-bold tracking-tight opacity-90">{item.label}</span>
            </button>
        ))}
        <div className="mt-auto pb-6">
             <button className="text-white/40 hover:text-white transition-all p-3 hover:bg-white/10 rounded-2xl group"><Grid size={24} className="group-hover:rotate-90 transition-transform"/></button>
        </div>
    </aside>
  );
};
