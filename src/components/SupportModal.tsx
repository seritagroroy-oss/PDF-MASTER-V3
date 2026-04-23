import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Heart, ShieldCheck } from 'lucide-react';
import { cn } from '../utils/cn';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const paymentMethods = [
  { 
    name: "Orange Money", 
    number: "07 67 17 45 41", 
    color: "bg-orange-500", 
    lightColor: "bg-orange-50",
    textColor: "text-orange-600",
    id: "orange" 
  },
  { 
    name: "MTN Money", 
    number: "05 54 37 75 07", 
    color: "bg-yellow-400", 
    lightColor: "bg-yellow-50",
    textColor: "text-yellow-700",
    id: "mtn" 
  },
  { 
    name: "Moov Money", 
    number: "01 40 94 59 41", 
    color: "bg-blue-600", 
    lightColor: "bg-blue-50",
    textColor: "text-blue-600",
    id: "moov" 
  },
  { 
    name: "Wave", 
    number: "05 54 37 75 07", 
    color: "bg-cyan-400", 
    lightColor: "bg-cyan-50",
    textColor: "text-cyan-600",
    id: "wave" 
  }
];

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (number: string, id: string) => {
    navigator.clipboard.writeText(number.replace(/\s/g, ''));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg max-h-[90vh] bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-y-auto flex flex-col scrollbar-hide"
          >
            {/* Header Animé */}
            <div className="relative p-8 bg-slate-900 text-white">
              <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-500 rounded-full blur-[80px]" />
                <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-emerald-500 rounded-full blur-[80px]" />
              </div>

              <div className="relative flex justify-between items-start mb-6">
                <div className="h-14 w-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <Heart size={28} className="text-white animate-pulse" />
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all active:scale-90"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="relative">
                <h2 className="text-3xl font-display font-black tracking-tight">Soutenir le projet</h2>
                <p className="text-slate-400 mt-2 font-medium leading-relaxed">
                  Votre contribution aide à maintenir ce service gratuit et 100% ivoirien. Merci pour votre générosité !
                </p>
              </div>
            </div>

            {/* List of Payment Methods */}
            <div className="p-8 space-y-4 bg-slate-50">
              {paymentMethods.map((method) => (
                <div 
                  key={method.id}
                  className="group relative bg-white border border-slate-200 rounded-3xl p-5 flex items-center justify-between hover:border-slate-400 transition-all hover:shadow-xl hover:shadow-slate-200"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn("h-12 w-12 rounded-2xl shadow-sm flex items-center justify-center", method.color)}>
                      <div className="text-[10px] font-black text-slate-900 uppercase tracking-tighter text-center leading-none px-1">
                        {method.name.split(' ')[0]}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{method.name}</h3>
                      <p className={cn("text-sm font-black tracking-widest mt-0.5", method.textColor)}>
                        {method.number}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => copyToClipboard(method.number, method.id)}
                    className={cn(
                      "flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all active:scale-95 shadow-sm",
                      copiedId === method.id 
                        ? "bg-emerald-500 text-white" 
                        : "bg-slate-900 text-white hover:bg-slate-800"
                    )}
                  >
                    {copiedId === method.id ? <Check size={16} /> : <Copy size={16} />}
                    {copiedId === method.id ? "Copié !" : "Copier"}
                  </button>
                </div>
              ))}

              <div className="mt-8 pt-8 border-t border-slate-200">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Soutenir gratuitement</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button 
                    onClick={() => {
                      const text = encodeURIComponent("Salut ! J'utilise PDF Master pour mes documents, c'est gratuit, ultra-rapide et créé en Côte d'Ivoire par Monsieur Roy. Essaie-le ici : https://pdf-master.vercel.app");
                      window.open(`https://wa.me/?text=${text}`, '_blank');
                    }}
                    className="flex items-center justify-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl hover:bg-emerald-500/20 transition-all group"
                  >
                    <div className="h-8 w-8 bg-emerald-500 text-white rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <span className="text-xs font-black">WA</span>
                    </div>
                    <div className="text-left">
                      <p className="text-[11px] font-black text-emerald-600 uppercase tracking-tight">Partager sur</p>
                      <p className="text-xs font-bold text-slate-900">WhatsApp</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => {
                      const text = encodeURIComponent("Salut Monsieur Roy ! Je tenais à vous encourager pour votre superbe travail sur PDF Master. C'est un outil vraiment utile et je suis fier que ce soit du local ! ✨");
                      window.open(`https://wa.me/2250712707468?text=${text}`, '_blank');
                    }}
                    className="flex items-center justify-center gap-3 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl hover:bg-indigo-500/20 transition-all"
                  >
                    <div className="h-8 w-8 bg-indigo-500 text-white rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                      <Heart size={16} />
                    </div>
                    <div className="text-left">
                      <p className="text-[11px] font-black text-indigo-600 uppercase tracking-tight">Envoyer un</p>
                      <p className="text-xs font-bold text-slate-900">Mot encourageant</p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-200 flex items-center gap-3 text-slate-400">
                <ShieldCheck size={18} className="text-emerald-500" />
                <p className="text-[11px] font-bold uppercase tracking-wider leading-relaxed">
                  Transactions sécurisées via opérateurs locaux en Côte d'Ivoire.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
