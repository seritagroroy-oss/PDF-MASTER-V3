import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, FileCheck, ServerOff, Globe, Sparkles, Heart } from 'lucide-react';

export const About: React.FC = () => {
  const sections = [
    {
      icon: Lock,
      title: "Confidentialité Totale",
      description: "Vos fichiers ne quittent jamais votre ordinateur. Tout le traitement (fusion, conversion, édition) se fait localement dans votre navigateur grâce à la puissance du WebAssembly.",
      color: "text-indigo-600",
      bg: "bg-indigo-50"
    },
    {
      icon: ServerOff,
      title: "Pas de Stockage Serveur",
      description: "Contrairement à d'autres outils en ligne, nous ne stockons rien. Une fois l'onglet fermé, vos documents disparaissent de la mémoire de votre navigateur.",
      color: "text-emerald-600",
      bg: "bg-emerald-50"
    },
    {
      icon: FileCheck,
      title: "Haute Qualité",
      description: "Nous utilisons les meilleures bibliothèques Open Source (pdf-lib, Tesseract.js) pour garantir un résultat professionnel sans compromis sur la netteté.",
      color: "text-amber-600",
      bg: "bg-amber-50"
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-12 py-10">
      <div className="text-center space-y-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-600 text-white text-xs font-black uppercase tracking-widest mb-4"
        >
          <Sparkles size={14} /> Mission Professionnelle
        </motion.div>
        <h1 className="text-4xl md:text-6xl font-display font-extrabold text-slate-900 leading-tight">
          La puissance du PDF, <br />
          <span className="text-indigo-600">sans compromettre</span> votre vie privée.
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
          PDF Master est né d'un constat simple : la plupart des outils PDF en ligne envoient vos documents vers des serveurs inconnus. Nous avons changé les règles.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {sections.map((section, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all group"
          >
            <div className={`h-14 w-14 ${section.bg} ${section.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
              <section.icon size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">{section.title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{section.description}</p>
          </motion.div>
        ))}
      </div>

      <div className="rounded-[3rem] bg-slate-900 p-10 md:p-16 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 blur-[100px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 blur-[80px] rounded-full" />
        
        <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl font-display font-bold">Pourquoi choisir une PWA ?</h2>
            <p className="text-slate-400 leading-relaxed">
              PDF Master est une <strong>Progressive Web App</strong>. Cela signifie que vous pouvez l'installer sur votre bureau ou votre mobile et l'utiliser même sans connexion internet. 
              C'est la rapidité du web alliée à la puissance d'un logiciel natif.
            </p>
            <div className="flex items-center gap-4 py-2">
              <div className="flex -space-x-3">
                {[1,2,3].map(i => (
                  <div key={i} className="h-10 w-10 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                    {i === 1 ? '⚡' : i === 2 ? '🔒' : '📶'}
                  </div>
                ))}
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Performances & Sécurité</p>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-md rounded-[2rem] p-8 border border-white/10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
              <p className="text-sm font-bold">100% Côté client (Client-side)</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-indigo-400" />
              <p className="text-sm font-bold">Optimisé pour Vercel Edge</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-amber-400" />
              <p className="text-sm font-bold">RGPD Ready par défaut</p>
            </div>
            <hr className="border-white/10 my-4" />
            <p className="text-xs text-slate-500 leading-tight italic">
              "La sécurité n'est pas une option, c'est le fondement même de notre architecture logicielle."
            </p>
          </div>
        </div>
      </div>

      <div className="text-center py-10 space-y-4">
        <p className="text-sm font-bold text-slate-400 flex items-center justify-center gap-2">
          Propulsé par <Globe size={14} /> Roy Industrie <Heart size={14} className="text-rose-500 fill-rose-500" /> 2026
        </p>
      </div>
    </div>
  );
};
