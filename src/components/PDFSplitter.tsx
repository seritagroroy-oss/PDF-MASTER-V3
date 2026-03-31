import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PDFDocument } from 'pdf-lib';
import { Scissors, Upload, Download, Loader2, FileText, X, ChevronRight, CheckCircle2, Layers } from 'lucide-react';
import { cn } from '../utils/cn';

type SplitMode = 'range' | 'all' | 'extract';

interface PageRange {
  id: string;
  from: number;
  to: number;
}

export const PDFSplitter = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [mode, setMode] = useState<SplitMode>('range');
  const [ranges, setRanges] = useState<PageRange[]>([{ id: '1', from: 1, to: 1 }]);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<{ name: string; url: string }[]>([]);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (f: File) => {
    setFile(f); setResults([]); setError('');
    const bytes = await f.arrayBuffer();
    const pdf = await PDFDocument.load(bytes);
    const count = pdf.getPageCount();
    setPageCount(count);
    setRanges([{ id: '1', from: 1, to: count }]);
    setSelectedPages([]);
  };

  const addRange = () =>
    setRanges(r => [...r, { id: Date.now().toString(), from: 1, to: pageCount }]);

  const removeRange = (id: string) =>
    setRanges(r => r.filter(x => x.id !== id));

  const updateRange = (id: string, field: 'from' | 'to', value: number) =>
    setRanges(r => r.map(x => x.id === id ? { ...x, [field]: Math.max(1, Math.min(pageCount, value)) } : x));

  const togglePage = (p: number) =>
    setSelectedPages(s => s.includes(p) ? s.filter(x => x !== p) : [...s, p].sort((a, b) => a - b));

  const split = async () => {
    if (!file) return;
    setIsProcessing(true); setError(''); setResults([]);
    try {
      const src = await PDFDocument.load(await file.arrayBuffer());
      const outputs: { name: string; url: string }[] = [];

      if (mode === 'all') {
        // One PDF per page
        for (let i = 0; i < pageCount; i++) {
          const doc = await PDFDocument.create();
          const [page] = await doc.copyPages(src, [i]);
          doc.addPage(page);
          const bytes = await doc.save();
          outputs.push({
            name: `${file.name.replace('.pdf', '')}_page_${i + 1}.pdf`,
            url: URL.createObjectURL(new Blob([bytes as any], { type: 'application/pdf' })),
          });
        }
      } else if (mode === 'range') {
        for (const range of ranges) {
          const indices = Array.from({ length: range.to - range.from + 1 }, (_, i) => range.from - 1 + i);
          const doc = await PDFDocument.create();
          const pages = await doc.copyPages(src, indices);
          pages.forEach(p => doc.addPage(p));
          const bytes = await doc.save();
          outputs.push({
            name: `${file.name.replace('.pdf', '')}_p${range.from}-${range.to}.pdf`,
            url: URL.createObjectURL(new Blob([bytes as any], { type: 'application/pdf' })),
          });
        }
      } else {
        // Extract selected pages
        const sorted = [...selectedPages].sort((a, b) => a - b);
        const doc = await PDFDocument.create();
        const pages = await doc.copyPages(src, sorted.map(p => p - 1));
        pages.forEach(p => doc.addPage(p));
        const bytes = await doc.save();
        outputs.push({
          name: `${file.name.replace('.pdf', '')}_extrait.pdf`,
          url: URL.createObjectURL(new Blob([bytes as any], { type: 'application/pdf' })),
        });
      }

      setResults(outputs);
    } catch (e: any) {
      setError('Erreur lors du découpage. Vérifiez les plages de pages.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload zone */}
      {!file ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f?.type === 'application/pdf') handleFile(f); }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'group flex flex-col items-center justify-center gap-6 rounded-[2rem] border-2 border-dashed p-16 cursor-pointer transition-all',
            isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/50'
          )}
        >
          <div className={cn('h-20 w-20 rounded-3xl flex items-center justify-center transition-all', isDragging ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500 group-hover:bg-indigo-600 group-hover:text-white')}>
            <Scissors size={36} />
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-slate-900">Déposez votre PDF ici</p>
            <p className="mt-1 text-slate-500">ou cliquez pour sélectionner un fichier</p>
          </div>
          <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* File info */}
          <div className="flex items-center justify-between p-5 rounded-2xl bg-indigo-50 border border-indigo-100">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center">
                <FileText size={22} />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">{file.name}</p>
                <p className="text-xs text-slate-500">{pageCount} pages · {(file.size / 1024 / 1024).toFixed(1)} Mo</p>
              </div>
            </div>
            <button onClick={() => { setFile(null); setResults([]); }} className="p-2 rounded-full hover:bg-indigo-100 text-indigo-600 transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Mode selector */}
          <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
            {([
              { id: 'range', label: 'Par plages', icon: Layers },
              { id: 'all', label: 'Page par page', icon: FileText },
              { id: 'extract', label: 'Sélection', icon: CheckCircle2 },
            ] as const).map(m => (
              <button key={m.id} onClick={() => setMode(m.id)}
                className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all',
                  mode === m.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600')}>
                <m.icon size={14} />{m.label}
              </button>
            ))}
          </div>

          {/* Range mode */}
          {mode === 'range' && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Plages de pages</p>
              {ranges.map((range, idx) => (
                <motion.div key={range.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-slate-200">
                  <span className="text-xs font-bold text-slate-400 w-6">#{idx + 1}</span>
                  <span className="text-xs font-medium text-slate-500">De</span>
                  <input type="number" min={1} max={pageCount} value={range.from}
                    onChange={e => updateRange(range.id, 'from', Number(e.target.value))}
                    className="w-16 text-center rounded-xl border border-slate-200 py-1.5 text-sm font-bold outline-none focus:border-indigo-400" />
                  <ChevronRight size={14} className="text-slate-300" />
                  <input type="number" min={1} max={pageCount} value={range.to}
                    onChange={e => updateRange(range.id, 'to', Number(e.target.value))}
                    className="w-16 text-center rounded-xl border border-slate-200 py-1.5 text-sm font-bold outline-none focus:border-indigo-400" />
                  <span className="text-xs font-medium text-slate-500">sur {pageCount}</span>
                  {ranges.length > 1 && (
                    <button onClick={() => removeRange(range.id)} className="ml-auto p-1.5 rounded-lg hover:bg-rose-50 text-rose-400 transition-colors">
                      <X size={14} />
                    </button>
                  )}
                </motion.div>
              ))}
              <button onClick={addRange}
                className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-sm font-bold text-slate-400 hover:border-indigo-400 hover:text-indigo-600 transition-all">
                + Ajouter une plage
              </button>
            </div>
          )}

          {/* All mode */}
          {mode === 'all' && (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <p className="text-sm font-bold text-slate-700">Chaque page deviendra un fichier PDF séparé.</p>
              <p className="text-xs text-slate-400 mt-1">{pageCount} fichiers seront créés.</p>
            </div>
          )}

          {/* Extract mode */}
          {mode === 'extract' && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
                Sélectionnez les pages à extraire ({selectedPages.length} sélectionnées)
              </p>
              <div className="grid grid-cols-8 sm:grid-cols-12 gap-2">
                {Array.from({ length: pageCount }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => togglePage(p)}
                    className={cn('aspect-square rounded-xl text-xs font-bold transition-all',
                      selectedPages.includes(p)
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                        : 'bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-600')}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-sm font-bold text-rose-600">{error}</div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="space-y-3 p-5 rounded-2xl bg-emerald-50 border border-emerald-100">
              <p className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 size={16} />{results.length} fichier(s) créé(s) avec succès
              </p>
              {results.map((r, i) => (
                <a key={i} href={r.url} download={r.name}
                  className="flex items-center justify-between p-3 bg-white rounded-xl border border-emerald-100 hover:border-emerald-300 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                      <FileText size={14} />
                    </div>
                    <span className="text-xs font-bold text-slate-700 truncate max-w-[200px]">{r.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 group-hover:translate-x-0.5 transition-transform">
                    <Download size={14} />Télécharger
                  </div>
                </a>
              ))}
            </motion.div>
          )}

          <button onClick={split} disabled={isProcessing || (mode === 'extract' && selectedPages.length === 0)}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-indigo-600 text-white font-bold text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all hover:scale-[1.01] disabled:opacity-50 disabled:pointer-events-none">
            {isProcessing ? <><Loader2 size={22} className="animate-spin" />Découpage en cours...</> : <><Scissors size={22} />Diviser le PDF</>}
          </button>
        </motion.div>
      )}
    </div>
  );
};
