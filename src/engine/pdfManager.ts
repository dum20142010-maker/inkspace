import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
if (typeof window !== 'undefined' && pdfjsLib) {
  // Use official CDN worker fallback to ensure robust worker execution across all environments
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

export interface PdfPageRenderResult {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

export class PdfManager {
  private static pdfDocsCache = new Map<string, pdfjsLib.PDFDocumentProxy>();

  /**
   * Load a PDF from ArrayBuffer and cache proxy instance
   */
  static async loadPdfDocument(pdfId: string, data: ArrayBuffer): Promise<pdfjsLib.PDFDocumentProxy> {
    if (this.pdfDocsCache.has(pdfId)) {
      return this.pdfDocsCache.get(pdfId)!;
    }

    const loadingTask = pdfjsLib.getDocument({ data });
    const pdfDoc = await loadingTask.promise;
    this.pdfDocsCache.set(pdfId, pdfDoc);
    return pdfDoc;
  }

  /**
   * Render a specific page of a PDF document to an offscreen HTML Canvas
   */
  static async renderPdfPageToCanvas(
    pdfId: string,
    pdfData: ArrayBuffer,
    pageNumber: number,
    scale: number = 1.5
  ): Promise<PdfPageRenderResult> {
    const pdfDoc = await this.loadPdfDocument(pdfId, pdfData);
    const pdfPage = await pdfDoc.getPage(pageNumber);

    const viewport = pdfPage.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport
    };

    await pdfPage.render(renderContext as any).promise;

    return {
      canvas,
      width: viewport.width,
      height: viewport.height
    };
  }

  /**
   * Clear PDF cache for memory efficiency
   */
  static clearCache(pdfId?: string) {
    if (pdfId) {
      this.pdfDocsCache.delete(pdfId);
    } else {
      this.pdfDocsCache.clear();
    }
  }
}
