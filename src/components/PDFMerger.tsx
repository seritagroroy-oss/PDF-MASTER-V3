import React, { useState, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import { pdfjs } from '../pdfjs-setup';
import { FileUpload } from './FileUpload';
import { Combine, Download, Loader2, CheckCircle2, AlertCircle, FileText, Edit3, Eye, X, ZoomIn, ZoomOut, Maximize2, Minimize2, Filter, Search, Calendar, HardDrive, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils/cn';


export const PDFMerger: React.FC = () => {
  const [files, setFiles] = useState<any[]>([]);
  const [rawFiles, setRawFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customFilename, setCustomFilename] = useState("fusion_document");
  const [showPreview, setShowPreview] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [isRenderingPreview, setIsRenderingPreview] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [previewZoom, setPreviewZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [nameFilter, setNameFilter] = useState("");
  const [minSize, setMinSize] = useState<number | "">("");
  const [maxSize, setMaxSize] = useState<number | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reverseOrder, setReverseOrder] = useState(false);
  const [insertSeparatorPage, setInsertSeparatorPage] = useState(false);

  const filteredFiles = files.filter(item => {
    const nameMatch = item.name.toLowerCase().includes(nameFilter.toLowerCase());
    const sizeMatch = (minSize === "" || item.file.size >= minSize * 1024) &&
      (maxSize === "" || item.file.size <= maxSize * 1024);

    const fileDate = new Date(item.file.lastModified);
    const startMatch = !startDate || fileDate >= new Date(startDate);

    // Set endDate to the end of the day (23:59:59.999)
    let endMatch = true;
    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      endMatch = fileDate <= endDateTime;
    }

    return nameMatch && sizeMatch && startMatch && endMatch;
  });

  const mergeCandidates = reverseOrder ? [...filteredFiles].reverse() : filteredFiles;

  useEffect(() => {
    if (showPreview && resultUrl && previewImages.length === 0) {
      renderPreview();
    }
  }, [showPreview, resultUrl]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showPreview) return;

      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          setShowPreview(false);
        }
      }

      if (e.key.toLowerCase() === 'f') {
        setIsFullscreen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPreview, isFullscreen]);

  const renderPreview = async () => {
    if (!resultUrl) return;

    setIsRenderingPreview(true);
    setLoadingProgress(0);
    try {
      const response = await fetch(resultUrl);
      const data = await response.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;
      const images: string[] = [];

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        // Higher scale for better quality on large screens
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) continue;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport,
          canvas: canvas
        }).promise;

        images.push(canvas.toDataURL('image/jpeg', 0.9));
        setLoadingProgress(Math.round((i / numPages) * 100));
      }
      setPreviewImages(images);
    } catch (err) {
      console.error("Error rendering preview:", err);
    } finally {
      setIsRenderingPreview(false);
    }
  };

  const mergePDFs = async () => {
    if (mergeCandidates.length < 2) {
      setError("Veuillez sélectionner au moins deux fichiers (après filtrage) à fusionner.");
      return;
    }

    setIsProcessing(true);
    setLoadingProgress(0);
    setError(null);
    setResultUrl(null);

    try {
      const mergedPdf = await PDFDocument.create();

      for (let i = 0; i < mergeCandidates.length; i++) {
        const item = mergeCandidates[i];
        const arrayBuffer = await item.file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
        if (insertSeparatorPage && i < mergeCandidates.length - 1) {
          mergedPdf.addPage();
        }
        setLoadingProgress(Math.round(((i + 1) / mergeCandidates.length) * 100));
      }

      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setPreviewImages([]); // Reset preview images for new result
    } catch (err) {
      console.error(err);
      setError("Une erreur est survenue lors de la fusion des fichiers. Assurez-vous que les fichiers ne sont pas corrompus.");
    } finally {
      setIsProcessing(false);
      setLoadingProgress(100);
    }
  };

  const downloadResult = () => {
    if (resultUrl) {
      const link = document.createElement('a');
      link.href = resultUrl;
      const filename = customFilename.trim() || "fusion_document";
      link.download = `${filename.endsWith('.pdf') ? filename : filename + '.pdf'}`;
      link.click();
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <AnimatePresence>
        {(isProcessing || (isRenderingPreview && !showPreview)) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          >
            <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full space-y-6 text-center">
              <div className="relative inline-block">
                <Loader2 className="animate-spin text-indigo-600" size={64} />
                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-indigo-600">
                  {loadingProgress}%
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-900">
                  {isProcessing ? "Fusion des fichiers" : "Préparation de l'aperçu"}
                </h3>
                <p className="text-sm text-slate-500">
                  {isProcessing
                    ? "Nous combinons vos documents PDF..."
                    : "Nous générons les images pour l'aperçu haute résolution..."}
                </p>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-indigo-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${loadingProgress}%` }}
                  transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="text-center space-y-2">
        <h2 className="text-3xl font-display font-bold text-slate-900">Fusionner des PDFs</h2>
        <p className="text-slate-500">Combinez plusieurs fichiers PDF en un seul document professionnel en quelques secondes.</p>
      </div>

      <FileUpload
        files={files}
        setFiles={setFiles}
        onFilesChange={setRawFiles}
        selectedIds={new Set(filteredFiles.map(f => f.id))}
      />

      {files.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
        >
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Filter size={18} />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-slate-900">Options de filtrage</h3>
                <p className="text-xs text-slate-500">
                  {filteredFiles.length} / {files.length} fichiers sélectionnés
                </p>
              </div>
            </div>
            {showFilters ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
          </button>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-slate-100 bg-slate-50/50"
              >
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name Filter */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <Search size={14} /> Nom du fichier
                    </label>
                    <input
                      type="text"
                      value={nameFilter}
                      onChange={(e) => setNameFilter(e.target.value)}
                      placeholder="Rechercher par nom..."
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                    />
                  </div>

                  {/* Size Filter */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <HardDrive size={14} /> Taille (KB)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={minSize}
                        onChange={(e) => setMinSize(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="Min"
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                      />
                      <span className="text-slate-400">-</span>
                      <input
                        type="number"
                        value={maxSize}
                        onChange={(e) => setMaxSize(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="Max"
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                      />
                    </div>
                  </div>

                  {/* Date Filter */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <Calendar size={14} /> Date de modification
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 min-w-[30px]">Du</span>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 min-w-[30px]">Au</span>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-6 pb-6 flex justify-end">
                  <button
                    onClick={() => {
                      setNameFilter("");
                      setMinSize("");
                      setMaxSize("");
                      setStartDate("");
                      setEndDate("");
                    }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline transition-all"
                  >
                    Réinitialiser les filtres
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {mergeCandidates.length >= 2 && !resultUrl && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5"
        >
          <div className="flex items-center gap-2 text-slate-700 font-bold">
            <Edit3 size={18} className="text-indigo-600" />
            <h3>Nom du fichier de sortie</h3>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <FileText size={18} className="text-slate-400" />
            </div>
            <input
              type="text"
              value={customFilename}
              onChange={(e) => setCustomFilename(e.target.value)}
              placeholder="Entrez le nom du fichier..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium text-slate-700"
            />
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
              <span className="text-slate-400 font-bold text-sm">.pdf</span>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={reverseOrder}
                onChange={(e) => setReverseOrder(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                <span className="block font-bold text-slate-900">Inverser l’ordre</span>
                Fusionne les fichiers retenus du dernier au premier.
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={insertSeparatorPage}
                onChange={(e) => setInsertSeparatorPage(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                <span className="block font-bold text-slate-900">Insérer une page blanche</span>
                Ajoute une page vide entre chaque document lors de la fusion.
              </span>
            </label>
          </div>
        </motion.div>
      )}

      <div className="flex flex-col items-center gap-4">
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm"
            >
              <AlertCircle size={18} />
              {error}
            </motion.div>
          )}

          {resultUrl && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full p-6 bg-emerald-50 border border-emerald-100 rounded-2xl flex flex-col items-center gap-4"
            >
              <div className="flex items-center gap-3 text-emerald-700 font-semibold">
                <CheckCircle2 size={24} />
                Fusion réussie !
              </div>

              <div className="w-full max-w-md space-y-2">
                <label className="text-xs font-bold text-emerald-700 uppercase tracking-wider ml-1">Nom du fichier final</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FileText size={18} className="text-emerald-500" />
                  </div>
                  <input
                    type="text"
                    value={customFilename}
                    onChange={(e) => setCustomFilename(e.target.value)}
                    className="w-full pl-11 pr-12 py-3 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium text-slate-700 shadow-sm"
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <span className="text-emerald-400 font-bold text-sm">.pdf</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                <button
                  onClick={() => setShowPreview(true)}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-emerald-600 border border-emerald-200 rounded-xl font-semibold shadow-sm hover:bg-emerald-50 transition-all"
                >
                  <Eye size={20} />
                  Aperçu
                </button>
                <button
                  onClick={downloadResult}
                  className="flex-1 flex items-center justify-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-lg shadow-emerald-200 transition-all hover:scale-105 active:scale-95"
                >
                  <Download size={20} />
                  Télécharger le PDF
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showPreview && resultUrl && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 backdrop-blur-md"
              onClick={() => {
                setShowPreview(false);
                setIsFullscreen(false);
              }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className={`bg-white shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${isFullscreen ? 'w-screen h-screen rounded-none' : 'w-[95vw] h-[95vh] rounded-3xl'
                  }`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                      <Eye size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg leading-tight">Aperçu Haute Qualité</h3>
                      <p className="text-sm text-slate-500 font-medium">{customFilename}.pdf</p>
                    </div>
                  </div>

                  <div className="hidden md:flex items-center bg-slate-100 rounded-xl p-1 gap-1">
                    <button
                      onClick={() => setPreviewZoom(prev => Math.max(25, prev - 25))}
                      className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-600"
                      title="Zoom arrière"
                    >
                      <ZoomOut size={18} />
                    </button>
                    <span className="px-3 text-sm font-bold text-slate-600 min-w-[60px] text-center">
                      {previewZoom}%
                    </span>
                    <button
                      onClick={() => setPreviewZoom(prev => Math.min(200, prev + 25))}
                      className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-600"
                      title="Zoom avant"
                    >
                      <ZoomIn size={18} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsFullscreen(!isFullscreen)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-xl transition-all",
                        isFullscreen
                          ? "bg-indigo-100 text-indigo-600"
                          : "hover:bg-slate-100 text-slate-500"
                      )}
                      title={isFullscreen ? "Quitter le plein écran (F)" : "Plein écran (F)"}
                    >
                      {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                      <span className="hidden sm:inline text-xs font-bold">
                        {isFullscreen ? "Réduire" : "Plein écran"}
                      </span>
                    </button>
                    <div className="w-px h-6 bg-slate-200 mx-1" />
                    <button
                      onClick={() => {
                        setShowPreview(false);
                        setIsFullscreen(false);
                      }}
                      className="p-2 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all text-slate-400"
                    >
                      <X size={24} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 bg-slate-200 overflow-auto p-4 sm:p-12 flex flex-col items-center gap-12 scrollbar-thin scrollbar-thumb-slate-400 scrollbar-track-transparent">
                  {isRenderingPreview ? (
                    <div className="flex flex-col items-center justify-center h-full gap-6 text-slate-600">
                      <div className="relative">
                        <Loader2 size={64} className="animate-spin text-indigo-600" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-2 h-2 bg-indigo-600 rounded-full animate-ping" />
                        </div>
                      </div>
                      <div className="text-center space-y-2">
                        <p className="font-bold text-xl">Optimisation du rendu...</p>
                        <p className="text-sm text-slate-500">Préparation de l'affichage haute résolution</p>
                      </div>
                    </div>
                  ) : (
                    previewImages.map((src, index) => (
                      <div
                        key={index}
                        className="relative group transition-transform duration-300 ease-out"
                        style={{ width: `${previewZoom}%`, maxWidth: '100%' }}
                      >
                        <div className="absolute -left-16 top-0 h-full hidden lg:flex items-center">
                          <span className="text-slate-400 font-display text-2xl font-black opacity-20 group-hover:opacity-100 transition-opacity">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                        </div>
                        <img
                          src={src}
                          alt={`Page ${index + 1}`}
                          className="w-full h-auto shadow-[0_20px_50px_rgba(0,0,0,0.2)] rounded-sm bg-white ring-1 ring-black/5"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ))
                  )}
                </div>

                <div className="p-6 bg-white border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="text-sm text-slate-500 font-medium">
                    {previewImages.length} page{previewImages.length > 1 ? 's' : ''} • {customFilename}.pdf
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                      onClick={() => {
                        setShowPreview(false);
                        setIsFullscreen(false);
                      }}
                      className="flex-1 sm:flex-none px-8 py-3 font-bold text-slate-600 hover:bg-slate-100 rounded-2xl transition-all"
                    >
                      Fermer
                    </button>
                    <button
                      onClick={downloadResult}
                      className="flex-1 sm:flex-none px-10 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-2 hover:scale-105 active:scale-95"
                    >
                      <Download size={20} />
                      Télécharger
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={mergePDFs}
          disabled={mergeCandidates.length < 2 || isProcessing}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-10 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-100 transition-all hover:scale-105 active:scale-95 disabled:scale-100 disabled:shadow-none"
        >
          {isProcessing ? (
            <>
              <Loader2 size={24} className="animate-spin" />
              Traitement en cours...
            </>
          ) : (
            <>
              <Combine size={24} />
              Fusionner les fichiers
            </>
          )}
        </button>
      </div>
    </div>
  );
};
