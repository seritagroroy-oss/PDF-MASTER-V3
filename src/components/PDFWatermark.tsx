import React, { useState } from 'react';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { FileUpload } from './FileUpload';
import { Type, Image as ImageIcon, Download, Loader2, CheckCircle2, AlertCircle, Layout } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/src/utils/cn';

type WatermarkType = 'text' | 'image';
type Position = 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'tiled';

export const PDFWatermark: React.FC = () => {
  const [files, setFiles] = useState<any[]>([]);
  const [rawFiles, setRawFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Watermark Settings
  const [type, setType] = useState<WatermarkType>('text');
  const [text, setText] = useState('CONFIDENTIEL');
  const [opacity, setOpacity] = useState(0.3);
  const [fontSize, setFontSize] = useState(50);
  const [rotation, setRotation] = useState(45);
  const [position, setPosition] = useState<Position>('center');
  const [watermarkImage, setWatermarkImage] = useState<File | null>(null);

  const templates = [
    { label: 'Confidentiel', value: 'CONFIDENTIEL' },
    { label: 'Brouillon', value: 'BROUILLON' },
    { label: 'Copyright', value: 'SOUMIS À COPYRIGHT' },
    { label: 'Urgent', value: 'URGENT' },
    { label: 'Copie', value: 'COPIE' },
    { label: 'Personnalisé', value: 'custom' },
  ];

  const [selectedTemplate, setSelectedTemplate] = useState(templates[0].value);

  const handleTemplateChange = (val: string) => {
    setSelectedTemplate(val);
    if (val !== 'custom') {
      setText(val);
    }
  };

  const addWatermark = async () => {
    if (rawFiles.length === 0) {
      setError("Veuillez sélectionner un fichier PDF.");
      return;
    }

    if (type === 'image' && !watermarkImage) {
      setError("Veuillez sélectionner une image pour le filigrane.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResultUrl(null);

    try {
      const file = rawFiles[0];
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      let embeddedImage: any = null;
      if (type === 'image' && watermarkImage) {
        const imgBuffer = await watermarkImage.arrayBuffer();
        if (watermarkImage.type === 'image/png') {
          embeddedImage = await pdfDoc.embedPng(imgBuffer);
        } else if (watermarkImage.type === 'image/jpeg' || watermarkImage.type === 'image/jpg') {
          embeddedImage = await pdfDoc.embedJpg(imgBuffer);
        } else {
          throw new Error("Format d'image non supporté (PNG ou JPG uniquement).");
        }
      }

      for (const page of pages) {
        const { width, height } = page.getSize();
        
        if (type === 'text') {
          const textWidth = font.widthOfTextAtSize(text, fontSize);
          const textHeight = fontSize;
          
          let x = 0;
          let y = 0;

          if (position === 'tiled') {
            const stepX = textWidth + 150;
            const stepY = textHeight + 150;
            for (let tiledX = -width; tiledX < width * 2; tiledX += stepX) {
              for (let tiledY = -height; tiledY < height * 2; tiledY += stepY) {
                page.drawText(text, {
                  x: tiledX,
                  y: tiledY,
                  size: fontSize,
                  font,
                  color: rgb(0.5, 0.5, 0.5),
                  opacity,
                  rotate: degrees(rotation),
                });
              }
            }
          } else {
            switch (position) {
              case 'center':
                x = width / 2 - textWidth / 2;
                y = height / 2 - textHeight / 2;
                break;
              case 'top-left':
                x = 50;
                y = height - 50;
                break;
              case 'top-right':
                x = width - textWidth - 50;
                y = height - 50;
                break;
              case 'bottom-left':
                x = 50;
                y = 50;
                break;
              case 'bottom-right':
                x = width - textWidth - 50;
                y = 50;
                break;
            }

            page.drawText(text, {
              x,
              y,
              size: fontSize,
              font,
              color: rgb(0.5, 0.5, 0.5),
              opacity,
              rotate: degrees(rotation),
            });
          }
        } else if (embeddedImage) {
          const imgDims = embeddedImage.scale(0.5);
          let x = 0;
          let y = 0;

          if (position === 'tiled') {
            const stepX = imgDims.width + 150;
            const stepY = imgDims.height + 150;
            for (let tiledX = -width; tiledX < width * 2; tiledX += stepX) {
              for (let tiledY = -height; tiledY < height * 2; tiledY += stepY) {
                page.drawImage(embeddedImage, {
                  x: tiledX,
                  y: tiledY,
                  width: imgDims.width,
                  height: imgDims.height,
                  opacity,
                  rotate: degrees(rotation),
                });
              }
            }
          } else {
            switch (position) {
              case 'center':
                x = width / 2 - imgDims.width / 2;
                y = height / 2 - imgDims.height / 2;
                break;
              case 'top-left':
                x = 50;
                y = height - imgDims.height - 50;
                break;
              case 'top-right':
                x = width - imgDims.width - 50;
                y = height - imgDims.height - 50;
                break;
              case 'bottom-left':
                x = 50;
                y = 50;
                break;
              case 'bottom-right':
                x = width - imgDims.width - 50;
                y = 50;
                break;
            }

            page.drawImage(embeddedImage, {
              x,
              y,
              width: imgDims.width,
              height: imgDims.height,
              opacity,
              rotate: degrees(rotation),
            });
          }
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Une erreur est survenue lors de l'ajout du filigrane.");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = () => {
    if (resultUrl) {
      const link = document.createElement('a');
      link.href = resultUrl;
      link.download = `watermarked_${new Date().getTime()}.pdf`;
      link.click();
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-display font-bold text-slate-900">Ajouter un filigrane</h2>
        <p className="text-slate-500">Protégez vos documents avec un texte ou une image personnalisée.</p>
      </div>

      <FileUpload
        files={files.slice(0, 1)}
        setFiles={(val) => setFiles(typeof val === 'function' ? (prev) => val(prev).slice(0, 1) : val.slice(0, 1))}
        onFilesChange={(newFiles) => setRawFiles(newFiles.slice(0, 1))}
      />

      {rawFiles.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8"
        >
          <div className="flex p-1 bg-slate-100 rounded-2xl">
            <button
              onClick={() => setType('text')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all",
                type === 'text' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Type size={18} />
              Texte
            </button>
            <button
              onClick={() => setType('image')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all",
                type === 'image' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <ImageIcon size={18} />
              Image
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {type === 'text' ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Modèle de filigrane</label>
                  <div className="flex flex-wrap gap-2">
                    {templates.map((template) => (
                      <button
                        key={template.value}
                        onClick={() => handleTemplateChange(template.value)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                          selectedTemplate === template.value
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                            : "bg-white text-slate-600 border-slate-200 hover:border-indigo-200"
                        )}
                      >
                        {template.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Contenu du texte</label>
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value);
                      if (selectedTemplate !== 'custom') {
                        setSelectedTemplate('custom');
                      }
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="Entrez votre texte..."
                  />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Image du filigrane</label>
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  onChange={(e) => setWatermarkImage(e.target.files?.[0] || null)}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Position</label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value as Position)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              >
                <option value="center">Centre</option>
                <option value="tiled">Mosaïque (Répété)</option>
                <option value="top-left">Haut Gauche</option>
                <option value="top-right">Haut Droite</option>
                <option value="bottom-left">Bas Gauche</option>
                <option value="bottom-right">Bas Droite</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex justify-between">
                Taille de police <span>{fontSize}px</span>
              </label>
              <input
                type="range"
                min="10"
                max="200"
                step="5"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex justify-between">
                Opacité <span>{Math.round(opacity * 100)}%</span>
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex justify-between">
                Rotation <span>{rotation}°</span>
              </label>
              <input
                type="range"
                min="0"
                max="360"
                step="15"
                value={rotation}
                onChange={(e) => setRotation(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
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
                Filigrane ajouté avec succès !
              </div>
              <button
                onClick={downloadResult}
                className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-lg shadow-emerald-200 transition-all hover:scale-105 active:scale-95"
              >
                <Download size={20} />
                Télécharger le PDF
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={addWatermark}
          disabled={rawFiles.length === 0 || isProcessing}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-10 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-100 transition-all hover:scale-105 active:scale-95 disabled:scale-100 disabled:shadow-none"
        >
          {isProcessing ? (
            <>
              <Loader2 size={24} className="animate-spin" />
              Traitement en cours...
            </>
          ) : (
            <>
              <Layout size={24} />
              Ajouter le filigrane
            </>
          )}
        </button>
      </div>
    </div>
  );
};
