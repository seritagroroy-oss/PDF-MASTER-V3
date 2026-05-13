import { PageThumbnail, DrawingStroke } from './types';

// ─── Project & Session Types ──────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  updatedAt: number;
  pageCount: number;
  thumbnailUrl?: string; 
}

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
    editingPageId: string | null;
  };
}

export interface SessionSnapshot {
  meta: SessionMeta;
  thumbnailsMeta: PageThumbnail[];
  rawFilesBuffers: ArrayBuffer[];
  draft?: {
    text: string;
    drawings: DrawingStroke[];
  };
}

export interface UseSessionPersistenceOptions {
  toolId: string;
  thumbnails: PageThumbnail[];
  rawFiles: File[];
  editorZoom?: number;
  activeMode?: string;
  editingPageId?: string | null;
  draftText?: string;
  draftDrawings?: DrawingStroke[];
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
