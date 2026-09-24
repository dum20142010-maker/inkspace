import React, { useState } from 'react';
import { PaperType, PaperOrientation, PageSize } from '../../types/notebook';
import { X, Book, Sparkles, FileText, FileDown } from 'lucide-react';

interface CreateNotebookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (config: {
    title: string;
    coverColor: string;
    paperType: PaperType;
    paperColor: string;
    orientation: PaperOrientation;
    pageSize: PageSize;
    pdfFile?: File;
  }) => void;
}

const COVER_COLORS = [
  '#3b82f6', // Indigo Blue
  '#0d9488', // Emerald Teal
  '#d97706', // Warm Amber
  '#e11d48', // Coral Pink
  '#7c3aed', // Purple
  '#1e293b', // Midnight Slate
  '#059669', // Forest Green
  '#ea580c'  // Terracotta
];

const PAPER_COLORS = [
  { name: 'Warm Cream', value: '#fefcf0' },
  { name: 'Pure White', value: '#ffffff' },
  { name: 'Soft Dark', value: '#1e293b' },
  { name: 'Pastel Blue', value: '#f0f9ff' }
];

const PAPER_TYPES: { type: PaperType; label: string; desc: string }[] = [
  { type: 'ruled', label: 'Ruled', desc: 'Classic horizontal lines with red margin' },
  { type: 'lined', label: 'Lined', desc: 'Simple horizontal college lines' },
  { type: 'graph', label: 'Graph / Grid', desc: 'Square grid for formulas, engineering & math' },
  { type: 'dotted', label: 'Dotted', desc: 'Subtle dot matrix for bullet journaling & diagrams' },
  { type: 'cornell', label: 'Cornell Notes', desc: 'Cue column, notes area & bottom summary block' },
  { type: 'blank', label: 'Blank Canvas', desc: 'Clean unruled sheet for freeform sketches' },
  { type: 'checklist', label: 'Checklist', desc: 'Task boxes for daily planning' },
  { type: 'music', label: 'Music Staff', desc: '5-line staves for musical notation' }
];

export const CreateNotebookModal: React.FC<CreateNotebookModalProps> = ({
  isOpen,
  onClose,
  onCreate
}) => {
  const [title, setTitle] = useState('Untitled Notebook');
  const [coverColor, setCoverColor] = useState('#3b82f6');
  const [paperType, setPaperType] = useState<PaperType>('ruled');
  const [paperColor, setPaperColor] = useState('#fefcf0');
  const [orientation, setOrientation] = useState<PaperOrientation>('portrait');
  const [pageSize, setPageSize] = useState<PageSize>('A4');
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onCreate({
      title,
      coverColor,
      paperType,
      paperColor,
      orientation,
      pageSize,
      pdfFile: pdfFile || undefined
    });
    onClose();
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPdfFile(file);
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-3xl bg-[#0e131f] border border-slate-800 p-6 shadow-2xl text-slate-100 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/20">
              <Book className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-white">Create New Folio</h2>
              <p className="text-xs text-slate-400">Customize cover, paper style, or import a PDF</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-6 pr-1 custom-scrollbar">
          {/* PDF Import Shortcut */}
          <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-800/40 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <FileDown className="w-6 h-6 text-indigo-400 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-indigo-200">Import PDF Document</p>
                <p className="text-[11px] text-slate-400">
                  {pdfFile ? pdfFile.name : 'Annotate lecture slides, books, or worksheets'}
                </p>
              </div>
            </div>
            <label className="cursor-pointer rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition shrink-0">
              {pdfFile ? 'Change PDF' : 'Select PDF'}
              <input type="file" accept="application/pdf" onChange={handlePdfChange} className="hidden" />
            </label>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Notebook Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              placeholder="e.g. Organic Chemistry, Daily Journal, Strategy Pitch"
            />
          </div>

          {/* Cover Color Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Cover Color</label>
            <div className="flex items-center gap-3 flex-wrap">
              {COVER_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setCoverColor(color)}
                  className={`w-9 h-9 rounded-xl border-2 transition-transform ${
                    coverColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Paper Type Grid */}
          {!pdfFile && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Paper Template</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {PAPER_TYPES.map(pt => (
                  <button
                    key={pt.type}
                    type="button"
                    onClick={() => setPaperType(pt.type)}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between h-24 ${
                      paperType === pt.type
                        ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-md'
                        : 'border-slate-800 bg-slate-800/50 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold">{pt.label}</p>
                      <p className="text-[10px] text-slate-400 mt-1 leading-snug line-clamp-2">{pt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Paper Color & Orientation */}
          {!pdfFile && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">Paper Tone</label>
                <div className="flex items-center gap-2">
                  {PAPER_COLORS.map(pc => (
                    <button
                      key={pc.value}
                      type="button"
                      onClick={() => setPaperColor(pc.value)}
                      className={`flex-1 py-2 px-2 rounded-xl border text-[11px] font-medium text-center transition ${
                        paperColor === pc.value
                          ? 'border-indigo-500 text-white bg-slate-800'
                          : 'border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {pc.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">Orientation</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOrientation('portrait')}
                    className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                      orientation === 'portrait'
                        ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300'
                        : 'border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    Portrait (A4)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrientation('landscape')}
                    className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                      orientation === 'landscape'
                        ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300'
                        : 'border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    Landscape
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-[#c4b5fd] hover:bg-[#b8a5fc] px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-purple-500/10 active:scale-95 transition"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>Create Folio</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
