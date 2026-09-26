import React, { useState } from 'react';
import { ToolSettings, StylusAction, PenPreset, ToolType } from '../../types/notebook';
import { DEFAULT_PEN_PRESETS } from '../../db/database';
import {
  X,
  Settings,
  Sparkles,
  Sliders,
  RotateCcw,
  Moon,
  Sun,
  PenTool,
  Check,
  Plus,
  Trash2,
  Edit2,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  Palette
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  settings: ToolSettings;
  onClose: () => void;
  onUpdateSettings: (newSettings: ToolSettings) => void;
  onClearStorage: () => void;
}

const STYLUS_ACTION_OPTIONS: { label: string; value: StylusAction; desc: string }[] = [
  { label: 'None (Disabled)', value: 'none', desc: 'No action triggered' },
  { label: 'Undo', value: 'undo', desc: 'Undo last stroke or action' },
  { label: 'Redo', value: 'redo', desc: 'Redo previously undone action' },
  { label: 'Eraser Mode', value: 'eraser', desc: 'Switch active tool to eraser' },
  { label: 'Highlighter Mode', value: 'highlighter', desc: 'Switch active tool to highlighter' },
  { label: 'Laser Pointer', value: 'laser', desc: 'Switch to temporary laser pointer' },
  { label: 'Select / Lasso', value: 'select', desc: 'Switch to lasso selection tool' },
  { label: 'Auto Shape', value: 'shape', desc: 'Switch to geometric shape tool' },
  { label: 'OCR Transcript', value: 'ocr', desc: 'Open handwriting OCR transcript' },
  { label: 'Bookmark Page', value: 'bookmark', desc: 'Open bookmark & TOC dialog' }
];

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

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onUpdateSettings,
  onClearStorage
}) => {
  // Active Tab / Section inside Settings
  const [activeTab, setActiveTab] = useState<'general' | 'presets' | 'stylus'>('general');

  // Presets Editing State
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#0f172a');
  const [editWidth, setEditWidth] = useState(3);
  const [editOpacity, setEditOpacity] = useState(1);
  const [editTool, setEditTool] = useState<ToolType>('fountain');

  // New Preset Creation State
  const [isAddingPreset, setIsAddingPreset] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(settings.penColor || '#2563eb');
  const [newWidth, setNewWidth] = useState(settings.penWidth || 3);
  const [newOpacity, setNewOpacity] = useState(settings.penOpacity ?? 1);
  const [newTool, setNewTool] = useState<ToolType>(
    ['fountain', 'ballpoint', 'pencil', 'marker', 'brush'].includes(settings.activeTool)
      ? settings.activeTool
      : 'fountain'
  );

  if (!isOpen) return null;

  const currentTheme = settings.appTheme || 'dark';
  const stylusShortcuts = settings.stylusShortcuts || {
    barrelButton1: 'eraser',
    barrelButton2: 'select',
    eraserSwitch: 'undo'
  };

  const presets = settings.penPresets && settings.penPresets.length > 0
    ? settings.penPresets
    : DEFAULT_PEN_PRESETS;

  const handleUpdateStylusShortcut = (
    buttonKey: 'barrelButton1' | 'barrelButton2' | 'eraserSwitch',
    newAction: StylusAction
  ) => {
    const next = { ...stylusShortcuts };
    if (newAction !== 'none') {
      if (next.barrelButton1 === newAction && buttonKey !== 'barrelButton1') next.barrelButton1 = 'none';
      if (next.barrelButton2 === newAction && buttonKey !== 'barrelButton2') next.barrelButton2 = 'none';
      if (next.eraserSwitch === newAction && buttonKey !== 'eraserSwitch') next.eraserSwitch = 'none';
    }
    next[buttonKey] = newAction;
    onUpdateSettings({ ...settings, stylusShortcuts: next });
  };

  // Preset Handlers
  const handleSelectPreset = (preset: PenPreset) => {
    onUpdateSettings({
      ...settings,
      penColor: preset.color,
      penWidth: preset.strokeWidth,
      penOpacity: preset.opacity ?? 1,
      activeTool: preset.tool || 'fountain',
      activePresetId: preset.id
    });
  };

  const startEditing = (preset: PenPreset) => {
    setEditingPresetId(preset.id);
    setEditName(preset.name);
    setEditColor(preset.color);
    setEditWidth(preset.strokeWidth);
    setEditOpacity(preset.opacity ?? 1);
    setEditTool(preset.tool || 'fountain');
  };

  const saveEditing = (presetId: string) => {
    const trimmed = editName.trim();
    if (!trimmed) return;

    const updatedPresets = presets.map(p => {
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

    onUpdateSettings({ ...settings, penPresets: updatedPresets });
    setEditingPresetId(null);
  };

  const handleCreatePreset = () => {
    const trimmed = newName.trim() || `${newTool.charAt(0).toUpperCase() + newTool.slice(1)} ${newWidth}px`;
    const newPresetObj: PenPreset = {
      id: `preset_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: trimmed,
      color: newColor,
      strokeWidth: newWidth,
      opacity: Math.max(0.05, Math.min(1.0, newOpacity)),
      tool: newTool
    };

    const updatedPresets = [...presets, newPresetObj];
    onUpdateSettings({
      ...settings,
      penPresets: updatedPresets,
      penColor: newColor,
      penWidth: newWidth,
      penOpacity: newOpacity,
      activeTool: newTool,
      activePresetId: newPresetObj.id
    });

    setIsAddingPreset(false);
    setNewName('');
  };

  const handleDeletePreset = (id: string, name: string) => {
    if (presets.length <= 1) {
      alert('You must keep at least one pen preset saved.');
      return;
    }
    if (confirm(`Delete the "${name}" pen preset?`)) {
      const updatedPresets = presets.filter(p => p.id !== id);
      const nextActiveId = settings.activePresetId === id ? (updatedPresets[0]?.id ?? null) : settings.activePresetId;
      onUpdateSettings({
        ...settings,
        penPresets: updatedPresets,
        activePresetId: nextActiveId
      });
    }
  };

  const handleMovePreset = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= presets.length) return;

    const copy = [...presets];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    onUpdateSettings({ ...settings, penPresets: copy });
  };

  const handleResetPresets = () => {
    if (confirm('Reset all pen presets back to factory defaults? Your custom writing styles will be replaced.')) {
      onUpdateSettings({
        ...settings,
        penPresets: DEFAULT_PEN_PRESETS,
        activePresetId: DEFAULT_PEN_PRESETS[0].id
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">App Preferences & Pen Manager</h2>
              <p className="text-xs text-slate-400">Configure theme, stylus shortcuts, drawing engine & pen presets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Pill Header */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800 shrink-0">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'general'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>General & Theme</span>
          </button>

          <button
            onClick={() => setActiveTab('presets')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'presets'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Pen Presets ({presets.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('stylus')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'stylus'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Stylus Buttons</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-5 py-2">
          {/* TAB 1: GENERAL & THEME */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              {/* Global Theme Switcher */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
                <div>
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    {currentTheme === 'dark' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
                    <span>Global Application Theme</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Toggle between Dark Slate mode and High-Contrast Light mode with paper background adaptation
                  </p>
                </div>

                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, appTheme: 'dark' })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      currentTheme === 'dark'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>Dark Slate</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, appTheme: 'light' })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      currentTheme === 'light'
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>Light Mode</span>
                  </button>
                </div>
              </div>

              {/* Drawing Engine Options */}
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-3">
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  <span>Drawing Engine Toggles</span>
                </p>

                {/* Palm Rejection */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div>
                    <p className="text-xs font-bold text-white">Palm Rejection</p>
                    <p className="text-[11px] text-slate-400">Ignore finger touch gestures while active stylus tip is detected</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, palmRejection: !settings.palmRejection })}
                    className={`w-11 h-6 rounded-full transition-colors relative ${
                      settings.palmRejection ? 'bg-indigo-600' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        settings.palmRejection ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Pressure Sensitivity */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div>
                    <p className="text-xs font-bold text-white">Pressure Sensitivity</p>
                    <p className="text-[11px] text-slate-400">Dynamic line thickness response based on stylus force</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, pressureSensitivity: !settings.pressureSensitivity })}
                    className={`w-11 h-6 rounded-full transition-colors relative ${
                      settings.pressureSensitivity ? 'bg-indigo-600' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        settings.pressureSensitivity ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Shape Recognition */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div>
                    <p className="text-xs font-bold text-white">Auto Shape Recognition</p>
                    <p className="text-[11px] text-slate-400">Snap rough freehand sketches into sharp geometric shapes</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, autoShapeRecognition: !settings.autoShapeRecognition })}
                    className={`w-11 h-6 rounded-full transition-colors relative ${
                      settings.autoShapeRecognition ? 'bg-indigo-600' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        settings.autoShapeRecognition ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* IndexedDB Reset */}
              <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">Clear Local Storage</p>
                  <p className="text-[11px] text-slate-400">Reset IndexedDB database & reinstall sample notebooks</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Are you sure you want to clear all local notebooks and reset database?')) {
                      onClearStorage();
                    }
                  }}
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition"
                >
                  Reset Data
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: PEN PRESETS MANAGER */}
          {activeTab === 'presets' && (
            <div className="space-y-4">
              {/* Top Action Bar */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setIsAddingPreset(!isAddingPreset)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-md transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAddingPreset ? 'Cancel New Style' : 'Create Pen Preset'}</span>
                </button>

                <button
                  onClick={handleResetPresets}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Defaults</span>
                </button>
              </div>

              {/* Create New Preset Panel */}
              {isAddingPreset && (
                <div className="rounded-2xl bg-slate-950 border border-indigo-500/50 p-4 space-y-3.5 shadow-xl animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-300 uppercase tracking-wide flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      New Custom Writing Preset
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Preset Name</label>
                    <input
                      type="text"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder="e.g. Cobalt Calligraphy, Highlighter Yellow..."
                      className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-400"
                    />
                  </div>

                  {/* Live Stroke Preview Canvas */}
                  <div className="h-14 rounded-xl bg-[#fefcf0] p-2 flex items-center justify-between overflow-hidden relative border border-slate-700">
                    <span className="text-[10px] font-mono text-slate-600">
                      {newTool.toUpperCase()} • {newWidth}px • {Math.round(newOpacity * 100)}%
                    </span>
                    <svg className="w-56 h-10" viewBox="0 0 240 30">
                      <path
                        d="M 10 15 Q 60 2, 120 15 T 230 14"
                        fill="none"
                        stroke={newColor}
                        strokeWidth={newWidth}
                        strokeOpacity={newOpacity}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  {/* Tool Types */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Pen Tool Type</label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {PEN_TOOLS.map(t => (
                        <button
                          key={t.type}
                          type="button"
                          onClick={() => setNewTool(t.type)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition border ${
                            newTool === t.type
                              ? 'bg-indigo-600/30 border-indigo-500 text-white font-bold'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color Swatches */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Color Palette</label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {PRESET_COLOR_SWATCHES.map(swatch => (
                        <button
                          key={swatch}
                          type="button"
                          onClick={() => setNewColor(swatch)}
                          className={`w-5 h-5 rounded-full border border-slate-700 transition ${
                            newColor.toLowerCase() === swatch.toLowerCase() ? 'ring-2 ring-white scale-110' : 'hover:scale-105'
                          }`}
                          style={{ backgroundColor: swatch }}
                        />
                      ))}
                      <input
                        type="color"
                        value={newColor}
                        onChange={e => setNewColor(e.target.value)}
                        className="w-5 h-5 rounded-full cursor-pointer bg-transparent border-0 p-0"
                      />
                    </div>
                  </div>

                  {/* Sliders */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>Opacity</span>
                        <span className="font-mono text-indigo-400">{Math.round(newOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.10"
                        max="1.0"
                        step="0.05"
                        value={newOpacity}
                        onChange={e => setNewOpacity(parseFloat(e.target.value))}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>Stroke Width</span>
                        <span className="font-mono text-indigo-400">{newWidth}px</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="24"
                        step="0.5"
                        value={newWidth}
                        onChange={e => setNewWidth(parseFloat(e.target.value))}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingPreset(false)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCreatePreset}
                      className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-md flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save & Activate Preset</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Presets List */}
              <div className="space-y-2.5">
                {presets.map((preset, index) => {
                  const isEditing = editingPresetId === preset.id;
                  const isActive =
                    settings.activePresetId === preset.id ||
                    (settings.penColor.toLowerCase() === preset.color.toLowerCase() &&
                      settings.penWidth === preset.strokeWidth &&
                      Math.abs((settings.penOpacity ?? 1) - (preset.opacity ?? 1)) < 0.05 &&
                      settings.activeTool === (preset.tool || 'fountain'));

                  if (isEditing) {
                    return (
                      <div
                        key={preset.id}
                        className="rounded-2xl bg-slate-950 border border-indigo-500/50 p-4 space-y-3 shadow-lg"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-300 uppercase tracking-wide">
                            Edit Preset
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingPresetId(null)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => saveEditing(preset.id)}
                              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-500 shadow-sm"
                            >
                              <Check className="w-3 h-3" />
                              <span>Save</span>
                            </button>
                          </div>
                        </div>

                        <div>
                          <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-400"
                            placeholder="Preset Name"
                          />
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

                        {/* Color Swatches */}
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

                        {/* Sliders */}
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
                      {/* Preset Details */}
                      <div
                        className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                        onClick={() => handleSelectPreset(preset)}
                      >
                        {/* Visual Swatch */}
                        <div className="relative w-8 h-8 rounded-full border border-slate-700 bg-slate-900 shrink-0 flex items-center justify-center overflow-hidden">
                          <div
                            className="absolute inset-0 rounded-full"
                            style={{
                              backgroundColor: preset.color,
                              opacity: preset.opacity ?? 1
                            }}
                          />
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

                        {/* Wave SVG */}
                        <div className="hidden sm:block w-24 h-6 bg-slate-900 rounded-lg p-0.5 border border-slate-800">
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

                      {/* Actions */}
                      <div className="flex items-center gap-1 ml-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMovePreset(index, 'up')}
                          disabled={index === 0}
                          className="p-1.5 text-slate-400 hover:text-white disabled:opacity-20 transition"
                          title="Move Up"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMovePreset(index, 'down')}
                          disabled={index === presets.length - 1}
                          className="p-1.5 text-slate-400 hover:text-white disabled:opacity-20 transition"
                          title="Move Down"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => startEditing(preset)}
                          className="p-1.5 text-slate-400 hover:text-indigo-400 transition"
                          title="Edit Preset"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePreset(preset.id, preset.name)}
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
            </div>
          )}

          {/* TAB 3: STYLUS PEN SHORTCUTS */}
          {activeTab === 'stylus' && (
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    <PenTool className="w-4 h-4 text-indigo-400" />
                    <span>Stylus Pen Hardware Button Mapping</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Assign quick actions to stylus side barrel switches and digital eraser tips
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                {/* Barrel Button 1 */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div>
                    <p className="text-xs font-bold text-slate-200">Primary Barrel Switch (Lower Side Button)</p>
                    <p className="text-[10px] text-slate-400">Lower side button on active stylus</p>
                  </div>
                  <select
                    value={stylusShortcuts.barrelButton1}
                    onChange={e => handleUpdateStylusShortcut('barrelButton1', e.target.value as StylusAction)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                  >
                    {STYLUS_ACTION_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Barrel Button 2 */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div>
                    <p className="text-xs font-bold text-slate-200">Secondary Barrel Switch (Upper Side Button)</p>
                    <p className="text-[10px] text-slate-400">Upper side button on active stylus</p>
                  </div>
                  <select
                    value={stylusShortcuts.barrelButton2}
                    onChange={e => handleUpdateStylusShortcut('barrelButton2', e.target.value as StylusAction)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                  >
                    {STYLUS_ACTION_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Eraser Tip */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div>
                    <p className="text-xs font-bold text-slate-200">Eraser Tip / Tail Switch</p>
                    <p className="text-[10px] text-slate-400">Digital eraser tip or top tail clicker</p>
                  </div>
                  <select
                    value={stylusShortcuts.eraserSwitch}
                    onChange={e => handleUpdateStylusShortcut('eraserSwitch', e.target.value as StylusAction)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                  >
                    {STYLUS_ACTION_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
