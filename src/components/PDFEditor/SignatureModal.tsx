import React from 'react';
import { motion } from 'framer-motion';
import { Pencil, X } from 'lucide-react';

interface SignatureModalProps {
  isSignaturePadOpen: boolean;
  setIsSignaturePadOpen: (val: boolean) => void;
  setSignatureData: (val: string) => void;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({
  isSignaturePadOpen,
  setIsSignaturePadOpen,
  setSignatureData
}) => {
  if (!isSignaturePadOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] shadow-2xl p-8 max-w-md w-full space-y-6"
      >
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Pencil className="text-emerald-500" size={24} />
            Votre Signature
          </h3>
          <button onClick={() => setIsSignaturePadOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
        </div>

        <div className="aspect-[2/1] bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 relative overflow-hidden group">
          <canvas
            id="signature-canvas"
            className="w-full h-full cursor-crosshair touch-none"
            onMouseDown={(e) => {
              const canvas = e.currentTarget;
              const ctx = canvas.getContext('2d');
              if (!ctx) return;
              const rect = canvas.getBoundingClientRect();
              ctx.beginPath(); ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
              (canvas as any).isDrawing = true;
            }}
            onMouseMove={(e) => {
              const canvas = e.currentTarget;
              if (!(canvas as any).isDrawing) return;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                  const rect = canvas.getBoundingClientRect();
                  ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
                  ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = '#000000'; ctx.stroke();
              }
            }}
            onMouseUp={(e) => { (e.currentTarget as any).isDrawing = false; }}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              const canvas = document.getElementById('signature-canvas') as HTMLCanvasElement;
              const ctx = canvas?.getContext('2d');
              if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
            }}
            className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
          >Effacer</button>
          <button
            onClick={() => {
              const canvas = document.getElementById('signature-canvas') as HTMLCanvasElement;
              if (canvas) {
                setSignatureData(canvas.toDataURL());
                setIsSignaturePadOpen(false);
              }
            }}
            className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all"
          >Enregistrer</button>
        </div>
      </motion.div>
    </motion.div>
  );
};
