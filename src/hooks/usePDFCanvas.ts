import { useState, useCallback } from 'react';

import { DrawingStroke } from '../types';

export function usePDFCanvas() {
  const [currentDrawings, setCurrentDrawings] = useState<DrawingStroke[]>([]);
  const [redoStack, setRedoStack] = useState<DrawingStroke[][]>([]);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [visualTool, setVisualTool] = useState<'pen' | 'eraser' | 'magic-eraser' | 'highlighter' | 'rect' | 'circle' | 'arrow' | 'stamp' | 'text' | 'move' | 'image'>('move');
  const [brushSize, setBrushSize] = useState(5);
  const [tempColor, setTempColor] = useState("#1a1a1a");
  const [tempIsBold, setTempIsBold] = useState(false);
  const [tempIsItalic, setTempIsItalic] = useState(false);
  const [stampType, setStampType] = useState<any>('check');
  
  const [textInput, setTextInput] = useState<any>(null);
  
  const [draggingStrokeIdx, setDraggingStrokeIdx] = useState<number | null>(null);
  const [selectedElementIdx, setSelectedElementIdx] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number, y: number } | null>(null);

  const undo = useCallback(() => {
    setCurrentDrawings(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setRedoStack(rs => [...rs, [last]]);
      return prev.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setRedoStack(prev => {
      if (prev.length === 0) return prev;
      const strokesToRestore = prev[prev.length - 1];
      setCurrentDrawings(cd => [...cd, ...strokesToRestore]);
      return prev.slice(0, -1);
    });
  }, []);

  const clearDrawings = useCallback(() => {
    if (window.confirm("Voulez-vous vraiment supprimer tous les dessins de cette page ?")) {
      setCurrentDrawings([]);
    }
  }, []);

  return {
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
  };
}
