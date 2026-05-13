import React from 'react';
import { motion, Reorder } from 'framer-motion';
import { RefreshCw, GripVertical } from 'lucide-react';

interface ReorderModalProps {
  isReorderingMode: boolean;
  setIsReorderingMode: (v: boolean) => void;
  thumbnails: any[];
  setThumbnails: (t: any[]) => void;
}

export const ReorderModal: React.FC<ReorderModalProps> = ({ isReorderingMode, setIsReorderingMode, thumbnails, setThumbnails }) => {
  if (!isReorderingMode) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] flex flex-col bg-slate-100 dark:bg-slate-900"
    >
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm shrink-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <div className="hidden sm:flex p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <RefreshCw size={20} />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg">Réorganiser les pages</h2>
            <p className="text-[10px] sm:text-xs text-slate-500">Glissez-déposez les pages pour changer leur ordre</p>
          </div>
        </div>
        <button
          onClick={() => setIsReorderingMode(false)}
          className="px-4 sm:px-6 py-2 bg-indigo-600 text-white text-sm sm:text-base font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md shrink-0"
        >
          Terminer
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="max-w-2xl mx-auto pb-20">
          <Reorder.Group
            axis="y"
            values={thumbnails}
            onReorder={setThumbnails}
            className="flex flex-col gap-3"
          >
            {thumbnails.map((t, idx) => (
              <Reorder.Item
                key={t.id}
                value={t}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-2 sm:p-3 flex items-center gap-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow select-none"
                whileDrag={{
                  scale: 1.02,
                  zIndex: 50,
                  boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)"
                }}
              >
                <div className="text-slate-400 p-2 hover:text-indigo-500 transition-colors">
                  <GripVertical size={20} />
                </div>
                
                <div className="w-12 h-16 sm:w-16 sm:h-20 bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center relative">
                  <img src={t.url} className="max-w-full max-h-full object-contain pointer-events-none" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base">
                    Page {idx + 1}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                    {t.modifiedText ? "Texte modifié" : "Fichier original"}
                  </p>
                </div>
                
                <div className="flex gap-2 mr-2">
                   <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-400">
                     #{idx + 1}
                   </div>
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>
      </div>
    </motion.div>
  );
};
