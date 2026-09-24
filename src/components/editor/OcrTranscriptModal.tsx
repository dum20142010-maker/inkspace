import React, { useState, useEffect } from 'react';
import { NotebookPage, Stroke, TextObject, PageOcrRecord } from '../../types/notebook';
import {
  scanPageStrokesOCR,
  scanNotebookOCR,
  getPageOcrRecord,
  updatePageOcrTranscript
} from '../../engine/ocrScanner';
import {
  Sparkles,
  X,
  Copy,
  Check,
  RefreshCw,
  FileText,
  Edit3,
  Save,
  Layers,
  Cpu
} from 'lucide-react';

interface OcrTranscriptModalProps {
  isOpen: boolean;
  notebookId: string;
  currentPage: NotebookPage;
  strokes: Stroke[];
  texts: TextObject[];
  onClose: () => void;
}

export const OcrTranscriptModal: React.FC<OcrTranscriptModalProps> = ({
  isOpen,
  notebookId,
  currentPage,
  strokes,
  texts,
  onClose
}) => {
  const [ocrRecord, setOcrRecord] = useState<PageOcrRecord | null>(null);
  const [isScanningPage, setIsScanningPage] = useState(false);
  const [isScanningNotebook, setIsScanningNotebook] = useState(false);
  const [notebookProgress, setNotebookProgress] = useState<{ current: number; total: number } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [copied, setCopied] = useState(false);

  // Load existing OCR record for this page
  useEffect(() => {
    if (isOpen && currentPage) {
      getPageOcrRecord(currentPage.id).then(rec => {
        if (rec) {
          setOcrRecord(rec);
          setEditedText(rec.recognizedText);
        } else {
          setOcrRecord(null);
          setEditedText('');
        }
      });
      setIsEditing(false);
    }
  }, [isOpen, currentPage]);

  if (!isOpen) return null;

  const handleScanCurrentPage = async () => {
    setIsScanningPage(true);
    try {
      const rec = await scanPageStrokesOCR(currentPage, strokes, texts);
      setOcrRecord(rec);
      setEditedText(rec.recognizedText);
    } catch (err) {
      console.error('Page OCR scan error:', err);
    } finally {
      setIsScanningPage(false);
    }
  };

  const handleScanEntireNotebook = async () => {
    setIsScanningNotebook(true);
    setNotebookProgress({ current: 0, total: 1 });
    try {
      const records = await scanNotebookOCR(notebookId, (curr, tot) => {
        setNotebookProgress({ current: curr, total: tot });
      });
      // Update current page record if it was scanned
      const currentRec = records.find(r => r.pageId === currentPage.id);
      if (currentRec) {
        setOcrRecord(currentRec);
        setEditedText(currentRec.recognizedText);
      }
    } catch (err) {
      console.error('Notebook OCR scan error:', err);
    } finally {
      setIsScanningNotebook(false);
      setNotebookProgress(null);
    }
  };

  const handleCopyText = async () => {
    const textToCopy = isEditing ? editedText : ocrRecord?.recognizedText || '';
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Clipboard copy error:', err);
    }
  };

  const handleSaveEdits = async () => {
    await updatePageOcrTranscript(currentPage.id, editedText);
    const updated = await getPageOcrRecord(currentPage.id);
    if (updated) setOcrRecord(updated);
    setIsEditing(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Handwriting OCR & Search Index</h3>
              <p className="text-xs text-slate-400">
                Page {currentPage.pageIndex + 1} &bull; {strokes.length} handwriting strokes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
          {/* Status & Engine Badge */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/80">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Scan Status:</span>
              {ocrRecord?.status === 'completed' ? (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[11px]">
                  <Check className="w-3 h-3" />
                  Indexed
                </span>
              ) : (
                <span className="font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-[11px]">
                  Not Scanned Yet
                </span>
              )}
            </div>

            {ocrRecord && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                <span className="capitalize">
                  {ocrRecord.engineUsed === 'gemini'
                    ? 'Gemini Vision AI'
                    : ocrRecord.engineUsed === 'manual'
                    ? 'User Verified'
                    : 'Stroke Cluster Engine'}
                </span>
              </div>
            )}
          </div>

          {/* Notebook Bulk Scan Progress */}
          {isScanningNotebook && notebookProgress && (
            <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-800/50 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-indigo-300">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Scanning Notebook Pages...
                </span>
                <span>
                  {notebookProgress.current} / {notebookProgress.total} Pages
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.round((notebookProgress.current / Math.max(1, notebookProgress.total)) * 100)}%`
                  }}
                />
              </div>
            </div>
          )}

          {/* Transcribed Text Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                Transcribed Plain Text
              </label>

              <div className="flex items-center gap-2">
                {ocrRecord && !isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-300 hover:text-white transition"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                )}
                {isEditing && (
                  <button
                    onClick={handleSaveEdits}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-[11px] font-bold text-white transition"
                  >
                    <Save className="w-3 h-3" />
                    <span>Save</span>
                  </button>
                )}
                <button
                  onClick={handleCopyText}
                  disabled={!ocrRecord?.recognizedText && !editedText}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-300 hover:text-white disabled:opacity-40 transition"
                  title="Copy recognized text to clipboard"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                </button>
              </div>
            </div>

            {isEditing ? (
              <textarea
                value={editedText}
                onChange={e => setEditedText(e.target.value)}
                placeholder="Type or edit handwriting transcript..."
                rows={7}
                className="w-full rounded-2xl bg-slate-950/80 border border-slate-700 p-4 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 custom-scrollbar leading-relaxed"
              />
            ) : ocrRecord?.recognizedText ? (
              <div className="w-full rounded-2xl bg-slate-950/70 border border-slate-800/90 p-4 text-xs font-mono text-slate-200 whitespace-pre-wrap max-h-56 overflow-y-auto custom-scrollbar leading-relaxed">
                {ocrRecord.recognizedText}
              </div>
            ) : (
              <div className="w-full rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 p-8 text-center text-xs text-slate-500">
                <p>No handwritten text scanned yet for this page.</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  Click &ldquo;Scan Page Now&rdquo; below to scan your stylus handwriting strokes into searchable text.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Action Buttons Footer */}
        <div className="p-5 border-t border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={handleScanEntireNotebook}
            disabled={isScanningNotebook || isScanningPage}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-200 hover:text-white disabled:opacity-40 transition"
          >
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Scan Entire Notebook</span>
          </button>

          <button
            onClick={handleScanCurrentPage}
            disabled={isScanningPage || isScanningNotebook}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs font-bold text-white shadow-xl shadow-indigo-600/20 disabled:opacity-40 active:scale-98 transition"
          >
            {isScanningPage ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Scanning Strokes...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Scan Page Now</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
