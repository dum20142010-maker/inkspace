import React, { useState } from 'react';
import { PenTool, PlusCircle } from 'lucide-react';
import { PaperType } from '../../types/notebook';

interface QuickStudioCardProps {
  onCreateNotebook: (config: {
    title: string;
    coverColor: string;
    paperType: PaperType;
    paperColor: string;
    orientation: 'portrait' | 'landscape';
    pageSize: 'A4' | 'Letter';
    spineMaterial?: 'cobalt' | 'obsidian' | 'kraft' | 'violet';
  }) => void;
}

const SPINE_MATERIALS: { id: 'cobalt' | 'obsidian' | 'kraft' | 'violet'; label: string; color: string }[] = [
  { id: 'cobalt', label: 'Cobalt', color: '#1e40af' },
  { id: 'obsidian', label: 'Obsidian', color: '#18181b' },
  { id: 'kraft', label: 'Kraft', color: '#78350f' },
  { id: 'violet', label: 'Violet', color: '#581c87' }
];

const PAPER_GEOMETRIES: { id: PaperType; label: string }[] = [
  { id: 'dotted', label: 'Dot Grid 5mm' },
  { id: 'ruled', label: 'Ruled 7mm' },
  { id: 'cornell', label: 'Cornell Split' },
  { id: 'graph', label: 'Hexagon' }
];

export const QuickStudioCard: React.FC<QuickStudioCardProps> = ({ onCreateNotebook }) => {
  const [selectedSpine, setSelectedSpine] = useState<'cobalt' | 'obsidian' | 'kraft' | 'violet'>('cobalt');
  const [selectedPaper, setSelectedPaper] = useState<PaperType>('ruled');
  const [isInitializing, setIsInitializing] = useState(false);

  const handleInitialize = () => {
    setIsInitializing(true);
    const spineObj = SPINE_MATERIALS.find(s => s.id === selectedSpine) || SPINE_MATERIALS[0];
    const paperObj = PAPER_GEOMETRIES.find(p => p.id === selectedPaper) || PAPER_GEOMETRIES[1];

    onCreateNotebook({
      title: `Folio — ${spineObj.label} ${paperObj.label.split(' ')[0]}`,
      coverColor: spineObj.color,
      paperType: selectedPaper,
      paperColor: selectedPaper === 'ruled' || selectedPaper === 'dotted' ? '#fefcf0' : '#ffffff',
      orientation: 'portrait',
      pageSize: 'A4',
      spineMaterial: selectedSpine
    });

    setTimeout(() => setIsInitializing(false), 500);
  };

  return (
    <div className="relative flex flex-col justify-between rounded-2xl bg-[#0e131f] border border-slate-800/90 hover:border-slate-700/80 p-5 shadow-xl select-none min-h-[360px]">
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between">
          <div className="p-2 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/25">
            <PenTool className="w-4 h-4" />
          </div>

          <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 tracking-wider">
            QUICK STUDIO
          </span>
        </div>

        {/* Title & Description */}
        <div className="mt-3">
          <h3 className="font-serif text-xl font-bold text-white tracking-tight">
            Create New Folio
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed mt-1">
            Configure binding spine, paper grid grain, and launch high-fidelity ink workspace.
          </p>
        </div>

        {/* Spine Material Finish */}
        <div className="mt-4">
          <span className="block text-[10px] font-mono tracking-wider font-bold text-slate-400 uppercase mb-1.5">
            SPINE MATERIAL FINISH
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {SPINE_MATERIALS.map(spine => (
              <button
                key={spine.id}
                type="button"
                onClick={() => setSelectedSpine(spine.id)}
                className={`px-3 py-1 rounded-lg text-xs transition ${
                  selectedSpine === spine.id
                    ? spine.id === 'cobalt'
                      ? 'bg-[#2563eb] text-white font-bold shadow-md'
                      : spine.id === 'violet'
                      ? 'bg-[#7c3aed] text-white font-bold shadow-md'
                      : spine.id === 'kraft'
                      ? 'bg-[#92400e] text-white font-bold shadow-md'
                      : 'bg-slate-700 text-white font-bold shadow-md'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {spine.label}
              </button>
            ))}
          </div>
        </div>

        {/* Paper Geometry */}
        <div className="mt-3">
          <span className="block text-[10px] font-mono tracking-wider font-bold text-slate-400 uppercase mb-1.5">
            PAPER GEOMETRY
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {PAPER_GEOMETRIES.map(geom => (
              <button
                key={geom.id}
                type="button"
                onClick={() => setSelectedPaper(geom.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition border ${
                  selectedPaper === geom.id
                    ? 'bg-slate-800 text-white border-slate-600 font-semibold'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {geom.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bind & Initialize Folio Button */}
      <div className="mt-5 pt-3 border-t border-slate-800/80">
        <button
          type="button"
          onClick={handleInitialize}
          disabled={isInitializing}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#c4b5fd] hover:bg-[#b8a5fc] text-slate-950 font-bold text-xs shadow-lg shadow-purple-500/10 transition active:scale-[0.98]"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{isInitializing ? 'Binding Folio...' : 'Bind & Initialize Folio'}</span>
        </button>
      </div>
    </div>
  );
};
