import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { FileUpload } from './FileUpload';
import { Minimize2, Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const PDFCompressor: React.FC = () => {
  const [files, setFiles] = useState<any[]>([]);
  const [rawFiles, setRawFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customFilename, setCustomFilename] = useState('pdf_optimise');
  const [stripMetadata, setStripMetadata] = useState(true);
  const [stats, setStats] = useState<{ original: string; compressed: string; reduction: string } | null>(null);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const compressPDF = async () => {
    if (rawFiles.length === 0) {
      setError('Veuillez sélectionner un fichier PDF.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResultUrl(null);
    setStats(null);

    try {
      const file = rawFiles[0];
      const originalSize = file.size;
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      if (stripMetadata) {
        pdfDoc.setTitle('');
        pdfDoc.setAuthor('');
        pdfDoc.setSubject('');
        pdfDoc.setKeywords([]);
        pdfDoc.setProducer('');
        pdfDoc.setCreator('');
        pdfDoc.setLanguage('');
      }

      const pdfBytes = await pdfDoc.save({
        useObjectStreams: true,
        addDefaultPage: false,
      });

      const compressedSize = pdfBytes.length;
      const reduction = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);

      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      setResultUrl(url);
      setStats({
        original: formatSize(originalSize),
        compressed: formatSize(compressedSize),
        reduction: reduction + '%',
      });

      if (compressedSize >= originalSize) {
        setError("Le fichier est déjà optimisé. Aucune réduction supplémentaire n'a pu être effectuée.");
      }
    } catch (err) {
      console.error(err);
      setError('Une erreur est survenue lors de la compression du fichier.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = () => {
    if (!resultUrl) return;

    const link = document.createElement('a');
    link.href = resultUrl;
    const filename = customFilename.trim() || `compressed_${new Date().getTime()}`;
    link.download = `${filename.endsWith('.pdf') ? filename : filename + '.pdf'}`;
    link.click();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-display font-bold text-slate-900">Compresser un PDF</h2>
        <p className="text-slate-500">
          Réduisez la taille de vos fichiers PDF tout en conservant une qualité optimale.
        </p>
      </div>

      <FileUpload
        files={files.slice(0, 1)}
        setFiles={(val) => setFiles(typeof val === 'function' ? (prev) => val(prev).slice(0, 1) : val.slice(0, 1))}
        onFilesChange={(newFiles) => setRawFiles(newFiles.slice(0, 1))}
      />

      {rawFiles.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Nom du fichier optimisé</label>
            <input
              type="text"
              value={customFilename}
              onChange={(e) => setCustomFilename(e.target.value)}
              placeholder="pdf_optimise"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-400"
            />
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={stripMetadata}
              onChange={(e) => setStripMetadata(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="block font-bold text-slate-900">Nettoyer les métadonnées</span>
              Supprime le titre, l’auteur et d’autres informations embarquées pour améliorer la confidentialité.
            </span>
          </label>
        </div>
      )}

      <div className="flex flex-col items-center gap-4">
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-3 text-amber-700 text-sm"
            >
              <AlertCircle size={18} />
              {error}
            </motion.div>
          )}

          {resultUrl && stats && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full p-6 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-6"
            >
              <div className="flex items-center justify-center gap-3 text-emerald-700 font-semibold">
                <CheckCircle2 size={24} />
                Optimisation terminée !
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-emerald-100 text-center">
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Original</p>
                  <p className="text-lg font-display font-bold text-slate-700">{stats.original}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-emerald-100 text-center">
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Compressé</p>
                  <p className="text-lg font-display font-bold text-emerald-600">{stats.compressed}</p>
                </div>
                <div className="bg-indigo-600 p-4 rounded-xl text-center text-white shadow-lg shadow-indigo-100">
                  <p className="text-xs text-white/70 uppercase font-bold tracking-wider mb-1">Réduction</p>
                  <p className="text-lg font-display font-bold">-{stats.reduction}</p>
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={downloadResult}
                  className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-lg shadow-emerald-200 transition-all hover:scale-105 active:scale-95"
                >
                  <Download size={20} />
                  Télécharger le PDF optimisé
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={compressPDF}
          disabled={rawFiles.length === 0 || isProcessing}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-10 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-100 transition-all hover:scale-105 active:scale-95 disabled:scale-100 disabled:shadow-none"
        >
          {isProcessing ? (
            <>
              <Loader2 size={24} className="animate-spin" />
              Optimisation en cours...
            </>
          ) : (
            <>
              <Minimize2 size={24} />
              Compresser le fichier
            </>
          )}
        </button>
      </div>
    </div>
  );
};
