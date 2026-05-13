/**
 * useSessionPersistence — Sauvegarde et récupération intelligente de session PDF.
 * Supporte maintenant le multi-projets via projectId.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  PageThumbnail, 
  SessionMeta, 
  SessionSnapshot, 
  UseSessionPersistenceOptions, 
  UseSessionPersistenceReturn 
} from '../types';

// ─── Constants ───────────────────────────────────────────────────────────────
const DB_NAME = 'PDFMasterDB';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';
const AUTO_SAVE_INTERVAL = 30_000; // 30 secondes

// ─── IndexedDB helpers ────────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'toolId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function writeToIDB(toolId: string, data: object): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({ toolId, ...data });
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch (e) {
    console.warn('[SessionPersistence] IndexedDB write failed:', e);
  }
}

async function readFromIDB(toolId: string): Promise<any | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(toolId);
      req.onsuccess = () => { db.close(); resolve(req.result ?? null); };
      req.onerror = () => { db.close(); reject(req.error); };
    });
  } catch (e) {
    console.warn('[SessionPersistence] IndexedDB read failed:', e);
    return null;
  }
}

async function deleteFromIDB(toolId: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(toolId);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); resolve(); };
    });
  } catch (e) {
    console.warn('[SessionPersistence] IndexedDB delete failed:', e);
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSessionPersistence(options: UseSessionPersistenceOptions): UseSessionPersistenceReturn {
  const { toolId, enabled = true } = options;
  // On utilise toolId comme identifiant de projet unique
  const projectId = toolId; 

  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [hasRecoverableSession, setHasRecoverableSession] = useState(false);
  const [sessionMeta, setSessionMeta] = useState<SessionMeta | null>(null);

  const metaKey = `pdfmaster_session_meta_${projectId}`;
  const draftKey = `pdfmaster_session_draft_${projectId}`;

  const saveMetaLocal = useCallback((meta: SessionMeta) => {
    localStorage.setItem(metaKey, JSON.stringify(meta));
  }, [metaKey]);

  const loadMetaLocal = useCallback((): SessionMeta | null => {
    const raw = localStorage.getItem(metaKey);
    return raw ? JSON.parse(raw) : null;
  }, [metaKey]);

  const clearMetaLocal = useCallback(() => {
    localStorage.removeItem(metaKey);
    localStorage.removeItem(draftKey);
  }, [metaKey, draftKey]);

  // Refs
  const thumbnailsRef = useRef(options.thumbnails);
  const rawFilesRef = useRef(options.rawFiles);
  const editorZoomRef = useRef(options.editorZoom ?? 1);
  const activeModeRef = useRef(options.activeMode ?? 'visual');
  const editingPageIdRef = useRef(options.editingPageId);
  const draftTextRef = useRef(options.draftText);
  const draftDrawingsRef = useRef(options.draftDrawings);

  useEffect(() => { thumbnailsRef.current = options.thumbnails; }, [options.thumbnails]);
  useEffect(() => { rawFilesRef.current = options.rawFiles; }, [options.rawFiles]);
  useEffect(() => { editorZoomRef.current = options.editorZoom ?? 1; }, [options.editorZoom]);
  useEffect(() => { activeModeRef.current = options.activeMode ?? 'visual'; }, [options.activeMode]);
  useEffect(() => { editingPageIdRef.current = options.editingPageId; }, [options.editingPageId]);
  useEffect(() => { draftTextRef.current = options.draftText; }, [options.draftText]);
  useEffect(() => { draftDrawingsRef.current = options.draftDrawings; }, [options.draftDrawings]);

  // Check mount
  useEffect(() => {
    if (!enabled) return;
    const meta = loadMetaLocal();
    if (meta && meta.pageCount > 0) {
      const ageHours = (Date.now() - meta.timestamp) / (1000 * 60 * 60);
      if (ageHours < 24 * 7) { // 7 jours de rétention
        setHasRecoverableSession(true);
        setSessionMeta(meta);
      }
    }
  }, [projectId, enabled, loadMetaLocal]);

  const saveSession = useCallback(async (): Promise<void> => {
    if (!enabled) return;
    const currentThumbnails = thumbnailsRef.current;
    const currentFiles = rawFilesRef.current;
    if (currentThumbnails.length === 0 && currentFiles.length === 0) return;

    setIsSaving(true);
    try {
      const rawFilesBuffers: ArrayBuffer[] = await Promise.all(
        currentFiles.map(f => f.arrayBuffer())
      );
      const thumbnailsMeta: PageThumbnail[] = currentThumbnails.map(t => ({ ...t, url: '' }));

      await writeToIDB(projectId, {
        rawFilesBuffers,
        thumbnailsMeta,
        editorState: {
          zoom: editorZoomRef.current,
          activeMode: activeModeRef.current,
          editingPageId: editingPageIdRef.current,
        },
      });

      const meta: SessionMeta = {
        toolId: projectId,
        timestamp: Date.now(),
        fileNames: currentFiles.map(f => f.name),
        fileSizes: currentFiles.map(f => f.size),
        pageCount: currentThumbnails.length,
        modifiedPages: currentThumbnails.filter(
          t => (t.drawings && t.drawings.length > 0) || t.modifiedText || t.rotation
        ).length,
        editorState: {
          zoom: editorZoomRef.current,
          activeMode: activeModeRef.current,
          editingPageId: editingPageIdRef.current,
        },
      };
      
      saveMetaLocal(meta);
      localStorage.setItem(draftKey, JSON.stringify({ 
        text: draftTextRef.current, 
        drawings: draftDrawingsRef.current 
      }));
      
      setSessionMeta(meta);
      setLastSavedAt(new Date());
    } catch (e) {
      console.error('[SessionPersistence] Save failed:', e);
    } finally {
      setIsSaving(false);
    }
  }, [projectId, enabled, saveMetaLocal, draftKey]);

  const restoreSession = useCallback(async (): Promise<SessionSnapshot | null> => {
    if (!enabled) return null;
    try {
      const idbData = await readFromIDB(projectId);
      const meta = loadMetaLocal();
      if (!idbData || !meta) return null;

      const draftJson = localStorage.getItem(draftKey);
      const draft = draftJson ? JSON.parse(draftJson) : undefined;

      return {
        meta,
        thumbnailsMeta: idbData.thumbnailsMeta || [],
        rawFilesBuffers: idbData.rawFilesBuffers || [],
        draft
      };
    } catch (e) {
      console.error('[SessionPersistence] Restore failed:', e);
      return null;
    }
  }, [projectId, enabled, loadMetaLocal, draftKey]);

  const clearSession = useCallback(async (): Promise<void> => {
    clearMetaLocal();
    await deleteFromIDB(projectId);
    setHasRecoverableSession(false);
    setSessionMeta(null);
    setLastSavedAt(null);
  }, [projectId, clearMetaLocal]);

  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      if (thumbnailsRef.current.length > 0 || rawFilesRef.current.length > 0) {
        saveSession();
      }
    }, AUTO_SAVE_INTERVAL);
    return () => clearInterval(interval);
  }, [saveSession, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const handleBeforeUnload = () => {
      const currentThumbnails = thumbnailsRef.current;
      const currentFiles = rawFilesRef.current;
      if (currentThumbnails.length === 0 && currentFiles.length === 0) return;

      const meta: SessionMeta = {
        toolId: projectId,
        timestamp: Date.now(),
        fileNames: currentFiles.map(f => f.name),
        fileSizes: currentFiles.map(f => f.size),
        pageCount: currentThumbnails.length,
        modifiedPages: currentThumbnails.filter(
          t => (t.drawings && t.drawings.length > 0) || t.modifiedText || t.rotation
        ).length,
        editorState: {
          zoom: editorZoomRef.current,
          activeMode: activeModeRef.current,
          editingPageId: editingPageIdRef.current || null,
        },
      };
      saveMetaLocal(meta);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [projectId, enabled, saveMetaLocal]);

  return {
    saveSession,
    restoreSession,
    clearSession,
    hasRecoverableSession,
    sessionMeta,
    lastSavedAt,
    isSaving,
  };
}
