import React, { useCallback, useState } from 'react';
import { Upload, X, FileText, MoveUp, MoveDown } from 'lucide-react';
import { motion, Reorder } from 'motion/react';
import { cn } from '@/src/utils/cn';

interface FileItem {
  id: string;
  file: File;
  name: string;
  size: string;
}

interface FileUploadProps {
  onFilesChange: (files: File[]) => void;
  files: FileItem[];
  setFiles: React.Dispatch<React.SetStateAction<FileItem[]>>;
  selectedIds?: Set<string>;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFilesChange, files, setFiles, selectedIds }) => {
  const [isDragging, setIsDragging] = useState(false);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileList = Array.from(e.target.files) as File[];
      const newFiles = fileList.map(file => ({
        id: Math.random().toString(36).substring(7),
        file,
        name: file.name,
        size: formatSize(file.size)
      }));
      const updated = [...files, ...newFiles];
      setFiles(updated);
      onFilesChange(updated.map(f => f.file));
    }
  };

  const removeFile = (id: string) => {
    const updated = files.filter(f => f.id !== id);
    setFiles(updated);
    onFilesChange(updated.map(f => f.file));
  };

  const onReorder = (newOrder: FileItem[]) => {
    setFiles(newOrder);
    onFilesChange(newOrder.map(f => f.file));
  };

  return (
    <div className="w-full space-y-6">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files) {
            const fileList = Array.from(e.dataTransfer.files) as File[];
            const newFiles = fileList
              .filter(f => f.type === 'application/pdf')
              .map(file => ({
                id: Math.random().toString(36).substring(7),
                file,
                name: file.name,
                size: formatSize(file.size)
              }));
            const updated = [...files, ...newFiles];
            setFiles(updated);
            onFilesChange(updated.map(f => f.file));
          }
        }}
        className={cn(
          "relative group cursor-pointer border-2 border-dashed rounded-2xl p-12 transition-all duration-300 ease-in-out flex flex-col items-center justify-center gap-4",
          isDragging ? "border-indigo-500 bg-indigo-50/50" : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50"
        )}
      >
        <input
          type="file"
          multiple
          accept=".pdf"
          onChange={handleFileChange}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
        <div className="p-4 rounded-full bg-indigo-100 text-indigo-600 group-hover:scale-110 transition-transform duration-300">
          <Upload size={32} />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-700">Cliquez ou glissez vos PDFs ici</p>
          <p className="text-sm text-slate-500">Supporte uniquement les fichiers .pdf</p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-medium text-slate-700">Fichiers sélectionnés ({files.length})</h3>
            <span className="text-xs text-slate-400 italic">Glissez pour réorganiser</span>
          </div>
          <Reorder.Group axis="y" values={files} onReorder={onReorder} className="space-y-2">
            {files.map((file) => (
              <Reorder.Item
                key={file.id}
                value={file}
                initial={{ opacity: 0, y: 10 }}
                animate={{ 
                  opacity: selectedIds && !selectedIds.has(file.id) ? 0.4 : 1, 
                  y: 0,
                  scale: selectedIds && !selectedIds.has(file.id) ? 0.98 : 1
                }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "flex items-center gap-4 p-4 bg-white rounded-xl border shadow-sm cursor-grab active:cursor-grabbing transition-all group",
                  selectedIds && !selectedIds.has(file.id) 
                    ? "border-slate-100 grayscale-[0.5]" 
                    : "border-slate-200 hover:border-indigo-200"
                )}
              >
                <div className="p-2 rounded-lg bg-slate-100 text-slate-500">
                  <FileText size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                  <p className="text-xs text-slate-400">{file.size}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>
      )}
    </div>
  );
};
