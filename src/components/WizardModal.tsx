import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ArrowRight, Zap, FileText, Lock, Combine, Minimize2, ScanText, Camera, PenTool } from 'lucide-react';
import { cn } from '../utils/cn';

interface WizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTool: (toolId: string) => void;
}

const steps = [
  {
    icon: Sparkles,
    title: "Discuter avec l'IA",
    desc: "Je veux que l'IA résume ou réponde à mes questions sur un PDF.",
    id: "chat",
    color: "bg-indigo-600",
    tags: ["ia", "chat", "resume", "aide", "questions"]
  },
  {
    icon: Minimize2,
    title: "Réduire la taille",
    desc: "Mon fichier est trop lourd pour être envoyé par WhatsApp ou mail.",
    id: "compress",
    color: "bg-emerald-500",
    tags: ["poids", "taille", "leger", "whatsapp", "lourd"]
  },
  {
    icon: Camera,
    title: "Photos en PDF",
    desc: "Je veux transformer des photos de mes devoirs en un seul PDF.",
    id: "scanner",
    color: "bg-amber-500",
    tags: ["photo", "devoir", "cours", "mobile", "image"]
  },
  {
    icon: PenTool,
    title: "Signer un document",
    desc: "Je dois signer un contrat ou une lettre de motivation.",
    id: "sign",
    color: "bg-blue-500",
    tags: ["signature", "contrat", "lettre", "travail"]
  },
  {
    icon: Sparkles,
    title: "Nettoyer un Scan",
    desc: "Mon document scanné est trop sombre ou a des taches noires.",
    id: "purify",
    color: "bg-violet-500",
    tags: ["sale", "sombre", "scan", "propre", "impression"]
  },
  {
    icon: ScanText,
    title: "Copier le texte (OCR)",
    desc: "Je veux extraire et copier le texte d'une image ou d'un scan.",
    id: "ocr",
    color: "bg-teal-500",
    tags: ["texte", "image", "copier", "scan", "lecture"]
  },
  {
    icon: Combine,
    title: "Fusionner PDF",
    desc: "J'ai plusieurs PDF et je veux en faire un seul.",
    id: "merge",
    color: "bg-indigo-500",
    tags: ["plusieurs", "un seul", "grouper", "dossier"]
  },
  {
    icon: Lock,
    title: "Protéger / Verrouiller",
    desc: "Je veux ajouter un mot de passe ou un filigrane.",
    id: "protect",
    color: "bg-rose-500",
    tags: ["protection", "mp", "secret", "mot de passe", "verrou"]
  }
];

export const WizardModal: React.FC<WizardModalProps> = ({ isOpen, onClose, onSelectTool }) => {
  const [search, setSearch] = React.useState("");

  const filteredSteps = steps.filter(step => 
    step.title.toLowerCase().includes(search.toLowerCase()) ||
    step.desc.toLowerCase().includes(search.toLowerCase()) ||
    step.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
  );
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-y-auto flex flex-col scrollbar-hide"
          >
            {/* Header */}
            <div className="p-8 bg-gradient-to-br from-indigo-600 to-violet-700 text-white">
              <div className="flex justify-between items-start mb-4">
                <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                  <Sparkles size={24} className="text-indigo-100" />
                </div>
                <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <h2 className="text-3xl font-display font-black">Besoin d'aide ?</h2>
              <p className="text-indigo-100 mt-2 font-medium">Dites-moi ce que vous souhaitez accomplir et je vous guiderai vers le bon outil.</p>
              
              <div className="mt-6 relative">
                <input 
                  type="text" 
                  placeholder="Rechercher une action (ex: compresser, signer...)"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all font-medium"
                />
                <Sparkles size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" />
              </div>
            </div>

            {/* Options */}
            <div className="p-8 bg-slate-50 flex-1">
              <div className="grid gap-4 max-h-[40vh] overflow-y-auto pr-2 scrollbar-hide">
                {filteredSteps.length > 0 ? filteredSteps.map((step) => (
                  <button
                    key={step.id}
                    onClick={() => onSelectTool(step.id)}
                    className="group flex items-center gap-5 p-5 bg-white border border-slate-100 rounded-3xl hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/10 transition-all text-left"
                  >
                    <div className={cn("h-14 w-14 shrink-0 rounded-2xl flex items-center justify-center text-white shadow-lg", step.color)}>
                      <step.icon size={26} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 text-lg group-hover:text-indigo-600 transition-colors">{step.title}</h3>
                      <p className="text-slate-500 text-sm mt-0.5 line-clamp-1">{step.desc}</p>
                    </div>
                    <div className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                      <ArrowRight size={20} />
                    </div>
                  </button>
                )) : (
                  <div className="py-12 text-center text-slate-400">
                    <Zap size={32} className="mx-auto mb-4 opacity-20" />
                    <p className="font-bold">Aucun outil trouvé pour cette recherche.</p>
                    <button onClick={() => setSearch("")} className="mt-2 text-indigo-600 underline">Voir tous les outils</button>
                  </div>
                )}
              </div>

              <div className="mt-8 p-5 bg-indigo-50 rounded-[2rem] border border-indigo-100 flex items-center gap-4">
                <div className="h-10 w-10 bg-indigo-600 text-white rounded-full flex items-center justify-center">
                  <Zap size={20} />
                </div>
                <p className="text-sm font-bold text-indigo-900 leading-relaxed">
                  Tous les outils sont gratuits et respectent votre vie privée : vos fichiers ne quittent jamais votre appareil.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
