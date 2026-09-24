import React from 'react';
import { ToolSettings } from '../../types/notebook';
import { DEFAULT_PEN_PRESETS } from '../../db/database';
import { X, Settings, ShieldAlert, Sparkles, Sliders, Database, HardDrive, Check, RotateCcw } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  settings: ToolSettings;
  onClose: () => void;
  onUpdateSettings: (newSettings: ToolSettings) => void;
  onClearStorage: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onUpdateSettings,
  onClearStorage
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">App Settings</h2>
              <p className="text-xs text-slate-400">Configure stylus, palm rejection & storage</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toggles */}
        <div className="py-6 space-y-4">
          {/* Palm Rejection */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/50 border border-slate-800">
            <div>
              <p className="text-xs font-bold text-white">Palm Rejection</p>
              <p className="text-[11px] text-slate-400">Ignore touch gestures while stylus is active</p>
            </div>
            <button
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
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/50 border border-slate-800">
            <div>
              <p className="text-xs font-bold text-white">Pressure Sensitivity</p>
              <p className="text-[11px] text-slate-400">Dynamic stroke thickness based on pen pressure</p>
            </div>
            <button
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
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/50 border border-slate-800">
            <div>
              <p className="text-xs font-bold text-white">Auto Shape Recognition</p>
              <p className="text-[11px] text-slate-400">Auto-convert rough strokes to geometric shapes</p>
            </div>
            <button
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

          {/* Custom Pen Presets Overview */}
          <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">Custom Pen Presets</p>
                <p className="text-[11px] text-slate-400">
                  {settings.penPresets?.length || 0} saved styles for quick switching in the notebook toolbar
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Reset pen presets back to factory defaults?')) {
                    onUpdateSettings({
                      ...settings,
                      penPresets: DEFAULT_PEN_PRESETS,
                      activePresetId: DEFAULT_PEN_PRESETS[0].id
                    });
                  }
                }}
                className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 transition"
                title="Reset to default presets"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Defaults</span>
              </button>
            </div>

            {/* Chips Preview */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {(settings.penPresets || []).map(preset => (
                <div
                  key={preset.id}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-slate-300"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-slate-600"
                    style={{ backgroundColor: preset.color, opacity: preset.opacity ?? 1 }}
                  />
                  <span>{preset.name}</span>
                  <span className="text-[9px] font-mono text-slate-500">{preset.strokeWidth}px</span>
                </div>
              ))}
            </div>
          </div>

          {/* IndexedDB Storage Reset */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-white">Clear Local Storage</p>
              <p className="text-[11px] text-slate-400">Reset IndexedDB database & reinstall welcome sample</p>
            </div>
            <button
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
