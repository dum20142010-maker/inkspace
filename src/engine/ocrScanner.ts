import { GoogleGenAI } from '@google/genai';
import { db } from '../db/database';
import { NotebookPage, Stroke, TextObject, PageOcrRecord, SearchResultItem } from '../types/notebook';

/**
 * Common handwritten vocabulary dictionary for heuristic matching
 */
const COMMON_NOTE_WORDS = [
  'seen', 'notes', 'note', 'todo', 'meeting', 'idea', 'ideas', 'math', 'physics',
  'summary', 'formula', 'page', 'test', 'draft', 'project', 'review', 'exam',
  'agenda', 'call', 'urgent', 'daily', 'weekly', 'plan', 'design', 'homework',
  'lecture', 'chapter', 'definition', 'proof', 'example', 'class', 'study',
  'code', 'dev', 'bug', 'fix', 'feature', 'client', 'work', 'home', 'budget',
  'finance', 'goal', 'habit', 'book', 'read', 'important', 'action', 'item',
  'deadline', 'done', 'check', 'key', 'concept', 'question', 'answer', 'intro'
];

/**
 * Render page strokes onto an offscreen canvas for vision OCR / thumbnail analysis.
 */
export function renderStrokesToCanvas(
  strokes: Stroke[],
  width: number,
  height: number,
  scale: number = 1.0
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(300, Math.round(width * scale));
  canvas.height = Math.max(300, Math.round(height * scale));

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // White high-contrast background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const stroke of strokes) {
    if (!stroke.points || stroke.points.length === 0) continue;

    ctx.strokeStyle = '#000000'; // High contrast black ink for OCR
    ctx.lineWidth = Math.max(2, stroke.width);

    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

    if (stroke.points.length === 1) {
      ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.width / 2, 0, Math.PI * 2);
      ctx.fillStyle = '#000000';
      ctx.fill();
    } else {
      for (let i = 1; i < stroke.points.length; i++) {
        const pt = stroke.points[i];
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    }
  }

  ctx.restore();
  return canvas;
}

/**
 * Geometric stroke feature analyzer for offline-first heuristic handwriting recognition
 */
interface StrokeCluster {
  strokes: Stroke[];
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

function analyzeStrokeClusters(strokes: Stroke[]): string {
  if (!strokes || strokes.length === 0) return '';

  // 1. Calculate bounding box for each stroke
  const strokeBoxes = strokes.map(s => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of s.points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const width = Math.max(1, maxX - minX);
    const height = Math.max(1, maxY - minY);
    return {
      stroke: s,
      minX,
      maxX,
      minY,
      maxY,
      width,
      height,
      centerX: minX + width / 2,
      centerY: minY + height / 2
    };
  }).filter(b => isFinite(b.minX) && isFinite(b.minY));

  if (strokeBoxes.length === 0) return '';

  // 2. Sort by Y-coordinate to segment into horizontal lines
  strokeBoxes.sort((a, b) => a.centerY - b.centerY);

  const lines: typeof strokeBoxes[] = [];
  let currentLine: typeof strokeBoxes = [];
  let currentLineY = strokeBoxes[0].centerY;

  for (const box of strokeBoxes) {
    // If center Y is within ~35px of current line, group into same line
    if (Math.abs(box.centerY - currentLineY) < 40) {
      currentLine.push(box);
      // update moving average Y
      currentLineY = currentLine.reduce((acc, b) => acc + b.centerY, 0) / currentLine.length;
    } else {
      if (currentLine.length > 0) {
        lines.push(currentLine);
      }
      currentLine = [box];
      currentLineY = box.centerY;
    }
  }
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  // 3. Process each line left to right to recognize word groups
  const recognizedLines: string[] = [];

  for (const line of lines) {
    line.sort((a, b) => a.minX - b.minX);

    // Group into words by horizontal gap (> 25px typically separates words)
    const words: typeof strokeBoxes[] = [];
    let currentWord: typeof strokeBoxes = [];
    let prevMaxX = -1;

    for (const box of line) {
      if (prevMaxX !== -1 && (box.minX - prevMaxX > 32)) {
        if (currentWord.length > 0) words.push(currentWord);
        currentWord = [box];
      } else {
        currentWord.push(box);
      }
      prevMaxX = Math.max(prevMaxX, box.maxX);
    }
    if (currentWord.length > 0) words.push(currentWord);

    const lineWords: string[] = [];

    for (const wordGroup of words) {
      const wordMinX = Math.min(...wordGroup.map(b => b.minX));
      const wordMaxX = Math.max(...wordGroup.map(b => b.maxX));
      const wordMinY = Math.min(...wordGroup.map(b => b.minY));
      const wordMaxY = Math.max(...wordGroup.map(b => b.maxY));
      const wordW = wordMaxX - wordMinX;
      const wordH = wordMaxY - wordMinY;
      const totalStrokes = wordGroup.length;

      // Character extraction heuristics
      const chars: string[] = [];
      for (const box of wordGroup) {
        const pts = box.stroke.points;
        if (pts.length < 2) {
          // Single point / dot
          chars.push('.');
          continue;
        }

        const startPt = pts[0];
        const endPt = pts[pts.length - 1];
        const startEndDist = Math.hypot(endPt.x - startPt.x, endPt.y - startPt.y);
        let pathLength = 0;
        for (let i = 1; i < pts.length; i++) {
          pathLength += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
        }

        const isClosedLoop = startEndDist < (box.width + box.height) * 0.25 && pathLength > 30;
        const aspectRatio = box.height / box.width;

        if (isClosedLoop) {
          if (aspectRatio > 0.8 && aspectRatio < 1.3) {
            chars.push('o');
          } else if (aspectRatio >= 1.3) {
            chars.push('0');
          } else {
            chars.push('e');
          }
        } else if (aspectRatio > 2.2 && box.width < 16) {
          // Tall vertical line: 'l', '1', 'I', '|'
          chars.push('l');
        } else if (aspectRatio < 0.35 && box.height < 15) {
          // Horizontal dash or underline
          chars.push('-');
        } else if (pts.length > 8) {
          // Check for curves (S, C, U, etc.)
          const midPt = pts[Math.floor(pts.length / 2)];
          if (midPt.x < box.minX + box.width * 0.3) {
            chars.push('c');
          } else if (midPt.y > box.minY + box.height * 0.7) {
            chars.push('u');
          } else if (aspectRatio > 1.0) {
            chars.push('s');
          } else {
            chars.push('n');
          }
        } else {
          chars.push('i');
        }
      }

      let detectedWord = chars.join('');

      // Lexicon matching against common notes vocabulary
      if (detectedWord.length >= 3) {
        for (const candidate of COMMON_NOTE_WORDS) {
          if (Math.abs(candidate.length - detectedWord.length) <= 1) {
            let commonChars = 0;
            for (const ch of detectedWord) {
              if (candidate.includes(ch)) commonChars++;
            }
            if (commonChars / candidate.length > 0.6) {
              detectedWord = candidate;
              break;
            }
          }
        }
      }

      if (detectedWord) {
        lineWords.push(detectedWord);
      }
    }

    if (lineWords.length > 0) {
      recognizedLines.push(lineWords.join(' '));
    }
  }

  return recognizedLines.join('\n');
}

/**
 * Scan a single notebook page's strokes and typed text with OCR.
 */
export async function scanPageStrokesOCR(
  page: NotebookPage,
  pageStrokes?: Stroke[],
  pageTexts?: TextObject[]
): Promise<PageOcrRecord> {
  const strokes = pageStrokes || (await db.strokes.where('pageId').equals(page.id).toArray());
  const texts = pageTexts || (await db.texts.where('pageId').equals(page.id).toArray());

  let recognizedText = '';
  let engineUsed: 'gemini' | 'heuristic' | 'manual' = 'heuristic';

  // 1. Try Gemini Vision OCR if GEMINI_API_KEY is available and strokes exist
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  const hasValidApiKey = apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.length > 10;

  if (hasValidApiKey && strokes.length > 0) {
    try {
      const canvas = renderStrokesToCanvas(strokes, page.width, page.height, 1.0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const base64Data = dataUrl.split(',')[1];

      if (base64Data) {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Data
              }
            },
            {
              text: 'You are a high precision handwriting OCR utility for a digital notebook. Read and transcribe all handwritten text, notes, equations, bullet points, numbers, and diagrams from this page accurately into plain text. Return ONLY the transcribed text, preserving line breaks. Do not add any conversational introductions, markdown bold wrappers, or comments.'
            }
          ]
        });

        if (response.text && response.text.trim()) {
          recognizedText = response.text.trim();
          engineUsed = 'gemini';
        }
      }
    } catch (err) {
      console.warn('Gemini OCR fallback to heuristic engine:', err);
    }
  }

  // 2. If Gemini wasn't used or returned empty, run smart heuristic stroke recognition
  if (!recognizedText && strokes.length > 0) {
    recognizedText = analyzeStrokeClusters(strokes);
    engineUsed = 'heuristic';
  }

  // 3. Merge any typed text boxes on the page into the searchable transcript
  if (texts && texts.length > 0) {
    const typedTextContent = texts
      .map(t => t.content.trim())
      .filter(Boolean)
      .join('\n');
    if (typedTextContent) {
      recognizedText = recognizedText
        ? `${recognizedText}\n\n[Typed Notes]\n${typedTextContent}`
        : typedTextContent;
    }
  }

  const ocrRecord: PageOcrRecord = {
    id: page.id,
    pageId: page.id,
    notebookId: page.notebookId,
    pageIndex: page.pageIndex,
    recognizedText: recognizedText.trim(),
    strokeCount: strokes.length,
    status: 'completed',
    scannedAt: Date.now(),
    engineUsed
  };

  await db.ocrRecords.put(ocrRecord);
  return ocrRecord;
}

/**
 * Scan all pages in a notebook with OCR.
 */
export async function scanNotebookOCR(
  notebookId: string,
  onProgress?: (current: number, total: number) => void
): Promise<PageOcrRecord[]> {
  const pages = await db.pages.where('notebookId').equals(notebookId).sortBy('pageIndex');
  const results: PageOcrRecord[] = [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    if (onProgress) {
      onProgress(i + 1, pages.length);
    }
    const record = await scanPageStrokesOCR(page);
    results.push(record);
  }

  return results;
}

/**
 * Get cached OCR record for a page.
 */
export async function getPageOcrRecord(pageId: string): Promise<PageOcrRecord | undefined> {
  return await db.ocrRecords.get(pageId);
}

/**
 * Update OCR transcript manually (e.g. user corrections or keyword tagging).
 */
export async function updatePageOcrTranscript(pageId: string, newTranscript: string): Promise<void> {
  const existing = await db.ocrRecords.get(pageId);
  if (existing) {
    await db.ocrRecords.put({
      ...existing,
      recognizedText: newTranscript.trim(),
      engineUsed: 'manual',
      scannedAt: Date.now()
    });
  } else {
    const page = await db.pages.get(pageId);
    if (page) {
      await db.ocrRecords.put({
        id: pageId,
        pageId,
        notebookId: page.notebookId,
        pageIndex: page.pageIndex,
        recognizedText: newTranscript.trim(),
        strokeCount: 0,
        status: 'completed',
        scannedAt: Date.now(),
        engineUsed: 'manual'
      });
    }
  }
}

/**
 * Search through handwritten notebooks by querying:
 * 1. Notebook Titles
 * 2. OCR Scanned Handwriting Records
 * 3. Typed Text Boxes
 */
export async function searchHandwrittenNotebooks(
  query: string,
  filterNotebookId?: string
): Promise<SearchResultItem[]> {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return [];

  const results: SearchResultItem[] = [];
  const notebooks = await db.notebooks.toArray();
  const notebookMap = new Map(notebooks.map(n => [n.id, n]));

  // 1. Search Notebook Titles
  for (const nb of notebooks) {
    if (nb.isDeleted) continue;
    if (filterNotebookId && nb.id !== filterNotebookId) continue;

    if (nb.title.toLowerCase().includes(cleanQuery)) {
      results.push({
        notebookId: nb.id,
        notebookTitle: nb.title,
        coverColor: nb.coverColor,
        matchType: 'title',
        snippet: nb.title,
        matchScore: 100
      });
    }
  }

  // 2. Search OCR Records across all pages
  const ocrRecords = await db.ocrRecords.toArray();
  for (const rec of ocrRecords) {
    if (!rec.recognizedText) continue;
    if (filterNotebookId && rec.notebookId !== filterNotebookId) continue;

    const nb = notebookMap.get(rec.notebookId);
    if (!nb || nb.isDeleted) continue;

    const lowerText = rec.recognizedText.toLowerCase();
    const matchIdx = lowerText.indexOf(cleanQuery);

    if (matchIdx !== -1) {
      // Extract snippet around the matched term
      const start = Math.max(0, matchIdx - 35);
      const end = Math.min(rec.recognizedText.length, matchIdx + cleanQuery.length + 45);
      const prefix = start > 0 ? '…' : '';
      const suffix = end < rec.recognizedText.length ? '…' : '';
      const rawSnippet = prefix + rec.recognizedText.slice(start, end).trim() + suffix;

      results.push({
        notebookId: rec.notebookId,
        notebookTitle: nb.title,
        coverColor: nb.coverColor,
        pageId: rec.pageId,
        pageIndex: rec.pageIndex,
        matchType: 'handwriting_ocr',
        snippet: rawSnippet,
        matchScore: 85
      });
    }
  }

  // 3. Search Typed Text Objects
  const texts = await db.texts.toArray();
  const pages = await db.pages.toArray();
  const pageMap = new Map(pages.map(p => [p.id, p]));

  for (const t of texts) {
    if (!t.content) continue;
    const page = pageMap.get(t.pageId);
    if (!page) continue;
    if (filterNotebookId && page.notebookId !== filterNotebookId) continue;

    const nb = notebookMap.get(page.notebookId);
    if (!nb || nb.isDeleted) continue;

    const lowerContent = t.content.toLowerCase();
    const matchIdx = lowerContent.indexOf(cleanQuery);

    if (matchIdx !== -1) {
      // Don't duplicate if already matched by OCR
      const alreadyMatched = results.some(
        r => r.notebookId === page.notebookId && r.pageId === t.pageId && r.matchType === 'handwriting_ocr'
      );
      if (!alreadyMatched) {
        const start = Math.max(0, matchIdx - 30);
        const end = Math.min(t.content.length, matchIdx + cleanQuery.length + 40);
        const prefix = start > 0 ? '…' : '';
        const suffix = end < t.content.length ? '…' : '';
        const rawSnippet = prefix + t.content.slice(start, end).trim() + suffix;

        results.push({
          notebookId: page.notebookId,
          notebookTitle: nb.title,
          coverColor: nb.coverColor,
          pageId: t.pageId,
          pageIndex: page.pageIndex,
          matchType: 'text_box',
          snippet: rawSnippet,
          matchScore: 80
        });
      }
    }
  }

  // Sort results by matchScore descending
  results.sort((a, b) => b.matchScore - a.matchScore);
  return results;
}
