/**
 * useSessionPersistence — Sauvegarde et récupération intelligente de session PDF.
 *
 * Couche 1 (légère)  : localStorage → metadata d'état (tool actif, zoom, etc.)
 * Couche 2 (lourde)  : IndexedDB    → fichiers PDF binaires + thumbnails base64
 *
 * La session est sauvegardée :
 *  - Automatiquement toutes les AUTO_SAVE_INTERVAL ms
 *  - À chaque action significative (via saveSession())
 *  - En urgence au beforeunload (synchrone via localStorage)
 *
 * Elle est effacée automatiquement après un export réussi (clearSession()).
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { PageThumbnail } from '../types';

// ─── Constants ───────────────────────────────────────────────────────────────
const DB_NAME = 'pdfmaster_sessions';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';
const META_KEY = 'pdfmaster_session_meta';
const AUTO_SAVE_INTERVAL = 30_000; // 30 secondes
const MAX_FILE_SIZE_WARN = 50 * 1024 * 1024; // 50 Mo

// ─── Types ────────────────────────────────────────────────────────────────────
export interface SessionMeta {
  toolId: string;
  timestamp: number;
  fileNames: string[];
  fileSizes: number[];
  pageCount: number;
  modifiedPages: number;
  editorState?: {
    zoom: number;
    activeMode: string;
  };
}

export interface SessionSnapshot {
  meta: SessionMeta;
  rawFilesBuffers: ArrayBuffer[];
  thumbnailsMeta: PageThumbnail[];
  thumbnailUrls: string[];
}

export interface UseSessionPersistenceOptions {
  toolId: string;
  thumbnails: PageThumbnail[];
  rawFiles: File[];
  editorZoom?: number;
  activeMode?: string;
  enabled?: boolean;
}

export interface UseSessionPersistenceReturn {
  saveSession: () => Promise<void>;
  restoreSession: () => Promise<SessionSnapshot | null>;
  clearSession: () => Promise<void>;
  hasRecoverableSession: boolean;
  sessionMeta: SessionMeta | null;
  lastSavedAt: Date | null;
  isSaving: boolean;
}

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
      tx.onerror = () => { db.close(); resolve(); }; // Silently resolve
    });
  } catch (e) {
    console.warn('[SessionPersistence] IndexedDB delete failed:', e);
  }
}

// ─── Meta localStorage helpers ────────────────────────────────────────────────

function saveMeta(meta: SessionMeta): void {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch (e) {
    console.warn('[SessionPersistence] localStorage meta write failed:', e);
  }
}

function loadMeta(): SessionMeta | null {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearMeta(): void {
  try {
    localStorage.removeItem(META_KEY);
  } catch {/* noop */}
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSessionPersistence({
  toolId,
  thumbnails,
  rawFiles,
  editorZoom = 1,
  activeMode = 'visual',
  enabled = true,
}: UseSessionPersistenceOptions): UseSessionPersistenceReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [hasRecoverableSession, setHasRecoverableSession] = useState(false);
  const [sessionMeta, setSessionMeta] = useState<SessionMeta | null>(null);

  // Refs to always have latest values in callbacks
  const thumbnailsRef = useRef(thumbnails);
  const rawFilesRef = useRef(rawFiles);
  const editorZoomRef = useRef(editorZoom);
  const activeModeRef = useRef(activeMode);

  useEffect(() => { thumbnailsRef.current = thumbnails; }, [thumbnails]);
  useEffect(() => { rawFilesRef.current = rawFiles; }, [rawFiles]);
  useEffect(() => { editorZoomRef.current = editorZoom; }, [editorZoom]);
  useEffect(() => { activeModeRef.current = activeMode; }, [activeMode]);

  // ── Check for existing session on mount ──────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    const meta = loadMeta();
    if (meta && meta.toolId === toolId && meta.pageCount > 0) {
      // Only consider sessions less than 24 hours old
      const ageHours = (Date.now() - meta.timestamp) / (1000 * 60 * 60);
      if (ageHours < 24) {
        setHasRecoverableSession(true);
        setSessionMeta(meta);
      } else {
        // Session trop ancienne, on la nettoie
        clearMeta();
        deleteFromIDB(toolId);
      }
    }
  }, [toolId, enabled]);

  // ── Core save function ────────────────────────────────────────────────────
  const saveSession = useCallback(async (): Promise<void> => {
    if (!enabled) return;
    const currentThumbnails = thumbnailsRef.current;
    const currentFiles = rawFilesRef.current;

    // Ne pas sauvegarder si rien n'est chargé
    if (currentThumbnails.length === 0 && currentFiles.length === 0) return;

    setIsSaving(true);
    try {
      // Avertissement taille
      const totalSize = currentFiles.reduce((sum, f) => sum + f.size, 0);
      if (totalSize > MAX_FILE_SIZE_WARN) {
        console.warn('[SessionPersistence] Large files detected (>50MB), save may be slow.');
      }

      // 1. Sauvegarder les fichiers PDF en ArrayBuffer
      const rawFilesBuffers: ArrayBuffer[] = await Promise.all(
        currentFiles.map(f => f.arrayBuffer())
      );

      // 2. Extraire les URLs thumbnail et les metadata séparément
      const thumbnailUrls: string[] = currentThumbnails.map(t => t.url);
      const thumbnailsMeta: PageThumbnail[] = currentThumbnails.map(t => ({
        ...t,
        url: '', // On ne duplique pas l'URL dans les meta
      }));

      // 3. Écrire dans IndexedDB
      await writeToIDB(toolId, {
        rawFilesBuffers,
        thumbnailUrls,
        thumbnailsMeta,
        editorState: {
          zoom: editorZoomRef.current,
          activeMode: activeModeRef.current,
        },
      });

      // 4. Mettre à jour la meta légère dans localStorage
      const meta: SessionMeta = {
        toolId,
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
        },
      };
      saveMeta(meta);
      setSessionMeta(meta);

      const now = new Date();
      setLastSavedAt(now);
    } catch (e) {
      console.error('[SessionPersistence] Save failed:', e);
    } finally {
      setIsSaving(false);
    }
  }, [toolId, enabled]);

  // ── Restore function ──────────────────────────────────────────────────────
  const restoreSession = useCallback(async (): Promise<SessionSnapshot | null> => {
    if (!enabled) return null;
    try {
      const idbData = await readFromIDB(toolId);
      const meta = loadMeta();
      if (!idbData || !meta) return null;

      // Reconstruire les thumbnails avec leurs URLs
      const thumbnailsMeta: PageThumbnail[] = idbData.thumbnailsMeta || [];
      const thumbnailUrls: string[] = idbData.thumbnailUrls || [];
      const reconstructedThumbnails = thumbnailsMeta.map((t: PageThumbnail, idx: number) => ({
        ...t,
        url: thumbnailUrls[idx] || t.url || '',
      }));

      return {
        meta,
        rawFilesBuffers: idbData.rawFilesBuffers || [],
        thumbnailsMeta: reconstructedThumbnails,
        thumbnailUrls,
      };
    } catch (e) {
      console.error('[SessionPersistence] Restore failed:', e);
      return null;
    }
  }, [toolId, enabled]);

  // ── Clear function ────────────────────────────────────────────────────────
  const clearSession = useCallback(async (): Promise<void> => {
    clearMeta();
    await deleteFromIDB(toolId);
    setHasRecoverableSession(false);
    setSessionMeta(null);
    setLastSavedAt(null);
  }, [toolId]);

  // ── Auto-save interval ────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      const hasSomething =
        thumbnailsRef.current.length > 0 || rawFilesRef.current.length > 0;
      if (hasSomething) {
        saveSession();
      }
    }, AUTO_SAVE_INTERVAL);
    return () => clearInterval(interval);
  }, [saveSession, enabled]);

  // ── Emergency save on beforeunload ────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    const handleBeforeUnload = () => {
      // Sauvegarde synchrone de la meta uniquement (IndexedDB est async, déjà à jour)
      const currentThumbnails = thumbnailsRef.current;
      const currentFiles = rawFilesRef.current;
      if (currentThumbnails.length === 0 && currentFiles.length === 0) return;

      const meta: SessionMeta = {
        toolId,
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
        },
      };
      saveMeta(meta);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [toolId, enabled]);

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
