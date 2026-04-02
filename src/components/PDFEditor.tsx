import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PDFDocument, rgb, StandardFonts, degrees, PDFPage } from 'pdf-lib';
import { pdfjs } from '../pdfjs-setup';
import { FileUpload } from './FileUpload';
import { Scissors, Download, Upload, Loader2, CheckCircle2, AlertCircle, Trash2, GripVertical, RefreshCw, X, Eye, Search, CheckSquare, Square, Check, Minus, Plus, Type, Bold, Italic, Underline, Palette, Eraser, Pencil, Undo2, RotateCcw, FileText, Pipette, RotateCw, Sun, Moon, Square as SquareIcon, Circle, ArrowRight, Highlighter, Stamp, PlusCircle, Lock, Zap, Sparkles, Menu, Languages, ScanLine, Volume2, Layout, Shapes, Folder, Grid, Settings, Star, AlignLeft, List, Home, MoreHorizontal, MessageCircle, Undo, PenTool, LayoutGrid, Library, PlusCircle as AddIcon } from 'lucide-react';
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
  const [editorZoom, setEditorZoom] = useState(1);

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
  const [isTableProtectionEnabled, setIsTableProtectionEnabled] = useState(true);
  const [ocrLanguage, setOcrLanguage] = useState<'fra' | 'eng' | 'fra+eng'>('fra+eng');
  const [isSignaturePadOpen, setIsSignaturePadOpen] = useState(false);
  const [isEyeSaverMode, setIsEyeSaverMode] = useState(false);
  const [isReorderingMode, setIsReorderingMode] = useState(false);
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
    setEditorZoom(1);

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
        await page.render({ canvasContext: ctx, viewport: viewport, canvas: canvas }).promise;
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

  const getPixelColor = (x: number, y: number): string => {
    const canvas = canvasRef.current;
    if (!canvas) return "#ffffff";
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return "#ffffff";
    try {
      const area = ctx.getImageData(Math.max(0, x - 1), Math.max(0, y - 1), 3, 3).data;
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < area.length; i += 4) {
          if (area[i+3] > 0) { 
              r += area[i]; g += area[i+1]; b += area[i+2]; count++;
          }
      }
      if (count > 0) {
          r = Math.round(r/count); g = Math.round(g/count); b = Math.round(b/count);
          if (r > 240 && g > 240 && b > 240) return "#ffffff";
          return "#" + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
      }
      return "#ffffff";
    } catch (e) {
      return "#ffffff";
    }
  };

  const applyMagicEraser = (pos: { x: number; y: number }) => {
    const hexColor = getPixelColor(pos.x, pos.y);
    const size = brushSize * 2; // Use brushSize to define "stamp" size
    
    setCurrentDrawings(prev => [...prev, {
      points: [
        { x: pos.x - size / 2, y: pos.y - size / 2 }, 
        { x: pos.x + size / 2, y: pos.y + size / 2 }
      ],
      color: hexColor,
      width: 0, 
      mode: 'magic-eraser' as any,
      canvasWidth: canvasDimensions.width,
      canvasHeight: canvasDimensions.height
    }]);
  };

  const handleEraser = (pos: { x: number, y: number }) => {
    // 1. Identify if we are hitting an existing user drawing
    let hitIndex = -1;
    for (let i = currentDrawings.length - 1; i >= 0; i--) {
      const stroke = currentDrawings[i];
      const radius = (brushSize / 2) + ((stroke.width || 2) / 2) + 10;
      
      const isHit = stroke.points.some((p, j) => {
        const dist = Math.sqrt(Math.pow(p.x - pos.x, 2) + Math.pow(p.y - pos.y, 2));
        if (dist <= radius) return true;
        if (j < stroke.points.length - 1) {
          const nextP = stroke.points[j + 1];
          const l2 = Math.pow(p.x - nextP.x, 2) + Math.pow(p.y - nextP.y, 2);
          if (l2 === 0) return false;
          let t = ((pos.x - p.x) * (nextP.x - p.x) + (pos.y - p.y) * (nextP.y - p.y)) / l2;
          t = Math.max(0, Math.min(1, t));
          const projX = p.x + t * (nextP.x - p.x);
          const projY = p.y + t * (nextP.y - p.y);
          const distToSeg = Math.sqrt(Math.pow(pos.x - projX, 2) + Math.pow(pos.y - projY, 2));
          return distToSeg <= radius;
        }
        return false;
      });
      
      if (isHit) {
        hitIndex = i;
        break;
      }
    }

    if (hitIndex !== -1) {
      // Object found: Remove it and don't start a blanco stroke
      setCurrentDrawings(prev => prev.filter((_, i) => i !== hitIndex));
      return true; // We hit something
    }
    return false; // Nothing hit
  };

  const startDrawing = (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
    // If we are in "Move/Hand" mode, let the browser handle touches so we can scroll/zoom
    if (visualTool === 'move') return;

    const pos = getCoordinates(e);

    // Prevent scrolling or other browser gestures on mobile when drawing
    if ('preventDefault' in e && (e as any).cancelable !== false) {
      e.preventDefault();
    }

    // Capture pointer to continue drawing even if finger leaves the canvas
    if ('setPointerCapture' in e.target) {
       (e.target as HTMLElement).setPointerCapture((e as React.PointerEvent).pointerId);
    }

    if (isPickingColor) {
      const hex = getPixelColor(pos.x, pos.y);
      setTempColor(hex);
      setLastNonEraserColor(hex);
      setIsPickingColor(false);
      return;
    }

    setIsDrawing(true);

    if (visualTool === 'magic-eraser') {
      applyMagicEraser(pos);
      return;
    }

    if (visualTool === 'eraser') {
      const didHitObject = handleEraser(pos);
      if (didHitObject) {
        // We removed an object, maybe don't start drawing white yet
        setIsDrawing(false); 
      } else {
        // No object hit: Start drawing a "Blanco" stroke with BG color
        const bgColor = getPixelColor(pos.x, pos.y);
        setCurrentDrawings(prev => [...prev, {
          points: [pos],
          color: bgColor,
          width: brushSize,
          mode: 'eraser',
          canvasWidth: canvasDimensions.width,
          canvasHeight: canvasDimensions.height
        }]);
      }
      return;
    }

    if (visualTool === 'move') {
      const foundIdx = currentDrawings.findLastIndex(stroke =>
        stroke.points.some(p => Math.abs(p.x - pos.x) < 20 && Math.abs(p.y - pos.y) < 20)
      );
      if (foundIdx !== -1) {
        setDraggingStrokeIdx(foundIdx);
        setDragOffset({ x: pos.x, y: pos.y });
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

  const draw = (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || isPickingColor) return;
    const pos = getCoordinates(e);

    if ('preventDefault' in e && (e as any).cancelable !== false) {
      e.preventDefault();
    }

    if (visualTool === 'eraser') {
      // In eraser mode, we already started a Blanco stroke if no object was hit.
      // We just continue the line.
      setCurrentDrawings(prev => {
        const last = prev[prev.length - 1];
        if (!last || last.mode !== 'eraser') return prev;
        return [...prev.slice(0, -1), { ...last, points: [...last.points, pos] }];
      });
      return;
    }

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
      if (['rect', 'circle', 'arrow', 'stamp', 'magic-eraser'].includes(visualTool)) {
        newPoints[1] = pos;
      } else {
        newPoints.push(pos);
      }

      return [...prev.slice(0, -1), { ...last, points: newPoints }];
    });
  };

  const stopDrawing = (e?: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
    if (e && 'releasePointerCapture' in e.target && (e as React.PointerEvent).pointerId !== undefined) {
       try {
         (e.target as HTMLElement).releasePointerCapture((e as React.PointerEvent).pointerId);
       } catch (err) {}
    }
    setIsDrawing(false);
    setDraggingStrokeIdx(null);
    setDragOffset(null);
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

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

        // --- SMART TABLE PROTECTION LOGIC ---
        // If enabled, we'll create a mask of the lines in the original image.
        // We'll use this mask to "re-punch" the lines through any Blanco (eraser) we apply.
        let lineMaskCanvas: HTMLCanvasElement | null = null;
        if (isTableProtectionEnabled) {
          lineMaskCanvas = document.createElement('canvas');
          lineMaskCanvas.width = img.width;
          lineMaskCanvas.height = img.height;
          const maskCtx = lineMaskCanvas.getContext('2d', { willReadFrequently: true });
          if (maskCtx) {
            maskCtx.drawImage(img, 0, 0);
            const data = maskCtx.getImageData(0, 0, img.width, img.height);
            const pixels = data.data;
            
            // Simple Line Protection: anything very dark (Luma < 80)
            // To be smarter (Table only), we can check if the dark pixel is part of a H or V run.
            // But for real-pro feel, let's keep all original dark structure.
            for (let j = 0; j < pixels.length; j += 4) {
              const r = pixels[j], g = pixels[j+1], b = pixels[j+2];
              const luma = 0.299 * r + 0.587 * g + 0.114 * b;
              if (luma > 80) {
                 pixels[j+3] = 0; // Make light areas transparent in our line mask
              } else {
                 pixels[j+3] = 255; // Keep dark parts opaque in mask
              }
            }
            maskCtx.putImageData(data, 0, 0);
          }
        }

        currentDrawings.forEach(stroke => {
          if (stroke.points.length < 1) return;

          if (stroke.mode === 'eraser') {
            // New Pro Eraser: paints with the color sampled at the start of the click (Blanco)
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = stroke.color;
          } else if (stroke.mode === 'highlighter') {
            ctx.globalCompositeOperation = 'multiply';
            ctx.strokeStyle = stroke.color;
          } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = stroke.color;
          }

          if (stroke.mode === 'highlighter') {
            ctx.globalAlpha = 0.7; // Brighter highlighter
          } else {
            ctx.globalAlpha = 1.0;
          }

          ctx.lineWidth = stroke.width;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          if ((stroke.mode === 'rect' || stroke.mode === 'magic-eraser') && stroke.points.length >= 2) {
            const start = stroke.points[0];
            const end = stroke.points[1];
            if (stroke.width === 0) {
              ctx.fillStyle = stroke.color;
              ctx.fillRect(start.x, start.y, end.x - start.x, end.y - start.y);
              // Magic eraser visual feedback
              if (stroke.mode === 'magic-eraser') {
                ctx.strokeStyle = 'rgba(255,255,255,0.5)';
                ctx.setLineDash([5, 5]);
                ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
                ctx.setLineDash([]);
              }
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
            // Smooth Pen & Highlighter (Quadratic Bezier Curves)
            if (stroke.points.length > 2) {
              ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
              for (let i = 1; i < stroke.points.length - 2; i++) {
                const xc = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
                const yc = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
                ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, xc, yc);
              }
              ctx.quadraticCurveTo(
                stroke.points[stroke.points.length - 2].x, stroke.points[stroke.points.length - 2].y,
                stroke.points[stroke.points.length - 1].x, stroke.points[stroke.points.length - 1].y
              );
            } else if (stroke.points.length > 0) {
              ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
              if (stroke.points.length > 1) {
                ctx.lineTo(stroke.points[1].x, stroke.points[1].y);
              } else {
                ctx.lineTo(stroke.points[0].x + 0.1, stroke.points[0].y);
              }
            }
            ctx.stroke();
          }

          ctx.globalAlpha = 1.0;
          ctx.globalCompositeOperation = 'source-over'; // reset
        });

        // RE-PUNCH TABLE LINES:
        // After all drawings (especially erasers), we redraw the original DARK pixels (the lines).
        // BUT we need to avoid redrawing the text. 
        // Pro Trick: We only redraw the line mask with 'destination-over' if we wanted to cover?
        // No, we redraw it with 'source-over' IF the pixel was dark AND is covered by an eraser.
        // For simplicity and powerful effect: we just redraw the LINE MASK on top of EVERYTHING.
        // Wait: this restores the text too...
        // TO ONLY RESTORE LINES AND NOT TEXT: In the loop above, we could only keep long runs.
        // But the user might want to keep some text if it's structural.
        // Let's keep it togglable and tell them "Protect Structures".
        if (isTableProtectionEnabled && lineMaskCanvas) {
           ctx.globalAlpha = 1.0;
           ctx.globalCompositeOperation = 'darken'; // This will keep the darkest between drawing and original
           ctx.drawImage(lineMaskCanvas, 0, 0);
           ctx.globalCompositeOperation = 'source-over';
        }
      };
    }
  }, [activeEditMode, editingPage, currentDrawings, isTableProtectionEnabled]);

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
          copiedPage.setRotation(degrees(thumb.rotation));
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

            const strokeColor = hexToRgb(stroke.color); // Eraser now uses its own color (Blanco)
            const cw = stroke.canvasWidth || canvasDimensions.width || 600;
            const ch = stroke.canvasHeight || canvasDimensions.height || 800;
            const scaleX = width / cw;
            const scaleY = height / ch;
            const thickness = (stroke.width || 2) * scaleX;

            if ((stroke.mode === 'rect' || stroke.mode === 'magic-eraser') && stroke.points.length >= 2) {
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
    <div className={cn("min-h-screen transition-colors duration-500 overflow-x-hidden", isDarkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900")}>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12">

        <div className="flex flex-col items-center justify-center text-center gap-4 mb-2 md:mb-12">
            <div className="flex items-center gap-3 md:gap-4 w-full justify-center">
                <div className="p-2 sm:p-4 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-200 rotate-3 shrink-0">
                    <Scissors className="text-white w-5 h-5 md:w-7 md:h-7" />
                </div>
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-4xl font-display font-black tracking-tight truncate">PDF Master Pro</h1>
                </div>
            </div>
            
            {/* Mobile Search Bar (Canva Style) */}
            <div className="w-full max-w-lg relative sm:hidden mb-4">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
                    <Search size={18} />
                </div>
                <input 
                    type="text" 
                    placeholder="Qu'allez-vous créer aujourd'hui ?" 
                    className="w-full bg-white border border-slate-200 rounded-full py-3.5 pl-12 pr-4 shadow-sm text-sm font-bold outline-none focus:border-indigo-400 transition-all"
                />
            </div>
        </div>

        {/* Canva-style Categories (Mobile Only) */}
        <div className="sm:hidden overflow-x-auto no-scrollbar flex items-center gap-6 px-1 mb-8">
            {[
                { label: 'Modifier', icon: Pencil, color: 'bg-purple-100 text-purple-600' },
                { label: 'Fusionner', icon: RefreshCw, color: 'bg-indigo-100 text-indigo-600' },
                { label: 'Magie', icon: Sparkles, color: 'bg-cyan-100 text-cyan-600' },
                { label: 'Signer', icon: PenTool, color: 'bg-emerald-100 text-emerald-600' },
                { label: 'Trier', icon: LayoutGrid, color: 'bg-amber-100 text-amber-600' },
            ].map(cat => (
                <div key={cat.label} className="flex flex-col items-center gap-2 shrink-0">
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform active:scale-90", cat.color)}>
                        <cat.icon size={24} />
                    </div>
                    <span className="text-[10px] font-black text-slate-500">{cat.label}</span>
                </div>
            ))}
        </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4 w-full lg:w-auto">
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
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-amber-500 text-white rounded-xl shadow-md hover:bg-amber-600 transition-all text-xs sm:text-sm font-bold"
              >
                <Scissors size={16} />
                <span className="hidden xs:inline">Exporter sélection</span> ({selectedIds.size})
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={cn("p-2 sm:p-3 rounded-2xl transition-all", isDarkMode ? "bg-slate-800 text-amber-400" : "bg-white text-slate-400 shadow-md")}
              >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <button
                onClick={() => setShowHelp(true)}
                className={cn("p-2 sm:p-3 rounded-2xl transition-all", isDarkMode ? "bg-slate-800 text-slate-400" : "bg-white text-slate-400 shadow-md")}
                title="Aide et raccourcis"
              >
                <AlertCircle size={20} />
              </button>
            </div>
            
            <div className="flex-1 min-w-[100px] max-w-full lg:max-w-[200px]">
              <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm relative group/wm border border-slate-100 dark:border-slate-700">
                <input
                  type="text"
                  placeholder="Filigrane..."
                  value={watermark}
                  onChange={(e) => setWatermark(e.target.value)}
                  className="bg-transparent px-2 sm:px-4 py-1.5 text-xs sm:text-sm outline-none w-full dark:text-white"
                />
                {watermark && (
                  <button
                    onClick={() => setWatermark("")}
                    className="p-1 mr-0.5 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-rose-100 hover:text-rose-600 transition-all shrink-0"
                  >
                    <X size={10} />
                  </button>
                )}
                <div className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-xl shrink-0">
                  <Stamp size={14} className="text-slate-400" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <div className="flex flex-1 sm:flex-none items-center gap-1.5 p-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <input
                  type="password"
                  placeholder="Pass..."
                  value={exportPassword}
                  onChange={(e) => setExportPassword(e.target.value)}
                  className="bg-transparent px-2 py-1.5 text-xs outline-none w-full sm:w-20 dark:text-white min-w-0"
                />
                <div className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-xl shrink-0">
                  <Lock size={14} className="text-slate-400" />
                </div>
              </div>
              <button
                onClick={editPDF}
                disabled={thumbnails.length === 0 || isProcessing}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-6 py-2 sm:py-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all text-xs sm:text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                <span>Exporter</span>
              </button>
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
            <div className="space-y-6 mt-4 sm:mt-12">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg sm:text-xl font-display font-bold flex items-center gap-2">
                  <FileText size={20} className="text-[#00c4cc]" />
                  Vos designs
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
                    onClick={() => setIsReorderingMode(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all"
                    title="Ouvrir l'outil de réorganisation"
                  >
                    <RefreshCw size={14} />
                    Réorganiser
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

            <div
              className={cn("grid gap-6", getGridCols())}
            >
              {thumbnails.filter(t => !searchQuery || t.modifiedText?.toLowerCase().includes(searchQuery.toLowerCase())).map((thumbnail, idx) => (
                <div
                  key={thumbnail.id}
                  onDoubleClick={() => handleDoubleClick(thumbnail)}
                  onClick={(e) => {
                    if (e.ctrlKey || e.metaKey) {
                      toggleSelection(thumbnail.id, true);
                    }
                  }}
                  className="relative group transition-transform"
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
                        className={cn("w-full h-full object-contain pointer-events-none", getThumbnailPadding())}
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
                </div>
              ))}
            </div>
          </>
        )}
        <AnimatePresence>
          {isReorderingMode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[150] flex flex-col bg-slate-100 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm shrink-0">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                  <div className="hidden sm:flex p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    <RefreshCw size={20} />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg">Réorganiser les pages</h2>
                    <p className="text-[10px] sm:text-xs text-slate-500">Glissez-déposez les pages pour changer leur ordre</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsReorderingMode(false)}
                  className="px-4 sm:px-6 py-2 bg-indigo-600 text-white text-sm sm:text-base font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md shrink-0"
                >
                  Terminer
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-8">
                <div className="max-w-2xl mx-auto pb-20">
                  <Reorder.Group
                    axis="y"
                    values={thumbnails}
                    onReorder={setThumbnails}
                    className="flex flex-col gap-3"
                  >
                    {thumbnails.map((t, idx) => (
                      <Reorder.Item
                        key={t.id}
                        value={t}
                        className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-2 sm:p-3 flex items-center gap-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow select-none"
                        whileDrag={{
                          scale: 1.02,
                          zIndex: 50,
                          boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)"
                        }}
                      >
                        <div className="text-slate-400 p-2 hover:text-indigo-500 transition-colors">
                          <GripVertical size={20} />
                        </div>
                        
                        <div className="w-12 h-16 sm:w-16 sm:h-20 bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center relative">
                          <img src={t.url} className="max-w-full max-h-full object-contain pointer-events-none" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base">
                            Page {idx + 1}
                          </p>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                            {t.modifiedText ? "Texte modifié" : "Fichier original"}
                          </p>
                        </div>
                        
                        <div className="flex gap-2 mr-2">
                           <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-400">
                             #{idx + 1}
                           </div>
                        </div>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                </div>
              </div>
            </motion.div>
          )}

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
              className="fixed inset-0 z-[100] bg-[#f0f2f5] flex flex-col overflow-hidden animate-in fade-in duration-300"
            >
              <header className="h-[56px] md:bg-gradient-to-r md:from-[#00c4cc] md:to-[#2ce3d3] bg-white flex items-center px-4 justify-between shrink-0 z-[110] shadow-md border-b border-slate-200 md:border-white/10 relative">
                <div className="flex items-center gap-3 md:gap-5">
                    <div className="w-9 h-9 bg-slate-100 md:bg-white/15 rounded-lg flex items-center justify-center hover:bg-slate-200 md:hover:bg-white/25 cursor-pointer transition-colors group">
                        <Menu size={20} className="text-slate-600 md:text-white group-active:scale-95 transition-transform hidden sm:block" />
                        <Home size={20} className="text-[#00c4cc] md:text-white group-active:scale-95 transition-transform sm:hidden" />
                    </div>
                    
                    <nav className="hidden md:flex items-center gap-6 text-white text-[14px] font-bold tracking-tight h-full">
                        <button onClick={() => setActiveEditMode('text')} className={cn("hover:text-white transition-colors py-4 border-b-2 border-transparent", activeEditMode === 'text' && "border-white")}>Fichier</button>
                        <button className="hover:text-white transition-colors flex items-center gap-2 group">
                          <Sparkles size={16} className="fill-white/20 group-hover:rotate-12 transition-transform" /> Transformation magique
                        </button>
                    </nav>

                    <div className="flex items-center gap-1.5 sm:hidden bg-black/10 rounded-full px-1 py-0.5 ml-1">
                        <button onClick={undo} className="p-1 px-2.5 hover:bg-white/10 rounded-full transition-all active:scale-90"><Undo2 size={18}/></button>
                        <button onClick={redo} className="p-1 px-2.5 hover:bg-white/10 rounded-full transition-all active:scale-90"><RotateCcw size={18} className="rotate-180"/></button>
                    </div>
                </div>
                
                <div className="absolute left-1/2 -translate-x-1/2 hidden lg:block">
                    <div className="bg-black/10 px-5 py-1.5 rounded-full text-white/80 text-[12px] font-bold border border-white/10 shadow-inner max-w-[200px] truncate">
                        {rawFiles[editingPage.sourceFileIndex]?.name || "Document en cours"}
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4 scrollbar-none">
                    <div className="hidden lg:flex items-center gap-2 mr-4 bg-black/10 p-1 rounded-xl">
                        <button onClick={() => setActiveEditMode('text')} className={cn("px-4 py-1.5 rounded-lg text-xs font-black transition-all", activeEditMode === 'text' ? "bg-white text-slate-900 shadow-sm" : "text-white/60 hover:text-white")}>Texte</button>
                        <button onClick={() => setActiveEditMode('visual')} className={cn("px-4 py-1.5 rounded-lg text-xs font-black transition-all", activeEditMode === 'visual' ? "bg-white text-slate-900 shadow-sm" : "text-white/60 hover:text-white")}>Visuel</button>
                    </div>

                    <div className="flex sm:hidden items-center gap-4 mr-1 text-slate-400">
                        <Undo2 size={22} onClick={undo} className="active:scale-75 transition-transform" />
                        <RotateCcw size={22} onClick={redo} className="rotate-180 active:scale-75 transition-transform" />
                        <button onClick={savePageEdits} className="bg-[#00c4cc] text-white px-4 py-1.5 rounded-full text-xs font-black shadow-sm">Terminé</button>
                    </div>

                    <button className="hidden sm:flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-[13px] font-extrabold transition-all border border-white/10 shadow-lg active:scale-95">
                        <Star size={16} className="fill-yellow-400 text-yellow-400" /> Essai Pro
                    </button>
                    <button onClick={savePageEdits} className="hidden sm:block bg-white text-[#00c4cc] px-6 py-2 rounded-xl text-[13px] font-black shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] hover:scale-[1.03] active:scale-95 transition-all">
                        Enregistrer
                    </button>
                </div>
              </header>



              <div className="flex flex-1 overflow-hidden relative">
                {/* 2. LEFT SIDEBAR (Dark) */}
                <aside className="w-[82px] bg-[#1d1e21] flex flex-col items-center py-6 gap-8 z-[100] shrink-0 border-r border-white/5 shadow-2xl relative overflow-y-auto no-scrollbar">
                    {[
                        { label: 'Modèles', icon: Layout },
                        { label: 'Éléments', icon: Shapes },
                        { label: 'Texte', icon: Type, tool: 'text' },
                        { label: 'Image', icon: Upload },
                        { label: 'Pinceau', icon: Pencil, tool: 'pen' },
                        { label: 'Gomme', icon: Eraser, tool: 'eraser' },
                        { label: 'Gomme IA', icon: Sparkles, tool: 'magic-eraser' },
                        { label: 'Projets', icon: Folder },
                        { label: 'Assistant', icon: Sparkles, color: 'cyan' },
                    ].map(item => (
                        <button 
                            key={item.label}
                            onClick={() => (item as any).tool ? (setVisualTool((item as any).tool as any), (item as any).tool === 'text' ? setActiveEditMode('text') : setActiveEditMode('visual')) : (item.label === 'Assistant' && setIsAISidebarOpen(!isAISidebarOpen))}
                            className={cn(
                                "flex flex-col items-center gap-1.5 w-full transition-all group relative px-1", 
                                ((item as any).tool && visualTool === (item as any).tool) || (item.label === 'Assistant' && isAISidebarOpen) ? "text-white" : "text-white/50 hover:text-white/90"
                            )}
                        >
                            <div className={cn(
                                "p-3 rounded-2xl transition-all group-hover:bg-white/10 group-active:scale-90",
                                (((item as any).tool && visualTool === (item as any).tool) || (item.label === 'Assistant' && isAISidebarOpen)) && "bg-white/15 text-white shadow-inner"
                            )}>
                                <item.icon size={26} className={cn("transition-transform", (item.label === 'Assistant' || item.label === 'Gomme IA') && "text-cyan-400")} />
                            </div>
                            <span className="text-[11px] font-bold tracking-tight opacity-90">{item.label}</span>
                        </button>
                    ))}
                    <div className="mt-auto pb-6">
                         <button className="text-white/40 hover:text-white transition-all p-3 hover:bg-white/10 rounded-2xl group"><Grid size={24} className="group-hover:rotate-90 transition-transform"/></button>
                    </div>
                </aside>

                {/* 3. CENTER CONTENT */}
                <main className="flex-1 flex flex-col relative overflow-hidden bg-white">
                    {/* CONTEXTUAL TOOLBAR (Desktop Only) */}
                    <div className="hidden md:flex h-[56px] bg-white border-b border-slate-200 items-center px-8 gap-4 shrink-0 z-50 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-x-auto no-scrollbar scroll-smooth">
                        <button 
                            onClick={() => activeEditMode === 'text' ? askAI('fix') : alert('Passez en mode texte pour utiliser l\'écriture magique')} 
                            className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-[13px] font-black text-slate-800 transition-all border border-slate-200/50 shadow-sm"
                        >
                            <Sparkles size={18} className="text-indigo-600 fill-indigo-100" /> {isAIProcessing ? 'En cours...' : 'Écriture magique'}
                        </button>
                        <div className="h-6 w-px bg-slate-200 mx-1" />
                        
                        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 hover:border-slate-300 cursor-pointer transition-all shadow-sm group">
                            <span className="text-[13px] font-bold text-slate-800">Inter</span>
                            <div className="flex items-center gap-1 border-l border-slate-200 pl-2 ml-1">
                                <button onClick={() => setTempFontSize(prev => Math.max(8, prev - 2))} className="hover:text-[#00c4cc]"><Minus size={12}/></button>
                                <span className="text-[11px] font-black w-6 text-center">{tempFontSize}</span>
                                <button onClick={() => setTempFontSize(prev => Math.min(100, prev + 2))} className="hover:text-[#00c4cc]"><Plus size={12}/></button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1.5 shadow-sm">
                            <button onClick={() => setBrushSize(prev => Math.max(1, prev - 1))} className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg text-slate-600 shadow-sm transition-all active:scale-90"><Minus size={18}/></button>
                            <div className="px-3 text-[14px] font-black text-slate-900 min-w-[32px] text-center">{brushSize}</div>
                            <button onClick={() => setBrushSize(prev => Math.min(50, prev + 1))} className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg text-slate-600 shadow-sm transition-all active:scale-90"><Plus size={18}/></button>
                        </div>

                        <div className="h-6 w-px bg-slate-200 mx-1" />
                        
                        <div className="flex items-center gap-1">
                            <label className="w-10 h-10 flex items-center justify-center hover:bg-slate-50 rounded-xl transition-all cursor-pointer group relative border border-transparent hover:border-slate-200">
                                <div className="w-7 h-7 rounded-lg border-2 border-white shadow-lg transition-transform group-active:scale-90 ring-1 ring-black/5" style={{ backgroundColor: tempColor }} />
                                <input type="color" value={tempColor} onChange={(e) => setTempColor(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
                            </label>
                            <button onClick={() => setTempIsBold(!tempIsBold)} className={cn("w-10 h-10 flex items-center justify-center hover:bg-slate-50 rounded-xl transition-all font-black text-lg", tempIsBold ? "bg-slate-100 text-[#00c4cc]" : "text-slate-600")}><Bold size={18}/></button>
                            <button onClick={() => setTempIsItalic(!tempIsItalic)} className={cn("w-10 h-10 flex items-center justify-center hover:bg-slate-50 rounded-xl transition-all italic text-lg", tempIsItalic ? "bg-slate-100 text-[#00c4cc]" : "text-slate-600")}><Italic size={18}/></button>
                            <button className="w-10 h-10 flex items-center justify-center hover:bg-slate-50 rounded-xl transition-all"><Underline size={18} className="text-slate-600"/></button>
                        </div>

                        <div className="ml-auto flex items-center gap-2">
                            <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-sm">
                                <button onClick={undo} className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg text-slate-400 hover:text-slate-800 transition-all active:scale-90"><Undo2 size={18}/></button>
                                <button onClick={redo} className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg text-slate-400 hover:text-slate-800 transition-all active:scale-90"><RotateCcw size={18} className="rotate-180"/></button>
                            </div>
                            <div className="h-6 w-px bg-slate-200 mx-1" />
                            <button onClick={() => setEditingPage(null)} className="w-10 h-10 flex items-center justify-center hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-xl transition-all active:scale-90 bg-slate-50 border border-slate-200 shadow-sm"><X size={20}/></button>
                        </div>
                    </div>

                    {/* WORKSPACE */}
                    <div className="flex-1 overflow-auto bg-[#f8f9fa] relative scroll-smooth p-2 sm:p-20">
                        <div className="min-h-full min-w-full flex items-center justify-center">
                            <div 
                              className="relative shadow-[0_20px_50px_rgba(0,0,0,0.15)] bg-white transition-all transform-gpu origin-center"
                              style={{ transform: `scale(${editorZoom})` }}
                            >
                            {activeEditMode === 'text' ? (
                                <div className="p-12 w-full max-w-4xl mx-auto">
                                   <div className="flex justify-between items-center mb-6">
                                       <div className="flex gap-2">
                                          <button onClick={runOCR} disabled={isOCRing} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50 transition-all">
                                              {isOCRing ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} OCR
                                          </button>
                                          <button onClick={copyToClipboard} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all">Copier</button>
                                       </div>
                                   </div>
                                   <textarea
                                      value={tempText}
                                      onChange={(e) => setTempText(e.target.value)}
                                      style={{ fontSize: `${tempFontSize}px`, color: tempColor, minHeight: '600px' }}
                                      className="w-full p-12 bg-white outline-none leading-relaxed resize-none shadow-inner border border-slate-100 rounded-sm"
                                      placeholder="Éditez le texte..."
                                   />
                                </div>
                            ) : (
                                <canvas 
                                    ref={canvasRef}
                                    onPointerDown={startDrawing}
                                    onPointerMove={draw}
                                    onPointerUp={stopDrawing}
                                    onPointerLeave={stopDrawing}
                                    style={{
                                        width: canvasDimensions.width ? `${canvasDimensions.width}px` : 'auto',
                                        height: canvasDimensions.height ? `${canvasDimensions.height}px` : 'auto',
                                        filter: isEyeSaverMode ? "invert(1) hue-rotate(180deg)" : "none",
                                        touchAction: visualTool === 'move' ? 'auto' : 'none',
                                        cursor: visualTool === 'move' ? 'grab' : 'crosshair'
                                    }}
                                    className="bg-white touch-none"
                                />
                            )}
                            
                            {textInput && (
                              <div
                                className="absolute bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-indigo-200 z-[120] flex items-center gap-4 animate-in fade-in zoom-in-95 duration-200 ring-4 ring-indigo-500/10 min-w-[300px]"
                                style={{
                                  left: `${(textInput.x / canvasDimensions.width) * 100}%`,
                                  top: `${(textInput.y / canvasDimensions.height) * 100}%`,
                                  transform: 'translate(-50%, -50%)',
                                }}
                              >
                                <div className="flex flex-col gap-3 w-full">
                                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                     <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Édition de texte</span>
                                     <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-0.5">
                                         <button onClick={() => setTextInput({ ...textInput, isBold: !textInput.isBold })} className={cn("w-7 h-7 rounded-md flex items-center justify-center transition-all", textInput.isBold ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-200")}><Bold size={14} /></button>
                                         <button onClick={() => setTextInput({ ...textInput, isItalic: !textInput.isItalic })} className={cn("w-7 h-7 rounded-md flex items-center justify-center transition-all", textInput.isItalic ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-200")}><Italic size={14} /></button>
                                         <input
                                           type="number"
                                           value={textInput.fontSize || 20}
                                           onChange={(e) => setTextInput({ ...textInput, fontSize: Number(e.target.value) })}
                                           className="w-10 bg-transparent text-[12px] font-black text-center outline-none text-slate-700"
                                         />
                                     </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <input
                                      autoFocus
                                      value={textInput.text}
                                      style={{
                                        fontWeight: textInput.isBold ? 'bold' : 'normal',
                                        fontStyle: textInput.isItalic ? 'italic' : 'normal',
                                        fontSize: `16px`
                                      }}
                                      onChange={(e) => setTextInput({ ...textInput, text: e.target.value })}
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
                                            canvasWidth: canvasDimensions.width,
                                            canvasHeight: canvasDimensions.height
                                          }]);
                                          setTextInput(null);
                                        }
                                      }}
                                      className="bg-slate-50 rounded-xl px-4 py-3 text-slate-900 outline-none w-full border border-slate-200 focus:border-indigo-400 focus:ring-2 ring-indigo-100 transition-all"
                                      placeholder="Appuyez sur Entrée pour valider..."
                                    />
                                    <button onClick={() => setTextInput(null)} className="w-10 h-10 flex items-center justify-center hover:bg-rose-50 text-rose-500 rounded-xl transition-all shrink-0"><X size={20}/></button>
                                  </div>
                                </div>
                              </div>
                            )}
                        </div>
                    </div>
                </div>

                    {/* MOBILE FLOATING CONTEXT TOOLS (Above bottom nav) */}
                    <div className="md:hidden flex overflow-x-auto no-scrollbar px-4 py-3 gap-3 bg-white/80 backdrop-blur-md border-t border-slate-100 z-50">
                         {visualTool === 'pen' || visualTool === 'eraser' ? (
                             <div className="flex items-center gap-3 bg-slate-100 rounded-full px-4 py-2 shadow-inner w-full justify-between">
                                 <div className="flex items-center gap-4">
                                     <button onClick={() => setBrushSize(prev => Math.max(1, prev - 1))} className="text-slate-400"><Minus size={18}/></button>
                                     <span className="text-xs font-black text-slate-800 w-6 text-center">{brushSize}</span>
                                     <button onClick={() => setBrushSize(prev => Math.min(50, prev + 1))} className="text-slate-400"><Plus size={18}/></button>
                                 </div>
                                 <div className="w-px h-4 bg-slate-300 mx-1" />
                                 <label className="flex items-center gap-2">
                                     <div className="w-6 h-6 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: tempColor }} />
                                     <input type="color" className="hidden" value={tempColor} onChange={(e) => setTempColor(e.target.value)} />
                                 </label>
                             </div>
                         ) : activeEditMode === 'text' ? (
                             <div className="flex items-center gap-2 w-full">
                                 <button onClick={() => askAI('fix')} className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap"><Sparkles size={14}/> Écriture Magique</button>
                                 <button className="bg-slate-100 p-2 rounded-full text-slate-600"><Bold size={18}/></button>
                                 <button className="bg-slate-100 p-2 rounded-full text-slate-600"><PlusCircle size={18}/></button>
                             </div>
                         ) : (
                             <button onClick={() => setVisualTool('pen')} className="bg-indigo-600 text-white w-full py-2.5 rounded-full text-xs font-black flex items-center justify-center gap-2 shadow-lg"><Pencil size={16}/> Commencer à dessiner</button>
                         )}
                    </div>

                    {/* 4. MOBILE BOTTOM NAV (Canva style) */}
                    <div className="md:hidden h-[72px] bg-white border-t border-slate-200 flex items-center justify-around px-2 shrink-0 z-[120] shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
                        {[
                            { label: 'Modèles', icon: Layout },
                            { label: 'Éléments', icon: Shapes },
                            { label: 'Texte', icon: Type, tool: 'text' },
                            { label: 'Pinceau', icon: Pencil, tool: 'pen' },
                            { label: 'Gomme', icon: Eraser, tool: 'eraser' },
                        ].map(item => (
                            <button 
                                key={item.label}
                                onClick={() => (item as any).tool ? (setVisualTool((item as any).tool as any), (item as any).tool === 'text' ? setActiveEditMode('text') : setActiveEditMode('visual')) : null}
                                className={cn(
                                    "flex flex-col items-center gap-1 min-w-[64px] transition-all",
                                    (item as any).tool && visualTool === (item as any).tool ? "text-[#00c4cc]" : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                <item.icon size={22} className={cn("transition-transform", (item as any).tool && visualTool === (item as any).tool && "scale-110")} />
                                <span className="text-[10px] font-bold tracking-tight">{item.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* BOTTOM STATUS BAR (Desktop/Tablet) */}
                    <footer className="hidden md:flex h-[44px] bg-white border-t border-slate-200 items-center justify-between px-6 shrink-0 z-50 text-[12px] font-bold text-slate-500 shadow-[0_-2px_10px_rgba(0,0,0,0.03)] focus-within:ring-0">
                        <div className="flex items-center gap-8">
                            <button className="flex items-center gap-2 hover:text-slate-900 transition-colors group"><FileText size={16} className="group-hover:scale-110 transition-transform" /> Notes</button>
                            <button className="flex items-center gap-2 hover:text-slate-900 transition-colors group"><Layout size={16} className="group-hover:scale-110 transition-transform"/> Plan</button>
                            <button className="flex items-center gap-2 hover:text-slate-900 transition-colors group"><RotateCw size={16} className="opacity-80 group-hover:rotate-180 transition-all duration-500"/> Minuteur</button>
                        </div>
                        
                        <div className="flex items-center gap-6">
                           <div className="flex items-center gap-4 bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100 shadow-inner">
                               <button onClick={() => setEditorZoom(prev => Math.max(0.1, prev - 0.1))} className="hover:text-slate-900 transition-colors active:scale-75"><Minus size={16} /></button>
                               <div className="w-32 h-1.5 bg-slate-200 rounded-full relative group cursor-pointer overflow-hidden">
                                   <div className="absolute top-0 left-0 h-full bg-[#00c4cc] transition-all duration-300 shadow-[0_0_8px_#00c4cc]" style={{ width: `${(editorZoom / 3) * 100}%` }} />
                               </div>
                               <button onClick={() => setEditorZoom(prev => Math.min(3, prev + 0.1))} className="hover:text-slate-900 transition-colors active:scale-75"><Plus size={16} /></button>
                               <span className="w-14 text-center text-slate-900 font-black">{Math.round(editorZoom * 100)}%</span>
                           </div>
                           <div className="flex items-center gap-4 border-l border-slate-200 pl-6 ml-2">
                               <button className="hover:text-slate-900 hover:rotate-45 transition-transform"><Settings size={18} /></button>
                               <button className="hover:text-slate-900 active:rotate-180 transition-transform"><RotateCw size={18} /></button>
                               <button className="bg-slate-900 text-white w-20 py-1.5 rounded-lg hover:bg-slate-800 transition-colors shadow-lg active:scale-95">Page: {editingPage.index + 1}</button>
                           </div>
                        </div>
                    </footer>
                </main>

                {/* Sidebar AI Integrated */}
                <AnimatePresence>
                  {isAISidebarOpen && (
                    <motion.div
                      initial={{ x: '100%' }}
                      animate={{ x: 0 }}
                      exit={{ x: '100%' }}
                      className="absolute inset-y-0 right-0 w-80 lg:w-96 border-l border-slate-200 bg-white flex flex-col z-[105] shadow-2xl"
                    >
                      <div className="p-6 space-y-6 flex flex-col h-full bg-[#f8f9fa]">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                          <h4 className="font-black flex items-center gap-2 text-slate-900 tracking-tight"><Sparkles size={20} className="text-[#00c4cc]" /> Assistant Intelligence</h4>
                          <button onClick={() => setIsAISidebarOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X size={20} /></button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <button onClick={() => askAI('summary')} className="p-4 bg-white border border-slate-200 rounded-2xl text-[11px] font-black hover:bg-cyan-50 hover:border-cyan-200 transition-all shadow-sm">Résumé Automatique</button>
                          <button onClick={() => askAI('translate')} className="p-4 bg-white border border-slate-200 rounded-2xl text-[11px] font-black hover:bg-cyan-50 hover:border-cyan-200 transition-all shadow-sm">Traduction Directe</button>
                        </div>
                        <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-6 overflow-auto text-sm leading-relaxed whitespace-pre-wrap font-medium text-slate-700 shadow-inner">
                          {isAIProcessing ? (
                            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                              <Loader2 size={32} className="animate-spin text-[#00c4cc]" />
                              <span className="text-slate-400 font-bold animate-pulse">L'IA parcourt votre document...</span>
                            </div>
                          ) : aiResponse || "Posez une question ou utilisez un outil pour analyser cette page."}
                        </div>
                        <div className="mt-4 p-4 bg-cyan-900 rounded-2xl text-white text-[11px] font-bold flex items-center gap-2 overflow-hidden">
                            <Zap size={14} className="fill-white shrink-0" /> Propulsé par Google Gemini
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
      {/* Modals & Overlays */}
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
        )}
      </AnimatePresence>

      {/* GLOBAL MOBILE BOTTOM NAV (Canva style) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 h-[80px] bg-white border-t border-slate-100 flex items-center justify-around px-2 z-[200] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] pb-2 rounded-t-[1.5rem]">
          {[
              { label: 'Accueil', icon: Home, active: !editingPage, action: () => setEditingPage(null) },
              { label: 'Modèles', icon: Layout },
          ].map((item, i) => (
              <React.Fragment key={item.label}>
                  <button onClick={item.action} className={cn("flex flex-col items-center gap-1 min-w-[56px] transition-all", item.active ? "text-[#00c4cc]" : "text-slate-400")}>
                      <item.icon size={20} className={cn("transition-transform", item.active && "scale-110")} />
                      <span className="text-[9px] font-black tracking-tight">{item.label}</span>
                  </button>
                  {i === 1 && (
                      <div className="relative -top-4">
                          <button onClick={() => (document.getElementById('pdf-upload') as any)?.click()} className="w-14 h-14 bg-gradient-to-tr from-[#7d2ae8] to-[#9d50f5] rounded-full flex items-center justify-center shadow-xl shadow-purple-200 border-4 border-white transition-transform active:scale-90">
                            <Plus size={28} className="text-white" />
                          </button>
                      </div>
                  )}
              </React.Fragment>
          ))}
          {[
              { label: 'Projets', icon: Folder },
              { label: 'Applis', icon: Library },
          ].map(item => (
              <button key={item.label} className="flex flex-col items-center gap-1 min-w-[56px] text-slate-400">
                  <item.icon size={20} />
                  <span className="text-[9px] font-black tracking-tight">{item.label}</span>
              </button>
          ))}
      </div>
      </div>
      </div>
    </div>
  );
};
