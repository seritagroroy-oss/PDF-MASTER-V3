import React, { useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import JSZip from 'jszip';
import { FileUpload } from './FileUpload';
import { FileImage, Download, Loader2, CheckCircle2, AlertCircle, Image as ImageIcon, Type } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/utils/cn';

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

type ConversionFormat = 'jpg' | 'png' | 'txt';

export const PDFConverter: React.FC = () => {
  const [files, setFiles] = useState<any[]>([]);
  const [rawFiles, setRawFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState<ConversionFormat>('jpg');
  const [progress, setProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [pageRange, setPageRange] = useState('');
  const [imageScale, setImageScale] = useState(2);
  const [jpgQuality, setJpgQuality] = useState(0.85);

  const parsePageRange = (value: string, maxPages: number) => {
    if (!value.trim()) {
      return Array.from({ length: maxPages }, (_, index) => index + 1);
    }

    const pages = new Set<number>();
    const segments = value
      .split(',')
      .map((segment) => segment.trim())
      .filter(Boolean);

    for (const segment of segments) {
      if (segment.includes('-')) {
        const [startRaw, endRaw] = segment.split('-').map((part) => Number(part.trim()));
        if (!Number.isInteger(startRaw) || !Number.isInteger(endRaw) || startRaw < 1 || endRaw < startRaw) {
          throw new Error('Plage de pages invalide. Utilisez par exemple 1-3,5,8.');
        }

        for (let page = startRaw; page <= Math.min(endRaw, maxPages); page++) {
          pages.add(page);
        }
      } else {
        const page = Number(segment);
        if (!Number.isInteger(page) || page < 1 || page > maxPages) {
          throw new Error('Numéro de page invalide dans la sélection.');
        }
        pages.add(page);
      }
    }

    return Array.from(pages).sort((a, b) => a - b);
  };

  const convertPDF = async () => {
    if (rawFiles.length === 0) {
      setError('Veuillez sélectionner un fichier PDF.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResultUrl(null);
    setProgress(0);
    setCurrentPage(0);

    try {
      const file = rawFiles[0];
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({
        data: arrayBuffer,
        useSystemFonts: true,
        isEvalSupported: false,
      });

      const pdf = await loadingTask.promise;
      const selectedPages = parsePageRange(pageRange, pdf.numPages);
      setTotalPages(selectedPages.length);

      if (format === 'txt') {
        let fullText = '';

        for (let i = 0; i < selectedPages.length; i++) {
          const pageNumber = selectedPages[i];
          setCurrentPage(i + 1);
          const page = await pdf.getPage(pageNumber);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');

          fullText += `--- Page ${pageNumber} ---\n${pageText}\n\n`;
          setProgress(Math.round(((i + 1) / selectedPages.length) * 100));
        }

        const blob = new Blob([fullText], { type: 'text/plain' });
        setResultUrl(URL.createObjectURL(blob));
      } else {
        const zip = new JSZip();
        const folder = zip.folder('converted_images');

        for (let i = 0; i < selectedPages.length; i++) {
          const pageNumber = selectedPages[i];
          setCurrentPage(i + 1);
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: imageScale });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');

          if (!context) {
            throw new Error('Impossible de créer le contexte canvas.');
          }

          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({
            canvasContext: context,
            viewport,
            canvas,
          }).promise;

          const imgData = canvas.toDataURL(`image/${format === 'jpg' ? 'jpeg' : 'png'}`, jpgQuality);
          const base64Data = imgData.split(',')[1];
          folder?.file(`page_${pageNumber}.${format}`, base64Data, { base64: true });

          setProgress(Math.round(((i + 1) / selectedPages.length) * 100));
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        setResultUrl(URL.createObjectURL(zipBlob));
      }
    } catch (err: any) {
      console.error('PDF Conversion Error:', err);
      if (err.name === 'PasswordException') {
        setError('Ce fichier PDF est protégé par un mot de passe. Veuillez le déverrouiller avant de le convertir.');
      } else {
        setError(`Erreur de conversion : ${err.message || 'Une erreur inattendue est survenue'}.`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = () => {
    if (!resultUrl) return;

    const link = document.createElement('a');
    link.href = resultUrl;
    link.download =
      format === 'txt'
        ? `converted_${new Date().getTime()}.txt`
        : `converted_images_${new Date().getTime()}.zip`;
    link.click();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
        <h2 className="text-3xl font-display font-bold text-slate-900">Convertir un PDF</h2>
        <p className="text-slate-500">Transformez vos documents PDF en images haute résolution ou en texte brut.</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <FileUpload
          files={files.slice(0, 1)}
          setFiles={(val) => setFiles(typeof val === 'function' ? (prev) => val(prev).slice(0, 1) : val.slice(0, 1))}
          onFilesChange={(newFiles) => setRawFiles(newFiles.slice(0, 1))}
        />
      </motion.div>

      {rawFiles.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8"
        >
          <div className="space-y-4">
            <label className="text-sm font-bold text-slate-700">Format de sortie</label>
            <div className="grid grid-cols-3 gap-4">
              {[
                { id: 'jpg', name: 'JPG', icon: ImageIcon },
                { id: 'png', name: 'PNG', icon: FileImage },
                { id: 'txt', name: 'Texte', icon: Type },
              ].map((item, index) => (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setFormat(item.id as ConversionFormat)}
                  className={cn(
                    'flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all',
                    format === item.id
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-600 shadow-sm'
                      : 'border-slate-100 text-slate-500 hover:border-slate-200 hover:bg-slate-50',
                  )}
                >
                  <item.icon size={24} />
                  <span className="font-bold text-sm">{item.name}</span>
                </motion.button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Pages à convertir</label>
              <input
                type="text"
                value={pageRange}
                onChange={(e) => setPageRange(e.target.value)}
                placeholder="Ex : 1-3,5,8"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
              />
              <p className="text-xs text-slate-400">Laissez vide pour convertir toutes les pages.</p>
            </div>

            {format !== 'txt' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="flex items-center justify-between text-sm font-bold text-slate-700">
                    <span>Résolution</span>
                    <span>{imageScale.toFixed(1)}x</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.5"
                    value={imageScale}
                    onChange={(e) => setImageScale(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                {format === 'jpg' && (
                  <div className="space-y-2">
                    <label className="flex items-center justify-between text-sm font-bold text-slate-700">
                      <span>Qualité JPG</span>
                      <span>{Math.round(jpgQuality * 100)}%</span>
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="1"
                      step="0.05"
                      value={jpgQuality}
                      onChange={(e) => setJpgQuality(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6 p-6 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600 animate-pulse">
                    <Loader2 size={20} className="animate-spin" />
                  </div>
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={currentPage}>
                    <p className="text-sm font-bold text-slate-900">Conversion en cours</p>
                    <p className="text-xs text-slate-500">Page {currentPage} sur {totalPages}</p>
                  </motion.div>
                </div>
                <motion.span
                  key={progress}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-lg font-display font-black text-indigo-600"
                >
                  {progress}%
                </motion.span>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative h-4 bg-slate-200 rounded-full overflow-hidden shadow-inner"
              >
                <motion.div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-indigo-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-shimmer" />
                </motion.div>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-[10px] text-center text-slate-400 uppercase tracking-widest font-bold"
              >
                Ne fermez pas cette fenêtre pendant le traitement
              </motion.p>
            </motion.div>
          )}
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex flex-col items-center gap-4">
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="w-full p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm shadow-sm"
            >
              <AlertCircle size={18} />
              {error}
            </motion.div>
          )}

          {resultUrl && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="w-full p-8 bg-emerald-50 border border-emerald-100 rounded-[2rem] flex flex-col items-center gap-6 shadow-xl shadow-emerald-100/50"
            >
              <div className="relative">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                  className="absolute inset-0 bg-emerald-200 rounded-full opacity-20"
                />
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
                  className="relative bg-emerald-100 p-4 rounded-full text-emerald-600 shadow-lg shadow-emerald-200"
                >
                  <CheckCircle2 size={40} />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: [0, 0.2, 0], scale: [0.8, 1.5, 2] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 bg-emerald-400 rounded-full"
                />
              </div>

              <div className="text-center space-y-1">
                <motion.h3
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-xl font-display font-bold text-emerald-900"
                >
                  Conversion terminée !
                </motion.h3>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-sm text-emerald-600/80 font-medium"
                >
                  Votre fichier est prêt à être téléchargé.
                </motion.p>
              </div>

              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                onClick={downloadResult}
                className="group relative flex items-center gap-3 px-10 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 transition-all hover:scale-105 active:scale-95 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <Download size={24} className="relative z-10" />
                <span className="relative z-10">
                  {format === 'txt' ? 'Télécharger le texte' : "Télécharger le ZIP d'images"}
                </span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          onClick={convertPDF}
          disabled={rawFiles.length === 0 || isProcessing}
          className={cn(
            'group relative w-full sm:w-auto flex items-center justify-center gap-2 px-10 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-100 transition-all hover:scale-105 active:scale-95 disabled:scale-100 disabled:shadow-none overflow-hidden',
            isProcessing && 'animate-pulse',
          )}
        >
          {!isProcessing && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />
          )}
          {isProcessing ? (
            <>
              <Loader2 size={24} className="animate-spin" />
              Traitement...
            </>
          ) : (
            <>
              <FileImage size={24} />
              Convertir le PDF
            </>
          )}
        </motion.button>
      </motion.div>
    </motion.div>
  );
};
