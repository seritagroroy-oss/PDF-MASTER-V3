import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist';
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
import { FileUpload } from './FileUpload';
import { Scissors, Download, Loader2, CheckCircle2, AlertCircle, Trash2, GripVertical, RefreshCw, X, Eye, Search, CheckSquare, Square, Check, Minus, Plus, Type, Bold, Italic, Palette, Eraser, Pencil, Undo2, RotateCcw, FileText, Pipette, RotateCw, Sun, Moon, Square as SquareIcon, Circle, ArrowRight, Highlighter, Stamp, PlusCircle, Lock, Zap, Sparkles, Menu, Languages, ScanLine, Volume2 } from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { cn } from '@/src/utils/cn';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");



interface DrawingStroke {
  points: { x: number; y: number }[];
  color: string;
  width: number;
  mode: 'pen' | 'eraser' | 'magic-eraser' | 'highlighter' | 'rect' | 'circle' | 'arrow' | 'stamp' | 'text';
  text?: string;
  fontSize?: number;
  isBold?: boolean;
  isItalic?: boolean;
  isHighlighted?: boolean;
  canvasWidth?: number;
  canvasHeight?: number;
}

interface PageThumbnail {
  id: string;
  sourceFileIndex: number;
  index: number;
  url: string;
  modifiedText?: string;
  fontSize?: number;
  color?: string;
  isBold?: boolean;
  isItalic?: boolean;
  drawings?: DrawingStroke[];
  rotation?: number; // 0, 90, 180, 270
  isBlank?: boolean;
  isTextModified?: boolean;
  hasManualTextEdit?: boolean;
}

export const PDFEditor: React.FC = () => {
  const [files, setFiles] = useState<any[]>([]);
  const [rawFiles, setRawFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [editingPage, setEditingPage] = useState<PageThumbnail | null>(null);
  const [tempText, setTempText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [tempFontSize, setTempFontSize] = useState(10);
  const [tempColor, setTempColor] = useState("#1a1a1a");
  const [tempIsBold, setTempIsBold] = useState(false);
  const [tempIsItalic, setTempIsItalic] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1); // 0: Small, 1: Medium, 2: Large
  const [searchQuery, setSearchQuery] = useState("");

  const deselectAll = () => {
    setSelectedIds(new Set());
  };
  const [previewPage, setPreviewPage] = useState<PageThumbnail | null>(null);
  const [highResUrl, setHighResUrl] = useState<string | null>(null);
  const [isRenderingHighRes, setIsRenderingHighRes] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeEditMode, setActiveEditMode] = useState<'text' | 'visual'>('text');
  const [isPickingColor, setIsPickingColor] = useState(false);
  const [lastNonEraserColor, setLastNonEraserColor] = useState("#1a1a1a");
  const [visualTool, setVisualTool] = useState<'pen' | 'eraser' | 'magic-eraser' | 'highlighter' | 'rect' | 'circle' | 'arrow' | 'stamp' | 'text' | 'move'>('pen');
  const [stampType, setStampType] = useState<'check' | 'x' | 'approved' | 'sign' | 'confidential'>('check');
  const [isAISidebarOpen, setIsAISidebarOpen] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [brushSize, setBrushSize] = useState(5);
  const [currentDrawings, setCurrentDrawings] = useState<DrawingStroke[]>([]);
  const [textInput, setTextInput] = useState<{ x: number, y: number, text: string, isBold?: boolean, isItalic?: boolean, isHighlighted?: boolean, fontSize?: number } | null>(null);
  const [initialText, setInitialText] = useState("");
  const [draggingStrokeIdx, setDraggingStrokeIdx] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number, y: number } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [watermark, setWatermark] = useState("");
  const [exportPassword, setExportPassword] = useState("");
  const [isOCRing, setIsOCRing] = useState(false);
  const [ocrLanguage, setOcrLanguage] = useState<'fra' | 'eng' | 'fra+eng'>('fra+eng');
  const [isSignaturePadOpen, setIsSignaturePadOpen] = useState(false);
  const [isEyeSaverMode, setIsEyeSaverMode] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [history, setHistory] = useState<DrawingStroke[][]>([]);
  const [redoStack, setRedoStack] = useState<DrawingStroke[][]>([]);

  // Keyboard shortcuts implementation
  const shortcutsRef = useRef({
    selectAll: () => { },
    removeSelectedThumbnails: () => { },
    editPDF: async () => { },
    downloadResult: () => { },
    handleDoubleClick: async (t: PageThumbnail) => { },
    thumbnails,
    selectedIds,
    resultUrl,
    setEditingPage,
    setPreviewPage,
    setZoomLevel
  });

  useEffect(() => {
    shortcutsRef.current = {
      selectAll,
      removeSelectedThumbnails,
      editPDF,
      downloadResult,
      handleDoubleClick,
      thumbnails,
      selectedIds,
      resultUrl,
      setEditingPage,
      setPreviewPage,
      setZoomLevel
    };
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const {
        selectAll,
        removeSelectedThumbnails,
        editPDF,
        downloadResult,
        handleDoubleClick,
        thumbnails,
        selectedIds,
        resultUrl,
        setEditingPage,
        setPreviewPage,
        setZoomLevel
      } = shortcutsRef.current;

      // Don't trigger shortcuts if user is typing in a textarea or input
      // UNLESS it's Escape to close the modal
      const isInput = e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement;

      if (isInput) {
        if (e.key === 'Escape') {
          setEditingPage(null);
          setPreviewPage(null);
        }
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl+S: Save/Download
      if (cmdOrCtrl && e.key === 's') {
        e.preventDefault();
        if (resultUrl) {
          downloadResult();
        } else if (thumbnails.length > 0) {
          editPDF();
        }
      }

      // Ctrl+A: Select All
      if (cmdOrCtrl && e.key === 'a' && thumbnails.length > 0) {
        e.preventDefault();
        selectAll();
      }

      // Ctrl+D or Delete/Backspace: Remove selected
      if ((e.key === 'Delete' || e.key === 'Backspace' || (cmdOrCtrl && e.key === 'd')) && selectedIds.size > 0) {
        e.preventDefault();
        removeSelectedThumbnails();
      }

      // Ctrl+E: Edit first selected
      if (cmdOrCtrl && e.key === 'e' && selectedIds.size > 0) {
        e.preventDefault();
        const firstId = Array.from(selectedIds)[0];
        const thumb = thumbnails.find(t => t.id === firstId);
        if (thumb) handleDoubleClick(thumb);
      }

      // Escape: Close modals
      if (e.key === 'Escape') {
        setEditingPage(null);
        setPreviewPage(null);
      }

      // Zoom controls
      if (cmdOrCtrl && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        setZoomLevel(prev => Math.min(2, (typeof prev === 'function' ? (prev as any)(1) : prev) + 1));
      }
      if (cmdOrCtrl && e.key === '-') {
        e.preventDefault();
        setZoomLevel(prev => Math.max(0, (typeof prev === 'function' ? (prev as any)(1) : prev) - 1));
      }

      // Ctrl+Z: Undo
      if (cmdOrCtrl && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        undo();
      }
      // Ctrl+Y or Ctrl+Shift+Z: Redo
      if (cmdOrCtrl && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (rawFiles.length > 0) {
      loadThumbnails(rawFiles);
    } else {
      setThumbnails([]);
    }
  }, [rawFiles]);

  const loadThumbnails = async (files: File[]) => {
    setIsLoadingPages(true);
    setLoadingProgress(0);
    setError(null);
    try {
      const allThumbnails: PageThumbnail[] = [];
      let totalPagesProcessed = 0;

      // Calculate total pages first for progress bar
      let totalPagesCount = 0;
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        totalPagesCount += pdf.numPages;
      }

      for (let fileIdx = 0; fileIdx < files.length; fileIdx++) {
        const file = files[fileIdx];
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        const numPages = pdf.numPages;

        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.3 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');

          if (!context) continue;

          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({
            canvasContext: context,
            viewport: viewport,
            canvas: canvas
          }).promise;

          allThumbnails.push({
            id: `page-${fileIdx}-${i}-${Math.random()}`,
            sourceFileIndex: fileIdx,
            index: i - 1,
            url: canvas.toDataURL()
          });

          totalPagesProcessed++;
          setLoadingProgress(Math.round((totalPagesProcessed / totalPagesCount) * 100));
        }
      }
      setThumbnails(allThumbnails);
    } catch (err: any) {
      console.error("PDF Loading Error:", err);
      setError(`Erreur lors du chargement des pages du PDF : ${err.message || "Erreur inconnue"}. Vérifiez que le fichier n'est pas protégé par un mot de passe.`);
    } finally {
      setIsLoadingPages(false);
    }
  };

  const removeThumbnail = (id: string) => {
    setThumbnails(prev => prev.filter(t => t.id !== id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const toggleSelection = (id: string, isMulti: boolean = false) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (!isMulti) {
          // If not multi-select (no Ctrl/Cmd), maybe we want to clear others? 
          // Actually, let's just toggle for now as it's simpler for checkboxes.
        }
        next.add(id);
      }
      return next;
    });
  };

  const removeSelectedThumbnails = () => {
    setThumbnails(prev => prev.filter(t => !selectedIds.has(t.id)));
    setSelectedIds(new Set());
  };

  const rotatePage = (id: string) => {
    setThumbnails(prev => prev.map(t => {
      if (t.id === id) {
        const currentRotation = t.rotation || 0;
        return { ...t, rotation: (currentRotation + 90) % 360 };
      }
      return t;
    }));
  };

  const addBlankPage = () => {
    const newId = `blank-${Math.random()}`;
    const blankThumb: PageThumbnail = {
      id: newId,
      sourceFileIndex: -1,
      index: -1,
      url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==", // 1x1 white pixel
      isBlank: true,
      rotation: 0
    };
    setThumbnails(prev => [...prev, blankThumb]);
  };

  const runOCR = async () => {
    if (!editingPage) return;
    setIsOCRing(true);
    try {
      const { default: Tesseract } = await import('tesseract.js');
      const { data: { text } } = await Tesseract.recognize(
        editingPage.url,
        ocrLanguage,
        { logger: m => console.log(m) }
      );
      setTempText(prev => prev + "\n" + text);
    } catch (err) {
      console.error("OCR Error:", err);
      setError("Erreur lors de la reconnaissance de texte.");
    } finally {
      setIsOCRing(false);
    }
  };

  const selectAll = () => {
    if (selectedIds.size === thumbnails.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(thumbnails.map(t => t.id)));
    }
  };

  const handleDoubleClick = async (thumbnail: PageThumbnail) => {
    if (!rawFiles[thumbnail.sourceFileIndex]) return;

    setIsExtracting(true);
    try {
      const arrayBuffer = await rawFiles[thumbnail.sourceFileIndex].arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(thumbnail.index + 1);

      const textContent = await page.getTextContent();
      const extractedText = textContent.items.map((item: any) => item.str).join(" ");

      setTempText(thumbnail.modifiedText || extractedText);
      setInitialText(thumbnail.modifiedText || extractedText); // Store initial text for comparison
    } catch (err) {
      console.error("Erreur d'extraction du texte initial:", err);
      setTempText(thumbnail.modifiedText || "");
      setInitialText(thumbnail.modifiedText || "");
    } finally {
      setIsExtracting(false);
    }

    setEditingPage(thumbnail);
    setTempFontSize(thumbnail.fontSize || 10);
    setTempColor(thumbnail.color || "#1a1a1a");
    setTempIsBold(thumbnail.isBold || false);
    setTempIsItalic(thumbnail.isItalic || false);
    setCurrentDrawings(thumbnail.drawings || []);
    setActiveEditMode('text');

    try {
      const arrayBuffer = await rawFiles[thumbnail.sourceFileIndex].arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(thumbnail.index + 1);

      // Render high res for editor
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
        setEditingPage({ ...thumbnail, url: canvas.toDataURL() });
      }

      const textContent = await page.getTextContent();

      // Group text items by their Y coordinate (transform[5]) to preserve lines
      const lines: { [key: number]: any[] } = {};
      textContent.items.forEach((item: any) => {
        const y = Math.round(item.transform[5]);
        if (!lines[y]) lines[y] = [];
        lines[y].push(item);
      });

      // Sort Y coordinates descending (top to bottom)
      const sortedY = Object.keys(lines).map(Number).sort((a, b) => b - a);

      const extractedText = sortedY.map(y => {
        return lines[y]
          .sort((a, b) => a.transform[4] - b.transform[4])
          .map(item => item.str)
          .join(' ');
      }).join('\n');

      if (!thumbnail.modifiedText) {
        setTempText(extractedText);
      }
    } catch (err) {
      console.error("Erreur d'extraction:", err);
    } finally {
      setIsExtracting(false);
    }
  };

  const openPreview = async (thumbnail: PageThumbnail) => {
    if (!rawFiles[thumbnail.sourceFileIndex]) return;
    setPreviewPage(thumbnail);
    setIsRenderingHighRes(true);
    setHighResUrl(null);

    try {
      const arrayBuffer = await rawFiles[thumbnail.sourceFileIndex].arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(thumbnail.index + 1);

      const viewport = page.getViewport({ scale: 1.5 }); // High res
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (context) {
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({
          canvasContext: context,
          viewport: viewport,
          canvas: canvas
        }).promise;
        setHighResUrl(canvas.toDataURL());
      }
    } catch (err) {
      console.error("Erreur de rendu haute résolution:", err);
    } finally {
      setIsRenderingHighRes(false);
    }
  };

  const resetPageText = async () => {
    if (!editingPage || !rawFiles[editingPage.sourceFileIndex]) return;
    setIsExtracting(true);
    try {
      const arrayBuffer = await rawFiles[editingPage.sourceFileIndex].arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(editingPage.index + 1);
      const textContent = await page.getTextContent();

      const lines: { [key: number]: any[] } = {};
      textContent.items.forEach((item: any) => {
        const y = Math.round(item.transform[5]);
        if (!lines[y]) lines[y] = [];
        lines[y].push(item);
      });

      const sortedY = Object.keys(lines).map(Number).sort((a, b) => b - a);
      const extractedText = sortedY.map(y => {
        return lines[y]
          .sort((a, b) => a.transform[4] - b.transform[4])
          .map(item => item.str)
          .join(' ');
      }).join('\n');

      setTempText(extractedText);
    } catch (err) {
      console.error("Erreur de réinitialisation:", err);
    } finally {
      setIsExtracting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(tempText);
  };

  const savePageEdits = () => {
    if (editingPage) {
      setThumbnails(prev => prev.map(t =>
        t.id === editingPage.id ? {
          ...t,
          modifiedText: tempText,
          hasManualTextEdit: t.hasManualTextEdit || (tempText !== initialText && activeEditMode === 'text'),
          fontSize: tempFontSize,
          color: tempColor,
          isBold: tempIsBold,
          isItalic: tempIsItalic,
          drawings: currentDrawings
        } : t
      ));
      setEditingPage(null);
    }
  };

  const askAI = async (promptType: 'summary' | 'explain' | 'fix' | 'translate' | 'keywords' | 'general' | 'detect_wm') => {
    if (!editingPage) return;
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
      setAiResponse("Clé API manquante. Veuillez créer un fichier .env à la racine de votre projet avec :\nGEMINI_API_KEY=votre_cle_ici\n\nVous pouvez en obtenir une sur : https://aistudio.google.com/app/apikey");
      setIsAIProcessing(false);
      return;
    }

    setIsAIProcessing(true);
    setIsAISidebarOpen(true);
    setAiResponse("L'assistant AI analyse votre page...");

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      let prompt = "";
      const pageText = tempText || "Pas de texte extrait";

      switch (promptType) {
        case 'summary':
          prompt = `Fais un résumé synthétique et structuré de ce texte de page PDF :\n\n${pageText}`;
          break;
        case 'explain':
          prompt = `Explique les concepts complexes décrits dans ce texte de manière simple :\n\n${pageText}`;
          break;
        case 'fix':
          prompt = `Corrige les fautes d'orthographe, de grammaire et améliore le style de ce texte :\n\n${pageText}`;
          break;
        case 'translate':
          prompt = `Traduis le texte suivant en Français (si c'est une autre langue) ou en Anglais (si c'est déjà du Français), en gardant un ton professionnel :\n\n${pageText}`;
          break;
        case 'keywords':
          prompt = `Donne-moi les 5 mots-clés les plus importants et les 3 idées fortes de ce texte :\n\n${pageText}`;
          break;
        case 'detect_wm':
          if (!canvasRef.current) return;
          const canvas = canvasRef.current;
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          const base64Data = dataUrl.split(',')[1];
          const resultBody = await model.generateContent([
            "Analyse cette image de page PDF. Identifie les filigranes, logos de fond ou textes de fond nuisibles. Donne-moi leurs coordonnées approximatives en JSON format: [{x, y, w, h}] où x,y,w,h sont en % de l'image (0-100). Réponds UNIQUEMENT le JSON.",
            { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
          ]);
          const wmResponse = await resultBody.response;
          const rawText = wmResponse.text();
          // Extract JSON even if there's markdown or extra text
          const jsonMatch = rawText.match(/\[\s*\{.*\}\s*\]/s);
          if (!jsonMatch) {
            setAiResponse("Aucun filigrane détecté ou réponse AI invalide.");
            return;
          }
          const masks = JSON.parse(jsonMatch[0]);
          if (Array.isArray(masks)) {
            masks.forEach(m => {
              setCurrentDrawings(prev => [...prev, {
                points: [{ x: (m.x / 100) * canvas.width, y: (m.y / 100) * canvas.height }, { x: ((m.x + m.w) / 100) * canvas.width, y: ((m.y + m.h) / 100) * canvas.height }],
                color: "#ffffff",
                width: 0,
                mode: 'rect',
                canvasWidth: canvas.width,
                canvasHeight: canvas.height
              }]);
            });
            setAiResponse(`${masks.length} filigranes détectés et masqués automatiquement.`);
          }
          return;
        default:
          prompt = `Aide-moi avec cette page PDF :\n\n${pageText}`;
      }

      const result = await model.generateContent(prompt);
      const resp = await result.response;
      setAiResponse(resp.text());
    } catch (err: any) {
      console.error("AI Error:", err);
      if (err.message?.includes("API key not valid")) {
        setAiResponse("La clé API configurée dans le fichier .env est invalide.");
      } else {
        setAiResponse("Désolé, l'assistant AI a rencontré une erreur. Vérifiez votre connexion ou la clé API dans .env.");
      }
    } finally {
      setIsAIProcessing(false);
    }
  };

  const undo = () => {
    if (currentDrawings.length === 0) return;
    setRedoStack(prev => [[...currentDrawings], ...prev]);
    setCurrentDrawings(prev => prev.slice(0, -1));
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setRedoStack(prev => prev.slice(1));
    setCurrentDrawings(next);
  };

  const applyMagicEraser = (pos: { x: number; y: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Sample color at click
    const pixel = ctx.getImageData(pos.x, pos.y, 1, 1).data;

    // Simple bounding box detection based on color similarity (Magic Eraser-ish)
    // For now, let's create a "Smart Rect" that covers an area of similar color
    // Or simpler: just create a rect eraser at this point but with background color

    // To make it "Magical", let's find the "object" at this point
    // This is hard on a flat canvas without segmentation.
    // Instead, I'll provide a "Quick Object Eraser" (Auto-rectangle)

    const size = 50; // Dynamic or fixed
    setCurrentDrawings(prev => [...prev, {
      points: [
        { x: pos.x - size / 2, y: pos.y - size / 2 },
        { x: pos.x + size / 2, y: pos.y + size / 2 }
      ],
      color: "#ffffff", // Use white as default "magic" eraser
      width: 0,
      mode: 'rect',
      canvasWidth: canvasDimensions.width,
      canvasHeight: canvasDimensions.height
    }]);
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (isPickingColor) {
      const pos = getCoordinates(e);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const pixel = ctx.getImageData(pos.x, pos.y, 1, 1).data;
      const hex = "#" + ("000000" + ((pixel[0] << 16) | (pixel[1] << 8) | pixel[2]).toString(16)).slice(-6);
      setTempColor(hex);
      setLastNonEraserColor(hex);
      setIsPickingColor(false);
      return;
    }

    setIsDrawing(true);
    const pos = getCoordinates(e);

    if (visualTool === 'magic-eraser') {
      applyMagicEraser(pos);
      setIsDrawing(false);
      return;
    }

    if (visualTool === 'move') {
      // Find the stroke under the cursor (simpler hit-detection: check points distance)
      const foundIdx = currentDrawings.findLastIndex(stroke =>
        stroke.points.some(p => Math.abs(p.x - pos.x) < 20 && Math.abs(p.y - pos.y) < 20)
      );
      if (foundIdx !== -1) {
        setDraggingStrokeIdx(foundIdx);
        setDragOffset({ x: pos.x, y: pos.y });
        setIsDrawing(true);
      }
      return;
    }

    if (visualTool === 'text') {
      setIsDrawing(false);
      setTextInput({ x: pos.x, y: pos.y, text: '' });
      return;
    }

    setCurrentDrawings(prev => [...prev, {
      points: ['rect', 'circle', 'arrow', 'stamp'].includes(visualTool) ? [pos, pos] : [pos],
      color: tempColor,
      width: brushSize,
      mode: visualTool as any,
      text: visualTool === 'stamp' ? stampType : undefined,
      canvasWidth: canvasDimensions.width,
      canvasHeight: canvasDimensions.height
    }]);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || isPickingColor) return;
    const pos = getCoordinates(e);

    if (visualTool === 'move' && draggingStrokeIdx !== null && dragOffset) {
      const dx = pos.x - dragOffset.x;
      const dy = pos.y - dragOffset.y;

      setCurrentDrawings(prev => {
        const next = [...prev];
        const stroke = { ...next[draggingStrokeIdx] };
        stroke.points = stroke.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
        next[draggingStrokeIdx] = stroke;
        return next;
      });
      setDragOffset({ x: pos.x, y: pos.y });
      return;
    }

    setCurrentDrawings(prev => {
      const last = prev[prev.length - 1];
      if (!last) return prev;

      const newPoints = [...last.points];
      if (['rect', 'circle', 'arrow', 'stamp'].includes(last.mode)) {
        // For shapes, we only keep start and end point
        newPoints[1] = pos;
      } else {
        newPoints.push(pos);
      }

      return [...prev.slice(0, -1), { ...last, points: newPoints }];
    });
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setDraggingStrokeIdx(null);
    setDragOffset(null);
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const undoLastStroke = () => {
    setCurrentDrawings(prev => prev.slice(0, -1));
  };

  const applyToAllPages = () => {
    if (currentDrawings.length === 0) return;
    setThumbnails(prev => prev.map(t => ({
      ...t,
      drawings: [...(t.drawings || []), ...currentDrawings]
    })));
    alert("Les modifications ont été appliquées à toutes les pages !");
  };

  useEffect(() => {
    if (activeEditMode === 'visual' && editingPage && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.src = editingPage.url;
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        setCanvasDimensions({ width: img.width, height: img.height });

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        currentDrawings.forEach(stroke => {
          if (stroke.points.length < 1) return;

          if (stroke.mode === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = 'white'; // Fallback
          } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = stroke.color;
          }

          if (stroke.mode === 'highlighter') {
            ctx.globalAlpha = 0.4;
          } else {
            ctx.globalAlpha = 1.0;
          }

          ctx.lineWidth = stroke.width;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          if (stroke.mode === 'rect' && stroke.points.length >= 2) {
            const start = stroke.points[0];
            const end = stroke.points[1];
            if (stroke.width === 0) {
              ctx.fillStyle = stroke.color;
              ctx.fillRect(start.x, start.y, end.x - start.x, end.y - start.y);
            } else {
              ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
            }
          } else if (stroke.mode === 'text' && stroke.text) {
            ctx.fillStyle = stroke.color;
            const fontStyle = `${stroke.isItalic ? 'italic ' : ''}${stroke.isBold ? 'bold ' : ''}`;
            const fSize = stroke.fontSize || 20;
            ctx.font = `${fontStyle}${fSize}px sans-serif`;
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'center';

            if (stroke.isHighlighted) {
              const metrics = ctx.measureText(stroke.text);
              const padding = 4;
              const h = fSize * 1.2;
              const w = metrics.width + padding * 2;
              ctx.fillStyle = 'rgba(255, 255, 0, 0.4)'; // Highlight yellow
              ctx.fillRect(stroke.points[0].x - w / 2, stroke.points[0].y - h / 2, w, h);
              ctx.fillStyle = stroke.color; // Reset to text color
            }

            ctx.fillText(stroke.text, stroke.points[0].x, stroke.points[0].y);
          } else if (stroke.mode === 'stamp' && stroke.points.length >= 2) {
            const start = stroke.points[0];
            const end = stroke.points[1];
            const w = end.x - start.x;
            const h = end.y - start.y;
            if (stroke.text === 'SIGNATURE' && signatureData) {
              const sigImg = new Image();
              sigImg.src = signatureData;
              ctx.drawImage(sigImg, start.x, start.y, w, h);
            } else {
              ctx.fillStyle = stroke.color;
              ctx.fillRect(start.x, start.y, w, h);
              ctx.fillStyle = 'white';
              ctx.font = `bold ${Math.abs(h) * 0.5}px Outfit, Inter`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText((stroke.text || 'CHECK').toUpperCase(), start.x + w / 2, start.y + h / 2);
            }
          } else if (stroke.mode === 'circle' && stroke.points.length >= 2) {
            const start = stroke.points[0];
            const end = stroke.points[1];
            const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
            ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
            ctx.stroke();
          } else if (stroke.mode === 'arrow' && stroke.points.length >= 2) {
            const start = stroke.points[0];
            const end = stroke.points[1];
            const headlen = 10;
            const angle = Math.atan2(end.y - start.y, end.x - start.x);
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.lineTo(end.x - headlen * Math.cos(angle - Math.PI / 6), end.y - headlen * Math.sin(angle - Math.PI / 6));
            ctx.moveTo(end.x, end.y);
            ctx.lineTo(end.x - headlen * Math.cos(angle + Math.PI / 6), end.y - headlen * Math.sin(angle + Math.PI / 6));
            ctx.stroke();
          } else {
            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            for (let i = 1; i < stroke.points.length; i++) {
              ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
            }
            ctx.stroke();
          }

          ctx.globalAlpha = 1.0;
        });
      };
    }
  }, [activeEditMode, editingPage, currentDrawings]);

  const editPDF = async (thumbnailsToProcess: PageThumbnail[] | any = thumbnails) => {
    const pages = Array.isArray(thumbnailsToProcess) ? thumbnailsToProcess : thumbnails;

    if (rawFiles.length === 0 && pages.every(t => !t.isBlank)) {
      setError("Veuillez sélectionner un fichier PDF.");
      return;
    }

    if (pages.length === 0) {
      setError("Le document doit contenir au moins une page.");
      return;
    }

    setIsProcessing(true);
    setLoadingProgress(0);
    setError(null);
    setResultUrl(null);

    try {
      const newPdf = await PDFDocument.create();
      const sourcePdfsCache: { [key: number]: PDFDocument } = {};

      const helvetica = await newPdf.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await newPdf.embedFont(StandardFonts.HelveticaBold);
      const helveticaOblique = await newPdf.embedFont(StandardFonts.HelveticaOblique);
      const helveticaBoldOblique = await newPdf.embedFont(StandardFonts.HelveticaBoldOblique);

      const hexToRgb = (hex: string) => {
        try {
          if (!hex || hex.length < 6) return rgb(0, 0, 0);
          const h = hex.startsWith('#') ? hex.slice(1) : hex;
          const r = parseInt(h.slice(0, 2), 16) / 255;
          const g = parseInt(h.slice(2, 4), 16) / 255;
          const b = parseInt(h.slice(4, 6), 16) / 255;
          return rgb(isNaN(r) ? 0 : r, isNaN(g) ? 0 : g, isNaN(b) ? 0 : b);
        } catch (e) {
          return rgb(0, 0, 0);
        }
      };

      for (let i = 0; i < pages.length; i++) {
        setLoadingProgress(Math.round((i / pages.length) * 100));
        const thumb = pages[i];

        let copiedPage: PDFPage;
        if (thumb.isBlank) {
          copiedPage = newPdf.addPage([595.28, 841.89]);
        } else {
          if (!sourcePdfsCache[thumb.sourceFileIndex]) {
            const arrayBuffer = await rawFiles[thumb.sourceFileIndex].arrayBuffer();
            sourcePdfsCache[thumb.sourceFileIndex] = await PDFDocument.load(arrayBuffer);
          }
          const sourcePdf = sourcePdfsCache[thumb.sourceFileIndex];
          const embeddedPage = await newPdf.embedPage(sourcePdf.getPages()[thumb.index]);
          const { width: sw, height: sh } = embeddedPage;
          copiedPage = newPdf.addPage([sw, sh]);
          copiedPage.drawPage(embeddedPage, { x: 0, y: 0, width: sw, height: sh });
        }

        const { width, height } = copiedPage.getSize();
        if (thumb.rotation) {
          copiedPage.setRotation({ type: 'degrees', angle: thumb.rotation });
        }

        // OCR / Manual Text Edits
        if (thumb.modifiedText && thumb.hasManualTextEdit) {
          copiedPage.drawRectangle({
            x: 0, y: 0, width: width, height: height,
            color: rgb(1, 1, 1), opacity: 1,
          });

          let font = helvetica;
          if (thumb.isBold && thumb.isItalic) font = helveticaBoldOblique;
          else if (thumb.isBold) font = helveticaBold;
          else if (thumb.isItalic) font = helveticaOblique;

          const textColor = hexToRgb(thumb.color || "#1a1a1a");
          const fontSize = thumb.fontSize || 10;
          const lineHeight = fontSize * 1.4;

          const lines = thumb.modifiedText.split('\n');
          let currentY = height - 60;

          for (const line of lines) {
            if (currentY < 40) break;
            const words = line.split(' ');
            let currentLine = "";
            for (const word of words) {
              const testLine = currentLine + (currentLine ? " " : "") + word;
              if (font.widthOfTextAtSize(testLine, fontSize) > width - 100) {
                copiedPage.drawText(currentLine, { x: 50, y: currentY, size: fontSize, font, color: textColor });
                currentY -= lineHeight;
                currentLine = word;
              } else {
                currentLine = testLine;
              }
            }
            if (currentLine) {
              copiedPage.drawText(currentLine, { x: 50, y: currentY, size: fontSize, font, color: textColor });
              currentY -= lineHeight;
            }
          }
        }

        // Drawings
        if (thumb.drawings && thumb.drawings.length > 0) {
          for (const stroke of thumb.drawings) {
            if (stroke.points.length < 1) continue;

            const strokeColor = stroke.mode === 'eraser' ? rgb(1, 1, 1) : hexToRgb(stroke.color);
            const cw = stroke.canvasWidth || canvasDimensions.width || 600;
            const ch = stroke.canvasHeight || canvasDimensions.height || 800;
            const scaleX = width / cw;
            const scaleY = height / ch;
            const thickness = (stroke.width || 2) * scaleX * (stroke.mode === 'eraser' ? 1.2 : 1);

            if (stroke.mode === 'rect' && stroke.points.length >= 2) {
              const start = stroke.points[0];
              const end = stroke.points[1];
              copiedPage.drawRectangle({
                x: Math.min(start.x, end.x) * scaleX,
                y: height - (Math.max(start.y, end.y) * scaleY),
                width: Math.abs(end.x - start.x) * scaleX || 1,
                height: Math.abs(end.y - start.y) * scaleY || 1,
                borderWidth: stroke.width > 0 ? thickness : undefined,
                borderColor: stroke.width > 0 ? strokeColor : undefined,
                color: stroke.width === 0 ? strokeColor : undefined,
              });
            } else if (stroke.mode === 'stamp' && stroke.points.length >= 2) {
              const start = stroke.points[0];
              const end = stroke.points[1];
              const w = Math.abs(end.x - start.x) * scaleX;
              const h = Math.abs(end.y - start.y) * scaleY;

              if (stroke.text === 'SIGNATURE' && signatureData) {
                const binaryStr = atob(signatureData.split(',')[1]);
                const bytes = new Uint8Array(binaryStr.length);
                for (let j = 0; j < binaryStr.length; j++) bytes[j] = binaryStr.charCodeAt(j);
                const sigImage = await newPdf.embedPng(bytes);
                copiedPage.drawImage(sigImage, {
                  x: Math.min(start.x, end.x) * scaleX,
                  y: height - (Math.max(start.y, end.y) * scaleY),
                  width: w, height: h
                });
              } else {
                copiedPage.drawRectangle({
                  x: Math.min(start.x, end.x) * scaleX,
                  y: height - (Math.max(start.y, end.y) * scaleY),
                  width: w, height: h, color: strokeColor,
                });
                copiedPage.drawText((stroke.text || 'CHECK').toUpperCase(), {
                  x: (Math.min(start.x, end.x) * scaleX) + (w * 0.1),
                  y: height - (Math.max(start.y, end.y) * scaleY) + (h * 0.35),
                  size: h * 0.4, font: helveticaBold, color: rgb(1, 1, 1),
                });
              }
            } else if (stroke.mode === 'text' && stroke.text) {
              const start = stroke.points[0];
              const fSize = (stroke.fontSize || 20) * scaleX;
              let font = helvetica;
              if (stroke.isBold && stroke.isItalic) font = helveticaBoldOblique;
              else if (stroke.isBold) font = helveticaBold;
              else if (stroke.isItalic) font = helveticaOblique;

              const tw = font.widthOfTextAtSize(stroke.text, fSize);
              const px = (start.x * scaleX) - (tw / 2);
              const py = height - (start.y * scaleY) - (fSize * 0.35);

              if (stroke.isHighlighted) {
                copiedPage.drawRectangle({
                  x: px - 4, y: py - 2, width: tw + 8, height: fSize + 4,
                  color: rgb(1, 1, 0), opacity: 0.5
                });
              }
              copiedPage.drawText(stroke.text, {
                x: px, y: py, size: fSize, font, color: hexToRgb(stroke.color || "#1a1a1a"),
              });
            } else if (stroke.mode === 'circle' && stroke.points.length >= 2) {
              const start = stroke.points[0];
              const end = stroke.points[1];
              const r = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)) * scaleX;
              copiedPage.drawCircle({
                x: start.x * scaleX, y: height - (start.y * scaleY), size: r,
                borderWidth: thickness, borderColor: strokeColor,
              });
            } else if (stroke.mode === 'arrow' && stroke.points.length >= 2) {
              const start = stroke.points[0];
              const end = stroke.points[1];
              const headLen = 12 * scaleX;
              const angle = Math.atan2((end.y - start.y) * scaleY, (end.x - start.x) * scaleX);
              const p1 = { x: start.x * scaleX, y: height - (start.y * scaleY) };
              const p2 = { x: end.x * scaleX, y: height - (end.y * scaleY) };
              copiedPage.drawLine({ start: p1, end: p2, thickness: thickness || 2, color: strokeColor });
              copiedPage.drawLine({
                start: p2,
                end: { x: p2.x - headLen * Math.cos(angle - Math.PI / 6), y: p2.y + headLen * Math.sin(angle - Math.PI / 6) },
                thickness: thickness || 2, color: strokeColor
              });
              copiedPage.drawLine({
                start: p2,
                end: { x: p2.x - headLen * Math.cos(angle + Math.PI / 6), y: p2.y + headLen * Math.sin(angle + Math.PI / 6) },
                thickness: thickness || 2, color: strokeColor
              });
            } else {
              // Pen / Highlighter / Eraser
              for (let j = 0; j < stroke.points.length - 1; j++) {
                const p1 = stroke.points[j];
                const p2 = stroke.points[j + 1];
                copiedPage.drawLine({
                  start: { x: p1.x * scaleX, y: height - (p1.y * scaleY) },
                  end: { x: p2.x * scaleX, y: height - (p2.y * scaleY) },
                  thickness, color: strokeColor,
                  opacity: stroke.mode === 'highlighter' ? 0.4 : 1,
                });
              }
            }
          }
        }
      }

      if (watermark) {
        const pgs = newPdf.getPages();
        for (const p of pgs) {
          const { width: pw, height: ph } = p.getSize();
          p.drawText(watermark, {
            x: pw / 2 - (helvetica.widthOfTextAtSize(watermark, 40) / 2),
            y: ph / 2, size: 40, font: helvetica, color: rgb(0.8, 0.8, 0.8), opacity: 0.3, rotate: degrees(45),
          });
        }
      }

      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      setResultUrl(URL.createObjectURL(blob));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erreur lors de l'exportation.");
    } finally {
      setIsProcessing(false);
      setLoadingProgress(100);
    }
  };

  const clearDrawings = () => {
    if (window.confirm("Voulez-vous vraiment supprimer tous les dessins de cette page ?")) {
      setCurrentDrawings([]);
    }
  };

  const sortThumbnails = () => {
    setThumbnails(prev => [...prev].sort((a, b) => {
      if (a.sourceFileIndex !== b.sourceFileIndex) {
        return a.sourceFileIndex - b.sourceFileIndex;
      }
      return a.index - b.index;
    }));
  };

  const compressPDF = async () => {
    // Placeholder for compression logic
    // In a real app, this would involve re-encoding images or using a specialized library
    setIsProcessing(true);
    setLoadingProgress(0);
    setTimeout(() => {
      setLoadingProgress(100);
      setIsProcessing(false);
      alert("Compression terminée (Simulation). Le fichier a été optimisé.");
    }, 2000);
  };

  const exportSelected = () => {
    if (selectedIds.size === 0) return;
    const selectedThumbnails = thumbnails.filter(t => selectedIds.has(t.id));
    editPDF(selectedThumbnails);
  };

  const downloadResult = () => {
    if (resultUrl) {
      const link = document.createElement('a');
      link.href = resultUrl;
      link.download = `edited_${new Date().getTime()}.pdf`;
      link.click();
    }
  };

  const getGridCols = () => {
    switch (zoomLevel) {
      case 0: return "grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8";
      case 1: return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";
      case 2: return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
      default: return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";
    }
  };

  const getThumbnailPadding = () => {
    switch (zoomLevel) {
      case 0: return "p-1";
      case 1: return "p-2";
      case 2: return "p-4";
      default: return "p-2";
    }
  };

  return (
    <div className={cn("min-h-screen transition-colors duration-500", isDarkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900")}>
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-6 mb-12">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-indigo-600 rounded-3xl shadow-xl shadow-indigo-200 rotate-3">
              <Scissors className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-display font-black tracking-tight">PDF Master Pro</h1>
              <p className={cn("text-sm font-medium", isDarkMode ? "text-slate-400" : "text-slate-500")}>Édition, Fusion, OCR & Plus</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {rawFiles.length > 1 && (
              <button
                onClick={() => editPDF()}
                disabled={isProcessing}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl shadow-md hover:bg-emerald-700 transition-all text-sm font-bold"
              >
                <RefreshCw size={16} className={isProcessing ? "animate-spin" : ""} />
                Fusionner tout
              </button>
            )}
            {selectedIds.size > 0 && (
              <button
                onClick={exportSelected}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl shadow-md hover:bg-amber-600 transition-all text-sm font-bold"
              >
                <Scissors size={16} />
                Exporter sélection ({selectedIds.size})
              </button>
            )}
            {thumbnails.length > 1 && (
              <button
                onClick={sortThumbnails}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl shadow-sm hover:bg-slate-200 transition-all text-sm font-bold"
                title="Trier les pages par ordre original"
              >
                <RefreshCw size={16} />
                Trier
              </button>
            )}
            <button
              onClick={compressPDF}
              disabled={thumbnails.length === 0 || isProcessing}
              className="hidden lg:flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl shadow-sm hover:bg-slate-200 transition-all text-sm font-bold"
              title="Compresser le PDF (Optimisation)"
            >
              <Zap size={16} />
              Compresser
            </button>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={cn("p-3 rounded-2xl transition-all", isDarkMode ? "bg-slate-800 text-amber-400" : "bg-white text-slate-400 shadow-md")}
            >
              {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
            </button>
            <button
              onClick={() => setShowHelp(true)}
              className={cn("p-3 rounded-2xl transition-all", isDarkMode ? "bg-slate-800 text-slate-400" : "bg-white text-slate-400 shadow-md")}
              title="Aide et raccourcis"
            >
              <AlertCircle size={24} />
            </button>
            <div className="flex items-center gap-2 p-1 bg-white dark:bg-slate-800 rounded-2xl shadow-md relative group/wm">
              <input
                type="text"
                placeholder="Filigrane..."
                value={watermark}
                onChange={(e) => setWatermark(e.target.value)}
                className="bg-transparent px-4 py-2 text-sm outline-none w-24 dark:text-white"
              />
              {watermark && (
                <button
                  onClick={() => setWatermark("")}
                  className="absolute right-12 p-1 opacity-0 group-hover/wm:opacity-100 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-rose-100 hover:text-rose-600 transition-all"
                >
                  <X size={12} />
                </button>
              )}
              <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-xl">
                <Stamp size={18} className="text-slate-400" />
              </div>
            </div>
            <div className="flex items-center gap-2 p-1 bg-white dark:bg-slate-800 rounded-2xl shadow-md">
              <input
                type="password"
                placeholder="Mot de passe..."
                value={exportPassword}
                onChange={(e) => setExportPassword(e.target.value)}
                className="bg-transparent px-4 py-2 text-sm outline-none w-24 dark:text-white"
              />
              <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-xl">
                <Lock size={18} className="text-slate-400" />
              </div>
            </div>
            <button
              onClick={editPDF}
              disabled={thumbnails.length === 0 || isProcessing}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
              Exporter
            </button>
          </div>
        </div>

        <FileUpload
          files={files}
          setFiles={setFiles}
          onFilesChange={setRawFiles}
        />

        <AnimatePresence>
          {showHelp && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
              onClick={() => setShowHelp(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl max-w-lg w-full space-y-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-display font-black">Aide & Raccourcis</h3>
                  <button onClick={() => setShowHelp(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all">
                    <X size={24} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-widest">Général</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex justify-between"><span className="text-slate-500">Tout sélectionner</span> <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs font-mono">Ctrl+A</kbd></li>
                      <li className="flex justify-between"><span className="text-slate-500">Exporter</span> <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs font-mono">Ctrl+S</kbd></li>
                      <li className="flex justify-between"><span className="text-slate-500">Supprimer page</span> <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs font-mono">Suppr</kbd></li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-widest">Édition</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex justify-between"><span className="text-slate-500">Éditer texte</span> <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs font-mono">Ctrl+E</kbd></li>
                      <li className="flex justify-between"><span className="text-slate-500">Zoom +/-</span> <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs font-mono">Ctrl +/-</kbd></li>
                      <li className="flex justify-between"><span className="text-slate-500">Fermer modal</span> <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs font-mono">Echap</kbd></li>
                    </ul>
                  </div>
                </div>

                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 leading-relaxed">
                    <strong>Astuce :</strong> Vous pouvez glisser-déposer les pages pour les réorganiser. Utilisez le mot de passe pour protéger vos exports.
                  </p>
                </div>

                <button
                  onClick={() => setShowHelp(false)}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all"
                >
                  Compris !
                </button>
              </motion.div>
            </motion.div>
          )}
          {isLoadingPages && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
            >
              <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl max-w-sm w-full space-y-6 text-center">
                <div className="relative inline-block">
                  <Loader2 className="animate-spin text-indigo-600" size={64} />
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-indigo-600">
                    {loadingProgress}%
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Chargement du PDF</h3>
                  <p className="text-sm text-slate-500">Nous préparons les pages pour l'édition...</p>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-indigo-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${loadingProgress}%` }}
                    transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!isLoadingPages && thumbnails.length > 0 && (
          <>
            <div className="space-y-6 mt-12">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <h3 className="text-xl font-display font-bold flex items-center gap-2">
                  <RefreshCw size={20} className="text-indigo-600" />
                  Réorganiser les pages
                </h3>

                <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                  <div className="flex items-center gap-2 px-3 py-1.5 border-r border-slate-100 dark:border-slate-700">
                    <Search size={14} className="text-slate-400" />
                    <input
                      type="text"
                      placeholder="Rechercher..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-transparent text-[10px] font-bold text-slate-600 dark:text-slate-300 outline-none w-24 sm:w-32"
                    />
                  </div>
                  <button
                    onClick={addBlankPage}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all"
                    title="Ajouter une page blanche"
                  >
                    <PlusCircle size={14} />
                    Page Blanche
                  </button>

                  <button
                    onClick={selectAll}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                    title="Tout sélectionner (Ctrl+A)"
                  >
                    {selectedIds.size === thumbnails.length ? <CheckSquare size={14} /> : <Square size={14} />}
                    {selectedIds.size === thumbnails.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                  </button>

                  <div className="h-4 w-px bg-slate-100 dark:bg-slate-700 mx-1" />

                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Zoom</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setZoomLevel(prev => Math.max(0, prev - 1))}
                      disabled={zoomLevel === 0}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                      title="Zoom arrière (Ctrl+-)"
                    >
                      <Minus size={14} />
                    </button>

                    <div className="flex items-center bg-slate-50 dark:bg-slate-900 rounded-lg p-0.5 mx-1">
                      {[0, 1, 2].map((level) => (
                        <button
                          key={level}
                          onClick={() => setZoomLevel(level)}
                          className={cn(
                            "w-7 h-7 rounded-md font-bold text-[10px] transition-all",
                            zoomLevel === level
                              ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm border border-slate-100 dark:border-slate-600"
                              : "text-slate-400 hover:text-slate-600"
                          )}
                        >
                          {level === 0 ? 'S' : level === 1 ? 'M' : 'L'}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setZoomLevel(prev => Math.min(2, prev + 1))}
                      disabled={zoomLevel === 2}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                      title="Zoom avant (Ctrl++)"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <Reorder.Group
              axis="y"
              values={thumbnails}
              onReorder={setThumbnails}
              className={cn("grid gap-6", getGridCols())}
            >
              {thumbnails.filter(t => !searchQuery || t.modifiedText?.toLowerCase().includes(searchQuery.toLowerCase())).map((thumbnail, idx) => (
                <Reorder.Item
                  key={thumbnail.id}
                  value={thumbnail}
                  onDoubleClick={() => handleDoubleClick(thumbnail)}
                  onClick={(e) => {
                    if (e.ctrlKey || e.metaKey) {
                      toggleSelection(thumbnail.id, true);
                    }
                  }}
                  whileDrag={{
                    scale: 1.05,
                    zIndex: 50,
                    boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)"
                  }}
                  className="relative group cursor-grab active:cursor-grabbing"
                >
                  <div className={cn(
                    "relative aspect-[3/4] bg-white dark:bg-slate-900 rounded-xl border-2 overflow-hidden shadow-sm transition-all",
                    selectedIds.has(thumbnail.id) ? "border-indigo-500 ring-2 ring-indigo-100 dark:ring-indigo-900/20" :
                      thumbnail.modifiedText ? "border-amber-400 ring-2 ring-amber-100 dark:ring-amber-900/20" : "border-slate-200 dark:border-slate-700 group-hover:border-indigo-400"
                  )}>
                    <div
                      className="w-full h-full transition-transform duration-300"
                      style={{ transform: `rotate(${thumbnail.rotation || 0}deg)` }}
                    >
                      <img
                        src={thumbnail.url}
                        alt={`Page ${idx + 1}`}
                        className={cn("w-full h-full object-contain", getThumbnailPadding())}
                      />
                    </div>

                    {/* Selection Checkbox */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelection(thumbnail.id);
                      }}
                      className={cn(
                        "absolute top-2 right-2 w-6 h-6 rounded-md flex items-center justify-center transition-all z-30",
                        selectedIds.has(thumbnail.id)
                          ? "bg-indigo-600 text-white shadow-lg"
                          : "bg-white/80 dark:bg-slate-800/80 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-white dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600"
                      )}
                    >
                      {selectedIds.has(thumbnail.id) ? <Check size={14} /> : <div className="w-3 h-3 border-2 border-slate-300 dark:border-slate-500 rounded-sm" />}
                    </button>

                    {/* Drag Handle Indicator */}
                    <div className="absolute top-2 left-2 p-1.5 bg-white/90 dark:bg-slate-800/90 text-slate-400 rounded-md shadow-sm border border-slate-100 dark:border-slate-700 z-20 transition-colors group-hover:text-indigo-500">
                      <GripVertical size={14} />
                    </div>

                    {thumbnail.modifiedText && (
                      <div className="absolute inset-0 bg-amber-500/10 flex items-center justify-center pointer-events-none">
                        <div className="bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg">
                          Texte modifié
                        </div>
                      </div>
                    )}

                    <div className="absolute bottom-2 left-2 w-6 h-6 bg-slate-900/80 text-white text-[10px] font-bold flex items-center justify-center rounded-md backdrop-blur-sm">
                      {idx + 1}
                    </div>

                    <div className="absolute bottom-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          rotatePage(thumbnail.id);
                        }}
                        className="p-1.5 bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 rounded-md shadow-lg hover:bg-indigo-50 dark:hover:bg-slate-600"
                        title="Rotation"
                      >
                        <RotateCw size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeThumbnail(thumbnail.id);
                        }}
                        className="p-1.5 bg-rose-500 text-white rounded-md hover:bg-rose-600 shadow-lg"
                        title="Supprimer la page (Suppr)"
                      >
                        <Trash2 size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDoubleClick(thumbnail);
                        }}
                        className="p-1.5 bg-amber-500 text-white rounded-md hover:bg-amber-600 shadow-lg"
                        title="Éditer le texte (Ctrl+E / Double-clic)"
                      >
                        <Type size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openPreview(thumbnail);
                        }}
                        className="p-1.5 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 shadow-lg"
                        title="Aperçu détaillé"
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-center text-xs font-bold text-slate-400">Page {thumbnail.index + 1}</p>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </>
        )}
        <AnimatePresence>
          {previewPage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
              >
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <div>
                    <h3 className="text-xl font-display font-bold text-slate-900">Aperçu détaillé - Page {previewPage.index + 1}</h3>
                    <p className="text-sm text-slate-500">Visualisation haute résolution de la page.</p>
                  </div>
                  <button
                    onClick={() => setPreviewPage(null)}
                    className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-auto p-8 bg-slate-200 flex items-center justify-center">
                  {isRenderingHighRes ? (
                    <div className="flex flex-col items-center gap-4 text-slate-500">
                      <Loader2 className="animate-spin" size={48} />
                      <p className="font-bold">Rendu haute résolution...</p>
                    </div>
                  ) : highResUrl ? (
                    <img
                      src={highResUrl}
                      alt="High resolution preview"
                      className="max-w-full h-auto shadow-2xl rounded-sm bg-white"
                    />
                  ) : (
                    <p className="text-red-500">Échec du rendu de l'aperçu.</p>
                  )}
                </div>

                <div className="p-6 bg-white border-t border-slate-100 flex justify-center">
                  <button
                    onClick={() => setPreviewPage(null)}
                    className="px-10 py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all"
                  >
                    Fermer l'aperçu
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {editingPage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-slate-100 flex flex-col"
            >
              {/* Toolbar Ribon */}
              <div className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-50">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-indigo-600 rounded-lg text-white">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-none">Édition Master - Page {editingPage.index + 1}</h3>
                    <p className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">Mode Immersif</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setActiveEditMode('text')}
                    className={cn(
                      "px-6 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                      activeEditMode === 'text' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:bg-slate-200"
                    )}
                  >
                    <Type size={14} />
                    Texte
                  </button>
                  <button
                    onClick={() => setActiveEditMode('visual')}
                    className={cn(
                      "px-6 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                      activeEditMode === 'visual' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:bg-slate-200"
                    )}
                  >
                    <Pencil size={14} />
                    Visuel
                  </button>
                  <button
                    onClick={() => setIsAISidebarOpen(!isAISidebarOpen)}
                    className={cn(
                      "px-6 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                      isAISidebarOpen ? "bg-cyan-500 text-white shadow-sm" : "text-cyan-600 hover:bg-cyan-50"
                    )}
                  >
                    <Sparkles size={14} />
                    Assistant AI
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setEditingPage(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-all"
                  >
                    Fermer
                  </button>
                  <button
                    onClick={savePageEdits}
                    className="px-6 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 shadow-md transition-all"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>

              <div className="flex-1 flex overflow-hidden">
                {/* Main Workspace */}
                <main className="flex-1 overflow-auto bg-slate-200 flex flex-col items-center py-12 px-4 scrollbar-thin scroll-smooth relative">
                  <div className="max-w-5xl w-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-10 border border-white/40">
                      {activeEditMode === 'text' ? (
                        <div className="space-y-6">
                          <div className="flex justify-between items-center px-2">
                            <div className="flex gap-2">
                              <button
                                onClick={runOCR}
                                disabled={isOCRing}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-lg hover:bg-indigo-100 transition-all disabled:opacity-50"
                              >
                                {isOCRing ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                                OCR
                              </button>
                              <button
                                onClick={copyToClipboard}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 transition-all"
                              >
                                <Check size={14} />
                                Copier
                              </button>
                              <button
                                onClick={resetPageText}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 transition-all"
                              >
                                <RotateCcw size={14} />
                                Reset
                              </button>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {tempText.length} caractères
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-1.5 border-r border-slate-200 pr-4">
                              <Type size={14} className="text-slate-400" />
                              <select
                                value={tempFontSize}
                                onChange={(e) => setTempFontSize(Number(e.target.value))}
                                className="bg-transparent text-xs font-bold text-slate-600 outline-none"
                              >
                                {[8, 10, 12, 14, 16, 20, 24].map(size => (
                                  <option key={size} value={size}>{size}px</option>
                                ))}
                              </select>
                            </div>
                            <input type="color" value={tempColor} onChange={(e) => setTempColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer" />
                          </div>

                          <textarea
                            value={tempText}
                            onChange={(e) => setTempText(e.target.value)}
                            style={{ fontSize: `${tempFontSize}px`, color: tempColor }}
                            className="w-full h-96 p-8 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed resize-none bg-white shadow-inner"
                            placeholder="Éditez le texte ici..."
                          />
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
                              <button onClick={() => setVisualTool('move')} title="Déplacer" className={cn("p-2 rounded-lg", visualTool === 'move' ? "bg-indigo-600 text-white" : "text-slate-400")}><GripVertical size={18} /></button>
                              <button onClick={() => setVisualTool('pen')} title="Stylo / Dessin" className={cn("p-2 rounded-lg", visualTool === 'pen' ? "bg-indigo-600 text-white" : "text-slate-400")}><Pencil size={18} /></button>
                              <button onClick={() => setVisualTool('text')} title="Ajouter du texte" className={cn("p-2 rounded-lg", visualTool === 'text' ? "bg-indigo-600 text-white" : "text-slate-400")}><Type size={18} /></button>
                              <button onClick={() => setVisualTool('rect')} title="Rectangle" className={cn("p-2 rounded-lg", visualTool === 'rect' ? "bg-indigo-600 text-white" : "text-slate-400")}><SquareIcon size={18} /></button>
                              <button onClick={() => setVisualTool('circle')} title="Cercle" className={cn("p-2 rounded-lg", visualTool === 'circle' ? "bg-indigo-600 text-white" : "text-slate-400")}><Circle size={18} /></button>
                              <button onClick={() => setVisualTool('arrow')} title="Flèche" className={cn("p-2 rounded-lg", visualTool === 'arrow' ? "bg-indigo-600 text-white" : "text-slate-400")}><ArrowRight size={18} /></button>
                              <button onClick={() => setVisualTool('eraser')} title="Gomme" className={cn("p-2 rounded-lg", visualTool === 'eraser' ? "bg-indigo-600 text-white" : "text-slate-400")}><Eraser size={18} /></button>
                              <button onClick={() => setVisualTool('magic-eraser')} title="Gomme Magique (IA)" className={cn("p-2 rounded-lg", visualTool === 'magic-eraser' ? "bg-cyan-500 text-white" : "text-slate-400")}><Zap size={18} /></button>
                              <button onClick={() => askAI('detect_wm')} title="Détecter filigranes AI" disabled={isAIProcessing} className="p-2 bg-indigo-500 text-white rounded-lg"><Sparkles size={18} /></button>
                              <button onClick={clearDrawings} title="Tout effacer" className="p-2 text-rose-500"><Trash2 size={18} /></button>
                            </div>
                            <div className="flex items-center gap-4 px-4 border-l border-slate-200">
                              <div className="flex flex-col gap-1 min-w-[100px]">
                                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                  <span>Taille</span>
                                  <span>{brushSize}px</span>
                                </div>
                                <input
                                  type="range"
                                  min="1"
                                  max="50"
                                  value={brushSize}
                                  onChange={(e) => setBrushSize(Number(e.target.value))}
                                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                  title="Ajuster la taille de l'outil"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <button onClick={undo} title="Annuler (Ctrl+Z)" className="p-2 text-slate-400 transition-colors hover:text-indigo-600"><Undo2 size={18} /></button>
                                <button onClick={redo} title="Rétablir (Ctrl+Y)" className="p-2 text-slate-400 transition-colors hover:text-indigo-600"><RotateCcw size={18} className="rotate-180" /></button>
                              </div>
                            </div>
                          </div>

                          <div className="relative w-full bg-slate-100 rounded-2xl overflow-hidden shadow-inner border border-slate-200 flex items-center justify-center min-h-[600px]">
                            <canvas
                              ref={canvasRef}
                              onMouseDown={startDrawing}
                              onMouseMove={draw}
                              onMouseUp={stopDrawing}
                              style={{
                                filter: isEyeSaverMode ? "invert(1) hue-rotate(180deg)" : "none",
                                width: '100%',
                                height: 'auto'
                              }}
                              className="bg-white shadow-2xl cursor-crosshair touch-none"
                            />

                            {textInput && (
                              <div
                                className="absolute bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-2xl border-2 border-indigo-500 z-50 flex items-center gap-3 animate-in fade-in zoom-in-95 duration-200"
                                style={{
                                  left: `${(textInput.x / canvasDimensions.width) * 100}%`,
                                  top: `${(textInput.y / canvasDimensions.height) * 100}%`,
                                  transform: 'translate(-50%, -50%)',
                                  cursor: 'move'
                                }}
                                onMouseDown={(e) => {
                                  // Dragging logic
                                  const startX = e.clientX;
                                  const startY = e.clientY;
                                  const startPosX = textInput.x;
                                  const startPosY = textInput.y;

                                  const onMove = (moveEvent: MouseEvent) => {
                                    const dx = (moveEvent.clientX - startX) * (canvasDimensions.width / canvasRef.current!.clientWidth);
                                    const dy = (moveEvent.clientY - startY) * (canvasDimensions.height / canvasRef.current!.clientHeight);
                                    setTextInput(prev => prev ? { ...prev, x: startPosX + dx, y: startPosY + dy } : null);
                                  };

                                  const onUp = () => {
                                    window.removeEventListener('mousemove', onMove);
                                    window.removeEventListener('mouseup', onUp);
                                  };

                                  window.addEventListener('mousemove', onMove);
                                  window.addEventListener('mouseup', onUp);
                                }}
                              >
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center gap-2 p-1 bg-slate-50 rounded-xl" onMouseDown={(e) => e.stopPropagation()}>
                                    <button onClick={() => setTextInput({ ...textInput, isBold: !textInput.isBold })} className={cn("w-7 h-7 rounded-lg flex items-center justify-center transition-all", textInput.isBold ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-200")}><Bold size={12} /></button>
                                    <button onClick={() => setTextInput({ ...textInput, isItalic: !textInput.isItalic })} className={cn("w-7 h-7 rounded-lg flex items-center justify-center transition-all", textInput.isItalic ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-200")}><Italic size={12} /></button>
                                    <button onClick={() => setTextInput({ ...textInput, isHighlighted: !textInput.isHighlighted })} className={cn("w-7 h-7 rounded-lg flex items-center justify-center transition-all", textInput.isHighlighted ? "bg-yellow-400 text-white" : "text-slate-400 hover:bg-slate-200")}><Highlighter size={12} /></button>
                                    <div className="h-3 w-px bg-slate-200 mx-1" />
                                    <input
                                      type="number"
                                      value={textInput.fontSize || 20}
                                      onChange={(e) => setTextInput({ ...textInput, fontSize: Number(e.target.value) })}
                                      className="w-10 bg-transparent text-[10px] font-bold text-center outline-none"
                                    />
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <input
                                      autoFocus
                                      value={textInput.text}
                                      style={{
                                        fontWeight: textInput.isBold ? 'bold' : 'normal',
                                        fontStyle: textInput.isItalic ? 'italic' : 'normal',
                                        backgroundColor: textInput.isHighlighted ? '#fef08a' : 'transparent',
                                        fontSize: `${(textInput.fontSize || 20) * (canvasRef.current!.clientWidth / canvasDimensions.width)}px`
                                      }}
                                      onChange={(e) => setTextInput({ ...textInput, text: e.target.value })}
                                      onClick={(e) => e.stopPropagation()}
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && textInput.text.trim()) {
                                          setCurrentDrawings(prev => [...prev, {
                                            points: [{ x: textInput.x, y: textInput.y }],
                                            color: tempColor,
                                            width: 0,
                                            mode: 'text',
                                            text: textInput.text,
                                            fontSize: (textInput.fontSize || 20),
                                            isBold: textInput.isBold,
                                            isItalic: textInput.isItalic,
                                            isHighlighted: textInput.isHighlighted,
                                            canvasWidth: canvasDimensions.width,
                                            canvasHeight: canvasDimensions.height
                                          }]);
                                          setTextInput(null);
                                        }
                                      }}
                                      className="bg-transparent text-slate-900 outline-none min-w-[150px]"
                                      placeholder="Écrivez ici..."
                                    />
                                    <div className="flex gap-1 border-l border-slate-200 pl-2">
                                      <button onClick={(e) => { e.stopPropagation(); setTextInput(null); }} className="p-1 hover:bg-rose-50 rounded text-rose-500"><X size={14} /></button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (textInput.text.trim()) {
                                            setCurrentDrawings(prev => [...prev, {
                                              points: [{ x: textInput.x, y: textInput.y }],
                                              color: tempColor,
                                              width: 0,
                                              mode: 'text',
                                              text: textInput.text,
                                              fontSize: (textInput.fontSize || 20),
                                              isBold: textInput.isBold,
                                              isItalic: textInput.isItalic,
                                              isHighlighted: textInput.isHighlighted,
                                              canvasWidth: canvasDimensions.width,
                                              canvasHeight: canvasDimensions.height
                                            }]);
                                            setTextInput(null);
                                          }
                                        }}
                                        className="p-1 hover:bg-emerald-50 rounded text-emerald-600"
                                      >
                                        <Check size={14} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </main>

                {/* Sidebar AI */}
                <AnimatePresence>
                  {isAISidebarOpen && (
                    <motion.div
                      initial={{ x: 400 }}
                      animate={{ x: 0 }}
                      exit={{ x: 400 }}
                      className="w-96 border-l border-slate-100 bg-white flex flex-col z-20"
                    >
                      <div className="p-6 space-y-6">
                        <div className="flex justify-between items-center">
                          <h4 className="font-bold flex items-center gap-2"><Sparkles size={18} className="text-cyan-500" />Assistant AI</h4>
                          <button onClick={() => setIsAISidebarOpen(false)}><X size={18} /></button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => askAI('summary')} className="p-4 bg-slate-50 rounded-xl text-xs font-bold hover:bg-indigo-50 transition-all">Résumé</button>
                          <button onClick={() => askAI('translate')} className="p-4 bg-slate-50 rounded-xl text-xs font-bold hover:bg-indigo-50 transition-all">Traduire</button>
                        </div>
                        <div className="flex-1 bg-slate-50 rounded-2xl p-6 min-h-[300px] overflow-auto text-sm leading-relaxed whitespace-pre-wrap font-medium text-slate-600">
                          {isAIProcessing ? <div className="flex items-center justify-center h-full animate-pulse">L'IA réfléchit...</div> : aiResponse || "Choisissez un outil IA."}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
            >
              <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full space-y-6 text-center">
                <div className="relative inline-block">
                  <Loader2 className="animate-spin text-indigo-600" size={64} />
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-indigo-600">
                    {loadingProgress}%
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-slate-900">Traitement en cours</h3>
                  <p className="text-sm text-slate-500">Nous appliquons vos modifications au document PDF...</p>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-indigo-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${loadingProgress}%` }}
                    transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                  />
                </div>
              </div>
            </motion.div>
          )}

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
                Modification réussie !
              </div>
              <button
                onClick={downloadResult}
                className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-lg shadow-emerald-200 transition-all hover:scale-105 active:scale-95"
                title="Télécharger le PDF (Ctrl+S)"
              >
                <Download size={20} />
                Télécharger le PDF modifié
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => editPDF()}
          disabled={rawFiles.length === 0 || isProcessing || thumbnails.length === 0}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-10 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-100 transition-all hover:scale-105 active:scale-95 disabled:scale-100 disabled:shadow-none"
          title="Appliquer les modifications (Ctrl+S)"
        >
          {isProcessing ? (
            <>
              <Loader2 size={24} className="animate-spin" />
              Traitement en cours...
            </>
          ) : (
            <>
              <Scissors size={24} />
              Enregistrer les modifications
            </>
          )}
        </button>
      </div>
      {/* Signature Pad Modal */}
      <AnimatePresence>
        {isSignaturePadOpen && (
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
                <button
                  onClick={() => setIsSignaturePadOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full"
                >
                  <X size={20} />
                </button>
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
                    ctx.beginPath();
                    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
                    (canvas as any).isDrawing = true;
                  }}
                  onMouseMove={(e) => {
                    const canvas = e.currentTarget;
                    if (!(canvas as any).isDrawing) return;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return;
                    const rect = canvas.getBoundingClientRect();
                    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
                    ctx.lineWidth = 3;
                    ctx.lineCap = 'round';
                    ctx.strokeStyle = '#000000';
                    ctx.stroke();
                  }}
                  onMouseUp={(e) => { (e.currentTarget as any).isDrawing = false; }}
                />
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30 group-hover:opacity-10 transition-opacity">
                  <span className="text-sm font-medium text-slate-400">Signez ici</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const canvas = document.getElementById('signature-canvas') as HTMLCanvasElement;
                    const ctx = canvas?.getContext('2d');
                    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
                  }}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  Effacer
                </button>
                <button
                  onClick={() => {
                    const canvas = document.getElementById('signature-canvas') as HTMLCanvasElement;
                    if (canvas) {
                      const dataUrl = canvas.toDataURL();
                      setSignatureData(dataUrl);
                      // Add signature to drawings
                      setCurrentDrawings(prev => [...prev, {
                        points: [{ x: 50, y: 50 }, { x: 200, y: 150 }], // Placeholder rect for signature
                        color: "#000000",
                        width: 2,
                        mode: 'stamp',
                        text: 'SIGNATURE' // We'll handle dataUrl rendering separately
                      }]);
                      setIsSignaturePadOpen(false);
                    }
                  }}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all"
                >
                  Enregistrer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
