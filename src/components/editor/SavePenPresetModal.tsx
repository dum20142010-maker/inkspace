import React, { useState, useEffect } from 'react';
import { PenPreset, ToolType } from '../../types/notebook';
import { X, BookmarkPlus, Check, Sparkles, Sliders } from 'lucide-react';

interface SavePenPresetModalProps {
  isOpen: boolean;
  currentColor: string;
  currentWidth: number;
  currentOpacity: number;
  currentTool: ToolType;
  existingPresets: PenPreset[];
  onClose: () => void;
  onSavePreset: (preset: PenPreset) => void;
}

const PRESET_COLOR_SWATCHES = [
  '#0f172a', // Slate black
  '#1e293b', // Charcoal
  '#2563eb', // Royal blue
  '#0284c7', // Sky blue
  '#059669', // Emerald
  '#16a34a', // Forest green
  '#dc2626', // Crimson red
  '#ea580c', // Orange
  '#d97706', // Amber
  '#9333ea', // Violet
  '#db2777', // Pink
  '#475569'  // Graphite
];

const PEN_TOOLS: { type: ToolType; label: string; desc: string }[] = [
  { type: 'fountain', label: 'Fountain Pen', desc: 'Smooth dynamic ink' },
  { type: 'ballpoint', label: 'Ballpoint', desc: 'Uniform clean line' },
  { type: 'pencil', label: 'Pencil', desc: 'Textured graphite' },
  { type: 'marker', label: 'Marker', desc: 'Bold felt tip' },
  { type: 'brush', label: 'Brush', desc: 'Expressive calligraphy' }
];

export const SavePenPresetModal: React.FC<SavePenPresetModalProps> = ({
  isOpen,
  currentColor,
  currentWidth,
  currentOpacity,
  currentTool,
  existingPresets,
  onClose,
  onSavePreset
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(currentColor);
  const [width, setWidth] = useState(currentWidth);
  const [opacity, setOpacity] = useState(currentOpacity ?? 1);
  const [tool, setTool] = useState<ToolType>(
    ['fountain', 'ballpoint', 'pencil', 'marker', 'brush'].includes(currentTool) ? currentTool : 'fountain'
  );
  const [previewPaper, setPreviewPaper] = useState<'light' | 'dark'>('light');

  // Auto-generate a friendly default name when modal opens
  useEffect(() => {
    if (isOpen) {
      setColor(currentColor);
      setWidth(currentWidth);
      setOpacity(currentOpacity ?? 1);
      const safeTool = ['fountain', 'ballpoint', 'pencil', 'marker', 'brush'].includes(currentTool)
        ? currentTool
        : 'fountain';
      setTool(safeTool);

      // Friendly auto name
      const toolName = safeTool.charAt(0).toUpperCase() + safeTool.slice(1);
      const opText = (currentOpacity ?? 1) < 0.9 ? ` ${Math.round((currentOpacity ?? 1) * 100)}%` : '';
      setName(`Custom ${toolName} (${currentWidth}px${opText})`);
    }
  }, [isOpen, currentColor, currentWidth, currentOpacity, currentTool]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    const newPreset: PenPreset = {
      id: `preset_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: trimmed,
      color,
      strokeWidth: width,
      opacity: Math.max(0.05, Math.min(1.0, opacity)),
      tool
    };

    onSavePreset(newPreset);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 text-slate-100 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <BookmarkPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Save Custom Pen Preset</h2>
              <p className="text-xs text-slate-400">Save this style to your quick switch presets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Preset Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Preset Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Lecture Notes, Soft Sketch, Red Markup"
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              required
              autoFocus
            />
          </div>

          {/* Live Stroke Preview Card */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1.5">
              <span>Live Stroke Preview</span>
              <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                <button
                  type="button"
                  onClick={() => setPreviewPaper('light')}
                  className={`px-2 py-0.5 rounded transition ${
                    previewPaper === 'light' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Cream Paper
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewPaper('dark')}
                  className={`px-2 py-0.5 rounded transition ${
                    previewPaper === 'dark' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Dark Paper
                </button>
              </div>
            </div>

            <div
              className={`h-24 rounded-2xl border border-slate-800 p-3 flex flex-col justify-between overflow-hidden relative shadow-inner transition-colors ${
                previewPaper === 'light' ? 'bg-[#fefcf0]' : 'bg-[#1e293b]'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-mono select-none">
                <span className={previewPaper === 'light' ? 'text-slate-600' : 'text-slate-400'}>
                  {tool.toUpperCase()} • {width}px • {Math.round(opacity * 100)}%
                </span>
                <span
                  className="font-bold text-[10px] px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: previewPaper === 'light' ? '#e2e8f0' : '#334155',
                    color: previewPaper === 'light' ? '#334155' : '#e2e8f0'
                  }}
                >
                  {name || 'Preset Preview'}
                </span>
              </div>

              {/* Natural curve stroke simulation */}
              <svg className="w-full h-12" viewBox="0 0 340 40">
                <path
                  d="M 15 22 Q 80 5, 140 22 T 260 20 Q 300 32, 325 15"
                  fill="none"
                  stroke={color}
                  strokeWidth={width}
                  strokeOpacity={opacity}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* Pen Tool Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Pen Type</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {PEN_TOOLS.map(t => (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => setTool(t.type)}
                  className={`py-2 px-1 rounded-xl text-xs font-medium flex flex-col items-center gap-1 border transition ${
                    tool === t.type
                      ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`}
                  title={t.desc}
                >
                  <span className="capitalize">{t.label.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Color Selector */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1.5">
              <span>Color</span>
              <span className="font-mono text-[11px] text-slate-400">{color}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLOR_SWATCHES.map(swatch => (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => setColor(swatch)}
                  className={`w-6 h-6 rounded-full border border-slate-700 transition ${
                    color.toLowerCase() === swatch.toLowerCase() ? 'ring-2 ring-indigo-400 scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: swatch }}
                />
              ))}
              <div className="relative flex items-center ml-1">
                <input
                  type="color"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  className="w-7 h-7 rounded-full cursor-pointer bg-transparent border-0 p-0"
                  title="Custom color picker"
                />
              </div>
            </div>
          </div>

          {/* Opacity & Stroke Width Controls */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            {/* Opacity Slider */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1">
                <span>Opacity</span>
                <span className="font-mono text-indigo-400 text-[11px]">{Math.round(opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="1.0"
                step="0.05"
                value={opacity}
                onChange={e => setOpacity(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <button type="button" onClick={() => setOpacity(0.4)} className="hover:text-slate-300">Wash (40%)</button>
                <button type="button" onClick={() => setOpacity(0.75)} className="hover:text-slate-300">Soft (75%)</button>
                <button type="button" onClick={() => setOpacity(1.0)} className="hover:text-slate-300">Solid (100%)</button>
              </div>
            </div>

            {/* Stroke Width Selector */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1">
                <span>Stroke Width</span>
                <span className="font-mono text-indigo-400 text-[11px]">{width}px</span>
              </div>
              <input
                type="range"
                min="1"
                max="24"
                step="0.5"
                value={width}
                onChange={e => setWidth(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                {[1, 2, 4, 8, 14].map(w => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setWidth(w)}
                    className={`hover:text-slate-300 ${width === w ? 'text-indigo-400 font-bold' : ''}`}
                  >
                    {w}px
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition"
            >
              <Check className="w-4 h-4" />
              <span>Save Preset</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
