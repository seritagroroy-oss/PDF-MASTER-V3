import * as pdfjs from 'pdfjs-dist';

// Use unpkg CDN to always match the exact version of pdfjs-dist installed and avoid Vite ESM fetching issues
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export { pdfjs };
