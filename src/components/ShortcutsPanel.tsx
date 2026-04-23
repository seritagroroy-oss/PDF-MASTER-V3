import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard, Command } from 'lucide-react';

interface ShortcutsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  {
    category: 'Navigation',
    items: [
      { keys: ['Ctrl', 'Z'], desc: 'Annuler la dernière action' },
      { keys: ['Ctrl', 'Y'], desc: 'Rétablir' },
      { keys: ['Ctrl', 'S'], desc: 'Sauvegarder / Télécharger' },
      { keys: ['Escape'], desc: 'Fermer / Annuler' },
    ],
  },
  {
    category: 'Éditeur visuel',
    items: [
      { keys: ['P'], desc: 'Outil Stylo' },
      { keys: ['E'], desc: 'Outil Gomme' },
      { keys: ['T'], desc: 'Outil Texte' },
      { keys: ['R'], desc: 'Outil Rectangle' },
      { keys: ['C'], desc: 'Outil Cercle' },
      { keys: ['A'], desc: 'Outil Flèche' },
      { keys: ['M'], desc: 'Mode Déplacement' },
      { keys: ['+'], desc: 'Augmenter la taille du pinceau' },
      { keys: ['-'], desc: 'Réduire la taille du pinceau' },
    ],
  },
  {
    category: 'Texte',
    items: [
      { keys: ['Ctrl', 'B'], desc: 'Mettre en gras' },
      { keys: ['Ctrl', 'I'], desc: 'Mettre en italique' },
      { keys: ['Enter'], desc: 'Confirmer le texte' },
      { keys: ['Shift', 'Enter'], desc: 'Nouvelle ligne dans le texte' },
    ],
  },
  {
    category: 'Pages',
    items: [
      { keys: ['←', '→'], desc: 'Page précédente / suivante' },
      { keys: ['Ctrl', '+'], desc: 'Zoom avant' },
      { keys: ['Ctrl', '-'], desc: 'Zoom arrière' },
      { keys: ['Ctrl', '0'], desc: 'Réinitialiser le zoom' },
    ],
  },
];

const Key: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 bg-white border-2 border-b-4 border-slate-200 rounded-lg text-[11px] font-black text-slate-700 font-mono shadow-sm">
    {children}
  </kbd>
);

export const ShortcutsPanel: React.FC<ShortcutsPanelProps> = ({ isOpen, onClose }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between p-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-slate-900 text-white rounded-xl flex items-center justify-center">
                <Keyboard size={20} />
              </div>
              <div>
                <h2 className="text-lg font-display font-bold text-slate-900">Raccourcis clavier</h2>
                <p className="text-xs text-slate-400">Devenez plus rapide avec ces commandes</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all">
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {SHORTCUTS.map(section => (
              <div key={section.category}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">{section.category}</p>
                <div className="space-y-2">
                  {section.items.map(item => (
                    <div key={item.desc} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                      <span className="text-sm font-medium text-slate-600">{item.desc}</span>
                      <div className="flex items-center gap-1.5">
                        {item.keys.map((k, i) => (
                          <React.Fragment key={k}>
                            <Key>{k}</Key>
                            {i < item.keys.length - 1 && <span className="text-slate-300 text-xs font-bold">+</span>}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="shrink-0 p-4 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Appuyez sur <Key>?</Key> n'importe quand pour afficher ce panneau</p>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);
