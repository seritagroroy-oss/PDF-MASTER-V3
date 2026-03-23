import * as pdfjs from 'pdfjs-dist';
// Vite ?url import: copies the worker to dist with a unique content hash.
// This is the official Vite way to get a stable, cache-busted URL for any asset.
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

export { pdfjs };
