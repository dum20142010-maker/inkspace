import React, { useState } from 'react';
import { PenPreset, ToolType } from '../../types/notebook';
import { DEFAULT_PEN_PRESETS } from '../../db/database';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Sliders,
  CheckCircle2
} from 'lucide-react';

interface PenPresetManagerModalProps {
  isOpen: boolean;
  presets: PenPreset[];
  activePresetId?: string | null;
  onClose: () => void;
  onSelectPreset: (preset: PenPreset) => void;
  onUpdatePresets: (newPresets: PenPreset[], newActivePresetId?: string | null) => void;
  onOpenSaveModal: () => void;
}

const PRESET_COLOR_SWATCHES = [
  '#0f172a',
  '#1e293b',
  '#2563eb',
  '#0284c7',
  '#059669',
  '#16a34a',
  '#dc2626',
  '#ea580c',
  '#d97706',
  '#9333ea',
  '#db2777',
  '#475569'
];

const PEN_TOOLS: { type: ToolType; label: string }[] = [
  { type: 'fountain', label: 'Fountain' },
  { type: 'ballpoint', label: 'Ballpoint' },
  { type: 'pencil', label: 'Pencil' },
  { type: 'marker', label: 'Marker' },
  { type: 'brush', label: 'Brush' }
];

export const PenPresetManagerModal: React.FC<PenPresetManagerModalProps> = ({
  isOpen,
  presets,
  activePresetId,
  onClose,
  onSelectPreset,
  onUpdatePresets,
  onOpenSaveModal
}) => {
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#0f172a');
  const [editWidth, setEditWidth] = useState(3);
  const [editOpacity, setEditOpacity] = useState(1);
  const [editTool, setEditTool] = useState<ToolType>('fountain');

  if (!isOpen) return null;

  const startEditing = (preset: PenPreset) => {
    setEditingPresetId(preset.id);
    setEditName(preset.name);
    setEditColor(preset.color);
    setEditWidth(preset.strokeWidth);
    setEditOpacity(preset.opacity ?? 1);
    setEditTool(preset.tool || 'fountain');
  };

  const cancelEditing = () => {
    setEditingPresetId(null);
  };

  const saveEdit = (presetId: string) => {
    const trimmed = editName.trim();
    if (!trimmed) return;

    const updated = presets.map(p => {
      if (p.id === presetId) {
        return {
          ...p,
          name: trimmed,
          color: editColor,
          strokeWidth: editWidth,
          opacity: Math.max(0.05, Math.min(1.0, editOpacity)),
          tool: editTool
        };
      }
      return p;
    });

    onUpdatePresets(updated, activePresetId);
    setEditingPresetId(null);
  };

  const handleDelete = (id: string, name: string) => {
    if (presets.length <= 1) {
      alert('You must have at least one pen preset saved.');
      return;
    }
    if (confirm(`Delete the "${name}" pen preset?`)) {
      const updated = presets.filter(p => p.id !== id);
      const nextActiveId = activePresetId === id ? (updated[0]?.id ?? null) : activePresetId;
      onUpdatePresets(updated, nextActiveId);
    }
  };

  const movePreset = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= presets.length) return;

    const copy = [...presets];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    onUpdatePresets(copy, activePresetId);
  };

  const handleResetToDefaults = () => {
    if (confirm('Reset all pen presets back to factory defaults? Your custom presets will be replaced.')) {
      onUpdatePresets(DEFAULT_PEN_PRESETS, DEFAULT_PEN_PRESETS[0].id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl max-h-[85vh] rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 text-slate-100 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Manage Pen Presets</h2>
              <p className="text-xs text-slate-400">
                Customize color, opacity, stroke width & pen styles
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action bar: Add new & Reset */}
        <div className="flex items-center justify-between shrink-0">
          <button
            onClick={() => {
              onClose();
              onOpenSaveModal();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-md transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Preset</span>
          </button>

          <button
            onClick={handleResetToDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Defaults</span>
          </button>
        </div>

        {/* Presets List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
          {presets.map((preset, index) => {
            const isEditing = editingPresetId === preset.id;
            const isActive = activePresetId === preset.id;

            if (isEditing) {
              return (
                <div
                  key={preset.id}
                  className="rounded-2xl bg-slate-950 border border-indigo-500/50 p-4 space-y-3.5 shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-300 uppercase tracking-wide">
                      Edit Preset
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={cancelEditing}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => saveEdit(preset.id)}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-500 shadow-sm"
                      >
                        <Check className="w-3 h-3" />
                        Save
                      </button>
                    </div>
                  </div>

                  {/* Name Input */}
                  <div>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-400"
                      placeholder="Preset Name"
                    />
                  </div>

                  {/* Stroke Preview Canvas */}
                  <div className="h-16 rounded-xl bg-[#fefcf0] p-2 flex items-center justify-between overflow-hidden relative border border-slate-700">
                    <span className="text-[10px] font-mono text-slate-600">
                      {editTool.toUpperCase()} • {editWidth}px • {Math.round(editOpacity * 100)}%
                    </span>
                    <svg className="w-56 h-10" viewBox="0 0 240 30">
                      <path
                        d="M 10 15 Q 60 2, 120 15 T 230 14"
                        fill="none"
                        stroke={editColor}
                        strokeWidth={editWidth}
                        strokeOpacity={editOpacity}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  {/* Tool Types */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {PEN_TOOLS.map(t => (
                      <button
                        key={t.type}
                        type="button"
                        onClick={() => setEditTool(t.type)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition border ${
                          editTool === t.type
                            ? 'bg-indigo-600/30 border-indigo-500 text-white font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Color Palette */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {PRESET_COLOR_SWATCHES.map(swatch => (
                      <button
                        key={swatch}
                        type="button"
                        onClick={() => setEditColor(swatch)}
                        className={`w-5 h-5 rounded-full border border-slate-700 transition ${
                          editColor.toLowerCase() === swatch.toLowerCase() ? 'ring-2 ring-white scale-110' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: swatch }}
                      />
                    ))}
                    <input
                      type="color"
                      value={editColor}
                      onChange={e => setEditColor(e.target.value)}
                      className="w-5 h-5 rounded-full cursor-pointer bg-transparent border-0 p-0"
                    />
                  </div>

                  {/* Sliders: Opacity & Width */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>Opacity</span>
                        <span className="font-mono text-indigo-400">{Math.round(editOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.10"
                        max="1.0"
                        step="0.05"
                        value={editOpacity}
                        onChange={e => setEditOpacity(parseFloat(e.target.value))}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>Width</span>
                        <span className="font-mono text-indigo-400">{editWidth}px</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="24"
                        step="0.5"
                        value={editWidth}
                        onChange={e => setEditWidth(parseFloat(e.target.value))}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={preset.id}
                className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                  isActive
                    ? 'bg-slate-800/80 border-indigo-500/70 shadow-sm ring-1 ring-indigo-500/40'
                    : 'bg-slate-950/70 border-slate-800/90 hover:border-slate-700'
                }`}
              >
                {/* Left: Swatch, Name, Specs */}
                <div
                  className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                  onClick={() => {
                    onSelectPreset(preset);
                    onClose();
                  }}
                >
                  {/* Visual Color Dot with Opacity Indicator */}
                  <div className="relative w-8 h-8 rounded-full border border-slate-700 bg-slate-900 shrink-0 flex items-center justify-center overflow-hidden">
                    {/* Checkerboard hint */}
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:4px_4px]" />
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        backgroundColor: preset.color,
                        opacity: preset.opacity ?? 1
                      }}
                    />
                    {/* Line thickness dot */}
                    <div
                      className="relative rounded-full bg-white shadow-sm"
                      style={{
                        width: Math.min(18, Math.max(3, preset.strokeWidth)),
                        height: Math.min(18, Math.max(3, preset.strokeWidth))
                      }}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white truncate">
                        {preset.name}
                      </span>
                      {isActive && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 bg-indigo-500/20 px-1.5 py-0.2 rounded-full border border-indigo-500/40">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="capitalize">{preset.tool || 'fountain'}</span>
                      <span>•</span>
                      <span>{preset.strokeWidth}px</span>
                      <span>•</span>
                      <span>{Math.round((preset.opacity ?? 1) * 100)}% opacity</span>
                    </div>
                  </div>

                  {/* Stroke wave visualization */}
                  <div className="hidden sm:block w-28 h-6 bg-slate-900 rounded-lg p-0.5 border border-slate-800">
                    <svg className="w-full h-full" viewBox="0 0 100 20">
                      <path
                        d="M 5 10 Q 25 3, 50 10 T 95 10"
                        fill="none"
                        stroke={preset.color}
                        strokeWidth={preset.strokeWidth}
                        strokeOpacity={preset.opacity ?? 1}
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1 ml-2 shrink-0">
                  <button
                    onClick={() => movePreset(index, 'up')}
                    disabled={index === 0}
                    className="p-1.5 text-slate-400 hover:text-white disabled:opacity-20 transition"
                    title="Move Up"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => movePreset(index, 'down')}
                    disabled={index === presets.length - 1}
                    className="p-1.5 text-slate-400 hover:text-white disabled:opacity-20 transition"
                    title="Move Down"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => startEditing(preset)}
                    className="p-1.5 text-slate-400 hover:text-indigo-400 transition"
                    title="Edit Preset"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(preset.id, preset.name)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 transition"
                    title="Delete Preset"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
