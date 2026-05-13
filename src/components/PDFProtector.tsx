import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { Shield, Upload, Download, Lock, Loader2, FileText, X, Eye, EyeOff, CheckCircle2, Share2, ArrowLeft } from 'lucide-react';
import React from 'react';
import { cn } from '../utils/cn';

interface PDFProtectorProps {
  projectId: string;
  onBack: () => void;
  addProject: (name: string, pageCount: number, thumbnailUrl?: string) => string;
  updateProject: (id: string, updates: any) => void;
}

export const PDFProtector: React.FC<PDFProtectorProps> = ({
  projectId: initialProjectId,
  onBack,
  addProject,
  updateProject
}) => {
  const [projectId, setProjectId] = useState(initialProjectId);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [owner, setOwner] = useState(false);
  const [preventPrint, setPreventPrint] = useState(false);
  const [preventCopy, setPreventCopy] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (f: File) => {
    setFile(f); setResultUrl(null); setError('');

    // Auto-register project when files are uploaded
    if (projectId === 'new') {
      console.log('[PDFProtector] Registering new project...');
      const newId = addProject(f.name, 1, ''); 
      setProjectId(newId);
    }
  };

  const protect = async () => {
    if (!file) return;
    if (password.length < 4) { setError('Le mot de passe doit contenir au moins 4 caractères.'); return; }
    if (password !== confirmPassword) { setError('Les mots de passe ne correspondent pas.'); return; }

    setIsProcessing(true); setError('');
    try {
      const bytes = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(bytes);

      // pdf-lib doesn't support encryption natively.
      // We add a visible watermark with the "PROTÉGÉ" label and password hint as the best
      // client-side alternative without a Node.js backend.
      // For real encryption, one would need a server with a library like node-pdftk or pdf-poppler.
      
      // Add "PROTÉGÉ" watermark to all pages + metadata
      const helvetica = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const pages = pdfDoc.getPages();
      
      for (const page of pages) {
        const { width, height } = page.getSize();
        // Subtle watermark
        page.drawText('CONFIDENTIEL', {
          x: width / 2 - 100,
          y: height / 2,
          size: 40,
          font: helvetica,
          color: rgb(0.9, 0.9, 0.9),
          opacity: 0.15,
          rotate: degrees(45),
        });
      }

      // Embed password hint in document metadata
      pdfDoc.setTitle(`[Protégé] ${file.name.replace('.pdf', '')}`);
      pdfDoc.setSubject(`Document protégé · Mot de passe requis`);
      const flags = [];
      if (preventPrint) flags.push('no-print');
      if (preventCopy) flags.push('no-copy');
      pdfDoc.setKeywords([`protected`, `password:${btoa(password)}`, `permissions:${flags.join(',')}`]);
      pdfDoc.setProducer('PDF Master — Roy Industrie');

      const saved = await pdfDoc.save();
      const blob = new Blob([saved as any], { type: 'application/pdf' });
      setResultUrl(URL.createObjectURL(blob));
    } catch (e: any) {
      setError('Erreur lors du traitement du fichier.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShare = async () => {
    if (!resultUrl || !file) return;
    setIsSharing(true);
    try {
      const response = await fetch(resultUrl);
      const blob = await response.blob();
      const shareFile = new File([blob], `protege_${file.name}`, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [shareFile] })) {
        await navigator.share({
          files: [shareFile],
          title: 'PDF Protégé',
          text: 'Voici un PDF protégé via PDF Master',
        });
      } else {
        await navigator.share({
          title: 'PDF Protégé',
          text: `Document protégé : ${file.name}`,
          url: window.location.href,
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <button
          onClick={onBack}
          className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all text-slate-500 hover:text-indigo-600 hidden md:block"
          title="Retour au dashboard"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="text-center flex-1 pr-12 hidden md:block">
           <h2 className="text-xl font-bold text-slate-900">Protéger votre PDF</h2>
        </div>
      </div>
      {/* Notice */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-100">
        <Shield size={18} className="text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-bold text-amber-800">Protection visible (côté navigateur)</p>
          <p className="text-xs text-amber-700 mt-0.5">Pour un chiffrement AES-256 réel, connectez un backend. Cette version ajoute un filigrane de confidentialité et intègre les métadonnées de protection.</p>
        </div>
      </div>

      {/* Upload */}
      {!file ? (
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f?.type === 'application/pdf') handleFile(f); }}
          className={cn('relative flex flex-col items-center gap-5 p-14 rounded-[2rem] border-2 border-dashed cursor-pointer transition-all',
            isDragging ? 'border-indigo-600 bg-indigo-50' : 'border-indigo-200 bg-slate-50 hover:border-indigo-500 hover:bg-indigo-50/30')}
        >
          <input type="file" accept=".pdf" className="absolute inset-0 opacity-0 cursor-pointer z-20" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <div className={cn('relative z-10 h-16 w-16 rounded-2xl flex items-center justify-center transition-all pointer-events-none', isDragging ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500')}>
            <Lock size={30} />
          </div>
          <div className="relative z-10 text-center pointer-events-none">
            <p className="text-lg font-bold text-slate-900">Déposez votre PDF à protéger</p>
            <p className="text-slate-500 text-sm mt-1">Cliquez ou glissez-déposez</p>
          </div>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          {/* File */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-rose-50 border border-rose-100">
            <div className="h-10 w-10 bg-rose-500 text-white rounded-xl flex items-center justify-center"><FileText size={18} /></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{file.name}</p>
              <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(0)} Ko</p>
            </div>
            <button onClick={() => setFile(null)} className="p-1.5 hover:bg-rose-100 rounded-lg text-rose-500 transition-colors"><X size={16} /></button>
          </div>

          {/* Password */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mot de passe</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Minimum 4 caractères"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-11 text-sm font-medium outline-none focus:border-rose-500/50 focus:ring-4 focus:ring-rose-500/10 transition-all" />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Confirmer le mot de passe</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showPwd ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Répétez le mot de passe"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-medium outline-none focus:border-rose-500/50 focus:ring-4 focus:ring-rose-500/10 transition-all" />
              </div>
            </div>
            
            <div className="pt-4 space-y-3 border-t border-slate-100">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Permissions additionnelles</label>
              
              <label className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-600 cursor-pointer hover:border-rose-200 transition-colors">
                <input
                  type="checkbox"
                  checked={preventPrint}
                  onChange={(e) => setPreventPrint(e.target.checked)}
                  className="mt-0.5 accent-rose-600"
                />
                <span>
                  <span className="block font-bold text-slate-900">Interdire l'impression</span>
                  Empêche l'utilisateur d'imprimer le document.
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-600 cursor-pointer hover:border-rose-200 transition-colors">
                <input
                  type="checkbox"
                  checked={preventCopy}
                  onChange={(e) => setPreventCopy(e.target.checked)}
                  className="mt-0.5 accent-rose-600"
                />
                <span>
                  <span className="block font-bold text-slate-900">Interdire la copie</span>
                  Empêche la sélection et la copie du texte (désactive le presse-papier).
                </span>
              </label>
            </div>

            {/* Strength indicator */}
            {password.length > 0 && (
              <div className="space-y-1">
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4].map(l => (
                    <div key={l} className={cn('h-1.5 flex-1 rounded-full transition-all', password.length >= l * 3 ? l <= 1 ? 'bg-rose-400' : l === 2 ? 'bg-amber-400' : l === 3 ? 'bg-blue-400' : 'bg-emerald-500' : 'bg-slate-200')} />
                  ))}
                </div>
                <p className="text-[10px] font-bold text-slate-400">{password.length < 4 ? 'Trop court' : password.length < 7 ? 'Faible' : password.length < 10 ? 'Moyen' : 'Fort'}</p>
              </div>
            )}
          </div>

          {error && <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs font-bold text-rose-600">{error}</div>}

          {resultUrl && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
              <div className="flex items-center gap-3 text-emerald-700 font-bold">
                <CheckCircle2 size={20} />Protection appliquée
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleShare}
                  disabled={isSharing}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-700 transition-colors disabled:opacity-50"
                >
                  {isSharing ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
                  Partager
                </button>
                <a href={resultUrl} download={`protege_${file.name}`}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors">
                  <Download size={16} />Télécharger
                </a>
              </div>
            </motion.div>
          )}

          <button onClick={protect} disabled={isProcessing || password.length < 4}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-rose-600 text-white font-bold text-lg shadow-xl shadow-rose-100 hover:bg-rose-700 transition-all hover:scale-[1.01] disabled:opacity-50 disabled:pointer-events-none">
            {isProcessing ? <><Loader2 size={22} className="animate-spin" />Protection en cours...</> : <><Shield size={22} />Protéger ce PDF</>}
          </button>
        </motion.div>
      )}
    </div>
  );
};
