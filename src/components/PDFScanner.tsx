import React, { useState, useRef, useEffect } from 'react';
import { Camera, FileDown, Trash2, X, RefreshCw, Plus, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PDFDocument } from 'pdf-lib';

export const PDFScanner: React.FC = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [scannedImages, setScannedImages] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    setError(null);
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      setStream(newStream);
      setIsScanning(true);
    } catch (err: any) {
      console.error(err);
      setError("Impossible d'accéder à la caméra. Vérifiez vos permissions.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsScanning(false);
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  useEffect(() => {
    if (isScanning && facingMode && !stream) {
      startCamera();
    } else if (isScanning && stream) {
      startCamera(); // restart with new facing mode
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(e => console.error(e));
    }
  }, [stream, isScanning]);

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setScannedImages(prev => [...prev, dataUrl]);
  };

  const removeImage = (index: number) => {
    setScannedImages(prev => prev.filter((_, i) => i !== index));
  };

  const generatePDF = async () => {
    if (scannedImages.length === 0) return;
    setIsGenerating(true);
    try {
      const pdfDoc = await PDFDocument.create();
      
      for (const imgUrl of scannedImages) {
        const imageBytes = await fetch(imgUrl).then(res => res.arrayBuffer());
        const image = await pdfDoc.embedJpg(imageBytes);
        
        const { width, height } = image.scaleToFit(595.28, 841.89); // A4 dimensions
        
        const page = pdfDoc.addPage([595.28, 841.89]);
        page.drawImage(image, {
          x: (595.28 - width) / 2,
          y: (841.89 - height) / 2,
          width,
          height,
        });
      }
      
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Document_Scanne_${new Date().getTime()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      setError("Erreur lors de la génération du PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto w-full">
      <div className="text-center space-y-4">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rotate-3">
          <Camera size={40} />
        </div>
        <h2 className="text-4xl font-display font-black text-slate-900 dark:text-white">Scanner de Documents</h2>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto">
          Utilisez l'appareil photo de votre téléphone ou votre webcam pour scanner des documents et les convertir en un fichier PDF propre.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 dark:bg-red-900/20 dark:border-red-900/40 text-center font-bold">
          {error}
        </div>
      )}

      {!isScanning && scannedImages.length === 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 p-12 text-center shadow-xl shadow-slate-200/20 dark:shadow-none">
          <Camera size={64} className="mx-auto text-slate-300 dark:text-slate-600 mb-6" />
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Prêt à scanner ?</h3>
          <p className="text-slate-500 mb-8">Autorisez l'accès à la caméra pour commencer la numérisation.</p>
          <button
            onClick={startCamera}
            className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-indigo-200 dark:shadow-none"
          >
            <Camera size={20} />
            Démarrer la caméra
          </button>
        </div>
      )}

      {isScanning && (
        <div className="bg-slate-900 rounded-[2rem] overflow-hidden relative shadow-2xl">
          <video
            ref={videoRef}
            className="w-full h-[60vh] object-cover bg-black"
            autoPlay
            playsInline
          />
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              onClick={switchCamera}
              className="p-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-white transition-colors"
              title="Changer de caméra"
            >
              <RefreshCw size={24} />
            </button>
            <button
              onClick={stopCamera}
              className="p-3 bg-rose-500/80 hover:bg-rose-500 backdrop-blur-md rounded-xl text-white transition-colors"
              title="Fermer la caméra"
            >
              <X size={24} />
            </button>
          </div>
          
          <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent flex justify-center items-end">
            <div className="w-full max-w-sm flex items-center justify-between">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/20 bg-white/10 shrink-0">
                {scannedImages.length > 0 && (
                   <img src={scannedImages[scannedImages.length - 1]} className="w-full h-full object-cover" />
                )}
                {scannedImages.length > 0 && (
                   <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-bl shadow-md">
                     {scannedImages.length}
                   </div>
                )}
              </div>
              <button
                onClick={captureFrame}
                className="w-20 h-20 bg-white rounded-full flex items-center justify-center border-4 border-slate-300 hover:border-indigo-400 hover:scale-105 active:scale-95 transition-all outline outline-offset-4 outline-white/20"
              >
              </button>
              <div className="w-16 h-16 shrink-0" />
            </div>
          </div>
        </div>
      )}

      {scannedImages.length > 0 && !isScanning && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-display font-bold text-slate-900 dark:text-white">Pages numérisées ({scannedImages.length})</h3>
            <button
              onClick={startCamera}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Plus size={18} />
              Ajouter
            </button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <AnimatePresence>
              {scannedImages.map((img, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="group relative bg-white dark:bg-slate-800 aspect-[3/4] rounded-2xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:border-indigo-400 transition-colors"
                >
                  <img src={img} className="w-full h-full object-cover" />
                  <div className="absolute top-2 left-2 bg-slate-900/80 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm backdrop-blur-sm">
                    Page {idx + 1}
                  </div>
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          
          <div className="flex justify-center pt-8">
            <button
              onClick={generatePDF}
              disabled={isGenerating}
              className="flex items-center gap-3 px-10 py-5 bg-indigo-600 text-white font-black text-lg rounded-2xl hover:bg-indigo-700 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-600/20 active:translate-y-0 disabled:opacity-50 disabled:hover:transform-none"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="animate-spin" size={24} />
                  Génération en cours...
                </>
              ) : (
                <>
                  <FileDown size={24} />
                  Générer le PDF
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Hidden canvas for capturing frames */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
