import React from 'react';
import { motion } from 'framer-motion';
import { Combine, Scissors, Minimize2, Layout, FileImage, Shield, Layers, Clock, TrendingUp, User, LogOut, Settings, MessageSquare, ScanText, Hash, Package } from 'lucide-react';
import { getUserActivity, type RecentFile } from '../hooks/useUserStorage';
import { cn } from '../utils/cn';

interface UserDashboardProps {
  user: { name: string; email: string };
  onNavigate: (tool: string) => void;
  onLogout: () => void;
}

const TOOL_META: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  merge:    { icon: Combine,    color: 'text-indigo-600',  bg: 'bg-indigo-100',  label: 'Fusionner' },
  edit:     { icon: Scissors,   color: 'text-rose-600',    bg: 'bg-rose-100',    label: 'Modifier' },
  compress: { icon: Minimize2,  color: 'text-emerald-600', bg: 'bg-emerald-100', label: 'Compresser' },
  watermark:{ icon: Layout,     color: 'text-amber-600',   bg: 'bg-amber-100',   label: 'Filigrane' },
  convert:  { icon: FileImage,  color: 'text-sky-600',     bg: 'bg-sky-100',     label: 'Convertir' },
  split:    { icon: Layers,     color: 'text-violet-600',  bg: 'bg-violet-100',  label: 'Diviser' },
  protect:  { icon: Shield,     color: 'text-red-600',     bg: 'bg-red-100',     label: 'Protéger' },
  chat:     { icon: MessageSquare, color: 'text-pink-600', bg: 'bg-pink-100',    label: 'Chat IA' },
  ocr:      { icon: ScanText,   color: 'text-teal-600',    bg: 'bg-teal-100',    label: 'Scanner' },
  numbering:{ icon: Hash,       color: 'text-fuchsia-600', bg: 'bg-fuchsia-100', label: 'Numéros' },
  batch:    { icon: Package,    color: 'text-indigo-700',  bg: 'bg-indigo-200',  label: 'Lots' },
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.round((now.getTime() - d.getTime()) / 60000);
  if (diff < 1)  return "À l'instant";
  if (diff < 60) return `Il y a ${diff} min`;
  if (diff < 1440) return `Il y a ${Math.round(diff / 60)}h`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

export const UserDashboard: React.FC<UserDashboardProps> = ({ user, onNavigate, onLogout }) => {
  const activity = getUserActivity(user.email);
  const recentFiles = activity.recentFiles.slice(0, 8);

  // Count by tool type
  const toolUsage = recentFiles.reduce<Record<string, number>>((acc, f) => {
    acc[f.type] = (acc[f.type] || 0) + 1;
    return acc;
  }, {});
  const topTool = Object.entries(toolUsage).sort((a, b) => b[1] - a[1])[0];

  const quickTools = Object.entries(TOOL_META);

  return (
    <motion.div
      key="dashboard"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Welcome hero */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-600 to-violet-700 p-8 text-white">
        <div className="absolute right-0 top-0 h-64 w-64 opacity-10">
          <User size={256} />
        </div>
        <div className="relative">
          <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-black border border-white/30 mb-4">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <h1 className="text-3xl font-display font-bold">Bonjour, {user.name.split(' ')[0]} 👋</h1>
          <p className="mt-1 text-indigo-200 text-sm">{user.email}</p>
          <div className="flex gap-6 mt-6">
            <div>
              <p className="text-2xl font-black">{activity.totalFiles}</p>
              <p className="text-xs text-indigo-200 font-semibold">Fichiers traités</p>
            </div>
            <div className="w-px bg-white/20" />
            <div>
              <p className="text-2xl font-black">{recentFiles.length}</p>
              <p className="text-xs text-indigo-200 font-semibold">Sessions récentes</p>
            </div>
            {topTool && (
              <>
                <div className="w-px bg-white/20" />
                <div>
                  <p className="text-2xl font-black">{TOOL_META[topTool[0]]?.label || topTool[0]}</p>
                  <p className="text-xs text-indigo-200 font-semibold">Outil favori</p>
                </div>
              </>
            )}
          </div>
        </div>
        <button onClick={onLogout} className="absolute top-5 right-5 flex items-center gap-1.5 text-xs font-bold text-white/70 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-all">
          <LogOut size={12} />Déconnexion
        </button>
      </div>

      {/* Quick access tools */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">Accès rapide</p>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
          {quickTools.map(([id, meta]) => {
            const Icon = meta.icon;
            return (
              <motion.button
                key={id}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onNavigate(id)}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all"
              >
                <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', meta.bg)}>
                  <Icon size={20} className={meta.color} />
                </div>
                <span className="text-[10px] font-bold text-slate-500">{meta.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <div className="flex items-center justify-between mb-4 px-1">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Activité récente</p>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Clock size={12} />
            {activity.lastSeen ? `Dernière connexion ${formatDate(activity.lastSeen)}` : ''}
          </div>
        </div>

        {recentFiles.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-12 rounded-[2rem] bg-slate-50 border border-slate-100">
            <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center">
              <TrendingUp size={28} className="text-slate-300" />
            </div>
            <div className="text-center">
              <p className="font-bold text-slate-500">Pas encore d'activité</p>
              <p className="text-sm text-slate-400 mt-1">Vos sessions apparaîtront ici</p>
            </div>
            <button onClick={() => onNavigate('merge')}
              className="px-5 py-2 bg-indigo-600 text-white text-sm font-bold rounded-full hover:bg-indigo-700 transition-colors">
              Commencer maintenant
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {recentFiles.map(file => {
              const meta = TOOL_META[file.type];
              const Icon = meta?.icon || FileImage;
              return (
                <motion.button
                  key={file.id}
                  whileHover={{ x: 4 }}
                  onClick={() => onNavigate(file.type)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all text-left"
                >
                  <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', meta?.bg || 'bg-slate-100')}>
                    <Icon size={18} className={meta?.color || 'text-slate-500'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{file.name}</p>
                    <p className="text-xs text-slate-400">{meta?.label || file.type}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400 font-medium">{formatDate(file.date)}</span>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
};
