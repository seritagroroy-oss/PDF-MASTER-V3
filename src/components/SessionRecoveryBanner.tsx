/**
 * SessionRecoveryBanner — Bannière élégante de récupération de session.
 *
 * Affichée lorsqu'une session précédente est détectée.
 * L'utilisateur peut choisir de reprendre ou d'ignorer.
 * Disparaît automatiquement après 30 secondes si ignorée.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, FileText, RotateCcw, X, Zap, AlertCircle } from 'lucide-react';
import { SessionMeta } from '../hooks/useSessionPersistence';

interface SessionRecoveryBannerProps {
  meta: SessionMeta;
  onRestore: () => void;
  onDismiss: () => void;
  isRestoring?: boolean;
}

const AUTO_DISMISS_SECONDS = 30;

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `il y a ${seconds} seconde${seconds > 1 ? 's' : ''}`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} heure${hours > 1 ? 's' : ''}`;
  return `il y a plus d'un jour`;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 o';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export const SessionRecoveryBanner: React.FC<SessionRecoveryBannerProps> = ({
  meta,
  onRestore,
  onDismiss,
  isRestoring = false,
}) => {
  const [countdown, setCountdown] = useState(AUTO_DISMISS_SECONDS);
  const [visible, setVisible] = useState(true);

  // Compte à rebours de fermeture automatique
  useEffect(() => {
    if (isRestoring) return;
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRestoring]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setTimeout(onDismiss, 350); // Laisser l'animation de sortie se terminer
  }, [onDismiss]);

  const handleRestore = useCallback(() => {
    onRestore();
  }, [onRestore]);

  const totalFileSize = meta.fileSizes.reduce((sum, s) => sum + s, 0);
  const progressPct = (countdown / AUTO_DISMISS_SECONDS) * 100;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -80, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -60, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[999] w-full max-w-lg px-4"
          role="alert"
          aria-live="polite"
        >
          <div className="relative overflow-hidden rounded-2xl border border-indigo-200/60 bg-white/95 shadow-2xl shadow-indigo-500/10 backdrop-blur-xl">
            {/* Barre de progression du compte à rebours */}
            {!isRestoring && (
              <div
                className="absolute top-0 left-0 h-0.5 bg-gradient-to-r from-indigo-400 to-cyan-400 transition-all duration-1000"
                style={{ width: `${progressPct}%` }}
              />
            )}

            {/* Gradient décoratif */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/60 via-transparent to-cyan-50/30 pointer-events-none" />

            <div className="relative p-4 sm:p-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 p-2 rounded-xl bg-indigo-100 text-indigo-600">
                    <Zap size={18} className="fill-indigo-600" />
                  </div>
                  <div>
                    <p className="font-black text-slate-900 text-sm sm:text-base leading-tight">
                      Session récupérée
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Clock size={11} />
                      {formatTimeAgo(meta.timestamp)}
                    </p>
                  </div>
                </div>

                {/* Bouton fermeture + compteur */}
                <button
                  onClick={handleDismiss}
                  disabled={isRestoring}
                  className="flex-shrink-0 flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 transition-colors group"
                  aria-label="Ignorer et fermer"
                >
                  {!isRestoring && (
                    <span className="font-mono tabular-nums bg-slate-100 group-hover:bg-slate-200 px-1.5 py-0.5 rounded-md transition-colors">
                      {countdown}s
                    </span>
                  )}
                  <X size={16} className="group-hover:rotate-90 transition-transform duration-200" />
                </button>
              </div>

              {/* Infos session */}
              <div className="flex flex-wrap gap-2 mb-4">
                {meta.fileNames.map((name, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 max-w-[200px]"
                  >
                    <FileText size={12} className="text-indigo-500 flex-shrink-0" />
                    <span className="truncate">{name}</span>
                  </div>
                ))}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-3 mb-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="font-black text-slate-800">{meta.pageCount}</span>
                  {' '}page{meta.pageCount > 1 ? 's' : ''}
                </span>
                {meta.modifiedPages > 0 && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span className="flex items-center gap-1 text-indigo-600 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                      {meta.modifiedPages} modifiée{meta.modifiedPages > 1 ? 's' : ''}
                    </span>
                  </>
                )}
                {totalFileSize > 0 && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span>{formatBytes(totalFileSize)}</span>
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  id="session-recovery-restore-btn"
                  onClick={handleRestore}
                  disabled={isRestoring}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-sm font-bold px-4 py-2.5 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-70 disabled:cursor-wait"
                >
                  {isRestoring ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Restauration...
                    </>
                  ) : (
                    <>
                      <RotateCcw size={15} />
                      Reprendre ma session
                    </>
                  )}
                </button>

                <button
                  id="session-recovery-dismiss-btn"
                  onClick={handleDismiss}
                  disabled={isRestoring}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:scale-95 text-slate-600 text-sm font-semibold px-4 py-2.5 transition-all disabled:opacity-50"
                >
                  Ignorer
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ─── Indicateur d'auto-save discret ──────────────────────────────────────────

interface AutoSaveIndicatorProps {
  isSaving: boolean;
  lastSavedAt: Date | null;
}

export const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({
  isSaving,
  lastSavedAt,
}) => {
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (lastSavedAt) {
      setShowSaved(true);
      const t = setTimeout(() => setShowSaved(false), 3000);
      return () => clearTimeout(t);
    }
  }, [lastSavedAt]);

  return (
    <AnimatePresence mode="wait">
      {(isSaving || showSaved) && (
        <motion.div
          key={isSaving ? 'saving' : 'saved'}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-1.5 text-[11px] font-semibold"
        >
          {isSaving ? (
            <span className="flex items-center gap-1 text-slate-400">
              <div className="w-2.5 h-2.5 border border-slate-400 border-t-transparent rounded-full animate-spin" />
              Sauvegarde...
            </span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-600">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              Sauvegardé
            </span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
