import React, { useState, useRef } from 'react';
import { SelectionState } from '../../types/notebook';
import { Copy, Trash2, Palette, X, Move, Maximize2 } from 'lucide-react';

interface SelectionOverlayProps {
  selection: SelectionState;
  zoomScale: number;
  onMove: (dx: number, dy: number) => void;
  onScale: (scaleX: number, scaleY: number, pivotX: number, pivotY: number) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onChangeColor: (color: string) => void;
  onDeselect: () => void;
}

const QUICK_COLORS = [
  '#0f172a', // Obsidian / Black
  '#2563eb', // Notebook Blue
  '#dc2626', // Review Red
  '#059669', // Emerald
  '#d97706', // Amber
  '#9333ea', // Violet
  '#ffffff'  // White
];

export const SelectionOverlay: React.FC<SelectionOverlayProps> = ({
  selection,
  zoomScale,
  onMove,
  onScale,
  onDelete,
  onDuplicate,
  onChangeColor,
  onDeselect
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const resizeStartRef = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
    handle: string;
  } | null>(null);

  if (!selection.bounds) return null;

  const { x, y, width, height } = selection.bounds;

  // Handle Box Movement Drag
  const handlePointerDownMove = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMoveDrag = (e: React.PointerEvent) => {
    if (!dragStartRef.current) return;
    const dx = (e.clientX - dragStartRef.current.x) / zoomScale;
    const dy = (e.clientY - dragStartRef.current.y) / zoomScale;
    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
      onMove(dx, dy);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerUpDrag = (e: React.PointerEvent) => {
    dragStartRef.current = null;
  };

  // Handle Corner Resize Drag
  const handlePointerDownResize = (e: React.PointerEvent, handle: string) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    resizeStartRef.current = { x: e.clientX, y: e.clientY, width, height, handle };
  };

  const handlePointerMoveResize = (e: React.PointerEvent) => {
    if (!resizeStartRef.current) return;
    const { x: startX, y: startY, width: startW, height: startH, handle } = resizeStartRef.current;

    const dx = (e.clientX - startX) / zoomScale;
    const dy = (e.clientY - startY) / zoomScale;

    let newWidth = startW;
    let newHeight = startH;

    if (handle.includes('right')) newWidth = Math.max(20, startW + dx);
    if (handle.includes('left')) newWidth = Math.max(20, startW - dx);
    if (handle.includes('bottom')) newHeight = Math.max(20, startH + dy);
    if (handle.includes('top')) newHeight = Math.max(20, startH - dy);

    const scaleX = newWidth / startW;
    const scaleY = newHeight / startH;

    const pivotX = handle.includes('left') ? x + width : x;
    const pivotY = handle.includes('top') ? y + height : y;

    onScale(scaleX, scaleY, pivotX, pivotY);
    resizeStartRef.current = { x: e.clientX, y: e.clientY, width: newWidth, height: newHeight, handle };
  };

  const handlePointerUpResize = () => {
    resizeStartRef.current = null;
  };

  return (
    <div
      onPointerDown={handlePointerDownMove}
      onPointerMove={handlePointerMoveDrag}
      onPointerUp={handlePointerUpDrag}
      className="absolute border-2 border-dashed border-indigo-400 rounded-2xl bg-indigo-500/10 pointer-events-auto z-30 cursor-grab active:cursor-grabbing transition-shadow hover:border-amber-400"
      style={{
        left: x * zoomScale,
        top: y * zoomScale,
        width: width * zoomScale,
        height: height * zoomScale
      }}
    >
      {/* Floating Action Badge Toolbar */}
      <div
        onPointerDown={e => e.stopPropagation()}
        className="absolute -top-14 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-2xl bg-[#0c1017] border border-slate-700 p-1.5 shadow-2xl text-xs text-slate-100 z-40 select-none animate-in fade-in zoom-in-95"
      >
        <button
          onClick={onDuplicate}
          className="flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 transition font-bold"
          title="Duplicate selected items"
        >
          <Copy className="w-3.5 h-3.5 text-indigo-400" />
          <span>Duplicate</span>
        </button>

        <div className="h-4 w-[1px] bg-slate-800 my-auto" />

        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 transition font-bold"
            title="Change ink/stroke color"
          >
            <Palette className="w-3.5 h-3.5 text-amber-400" />
            <span>Recolor</span>
          </button>

          {/* Quick Color Picker */}
          {showColorPicker && (
            <div className="absolute top-10 left-1/2 -translate-x-1/2 p-2 rounded-2xl bg-[#0c1017] border border-slate-700 shadow-2xl flex items-center gap-1.5 z-50">
              {QUICK_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => {
                    onChangeColor(c);
                    setShowColorPicker(false);
                  }}
                  className="w-5 h-5 rounded-full border border-slate-600 hover:scale-110 transition shadow"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="h-4 w-[1px] bg-slate-800 my-auto" />

        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-rose-400 hover:bg-rose-500/10 transition font-bold"
          title="Delete selected items"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete</span>
        </button>

        <div className="h-4 w-[1px] bg-slate-800 my-auto" />

        <button
          onClick={onDeselect}
          className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          title="Deselect"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Center Drag Icon Badge */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
        <div className="p-2 rounded-full bg-indigo-950/80 border border-indigo-400 text-indigo-300 shadow">
          <Move className="w-5 h-5" />
        </div>
      </div>

      {/* Interactive Corner Resize Handles */}
      <div
        onPointerDown={e => handlePointerDownResize(e, 'top-left')}
        onPointerMove={handlePointerMoveResize}
        onPointerUp={handlePointerUpResize}
        className="absolute -top-2 -left-2 w-4 h-4 rounded-full bg-amber-400 border-2 border-[#0c1017] shadow cursor-nwse-resize hover:scale-125 transition-transform"
      />
      <div
        onPointerDown={e => handlePointerDownResize(e, 'top-right')}
        onPointerMove={handlePointerMoveResize}
        onPointerUp={handlePointerUpResize}
        className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-amber-400 border-2 border-[#0c1017] shadow cursor-nesw-resize hover:scale-125 transition-transform"
      />
      <div
        onPointerDown={e => handlePointerDownResize(e, 'bottom-left')}
        onPointerMove={handlePointerMoveResize}
        onPointerUp={handlePointerUpResize}
        className="absolute -bottom-2 -left-2 w-4 h-4 rounded-full bg-amber-400 border-2 border-[#0c1017] shadow cursor-nesw-resize hover:scale-125 transition-transform"
      />
      <div
        onPointerDown={e => handlePointerDownResize(e, 'bottom-right')}
        onPointerMove={handlePointerMoveResize}
        onPointerUp={handlePointerUpResize}
        className="absolute -bottom-2 -right-2 w-4 h-4 rounded-full bg-amber-400 border-2 border-[#0c1017] shadow cursor-nwse-resize hover:scale-125 transition-transform"
      />
    </div>
  );
};
