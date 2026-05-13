import React from 'react';
import { MousePointer2, Shapes, Type, Pencil, Sparkles, MessageCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

interface MobileBottomNavProps {
  editingPage: any;
  setVisualTool: (val: string) => void;
  toggleElementsSidebar: () => void;
  toggleTextSidebar: () => void;
  toggleAISidebar: () => void;
  visualTool: string;
  setActiveEditMode: (val: string) => void;
  isAISidebarOpen: boolean;
  isElementsSidebarOpen: boolean;
  isTextSidebarOpen: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  editingPage,
  setVisualTool,
  toggleElementsSidebar,
  toggleTextSidebar,
  toggleAISidebar,
  visualTool,
  setActiveEditMode,
  isAISidebarOpen,
  isElementsSidebarOpen,
  isTextSidebarOpen
}) => {
  if (!editingPage) return null;

  const navItems = [
    { label: 'Aucun', icon: MousePointer2, action: () => setVisualTool('move') },
    { label: 'Éléments', icon: Shapes, action: toggleElementsSidebar },
    { label: 'Texte', icon: Type, action: toggleTextSidebar },
    { label: 'Pinceau', icon: Pencil, tool: 'pen' },
    { label: 'Gomme IA', icon: Sparkles, tool: 'magic-eraser' },
    { label: 'IA', icon: MessageCircle, action: toggleAISidebar },
  ];

  return (
    <div className="flex sm:hidden fixed bottom-0 left-0 right-0 h-[85px] bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 items-center justify-around px-2 z-[200] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] pb-4 rounded-t-[2rem]">
      {navItems.map(item => {
        const isActive = ((item as any).tool && visualTool === (item as any).tool) || 
                         (item.label === 'IA' && isAISidebarOpen) || 
                         (item.label === 'Éléments' && isElementsSidebarOpen) || 
                         (item.label === 'Texte' && isTextSidebarOpen) ||
                         (item.label === 'Aucun' && visualTool === 'move' && !isElementsSidebarOpen && !isTextSidebarOpen && !isAISidebarOpen);
        
        return (
          <button
            key={item.label}
            onClick={() => {
              if ((item as any).action) {
                (item as any).action();
              } else if ((item as any).tool) {
                setVisualTool((item as any).tool);
                setActiveEditMode('visual');
              }
            }}
            className={cn(
              "flex flex-col items-center gap-1.5 min-w-[60px] transition-all relative",
              isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400"
            )}
          >
            <div className={cn(
                "p-2 rounded-xl transition-all duration-300",
                isActive ? "bg-indigo-50 dark:bg-indigo-500/10 scale-110" : "bg-transparent"
            )}>
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className={cn(
                "text-[9px] font-black tracking-tight uppercase",
                isActive ? "opacity-100" : "opacity-60"
            )}>
                {item.label}
            </span>
            
            {isActive && (
                <div className="absolute -bottom-1 w-1 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
};
