import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface LoadingModalProps {
  isLoadingPages: boolean;
  loadingProgress: number;
}

export const LoadingModal: React.FC<LoadingModalProps> = ({ isLoadingPages, loadingProgress }) => {
  if (!isLoadingPages) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
    >
      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl max-w-sm w-full space-y-6 text-center">
        <div className="relative inline-block">
          <Loader2 className="animate-spin text-indigo-600" size={64} />
          <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-indigo-600">
            {loadingProgress}%
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Chargement du PDF</h3>
          <p className="text-sm text-slate-500">Nous préparons les pages pour l'édition...</p>
        </div>
        <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-indigo-600"
            initial={{ width: 0 }}
            animate={{ width: `${loadingProgress}%` }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
          />
        </div>
      </div>
    </motion.div>
  );
};
