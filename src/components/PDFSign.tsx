import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { FileUpload } from './FileUpload';
import { PenTool, Download, Loader2, CheckCircle2, AlertCircle, RefreshCw, Type, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SignaturePad from 'signature_pad';

export const PDFSign: React.FC = () => {
  const [files, setFiles] = useState<any[]>([]);
  const [rawFiles, setRawFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [signerName, setSignerName] = useState('');
  const [signDate, setSignDate] = useState(new Date().toISOString().split('T')[0]);
  const [applyToAllPages, setApplyToAllPages] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);

  useEffect(() => {
    if (canvasRef.current && rawFiles.length > 0 && !resultUrl) {
      const canvas = canvasRef.current;
      // Handle high DPI displays
      const ratio =  Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext("2d")?.scale(ratio, ratio);

      signaturePadRef.current = new SignaturePad(canvas, {
        penColor: 'rgb(17, 24, 39)', // slate-900
        backgroundColor: 'rgba(255, 255, 255, 0)',
      });
    }
    
    return () => {
      signaturePadRef.current?.off();
    };
  }, [rawFiles, resultUrl]);

  const clearSignature = () => {
    signaturePadRef.current?.clear();
  };

  const processPDF = async () => {
    if (rawFiles.length === 0) return;
    
    const isPadEmpty = signaturePadRef.current?.isEmpty() ?? true;
    if (isPadEmpty && !signerName) {
      setError("Veuillez soit dessiner une signature, soit saisir un nom.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResultUrl(null);

    try {
      const file = rawFiles[0];
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

      let signatureImage: any = null;
      if (!isPadEmpty && signaturePadRef.current) {
        const sigDataUrl = signaturePadRef.current.toDataURL('image/png');
        const imgBytes = await fetch(sigDataUrl).then(res => res.arrayBuffer());
        signatureImage = await pdfDoc.embedPng(imgBytes);
      }

      const pages = pdfDoc.getPages();
      const targetPages = applyToAllPages ? pages : [pages[pages.length - 1]];

      for (const page of targetPages) {
        const { width, height } = page.getSize();
        let currentY = 100; // start drawing near bottom right

        if (signatureImage) {
          const sigDims = signatureImage.scale(0.3);
          page.drawImage(signatureImage, {
            x: width - sigDims.width - 50,
            y: currentY,
            width: sigDims.width,
            height: sigDims.height,
          });
          currentY += sigDims.height + 20;
        }

        if (signerName) {
          page.drawText(`Lu et approuvé, ${signerName}`, {
            x: width - 250,
            y: currentY,
            size: 14,
            font: font,
            color: rgb(0.1, 0.1, 0.2),
          });
          currentY += 20;
        }

        if (signDate) {
          const dateStr = new Date(signDate).toLocaleDateString('fr-FR');
          page.drawText(`Le ${dateStr}`, {
            x: width - 250,
            y: currentY,
            size: 12,
            font: regularFont,
            color: rgb(0.3, 0.3, 0.4),
          });
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      setResultUrl(URL.createObjectURL(blob));

    } catch (err: any) {
      console.error(err);
      setError("Une erreur s'est produite lors de la signature.");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = () => {
    if (!resultUrl) return;
    const link = document.createElement('a');
    link.href = resultUrl;
    link.download = `Document_Signe.pdf`;
    link.click();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-display font-bold text-slate-900 dark:text-white flex items-center justify-center gap-3">
          <PenTool size={32} className="text-indigo-600 dark:text-indigo-400" />
          Signer un PDF
        </h2>
        <p className="text-slate-500 max-w-2xl mx-auto">
          Apposez votre signature manuscrite logicielle, ajoutez votre nom et la date en bas de votre document. Parfait pour les contrats et devis.
        </p>
      </div>

      <FileUpload
        files={files.slice(0, 1)}
        setFiles={(val) => setFiles(typeof val === 'function' ? (prev) => val(prev).slice(0, 1) : val.slice(0, 1))}
        onFilesChange={(newFiles) => setRawFiles(newFiles.slice(0, 1))}
      />

      {rawFiles.length > 0 && !resultUrl && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="space-y-6 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <Type size={20} className="text-indigo-500" />
              Informations Textuelles
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nom du signataire</label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Jean Dupont"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Calendar size={16} /> Date de signature
                </label>
                <input
                  type="date"
                  value={signDate}
                  onChange={(e) => setSignDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-4 py-3 outline-none focus:border-indigo-500"
                />
              </div>
              <label className="flex items-start gap-3 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-4 text-sm text-slate-600 dark:text-slate-400 mt-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyToAllPages}
                  onChange={(e) => setApplyToAllPages(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  <span className="block font-bold text-slate-900 dark:text-white mb-1">Signer toutes les pages</span>
                  Par défaut, la signature s'applique uniquement sur la dernière page.
                </span>
              </label>
            </div>
          </div>

          <div className="space-y-6 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <PenTool size={20} className="text-indigo-500" />
                Signature Manuscrite
              </h3>
              <button 
                onClick={clearSignature}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-bold"
              >
                Effacer
              </button>
            </div>
            <div className="flex-1 bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 relative overflow-hidden group min-h-[200px]">
              <canvas
                ref={canvasRef}
                className="w-full h-full cursor-crosshair touch-none"
                style={{ touchAction: 'none' }} // Prevent scrolling when signing on mobile
              />
              <div className="absolute top-4 left-4 text-slate-300 dark:text-slate-600 font-bold text-xs pointer-events-none select-none">
                Signez ci-dessous
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-center justify-center gap-3 font-bold text-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {rawFiles.length > 0 && !resultUrl && (
        <div className="flex justify-center pt-4">
          <button
            onClick={processPDF}
            disabled={isProcessing}
            className="flex items-center justify-center gap-2 px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-lg transition-all hover:-translate-y-1 shadow-xl shadow-indigo-200 disabled:opacity-50 disabled:hover:transform-none"
          >
            {isProcessing ? (
              <><Loader2 className="animate-spin" size={24} /> Application en cours...</>
            ) : (
              <><PenTool size={24} /> Appliquer la Signature</>
            )}
          </button>
        </div>
      )}

      {resultUrl && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full p-8 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 rounded-3xl text-center space-y-6"
        >
          <div className="mx-auto w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center">
            <CheckCircle2 size={32} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Document signé avec succès !</h3>
            <p className="text-slate-500 mt-2">Votre signature a été apposée sur le document.</p>
          </div>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => { setRawFiles([]); setFiles([]); setResultUrl(null); }}
              className="px-6 py-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Nouveau document
            </button>
            <button
              onClick={downloadResult}
              className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-transform hover:scale-105 shadow-xl shadow-emerald-600/20"
            >
              <Download size={20} />
              Télécharger
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
