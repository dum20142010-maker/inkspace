import React from 'react';
import { ToolSettings, StylusAction } from '../../types/notebook';
import { X, PenTool, Check, ShieldAlert, Sparkles, Zap, Eraser, MousePointer } from 'lucide-react';

interface StylusShortcutsModalProps {
  isOpen: boolean;
  settings: ToolSettings;
  onClose: () => void;
  onUpdateSettings: (newSettings: ToolSettings) => void;
}

const STYLUS_ACTION_OPTIONS: { label: string; value: StylusAction; desc: string; icon: React.ReactNode }[] = [
  { label: 'None (Disabled)', value: 'none', desc: 'No action triggered', icon: <X className="w-3.5 h-3.5 text-slate-500" /> },
  { label: 'Undo', value: 'undo', desc: 'Undo last stroke or action', icon: <span className="font-mono text-xs font-bold text-amber-400">↶</span> },
  { label: 'Redo', value: 'redo', desc: 'Redo previously undone action', icon: <span className="font-mono text-xs font-bold text-amber-400">↷</span> },
  { label: 'Eraser Mode', value: 'eraser', desc: 'Switch active tool to eraser', icon: <Eraser className="w-3.5 h-3.5 text-rose-400" /> },
  { label: 'Highlighter Mode', value: 'highlighter', desc: 'Switch active tool to highlighter', icon: <Sparkles className="w-3.5 h-3.5 text-amber-300" /> },
  { label: 'Laser Pointer', value: 'laser', desc: 'Switch to temporary laser pointer', icon: <Zap className="w-3.5 h-3.5 text-amber-400" /> },
  { label: 'Select / Lasso', value: 'select', desc: 'Switch to lasso selection tool', icon: <MousePointer className="w-3.5 h-3.5 text-indigo-400" /> },
  { label: 'Auto Shape Recognition', value: 'shape', desc: 'Switch to geometric shape tool', icon: <PenTool className="w-3.5 h-3.5 text-emerald-400" /> },
  { label: 'OCR Transcript', value: 'ocr', desc: 'Open handwriting OCR transcript', icon: <Sparkles className="w-3.5 h-3.5 text-purple-400" /> },
  { label: 'Bookmark Page', value: 'bookmark', desc: 'Open bookmark & TOC dialog', icon: <Check className="w-3.5 h-3.5 text-blue-400" /> }
];

export const StylusShortcutsModal: React.FC<StylusShortcutsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onUpdateSettings
}) => {
  if (!isOpen) return null;

  const stylusShortcuts = settings.stylusShortcuts || {
    barrelButton1: 'eraser',
    barrelButton2: 'select',
    eraserSwitch: 'undo'
  };

  const handleUpdateShortcut = (
    buttonKey: 'barrelButton1' | 'barrelButton2' | 'eraserSwitch',
    newAction: StylusAction
  ) => {
    const next = { ...stylusShortcuts };

    // Strict 1-to-1 exclusivity constraint:
    // If newAction is already assigned to another stylus button, automatically set that other button to 'none'
    if (newAction !== 'none') {
      if (next.barrelButton1 === newAction && buttonKey !== 'barrelButton1') {
        next.barrelButton1 = 'none';
      }
      if (next.barrelButton2 === newAction && buttonKey !== 'barrelButton2') {
        next.barrelButton2 = 'none';
      }
      if (next.eraserSwitch === newAction && buttonKey !== 'eraserSwitch') {
        next.eraserSwitch = 'none';
      }
    }

    next[buttonKey] = newAction;
    onUpdateSettings({
      ...settings,
      stylusShortcuts: next
    });
  };

  const getActionDetails = (actionVal: StylusAction) => {
    return STYLUS_ACTION_OPTIONS.find(o => o.value === actionVal) || STYLUS_ACTION_OPTIONS[0];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Stylus Button Shortcuts & Layout</h2>
              <p className="text-xs text-slate-400">Map physical pen switches to exclusive shortcuts without action overlap</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="my-4 space-y-5 overflow-y-auto pr-1">
          {/* Visual Stylus Pen Diagram Layout */}
          <div className="relative rounded-2xl bg-gradient-to-r from-slate-950 via-[#0d1322] to-slate-950 border border-slate-800/80 p-5 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="absolute top-3 left-3 flex items-center gap-1.5 text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider">
              <Zap className="w-3 h-3" />
              <span>Active Stylus Hardware Schematic</span>
            </div>

            {/* Stylus Graphic Illustration */}
            <div className="w-full sm:w-1/2 flex items-center justify-center py-6">
              <div className="relative w-64 h-16 flex items-center">
                {/* Pen Body Cylinder */}
                <div className="absolute inset-x-6 h-8 rounded-full bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 border border-slate-600/50 shadow-inner flex items-center justify-between px-4">
                  {/* Tail Eraser Cap */}
                  <div className="w-4 h-6 rounded-l-md bg-slate-500 border-r border-slate-700 flex items-center justify-center text-[8px] font-mono text-slate-950 font-bold" title="Eraser Tip / Tail Switch">
                    CAP
                  </div>

                  {/* Barrel Button 2 */}
                  <div className="px-2 py-1 rounded bg-indigo-500 text-white text-[9px] font-bold shadow-md cursor-pointer animate-pulse" title="Side Switch B">
                    Btn B
                  </div>

                  {/* Barrel Button 1 */}
                  <div className="px-2 py-1 rounded bg-indigo-600 text-white text-[9px] font-bold shadow-md cursor-pointer" title="Side Switch A">
                    Btn A
                  </div>
                </div>

                {/* Pen Tip Cone */}
                <div className="absolute right-0 w-8 h-4 bg-gradient-to-r from-slate-700 to-amber-200 rounded-r-full clip-path-cone shadow-md" title="Active Ink Nib" />
              </div>
            </div>

            {/* Quick Exclusivity Explanation */}
            <div className="w-full sm:w-1/2 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300 bg-amber-500/10 px-3 py-2 rounded-xl border border-amber-500/20">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Strict Exclusivity Guard Active</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Each button on your stylus is mapped to a unique action. If you assign an action (e.g. <strong className="text-white">Eraser Mode</strong>) to Side Switch A, it is automatically unassigned from any other button to prevent action conflicts.
              </p>
            </div>
          </div>

          {/* Configuration Cards for Each Stylus Switch */}
          <div className="space-y-3">
            {/* Side Switch A */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-indigo-500/40 transition">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Side Switch A (Lower Barrel)</span>
                </div>
                <h4 className="text-xs font-bold text-white mt-0.5">Primary Barrel Button Shortcut</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Current: <strong className="text-indigo-300">{getActionDetails(stylusShortcuts.barrelButton1).label}</strong> — {getActionDetails(stylusShortcuts.barrelButton1).desc}
                </p>
              </div>

              <select
                value={stylusShortcuts.barrelButton1}
                onChange={e => handleUpdateShortcut('barrelButton1', e.target.value as StylusAction)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
              >
                {STYLUS_ACTION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Side Switch B */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-indigo-500/40 transition">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Side Switch B (Upper Barrel)</span>
                </div>
                <h4 className="text-xs font-bold text-white mt-0.5">Secondary Barrel Button Shortcut</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Current: <strong className="text-indigo-300">{getActionDetails(stylusShortcuts.barrelButton2).label}</strong> — {getActionDetails(stylusShortcuts.barrelButton2).desc}
                </p>
              </div>

              <select
                value={stylusShortcuts.barrelButton2}
                onChange={e => handleUpdateShortcut('barrelButton2', e.target.value as StylusAction)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
              >
                {STYLUS_ACTION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Eraser Tip / Tail Switch */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-indigo-500/40 transition">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Top Tail Cap / Eraser Tip</span>
                </div>
                <h4 className="text-xs font-bold text-white mt-0.5">Rear Cap / Digital Eraser Switch</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Current: <strong className="text-indigo-300">{getActionDetails(stylusShortcuts.eraserSwitch).label}</strong> — {getActionDetails(stylusShortcuts.eraserSwitch).desc}
                </p>
              </div>

              <select
                value={stylusShortcuts.eraserSwitch}
                onChange={e => handleUpdateShortcut('eraserSwitch', e.target.value as StylusAction)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
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

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 font-mono">
            Changes apply instantly to active pen hardware & canvas
          </span>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition shadow-lg shadow-amber-400/20 active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>Save & Close</span>
          </button>
        </div>
      </div>
    </div>
  );
};
