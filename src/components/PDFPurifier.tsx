import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, Download, Loader2, Sparkles, CheckCircle2, Shield, AlertCircle } from 'lucide-react';
import { pdfjs } from '../pdfjs-setup';
import { PDFDocument } from 'pdf-lib';
import { cn } from '../utils/cn';

export const PDFPurifier = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [contrast, setContrast] = useState(1.2);
  const [brightness, setBrightness] = useState(1.1);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const processPDF = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgress(0);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const outPdf = await PDFDocument.create();

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context!, viewport }).promise;

        // Apply filters
        if (context) {
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          for (let j = 0; j < data.length; j += 4) {
            // Contrast & Brightness
            for (let k = 0; k < 3; k++) {
              data[j+k] = ( (data[j+k] / 255.0 - 0.5) * contrast + 0.5) * 255.0 * brightness;
            }
          }
          context.putImageData(imageData, 0, 0);
        }

        const imgUrl = canvas.toDataURL('image/jpeg', 0.85);
        const img = await outPdf.embedJpg(imgUrl);
        const outPage = outPdf.addPage([viewport.width, viewport.height]);
        outPage.drawImage(img, { x: 0, y: 0, width: viewport.width, height: viewport.height });

        setProgress(Math.round((i / pdf.numPages) * 100));
      }

      const outBytes = await outPdf.save();
      const blob = new Blob([outBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `purified_${file.name}`;
      link.click();
      setIsDone(true);
    } catch (error) {
      console.error(error);
      alert("Erreur lors du traitement du PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 border border-indigo-50">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-14 w-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <Sparkles size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-display font-black text-slate-900">Purificateur de Scan</h2>
            <p className="text-slate-500 font-medium">Blanchit le fond et améliore le contraste de vos documents scannés.</p>
          </div>
        </div>

        {!file ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="group cursor-pointer border-2 border-dashed border-slate-200 rounded-[2rem] p-16 text-center hover:border-indigo-500 hover:bg-slate-50 transition-all"
          >
            <div className="h-20 w-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
              <Upload size={32} />
            </div>
            <p className="text-xl font-bold text-slate-900">Cliquez pour importer un PDF scanné</p>
            <p className="text-slate-500 mt-2">Format PDF uniquement (max 50 pages conseillé)</p>
            <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFile} />
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-3xl border border-slate-100">
              <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center text-indigo-600 border border-slate-200">
                <FileText size={24} />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="font-bold text-slate-900 truncate">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button onClick={() => setFile(null)} className="text-slate-400 hover:text-rose-500 font-bold text-sm px-4">Changer</button>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <label className="text-sm font-bold text-slate-700 flex justify-between">
                  <span>Intensité du contraste</span>
                  <span className="text-indigo-600">x{contrast.toFixed(1)}</span>
                </label>
                <input 
                  type="range" min="1" max="2" step="0.1" value={contrast} 
                  onChange={(e) => setContrast(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
              <div className="space-y-4">
                <label className="text-sm font-bold text-slate-700 flex justify-between">
                  <span>Luminosité du fond</span>
                  <span className="text-indigo-600">x{brightness.toFixed(1)}</span>
                </label>
                <input 
                  type="range" min="1" max="1.5" step="0.05" value={brightness} 
                  onChange={(e) => setBrightness(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            </div>

            <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-3xl flex items-start gap-4">
              <div className="h-10 w-10 shrink-0 bg-indigo-600 text-white rounded-full flex items-center justify-center">
                <AlertCircle size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-indigo-900">Conseil de traitement</p>
                <p className="text-xs text-indigo-700 mt-1 leading-relaxed">
                  Cet outil va parcourir chaque page pour blanchir l'arrière-plan et assombrir le texte. 
                  C'est idéal pour les documents administratifs scannés qui sont difficiles à lire ou à imprimer.
                </p>
              </div>
            </div>

            {!isProcessing ? (
              <button 
                onClick={processPDF}
                className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-3xl font-black text-xl flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {isDone ? <CheckCircle2 size={24} /> : <Sparkles size={24} />}
                {isDone ? 'Traitement terminé' : 'Purifier mon document'}
              </button>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-bold text-indigo-600">Traitement en cours...</span>
                  <span className="text-2xl font-black text-slate-900">{progress}%</span>
                </div>
                <div className="h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-gradient-to-r from-indigo-600 to-violet-600"
                  />
                </div>
                <div className="flex justify-center items-center gap-2 text-slate-400">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-xs font-medium">Ne fermez pas cette page, le travail se fait sur votre appareil.</span>
                </div>
              </div>
            )}
          </div>
        )}

        {isDone && (
          <div className="mt-8 flex items-center gap-3 justify-center text-emerald-600 font-bold bg-emerald-50 py-3 rounded-2xl border border-emerald-100">
            <CheckCircle2 size={18} />
            Votre PDF a été téléchargé avec succès !
          </div>
        )}
      </div>

      <div className="mt-12 grid grid-cols-2 gap-6">
        <div className="p-6 bg-slate-900 rounded-[2rem] text-white">
          <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-white mb-4">
            <Shield size={20} />
          </div>
          <h3 className="font-bold mb-2">Respect de la vie privée</h3>
          <p className="text-xs text-slate-400 leading-relaxed">Aucun document n'est envoyé sur nos serveurs. Tout le traitement se passe directement dans votre navigateur.</p>
        </div>
        <div className="p-6 bg-indigo-50 rounded-[2rem] border border-indigo-100">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white mb-4">
            <Sparkles size={20} />
          </div>
          <h3 className="font-bold text-slate-900 mb-2">Magie du contraste</h3>
          <p className="text-xs text-slate-500 leading-relaxed">Cet outil est parfait pour transformer les scans grisâtres en documents nets prêts pour l'impression finale.</p>
        </div>
      </div>
    </div>
  );
};
