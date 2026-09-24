import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  NotebookPage,
  Stroke,
  ShapeObject,
  TextObject,
  ImageObject,
  Point,
  ToolSettings,
  SelectionState
} from '../../types/notebook';
import { DrawingEngine } from '../../engine/DrawingEngine';
import { recognizeHandDrawnShape } from '../../engine/ShapeRecognizer';
import { StylusPressureHUD } from './StylusPressureHUD';
import { Hand, RotateCcw, RotateCw, ArrowLeftRight, X, Sparkles } from 'lucide-react';

interface CanvasWorkspaceProps {
  page: NotebookPage;
  strokes: Stroke[];
  shapes: ShapeObject[];
  texts: TextObject[];
  images: ImageObject[];
  settings: ToolSettings;
  pdfBgCanvas?: HTMLCanvasElement | null;
  zoomScale: number;
  selection: SelectionState;
  currentPageIndex?: number;
  totalPages?: number;
  onAddStroke: (stroke: Stroke) => void;
  onUpdateStrokes: (strokes: Stroke[]) => void;
  onRecordHistory: () => void;
  onAddShape: (shape: ShapeObject) => void;
  onAddText: (text: TextObject) => void;
  onEraseStrokes: (strokeIds: string[]) => void;
  onUpdateSelection: (selection: SelectionState) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onNextPage?: () => void;
  onPrevPage?: () => void;
}

export const CanvasWorkspace: React.FC<CanvasWorkspaceProps> = ({
  page,
  strokes,
  shapes,
  texts,
  images,
  settings,
  pdfBgCanvas,
  zoomScale,
  selection,
  currentPageIndex = 0,
  totalPages = 1,
  onAddStroke,
  onUpdateStrokes,
  onRecordHistory,
  onAddShape,
  onAddText,
  onEraseStrokes,
  onUpdateSelection,
  onUndo,
  onRedo,
  onNextPage,
  onPrevPage
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const staticCanvasRef = useRef<HTMLCanvasElement>(null);
  const activeCanvasRef = useRef<HTMLCanvasElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPressure, setCurrentPressure] = useState<number>(0.5);
  const activePointsRef = useRef<Point[]>([]);
  const isStylusActiveRef = useRef<boolean>(false);
  const currentStrokesRef = useRef<Stroke[]>(strokes);

  // Gesture State & References
  const [gestureToast, setGestureToast] = useState<{ message: string; icon?: string } | null>(null);
  const [showGestureGuide, setShowGestureGuide] = useState(false);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const lastTapPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const showGestureToast = (message: string, icon?: string) => {
    setGestureToast({ message, icon });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setGestureToast(null);
    }, 1400);
  };

  // Keep strokes ref synced for spot-eraser real-time mutations
  useEffect(() => {
    currentStrokesRef.current = strokes;
  }, [strokes]);

  const canvasWidth = page.width * zoomScale;
  const canvasHeight = page.height * zoomScale;

  /**
   * Render Static Layer (Background paper, PDF, committed strokes & shapes)
   */
  const renderStaticLayer = useCallback(() => {
    const canvas = staticCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI crisp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    ctx.scale(dpr * zoomScale, dpr * zoomScale);

    // 1. Paper Background
    DrawingEngine.renderPageBackground(ctx, page, page.width, page.height, pdfBgCanvas);

    // 2. Render Images
    for (const img of images) {
      const imgElem = new Image();
      imgElem.src = img.dataUrl;
      if (imgElem.complete) {
        ctx.drawImage(imgElem, img.x, img.y, img.width, img.height);
      } else {
        imgElem.onload = () => renderStaticLayer();
      }
    }

    // 3. Render Highlighters First (Sits behind primary handwriting/text)
    const highlighterStrokes = strokes.filter(s => s.tool === 'highlighter');
    const primaryInkStrokes = strokes.filter(s => s.tool !== 'highlighter');

    for (const stroke of highlighterStrokes) {
      DrawingEngine.renderStroke(ctx, stroke);
    }

    // 4. Render Committed Shapes
    for (const shape of shapes) {
      DrawingEngine.renderShape(ctx, shape);
    }

    // 5. Render Primary Ink Strokes
    for (const stroke of primaryInkStrokes) {
      DrawingEngine.renderStroke(ctx, stroke);
    }
  }, [canvasWidth, canvasHeight, page, pdfBgCanvas, images, shapes, strokes, zoomScale]);

  useEffect(() => {
    renderStaticLayer();
  }, [renderStaticLayer]);

  /**
   * Render visible eraser circular cursor
   */
  const drawEraserCursor = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    const radius = size / 2;
    ctx.save();
    // Circular boundary with subtle fill
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
    ctx.fill();

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Center crosshair dot
    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.restore();
  };

  /**
   * Pointer Down - Start stroke, eraser, or selection
   */
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pointerType = e.pointerType as 'pen' | 'touch' | 'mouse';

    // Palm rejection: If stylus has written recently and touch comes in, ignore touch drawing
    if (settings.palmRejection && pointerType === 'touch' && isStylusActiveRef.current) {
      return;
    }

    if (pointerType === 'pen') {
      isStylusActiveRef.current = true;
    }

    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const rect = activeCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / zoomScale;
    const y = (e.clientY - rect.top) / zoomScale;
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;

    setIsDrawing(true);
    setCurrentPressure(pressure);

    if (settings.activeTool === 'text') {
      const newText: TextObject = {
        id: `text_${Date.now()}`,
        pageId: page.id,
        x,
        y,
        width: 240,
        height: 80,
        content: '',
        fontSize: settings.fontSize || 20,
        fontFamily: settings.fontFamily || 'Plus Jakarta Sans',
        color: settings.textColor || '#0f172a',
        isBold: false,
        isItalic: false,
        isUnderline: false,
        align: 'left',
        rotation: 0
      };
      onAddText(newText);
      setIsDrawing(false);
      return;
    }

    if (settings.activeTool === 'select') {
      activePointsRef.current = [{ x, y }];
      return;
    }

    if (settings.activeTool === 'eraser') {
      onRecordHistory(); // Record undo state before starting erasure
      activePointsRef.current = [{ x, y }];

      if (settings.eraserType === 'stroke') {
        // Whole line / stroke eraser
        const erasedIds: string[] = [];
        for (const s of currentStrokesRef.current) {
          if (DrawingEngine.isStrokeIntersectingCircle(s, x, y, settings.eraserSize / 2)) {
            erasedIds.push(s.id);
          }
        }
        if (erasedIds.length > 0) {
          onEraseStrokes(erasedIds);
        }
      } else {
        // Precision Spot / Area Eraser: erases only the touched spot, splitting stroke
        const { updatedStrokes, didChange } = DrawingEngine.eraseStrokesAtSpot(
          currentStrokesRef.current,
          x,
          y,
          settings.eraserSize / 2
        );
        if (didChange) {
          currentStrokesRef.current = updatedStrokes;
          onUpdateStrokes(updatedStrokes);
        }
      }
      return;
    }

    // Freehand Drawing (Fountain, Ballpoint, Pencil, Marker, Highlighter, Shape)
    activePointsRef.current = [{ x, y, pressure, time: Date.now() }];
  };

  /**
   * Pointer Move - Real-time stroke tracking & spot erasing
   */
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = activeCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const currentX = (e.clientX - rect.left) / zoomScale;
    const currentY = (e.clientY - rect.top) / zoomScale;
    if (e.pressure && e.pressure > 0) {
      setCurrentPressure(e.pressure);
    }

    const canvas = activeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    ctx.scale(dpr * zoomScale, dpr * zoomScale);

    // If active tool is Eraser, always render the visible eraser circle area cursor
    if (settings.activeTool === 'eraser') {
      ctx.clearRect(0, 0, page.width, page.height);
      drawEraserCursor(ctx, currentX, currentY, settings.eraserSize);

      if (isDrawing) {
        // High frequency pointer coalesced points
        const coalesced = (e.nativeEvent as any).getCoalescedEvents
          ? (e.nativeEvent as any).getCoalescedEvents()
          : [e.nativeEvent];

        for (const evt of coalesced) {
          const px = (evt.clientX - rect.left) / zoomScale;
          const py = (evt.clientY - rect.top) / zoomScale;

          if (settings.eraserType === 'stroke') {
            const erasedIds: string[] = [];
            for (const s of currentStrokesRef.current) {
              if (DrawingEngine.isStrokeIntersectingCircle(s, px, py, settings.eraserSize / 2)) {
                erasedIds.push(s.id);
              }
            }
            if (erasedIds.length > 0) {
              onEraseStrokes(erasedIds);
            }
          } else {
            // Spot / Area Eraser: cuts only that spot!
            const { updatedStrokes, didChange } = DrawingEngine.eraseStrokesAtSpot(
              currentStrokesRef.current,
              px,
              py,
              settings.eraserSize / 2
            );
            if (didChange) {
              currentStrokesRef.current = updatedStrokes;
              onUpdateStrokes(updatedStrokes);
            }
          }
        }
      }
      return;
    }

    if (!isDrawing) return;

    // Coalesced Events for smooth 120Hz/240Hz handwriting
    const coalescedEvents = (e.nativeEvent as any).getCoalescedEvents
      ? (e.nativeEvent as any).getCoalescedEvents()
      : [e.nativeEvent];

    const newPoints: Point[] = [];
    for (const evt of coalescedEvents) {
      const px = (evt.clientX - rect.left) / zoomScale;
      const py = (evt.clientY - rect.top) / zoomScale;
      const pPressure = evt.pressure && evt.pressure > 0 ? evt.pressure : 0.5;
      newPoints.push({ x: px, y: py, pressure: pPressure, time: Date.now() });
    }

    activePointsRef.current.push(...newPoints);

    ctx.clearRect(0, 0, page.width, page.height);

    if (settings.activeTool === 'select') {
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(activePointsRef.current[0].x, activePointsRef.current[0].y);
      for (let i = 1; i < activePointsRef.current.length; i++) {
        ctx.lineTo(activePointsRef.current[i].x, activePointsRef.current[i].y);
      }
      ctx.stroke();
      return;
    }

    // Active Stroke Preview
    const tempStroke: Stroke = {
      id: 'active_preview',
      pageId: page.id,
      tool: settings.activeTool,
      color:
        settings.activeTool === 'highlighter'
          ? settings.highlighterColor
          : settings.activeTool === 'shape'
          ? settings.shapeStroke
          : settings.penColor,
      width:
        settings.activeTool === 'highlighter'
          ? settings.highlighterWidth
          : settings.activeTool === 'shape'
          ? settings.shapeWidth
          : settings.penWidth,
      opacity:
        settings.activeTool === 'highlighter'
          ? 0.4
          : (typeof settings.penOpacity === 'number' ? settings.penOpacity : 1),
      points: activePointsRef.current,
      timestamp: Date.now()
    };

    DrawingEngine.renderStroke(ctx, tempStroke);
  };

  /**
   * Pointer Up / End Stroke
   */
  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = activeCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }

    const points = activePointsRef.current;
    activePointsRef.current = [];

    if (points.length === 0) return;

    // Detect Double-Tap Gesture Shortcut (rapid tap within 320ms and 35px)
    if (points.length <= 3) {
      const p = points[0];
      const now = Date.now();
      const timeDiff = now - lastTapTimeRef.current;
      const dist = Math.hypot(p.x - lastTapPosRef.current.x, p.y - lastTapPosRef.current.y);

      if (timeDiff < 320 && dist < 35) {
        if (onUndo) {
          onUndo();
          showGestureToast('Undo (Double Tap)', '↺');
        }
        lastTapTimeRef.current = 0;
        return;
      } else {
        lastTapTimeRef.current = now;
        lastTapPosRef.current = { x: p.x, y: p.y };
      }
    }

    if (settings.activeTool === 'select') {
      const minX = Math.min(...points.map(p => p.x));
      const maxX = Math.max(...points.map(p => p.x));
      const minY = Math.min(...points.map(p => p.y));
      const maxY = Math.max(...points.map(p => p.y));

      const box = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };

      const selectedStrokes = strokes
        .filter(s => DrawingEngine.isStrokeInLassoPolygon(s, points))
        .map(s => s.id);

      const selectedShapes = shapes
        .filter(sh => points.length >= 3 ? DrawingEngine.isPointInPolygon(sh.x + sh.width / 2, sh.y + sh.height / 2, points) : DrawingEngine.isPointInBox(sh.x, sh.y, box))
        .map(sh => sh.id);

      const selectedTexts = texts
        .filter(t => points.length >= 3 ? DrawingEngine.isPointInPolygon(t.x + t.width / 2, t.y + t.height / 2, points) : DrawingEngine.isPointInBox(t.x, t.y, box))
        .map(t => t.id);

      const selectedImages = images
        .filter(img => points.length >= 3 ? DrawingEngine.isPointInPolygon(img.x + img.width / 2, img.y + img.height / 2, points) : DrawingEngine.isPointInBox(img.x, img.y, box))
        .map(img => img.id);

      const newSelection: SelectionState = {
        strokeIds: selectedStrokes,
        shapeIds: selectedShapes,
        textIds: selectedTexts,
        imageIds: selectedImages,
        bounds: null
      };

      newSelection.bounds = DrawingEngine.calculateSelectionBounds(
        strokes,
        shapes,
        texts,
        images,
        newSelection
      );

      onUpdateSelection(newSelection);
      return;
    }

    if (settings.activeTool === 'eraser') return;

    // Auto-Shape Recognition: Detect circles, squares/rectangles, lines, triangles
    if (settings.autoShapeRecognition || settings.activeTool === 'shape') {
      const shapeColor =
        settings.activeTool === 'highlighter'
          ? settings.highlighterColor || settings.penColor
          : settings.penColor;
      const shapeWidth =
        settings.activeTool === 'highlighter'
          ? settings.highlighterWidth || settings.penWidth
          : settings.penWidth;

      const recognized = recognizeHandDrawnShape(points, page.id, shapeColor, shapeWidth);
      if (recognized) {
        onAddShape(recognized);
        showGestureToast(`Auto-Shape: ${recognized.type.toUpperCase()}`, '📐');
        return;
      }
    }

    // Add completed stroke to page state with ink-smoothing
    const smoothedPoints = DrawingEngine.smoothStrokePoints(points);
    const finalStroke: Stroke = {
      id: `stroke_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      pageId: page.id,
      tool: settings.activeTool,
      color:
        settings.activeTool === 'highlighter'
          ? settings.highlighterColor
          : settings.penColor,
      width:
        settings.activeTool === 'highlighter'
          ? settings.highlighterWidth
          : settings.penWidth,
      opacity:
        settings.activeTool === 'highlighter'
          ? 0.4
          : (typeof settings.penOpacity === 'number' ? settings.penOpacity : 1),
      points: smoothedPoints,
      timestamp: Date.now()
    };

    onAddStroke(finalStroke);
  };

  /**
   * STYLUS & TOUCH GESTURES ENGINE:
   * 1. Two-finger tap -> Undo
   * 2. Three-finger tap -> Redo
   * 3. Horizontal Flick gesture -> Navigate between pages (Next/Prev)
   */
  const touchTrackingRef = useRef<{
    startTime: number;
    startX: number;
    startY: number;
    touchesCount: number;
    maxTouches: number;
    movedDistance: number;
  }>({
    startTime: 0,
    startX: 0,
    startY: 0,
    touchesCount: 0,
    maxTouches: 0,
    movedDistance: 0
  });

  const handleTouchStart = (e: React.TouchEvent) => {
    const numTouches = e.touches.length;
    touchTrackingRef.current.touchesCount = numTouches;
    touchTrackingRef.current.maxTouches = Math.max(touchTrackingRef.current.maxTouches, numTouches);

    if (numTouches >= 1) {
      touchTrackingRef.current.startTime = Date.now();
      touchTrackingRef.current.startX = e.touches[0].clientX;
      touchTrackingRef.current.startY = e.touches[0].clientY;
      touchTrackingRef.current.movedDistance = 0;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length >= 1) {
      const dx = e.touches[0].clientX - touchTrackingRef.current.startX;
      const dy = e.touches[0].clientY - touchTrackingRef.current.startY;
      touchTrackingRef.current.movedDistance = Math.hypot(dx, dy);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const duration = Date.now() - touchTrackingRef.current.startTime;
    const maxTouches = touchTrackingRef.current.maxTouches;
    const moved = touchTrackingRef.current.movedDistance;

    // Reset touch tracker count
    touchTrackingRef.current.touchesCount = e.touches.length;

    // Check when all fingers are lifted (e.touches.length === 0)
    if (e.touches.length === 0) {
      // 1. Two-finger tap: Undo!
      if (maxTouches === 2 && duration < 320 && moved < 20) {
        if (onUndo) {
          onUndo();
          showGestureToast('Undo', '↺');
        }
      }
      // 2. Three-finger tap: Redo!
      else if (maxTouches === 3 && duration < 350 && moved < 25) {
        if (onRedo) {
          onRedo();
          showGestureToast('Redo', '↻');
        }
      }
      // 3. Four-finger tap: Clear Selection
      else if (maxTouches === 4 && duration < 380 && moved < 30) {
        onUpdateSelection({ strokeIds: [], shapeIds: [], textIds: [], imageIds: [], bounds: null });
        showGestureToast('Cleared Selection', '✕');
      }
      // 3. Horizontal Flick gesture (1 or 2 fingers)
      else if ((maxTouches === 1 || maxTouches === 2) && duration < 380) {
        const lastTouch = e.changedTouches[0];
        if (lastTouch) {
          const deltaX = lastTouch.clientX - touchTrackingRef.current.startX;
          const deltaY = lastTouch.clientY - touchTrackingRef.current.startY;

          // Quick horizontal flick: horizontal distance > 65px and vertical deviation < 55px
          if (Math.abs(deltaX) > 65 && Math.abs(deltaY) < 55) {
            if (deltaX < 0) {
              // Flick Left -> Next Page
              if (onNextPage && currentPageIndex < totalPages - 1) {
                onNextPage();
                showGestureToast(`Next Page (${currentPageIndex + 2}/${totalPages})`, '→');
              } else {
                showGestureToast(`End of Notebook (${totalPages}/${totalPages})`);
              }
            } else {
              // Flick Right -> Previous Page
              if (onPrevPage && currentPageIndex > 0) {
                onPrevPage();
                showGestureToast(`Previous Page (${currentPageIndex}/${totalPages})`, '←');
              } else {
                showGestureToast('First Page');
              }
            }
          }
        }
      }

      // Reset max touches for next gesture
      touchTrackingRef.current.maxTouches = 0;
    }
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative shadow-2xl rounded-2xl overflow-hidden touch-none my-8 mx-auto border border-slate-800/80 transition-shadow"
      style={{
        width: canvasWidth,
        height: canvasHeight
      }}
    >
      {/* Layer 1: Static Background & Committed Ink */}
      <canvas
        ref={staticCanvasRef}
        style={{ width: canvasWidth, height: canvasHeight }}
        className="absolute inset-0 block"
      />

      {/* Layer 2: Active Drawing / Eraser Overlay */}
      <canvas
        ref={activeCanvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ width: canvasWidth, height: canvasHeight }}
        className={`absolute inset-0 block touch-none ${
          settings.activeTool === 'eraser'
            ? 'cursor-none'
            : settings.activeTool === 'select'
            ? 'cursor-crosshair'
            : 'cursor-crosshair'
        }`}
      />

      {/* Real-Time Stylus Pressure Visualizer HUD */}
      <StylusPressureHUD
        activeTool={settings.activeTool}
        penColor={settings.penColor}
        baseWidth={settings.penWidth}
        currentPressure={currentPressure}
        isWriting={isDrawing}
      />

      {/* Stylus Gesture Visual Feedback Pill */}
      {gestureToast && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex items-center gap-2 rounded-2xl bg-slate-900/90 border border-indigo-500/40 px-4 py-2 text-xs font-bold text-white shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95">
          {gestureToast.icon && (
            <span className="text-base text-indigo-400 font-mono">{gestureToast.icon}</span>
          )}
          <span>{gestureToast.message}</span>
        </div>
      )}

      {/* Floating Gesture Guide Pill Button */}
      <div className="absolute bottom-4 right-4 z-30">
        <button
          onClick={() => setShowGestureGuide(!showGestureGuide)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white text-xs font-semibold shadow-xl backdrop-blur-md transition group"
          title="Gesture Shortcuts Guide"
        >
          <Hand className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition" />
          <span>Gestures</span>
        </button>

        {/* Popover Cheat Sheet */}
        {showGestureGuide && (
          <div className="absolute bottom-10 right-0 w-64 p-3.5 rounded-2xl bg-[#0c1017]/95 border border-indigo-500/30 text-slate-200 shadow-2xl backdrop-blur-md z-50 text-xs flex flex-col gap-2.5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Gesture Shortcuts
              </span>
              <button
                onClick={() => setShowGestureGuide(false)}
                className="text-slate-400 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-col gap-2 font-sans">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Double Tap / 2-Finger Tap</span>
                <span className="font-mono font-bold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  Undo ↺
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">3-Finger Tap</span>
                <span className="font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  Redo ↻
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Swipe Left / Right</span>
                <span className="font-mono font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Pages ← →
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">4-Finger Tap</span>
                <span className="font-mono font-bold text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                  Deselect ✕
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
