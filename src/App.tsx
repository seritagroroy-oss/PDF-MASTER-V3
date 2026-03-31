import React, { Suspense, lazy, useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  CheckCircle2,
  Combine,
  DownloadCloud,
  FileImage,
  Globe,
  Github,
  Keyboard,
  Layers,
  Layout,
  Linkedin,
  LogOut,
  LayoutDashboard,
  Menu,
  Minimize2,
  Moon,
  Scissors,
  Shield,
  Sparkles,
  Sun,
  Twitter,
  User,
  X,
  Zap,
  MessageSquare,
  ScanText,
  Camera,
  ChevronDown,
  Hash,
  Package,
  PenTool,
} from 'lucide-react';
import { BrandLockup } from './components/BrandLockup';
import { AuthModal } from './components/AuthModal';
import { UserDashboard } from './components/UserDashboard';
import { updateLastSeen, addRecentFile } from './hooks/useUserStorage';
import { cn } from './utils/cn';

interface AppUser {
  name: string;
  email: string;
}

type Tool = 'merge' | 'edit' | 'compress' | 'watermark' | 'convert' | 'split' | 'protect' | 'chat' | 'ocr' | 'numbering' | 'batch' | 'scanner' | 'sign' | 'dashboard' | 'home';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const PDFMerger = lazy(() =>
  import('./components/PDFMerger').then((module) => ({ default: module.PDFMerger })),
);
const PDFEditor = lazy(() =>
  import('./components/PDFEditor').then((module) => ({ default: module.PDFEditor })),
);
const PDFCompressor = lazy(() =>
  import('./components/PDFCompressor').then((module) => ({ default: module.PDFCompressor })),
);
const PDFSplitter = lazy(() =>
  import('./components/PDFSplitter').then((module) => ({ default: module.PDFSplitter })),
);
const PDFProtector = lazy(() =>
  import('./components/PDFProtector').then((module) => ({ default: module.PDFProtector })),
);
const PDFWatermark = lazy(() =>
  import('./components/PDFWatermark').then((module) => ({ default: module.PDFWatermark })),
);
const PDFConverter = lazy(() =>
  import('./components/PDFConverter').then((module) => ({ default: module.PDFConverter })),
);
const PDFChat = lazy(() =>
  import('./components/PDFChat').then((module) => ({ default: module.PDFChat })),
);
const PDFOCR = lazy(() =>
  import('./components/PDFOCR').then((module) => ({ default: module.PDFOCR })),
);
const PDFNumbering = lazy(() =>
  import('./components/PDFNumbering').then((module) => ({ default: module.PDFNumbering })),
);
const PDFBatch = lazy(() =>
  import('./components/PDFBatch').then((module) => ({ default: module.PDFBatch })),
);
const PDFScanner = lazy(() =>
  import('./components/PDFScanner').then((module) => ({ default: module.PDFScanner })),
);
const PDFSign = lazy(() =>
  import('./components/PDFSign').then((module) => ({ default: module.PDFSign })),
);

const tools = [
  {
    id: 'merge' as const,
    name: 'Fusionner PDF',
    shortName: 'Fusion',
    description: 'Combinez plusieurs documents dans un seul PDF propre et rapide.',
    detail: 'Réordonnez vos fichiers, vérifiez la liste, puis exportez en un clic.',
    icon: Combine,
    color: 'bg-indigo-500',
    soft: 'from-indigo-500/15 to-cyan-500/10',
    textColor: 'text-indigo-600',
  },
  {
    id: 'edit' as const,
    name: 'Modifier PDF',
    shortName: 'Édition',
    description: 'Supprimez des pages ou réorganisez un document sans logiciel lourd.',
    detail: 'Un flux simple pour garder uniquement les pages utiles.',
    icon: Scissors,
    color: 'bg-rose-500',
    soft: 'from-rose-500/15 to-orange-500/10',
    textColor: 'text-rose-600',
  },
  {
    id: 'compress' as const,
    name: 'Compresser PDF',
    shortName: 'Compression',
    description: 'Réduisez le poids des fichiers pour le mail, le web et l’archivage.',
    detail: 'Idéal pour envoyer plus vite vos documents sans sortir du navigateur.',
    icon: Minimize2,
    color: 'bg-emerald-500',
    soft: 'from-emerald-500/15 to-lime-500/10',
    textColor: 'text-emerald-600',
  },
  {
    id: 'watermark' as const,
    name: 'Filigrane PDF',
    shortName: 'Filigrane',
    description: 'Ajoutez un texte ou une image pour protéger vos documents sensibles.',
    detail: 'Confidentiel, brouillon, copyright ou marquage personnalisé.',
    icon: Layout,
    color: 'bg-amber-500',
    soft: 'from-amber-500/15 to-yellow-500/10',
    textColor: 'text-amber-600',
  },
  {
    id: 'convert' as const,
    name: 'Convertir PDF',
    shortName: 'Conversion',
    description: 'Transformez vos PDF en images JPG, PNG ou en texte.',
    detail: 'Parfait pour des aperçus rapides, de l’extraction ou du partage.',
    icon: FileImage,
    color: 'bg-sky-500',
    soft: 'from-sky-500/15 to-blue-500/10',
    textColor: 'text-sky-600',
  },
  {
    id: 'split' as const,
    name: 'Diviser PDF',
    shortName: 'Division',
    description: 'Séparez un PDF en plusieurs fichiers par plage de pages ou à la page.',
    detail: 'Extrayez exactement les pages dont vous avez besoin.',
    icon: Layers,
    color: 'bg-violet-500',
    soft: 'from-violet-500/15 to-purple-500/10',
    textColor: 'text-violet-600',
  },
  {
    id: 'protect' as const,
    name: 'Protéger PDF',
    shortName: 'Protection',
    description: 'Ajoutez une couche de protection et de confidentialité à vos documents.',
    detail: 'Filigrane de confidentialité et métadonnées de protection intégrées.',
    icon: Shield,
    color: 'bg-red-500',
    soft: 'from-red-500/15 to-rose-500/10',
    textColor: 'text-red-600',
  },
  {
    id: 'sign' as const,
    name: 'Signer PDF',
    shortName: 'Signature',
    description: 'Remplissez vos documents, dessinez votre signature et ajoutez une date.',
    detail: 'Solution professionnelle de saisie de formulaires sans impression papier.',
    icon: PenTool,
    color: 'bg-emerald-600',
    soft: 'from-emerald-600/15 to-teal-600/10',
    textColor: 'text-emerald-700',
  },
  {
    id: 'chat' as const,
    name: 'ChatPDF IA',
    shortName: 'IA Chat',
    description: 'Discutez avec votre document et posez des questions à l\'intelligence artificielle.',
    detail: 'Résumés, extraction de données et explications sur mesure.',
    icon: MessageSquare,
    color: 'bg-pink-500',
    soft: 'from-pink-500/15 to-fuchsia-500/10',
    textColor: 'text-pink-600',
  },
  {
    id: 'ocr' as const,
    name: 'Scanner (OCR)',
    shortName: 'OCR',
    description: 'Extrayez le texte des images et des documents scannés.',
    detail: 'Reconnaissance optique multilingue avec Tesseract.',
    icon: ScanText,
    color: 'bg-teal-500',
    soft: 'from-teal-500/15 to-cyan-500/10',
    textColor: 'text-teal-600',
  },
  {
    id: 'scanner' as const,
    name: 'Scanner (Caméra)',
    shortName: 'Scanner',
    description: 'Prenez en photo vos documents papier et transformez-les en PDF instantanément.',
    detail: 'Une numérisation rapide, nette, directement depuis votre appareil photo ou webcam.',
    icon: Camera,
    color: 'bg-teal-500',
    soft: 'from-teal-500/15 to-emerald-500/10',
    textColor: 'text-teal-600',
  },
  {
    id: 'numbering' as const,
    name: 'Numéroter PDF',
    shortName: 'Numéros',
    description: 'Ajoutez une numérotation des pages automatiquement.',
    detail: 'Placé en bas à droite ou centré pour vos documents professionnels.',
    icon: Hash,
    color: 'bg-fuchsia-500',
    soft: 'from-fuchsia-500/15 to-purple-500/10',
    textColor: 'text-fuchsia-600',
  },
  {
    id: 'batch' as const,
    name: 'Lot de PDF',
    shortName: 'Lot',
    description: 'Appliquez une action (protection, filigrane) sur 50 PDFs à la fois.',
    detail: 'Traitement en masse ultra-rapide.',
    icon: Package,
    color: 'bg-indigo-600',
    soft: 'from-indigo-600/15 to-blue-600/10',
    textColor: 'text-indigo-700',
  },
];

const trustPoints = [
  'Traitement local dans le navigateur',
  'Aucun transfert serveur pour vos fichiers',
  'Expérience plus fluide sur mobile et desktop',
];

const quickSteps = [
  'Choisissez un outil selon votre besoin.',
  'Déposez vos fichiers PDF.',
  'Vérifiez le résultat puis téléchargez.',
];

const brandHighlights = [
  'Interface plus premium',
  'Identité plus forte',
  'Parcours plus direct',
];

const preloadTool = (tool: Exclude<Tool, 'home' | 'dashboard'>) => {
  switch (tool) {
    case 'merge': void import('./components/PDFMerger'); break;
    case 'edit': void import('./components/PDFEditor'); break;
    case 'compress': void import('./components/PDFCompressor'); break;
    case 'watermark': void import('./components/PDFWatermark'); break;
    case 'convert': void import('./components/PDFConverter'); break;
    case 'split': void import('./components/PDFSplitter'); break;
    case 'protect': void import('./components/PDFProtector'); break;
    case 'chat': void import('./components/PDFChat'); break;
    case 'ocr': void import('./components/PDFOCR'); break;
    case 'numbering': void import('./components/PDFNumbering'); break;
    case 'batch': void import('./components/PDFBatch'); break;
  }
};

export default function App() {
  const [activeTool, setActiveTool] = useState<Tool>('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('pdfmaster_dark') === 'true');
  const [globalDragOver, setGlobalDragOver] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const stored = localStorage.getItem('pdfmaster_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogin = (user: AppUser) => {
    setCurrentUser(user);
    localStorage.setItem('pdfmaster_user', JSON.stringify(user));
    updateLastSeen(user.email);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('pdfmaster_user');
    setShowUserMenu(false);
    setActiveTool('home');
  };

  useEffect(() => {
    // Check if app is running in standalone mode (already installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (('standalone' in navigator) && (navigator as any).standalone);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Always trigger the banner if the user is not in the installed app
    if (!isStandalone) {
      const bannerTimer = setTimeout(() => {
        setIsInstallable(true);
        setShowInstallBanner(true);
      }, 3500); 
      
      return () => {
        clearTimeout(bannerTimer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    const currentTool = tools.find((tool) => tool.id === activeTool);
    document.title = currentTool
      ? `${currentTool.name} | PDF Master`
      : 'PDF Master | Outils PDF rapides et privés';
  }, [activeTool]);

  useEffect(() => {
    setIsMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTool]);

  // Dark mode effect
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('pdfmaster_dark', String(isDarkMode));
  }, [isDarkMode]);


  useEffect(() => {
    const timer = window.setTimeout(() => setIsBooting(false), 1100);
    return () => window.clearTimeout(timer);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setIsInstallable(false);
        setShowInstallBanner(false);
      }

      setDeferredPrompt(null);
    } else {
      const isIos = /ipad|iphone|ipod/.test(navigator.userAgent.toLowerCase());
      if (isIos) {
        alert("Sur iPHONE / iPAD :\n\n1. Touchez l'icône Partager (carré avec flèche en bas)\n2. Sélectionnez 'Sur l'écran d'accueil'.");
      } else {
        alert("Pour installer :\n\n1. Ouvrez le menu de votre navigateur (les 3 points en haut à droite)\n2. Choisissez 'Ajouter à l'écran d'accueil' ou 'Installer'.");
      }
    }
  };

  const renderActiveTool = () => {
    if (activeTool === 'dashboard' && currentUser) {
      return <UserDashboard user={currentUser} onNavigate={t => handleToolChange(t as Tool)} onLogout={handleLogout} />;
    }
    switch (activeTool) {
      case 'merge': return <PDFMerger />;
      case 'edit': return <PDFEditor />;
      case 'compress': return <PDFCompressor />;
      case 'watermark': return <PDFWatermark />;
      case 'convert': return <PDFConverter />;
      case 'split': return <PDFSplitter />;
      case 'protect': return <PDFProtector />;
      case 'chat': return <PDFChat />;
      case 'ocr': return <PDFOCR />;
      case 'numbering': return <PDFNumbering />;
      case 'batch': return <PDFBatch />;
      case 'scanner': return <PDFScanner />;
      case 'sign': return <PDFSign />;
      default: return null;
    }
  };

  // Track tool change per user
  const handleToolChange = (tool: Tool) => {
    setActiveTool(tool);
    if (currentUser && tool !== 'home' && tool !== 'dashboard') {
      addRecentFile(currentUser.email, {
        name: `Session — ${tools.find(t => t.id === tool)?.name || tool}`,
        size: 0,
        type: tool as any,
      });
      updateLastSeen(currentUser.email);
    }
  };

  // Global drag-and-drop
  const handleGlobalDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setGlobalDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f?.type === 'application/pdf') handleToolChange('merge');
  }, [currentUser]);

  return (
    <div
      className={cn('min-h-screen bg-app text-slate-900 transition-colors duration-300', isDarkMode && 'dark bg-slate-950 text-slate-100')}
      onDragOver={e => { e.preventDefault(); setGlobalDragOver(true); }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setGlobalDragOver(false); }}
      onDrop={handleGlobalDrop}
    >
      {/* Global drag overlay */}
      <AnimatePresence>
        {globalDragOver && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] flex items-center justify-center bg-indigo-600/20 backdrop-blur-sm border-4 border-dashed border-indigo-500 pointer-events-none">
            <div className="bg-white rounded-[2rem] p-10 text-center shadow-2xl">
              <div className="text-6xl mb-4">📄</div>
              <p className="text-xl font-black text-indigo-600">Déposez votre PDF</p>
              <p className="text-slate-500 mt-1">Ouverture automatique dans le bon outil</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="absolute -left-24 top-64 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-emerald-300/20 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen flex-col">
        <AnimatePresence>
          {isBooting && (
            <motion.div
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.35 } }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.16),transparent_28%),linear-gradient(180deg,#020617_0%,#020617_100%)]" />
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="relative flex flex-col items-center gap-6 px-6 text-center"
              >
                <BrandLockup dark className="scale-110" />
                <div className="space-y-3">
                  <p className="text-sm font-semibold uppercase tracking-[0.35em] text-cyan-300/80">
                    Chargement de l’espace PDF
                  </p>
                  <div className="brand-sheen mx-auto h-1.5 w-56 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full rounded-full bg-cyan-300"
                      initial={{ x: '-100%' }}
                      animate={{ x: '0%' }}
                      transition={{ duration: 0.9, ease: 'easeInOut' }}
                    />
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <nav className="sticky top-0 z-50 border-b border-indigo-500/10 bg-slate-900/80 backdrop-blur-xl">
          <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setActiveTool('home')}
              className="flex items-center gap-3 text-left shrink-0 mr-4 md:mr-6"
              aria-label="Retour à l’accueil"
            >
              <BrandLockup dark />
            </button>



            <div className="hidden items-center shrink-0 gap-2 xl:gap-3 md:flex">

              {currentUser ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2.5 rounded-full bg-slate-800 px-3 py-2 text-sm font-bold text-white transition hover:bg-slate-700"
                  >
                    <div className="h-7 w-7 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                    {currentUser.name}
                  </button>
                  <AnimatePresence>
                    {showUserMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-white border border-slate-100 shadow-xl shadow-slate-900/10 overflow-hidden z-50"
                      >
                        <div className="p-4 border-b border-slate-100">
                          <p className="text-xs font-bold text-slate-900">{currentUser.name}</p>
                          <p className="text-xs text-slate-400 truncate">{currentUser.email}</p>
                        </div>
                        <button
                          onClick={() => { handleToolChange('dashboard'); setShowUserMenu(false); }}
                          className="w-full flex items-center gap-2 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <LayoutDashboard size={15} />
                          Mon tableau de bord
                        </button>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-4 py-3 text-sm font-bold text-rose-500 hover:bg-rose-50 transition-colors"
                        >
                          <LogOut size={16} />
                          Se déconnecter
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAuthOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700"
                >
                  <User size={16} />
                  Connexion
                </button>
              )}

              {/* Dark mode & shortcuts */}
              <button
                type="button"
                onClick={() => setIsDarkMode(d => !d)}
                title={isDarkMode ? 'Mode clair' : 'Mode sombre'}
                className="p-2.5 rounded-full border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all"
              >
                {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
              </button>

              <button
                type="button"
                onClick={() => setActiveTool('merge')}
                className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-300"
              >
                Commencer
                <ArrowRight size={16} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsMenuOpen((value) => !value)}
              className="rounded-xl p-2 text-slate-200 transition hover:bg-slate-900 md:hidden"
              aria-label="Ouvrir le menu"
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X size={26} /> : <Menu size={26} />}
            </button>
          </div>

          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden border-t border-slate-800 bg-slate-950 md:hidden"
              >
                <div className="space-y-4 px-4 py-5">

                  {currentUser ? (
                    <button
                      type="button"
                      onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                      className="flex w-full items-center gap-3 rounded-2xl bg-rose-500/10 px-4 py-3.5 text-left font-bold text-rose-500 transition hover:bg-rose-500/20"
                    >
                      <LogOut size={18} />
                      <span className="flex-1 truncate">Se déconnecter ({currentUser.name})</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setIsAuthOpen(true); setIsMenuOpen(false); }}
                      className="flex w-full items-center gap-3 rounded-2xl border border-indigo-500/30 bg-indigo-600/10 px-4 py-3.5 text-left font-bold text-indigo-400 transition hover:bg-indigo-600/20"
                    >
                      <User size={18} />
                      Connexion / Inscription
                    </button>
                  )}

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        <main className="flex-1">
          <AnimatePresence mode="wait">
            {activeTool === 'home' ? (
              <motion.div
                key="home"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16"
              >
                <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-8">
                    <div className="hidden sm:inline-flex items-center gap-3 rounded-full border border-indigo-200 bg-white/80 px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm">
                      <div className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-wider">Gratuit</div>
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} />
                        Suite PDF locale, rapide et plus claire à utiliser
                      </div>
                    </div>

                    <div className="space-y-5">
                      <h1 className="max-w-4xl text-4xl font-display font-extrabold leading-tight text-slate-950 sm:text-5xl lg:text-7xl">
                        Gérez vos PDF avec une interface plus nette, plus rapide et plus rassurante.
                      </h1>
                      <p className="hidden sm:block max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
                        Fusion, édition, compression, conversion et filigrane dans un seul espace.
                        Tout est pensé pour aller à l’essentiel, y compris sur mobile.
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => setActiveTool('merge')}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-7 py-3.5 sm:py-4 text-base sm:text-lg font-bold text-white shadow-xl shadow-indigo-500/20 transition hover:-translate-y-1 hover:bg-indigo-700"
                      >
                        Lancer un essai
                        <ArrowRight size={20} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTool('convert')}
                        className="hidden sm:inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-7 py-4 text-lg font-bold text-slate-900 transition hover:border-indigo-200 hover:bg-indigo-50/40"
                      >
                        Tester la conversion
                      </button>
                    </div>

                    <div className="hidden sm:grid gap-3 sm:grid-cols-3">
                      {trustPoints.map((item) => (
                        <div
                          key={item}
                          className="rounded-2xl border border-white/70 bg-white/80 px-4 py-4 text-sm font-medium text-slate-700 shadow-sm"
                        >
                          <div className="mb-2 flex items-center gap-2 text-emerald-600">
                            <CheckCircle2 size={16} />
                            Confirmé
                          </div>
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="relative hidden lg:block">
                    <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-indigo-500/20 via-cyan-400/10 to-emerald-400/20 blur-2xl" />
                    <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-2xl shadow-slate-900/10">
                      <div className="mb-6 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">
                            Tableau de bord
                          </p>
                          <h2 className="mt-2 text-2xl font-display font-bold text-slate-900">
                            Démarrage rapide
                          </h2>
                        </div>
                        <div className="rounded-2xl bg-slate-900 p-3 text-white">
                          <Zap size={24} />
                        </div>
                      </div>

                      <div className="space-y-4">
                        {quickSteps.map((step, index) => (
                          <div
                            key={step}
                            className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4"
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 font-bold text-white">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{step}</p>
                              <p className="mt-1 text-sm leading-6 text-slate-500">
                                Une navigation plus directe réduit les clics inutiles et rassure
                                l’utilisateur avant le traitement.
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-6 grid grid-cols-2 gap-4">
                        <div className="rounded-2xl bg-slate-900 p-5 text-white">
                          <p className="text-sm uppercase tracking-[0.22em] text-white/60">Confidentialité</p>
                          <p className="mt-2 text-3xl font-display font-bold">100%</p>
                          <p className="mt-2 text-sm text-white/70">Traitement local annonce clairement</p>
                        </div>
                        <div className="rounded-2xl bg-indigo-50 p-5">
                          <p className="text-sm uppercase tracking-[0.22em] text-indigo-500">Utilisation</p>
                          <p className="mt-2 text-3xl font-display font-bold text-slate-900">5 outils</p>
                          <p className="mt-2 text-sm text-slate-500">Tous accessibles depuis une seule page</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>



                <section className="hidden sm:grid mt-20 gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                  <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-8 text-white shadow-xl shadow-slate-900/10">
                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
                      <Shield size={28} />
                    </div>
                    <h2 className="text-3xl font-display font-bold">Une promesse simple</h2>
                    <p className="mt-4 text-base leading-7 text-slate-300">
                      L’interface met davantage en avant la confidentialité, la rapidité et la
                      clarté. Cela aide vos visiteurs à comprendre immédiatement ce que fait le
                      site et pourquoi ils peuvent vous faire confiance.
                    </p>
                    <ul className="mt-6 space-y-3 text-sm text-slate-200">
                      <li className="flex items-center gap-3">
                        <CheckCircle2 size={18} className="text-emerald-400" />
                        Message de confiance plus visible
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle2 size={18} className="text-emerald-400" />
                        Parcours de test plus direct
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle2 size={18} className="text-emerald-400" />
                        CTA plus cohérents entre desktop et mobile
                      </li>
                    </ul>
                  </div>

                  <div className="rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-xl shadow-slate-900/5">
                    <p className="text-sm font-semibold uppercase tracking-[0.26em] text-slate-400">
                      Pourquoi ces changements
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {brandHighlights.map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-cyan-700"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                        <h3 className="font-bold text-slate-900">Accueil plus explicite</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          Le visiteur voit tout de suite les usages concrets et où cliquer.
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                        <h3 className="font-bold text-slate-900">Navigation plus propre</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          Les boutons importants renvoient enfin vers de vraies actions.
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                        <h3 className="font-bold text-slate-900">Meilleure lecture mobile</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          Les blocs respirent davantage et les CTA restent visibles.
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                        <h3 className="font-bold text-slate-900">Etat du site plus net</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          Le titre de page change selon l’outil ouvert pour mieux se repérer.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              </motion.div>
            ) : (
              <motion.div
                key="tool"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -18 }}
                className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
              >
                <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setActiveTool('home')}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
                  >
                    <X size={16} />
                    Retour à l’accueil
                  </button>
                  <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-500 shadow-sm">
                    {tools.find((tool) => tool.id === activeTool)?.name}
                  </div>
                </div>
                <Suspense
                  fallback={
                    <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-10 text-center shadow-sm">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white">
                        <Zap size={24} className="animate-pulse" />
                      </div>
                      <p className="mt-5 text-lg font-bold text-slate-900">Chargement de l’outil</p>
                      <p className="mt-2 text-sm text-slate-500">
                        Les modules PDF les plus lourds sont chargés seulement quand vous en avez besoin.
                      </p>
                    </div>
                  }
                >
                  {renderActiveTool()}
                </Suspense>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <footer className="border-t border-slate-100/10 bg-white/5 py-8 backdrop-blur-xl">
          <div className="mx-auto flex flex-col md:flex-row max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 gap-6">
            <div className="flex flex-col items-center md:items-start gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">SERI TAGRO ROY INDUSTRIE</p>
              <div className="flex items-center gap-2 px-2 py-1 bg-white/5 rounded-full border border-white/10">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Site 100% Gratuit</span>
              </div>
            </div>
            
            <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <a href="#" className="hover:text-indigo-400">Confidentialité</a>
              <a href="#" className="hover:text-indigo-400">Conditions</a>
              <div className="flex items-center gap-2 ml-4">
                <Globe size={14} />
                <span>Français</span>
              </div>
            </div>
          </div>
        </footer>
      </div>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLogin={handleLogin}
      />


      <AnimatePresence>
        {isInstallable && showInstallBanner && (
          <motion.div
            initial={{ opacity: 0, y: 80, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 80, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed bottom-3 left-3 right-3 sm:bottom-6 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto z-[200] sm:w-[calc(100%-2rem)] sm:max-w-md"
          >
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 rounded-2xl bg-slate-900 p-3 sm:p-4 shadow-2xl shadow-slate-900/40 border border-slate-700/50 backdrop-blur-xl">
              <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 w-full">
                <div className="shrink-0 h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <DownloadCloud size={20} className="text-slate-950" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm line-clamp-1">Installer PDF Master</p>
                  <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 line-clamp-1 sm:whitespace-normal">Accès rapide à un clic</p>
                </div>
                <button
                  onClick={() => setShowInstallBanner(false)}
                  className="sm:hidden p-1.5 -mr-1 rounded-lg text-slate-500 hover:bg-slate-800 transition-colors"
                  aria-label="Fermer"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-1 sm:mt-0 w-full sm:w-auto shrink-0">
                <button
                  onClick={() => setShowInstallBanner(false)}
                  className="hidden sm:block p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
                  title="Fermer"
                >
                  <X size={16} />
                </button>
                <button
                  onClick={handleInstallClick}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-[13px] sm:text-sm rounded-xl transition-all hover:scale-105 active:scale-95 shadow-md shadow-cyan-500/20"
                >
                  Installer la PWA
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

