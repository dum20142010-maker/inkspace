import React from 'react';
import { PenTool, Activity, Sparkles, Gauge } from 'lucide-react';

interface StylusPressureHUDProps {
  activeTool: string;
  penColor: string;
  baseWidth: number;
  currentPressure: number; // 0.0 - 1.0
  isWriting: boolean;
}

export const StylusPressureHUD: React.FC<StylusPressureHUDProps> = ({
  activeTool,
  penColor,
  baseWidth,
  currentPressure,
  isWriting
}) => {
  if (!isWriting && currentPressure === 0) return null;

  const pressurePercent = Math.round((currentPressure || 0.5) * 100);
  const calculatedWidth = Math.max(1, baseWidth * (0.3 + (currentPressure || 0.5) * 1.4)).toFixed(1);

  return (
    <div className="absolute top-4 left-6 z-30 pointer-events-none flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-[#0c1017]/90 border border-amber-500/40 text-slate-100 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95">
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full shadow-sm animate-pulse"
          style={{ backgroundColor: penColor || '#f59e0b' }}
        />
        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-300">
          Stylus Pressure
        </span>
      </div>

      {/* Pressure Gauge Bar */}
      <div className="flex items-center gap-2">
        <div className="w-20 h-2.5 rounded-full bg-slate-800 overflow-hidden border border-slate-700/80">
          <div
            className="h-full rounded-full transition-all duration-75 bg-gradient-to-r from-amber-500 via-indigo-500 to-purple-500"
            style={{ width: `${pressurePercent}%` }}
          />
        </div>
        <span className="text-xs font-mono font-bold text-white min-w-[36px] text-right">
          {pressurePercent}%
        </span>
      </div>

      {/* Modulated Stroke Width Preview */}
      <div className="pl-2 border-l border-slate-800 flex items-center gap-2">
        <span className="text-[10px] font-mono text-slate-400">Modulated Width:</span>
        <span className="text-xs font-mono font-bold text-emerald-400">{calculatedWidth}px</span>
      </div>
    </div>
  );
};
