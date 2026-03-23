import * as pdfjs from 'pdfjs-dist';

// Use Vite's asset URL mechanism - this bundles the worker with a unique hash
// to bypass all browser and service worker caches.
const workerUrl = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).href;

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export { pdfjs };
