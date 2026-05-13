import { PDFDocument, rgb, StandardFonts, degrees, PDFPage } from 'pdf-lib';

export interface GeneratePDFOptions {
  pages: any[];
  rawFiles: File[];
  canvasDimensions: { width: number; height: number };
  brushSize: number;
  signatureData: string | null;
  watermark: string;
  onProgress?: (progress: number) => void;
}

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

export const generatePDF = async ({
  pages,
  rawFiles,
  canvasDimensions,
  brushSize,
  signatureData,
  watermark,
  onProgress
}: GeneratePDFOptions) => {
  if (rawFiles.length === 0 && pages.every((t: any) => !t.isBlank)) {
    throw new Error("Veuillez sélectionner un fichier PDF.");
  }

  if (pages.length === 0) {
    throw new Error("Le document doit contenir au moins une page.");
  }

  const newPdf = await PDFDocument.create();
  const sourcePdfsCache: { [key: number]: PDFDocument } = {};

  const helvetica = await newPdf.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await newPdf.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await newPdf.embedFont(StandardFonts.HelveticaOblique);
  const helveticaBoldOblique = await newPdf.embedFont(StandardFonts.HelveticaBoldOblique);

  for (let i = 0; i < pages.length; i++) {
    if (onProgress) onProgress(Math.round((i / pages.length) * 100));
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

        const strokeColor = hexToRgb(stroke.color);
        const cw = stroke.canvasWidth || canvasDimensions.width || 600;
        const ch = stroke.canvasHeight || canvasDimensions.height || 800;
        const scaleX = width / cw;
        const scaleY = height / ch;
        const thickness = (stroke.width || 2) * scaleX;

        if ((stroke.mode === 'rect' || stroke.mode === 'magic-eraser') && stroke.points.length >= 2) {
          const start = stroke.points[0];
          const end = stroke.points[1];
          const eraseInset = stroke.mode === 'magic-eraser' ? Math.max(6, brushSize * 0.8) : 0;
          copiedPage.drawRectangle({
            x: (Math.min(start.x, end.x) - eraseInset) * scaleX,
            y: height - ((Math.max(start.y, end.y) + eraseInset) * scaleY),
            width: (Math.abs(end.x - start.x) + eraseInset * 2) * scaleX || 1,
            height: (Math.abs(end.y - start.y) + eraseInset * 2) * scaleY || 1,
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
            const symMap: { [key: string]: string } = {
              'check': '✅', 'x': '❌', 'star': '⭐', 'heart': '❤️', 
              'approved': 'OK', 'sign': '✒️', 'confidential': '🔒', 'warning': '⚠️'
            };
            const symbol = symMap[stroke.text || 'check'] || (stroke.text || 'CHECK').toUpperCase();
            const isEmoji = ['✅', '❌', '⭐', '❤️', '⚠️', '✒️', '🔒'].includes(symbol);

            if (!isEmoji) {
              copiedPage.drawRectangle({
                x: Math.min(start.x, end.x) * scaleX,
                y: height - (Math.max(start.y, end.y) * scaleY),
                width: w, height: h, color: strokeColor,
              });
            }
            
            copiedPage.drawText(symbol, {
              x: (Math.min(start.x, end.x) * scaleX) + (w * (isEmoji ? 0.2 : 0.1)),
              y: height - (Math.max(start.y, end.y) * scaleY) + (h * 0.3),
              size: h * 0.5, 
              font: helveticaBold, 
              color: isEmoji ? undefined : rgb(1, 1, 1),
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
  return new Blob([pdfBytes as any], { type: 'application/pdf' });
};
