import {
  Stroke,
  ShapeObject,
  TextObject,
  ImageObject,
  NotebookPage,
  Point,
  ToolType,
  EraserType,
  SelectionState
} from '../types/notebook';

/**
 * High Performance Drawing Engine with Canvas rendering, stroke smoothing,
 * pressure calculation, eraser collision, and selection bounds math.
 */
export class DrawingEngine {
  /**
   * Render paper background grid/ruled lines/dots/cornell on target context.
   */
  static renderPageBackground(
    ctx: CanvasRenderingContext2D,
    page: NotebookPage,
    width: number,
    height: number,
    pdfBgCanvas?: HTMLCanvasElement | null
  ) {
    ctx.save();
    
    // Fill paper background color
    ctx.fillStyle = page.background.color || '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // If PDF page background image exists
    if (pdfBgCanvas) {
      ctx.drawImage(pdfBgCanvas, 0, 0, width, height);
      ctx.restore();
      return;
    }

    const paperType = page.background.type;
    const lineColor = page.background.lineColor || (page.background.color === '#1e293b' ? '#334155' : '#cbd5e1');
    const gridSize = page.background.gridSize || 28;

    ctx.strokeStyle = lineColor;
    ctx.fillStyle = lineColor;
    ctx.lineWidth = 1;

    if (paperType === 'ruled' || paperType === 'lined') {
      const startY = 80;
      for (let y = startY; y < height - 40; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(width - 40, y);
        ctx.stroke();
      }
      // Red margin line for ruled paper
      if (paperType === 'ruled') {
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(80, 0);
        ctx.lineTo(80, height);
        ctx.stroke();
      }
    } else if (paperType === 'graph') {
      for (let x = 30; x < width - 20; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 30);
        ctx.lineTo(x, height - 30);
        ctx.stroke();
      }
      for (let y = 30; y < height - 20; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(30, y);
        ctx.lineTo(width - 30, y);
        ctx.stroke();
      }
    } else if (paperType === 'dotted') {
      const radius = 1.5;
      for (let x = 36; x < width - 20; x += gridSize) {
        for (let y = 36; y < height - 20; y += gridSize) {
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (paperType === 'cornell') {
      // Top header
      ctx.beginPath();
      ctx.moveTo(0, 100);
      ctx.lineTo(width, 100);
      ctx.stroke();

      // Left Cue Column
      const cueX = Math.floor(width * 0.3);
      ctx.beginPath();
      ctx.moveTo(cueX, 100);
      ctx.lineTo(cueX, height - 120);
      ctx.stroke();

      // Bottom Summary Area
      ctx.beginPath();
      ctx.moveTo(0, height - 120);
      ctx.lineTo(width, height - 120);
      ctx.stroke();

      // Lined rows in note area
      for (let y = 130; y < height - 130; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(cueX + 10, y);
        ctx.lineTo(width - 20, y);
        ctx.stroke();
      }
    } else if (paperType === 'checklist') {
      for (let y = 80; y < height - 40; y += gridSize * 1.5) {
        // Checkbox square
        ctx.strokeRect(40, y - 14, 18, 18);
        ctx.beginPath();
        ctx.moveTo(70, y);
        ctx.lineTo(width - 40, y);
        ctx.stroke();
      }
    } else if (paperType === 'music') {
      const staffGap = 8;
      const systemGap = 48;
      for (let systemY = 80; systemY < height - 100; systemY += staffGap * 4 + systemGap) {
        for (let line = 0; line < 5; line++) {
          const y = systemY + line * staffGap;
          ctx.beginPath();
          ctx.moveTo(40, y);
          ctx.lineTo(width - 40, y);
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  }

  /**
   * Exponential Weighted Moving Average (EWMA) point-smoothing algorithm
   * to suppress high-frequency stylus jitter and create natural ink curves.
   */
  static smoothStrokePoints(rawPoints: Point[], smoothingWeight = 0.3): Point[] {
    if (!rawPoints || rawPoints.length <= 2) return rawPoints;

    const smoothed: Point[] = [rawPoints[0]];
    for (let i = 1; i < rawPoints.length - 1; i++) {
      const prev = smoothed[i - 1];
      const curr = rawPoints[i];
      const next = rawPoints[i + 1];

      // Low-pass filter / weighted average with adjacent points to suppress stylus jitter
      const smoothedX = curr.x * (1 - smoothingWeight) + ((prev.x + next.x) / 2) * smoothingWeight;
      const smoothedY = curr.y * (1 - smoothingWeight) + ((prev.y + next.y) / 2) * smoothingWeight;
      const smoothedPressure =
        curr.pressure !== undefined
          ? curr.pressure * (1 - smoothingWeight) + (((prev.pressure || 0.5) + (next.pressure || 0.5)) / 2) * smoothingWeight
          : curr.pressure;

      smoothed.push({
        ...curr,
        x: smoothedX,
        y: smoothedY,
        pressure: smoothedPressure
      });
    }
    smoothed.push(rawPoints[rawPoints.length - 1]);
    return smoothed;
  }

  /**
   * Render a complete stroke with smooth Catmull-Rom / Quadratic Bézier spline curves and pressure interpolation.
   */
  static renderStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
    if (!stroke.points || stroke.points.length === 0) return;

    ctx.save();
    ctx.globalAlpha = stroke.opacity ?? 1;

    // Apply Ink-Smoothing Filter
    const points = DrawingEngine.smoothStrokePoints(stroke.points);

    if (stroke.tool === 'highlighter') {
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = typeof stroke.opacity === 'number' ? stroke.opacity : 0.45;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const p1 = points[i - 1];
        const p2 = points[i];
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
      }
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (stroke.tool === 'pencil') {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.globalAlpha = (stroke.opacity || 0.7) * 0.85;

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const p1 = points[i - 1];
        const p2 = points[i];
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
      }
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Fountain, Ballpoint, Marker, Brush stroke rendering with Catmull-Rom spline curves & pressure modulation
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;

    if (points.length === 1) {
      const p = points[0];
      const r = (stroke.width * (p.pressure || 0.5)) / 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(r, 1), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    if (points.length === 2) {
      const p1 = points[0];
      const p2 = points[1];
      ctx.lineWidth = stroke.width;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Catmull-Rom Spline Curve Interpolation
    for (let i = 1; i < points.length; i++) {
      const p0 = points[Math.max(0, i - 2)];
      const p1 = points[i - 1];
      const p2 = points[i];
      const p3 = points[Math.min(points.length - 1, i + 1)];

      // Calculate Catmull-Rom control points
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      // Modulate segment width based on point pressure
      let segmentWidth = stroke.width;
      if (stroke.tool === 'fountain' || stroke.tool === 'brush' || stroke.tool === 'ballpoint') {
        const p = p2.pressure !== undefined && p2.pressure > 0 ? p2.pressure : 0.5;
        segmentWidth = Math.max(1, stroke.width * (0.3 + p * 1.4));
      }

      ctx.lineWidth = segmentWidth;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Render a Shape Object (Rectangle, Circle, Line, Star, etc.)
   */
  static renderShape(ctx: CanvasRenderingContext2D, shape: ShapeObject) {
    ctx.save();
    ctx.globalAlpha = shape.opacity ?? 1;
    ctx.strokeStyle = shape.strokeColor;
    ctx.fillStyle = shape.fillColor;
    ctx.lineWidth = shape.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const { x, y, width, height, type } = shape;

    ctx.beginPath();
    if (type === 'line') {
      ctx.moveTo(x, y);
      ctx.lineTo(x + width, y + height);
    } else if (type === 'rectangle') {
      ctx.rect(x, y, width, height);
    } else if (type === 'circle' || type === 'ellipse') {
      const rx = Math.abs(width) / 2;
      const ry = Math.abs(height) / 2;
      const cx = x + rx;
      const cy = y + ry;
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    } else if (type === 'triangle') {
      ctx.moveTo(x + width / 2, y);
      ctx.lineTo(x + width, y + height);
      ctx.lineTo(x, y + height);
      ctx.closePath();
    } else if (type === 'arrow') {
      // Main arrow shaft
      ctx.moveTo(x, y + height / 2);
      ctx.lineTo(x + width, y + height / 2);
      // Arrow head
      const headLen = Math.min(24, Math.abs(width) * 0.3);
      ctx.moveTo(x + width - headLen, y + height / 2 - headLen / 2);
      ctx.lineTo(x + width, y + height / 2);
      ctx.lineTo(x + width - headLen, y + height / 2 + headLen / 2);
    }

    if (shape.fillColor && shape.fillColor !== 'transparent') {
      ctx.fill();
    }
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Check collision between eraser point and a stroke for Stroke Eraser mode.
   */
  static isStrokeIntersectingCircle(stroke: Stroke, circleX: number, circleY: number, radius: number): boolean {
    if (!stroke.points || stroke.points.length === 0) return false;
    const r2 = (radius + stroke.width / 2) ** 2;

    for (const p of stroke.points) {
      const dist2 = (p.x - circleX) ** 2 + (p.y - circleY) ** 2;
      if (dist2 <= r2) return true;
    }
    return false;
  }

  /**
   * Precision Spot Eraser:
   * Removes only the specific points under the eraser radius, splitting the stroke
   * into remaining surviving sub-segments instead of deleting the whole line.
   */
  static eraseStrokesAtSpot(
    strokes: Stroke[],
    circleX: number,
    circleY: number,
    radius: number
  ): { updatedStrokes: Stroke[]; didChange: boolean } {
    let didChange = false;
    const newStrokesList: Stroke[] = [];
    const effRadius = Math.max(4, radius);
    const effR2 = effRadius * effRadius;

    for (const stroke of strokes) {
      if (!stroke.points || stroke.points.length === 0) continue;

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of stroke.points) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }

      const pad = effRadius + (stroke.width || 2) / 2;
      if (
        circleX + pad < minX ||
        circleX - pad > maxX ||
        circleY + pad < minY ||
        circleY - pad > maxY
      ) {
        newStrokesList.push(stroke);
        continue;
      }

      // Check if any point falls within the spot eraser circle
      let hasHit = false;
      for (const p of stroke.points) {
        const dx = p.x - circleX;
        const dy = p.y - circleY;
        if (dx * dx + dy * dy <= effR2) {
          hasHit = true;
          break;
        }
      }

      if (!hasHit) {
        newStrokesList.push(stroke);
        continue;
      }

      didChange = true;

      // Split the stroke into surviving sub-segments
      const segments: Point[][] = [];
      let currentSegment: Point[] = [];

      for (const p of stroke.points) {
        const dx = p.x - circleX;
        const dy = p.y - circleY;
        const inside = dx * dx + dy * dy <= effR2;

        if (!inside) {
          currentSegment.push(p);
        } else {
          if (currentSegment.length > 0) {
            segments.push(currentSegment);
            currentSegment = [];
          }
        }
      }

      if (currentSegment.length > 0) {
        segments.push(currentSegment);
      }

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        if (seg.length > 0) {
          newStrokesList.push({
            ...stroke,
            id: i === 0 ? stroke.id : `${stroke.id}_cut_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
            points: seg
          });
        }
      }
    }

    return { updatedStrokes: newStrokesList, didChange };
  }

  /**
   * Check if point is inside bounding box for lasso selection.
   */
  static isPointInBox(x: number, y: number, box: { x: number; y: number; width: number; height: number }): boolean {
    return (
      x >= box.x &&
      x <= box.x + box.width &&
      y >= box.y &&
      y <= box.y + box.height
    );
  }

  /**
   * Ray-casting algorithm to test if a point is inside a closed or freehand lasso polygon.
   */
  static isPointInPolygon(x: number, y: number, polygon: Point[]): boolean {
    if (!polygon || polygon.length < 3) return false;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  /**
   * Check if stroke is selected by freehand lasso polygon path.
   */
  static isStrokeInLassoPolygon(stroke: Stroke, polygon: Point[]): boolean {
    if (!stroke.points || stroke.points.length === 0) return false;
    if (polygon.length < 3) {
      // Fallback to bounding box check
      const minX = Math.min(...polygon.map(p => p.x));
      const maxX = Math.max(...polygon.map(p => p.x));
      const minY = Math.min(...polygon.map(p => p.y));
      const maxY = Math.max(...polygon.map(p => p.y));
      const box = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
      return stroke.points.some(p => DrawingEngine.isPointInBox(p.x, p.y, box));
    }

    // Check if any point in stroke is inside polygon
    return stroke.points.some(p => DrawingEngine.isPointInPolygon(p.x, p.y, polygon));
  }

  /**
   * Bulk Transform (move and scale) selected items.
   */
  static transformSelection(
    strokes: Stroke[],
    shapes: ShapeObject[],
    texts: TextObject[],
    images: ImageObject[],
    selection: SelectionState,
    dx: number,
    dy: number,
    scaleX: number = 1,
    scaleY: number = 1,
    pivotX: number = 0,
    pivotY: number = 0
  ) {
    const nextStrokes = strokes.map(s => {
      if (!selection.strokeIds.includes(s.id)) return s;
      return {
        ...s,
        points: s.points.map(p => {
          const shiftedX = p.x + dx;
          const shiftedY = p.y + dy;
          if (scaleX === 1 && scaleY === 1) {
            return { ...p, x: shiftedX, y: shiftedY };
          }
          return {
            ...p,
            x: pivotX + (shiftedX - pivotX) * scaleX,
            y: pivotY + (shiftedY - pivotY) * scaleY
          };
        })
      };
    });

    const nextShapes = shapes.map(sh => {
      if (!selection.shapeIds.includes(sh.id)) return sh;
      const shiftedX = sh.x + dx;
      const shiftedY = sh.y + dy;
      const newX = pivotX + (shiftedX - pivotX) * scaleX;
      const newY = pivotY + (shiftedY - pivotY) * scaleY;
      return {
        ...sh,
        x: newX,
        y: newY,
        width: Math.max(10, sh.width * scaleX),
        height: Math.max(10, sh.height * scaleY)
      };
    });

    const nextTexts = texts.map(t => {
      if (!selection.textIds.includes(t.id)) return t;
      const shiftedX = t.x + dx;
      const shiftedY = t.y + dy;
      const newX = pivotX + (shiftedX - pivotX) * scaleX;
      const newY = pivotY + (shiftedY - pivotY) * scaleY;
      return {
        ...t,
        x: newX,
        y: newY,
        width: Math.max(20, t.width * scaleX),
        height: Math.max(20, t.height * scaleY)
      };
    });

    const nextImages = images.map(img => {
      if (!selection.imageIds.includes(img.id)) return img;
      const shiftedX = img.x + dx;
      const shiftedY = img.y + dy;
      const newX = pivotX + (shiftedX - pivotX) * scaleX;
      const newY = pivotY + (shiftedY - pivotY) * scaleY;
      return {
        ...img,
        x: newX,
        y: newY,
        width: Math.max(20, img.width * scaleX),
        height: Math.max(20, img.height * scaleY)
      };
    });

    return { nextStrokes, nextShapes, nextTexts, nextImages };
  }

  /**
   * Bulk Duplicate selected elements.
   */
  static duplicateSelection(
    strokes: Stroke[],
    shapes: ShapeObject[],
    texts: TextObject[],
    images: ImageObject[],
    selection: SelectionState,
    offsetX = 30,
    offsetY = 30
  ) {
    const now = Date.now();
    const newStrokeIds: string[] = [];
    const newShapeIds: string[] = [];
    const newTextIds: string[] = [];
    const newImageIds: string[] = [];

    const duplicatedStrokes: Stroke[] = [];
    for (const s of strokes) {
      if (selection.strokeIds.includes(s.id)) {
        const id = `stroke_${now}_${Math.random().toString(36).substring(2, 6)}`;
        newStrokeIds.push(id);
        duplicatedStrokes.push({
          ...s,
          id,
          points: s.points.map(p => ({ ...p, x: p.x + offsetX, y: p.y + offsetY })),
          timestamp: now
        });
      }
    }

    const duplicatedShapes: ShapeObject[] = [];
    for (const sh of shapes) {
      if (selection.shapeIds.includes(sh.id)) {
        const id = `shape_${now}_${Math.random().toString(36).substring(2, 6)}`;
        newShapeIds.push(id);
        duplicatedShapes.push({
          ...sh,
          id,
          x: sh.x + offsetX,
          y: sh.y + offsetY,
          createdAt: now
        });
      }
    }

    const duplicatedTexts: TextObject[] = [];
    for (const t of texts) {
      if (selection.textIds.includes(t.id)) {
        const id = `text_${now}_${Math.random().toString(36).substring(2, 6)}`;
        newTextIds.push(id);
        duplicatedTexts.push({
          ...t,
          id,
          x: t.x + offsetX,
          y: t.y + offsetY,
          createdAt: now
        });
      }
    }

    const duplicatedImages: ImageObject[] = [];
    for (const img of images) {
      if (selection.imageIds.includes(img.id)) {
        const id = `img_${now}_${Math.random().toString(36).substring(2, 6)}`;
        newImageIds.push(id);
        duplicatedImages.push({
          ...img,
          id,
          x: img.x + offsetX,
          y: img.y + offsetY,
          createdAt: now
        });
      }
    }

    const nextStrokes = [...strokes, ...duplicatedStrokes];
    const nextShapes = [...shapes, ...duplicatedShapes];
    const nextTexts = [...texts, ...duplicatedTexts];
    const nextImages = [...images, ...duplicatedImages];

    const newSelection: SelectionState = {
      strokeIds: newStrokeIds,
      shapeIds: newShapeIds,
      textIds: newTextIds,
      imageIds: newImageIds,
      bounds: null
    };

    newSelection.bounds = DrawingEngine.calculateSelectionBounds(
      nextStrokes,
      nextShapes,
      nextTexts,
      nextImages,
      newSelection
    );

    return { nextStrokes, nextShapes, nextTexts, nextImages, newSelection };
  }

  /**
   * Calculate selection bounds for a given group of strokes, shapes, texts, images.
   */
  static calculateSelectionBounds(
    strokes: Stroke[],
    shapes: ShapeObject[],
    texts: TextObject[],
    images: ImageObject[],
    selection: SelectionState
  ): { x: number; y: number; width: number; height: number } | null {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    let hasItem = false;

    // Check strokes
    for (const s of strokes) {
      if (selection.strokeIds.includes(s.id)) {
        for (const p of s.points) {
          minX = Math.min(minX, p.x - s.width / 2);
          minY = Math.min(minY, p.y - s.width / 2);
          maxX = Math.max(maxX, p.x + s.width / 2);
          maxY = Math.max(maxY, p.y + s.width / 2);
          hasItem = true;
        }
      }
    }

    // Check shapes
    for (const sh of shapes) {
      if (selection.shapeIds.includes(sh.id)) {
        minX = Math.min(minX, sh.x);
        minY = Math.min(minY, sh.y);
        maxX = Math.max(maxX, sh.x + sh.width);
        maxY = Math.max(maxY, sh.y + sh.height);
        hasItem = true;
      }
    }

    // Check texts
    for (const t of texts) {
      if (selection.textIds.includes(t.id)) {
        minX = Math.min(minX, t.x);
        minY = Math.min(minY, t.y);
        maxX = Math.max(maxX, t.x + t.width);
        maxY = Math.max(maxY, t.y + t.height);
        hasItem = true;
      }
    }

    // Check images
    for (const img of images) {
      if (selection.imageIds.includes(img.id)) {
        minX = Math.min(minX, img.x);
        minY = Math.min(minY, img.y);
        maxX = Math.max(maxX, img.x + img.width);
        maxY = Math.max(maxY, img.y + img.height);
        hasItem = true;
      }
    }

    if (!hasItem) return null;

    const padding = 12;
    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2
    };
  }
}
