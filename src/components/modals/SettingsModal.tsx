import React from 'react';
import { ToolSettings, StylusAction } from '../../types/notebook';
import { DEFAULT_PEN_PRESETS } from '../../db/database';
import {
  X,
  Settings,
  Sparkles,
  Sliders,
  Database,
  RotateCcw,
  Moon,
  Sun,
  PenTool,
  Check
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

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onUpdateSettings,
  onClearStorage
}) => {
  if (!isOpen) return null;

  const currentTheme = settings.appTheme || 'dark';
  const stylusShortcuts = settings.stylusShortcuts || {
    barrelButton1: 'eraser',
    barrelButton2: 'select',
    eraserSwitch: 'undo'
  };

  const handleUpdateStylusShortcut = (
    buttonKey: 'barrelButton1' | 'barrelButton2' | 'eraserSwitch',
    newAction: StylusAction
  ) => {
    const next = { ...stylusShortcuts };
    // Enforce exclusivity: same action cannot be assigned to multiple stylus buttons
    if (newAction !== 'none') {
      if (next.barrelButton1 === newAction && buttonKey !== 'barrelButton1') next.barrelButton1 = 'none';
      if (next.barrelButton2 === newAction && buttonKey !== 'barrelButton2') next.barrelButton2 = 'none';
      if (next.eraserSwitch === newAction && buttonKey !== 'eraserSwitch') next.eraserSwitch = 'none';
    }
    next[buttonKey] = newAction;
    onUpdateSettings({ ...settings, stylusShortcuts: next });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">App Preferences & Stylus Shortcuts</h2>
              <p className="text-xs text-slate-400">Configure global theme, stylus buttons & drawing engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options Body */}
        <div className="py-6 space-y-6">
          {/* 1. Global Theme Switcher */}
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

          {/* 2. Stylus Pen Button Shortcuts Layout */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <PenTool className="w-4 h-4 text-indigo-400" />
                  <span>Stylus Pen Button Shortcuts</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Assign actions to stylus barrel buttons and tail switch. (Exclusive mapping: each action can only be assigned to one button at a time).
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {/* Barrel Button 1 */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div>
                  <p className="text-xs font-bold text-slate-200">Primary Barrel Button (Side Switch 1)</p>
                  <p className="text-[10px] text-slate-400">Lower side switch on active stylus</p>
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
                  <p className="text-xs font-bold text-slate-200">Secondary Barrel Button (Side Switch 2)</p>
                  <p className="text-[10px] text-slate-400">Upper side switch on active stylus</p>
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

              {/* Eraser Tip / Tail Switch */}
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

          {/* 3. Drawing Engine Toggles */}
          <div className="space-y-3">
            {/* Palm Rejection */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800">
              <div>
                <p className="text-xs font-bold text-white">Palm Rejection</p>
                <p className="text-[11px] text-slate-400">Ignore touch gestures while stylus is active</p>
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
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800">
              <div>
                <p className="text-xs font-bold text-white">Pressure Sensitivity</p>
                <p className="text-[11px] text-slate-400">Dynamic stroke thickness based on pen pressure</p>
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
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800">
              <div>
                <p className="text-xs font-bold text-white">Auto Shape Recognition</p>
                <p className="text-[11px] text-slate-400">Auto-convert rough strokes to geometric shapes</p>
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

          {/* 4. IndexedDB Storage Reset */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-white">Clear Local Storage</p>
              <p className="text-[11px] text-slate-400">Reset IndexedDB database & reinstall welcome sample</p>
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
      </div>
    </div>
  );
};
