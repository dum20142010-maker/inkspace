import { jsPDF } from 'jspdf';
import { db } from '../db/database';
import { Notebook, NotebookPage } from '../types/notebook';
import { DrawingEngine } from './DrawingEngine';
import { PdfManager } from './pdfManager';

/**
 * High quality multi-page PDF exporter for SEEN notebooks.
 * Renders paper backgrounds, PDF annotations, strokes, shapes, images, and text.
 */
export async function exportNotebookToPDF(
  notebook: Notebook,
  pages: NotebookPage[],
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  if (!pages || pages.length === 0) return;

  const firstPage = pages[0];
  const isFirstLandscape = firstPage.orientation === 'landscape';

  const pdf = new jsPDF({
    orientation: isFirstLandscape ? 'landscape' : 'portrait',
    unit: 'pt',
    format: [firstPage.width, firstPage.height]
  });

  // Load PDF doc data if this notebook is an annotated PDF
  let pdfDocData: ArrayBuffer | null = null;
  if (notebook.pdfDocId) {
    const pdfRecord = await db.pdfDocs.get(notebook.pdfDocId);
    if (pdfRecord) {
      pdfDocData = pdfRecord.data;
    }
  }

  const dpr = 2; // High-res 2x render for crisp PDF output

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    if (onProgress) {
      onProgress(i + 1, pages.length);
    }

    if (i > 0) {
      const isLandscape = page.orientation === 'landscape';
      pdf.addPage([page.width, page.height], isLandscape ? 'landscape' : 'portrait');
    }

    // Query all objects on this page from database
    const [pageStrokes, pageShapes, pageTexts, pageImages] = await Promise.all([
      db.strokes.where('pageId').equals(page.id).toArray(),
      db.shapes.where('pageId').equals(page.id).toArray(),
      db.texts.where('pageId').equals(page.id).toArray(),
      db.images.where('pageId').equals(page.id).toArray()
    ]);

    // Render offscreen canvas
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(page.width * dpr);
    canvas.height = Math.floor(page.height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    ctx.scale(dpr, dpr);

    // If PDF background exists for this page
    let pdfPageCanvas: HTMLCanvasElement | null = null;
    if (notebook.pdfDocId && pdfDocData) {
      try {
        const renderRes = await PdfManager.renderPdfPageToCanvas(
          notebook.pdfDocId,
          pdfDocData,
          i + 1,
          dpr
        );
        pdfPageCanvas = renderRes.canvas;
      } catch (err) {
        console.warn(`Failed to render PDF page ${i + 1}`, err);
      }
    }

    // 1. Paper Background
    DrawingEngine.renderPageBackground(ctx, page, page.width, page.height, pdfPageCanvas);

    // 2. Images
    for (const img of pageImages) {
      await new Promise<void>(resolve => {
        const imageElement = new Image();
        imageElement.crossOrigin = 'anonymous';
        imageElement.onload = () => {
          ctx.drawImage(imageElement, img.x, img.y, img.width, img.height);
          resolve();
        };
        imageElement.onerror = () => resolve();
        imageElement.src = img.dataUrl;
      });
    }

    // 3. Highlighters First (behind handwriting)
    const pageHighlighters = pageStrokes.filter(s => s.tool === 'highlighter');
    const pageInks = pageStrokes.filter(s => s.tool !== 'highlighter');

    for (const stroke of pageHighlighters) {
      DrawingEngine.renderStroke(ctx, stroke);
    }

    // 4. Shapes
    for (const shape of pageShapes) {
      DrawingEngine.renderShape(ctx, shape);
    }

    // 5. Primary Handwritten Ink Strokes
    for (const stroke of pageInks) {
      DrawingEngine.renderStroke(ctx, stroke);
    }

    // 5. Text Objects
    for (const text of pageTexts) {
      if (!text.content) continue;
      ctx.save();
      ctx.font = `${text.isItalic ? 'italic ' : ''}${text.isBold ? 'bold ' : ''}${text.fontSize}px "${text.fontFamily || 'Plus Jakarta Sans'}", sans-serif`;
      ctx.fillStyle = text.color || '#0f172a';
      ctx.textBaseline = 'top';

      const lines = text.content.split('\n');
      const lineHeight = text.fontSize * 1.3;
      for (let l = 0; l < lines.length; l++) {
        ctx.fillText(lines[l], text.x, text.y + l * lineHeight);
      }
      ctx.restore();
    }

    // Convert canvas to image and add to PDF
    const pageImageData = canvas.toDataURL('image/jpeg', 0.92);
    pdf.addImage(pageImageData, 'JPEG', 0, 0, page.width, page.height, undefined, 'FAST');
  }

  const filename = `${(notebook.title || 'SEEN_Notebook').replace(/[\\/:*?"<>|]/g, '_')}.pdf`;
  pdf.save(filename);
}
