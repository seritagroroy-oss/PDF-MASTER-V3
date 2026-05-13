import React from 'react';
import { motion } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';

interface PreviewModalProps {
  previewPage: any;
  onClose: () => void;
  isRenderingHighRes: boolean;
  highResUrl: string | null;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({ previewPage, onClose, isRenderingHighRes, highResUrl }) => {
  if (!previewPage) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-xl font-display font-bold text-slate-900">Aperçu détaillé - Page {previewPage.index + 1}</h3>
            <p className="text-sm text-slate-500">Visualisation haute résolution de la page.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-8 bg-slate-200 flex items-center justify-center">
          {isRenderingHighRes ? (
            <div className="flex flex-col items-center gap-4 text-slate-500">
              <Loader2 className="animate-spin" size={48} />
              <p className="font-bold">Rendu haute résolution...</p>
            </div>
          ) : highResUrl ? (
            <img
              src={highResUrl}
              alt="High resolution preview"
              className="max-w-full h-auto shadow-2xl rounded-sm bg-white"
            />
          ) : (
            <p className="text-red-500">Échec du rendu de l'aperçu.</p>
          )}
        </div>

        <div className="p-6 bg-white border-t border-slate-100 flex justify-center">
          <button
            onClick={onClose}
            className="px-10 py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all"
          >
            Fermer l'aperçu
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
