import React, { useState } from 'react';
import { ToolType, ToolSettings, EraserType, ShapeType, PenPreset } from '../../types/notebook';
import {
  PenTool,
  Pencil,
  Highlighter,
  Eraser,
  Shapes,
  MousePointer2,
  Type,
  Image as ImageIcon,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Share2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Moon,
  Sun,
  Layers,
  Circle,
  Square,
  Minus,
  MoveRight,
  Triangle,
  Sliders,
  Sparkles,
  Info,
  Search,
  FileText,
  BookmarkPlus,
  Users,
  Mic,
  MicOff
} from 'lucide-react';

interface ToolbarProps {
  notebookTitle: string;
  currentPageIndex: number;
  totalPages: number;
  zoomScale: number;
  settings: ToolSettings;
  canUndo: boolean;
  canRedo: boolean;
  isDarkPaper: boolean;
  isDictating?: boolean;
  onBackToDashboard: () => void;
  onToolSelect: (tool: ToolType) => void;
  onSettingChange: (key: keyof ToolSettings, value: any) => void;
  onPageChange: (index: number) => void;
  onAddPage: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onExport: () => void;
  onToggleSidebar: () => void;
  onToggleDarkPaper: () => void;
  onInsertImageClick: () => void;
  onOpenFind: () => void;
  onOpenOcr: () => void;
  onSelectPreset: (preset: PenPreset) => void;
  onOpenSavePreset: () => void;
  onOpenManagePresets: () => void;
  onToggleCollaboration?: () => void;
  onToggleDictation?: () => void;
  onOpenBookmarkModal?: () => void;
  isCurrentPageBookmarked?: boolean;
}

const PEN_WIDTHS = [
  { label: 'Fine', width: 2 },
  { label: 'Medium', width: 4 },
  { label: 'Thick', width: 8 },
  { label: 'Bold', width: 14 }
];

const ERASER_SIZES: { label: string; size: number; desc: string }[] = [
  { label: 'Fine', size: 16, desc: 'Precision spot erasing' },
  { label: 'Medium', size: 32, desc: 'Standard handwriting' },
  { label: 'Large', size: 64, desc: 'Large area' },
  { label: 'Max', size: 110, desc: 'Extra large area' }
];

export const Toolbar: React.FC<ToolbarProps> = ({
  notebookTitle,
  currentPageIndex,
  totalPages,
  zoomScale,
  settings,
  canUndo,
  canRedo,
  isDarkPaper,
  isDictating = false,
  onBackToDashboard,
  onToolSelect,
  onSettingChange,
  onPageChange,
  onAddPage,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onExport,
  onToggleSidebar,
  onToggleDarkPaper,
  onInsertImageClick,
  onOpenFind,
  onOpenOcr,
  onSelectPreset,
  onOpenSavePreset,
  onOpenManagePresets,
  onToggleCollaboration,
  onToggleDictation,
  onOpenBookmarkModal,
  isCurrentPageBookmarked = false
}) => {
  const [showEraserMenu, setShowEraserMenu] = useState(false);
  const [showShapeMenu, setShowShapeMenu] = useState(false);

  const isPenTool = ['fountain', 'ballpoint', 'pencil', 'marker', 'brush'].includes(settings.activeTool);

  const getActiveColor = () => {
    if (settings.activeTool === 'highlighter') return settings.highlighterColor;
    if (settings.activeTool === 'shape') return settings.shapeStroke;
    if (settings.activeTool === 'text') return settings.textColor;
    return settings.penColor;
  };

  const handleColorSelect = (color: string) => {
    if (settings.activeTool === 'highlighter') {
      onSettingChange('highlighterColor', color);
    } else if (settings.activeTool === 'shape') {
      onSettingChange('shapeStroke', color);
    } else if (settings.activeTool === 'text') {
      onSettingChange('textColor', color);
    } else {
      onSettingChange('penColor', color);
    }
  };

  return (
    <header className="relative border-b border-slate-800 bg-slate-900/95 backdrop-blur-md select-none z-30">
      {/* Primary Toolbar Row */}
      <div className="h-16 px-4 flex items-center justify-between gap-2">
        {/* Left: Navigation, Title & Page Jumper */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onBackToDashboard}
            className="rounded-xl p-2 text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title="Back to Dashboard"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={onToggleSidebar}
            className="rounded-xl p-2 text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title="Toggle Page Thumbnails Sidebar"
          >
            <Layers className="w-5 h-5" />
          </button>

          {/* Title & Page Navigation */}
          <div className="hidden sm:flex items-center gap-2 pl-1">
            <div>
              <h2 className="text-xs font-bold text-white max-w-[130px] truncate" title={notebookTitle}>
                {notebookTitle}
              </h2>
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <span>Page</span>
                <span className="font-bold text-slate-200">{currentPageIndex + 1}</span>
                <span>/</span>
                <span>{totalPages}</span>
              </div>
            </div>

            {/* Quick Page Prev / Next Flick Buttons */}
            <div className="flex items-center bg-slate-950/70 p-0.5 rounded-lg border border-slate-800 ml-1">
              <button
                onClick={() => onPageChange(Math.max(0, currentPageIndex - 1))}
                disabled={currentPageIndex <= 0}
                className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition"
                title="Previous Page (or swipe right)"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onPageChange(Math.min(totalPages - 1, currentPageIndex + 1))}
                disabled={currentPageIndex >= totalPages - 1}
                className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition"
                title="Next Page (or swipe left)"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Middle Main Drawing Tools */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-2xl border border-slate-800/90 shadow-inner">
          {/* Select / Lasso */}
          <button
            onClick={() => onToolSelect('select')}
            className={`p-2 rounded-xl text-xs font-medium transition ${
              settings.activeTool === 'select'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
            title="Lasso / Select Objects"
          >
            <MousePointer2 className="w-4 h-4" />
          </button>

          {/* Fountain Pen (Pressure Ink) */}
          <button
            onClick={() => onToolSelect('fountain')}
            className={`p-2 rounded-xl text-xs font-medium transition ${
              settings.activeTool === 'fountain'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
            title="Fountain Pen (Smooth natural ink)"
          >
            <PenTool className="w-4 h-4" />
          </button>

          {/* Pencil */}
          <button
            onClick={() => onToolSelect('pencil')}
            className={`p-2 rounded-xl text-xs font-medium transition ${
              settings.activeTool === 'pencil'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
            title="Pencil (Graphite texture)"
          >
            <Pencil className="w-4 h-4" />
          </button>

          {/* Highlighter */}
          <button
            onClick={() => onToolSelect('highlighter')}
            className={`p-2 rounded-xl text-xs font-medium transition ${
              settings.activeTool === 'highlighter'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
            title="Highlighter (Semi-transparent overlay)"
          >
            <Highlighter className="w-4 h-4" />
          </button>

          {/* Eraser Tool with Popover Indicator */}
          <div className="relative">
            <button
              onClick={() => {
                onToolSelect('eraser');
                setShowEraserMenu(!showEraserMenu);
              }}
              className={`p-2 rounded-xl text-xs font-medium flex items-center gap-1 transition ${
                settings.activeTool === 'eraser'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
              title="Eraser (Spot precision or whole stroke)"
            >
              <Eraser className="w-4 h-4" />
              {settings.activeTool === 'eraser' && (
                <span className="text-[9px] font-bold px-1 rounded bg-black/30">
                  {settings.eraserType === 'stroke' ? 'Line' : `${settings.eraserSize}px`}
                </span>
              )}
            </button>
          </div>

          {/* Shape Tool with Shapes Menu */}
          <div className="relative">
            <button
              onClick={() => {
                onToolSelect('shape');
                setShowShapeMenu(!showShapeMenu);
              }}
              className={`p-2 rounded-xl text-xs font-medium transition ${
                settings.activeTool === 'shape'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
              title="Draw Clean Shapes"
            >
              <Shapes className="w-4 h-4" />
            </button>
          </div>

          {/* Text Box */}
          <button
            onClick={() => onToolSelect('text')}
            className={`p-2 rounded-xl text-xs font-medium transition ${
              settings.activeTool === 'text'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
            title="Type Text Box"
          >
            <Type className="w-4 h-4" />
          </button>

          {/* Insert Image */}
          <button
            onClick={onInsertImageClick}
            className="p-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition"
            title="Insert Image"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          <div className="h-5 w-[1px] bg-slate-800 my-auto mx-1" />

          {/* Color Palette (if not eraser) */}
          {settings.activeTool !== 'eraser' ? (
            <div className="flex items-center gap-1 px-1">
              {settings.favoriteColors.slice(0, 5).map(color => (
                <button
                  key={color}
                  onClick={() => handleColorSelect(color)}
                  className={`w-5 h-5 rounded-full border border-slate-700 transition ${
                    getActiveColor() === color ? 'ring-2 ring-white scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}

              <input
                type="color"
                value={getActiveColor()}
                onChange={e => handleColorSelect(e.target.value)}
                className="w-5 h-5 rounded-full cursor-pointer bg-transparent border-0 p-0"
                title="Custom Color Picker"
              />
            </div>
          ) : (
            /* Eraser Size Quick Chips right in toolbar */
            <div className="flex items-center gap-1 px-1">
              {ERASER_SIZES.map(es => (
                <button
                  key={es.size}
                  onClick={() => onSettingChange('eraserSize', es.size)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                    settings.eraserSize === es.size
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title={`${es.desc} (${es.size}px)`}
                >
                  {es.label}
                </button>
              ))}
            </div>
          )}

          {/* Stroke Size Selector for Pen Tools */}
          {settings.activeTool !== 'eraser' && (
            <div className="flex items-center gap-1 pl-1.5 pr-1">
              {PEN_WIDTHS.map(pw => (
                <button
                  key={pw.width}
                  onClick={() => onSettingChange('penWidth', pw.width)}
                  className={`w-6 h-6 rounded-lg flex items-center justify-center transition ${
                    settings.penWidth === pw.width
                      ? 'bg-slate-800 text-indigo-400 font-bold ring-1 ring-indigo-500'
                      : 'text-slate-400 hover:bg-slate-800/40'
                  }`}
                  title={`${pw.label} (${pw.width}px)`}
                >
                  <span
                    className="rounded-full bg-current"
                    style={{ width: Math.max(3, pw.width), height: Math.max(3, pw.width) }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Search, OCR, Undo/Redo, Zoom, Paper Theme, Export */}
        <div className="flex items-center gap-2">
          {/* Voice-to-Text Dictation Button */}
          {onToggleDictation && (
            <button
              onClick={onToggleDictation}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs font-bold transition ${
                isDictating
                  ? 'bg-rose-500/20 border-rose-500/60 text-rose-300 shadow-md shadow-rose-500/20 animate-pulse'
                  : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
              }`}
              title={isDictating ? 'Stop English Voice Dictation' : 'Start English Voice-to-Text Dictation'}
            >
              {isDictating ? (
                <Mic className="w-4 h-4 text-rose-400 animate-bounce" />
              ) : (
                <Mic className="w-4 h-4 text-rose-400" />
              )}
              <span className="hidden xl:inline">{isDictating ? 'Recording...' : 'Dictate'}</span>
            </button>
          )}

          {/* Collaboration Panel & Activity */}
          {onToggleCollaboration && (
            <button
              onClick={onToggleCollaboration}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-950/70 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-700 transition"
              title="Collaboration & Activity Panel"
            >
              <Users className="w-4 h-4 text-amber-400" />
              <span className="hidden xl:inline">Collab</span>
            </button>
          )}

          {/* Find in Notebook Search */}
          <button
            onClick={onOpenFind}
            className="p-2 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition"
            title="Find in Notebook (Ctrl+F / ⌘F)"
          >
            <Search className="w-4 h-4 text-indigo-400" />
          </button>

          {/* Bookmark Current Page Button */}
          {onOpenBookmarkModal && (
            <button
              onClick={onOpenBookmarkModal}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs font-semibold transition ${
                isCurrentPageBookmarked
                  ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-md shadow-amber-500/10'
                  : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
              }`}
              title={isCurrentPageBookmarked ? 'Edit Bookmark / TOC' : 'Bookmark Page to Table of Contents'}
            >
              <BookmarkPlus className={`w-4 h-4 ${isCurrentPageBookmarked ? 'text-amber-400 fill-amber-400' : 'text-amber-400'}`} />
              <span className="hidden xl:inline">{isCurrentPageBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
            </button>
          )}

          {/* Handwriting OCR & Transcript */}
          <button
            onClick={onOpenOcr}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-950/70 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-700 transition"
            title="Handwriting OCR & Search Index"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="hidden xl:inline">OCR</span>
          </button>

          {/* Undo / Redo */}
          <div className="flex items-center bg-slate-950/70 p-0.5 rounded-xl border border-slate-800">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="p-2 text-slate-400 hover:text-white disabled:opacity-30 transition"
              title="Undo (or two-finger tap)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="p-2 text-slate-400 hover:text-white disabled:opacity-30 transition"
              title="Redo (or three-finger tap)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          {/* Zoom Level */}
          <div className="hidden lg:flex items-center bg-slate-950/70 p-0.5 rounded-xl border border-slate-800 text-xs font-semibold text-slate-300">
            <button onClick={onZoomOut} className="p-1.5 hover:text-white transition" title="Zoom Out">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button onClick={onResetZoom} className="px-1.5 text-[11px] hover:text-indigo-400 transition" title="Reset Zoom">
              {Math.round(zoomScale * 100)}%
            </button>
            <button onClick={onZoomIn} className="p-1.5 hover:text-white transition" title="Zoom In">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Paper Theme Toggle */}
          <button
            onClick={onToggleDarkPaper}
            className="p-2 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-300 hover:text-white transition"
            title="Toggle Light / Dark Paper Tone"
          >
            {isDarkPaper ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>

          {/* Export Button */}
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white shadow-lg hover:bg-indigo-500 transition"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Human Friendly Context Bar when Eraser is active */}
      {settings.activeTool === 'eraser' && (
        <div className="h-10 px-4 bg-slate-950/90 border-t border-slate-800/80 flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Eraser Mode:</span>

            {/* Precision Spot vs Whole Stroke Mode */}
            <div className="flex items-center rounded-xl bg-slate-900 border border-slate-800 p-0.5">
              <button
                type="button"
                onClick={() => onSettingChange('eraserType', 'pixel')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  settings.eraserType !== 'stroke'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Spot / Area Eraser
              </button>
              <button
                type="button"
                onClick={() => onSettingChange('eraserType', 'stroke')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  settings.eraserType === 'stroke'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Whole Line Eraser
              </button>
            </div>

            <span className="text-[11px] text-slate-400 hidden sm:inline">
              {settings.eraserType !== 'stroke'
                ? 'Erases only the exact spot touched without deleting the whole stroke'
                : 'Deletes the entire line in one touch'}
            </span>
          </div>

          {/* Area Slider & Visual Size Circle */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400">Eraser Area:</span>
            <input
              type="range"
              min="10"
              max="140"
              value={settings.eraserSize}
              onChange={e => onSettingChange('eraserSize', Number(e.target.value))}
              className="w-24 accent-rose-500 cursor-pointer"
            />
            <div
              className="rounded-full border border-rose-400 bg-rose-500/30 flex items-center justify-center shrink-0"
              style={{
                width: Math.min(24, Math.max(8, settings.eraserSize / 3)),
                height: Math.min(24, Math.max(8, settings.eraserSize / 3))
              }}
              title={`Current eraser diameter: ${settings.eraserSize}px`}
            />
            <span className="text-[11px] font-mono text-slate-300 w-8">{settings.eraserSize}px</span>
          </div>
        </div>
      )}

      {/* Human Friendly Context Bar when Shape Tool is active */}
      {settings.activeTool === 'shape' && (
        <div className="h-10 px-4 bg-slate-950/90 border-t border-slate-800/80 flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Draw Shape:</span>
            <p className="text-[11px] text-indigo-300">
              Draw a rectangle, circle, line, or triangle with your stylus or finger. It will snap into a clean geometric shape!
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400">Stroke width:</span>
            {[2, 3, 5].map(w => (
              <button
                key={w}
                onClick={() => onSettingChange('shapeWidth', w)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                  settings.shapeWidth === w ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {w}px
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pen Presets & Style Context Bar when any Pen tool is active */}
      {isPenTool && (
        <div className="h-11 px-4 bg-slate-950/95 border-t border-slate-800/80 flex items-center justify-between text-xs animate-in fade-in gap-3 overflow-x-auto custom-scrollbar select-none">
          {/* Left: Quick Switch Pen Presets */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[10px] uppercase tracking-wider pl-0.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Presets:</span>
            </div>

            {/* Presets List */}
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-[320px] sm:max-w-[480px] md:max-w-[620px] py-1">
              {(settings.penPresets || []).map(preset => {
                const isActive =
                  settings.activePresetId === preset.id ||
                  (settings.penColor.toLowerCase() === preset.color.toLowerCase() &&
                    settings.penWidth === preset.strokeWidth &&
                    Math.abs((settings.penOpacity ?? 1) - (preset.opacity ?? 1)) < 0.05 &&
                    settings.activeTool === (preset.tool || 'fountain'));

                return (
                  <button
                    key={preset.id}
                    onClick={() => onSelectPreset(preset)}
                    className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs transition border ${
                      isActive
                        ? 'bg-indigo-600/30 border-indigo-400 text-white font-bold shadow-sm ring-1 ring-indigo-400/50'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-700'
                    }`}
                    title={`${preset.name} • ${preset.tool || 'fountain'} • ${preset.strokeWidth}px • ${Math.round((preset.opacity ?? 1) * 100)}% opacity`}
                  >
                    {/* Visual Color Dot with Opacity */}
                    <span
                      className="w-3 h-3 rounded-full border border-slate-700 shrink-0 shadow-xs"
                      style={{
                        backgroundColor: preset.color,
                        opacity: preset.opacity ?? 1
                      }}
                    />
                    <span className="truncate max-w-[85px]">{preset.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono bg-slate-950/60 px-1 py-0.2 rounded">
                      {preset.strokeWidth}px
                    </span>
                    {(preset.opacity ?? 1) < 0.95 && (
                      <span className="text-[9px] text-indigo-300 font-mono bg-indigo-950/60 px-1 py-0.2 rounded border border-indigo-800/40">
                        {Math.round((preset.opacity ?? 1) * 100)}%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Save current pen style as new preset button */}
            <button
              onClick={onOpenSavePreset}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 text-indigo-300 text-xs font-semibold transition shrink-0"
              title="Save current pen settings as a new custom preset"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Save Style</span>
            </button>

            {/* Manage Presets button */}
            <button
              onClick={onOpenManagePresets}
              className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition shrink-0"
              title="Manage & Reorder Pen Presets"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right: Opacity Slider, Stroke Width & Live Preview */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Live Stroke preview swatch */}
            <div
              className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-xl border border-slate-800 bg-slate-900/80"
              title="Current pen stroke preview"
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase">Live:</span>
              <svg className="w-14 h-4" viewBox="0 0 60 16">
                <path
                  d="M 4 8 Q 20 2, 35 10 T 56 8"
                  fill="none"
                  stroke={settings.penColor}
                  strokeWidth={settings.penWidth}
                  strokeOpacity={settings.penOpacity ?? 1}
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {/* Opacity quick control */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-slate-400 hidden sm:inline">Opacity:</span>
              <input
                type="range"
                min="0.10"
                max="1.0"
                step="0.05"
                value={settings.penOpacity ?? 1}
                onChange={e => onSettingChange('penOpacity', parseFloat(e.target.value))}
                className="w-16 sm:w-20 accent-indigo-500 cursor-pointer"
                title={`Adjust pen opacity (${Math.round((settings.penOpacity ?? 1) * 100)}%)`}
              />
              <span className="text-[10px] font-mono text-slate-300 w-8">
                {Math.round((settings.penOpacity ?? 1) * 100)}%
              </span>
            </div>

            {/* Opacity Quick Chips */}
            <div className="hidden xl:flex items-center gap-1">
              {[
                { label: 'Wash', val: 0.35 },
                { label: 'Semi', val: 0.65 },
                { label: 'Solid', val: 1.0 }
              ].map(chip => (
                <button
                  key={chip.val}
                  onClick={() => onSettingChange('penOpacity', chip.val)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition ${
                    Math.abs((settings.penOpacity ?? 1) - chip.val) < 0.05
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
