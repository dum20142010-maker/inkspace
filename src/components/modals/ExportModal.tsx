import React, { useState } from 'react';
import { Notebook } from '../../types/notebook';
import { Share2, FileText, Image as ImageIcon, Download, X, Loader2, Check } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  notebook: Notebook;
  currentPageIndex: number;
  totalPages: number;
  onClose: () => void;
  onExportPNG: (pageIndex: number) => Promise<void>;
  onExportPDF: (onProgress: (current: number, total: number) => void) => Promise<void>;
  onExportJSON: () => Promise<void>;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  notebook,
  currentPageIndex,
  totalPages,
  onClose,
  onExportPNG,
  onExportPDF,
  onExportJSON
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportStage, setExportStage] = useState<string>('');

  if (!isOpen) return null;

  const handleExportPNGClick = async () => {
    setIsExporting(true);
    setExportStage('Rendering PNG page...');
    try {
      await onExportPNG(currentPageIndex);
    } finally {
      setIsExporting(false);
      onClose();
    }
  };

  const handleExportPDFClick = async () => {
    setIsExporting(true);
    setExportStage('Preparing PDF document...');
    try {
      await onExportPDF((current, total) => {
        setExportStage(`Converting page ${current} of ${total} to PDF...`);
      });
    } catch (err) {
      console.error('Failed to export PDF', err);
    } finally {
      setIsExporting(false);
      onClose();
    }
  };

  const handleExportJSONClick = async () => {
    setIsExporting(true);
    setExportStage('Packaging notebook backup data...');
    try {
      await onExportJSON();
    } finally {
      setIsExporting(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Export Notebook</h2>
              <p className="text-xs text-slate-400">{notebook.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="rounded-xl p-2 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Export In-Progress Indicator */}
        {isExporting && (
          <div className="my-4 flex items-center gap-3 p-3.5 rounded-2xl bg-indigo-950/50 border border-indigo-800/50 text-indigo-200 text-xs animate-in fade-in">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400 shrink-0" />
            <span className="font-semibold">{exportStage}</span>
          </div>
        )}

        {/* Export Options */}
        <div className="py-5 space-y-3">
          {/* PDF Document Export */}
          <button
            onClick={handleExportPDFClick}
            disabled={isExporting}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 hover:border-indigo-500 hover:bg-slate-800 transition text-left group disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Download PDF Document</span>
                  <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-1.5 py-0.5 rounded font-mono">
                    jsPDF
                  </span>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Converts all {totalPages} pages & handwriting strokes into a printable PDF
                </p>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 shrink-0" />
          </button>

          {/* PNG Page Export */}
          <button
            onClick={handleExportPNGClick}
            disabled={isExporting}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 hover:border-indigo-500 hover:bg-slate-800 transition text-left group disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 group-hover:scale-110 transition-transform">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">PNG Page Image</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  High-resolution image of current Page {currentPageIndex + 1}
                </p>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 shrink-0" />
          </button>

          {/* Native SEEN Backup Export */}
          <button
            onClick={handleExportJSONClick}
            disabled={isExporting}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 hover:border-purple-500 hover:bg-slate-800 transition text-left group disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-600/20 text-purple-400 group-hover:scale-110 transition-transform">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">SEEN Data Backup (.seen)</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Full vector notebook backup including all strokes and shapes
                </p>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-purple-400 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
};
