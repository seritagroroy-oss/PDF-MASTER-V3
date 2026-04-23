import React, { useState, useRef, useEffect } from 'react';
import { Camera, FileDown, Trash2, X, RefreshCw, Plus, Settings2, RotateCw, Contrast, Image as ImageIcon, Crop as CropIcon, FileText, GripVertical, CreditCard, Square, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { PDFDocument } from 'pdf-lib';
import ReactCrop, { type Crop, type PercentCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

export const PDFScanner: React.FC = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [scannedImages, setScannedImages] = useState<{id: string, url: string}[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [showFlash, setShowFlash] = useState(false);
  
  // Edit mode states
  const [editingImageIdx, setEditingImageIdx] = useState<number | null>(null);
  const editCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Crop states
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState<Crop>({ unit: '%', x: 5, y: 5, width: 90, height: 90 });
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const cropImageRef = useRef<HTMLImageElement>(null);

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
    
    // Trigger flash effect
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 150);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Rétablir impérativement les dimensions du canvas de capture
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Limiter la résolution pour la stabilité du canvas (max 2500px)
    let finalWidth = canvas.width;
    let finalHeight = canvas.height;
    const MAX_DIM = 2500;
    
    if (finalWidth > MAX_DIM || finalHeight > MAX_DIM) {
      const ratio = Math.min(MAX_DIM / finalWidth, MAX_DIM / finalHeight);
      finalWidth = finalWidth * ratio;
      finalHeight = finalHeight * ratio;
    }
    
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = finalWidth;
    outputCanvas.height = finalHeight;
    const oCtx = outputCanvas.getContext('2d');
    if (oCtx) {
      oCtx.drawImage(canvas, 0, 0, finalWidth, finalHeight);
      const dataUrl = outputCanvas.toDataURL('image/jpeg', 0.8);
      const id = Date.now().toString(36) + Math.random().toString(36).substring(2);
      setScannedImages(prev => [...prev, { id, url: dataUrl }]);
    }
  };

  const removeImage = (index: number) => {
    setScannedImages(prev => prev.filter((_, i) => i !== index));
  };

  const generatePDF = async () => {
    if (scannedImages.length === 0) return;
    setIsGenerating(true);
    try {
      const pdfDoc = await PDFDocument.create();
      
      for (const imgObj of scannedImages) {
        const imageBytes = await fetch(imgObj.url).then(res => res.arrayBuffer());
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

  // Image Editing Functions
  const openEditor = (idx: number) => {
    setIsCropping(false);
    setEditingImageIdx(idx);
  };

  const drawToEditCanvas = (srcUrl: string, filter?: string) => {
    const canvas = editCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // On s'assure que le canvas prend la taille réelle de l'image
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (filter && filter !== 'none') ctx.filter = filter;
      ctx.drawImage(img, 0, 0);
    };
    img.src = srcUrl;
  };

  // Synchronisation automatique de l'éditeur quand l'image source change
  useEffect(() => {
    if (editingImageIdx !== null && !isCropping && scannedImages[editingImageIdx]) {
      drawToEditCanvas(scannedImages[editingImageIdx].url);
    }
  }, [editingImageIdx, isCropping, scannedImages]);

  const updateCurrentPage = (dataUrl: string) => {
    if (editingImageIdx === null) return;
    setScannedImages(prev => {
      const copy = [...prev];
      if (copy[editingImageIdx!]) {
        copy[editingImageIdx!] = { ...copy[editingImageIdx!], url: dataUrl };
      }
      return copy;
    });
  };

  const applyRotate = () => {
    const canvas = editCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.height;
      canvas.height = img.width;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(90 * Math.PI / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      updateCurrentPage(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = canvas.toDataURL('image/jpeg', 1.0);
  };

  const startCrop = () => {
    const canvas = editCanvasRef.current;
    if (!canvas) return;
    setCropImageSrc(canvas.toDataURL('image/jpeg', 1.0));
    setCrop({ unit: '%', x: 5, y: 5, width: 90, height: 90 });
    setIsCropping(true);
  };

  const confirmCrop = () => {
    const img = cropImageRef.current;
    if (!crop || !img || editingImageIdx === null) {
      setIsCropping(false);
      return;
    }

    // Calcul précis des ratios réels
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;

    const pixelX = crop.unit === '%' ? (crop.x * img.naturalWidth) / 100 : crop.x * scaleX;
    const pixelY = crop.unit === '%' ? (crop.y * img.naturalHeight) / 100 : crop.y * scaleY;
    const pixelW = crop.unit === '%' ? (crop.width * img.naturalWidth) / 100 : crop.width * scaleX;
    const pixelH = crop.unit === '%' ? (crop.height * img.naturalHeight) / 100 : crop.height * scaleY;

    if (pixelW < 1 || pixelH < 1) {
      setIsCropping(false);
      return;
    }

    // Création d'un canvas "mémoire" (Offscreen)
    const offscreen = document.createElement('canvas');
    offscreen.width = pixelW;
    offscreen.height = pixelH;
    const oCtx = offscreen.getContext('2d', { alpha: false });
    
    if (oCtx) {
      oCtx.fillStyle = 'white';
      oCtx.fillRect(0, 0, pixelW, pixelH);
      oCtx.drawImage(img, pixelX, pixelY, pixelW, pixelH, 0, 0, pixelW, pixelH);
      
      const newUrl = offscreen.toDataURL('image/jpeg', 0.75);
      updateCurrentPage(newUrl);
    }
    
    setIsCropping(false);
    setCropImageSrc(null);
  };

  const cancelCrop = () => {
    setIsCropping(false);
    setCropImageSrc(null);
  };

  const applyFormat = (targetRatio: number) => {
    const canvas = editCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      const currentRatio = img.width / img.height;
      
      let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;

      if (currentRatio > targetRatio) {
        const desiredWidth = img.height * targetRatio;
        sx = (img.width - desiredWidth) / 2;
        sWidth = desiredWidth;
      } else {
        const desiredHeight = img.width / targetRatio;
        sy = (img.height - desiredHeight) / 2;
        sHeight = desiredHeight;
      }

      canvas.width = sWidth;
      canvas.height = sHeight;
      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
      updateCurrentPage(canvas.toDataURL('image/jpeg', 0.90));
    };
    img.src = canvas.toDataURL('image/jpeg', 1.0);
  };

  const saveEdit = () => {
    // Les modifications sont maintenant déjà sauvées par chaque outil
    setEditingImageIdx(null);
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
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            playsInline
          />
          
          {/* Document Guide Corners */}
          <div className="absolute inset-x-0 inset-y-10 pointer-events-none p-4 sm:p-8">
            <div className="relative w-full h-full border-2 border-white/5 rounded-[2rem]">
              {/* Corner indicators */}
              <div className="absolute -top-1 -left-1 w-12 h-12 border-t-4 border-l-4 border-indigo-400 rounded-tl-xl" />
              <div className="absolute -top-1 -right-1 w-12 h-12 border-t-4 border-r-4 border-indigo-400 rounded-tr-xl" />
              <div className="absolute -bottom-1 -left-1 w-12 h-12 border-b-4 border-l-4 border-indigo-400 rounded-bl-xl" />
              <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-4 border-r-4 border-indigo-400 rounded-br-xl" />
              
              {/* Center crosshair */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center opacity-40">
                <div className="absolute w-full h-[1px] bg-white" />
                <div className="absolute h-full w-[1px] bg-white" />
              </div>

              {/* Scan line effect */}
              <motion.div 
                className="absolute inset-x-0 h-[2px] bg-indigo-400/50 shadow-[0_0_15px_rgba(129,140,248,0.8)]"
                animate={{ top: ['0%', '100%'] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              />
            </div>
          </div>

          <AnimatePresence>
            {showFlash && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white z-[110]"
              />
            )}
          </AnimatePresence>

          {/* Top Controls */}
          <div className="absolute top-0 inset-x-0 p-6 flex justify-between items-center z-[120] bg-gradient-to-b from-black/60 to-transparent">
            <div className="px-4 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-white text-[10px] sm:text-xs font-bold uppercase tracking-widest leading-none">En direct</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={switchCamera}
                className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-lg rounded-2xl text-white transition-all border border-white/10 active:scale-90"
                title="Changer de caméra"
              >
                <RefreshCw size={22} />
              </button>
              <button
                onClick={stopCamera}
                className="p-3 bg-rose-500/20 hover:bg-rose-500/40 backdrop-blur-lg rounded-2xl text-rose-200 transition-all border border-rose-500/30 active:scale-90"
                title="Fermer la caméra"
              >
                <X size={22} />
              </button>
            </div>
          </div>
          
          {/* Bottom Controls */}
          <div className="absolute inset-x-0 bottom-0 p-8 sm:p-12 flex justify-center items-center z-[120] bg-gradient-to-t from-black/80 via-black/40 to-transparent">
            <div className="w-full max-w-lg flex items-center justify-between">
              {/* Thumbnail Preview */}
              <div
                onClick={() => {
                  if (scannedImages.length > 0) setIsScanning(false);
                }}
                className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border-2 border-white/20 bg-white/5 shadow-2xl transition-transform hover:scale-105 group ${scannedImages.length > 0 ? 'cursor-pointer' : ''}`}
              >
                {scannedImages.length > 0 ? (
                   <>
                     <img src={scannedImages[scannedImages.length - 1].url} className="w-full h-full object-cover" />
                     <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                     <div className="absolute bottom-1 right-1 bg-indigo-600 text-white text-[10px] sm:text-xs font-black px-1.5 py-0.5 rounded-lg shadow-lg">
                       {scannedImages.length}
                     </div>
                   </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/20">
                    <ImageIcon size={24} />
                  </div>
                )}
              </div>

              {/* Capture Button */}
              <button
                onClick={captureFrame}
                className="group relative flex items-center justify-center mx-auto"
              >
                <div className="absolute -inset-4 bg-white/5 rounded-full scale-110 group-active:scale-95 transition-transform duration-200" />
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white p-1 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.3)] group-hover:shadow-[0_0_40px_rgba(255,255,255,0.5)] transition-all">
                  <div className="w-full h-full border-[6px] border-slate-900/5 rounded-full flex items-center justify-center">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-900/5 rounded-full border border-slate-900/10" />
                  </div>
                </div>
              </button>
              
              {/* Info or Settings spacer */}
              <div className="w-14 sm:w-16 flex flex-col items-center opacity-60">
                <Settings2 size={24} className="text-white" />
                <span className="text-[10px] sm:text-xs text-white font-bold uppercase mt-1">Options</span>
              </div>
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
          
          <div className="max-w-2xl mx-auto">
            <Reorder.Group
              axis="y"
              values={scannedImages}
              onReorder={setScannedImages}
              className="flex flex-col gap-3"
            >
              {scannedImages.map((img, idx) => (
                <Reorder.Item
                  key={img.id}
                  value={img}
                  className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-2 sm:p-3 flex items-center gap-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow select-none"
                  whileDrag={{
                    scale: 1.02,
                    zIndex: 50,
                    boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)"
                  }}
                >
                  <div className="text-slate-400 p-2 hover:text-indigo-500 transition-colors">
                    <GripVertical size={20} />
                  </div>
                  
                  <div className="w-12 h-16 sm:w-16 sm:h-20 bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center relative">
                    <img src={img.url} className="max-w-full max-h-full object-contain pointer-events-none" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base">
                      Page {idx + 1}
                    </p>
                  </div>
                  
                  <div className="flex gap-2 mr-2">
                    <button
                      onClick={() => openEditor(idx)}
                      className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg shadow-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                      title="Ajuster"
                    >
                      <Settings2 size={18} />
                    </button>
                    <button
                      onClick={() => removeImage(idx)}
                      className="p-2 bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 rounded-lg shadow-sm hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>
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

      {/* Editor Modal */}
      <AnimatePresence>
        {editingImageIdx !== null && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed inset-0 z-[200] bg-slate-950 flex flex-col"
          >
            <div className="flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
              {isCropping ? (
                <>
                  <button
                    onClick={cancelCrop}
                    className="px-4 py-2 text-slate-400 font-bold hover:text-white transition-colors"
                  >
                    Annuler le recadrage
                  </button>
                  <h3 className="text-white font-bold text-indigo-400 hidden sm:block">Ajustez la zone</h3>
                  <button
                    onClick={confirmCrop}
                    className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    Appliquer le recadrage
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setEditingImageIdx(null)}
                    className="px-4 py-2 text-slate-400 font-bold hover:text-white transition-colors"
                  >
                    Fermer sans valider
                  </button>
                  <h3 className="text-white font-bold hidden sm:block">Ajustements</h3>
                  <button
                    onClick={saveEdit}
                    className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Valider le document
                  </button>
                </>
              )}
            </div>

            <div className="flex-1 overflow-hidden flex flex-col items-center justify-center p-4 bg-black relative">
              {isCropping && cropImageSrc ? (
                <div className="relative flex items-center justify-center w-full h-full min-h-0">
                  <ReactCrop 
                    crop={crop} 
                    onChange={(c) => setCrop(c)}
                    className="max-w-full max-h-full"
                  >
                    <img 
                      ref={cropImageRef} 
                      src={cropImageSrc} 
                      style={{ maxHeight: '70vh', width: 'auto' }}
                      className="bg-white rounded-md shadow-2xl block border-2 border-indigo-500/30" 
                      alt="Aperçu du recadrage"
                    />
                  </ReactCrop>
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-2 rounded-full font-bold text-sm pointer-events-none backdrop-blur-md shadow-2xl z-[300] flex items-center gap-2">
                    <CropIcon size={16} />
                    Glissez les points pour recadrer
                  </div>
                </div>
              ) : (
                <div className="p-4 relative flex items-center justify-center">
                  <canvas 
                    ref={editCanvasRef} 
                    className="max-w-full max-h-[70vh] object-contain bg-white rounded-md shadow-2xl" 
                  />
                </div>
              )}
            </div>

            {!isCropping && (
              <div className="p-4 sm:p-6 bg-slate-900 border-t border-slate-800 flex justify-start sm:justify-center gap-2 sm:gap-6 overflow-x-auto w-full">
                <button
                  onClick={applyRotate}
                  className="flex flex-col items-center gap-2 p-2 sm:p-3 text-slate-400 hover:text-white transition-colors shrink-0"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-800 flex items-center justify-center">
                    <RotateCw size={20} className="sm:w-6 sm:h-6" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold font-display uppercase tracking-wider">Pivoter</span>
                </button>
                
                <button
                  onClick={startCrop}
                  className="flex flex-col items-center gap-2 p-2 sm:p-3 text-emerald-400 hover:text-emerald-300 transition-colors shrink-0"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-900/30 border border-emerald-800/50 flex items-center justify-center shadow-lg shadow-emerald-900/20">
                    <CropIcon size={20} className="sm:w-6 sm:h-6" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold font-display uppercase tracking-wider">Recadrer</span>
                </button>
              
              {/* Formats de documents */}
              {[
                { name: 'A4', ratio: 1 / 1.414, icon: <FileText size={20} className="sm:w-6 sm:h-6" /> },
                { name: 'Letter', ratio: 8.5 / 11, icon: <FileText size={20} className="sm:w-6 sm:h-6" /> },
                { name: 'Legal', ratio: 8.5 / 14, icon: <FileText size={20} className="sm:w-6 sm:h-6" /> },
                { name: 'ID Card', ratio: 1.586, icon: <CreditCard size={20} className="sm:w-6 sm:h-6" /> },
                { name: 'Carré', ratio: 1, icon: <Square size={20} className="sm:w-6 sm:h-6" /> },
              ].map((fmt) => (
                <button
                  key={fmt.name}
                  onClick={() => applyFormat(fmt.ratio)}
                  className="flex flex-col items-center gap-2 p-2 sm:p-3 text-slate-400 hover:text-white transition-colors shrink-0"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-800 flex items-center justify-center">
                    {fmt.icon}
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold font-display uppercase tracking-wider">{fmt.name}</span>
                </button>
              ))}

              <button
                onClick={() => {
                  if (editingImageIdx !== null && scannedImages[editingImageIdx]) {
                    drawToEditCanvas(scannedImages[editingImageIdx].url, 'none');
                    setTimeout(() => {
                      if (editCanvasRef.current) {
                        updateCurrentPage(editCanvasRef.current.toDataURL('image/jpeg', 0.85));
                      }
                    }, 100);
                  }
                }}
                className="flex flex-col items-center gap-2 p-2 sm:p-3 text-slate-400 hover:text-white transition-colors shrink-0"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-800 flex items-center justify-center">
                  <ImageIcon size={20} className="sm:w-6 sm:h-6" />
                </div>
                <span className="text-[10px] sm:text-xs font-bold font-display uppercase tracking-wider">Original</span>
              </button>

              <button
                onClick={() => {
                  if (editingImageIdx !== null && scannedImages[editingImageIdx]) {
                    drawToEditCanvas(scannedImages[editingImageIdx].url, 'grayscale(100%) contrast(150%)');
                    setTimeout(() => {
                      if (editCanvasRef.current) {
                        updateCurrentPage(editCanvasRef.current.toDataURL('image/jpeg', 0.85));
                      }
                    }, 100);
                  }
                }}
                className="flex flex-col items-center gap-2 p-2 sm:p-3 text-slate-400 hover:text-white transition-colors shrink-0"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-800 flex items-center justify-center">
                  <FileDown size={20} className="sm:w-6 sm:h-6" />
                </div>
                <span className="text-[10px] sm:text-xs font-bold font-display uppercase tracking-wider">Noir & Blanc</span>
              </button>

              <button
                onClick={() => {
                  if (editingImageIdx !== null && scannedImages[editingImageIdx]) {
                    drawToEditCanvas(scannedImages[editingImageIdx].url, 'contrast(130%) brightness(110%) saturate(120%)');
                    setTimeout(() => {
                      if (editCanvasRef.current) {
                        updateCurrentPage(editCanvasRef.current.toDataURL('image/jpeg', 0.85));
                      }
                    }, 100);
                  }
                }}
                className="flex flex-col items-center gap-2 p-2 sm:p-3 text-slate-400 hover:text-white transition-colors shrink-0"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-800 flex items-center justify-center">
                  <Contrast size={20} className="sm:w-6 sm:h-6" />
                </div>
                <span className="text-[10px] sm:text-xs font-bold font-display uppercase tracking-wider">Doc Magique</span>
              </button>
            </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
