import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface HelpModalProps {
  showHelp: boolean;
  setShowHelp: (val: boolean) => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ showHelp, setShowHelp }) => {
  if (!showHelp) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      onClick={() => setShowHelp(false)}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl max-w-lg w-full space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-display font-black">Aide & Raccourcis</h3>
          <button onClick={() => setShowHelp(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-widest">Général</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between"><span className="text-slate-500">Tout sélectionner</span> <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs font-mono">Ctrl+A</kbd></li>
              <li className="flex justify-between"><span className="text-slate-500">Exporter</span> <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs font-mono">Ctrl+S</kbd></li>
              <li className="flex justify-between"><span className="text-slate-500">Supprimer page</span> <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs font-mono">Suppr</kbd></li>
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-widest">Édition</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between"><span className="text-slate-500">Éditer texte</span> <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs font-mono">Ctrl+E</kbd></li>
              <li className="flex justify-between"><span className="text-slate-500">Zoom +/-</span> <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs font-mono">Ctrl +/-</kbd></li>
              <li className="flex justify-between"><span className="text-slate-500">Fermer modal</span> <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs font-mono">Echap</kbd></li>
            </ul>
          </div>
        </div>

        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
          <p className="text-xs text-indigo-600 dark:text-indigo-400 leading-relaxed">
            <strong>Astuce :</strong> Vous pouvez glisser-déposer les pages pour les réorganiser. Utilisez le mot de passe pour protéger vos exports.
          </p>
        </div>

        <button
          onClick={() => setShowHelp(false)}
          className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all"
        >
          Compris !
        </button>
      </motion.div>
    </motion.div>
  );
};
