import * as pdfjs from 'pdfjs-dist';

// Use the worker placed in the public folder to avoid Vite ESM module fetching issues on Vercel
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export { pdfjs };
