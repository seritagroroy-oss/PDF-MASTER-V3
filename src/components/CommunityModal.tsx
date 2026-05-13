import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Youtube, Facebook, MessageCircle, Users } from 'lucide-react';
import { cn } from '../utils/cn';

interface CommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommunityModal: React.FC<CommunityModalProps> = ({ isOpen, onClose }) => {
  const communities = [
    {
      id: 'youtube',
      name: 'Chaîne YouTube',
      description: 'Tutoriels, astuces et nouveautés en vidéo',
      icon: Youtube,
      color: 'text-red-500',
      bg: 'bg-red-50 dark:bg-red-500/10',
      border: 'border-red-200 dark:border-red-500/20',
      hover: 'hover:border-red-500 hover:shadow-red-500/20',
      url: 'https://youtube.com/@tuto-days?si=R_GECEs1HdShqYy1', // Lien réel ajouté
    },
    {
      id: 'facebook',
      name: 'Page Facebook',
      description: 'Suivez nos actualités et échangez avec nous',
      icon: Facebook,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-500/10',
      border: 'border-blue-200 dark:border-blue-500/20',
      hover: 'hover:border-blue-500 hover:shadow-blue-500/20',
      url: 'https://www.facebook.com/profile.php?id=61570719261860', // Lien réel ajouté
    },
    {
      id: 'whatsapp-channel',
      name: 'Chaîne WhatsApp',
      description: 'Recevez nos annonces importantes en direct',
      icon: MessageCircle,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      border: 'border-emerald-200 dark:border-emerald-500/20',
      hover: 'hover:border-emerald-500 hover:shadow-emerald-500/20',
      url: 'https://whatsapp.com/channel/0029VbCS9BhGufIn5JrmVc1R', // Lien réel ajouté
    },
    {
      id: 'whatsapp-group',
      name: 'Groupe WhatsApp',
      description: 'Rejoignez la discussion avec d\'autres utilisateurs',
      icon: Users,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      border: 'border-emerald-200 dark:border-emerald-500/20',
      hover: 'hover:border-emerald-500 hover:shadow-emerald-500/20',
      url: 'https://chat.whatsapp.com/Lvz6ScCPkOg6EjGlrX9pP9', // Lien réel ajouté
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 sm:px-0">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4 sm:px-8 sm:py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Users size={24} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-900 dark:text-white">Notre Communauté</h2>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Rejoignez-nous sur vos plateformes préférées</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            {communities.map((community) => {
              const Icon = community.icon;
              return (
                <a
                  key={community.id}
                  href={community.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "group relative flex items-start gap-4 rounded-3xl border p-5 transition-all duration-300 shadow-sm",
                    community.border,
                    community.hover,
                    "bg-white dark:bg-slate-800"
                  )}
                >
                  <div className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-110",
                    community.bg,
                    community.color
                  )}>
                    <Icon size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {community.name}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      {community.description}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
