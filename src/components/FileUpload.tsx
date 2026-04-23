import React, { useCallback, useState, useEffect } from 'react';
import { Upload, X, FileText, Loader2, AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { pdfjs } from '../pdfjs-setup';

interface FileItem {
  id: string;
  file: File;
  name: string;
  size: string;
  thumbnail?: string;
  isValidating?: boolean;
  error?: string;
}

interface FileUploadProps {
  onFilesChange: (files: File[]) => void;
  files: FileItem[];
  setFiles: React.Dispatch<React.SetStateAction<FileItem[]>>;
  selectedIds?: Set<string>;
  maxSizeMB?: number;
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  onFilesChange, 
  files, 
  setFiles, 
  selectedIds,
  maxSizeMB = 50 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const generateThumbnail = async (file: File): Promise<string | undefined> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 0.2 });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return undefined;
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({ canvasContext: context, viewport }).promise;
      return canvas.toDataURL();
    } catch (e) {
      console.error('Thumbnail generation failed', e);
      return undefined;
    }
  };

  const validateAndAddFiles = async (fileList: File[]) => {
    setGlobalError(null);
    const newFiles: FileItem[] = [];
    
    for (const file of fileList) {
      const id = Math.random().toString(36).substring(7);
      let error = undefined;
      
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        error = "Format non supporté (PDF uniquement)";
      } else if (file.size > maxSizeMB * 1024 * 1024) {
        error = `Fichier trop volumineux (max ${maxSizeMB}MB)`;
      }

      newFiles.push({
        id,
        file,
        name: file.name,
        size: formatSize(file.size),
        isValidating: !error,
        error
      });
    }

    setFiles(prev => [...prev, ...newFiles]);

    // Process thumbnails and final validation for those without early errors
    for (const item of newFiles) {
      if (!item.error) {
        const thumbnail = await generateThumbnail(item.file);
        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, thumbnail, isValidating: false } : f));
      }
    }
  };

  useEffect(() => {
    onFilesChange(files.filter(f => !f.error).map(f => f.file));
  }, [files]);

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const onReorder = (newOrder: FileItem[]) => {
    setFiles(newOrder);
  };

  return (
    <div className="w-full space-y-6">
      <AnimatePresence>
        {globalError && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold">
            <AlertCircle size={18} /> {globalError}
          </motion.div>
        )}
      </AnimatePresence>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files) {
            validateAndAddFiles(Array.from(e.dataTransfer.files));
          }
        }}
        className={cn(
          "relative group cursor-pointer border-2 border-dashed rounded-[2.5rem] p-12 transition-all duration-500 ease-in-out flex flex-col items-center justify-center gap-4 overflow-hidden",
          isDragging 
            ? "border-indigo-500 bg-indigo-50/50 scale-[1.02] shadow-2xl shadow-indigo-500/10" 
            : "border-slate-200 hover:border-indigo-400 hover:bg-slate-50/50"
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <input
          type="file"
          multiple
          accept=".pdf"
          onChange={(e) => e.target.files && validateAndAddFiles(Array.from(e.target.files))}
          className="absolute inset-0 opacity-0 cursor-pointer z-10"
        />

        <div className={cn(
          "relative z-10 p-5 rounded-[1.5rem] transition-all duration-500",
          isDragging ? "bg-indigo-600 text-white rotate-12 scale-110" : "bg-indigo-100 text-indigo-600 group-hover:scale-110 group-hover:-rotate-3"
        )}>
          <Upload size={32} />
        </div>
        
        <div className="relative z-10 text-center">
          <p className="text-xl font-display font-extrabold text-slate-900">
            {isDragging ? "Lâchez pour ajouter" : "Ajoutez vos documents PDF"}
          </p>
          <p className="text-sm font-medium text-slate-500 mt-1 flex items-center justify-center gap-1.5">
            <Lock size={14} className="text-emerald-500" /> Traitement 100% local et sécurisé
          </p>
        </div>

        {isDragging && (
          <motion.div layoutId="drop-ring" className="absolute inset-0 border-4 border-indigo-500/20 rounded-[2.5rem]" 
            animate={{ scale: [1, 1.05, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5 }} />
        )}
      </div>

      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">
              Documents ({files.filter(f => !f.error).length})
            </h3>
            <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-full">
              Réorganisez par glisser-déposer
            </span>
          </div>

          <Reorder.Group axis="y" values={files} onReorder={onReorder} className="space-y-3">
            <AnimatePresence mode="popLayout">
              {files.map((file) => (
                <Reorder.Item
                  key={file.id}
                  value={file}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ 
                    opacity: selectedIds && !selectedIds.has(file.id) ? 0.4 : 1, 
                    x: 0,
                    scale: selectedIds && !selectedIds.has(file.id) ? 0.98 : 1,
                    borderColor: file.error ? "#fca5a5" : "#e2e8f0"
                  }}
                  exit={{ opacity: 0, scale: 0.9, x: 20 }}
                  className={cn(
                    "flex items-center gap-4 p-4 bg-white rounded-2xl border shadow-sm cursor-grab active:cursor-grabbing transition-all group",
                    selectedIds && !selectedIds.has(file.id) 
                      ? "grayscale-[0.5]" 
                      : (file.error ? "bg-rose-50/30" : "hover:border-indigo-400 hover:shadow-md")
                  )}
                >
                  <div className="relative h-14 w-11 shrink-0 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center">
                    {file.thumbnail ? (
                      <img src={file.thumbnail} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      file.isValidating ? (
                        <Loader2 size={16} className="animate-spin text-indigo-400" />
                      ) : (
                        <FileText size={20} className={file.error ? "text-rose-400" : "text-slate-400"} />
                      )
                    )}
                    {file.error && <div className="absolute inset-0 bg-rose-500/20 flex items-center justify-center"><X size={14} className="text-white bg-rose-600 rounded-full p-0.5" /></div>}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{file.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">{file.size}</p>
                      {file.error ? (
                        <span className="text-[10px] font-bold text-rose-500">{file.error}</span>
                      ) : (
                        !file.isValidating && <CheckCircle2 size={12} className="text-emerald-500" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {file.isValidating && <div className="h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />}
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                      className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </Reorder.Item>
              ))}
            </AnimatePresence>
          </Reorder.Group>
        </div>
      )}
    </div>
  );
};
