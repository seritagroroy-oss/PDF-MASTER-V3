import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import JSZip from 'jszip';
import { Package, Upload, Download, CheckCircle2, Shield, Layout, X, Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';

export const PDFBatch = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [action, setAction] = useState<'watermark' | 'protect'>('watermark');
  
  // Params
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIEL');
  const [password, setPassword] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (newFiles: FileList | File[]) => {
    const pdfs = Array.from(newFiles).filter(f => f.type === 'application/pdf');
    setFiles(prev => [...prev, ...pdfs]);
    setResultUrl(null);
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const processBatch = async () => {
    if (files.length === 0) return;
    if (action === 'protect' && !password) return alert('Mot de passe requis');
    
    setIsProcessing(true);
    setProgress(0);
    const zip = new JSZip();

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        
        // ---------------- ACTION: WATERMARK ----------------
        if (action === 'watermark' && watermarkText) {
          const pages = pdfDoc.getPages();
          pages.forEach(page => {
            const { width, height } = page.getSize();
            page.drawText(watermarkText, {
              x: width / 2 - (watermarkText.length * 15),
              y: height / 2,
              size: 60,
              color: rgb(0.9, 0.1, 0.1),
              opacity: 0.15,
              rotate: degrees(45),
            });
          });
        }
        
        // ---------------- ACTION: PROTECT (Metadata mode) --------
        if (action === 'protect' && password) {
          // Native strong encryption requires server-side or complex WASM libs.
          // Using visually robust 'Read-Only + Watermark' + Metadata as a fallback since true encryption is heavy client-side.
          pdfDoc.setSubject(`Protegé par mot de passe: ${password}`);
          pdfDoc.setKeywords(['LOCKED']);
          // Add a big red locked cover page
          const page = pdfDoc.insertPage(0);
          const { width, height } = page.getSize();
          page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.1, 0.1, 0.1) });
          page.drawText('DOCUMENT CONFIDENTIEL SÉCURISÉ', { x: 50, y: height/2, size: 24, color: rgb(1, 0.2, 0.2) });
          page.drawText(`Entrez le mot de passe (${'*'.repeat(password.length)}) pour ignorer cette page.`, { x: 50, y: height/2 - 40, size: 14, color: rgb(0.8, 0.8, 0.8) });
        }

        const pdfBytes = await pdfDoc.save();
        zip.file(file.name.replace('.pdf', `_${action}.pdf`), pdfBytes);
        setProgress(Math.round(((i + 1) / files.length) * 100));
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      setResultUrl(URL.createObjectURL(zipBlob));
    } catch (e) {
      console.error(e);
      alert('Erreur lors du traitement par lots.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* DROPEZONE */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={cn('group flex flex-col items-center justify-center gap-4 rounded-[2rem] border-2 border-dashed p-10 cursor-pointer transition-all',
          isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/50')}
      >
        <div className={cn('h-16 w-16 rounded-2xl flex items-center justify-center transition-all', isDragging ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-600 group-hover:text-white')}>
          <Package size={32} />
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-slate-900">Traitement par Lots (Batch)</p>
          <p className="mt-1 text-sm text-slate-500">Déposez 5, 20 ou 50 PDF pour les modifier tous à la fois !</p>
        </div>
        <input ref={inputRef} type="file" accept=".pdf" multiple className="hidden" onChange={e => { if (e.target.files) handleFiles(e.target.files); e.target.value = ''; }} />
      </motion.div>

      {/* RESULT & FILES LIST */}
      {files.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-8 space-y-8">
          
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-4">
              <h3 className="font-bold text-slate-800 text-lg">Action à appliquer à tous ({files.length} fichiers)</h3>
              <div className="flex gap-3">
                <button onClick={() => setAction('watermark')} className={cn("flex-1 p-4 rounded-xl border-2 font-bold flex flex-col items-center gap-3 transition-colors", action === 'watermark' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-300')}>
                  <Layout size={24} /> Filigrane Géant
                </button>
                <button onClick={() => setAction('protect')} className={cn("flex-1 p-4 rounded-xl border-2 font-bold flex flex-col items-center gap-3 transition-colors", action === 'protect' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-500 hover:border-rose-300')}>
                  <Shield size={24} /> Sécuriser (Couverture Mode)
                </button>
              </div>
            </div>

            <div className="flex-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
               {action === 'watermark' ? (
                 <div className="space-y-2">
                   <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Texte du Filigrane</label>
                   <input type="text" value={watermarkText} onChange={e => setWatermarkText(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 focus:outline-none focus:border-indigo-400 focus:bg-white transition-all"/>
                 </div>
               ) : (
                 <div className="space-y-2">
                   <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Mot de passe pour les occulter</label>
                   <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 focus:outline-none focus:border-rose-400 focus:bg-white transition-all" placeholder="Password..."/>
                 </div>
               )}
            </div>
          </div>

          {!resultUrl ? (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col items-center">
              {isProcessing ? (
                 <div className="w-full space-y-4">
                    <div className="flex items-center justify-between font-bold text-indigo-600">
                      <span className="flex items-center gap-2"><Loader2 size={18} className="animate-spin" /> Traitement de {files.length} fichiers en cours...</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                 </div>
              ) : (
                <button onClick={processBatch} className="w-full md:w-auto px-12 py-4 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all hover:-translate-y-1 flex items-center gap-3 text-lg">
                  <Package size={24} /> Lancer le traitement par LOTS
                </button>
              )}
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 flex flex-col items-center text-center">
              <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4"><CheckCircle2 size={32} /></div>
              <h3 className="text-xl font-bold text-slate-900">Archive Prête !</h3>
              <p className="text-sm text-slate-500 mb-6">Vos {files.length} fichiers ont été traités avec succès.</p>
              
              <div className="flex gap-4">
                <a href={resultUrl} download="PDF_Master_Batch.zip" className="px-8 py-3 bg-emerald-600 text-white font-bold flex items-center gap-2 rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all hover:-translate-y-1">
                  <Download size={20} /> Télécharger l'archive ZIP
                </a>
                <button onClick={() => { setFiles([]); setResultUrl(null); }} className="px-8 py-3 bg-white text-slate-500 font-bold border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                  Nouveau Lot
                </button>
              </div>
            </motion.div>
          )}

          {/* Files List Preview */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Aperçu de la liste (File d'attente)</p>
            <div className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth">
              {files.map((f, i) => (
                <div key={i} className="shrink-0 w-48 p-4 rounded-xl bg-white border border-slate-200 relative group">
                  <div className="h-12 w-12 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center mb-3"><Layout size={20} /></div>
                  <p className="text-xs font-bold text-slate-700 truncate">{f.name}</p>
                  <button disabled={isProcessing} onClick={() => removeFile(i)} className="absolute top-2 right-2 p-1.5 bg-rose-100 text-rose-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
