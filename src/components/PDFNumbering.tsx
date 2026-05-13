import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Layers, FilePlus, Download, CheckCircle2, ChevronRight, Hash, Eye, Settings, Share2, Loader2, ArrowLeft } from 'lucide-react';
import React from 'react';
import { cn } from '../utils/cn';

interface PDFNumberingProps {
  projectId: string;
  onBack: () => void;
  addProject: (name: string, pageCount: number, thumbnailUrl?: string) => string;
  updateProject: (id: string, updates: any) => void;
}

export const PDFNumbering: React.FC<PDFNumberingProps> = ({
  projectId: initialProjectId,
  onBack,
  addProject,
  updateProject
}) => {
  const [projectId, setProjectId] = useState(initialProjectId);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Settings
  const [position, setPosition] = useState<'bottom-center' | 'bottom-right' | 'top-right'>('bottom-right');
  const [format, setFormat] = useState('page-total'); // 'page', 'page-total'
  const [fontSize, setFontSize] = useState(12);
  const [skipCoverPage, setSkipCoverPage] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (f: File) => {
    setFile(f); setResultUrl(null);

    // Auto-register project when files are uploaded
    if (projectId === 'new') {
      console.log('[PDFNumbering] Registering new project...');
      const newId = addProject(f.name, 1, ''); 
      setProjectId(newId);
    }
  };

  const processNumbering = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      const pages = pdfDoc.getPages();
      const totalPages = pages.length;

      const startIndex = skipCoverPage ? 1 : 0;
      const effectiveTotal = skipCoverPage ? totalPages - 1 : totalPages;

      pages.forEach((page, idx) => {
        if (skipCoverPage && idx === 0) return; // Skip cover page

        const pageNum = skipCoverPage ? idx : idx + 1;
        const text = format === 'page-total' ? `Page ${pageNum} sur ${effectiveTotal}` : `${pageNum}`;
        const textSize = fontSize;
        const textWidth = helveticaFont.widthOfTextAtSize(text, textSize);
        const { width, height } = page.getSize();
        
        let x = 0;
        let y = 0;

        switch (position) {
          case 'bottom-center':
            x = (width - textWidth) / 2; y = 30; break;
          case 'bottom-right':
            x = width - textWidth - 30; y = 30; break;
          case 'top-right':
            x = width - textWidth - 30; y = height - 40; break;
        }

        page.drawText(text, {
          x,
          y,
          size: textSize,
          font: helveticaFont,
          color: rgb(0.3, 0.3, 0.3), // Gris foncé elegant
        });
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      setResultUrl(URL.createObjectURL(blob));
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la numérotation.');
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
      const shareFile = new File([blob], file.name.replace('.pdf', '_numeroté.pdf'), { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [shareFile] })) {
        await navigator.share({
          files: [shareFile],
          title: 'PDF Numéroté',
          text: 'Voici mon PDF numéroté via PDF Master',
        });
      } else {
        await navigator.share({
          title: 'PDF Numéroté',
          text: `Document numéroté : ${file.name}`,
          url: window.location.href,
        });
      }
    } catch (e) {
      console.error('Sharing failed', e);
    } finally {
      setIsSharing(false);
    }
  };

  const downloadName = file ? file.name.replace('.pdf', '_numeroté.pdf') : 'document_numeroté.pdf';

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
           <h2 className="text-xl font-bold text-slate-900">Numéroter votre PDF</h2>
        </div>
      </div>
      {!file ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f?.type === 'application/pdf') handleFile(f); }}
          className={cn('relative group flex flex-col items-center justify-center gap-6 rounded-[2rem] border-2 border-dashed p-16 cursor-pointer transition-all',
            isDragging ? 'border-indigo-600 bg-indigo-50' : 'border-indigo-200 bg-slate-50 hover:border-indigo-500 hover:bg-indigo-50/30')}
        >
          <input type="file" accept=".pdf" className="absolute inset-0 opacity-0 cursor-pointer z-20" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
          <div className={cn('relative z-10 h-16 w-16 rounded-2xl flex items-center justify-center transition-all pointer-events-none', isDragging ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500 group-hover:bg-indigo-600 group-hover:text-white')}>
            <Hash size={32} />
          </div>
          <div className="relative z-10 text-center pointer-events-none">
            <p className="text-xl font-bold text-slate-900">Numérotez votre PDF</p>
            <p className="mt-1 text-sm text-slate-500">Ajoutez les numéros de pages instantanément</p>
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400"><Hash size={20} /></div>
              <div>
                <p className="font-bold text-slate-700 max-w-[200px] sm:max-w-md truncate">{file.name}</p>
                <p className="text-xs font-semibold text-slate-400">PDF prêt pour la numérotation</p>
              </div>
            </div>
            {!resultUrl && (
              <button onClick={() => setFile(null)} className="text-slate-400 hover:text-rose-500 font-bold text-sm px-4 py-2 bg-slate-50 hover:bg-rose-50 rounded-xl transition-all">
                Annuler
              </button>
            )}
          </div>

          {!resultUrl ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4 p-6 bg-white border border-slate-100 shadow-sm rounded-2xl">
                <h3 className="font-bold flex items-center gap-2 text-slate-700"><Settings size={18} /> Configuration</h3>
                
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Position</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'bottom-right', label: 'En bas à droite' },
                      { id: 'bottom-center', label: 'En bas au centre' },
                      { id: 'top-right', label: 'En haut à droite' }
                    ].map(p => (
                      <button key={p.id} onClick={() => setPosition(p.id as any)}
                        className={cn("p-3 rounded-xl border-2 text-sm font-bold transition-all", position === p.id ? "border-indigo-600 text-indigo-700 bg-indigo-50" : "border-slate-100 text-slate-500 hover:border-slate-300")}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-4">Style</p>
                  <div className="flex gap-2">
                    <button onClick={() => setFormat('page')} className={cn("p-3 rounded-xl border-2 flex-1 text-sm font-bold transition-all", format === 'page' ? "border-indigo-600 text-indigo-700 bg-indigo-50" : "border-slate-100 text-slate-500 hover:border-slate-300")}>
                      "1", "2"...
                    </button>
                    <button onClick={() => setFormat('page-total')} className={cn("p-3 rounded-xl border-2 flex-1 text-sm font-bold transition-all", format === 'page-total' ? "border-indigo-600 text-indigo-700 bg-indigo-50" : "border-slate-100 text-slate-500 hover:border-slate-300")}>
                      "Page 1 sur 10"
                    </button>
                  </div>
                </div>

                <label className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm text-slate-600 cursor-pointer mt-4">
                  <input
                    type="checkbox"
                    checked={skipCoverPage}
                    onChange={(e) => setSkipCoverPage(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block font-bold text-slate-900">Exclure la page de garde</span>
                    La numérotation commencera à 1 sur la deuxième page.
                  </span>
                </label>

                <button onClick={processNumbering} disabled={isProcessing}
                  className="w-full mt-4 flex items-center justify-center gap-2 py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all disabled:opacity-50">
                  <Hash size={20} />
                  {isProcessing ? 'Application...' : 'Numéroter le PDF'}
                </button>
              </div>

              {/* Aperçu visuel ludique */}
              <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col items-center justify-center">
                <div className="relative w-48 h-64 bg-white border-2 border-slate-200 rounded-lg shadow-md flex items-center justify-center text-slate-200">
                  <span className="text-4xl font-black">PDF</span>
                  {/* Fake number preview */}
                  {position === 'bottom-right' && <div className="absolute bottom-4 right-4 text-xs font-bold text-slate-400 bg-indigo-100 text-indigo-700 px-1 py-0.5 rounded animate-pulse">{format === 'page-total' ? 'Page 1 sur X' : '1'}</div>}
                  {position === 'bottom-center' && <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-400 bg-indigo-100 text-indigo-700 px-1 py-0.5 rounded animate-pulse">{format === 'page-total' ? 'Page 1 sur X' : '1'}</div>}
                  {position === 'top-right' && <div className="absolute top-4 right-4 text-xs font-bold text-slate-400 bg-indigo-100 text-indigo-700 px-1 py-0.5 rounded animate-pulse">{format === 'page-total' ? 'Page 1 sur X' : '1'}</div>}
                </div>
                <p className="mt-4 text-sm font-semibold text-slate-400 flex items-center gap-2"><Eye size={16} />Aperçu en temps réel</p>
              </div>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center p-12 bg-white border border-slate-100 shadow-sm rounded-2xl text-center">
              <div className="h-20 w-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-sm"><CheckCircle2 size={40} /></div>
              <h3 className="text-2xl font-black text-slate-900">Numérotation réussie !</h3>
              <p className="text-slate-500 mt-2">Votre document est parfaitement numéroté.</p>
              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <a href={resultUrl} download={downloadName} className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 shadow-md transition-all hover:-translate-y-1">
                  <Download size={20} />Télécharger
                </a>
                <button
                  onClick={handleShare}
                  disabled={isSharing}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 shadow-md transition-all hover:-translate-y-1 disabled:opacity-50"
                >
                  {isSharing ? <Loader2 size={20} className="animate-spin" /> : <Share2 size={20} />}
                  Partager
                </button>
                <button onClick={() => { setFile(null); setResultUrl(null); }} className="px-6 py-3 font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">
                  Nouveau fichier
                </button>
              </div>
            </motion.div>
          )}

        </motion.div>
      )}
    </div>
  );
};
