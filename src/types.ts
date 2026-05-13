export interface DrawingStroke {
  points: { x: number; y: number }[];
  color: string;
  width: number;
  mode: 'pen' | 'eraser' | 'magic-eraser' | 'highlighter' | 'rect' | 'circle' | 'arrow' | 'stamp' | 'text' | 'move';
  text?: string;
  fontSize?: number;
  isBold?: boolean;
  isItalic?: boolean;
  isHighlighted?: boolean;
  canvasWidth?: number;
  canvasHeight?: number;
}

export interface PageThumbnail {
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

/** Snapshot complet d'une session de travail sauvegardée */
export interface SessionSnapshot {
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

