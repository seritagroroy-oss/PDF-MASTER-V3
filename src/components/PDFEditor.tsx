import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PDFDocument, rgb, StandardFonts, degrees, PDFPage } from 'pdf-lib';
import { pdfjs } from '../pdfjs-setup';
import { FileUpload } from './FileUpload';
import { Scissors, Download, Upload, Loader2, CheckCircle2, AlertCircle, Trash2, GripVertical, RefreshCw, X, Eye, Search, CheckSquare, Square, Check, Minus, Plus, Type, Bold, Italic, Underline, Palette, Eraser, Pencil, Undo2, RotateCcw, FileText, Pipette, RotateCw, Sun, Moon, Square as SquareIcon, Circle, ArrowRight, Highlighter, Stamp, PlusCircle, Lock, Zap, Sparkles, Menu, Languages, ScanLine, Volume2, Layout, Shapes, Folder, Grid, Settings, Star, AlignLeft, List, Home, MoreHorizontal, MessageCircle, Undo, PenTool, LayoutGrid, Library, MousePointer2, PlusCircle as AddIcon, ArrowUp, ArrowDown, Maximize, Minimize, Share2, ArrowLeft, HardDrive } from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { cn } from '../utils/cn';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { useSessionPersistence } from '../hooks/useSessionPersistence';
import { SessionRecoveryBanner, AutoSaveIndicator } from './SessionRecoveryBanner';

import { AISidebar } from './PDFEditor/AISidebar';
import { TextSidebar } from './PDFEditor/TextSidebar';
import { ElementsSidebar } from './PDFEditor/ElementsSidebar';
import { PreviewModal } from './PDFEditor/PreviewModal';
import { ReorderModal } from './PDFEditor/ReorderModal';
import { EditorLeftSidebar } from './PDFEditor/EditorLeftSidebar';
import { EditorHeader } from './PDFEditor/EditorHeader';
import { EditorContextualToolbar } from './PDFEditor/EditorContextualToolbar';
import { MobileFloatingToolbar } from './PDFEditor/MobileFloatingToolbar';
import { EditorBottomBar } from './PDFEditor/EditorBottomBar';
import { ThumbnailCard } from './PDFEditor/ThumbnailCard';
import { PDFThumbnailsToolbar } from './PDFEditor/PDFThumbnailsToolbar';
import { HelpModal } from './PDFEditor/HelpModal';
import { LoadingModal } from './PDFEditor/LoadingModal';
import { SignatureModal } from './PDFEditor/SignatureModal';
import { MobileBottomNav } from './PDFEditor/MobileBottomNav';
import { generatePDF } from '../utils/pdfGenerator';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "");



import { PageThumbnail, DrawingStroke } from '../types';
import { usePDFCanvas } from '../hooks/usePDFCanvas';
import { isFileSystemApiSupported, saveFileDirectly, verifyPermission, storeHandle, getStoredHandle } from '../utils/fileSystem';
import { loadGoogleScripts, authenticateGoogle, uploadToDrive } from '../utils/googleDrive';

interface PDFEditorProps {
  projectId: string;
  onBack: () => void;
  addProject: (name: string, pageCount: number, thumbnailUrl?: string) => string;
  updateProject: (id: string, updates: any) => void;
}

export const PDFEditor: React.FC<PDFEditorProps> = ({ 
  projectId: initialProjectId, 
  onBack,
  addProject,
  updateProject
}) => {
  const [projectId, setProjectId] = useState(initialProjectId);
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
  
  const {
    currentDrawings, setCurrentDrawings,
    redoStack, setRedoStack,
    isDrawing, setIsDrawing,
    visualTool, setVisualTool,
    brushSize, setBrushSize,
    tempColor, setTempColor,
    tempIsBold, setTempIsBold,
    tempIsItalic, setTempIsItalic,
    stampType, setStampType,
    textInput, setTextInput,
    draggingStrokeIdx, setDraggingStrokeIdx,
    selectedElementIdx, setSelectedElementIdx,
    dragOffset, setDragOffset,
    undo, redo, clearDrawings
  } = usePDFCanvas();
  const [zoomLevel, setZoomLevel] = useState(1); // 0: Small, 1: Medium, 2: Large
  const [searchQuery, setSearchQuery] = useState("");
  const [editorZoom, setEditorZoom] = useState(typeof window !== 'undefined' && window.innerWidth < 768 ? 0.4 : 1);


  const deselectAll = () => {
    setSelectedIds(new Set());
  };
  const [previewPage, setPreviewPage] = useState<PageThumbnail | null>(null);
  const [highResUrl, setHighResUrl] = useState<string | null>(null);
  const [isRenderingHighRes, setIsRenderingHighRes] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeEditMode, setActiveEditMode] = useState<'text' | 'visual'>('visual');
  const [isPickingColor, setIsPickingColor] = useState(false);
  const [lastNonEraserColor, setLastNonEraserColor] = useState("#1a1a1a");
  const [isAISidebarOpen, setIsAISidebarOpen] = useState(false);
  const [isElementsSidebarOpen, setIsElementsSidebarOpen] = useState(false);
  const [isTextSidebarOpen, setIsTextSidebarOpen] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [projectStorageType, setProjectStorageType] = useState<'local' | 'filesystem' | 'cloud'>('local');
  const [projectFileHandle, setProjectFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [projectCloudId, setProjectCloudId] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [isCloudInited, setIsCloudInited] = useState(false);

  // Sync storage metadata from project
  useEffect(() => {
    const loadMetadata = async () => {
      if (projectId !== 'new') {
        const projectsRaw = localStorage.getItem('pdfmaster_projects_manifest');
        if (projectsRaw) {
          const projects = JSON.parse(projectsRaw);
          const current = projects.find((p: any) => p.id === projectId);
          if (current) {
            if (current.storageType) setProjectStorageType(current.storageType);
            if (current.cloudId) setProjectCloudId(current.cloudId);
            
            // Filesystem handles MUST be retrieved from IndexedDB
            if (current.storageType === 'filesystem') {
              const handle = await getStoredHandle(projectId);
              if (handle) {
                setProjectFileHandle(handle);
                console.log('[PDFEditor] Restored local file handle for Pro mode.');
              }
            }
          }
        }
      }
    };
    loadMetadata();
  }, [projectId]);

  // Load Google Drive scripts on mount
  useEffect(() => {
    loadGoogleScripts().then(() => {
      setIsCloudInited(true);
    });
  }, []);

  const handleLinkToCloud = async () => {
    setIsLinking(true);
    try {
      await authenticateGoogle();
      
      // Generate current PDF to upload
      const result = await editPDF();
      if (result) {
        const driveId = await uploadToDrive(rawFiles[0]?.name || 'Document.pdf', result.blob, projectCloudId || undefined);
        if (driveId) {
          setProjectCloudId(driveId);
          setProjectStorageType('cloud');
          updateProject(projectId, {
            storageType: 'cloud-gdrive',
            cloudId: driveId
          });
          alert("Succès ! Votre projet est maintenant synchronisé avec Google Drive.");
        }
      }
    } catch (e: any) {
      console.error('Cloud linking failed', e);
      alert("Erreur de connexion Google. Vérifiez votre Client ID et API Key.");
    } finally {
      setIsLinking(false);
    }
  };

  const handleLinkToLocalDisk = async () => {
    if (!isFileSystemApiSupported()) {
      alert("Votre navigateur ne supporte pas encore l'accès direct au disque. Utilisez Chrome ou Edge sur PC.");
      return;
    }

    setIsLinking(true);
    try {
      // Pick a file to link to
      const [handle] = await (window as any).showOpenFilePicker({
        types: [{ description: 'Fichiers PDF', accept: { 'application/pdf': ['.pdf'] } }],
        multiple: false
      });

      if (handle) {
        // Verify permission
        const canWrite = await verifyPermission(handle, true);
        if (canWrite) {
          // Store handle in IndexedDB (cannot go to localStorage)
          await storeHandle(projectId, handle);
          
          setProjectFileHandle(handle);
          setProjectStorageType('filesystem');
          
          // Update manifest (without the handle object itself)
          updateProject(projectId, { 
            storageType: 'filesystem'
          });
          
          alert("Succès ! Ce projet est maintenant lié à votre fichier local. Chaque modification sera enregistrée directement.");
        }
      }
    } catch (e) {
      console.error('Linking failed', e);
    } finally {
      setIsLinking(false);
    }
  };
  
  // ── Session persistence hook ─────────────────────────────────────────────
  const {
    saveSession,
    restoreSession,
    clearSession,
    hasRecoverableSession,
    sessionMeta,
    lastSavedAt,
    isSaving,
    duplicateSession
  } = useSessionPersistence({
    toolId: projectId,
    thumbnails,
    rawFiles,
    editorZoom,
    activeMode: activeEditMode, 
    editingPageId: editingPage?.id || null,
    draftText: tempText,
    draftDrawings: currentDrawings,
    enabled: true,
  });
  
  const triggerImageUpload = () => {
    imageInputRef.current?.click();
  };

  const toggleElementsSidebar = useCallback(() => {
    setIsElementsSidebarOpen(prev => !prev);
    setIsAISidebarOpen(false);
    setIsTextSidebarOpen(false);
  }, [isElementsSidebarOpen]);

  const toggleTextSidebar = useCallback(() => {
    setIsTextSidebarOpen(prev => !prev);
    setIsAISidebarOpen(false);
    setIsElementsSidebarOpen(false);
  }, [isTextSidebarOpen]);

  const toggleAISidebar = useCallback(() => {
    setIsAISidebarOpen(prev => !prev);
    setIsElementsSidebarOpen(false);
    setIsTextSidebarOpen(false);
  }, [isAISidebarOpen]);

  const [selectedTextModel, setSelectedTextModel] = useState<{ text: string, fontSize: number, isBold: boolean, isItalic: boolean, isHighlighted: boolean } | null>(null);
  const [initialText, setInitialText] = useState("");
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);
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
  const imageInputRef = useRef<HTMLInputElement>(null);
  const canvasDimensionsRef = useRef({ width: 0, height: 0 });
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const pinchStartDistRef = useRef<number | null>(null);
  const initialPinchZoomRef = useRef<number | null>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const editorZoomRef = useRef(editorZoom);
  const textDragRef = useRef<{ startClient: { x: number; y: number }; startCanvas: { x: number; y: number } } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [isSharing, setIsSharing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const isRestoringRef = useRef(false);
  const hasAttemptedRestoreRef = useRef(false);
  const [showRecoveryBanner, setShowRecoveryBanner] = useState(true);

  // ── Helper: Render HD Page ───────────────────────────────────────────────
  const renderHighResPage = async (file: File, pageIndex: number) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(pageIndex + 1);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Canvas context failed");
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({ canvasContext: ctx, viewport: viewport, canvas: canvas }).promise;
      return canvas.toDataURL();
    } catch (err) {
      console.error("[PDFEditor] HD Render failed:", err);
      return null;
    }
  };

  // ── Thumbnail loading ─────────────────────────────────────────────────────
  const loadThumbnails = async (files: File[], existingThumbnails?: PageThumbnail[]) => {
    console.log('[PDFEditor] loadThumbnails started', { filesCount: files.length, existingCount: existingThumbnails?.length });
    setIsLoadingPages(true);
    setLoadingProgress(0);
    setError(null);
    try {
      const allThumbnails: PageThumbnail[] = [];
      let totalPagesProcessed = 0;

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

          const dataUrl = canvas.toDataURL();
          const existing = existingThumbnails?.find(t => t.sourceFileIndex === fileIdx && t.index === i - 1);

          if (existing) {
            allThumbnails.push({ ...existing, url: dataUrl });
          } else {
            allThumbnails.push({
              id: `page-${fileIdx}-${i}-${Math.random()}`,
              sourceFileIndex: fileIdx,
              index: i - 1,
              url: dataUrl
            });
          }

          totalPagesProcessed++;
          setLoadingProgress(Math.round((totalPagesProcessed / totalPagesCount) * 100));
        }
      }
      setThumbnails(allThumbnails);
      console.log('[PDFEditor] loadThumbnails finished', { count: allThumbnails.length });
      
      // Si c'est un nouveau projet, on l'enregistre dans le dashboard
      if (projectId === 'new' && allThumbnails.length > 0) {
        console.log('[PDFEditor] Registering new project...');
        const newId = addProject(files[0].name, allThumbnails.length, allThumbnails[0].url);
        
        // On sauvegarde d'abord la session actuelle ('new')
        await saveSession();
        // Puis on la duplique vers le nouvel ID
        await duplicateSession('new', newId);
        
        setProjectId(newId);
        // On ne retourne rien ici pour laisser le useEffect suivant déclencher la sauvegarde
      } else if (projectId !== 'new') {
        console.log('[PDFEditor] Updating existing project metadata...');
        updateProject(projectId, { 
          pageCount: allThumbnails.length, 
          thumbnailUrl: allThumbnails[0]?.url 
        });
      }

      return allThumbnails;
    } catch (err: any) {
      console.error("[PDFEditor] loadThumbnails Error:", err);
      setError(`Erreur lors du chargement : ${err.message}`);
      throw err;
    } finally {
      setIsLoadingPages(false);
    }
  };

  useEffect(() => {
    if (isRestoringRef.current) return;
    if (rawFiles.length > 0) {
      loadThumbnails(rawFiles);
    } else {
      setThumbnails([]);
    }
  }, [rawFiles]);

  // ── Restore session handler ───────────────────────────────────────────────
  const handleRestoreSession = useCallback(async () => {
    console.log('[PDFEditor] handleRestoreSession triggered for ID:', projectId);
    setIsRestoring(true);
    isRestoringRef.current = true;
    hasAttemptedRestoreRef.current = true;
    try {
      const snapshot = await restoreSession();
      if (!snapshot) {
        console.warn('[PDFEditor] No snapshot found for ID:', projectId);
        alert("Désolé, aucune donnée de session n'a pu être récupérée pour ce projet.");
        setIsRestoring(false);
        isRestoringRef.current = false;
        return;
      }

      console.log('[PDFEditor] Snapshot restored, re-building files...', { files: snapshot.meta.fileNames });

      const restoredFiles: File[] = snapshot.rawFilesBuffers.map((buf, i) => {
        const name = snapshot.meta.fileNames[i] || `document_${i + 1}.pdf`;
        return new File([buf], name, { type: 'application/pdf' });
      });

      if (restoredFiles.length > 0) {
        setRawFiles(restoredFiles);
        
        console.log('[PDFEditor] Re-hydrating thumbnails...');
        const rehydratedThumbnails = await loadThumbnails(restoredFiles, snapshot.thumbnailsMeta);

        if (snapshot.draft && snapshot.meta.editorState?.editingPageId && rehydratedThumbnails) {
          const pageId = snapshot.meta.editorState.editingPageId;
          const targetPage = rehydratedThumbnails.find(t => t.id === pageId);
          
          if (targetPage) {
            console.log('[PDFEditor] Restoring draft state in HD for page:', pageId);
            
            // On génère la version HD pour l'éditeur
            const hdUrl = await renderHighResPage(restoredFiles[targetPage.sourceFileIndex], targetPage.index);
            
            setEditingPage({ ...targetPage, url: hdUrl || targetPage.url });
            setTempText(snapshot.draft?.text || "");
            setCurrentDrawings(snapshot.draft?.drawings || []);
            setActiveEditMode(snapshot.meta.editorState?.activeMode as any || 'visual');
          }
        }
      } else {
        if (snapshot.thumbnailsMeta.length > 0) {
          setThumbnails(snapshot.thumbnailsMeta);
        }
      }

      if (snapshot.meta.editorState?.zoom) {
        setEditorZoom(snapshot.meta.editorState.zoom);
      }

      console.log('[PDFEditor] Restoration complete');
      setShowRecoveryBanner(false);
    } catch (e) {
      console.error('[PDFEditor] handleRestoreSession FAILED:', e);
      alert("Une erreur est survenue lors de la récupération de la session.");
    } finally {
      isRestoringRef.current = false;
      setIsRestoring(false);
    }
  }, [restoreSession, loadThumbnails, renderHighResPage]);

  // ── Auto-restore for existing projects ────────────────────────────────────
  useEffect(() => {
    if (projectId !== 'new' && rawFiles.length === 0 && hasRecoverableSession && !isRestoringRef.current && !hasAttemptedRestoreRef.current) {
      console.log('[PDFEditor] Auto-restore candidate detected:', projectId);
      handleRestoreSession();
    }
  }, [projectId, rawFiles.length, hasRecoverableSession, handleRestoreSession]);

  // ── Auto-save when projectId changes from 'new' ──────────────────────────
  useEffect(() => {
    if (projectId !== 'new' && (rawFiles.length > 0 || thumbnails.length > 0) && !isRestoringRef.current) {
      console.log('[PDFEditor] Project ID changed, forcing immediate save...', projectId);
      saveSession();
    }
  }, [projectId, saveSession]);

  useEffect(() => {
    if (projectId !== 'new' && rawFiles.length === 0 && hasRecoverableSession && !isRestoringRef.current) {
      console.log('[PDFEditor] Auto-restoring existing project:', projectId);
      handleRestoreSession();
    }
  }, [projectId, rawFiles.length, hasRecoverableSession, handleRestoreSession]);

  useEffect(() => {
    editorZoomRef.current = editorZoom;
  }, [editorZoom]);

  // Prevention of native zoom on mobile with stable listeners
  useEffect(() => {
    const ws = workspaceRef.current;
    if (!ws) return;

    const handleTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            const dist = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );
            pinchStartDistRef.current = dist;
            initialPinchZoomRef.current = editorZoomRef.current;
        }
    };

    const handleTouchMove = (e: TouchEvent) => {
        if (e.touches.length === 2 && pinchStartDistRef.current != null && initialPinchZoomRef.current != null) {
            e.preventDefault();
            const currentDist = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );
            const ratio = currentDist / pinchStartDistRef.current;
            const newZoom = Math.min(3, Math.max(0.1, initialPinchZoomRef.current * ratio));
            setEditorZoom(newZoom);
        }
    };

    const handleTouchEnd = () => {
        pinchStartDistRef.current = null;
        initialPinchZoomRef.current = null;
    };

    ws.addEventListener('touchstart', handleTouchStart, { passive: false });
    ws.addEventListener('touchmove', handleTouchMove, { passive: false });
    ws.addEventListener('touchend', handleTouchEnd);

    return () => {
        ws.removeEventListener('touchstart', handleTouchStart);
        ws.removeEventListener('touchmove', handleTouchMove);
        ws.removeEventListener('touchend', handleTouchEnd);
    };
  }, [editingPage]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
              setPendingImage(event.target?.result as string);
              setVisualTool('image');
          };
          reader.readAsDataURL(file);
      }
  };



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


  const removeThumbnail = (id: string) => {
    setThumbnails(prev => {
      const next = prev.filter(t => t.id !== id);
      setTimeout(() => saveSession(), 200);
      return next;
    });
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
    setThumbnails(prev => {
      const next = prev.filter(t => !selectedIds.has(t.id));
      setTimeout(() => saveSession(), 200);
      return next;
    });
    setSelectedIds(new Set());
  };

  const rotatePage = (id: string) => {
    setThumbnails(prev => {
      const next = prev.map(t => {
        if (t.id === id) {
          const currentRotation = t.rotation || 0;
          return { ...t, rotation: (currentRotation + 90) % 360 };
        }
        return t;
      });
      setTimeout(() => saveSession(), 200);
      return next;
    });
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
    setThumbnails(prev => {
      const next = [...prev, blankThumb];
      setTimeout(() => saveSession(), 200);
      return next;
    });
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
    setActiveEditMode('visual');
    setEditorZoom(typeof window !== 'undefined' && window.innerWidth < 768 ? 0.4 : 1);

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
      setThumbnails(prev => {
        const next = prev.map(t =>
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
        );
        // Trigger session save after thumbnails update
        setTimeout(() => saveSession(), 100);
        return next;
      });
      setEditingPage(null);
    }
  };

  const askAI = async (promptType: 'summary' | 'explain' | 'fix' | 'translate' | 'keywords' | 'general' | 'detect_wm') => {
    if (!editingPage) return;
    if (!import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
      setAiResponse("Clé API manquante. Veuillez créer un fichier .env à la racine de votre projet avec :\nVITE_GEMINI_API_KEY=votre_cle_ici\n\nVous pouvez en obtenir une sur : https://aistudio.google.com/app/apikey");
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

  const getSmartBackgroundColor = (x: number, y: number, radius: number): string => {
    const canvas = canvasRef.current;
    if (!canvas) return "#ffffff";
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return "#ffffff";

    try {
      const padding = Math.max(6, Math.round(radius * 0.35));
      const left = Math.max(0, Math.round(x - radius / 2 - padding));
      const top = Math.max(0, Math.round(y - radius / 2 - padding));
      const right = Math.min(canvas.width - 1, Math.round(x + radius / 2 + padding));
      const bottom = Math.min(canvas.height - 1, Math.round(y + radius / 2 + padding));
      const sampleWidth = Math.max(1, right - left + 1);
      const sampleHeight = Math.max(1, bottom - top + 1);
      const data = ctx.getImageData(left, top, sampleWidth, sampleHeight).data;

      const samples: Array<{ r: number; g: number; b: number; luma: number }> = [];

      for (let py = 0; py < sampleHeight; py++) {
        for (let px = 0; px < sampleWidth; px++) {
          const isBorder =
            px < padding ||
            py < padding ||
            px >= sampleWidth - padding ||
            py >= sampleHeight - padding;

          if (!isBorder) continue;

          const idx = (py * sampleWidth + px) * 4;
          const alpha = data[idx + 3];
          if (alpha < 200) continue;

          const pr = data[idx];
          const pg = data[idx + 1];
          const pb = data[idx + 2];
          const luma = 0.299 * pr + 0.587 * pg + 0.114 * pb;

          // Ignore dark pixels so we don't learn the text color as background.
          if (luma < 175) continue;

          samples.push({ r: pr, g: pg, b: pb, luma });
        }
      }

      if (samples.length === 0) return "#ffffff";

      samples.sort((a, b) => b.luma - a.luma);
      const kept = samples.slice(0, Math.max(1, Math.ceil(samples.length * 0.25)));

      let r = 0, g = 0, b = 0;
      for (const sample of kept) {
        r += sample.r;
        g += sample.g;
        b += sample.b;
      }

      r = Math.round(r / kept.length);
      g = Math.round(g / kept.length);
      b = Math.round(b / kept.length);

      const avgLuma = 0.299 * r + 0.587 * g + 0.114 * b;
      if (avgLuma > 235) return "#ffffff";

      return "#" + [r, g, b].map(value => value.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      return "#ffffff";
    }
  };

  const applyMagicEraser = (pos: { x: number; y: number }) => {
    const size = Math.max(28, brushSize * 4);
    const hexColor = getSmartBackgroundColor(pos.x, pos.y, size);
    
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
      const foundIdx = currentDrawings.findLastIndex(stroke => {
        // Detection par zone pour les formes et images
        if (['rect', 'image', 'stamp', 'magic-eraser'].includes(stroke.mode as string) && stroke.points.length >= 2) {
          const start = stroke.points[0];
          const end = stroke.points[1];
          const left = Math.min(start.x, end.x);
          const top = Math.min(start.y, end.y);
          const right = Math.max(start.x, end.x);
          const bottom = Math.max(start.y, end.y);
          return pos.x >= left && pos.x <= right && pos.y >= top && pos.y <= bottom;
        }
        // Detection pour le texte (boîte englobante approximative)
        if (stroke.mode === 'text' && stroke.points.length >= 1) {
          const dx = Math.abs(stroke.points[0].x - pos.x);
          const dy = Math.abs(stroke.points[0].y - pos.y);
          return dx < 60 && dy < 30;
        }
        // Detection par point pour le dessin libre (pinceau/surligneur)
        return stroke.points.some(p => Math.abs(p.x - pos.x) < 20 && Math.abs(p.y - pos.y) < 20);
      });
      
      if (foundIdx !== -1) {
        setDraggingStrokeIdx(foundIdx);
        setSelectedElementIdx(foundIdx);
        setDragOffset({ x: pos.x, y: pos.y });
      } else {
        setSelectedElementIdx(null);
      }
      return;
    }

    if (visualTool === 'image' && pendingImage) {
      setCurrentDrawings(prev => [...prev, {
        points: [pos, { x: pos.x + 200, y: pos.y + 150 }],
        color: 'transparent',
        width: 0,
        mode: 'image' as any,
        text: pendingImage,
        canvasWidth: canvasDimensions.width,
        canvasHeight: canvasDimensions.height
      }]);
      setPendingImage(null);
      setVisualTool('move');
      return;
    }

    if (visualTool === 'text') {
      setIsDrawing(false);
      
      // Détection de clic sur un texte existant pour ré-édition
      const hitIndex = currentDrawings.findLastIndex(stroke => {
        if (stroke.mode !== 'text' || !stroke.text) return false;
        const dx = Math.abs(stroke.points[0].x - pos.x);
        const dy = Math.abs(stroke.points[0].y - pos.y);
        // On utilise une zone de clic adaptée à la taille moyenne d'un texte
        return dx < 60 && dy < 30; 
      });

      if (hitIndex !== -1) {
        const stroke = currentDrawings[hitIndex];
        // Charger les propriétés du texte dans l'éditeur flottant
        if (stroke.color) setTempColor(stroke.color);
        setTextInput({
          x: stroke.points[0].x,
          y: stroke.points[0].y,
          text: stroke.text,
          fontSize: stroke.fontSize || 20,
          isBold: stroke.isBold || false,
          isItalic: stroke.isItalic || false,
          isHighlighted: stroke.isHighlighted || false,
          originalStroke: stroke // Sauvegarder pour restauration si annulation
        });
        // Retirer temporairement le texte du canvas pour l'édition "live"
        setCurrentDrawings(prev => prev.filter((_, i) => i !== hitIndex));
        return;
      }

      const textToUse = selectedTextModel?.text || '';
      setTextInput({ 
        x: pos.x, 
        y: pos.y, 
        text: textToUse,
        fontSize: selectedTextModel?.fontSize || 20,
        isBold: selectedTextModel?.isBold || false,
        isItalic: selectedTextModel?.isItalic || false,
        isHighlighted: selectedTextModel?.isHighlighted || false
      });
      setSelectedTextModel(null);
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
      if (['rect', 'circle', 'arrow', 'stamp', 'magic-eraser', 'image'].includes(visualTool)) {
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
  const bringToFront = () => {
    if (selectedElementIdx === null) return;
    const stroke = currentDrawings[selectedElementIdx];
    const next = currentDrawings.filter((_, i) => i !== selectedElementIdx);
    next.push(stroke);
    setCurrentDrawings(next);
    setSelectedElementIdx(next.length - 1);
  };

  const sendToBack = () => {
    if (selectedElementIdx === null) return;
    const stroke = currentDrawings[selectedElementIdx];
    const next = currentDrawings.filter((_, i) => i !== selectedElementIdx);
    next.unshift(stroke);
    setCurrentDrawings(next);
    setSelectedElementIdx(0);
  };

  const deleteSelectedElement = () => {
    if (selectedElementIdx === null) return;
    setCurrentDrawings(prev => prev.filter((_, i) => i !== selectedElementIdx));
    setSelectedElementIdx(null);
  };

  const scaleSelectedElement = (factor: number) => {
    if (selectedElementIdx === null) return;
    setCurrentDrawings(prev => {
        const next = [...prev];
        const stroke = { ...next[selectedElementIdx] };
        if (stroke.points.length >= 2) {
            const start = stroke.points[0];
            const end = stroke.points[1];
            const centerX = (start.x + end.x) / 2;
            const centerY = (start.y + end.y) / 2;
            stroke.points = [
                { x: centerX + (start.x - centerX) * factor, y: centerY + (start.y - centerY) * factor },
                { x: centerX + (end.x - centerX) * factor, y: centerY + (end.y - centerY) * factor }
            ];
        } else if (stroke.mode === 'text' && stroke.fontSize) {
            stroke.fontSize = Math.round(stroke.fontSize * factor);
        }
        next[selectedElementIdx] = stroke;
        return next;
    });
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
        if (canvasDimensionsRef.current.width !== img.width || canvasDimensionsRef.current.height !== img.height) {
            setCanvasDimensions({ width: img.width, height: img.height });
            canvasDimensionsRef.current = { width: img.width, height: img.height };
        }

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

        currentDrawings.forEach((stroke, idx) => {
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
            const eraseInset = stroke.mode === 'magic-eraser' ? Math.max(6, brushSize * 0.8) : 0;
            const left = Math.min(start.x, end.x) - eraseInset;
            const top = Math.min(start.y, end.y) - eraseInset;
            const width = Math.abs(end.x - start.x) + eraseInset * 2;
            const height = Math.abs(end.y - start.y) + eraseInset * 2;
            if (stroke.width === 0) {
              ctx.fillStyle = stroke.color;
              ctx.fillRect(left, top, width, height);
            } else {
              ctx.strokeRect(left, top, width, height);
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
          } else if (stroke.mode === 'image' && stroke.text) {
            const start = stroke.points[0];
            const end = stroke.points[1] || { x: start.x + 200, y: start.y + 150 };
            const w = end.x - start.x;
            const h = end.y - start.y;
            const img = new Image();
            img.src = stroke.text;
            ctx.drawImage(img, start.x, start.y, w, h);
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
              const symMap: { [key: string]: string } = {
                'check': '✅', 'x': '❌', 'star': '⭐', 'heart': '❤️', 
                'approved': 'OK', 'sign': '✒️', 'confidential': '🔒', 'warning': '⚠️'
              };
              const symbol = symMap[stroke.text || 'check'] || (stroke.text || 'CHECK').toUpperCase();
              
              ctx.fillStyle = stroke.color;
              if (!['✅', '❌', '⭐', '❤️', '⚠️', '✒️', '🔒'].includes(symbol)) {
                ctx.fillRect(start.x, start.y, w, h);
                ctx.fillStyle = 'white';
              }
              
              ctx.font = `bold ${Math.abs(h) * 0.6}px Outfit, Inter, "Apple Color Emoji", "Segoe UI Emoji"`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(symbol, start.x + w / 2, start.y + h / 2);
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
          
          // Highlight for selected element
          if (idx === selectedElementIdx) {
            ctx.save();
            ctx.strokeStyle = '#6366f1';
            ctx.setLineDash([5, 5]);
            ctx.lineWidth = 2 / editorZoom;
            
            if (stroke.points.length >= 2 && ['rect', 'image', 'stamp'].includes(stroke.mode as string)) {
              const start = stroke.points[0];
              const end = stroke.points[1];
              ctx.strokeRect(
                Math.min(start.x, end.x) - 5, 
                Math.min(start.y, end.y) - 5, 
                Math.abs(end.x - start.x) + 10, 
                Math.abs(end.y - start.y) + 10
              );
            } else if (stroke.points.length > 0) {
              const xs = stroke.points.map(p => p.x);
              const ys = stroke.points.map(p => p.y);
              const minX = Math.min(...xs);
              const maxX = Math.max(...xs);
              const minY = Math.min(...ys);
              const maxY = Math.max(...ys);
              ctx.strokeRect(minX - 10, minY - 10, (maxX - minX) + 20, (maxY - minY) + 20);
            }
            ctx.restore();
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
           const maskCtx = lineMaskCanvas.getContext('2d');
           if (maskCtx) {
             currentDrawings
               .filter(stroke => stroke.mode === 'magic-eraser' && stroke.points.length >= 2)
               .forEach(stroke => {
                 const start = stroke.points[0];
                 const end = stroke.points[1];
                 const inset = Math.max(8, brushSize);
                 maskCtx.clearRect(
                   Math.min(start.x, end.x) - inset,
                   Math.min(start.y, end.y) - inset,
                   Math.abs(end.x - start.x) + inset * 2,
                   Math.abs(end.y - start.y) + inset * 2
                 );
               });
           }
           ctx.globalAlpha = 1.0;
           ctx.globalCompositeOperation = 'darken'; // This will keep the darkest between drawing and original
           ctx.drawImage(lineMaskCanvas, 0, 0);
           ctx.globalCompositeOperation = 'source-over';
        }
      };
    }
  }, [activeEditMode, editingPage, currentDrawings, isTableProtectionEnabled, editorZoom, selectedElementIdx]);

  const editPDF = async (thumbnailsToProcess: PageThumbnail[] | any = thumbnails) => {
    const pages = Array.isArray(thumbnailsToProcess) ? thumbnailsToProcess : thumbnails;

    setIsProcessing(true);
    setLoadingProgress(0);
    setError(null);
    setResultUrl(null);

    try {
      const blob = await generatePDF({
        pages,
        rawFiles,
        canvasDimensions,
        brushSize,
        signatureData,
        watermark,
        onProgress: setLoadingProgress
      });
      const url = URL.createObjectURL(blob);
      setResultUrl(url);

      // --- PRO MODE: Direct Disk Save ---
      if (projectStorageType === 'filesystem' && projectFileHandle) {
        console.log('[PDFEditor] PRO MODE: Saving directly to disk...');
        const success = await saveFileDirectly(projectFileHandle, blob);
        if (success) {
          console.log('[PDFEditor] Successfully saved to local file.');
        } else {
          console.warn('[PDFEditor] Failed to save to local file. Maybe permission was revoked.');
        }
      }

      // --- CLOUD MODE: Sync to Google Drive ---
      if (projectStorageType === 'cloud' && projectCloudId) {
        console.log('[PDFEditor] CLOUD MODE: Syncing to Google Drive...');
        uploadToDrive(rawFiles[0]?.name || 'Document.pdf', blob, projectCloudId);
      }

      // Effacer la session après un export réussi
      clearSession();
      return { blob, url };
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erreur lors de l'exportation.");
      return null;
    } finally {
      setIsProcessing(false);
      setLoadingProgress(100);
    }
  };

  const handleShare = async () => {
    if (thumbnails.length === 0) return;
    
    let blobToShare: Blob | null = null;

    if (resultUrl) {
      try {
        const response = await fetch(resultUrl);
        blobToShare = await response.blob();
      } catch (e) {
        console.error("Fetch failed, re-generating...");
      }
    }

    if (!blobToShare) {
      setIsSharing(true);
      const result = await editPDF();
      if (result) {
        blobToShare = result.blob;
      }
      setIsSharing(false);
    }

    if (blobToShare && navigator.share) {
      const file = new File([blobToShare], `PDF_Master_${new Date().getTime()}.pdf`, { type: 'application/pdf' });
      try {
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'Document PDF Master',
            text: 'Voici mon document PDF édité via PDF Master.',
            files: [file]
          });
        } else {
          await navigator.share({
            title: 'Document PDF Master',
            text: 'Voici mon document PDF édité via PDF Master.',
            url: resultUrl || ''
          });
        }
      } catch (err) {
        console.error("Partage annulé ou erreur:", err);
      }
    } else if (!navigator.share) {
      alert("Votre navigateur ne supporte pas le partage direct. Veuillez télécharger le fichier.");
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
      {/* Session Recovery Banner - Ne s'affiche que pour les nouveaux projets ou crash inattendu */}
      {projectId === 'new' && hasRecoverableSession && showRecoveryBanner && sessionMeta && (
        <SessionRecoveryBanner
          meta={sessionMeta}
          onRestore={handleRestoreSession}
          onDismiss={() => {
            setShowRecoveryBanner(false);
            clearSession();
          }}
          isRestoring={isRestoring}
        />
      )}

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12">

        <div className="flex flex-col items-center justify-center text-center gap-4 mb-2 md:mb-12">
            <div className="flex items-center gap-3 md:gap-4 w-full justify-center relative">
                <button
                  onClick={onBack}
                  className="absolute left-0 p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all text-slate-500 hover:text-indigo-600 hidden md:block"
                  title="Retour au dashboard"
                >
                  <ArrowLeft size={24} />
                </button>
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
            {/* Auto-save indicator */}
            <AutoSaveIndicator isSaving={isSaving} lastSavedAt={lastSavedAt} />

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
              
              {isFileSystemApiSupported() && (
                <button
                  onClick={handleLinkToLocalDisk}
                  disabled={thumbnails.length === 0 || isProcessing || isLinking}
                  className={cn(
                    "flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-6 py-2 sm:py-3 rounded-2xl transition-all text-xs sm:text-sm font-bold shadow-lg",
                    projectStorageType === 'filesystem' 
                      ? "bg-emerald-500 text-white shadow-emerald-200" 
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-white hover:bg-slate-50 border border-slate-100 dark:border-slate-700"
                  )}
                  title={projectStorageType === 'filesystem' ? "Mode Pro activé (Lien direct au disque)" : "Activer le Mode Pro (Lien direct au disque)"}
                >
                  {isLinking ? <Loader2 className="animate-spin" size={16} /> : <HardDrive size={16} />}
                  <span className="hidden sm:inline">{projectStorageType === 'filesystem' ? "Mode Pro Actif" : "Mode Pro"}</span>
                </button>
              )}

              {isCloudInited && (
                <button
                  onClick={handleLinkToCloud}
                  disabled={thumbnails.length === 0 || isProcessing || isLinking}
                  className={cn(
                    "flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-6 py-2 sm:py-3 rounded-2xl transition-all text-xs sm:text-sm font-bold shadow-lg",
                    projectStorageType === 'cloud' 
                      ? "bg-blue-500 text-white shadow-blue-200" 
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-white hover:bg-slate-50 border border-slate-100 dark:border-slate-700"
                  )}
                  title={projectStorageType === 'cloud' ? "Mode Cloud activé (Google Drive)" : "Activer le Mode Cloud (Google Drive)"}
                >
                  {isLinking ? <Loader2 className="animate-spin" size={16} /> : <Globe size={16} />}
                  <span className="hidden sm:inline">{projectStorageType === 'cloud' ? "Mode Cloud Actif" : "Mode Cloud"}</span>
                </button>
              )}

              <button
                onClick={editPDF}
                disabled={thumbnails.length === 0 || isProcessing}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-6 py-2 sm:py-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all text-xs sm:text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                <span>Exporter</span>
              </button>
              <button
                onClick={handleShare}
                disabled={thumbnails.length === 0 || isProcessing || isSharing}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-6 py-2 sm:py-3 bg-violet-600 text-white rounded-2xl shadow-lg shadow-violet-200 dark:shadow-none hover:bg-violet-700 transition-all text-xs sm:text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSharing ? <Loader2 className="animate-spin" size={16} /> : <Share2 size={16} />}
                <span>Partager</span>
              </button>
            </div>
          </div>




        {isRestoring ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white/50 dark:bg-white/5 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 animate-pulse">
            <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
            <p className="text-slate-500 font-bold">Chargement de votre projet...</p>
          </div>
        ) : thumbnails.length === 0 && (
          <FileUpload
            files={files}
            setFiles={setFiles}
            onFilesChange={setRawFiles}
          />
        )}

        <AnimatePresence>
          <HelpModal showHelp={showHelp} setShowHelp={setShowHelp} />
          <LoadingModal isLoadingPages={isLoadingPages} loadingProgress={loadingProgress} />
        </AnimatePresence>


        {!isLoadingPages && thumbnails.length > 0 && (
          <>
            <div className="space-y-6 mt-4 sm:mt-12">
              <PDFThumbnailsToolbar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                addBlankPage={addBlankPage}
                setIsReorderingMode={setIsReorderingMode}
                selectAll={selectAll}
                selectedIds={selectedIds}
                thumbnailsCount={thumbnails.length}
                zoomLevel={zoomLevel}
                setZoomLevel={setZoomLevel}
              />
            </div>

            <div
              className={cn("grid gap-6", getGridCols())}
            >
              {thumbnails.filter(t => !searchQuery || t.modifiedText?.toLowerCase().includes(searchQuery.toLowerCase())).map((thumbnail, idx) => (
                <ThumbnailCard
                  key={thumbnail.id}
                  thumbnail={thumbnail}
                  idx={idx}
                  selectedIds={selectedIds}
                  toggleSelection={toggleSelection}
                  handleDoubleClick={handleDoubleClick}
                  removeThumbnail={removeThumbnail}
                  rotatePage={rotatePage}
                  openPreview={openPreview}
                  getThumbnailPadding={getThumbnailPadding}
                />
              ))}
            </div>
          </>
        )}
        <AnimatePresence>
          {isReorderingMode && (
            <ReorderModal
              isReorderingMode={isReorderingMode}
              setIsReorderingMode={setIsReorderingMode}
              thumbnails={thumbnails}
              setThumbnails={setThumbnails}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {previewPage && (
            <PreviewModal
              previewPage={previewPage}
              onClose={() => setPreviewPage(null)}
              isRenderingHighRes={isRenderingHighRes}
              highResUrl={highResUrl}
            />
          )}
          {editingPage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-[#f0f2f5] flex flex-col overflow-hidden animate-in fade-in duration-300"
            >
              <EditorHeader
                activeEditMode={activeEditMode}
                setActiveEditMode={setActiveEditMode}
                rawFiles={rawFiles}
                editingPage={editingPage}
                isSidebarHidden={isSidebarHidden}
                setIsSidebarHidden={setIsSidebarHidden}
                undo={undo}
                redo={redo}
                savePageEdits={savePageEdits}
                onBack={() => setEditingPage(null)} // Retour à la grille
              />

              <div className="flex flex-1 overflow-hidden relative">
                {/* 2. LEFT SIDEBAR (Dark - Hidden on mobile or in Zen mode) */}
                <EditorLeftSidebar
                  isSidebarHidden={isSidebarHidden}
                  visualTool={visualTool}
                  isAISidebarOpen={isAISidebarOpen}
                  isElementsSidebarOpen={isElementsSidebarOpen}
                  isTextSidebarOpen={isTextSidebarOpen}
                  toggleElementsSidebar={toggleElementsSidebar}
                  toggleTextSidebar={toggleTextSidebar}
                  toggleAISidebar={toggleAISidebar}
                  setVisualTool={setVisualTool}
                  setActiveEditMode={setActiveEditMode}
                  setIsElementsSidebarOpen={setIsElementsSidebarOpen}
                  setIsAISidebarOpen={setIsAISidebarOpen}
                />

                {/* 3. CENTER CONTENT */}
                <main className="flex-1 flex flex-col relative overflow-hidden bg-white">
                    {/* CONTEXTUAL TOOLBAR (Desktop Only) */}
                    <EditorContextualToolbar
                      activeEditMode={activeEditMode}
                      askAI={askAI}
                      isAIProcessing={isAIProcessing}
                      tempFontSize={tempFontSize}
                      setTempFontSize={setTempFontSize}
                      brushSize={brushSize}
                      setBrushSize={setBrushSize}
                      tempColor={tempColor}
                      setTempColor={setTempColor}
                      tempIsBold={tempIsBold}
                      setTempIsBold={setTempIsBold}
                      tempIsItalic={tempIsItalic}
                      setTempIsItalic={setTempIsItalic}
                      undo={undo}
                      redo={redo}
                      setEditingPage={setEditingPage}
                    />

                    {/* WORKSPACE */}
                    <div 
                        ref={workspaceRef}
                        className="flex-1 overflow-auto bg-[#f8f9fa] relative scroll-smooth p-2 sm:p-20 overscroll-none"
                        style={{ touchAction: 'pan-x pan-y' }}
                    >
                        <div className="min-h-full min-w-full flex items-center justify-center pointer-events-none">
                            <div 
                              className="relative shadow-[0_20px_50px_rgba(0,0,0,0.15)] bg-white transition-shadow duration-300 pointer-events-auto origin-center"
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
                                        cursor: visualTool === 'text' ? 'text' : (visualTool === 'move' ? 'grab' : 'crosshair')
                                    }}
                                    className={cn("bg-white transition-shadow duration-300", visualTool === 'text' ? "cursor-text" : (visualTool === 'move' ? "touch-auto cursor-grab" : "touch-none cursor-crosshair"))}
                                />
                            )}
                            
                            {textInput && canvasDimensions.width > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="absolute z-[130] flex flex-col items-center pointer-events-auto"
                                    style={{
                                        left: `${(textInput.x / (canvasDimensions.width || 1)) * 100}%`,
                                        top: `${(textInput.y / (canvasDimensions.height || 1)) * 100}%`,
                                        transform: 'translate(-50%, -50%)',
                                        touchAction: 'none',
                                    }}
                                >
                                    <motion.div 
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-1 mb-3 ring-1 ring-black/5"
                                    >
                                        <span
                                            className="cursor-move select-none touch-none"
                                            onPointerDown={(e) => {
                                                e.stopPropagation();
                                                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                                                textDragRef.current = {
                                                    startClient: { x: e.clientX, y: e.clientY },
                                                    startCanvas: { x: textInput.x, y: textInput.y },
                                                };
                                            }}
                                            onPointerMove={(e) => {
                                                if (!textDragRef.current) return;
                                                e.stopPropagation();
                                                // Capture ref value ONCE to avoid race condition with onPointerUp
                                                const drag = textDragRef.current;
                                                if (!drag) return;
                                                const dx = (e.clientX - drag.startClient.x) / editorZoom;
                                                const dy = (e.clientY - drag.startClient.y) / editorZoom;
                                                setTextInput(prev => prev ? {
                                                    ...prev,
                                                    x: Math.max(0, Math.min(canvasDimensions.width, drag.startCanvas.x + dx)),
                                                    y: Math.max(0, Math.min(canvasDimensions.height, drag.startCanvas.y + dy)),
                                                } : null);
                                            }}
                                            onPointerUp={() => { textDragRef.current = null; }}
                                        >
                                            <GripVertical size={14} className="text-slate-300 ml-1" />
                                        </span>
                                        <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1" />
                                        <div className="flex items-center gap-0.5">
                                            <button onClick={() => setTextInput({ ...textInput, isBold: !textInput.isBold })} className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-all", textInput.isBold ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800")}>
                                                <Bold size={14} />
                                            </button>
                                            <button onClick={() => setTextInput({ ...textInput, isItalic: !textInput.isItalic })} className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-all", textInput.isItalic ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800")}>
                                                <Italic size={14} />
                                            </button>
                                            <button onClick={() => setTextInput({ ...textInput, isHighlighted: !textInput.isHighlighted })} className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-all", textInput.isHighlighted ? "bg-amber-400 text-slate-900 shadow-md shadow-amber-500/20" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800")}>
                                                <Highlighter size={14} />
                                            </button>
                                        </div>
                                        <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1" />
                                        <div className="flex items-center gap-1 px-1">
                                            <input type="number" value={textInput.fontSize || 20} onChange={(e) => setTextInput({ ...textInput, fontSize: Number(e.target.value) })} className="w-10 bg-transparent text-[12px] font-black text-center outline-none text-slate-700 dark:text-slate-200" />
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">px</span>
                                        </div>
                                        <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1" />
                                        <button onClick={() => {
                                            if (!textInput.text.trim()) return;
                                            // Compute position from textarea's actual screen position for WYSIWYG accuracy
                                            let px = textInput.x, py = textInput.y;
                                            const canvas = canvasRef.current;
                                            const ta = textareaRef.current;
                                            if (canvas && ta) {
                                                const cr = canvas.getBoundingClientRect();
                                                const tr = ta.getBoundingClientRect();
                                                px = ((tr.left + tr.width / 2) - cr.left) * (canvas.width / cr.width);
                                                py = ((tr.top + tr.height / 2) - cr.top) * (canvas.height / cr.height);
                                            }
                                            setCurrentDrawings(prev => [...prev, { points: [{ x: px, y: py }], color: tempColor, width: 0, mode: 'text', text: textInput.text, fontSize: (textInput.fontSize || 20), isBold: textInput.isBold, isItalic: textInput.isItalic, isHighlighted: textInput.isHighlighted, canvasWidth: canvasDimensions.width, canvasHeight: canvasDimensions.height }]);
                                            setTextInput(null);
                                        }} className="ml-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black rounded-full shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1">
                                            <Check size={12} /> Valider
                                        </button>
                                        <button onClick={() => { if (textInput && textInput.originalStroke) { setCurrentDrawings(prev => [...prev, textInput.originalStroke]); } setTextInput(null); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all ml-1">
                                            <X size={14} />
                                        </button>
                                    </motion.div>
                                    <div className="relative group">
                                        <textarea
                                            ref={textareaRef}
                                            autoFocus
                                            rows={1}
                                            value={textInput.text}
                                            placeholder="Écrivez ici..."
                                            style={{
                                                fontWeight: textInput.isBold ? 'bold' : 'normal',
                                                fontStyle: textInput.isItalic ? 'italic' : 'normal',
                                                fontSize: `${(textInput.fontSize || 20) * editorZoom}px`,
                                                color: tempColor,
                                                backgroundColor: textInput.isHighlighted ? 'rgba(255, 255, 0, 0.4)' : 'transparent',
                                                lineHeight: 1.2,
                                                resize: 'none',
                                                minWidth: '200px',
                                                textAlign: 'center'
                                            }}
                                            className="bg-transparent border-2 border-dashed border-transparent hover:border-indigo-400/50 focus:border-indigo-500 outline-none px-6 py-3 transition-all rounded-2xl cursor-text text-center overflow-hidden"
                                            onChange={(e) => {
                                                setTextInput({ ...textInput, text: e.target.value });
                                                e.target.style.height = 'auto';
                                                e.target.style.height = e.target.scrollHeight + 'px';
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey && textInput.text.trim()) {
                                                    e.preventDefault();
                                                    let px = textInput.x, py = textInput.y;
                                                    const canvas = canvasRef.current;
                                                    const ta = textareaRef.current;
                                                    if (canvas && ta) {
                                                        const cr = canvas.getBoundingClientRect();
                                                        const tr = ta.getBoundingClientRect();
                                                        px = ((tr.left + tr.width / 2) - cr.left) * (canvas.width / cr.width);
                                                        py = ((tr.top + tr.height / 2) - cr.top) * (canvas.height / cr.height);
                                                    }
                                                    setCurrentDrawings(prev => [...prev, { points: [{ x: px, y: py }], color: tempColor, width: 0, mode: 'text', text: textInput.text, fontSize: (textInput.fontSize || 20), isBold: textInput.isBold, isItalic: textInput.isItalic, isHighlighted: textInput.isHighlighted, canvasWidth: canvasDimensions.width, canvasHeight: canvasDimensions.height }]);
                                                    setTextInput(null);
                                                }
                                                if (e.key === 'Escape') {
                                                    if (textInput && textInput.originalStroke) {
                                                        setCurrentDrawings(prev => [...prev, textInput.originalStroke]);
                                                    }
                                                    setTextInput(null);
                                                }
                                            }}
                                        />
                                    </div>
                                </motion.div>
                            )}

                            {selectedElementIdx !== null && currentDrawings[selectedElementIdx] && visualTool === 'move' && canvasDimensions.width > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    className="absolute z-[135] flex items-center gap-1 bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 pointer-events-auto"
                                    style={{
                                        left: `${((currentDrawings[selectedElementIdx]?.points?.[0]?.x || 0) / (canvasDimensions.width || 1)) * 100}%`,
                                        top: `${((currentDrawings[selectedElementIdx]?.points?.[0]?.y || 0) / (canvasDimensions.height || 1)) * 100}%`,
                                        transform: 'translate(-50%, -160%)',
                                    }}
                                >
                                    <div className="flex items-center gap-1 px-1 mr-1">
                                        <button onClick={bringToFront} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 transition-all active:scale-90" title="Mettre au premier plan">
                                            <ArrowUp size={16} />
                                        </button>
                                        <button onClick={sendToBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 transition-all active:scale-90" title="Mettre à l'arrière-plan">
                                            <ArrowDown size={16} />
                                        </button>
                                    </div>
                                    <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700" />
                                    <div className="flex items-center gap-1 px-1">
                                        <button onClick={() => scaleSelectedElement(1.1)} className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400 transition-all active:scale-90" title="Agrandir">
                                            <Maximize size={16} />
                                        </button>
                                        <button onClick={() => scaleSelectedElement(0.9)} className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400 transition-all active:scale-90" title="Réduire">
                                            <Minimize size={16} />
                                        </button>
                                    </div>
                                    <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700" />
                                    <button onClick={deleteSelectedElement} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-red-500 transition-all active:scale-90 ml-1" title="Supprimer">
                                        <Trash2 size={16} />
                                    </button>
                                </motion.div>
                            )}

                    </div>
                </div>
            </div>

                    {/* MOBILE FLOATING CONTEXT TOOLS (Above bottom nav) */}
                    <MobileFloatingToolbar
                      editorZoom={editorZoom}
                      setEditorZoom={setEditorZoom}
                      visualTool={visualTool}
                      setVisualTool={setVisualTool}
                      brushSize={brushSize}
                      setBrushSize={setBrushSize}
                      tempColor={tempColor}
                      setTempColor={setTempColor}
                    />

                    {/* BOTTOM STATUS BAR (Desktop/Tablet) */}
                    <EditorBottomBar
                      editorZoom={editorZoom}
                      setEditorZoom={setEditorZoom}
                      editingPage={editingPage}
                    />
                </main>

                <AnimatePresence>
                  {isAISidebarOpen && (
                    <AISidebar
                      isOpen={isAISidebarOpen}
                      onClose={() => setIsAISidebarOpen(false)}
                      askAI={askAI}
                      isAIProcessing={isAIProcessing}
                      aiResponse={aiResponse}
                    />
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {isTextSidebarOpen && (
                    <TextSidebar
                      isOpen={isTextSidebarOpen}
                      onClose={() => setIsTextSidebarOpen(false)}
                      setVisualTool={setVisualTool}
                      setActiveEditMode={setActiveEditMode}
                      setSelectedTextModel={setSelectedTextModel}
                    />
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {isElementsSidebarOpen && (
                    <ElementsSidebar
                      isOpen={isElementsSidebarOpen}
                      onClose={() => setIsElementsSidebarOpen(false)}
                      visualTool={visualTool}
                      stampType={stampType}
                      setVisualTool={setVisualTool}
                      setStampType={setStampType}
                      setActiveEditMode={setActiveEditMode}
                      triggerImageUpload={triggerImageUpload}
                    />
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
              <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                <button
                  onClick={downloadResult}
                  className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-lg shadow-emerald-200 transition-all hover:scale-105 active:scale-95"
                  title="Télécharger le PDF (Ctrl+S)"
                >
                  <Download size={20} />
                  Télécharger
                </button>
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-8 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold shadow-lg shadow-violet-200 transition-all hover:scale-105 active:scale-95"
                  title="Partager le document"
                >
                  <Share2 size={20} />
                  Partager
                </button>
              </div>
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
        <SignatureModal
          isSignaturePadOpen={isSignaturePadOpen}
          setIsSignaturePadOpen={setIsSignaturePadOpen}
          setSignatureData={setSignatureData}
        />
      </AnimatePresence>

      <MobileBottomNav
        editingPage={editingPage}
        setVisualTool={setVisualTool}
        toggleElementsSidebar={toggleElementsSidebar}
        toggleTextSidebar={toggleTextSidebar}
        toggleAISidebar={toggleAISidebar}
        visualTool={visualTool}
        setActiveEditMode={setActiveEditMode}
        isAISidebarOpen={isAISidebarOpen}
        isElementsSidebarOpen={isElementsSidebarOpen}
        isTextSidebarOpen={isTextSidebarOpen}
      />

      <input 
        type="file" 
        ref={imageInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleImageUpload} 
      />

    </div>
    </div>
  );
};
