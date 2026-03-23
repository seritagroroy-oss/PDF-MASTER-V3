import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import Tesseract from 'tesseract.js';
import { ScanText, Upload, FileText, Copy, Loader2, CheckCircle2, Languages, X, Activity } from 'lucide-react';
import { cn } from '../utils/cn';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

export const PDFOCR = () => {
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState('fra'); // Default to French
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f); setExtractedText(''); setProgress(0); setCopied(false);
  };

  const processOCR = async () => {
    if (!file) return;
    setIsProcessing(true); setProgress(0); setExtractedText('');
    
    try {
      setStatus('Chargement du PDF...');
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdf.numPages;
      let fullText = '';

      for (let i = 1; i <= Math.min(totalPages, 10); i++) { // Limit to 10 pages to avoid freezing
        setStatus(`Extraction de la page ${i}/${totalPages}...`);
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 }); // High scale for better OCR
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({ canvasContext: context, viewport } as any).promise;
        const imgData = canvas.toDataURL('image/jpeg', 0.8);

        setStatus(`Analyse OCR (Page ${i})...`);
        const result = await Tesseract.recognize(imgData, language, {
          logger: m => {
            if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100));
          }
        });
        
        fullText += `\n\n--- PAGE ${i} ---\n\n` + result.data.text;
      }

      setExtractedText(fullText.trim());
      setStatus('Reconnaissance terminée !');
    } catch (e: any) {
      setStatus("Erreur lors de l'analyse OCR.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {!file ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f?.type === 'application/pdf') handleFile(f); }}
          onClick={() => inputRef.current?.click()}
          className={cn('group flex flex-col items-center justify-center gap-6 rounded-[2rem] border-2 border-dashed p-16 cursor-pointer transition-all',
            isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/50')}
        >
          <div className={cn('h-16 w-16 rounded-2xl flex items-center justify-center transition-all', isDragging ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500 group-hover:bg-indigo-600 group-hover:text-white')}>
            <ScanText size={32} />
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-slate-900">Scannez un PDF (OCR)</p>
            <p className="mt-1 text-sm text-slate-500">Transformez des images scannées en vrai texte</p>
          </div>
          <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          {/* File Header */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-slate-200 text-slate-600 rounded-xl flex items-center justify-center"><FileText size={18} /></div>
              <div>
                <p className="text-sm font-bold text-slate-700 truncate max-w-[200px]">{file.name}</p>
                <p className="text-xs font-semibold text-slate-400">{(file.size / 1024).toFixed(0)} Ko</p>
              </div>
            </div>
            {!isProcessing && !extractedText && (
              <button onClick={() => setFile(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"><X size={16} /></button>
            )}
          </div>

          {!extractedText ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-1.5"><Languages size={14} />Langue du document</label>
                <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
                  {[ { id: 'fra', l: 'Français' }, { id: 'eng', l: 'Anglais' }, { id: 'spa', l: 'Espagnol' } ].map(lang => (
                    <button key={lang.id} onClick={() => setLanguage(lang.id)}
                      className={cn("flex-1 py-3 rounded-xl text-sm font-bold transition-all", language === lang.id ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:bg-slate-200")}>
                      {lang.l}
                    </button>
                  ))}
                </div>
              </div>

              {isProcessing && (
                <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-100 space-y-3">
                  <div className="flex items-center justify-between text-sm font-bold text-indigo-700">
                    <span className="flex items-center gap-2"><Activity size={16} className="animate-pulse" />{status}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-indigo-200/50 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-xs font-semibold text-indigo-500/70 text-center">Ce processus peut prendre quelques minutes selon votre appareil.</p>
                </div>
              )}

              {!isProcessing && (
                <button onClick={processOCR}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-indigo-600 text-white font-bold text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all hover:scale-[1.01]">
                  <ScanText size={20} />Démarrer l'OCR
                </button>
              )}
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <p className="text-sm font-bold flex items-center gap-1.5 text-emerald-600"><CheckCircle2 size={16} />{status}</p>
                <button onClick={() => { setFile(null); setExtractedText(''); }} className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">Recommencer</button>
              </div>
              <div className="relative group">
                <textarea readOnly value={extractedText}
                  className="w-full h-80 bg-white border border-slate-200 rounded-2xl p-5 text-sm font-medium text-slate-700 leading-relaxed outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all resize-none" />
                <button onClick={async () => { await navigator.clipboard.writeText(extractedText); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  className="absolute top-4 right-4 p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors shadow-sm flex items-center justify-center">
                  {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
};
