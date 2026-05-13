import React from 'react';
import { FileText, Search, PlusCircle, RefreshCw, CheckSquare, Square, Minus, Plus } from 'lucide-react';
import { cn } from '../../utils/cn';

interface PDFThumbnailsToolbarProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  addBlankPage: () => void;
  setIsReorderingMode: (val: boolean) => void;
  selectAll: () => void;
  selectedIds: Set<string>;
  thumbnailsCount: number;
  zoomLevel: number;
  setZoomLevel: (updater: number | ((prev: number) => number)) => void;
}

export const PDFThumbnailsToolbar: React.FC<PDFThumbnailsToolbarProps> = ({
  searchQuery,
  setSearchQuery,
  addBlankPage,
  setIsReorderingMode,
  selectAll,
  selectedIds,
  thumbnailsCount,
  zoomLevel,
  setZoomLevel
}) => {
  return (
    <div className="flex items-center justify-between gap-4">
      <h3 className="text-lg sm:text-xl font-display font-bold flex items-center gap-2">
        <FileText size={20} className="text-[#00c4cc]" />
        Vos designs
      </h3>

      <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-x-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 border-r border-slate-100 dark:border-slate-700 shrink-0">
          <Search size={14} className="text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-[10px] font-bold text-slate-600 dark:text-slate-300 outline-none w-24 sm:w-32"
          />
        </div>
        <button
          onClick={addBlankPage}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all shrink-0"
          title="Ajouter une page blanche"
        >
          <PlusCircle size={14} />
          Page Blanche
        </button>

        <button
          onClick={() => setIsReorderingMode(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all shrink-0"
          title="Ouvrir l'outil de réorganisation"
        >
          <RefreshCw size={14} />
          Réorganiser
        </button>

        <button
          onClick={selectAll}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all shrink-0"
          title="Tout sélectionner (Ctrl+A)"
        >
          {selectedIds.size === thumbnailsCount ? <CheckSquare size={14} /> : <Square size={14} />}
          {selectedIds.size === thumbnailsCount ? 'Tout désélectionner' : 'Tout sélectionner'}
        </button>

        <div className="hidden sm:block h-4 w-px bg-slate-100 dark:bg-slate-700 mx-1 shrink-0" />

        <div className="hidden sm:flex items-center shrink-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2 mr-1">Zoom</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoomLevel(prev => Math.max(0, prev - 1))}
                disabled={zoomLevel === 0}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="Zoom arrière (Ctrl+-)"
              >
                <Minus size={14} />
              </button>

              <div className="flex items-center bg-slate-50 dark:bg-slate-900 rounded-lg p-0.5 mx-1">
                {[0, 1, 2].map((level) => (
                  <button
                    key={level}
                    onClick={() => setZoomLevel(level)}
                    className={cn(
                      "w-7 h-7 rounded-md font-bold text-[10px] transition-all",
                      zoomLevel === level
                        ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm border border-slate-100 dark:border-slate-600"
                        : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    {level === 0 ? 'S' : level === 1 ? 'M' : 'L'}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setZoomLevel(prev => Math.min(2, prev + 1))}
                disabled={zoomLevel === 2}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="Zoom avant (Ctrl++)"
              >
                <Plus size={14} />
              </button>
            </div>
        </div>
      </div>
    </div>
  );
};
