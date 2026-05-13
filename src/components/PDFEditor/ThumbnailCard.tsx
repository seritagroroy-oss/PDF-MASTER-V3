import React from 'react';
import { Check, RotateCw, Trash2, Type, Eye } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ThumbnailCardProps {
  thumbnail: any;
  idx: number;
  selectedIds: Set<string>;
  toggleSelection: (id: string, force?: boolean) => void;
  handleDoubleClick: (thumbnail: any) => void;
  removeThumbnail: (id: string) => void;
  rotatePage: (id: string) => void;
  openPreview: (thumbnail: any) => void;
  getThumbnailPadding: () => string;
}

export const ThumbnailCard: React.FC<ThumbnailCardProps> = ({
  thumbnail,
  idx,
  selectedIds,
  toggleSelection,
  handleDoubleClick,
  removeThumbnail,
  rotatePage,
  openPreview,
  getThumbnailPadding
}) => {
  return (
    <div
      onDoubleClick={() => handleDoubleClick(thumbnail)}
      onClick={(e) => {
        if (e.ctrlKey || e.metaKey) {
          toggleSelection(thumbnail.id, true);
        }
      }}
      className="relative group transition-transform"
    >
      <div className={cn(
        "relative aspect-[3/4] bg-white dark:bg-slate-900 rounded-xl border-2 overflow-hidden shadow-sm transition-all",
        selectedIds.has(thumbnail.id) ? "border-indigo-500 ring-2 ring-indigo-100 dark:ring-indigo-900/20" :
          thumbnail.modifiedText ? "border-amber-400 ring-2 ring-amber-100 dark:ring-amber-900/20" : "border-slate-200 dark:border-slate-700 group-hover:border-indigo-400"
      )}>
        <div
          className="w-full h-full transition-transform duration-300"
          style={{ transform: `rotate(${thumbnail.rotation || 0}deg)` }}
        >
          <img
            src={thumbnail.url}
            alt={`Page ${idx + 1}`}
            className={cn("w-full h-full object-contain pointer-events-none", getThumbnailPadding())}
          />
        </div>

        {/* Selection Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleSelection(thumbnail.id);
          }}
          className={cn(
            "absolute top-2 right-2 w-6 h-6 rounded-md flex items-center justify-center transition-all z-30",
            selectedIds.has(thumbnail.id)
              ? "bg-indigo-600 text-white shadow-lg"
              : "bg-white/80 dark:bg-slate-800/80 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-white dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600"
          )}
        >
          {selectedIds.has(thumbnail.id) ? <Check size={14} /> : <div className="w-3 h-3 border-2 border-slate-300 dark:border-slate-500 rounded-sm" />}
        </button>

        {thumbnail.modifiedText && (
          <div className="absolute inset-0 bg-amber-500/10 flex items-center justify-center pointer-events-none">
            <div className="bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg">
              Texte modifié
            </div>
          </div>
        )}

        <div className="absolute bottom-2 left-2 w-6 h-6 bg-slate-900/80 text-white text-[10px] font-bold flex items-center justify-center rounded-md backdrop-blur-sm">
          {idx + 1}
        </div>

        <div className="absolute bottom-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              rotatePage(thumbnail.id);
            }}
            className="p-1.5 bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 rounded-md shadow-lg hover:bg-indigo-50 dark:hover:bg-slate-600"
            title="Rotation"
          >
            <RotateCw size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeThumbnail(thumbnail.id);
            }}
            className="p-1.5 bg-rose-500 text-white rounded-md hover:bg-rose-600 shadow-lg"
            title="Supprimer la page (Suppr)"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDoubleClick(thumbnail);
            }}
            className="p-1.5 bg-amber-500 text-white rounded-md hover:bg-amber-600 shadow-lg"
            title="Éditer le texte (Ctrl+E / Double-clic)"
          >
            <Type size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openPreview(thumbnail);
            }}
            className="p-1.5 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 shadow-lg"
            title="Aperçu détaillé"
          >
            <Eye size={14} />
          </button>
        </div>
      </div>
      <p className="mt-2 text-center text-xs font-bold text-slate-400">Page {thumbnail.index + 1}</p>
    </div>
  );
};
