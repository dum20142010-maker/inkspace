import React, { useState, useEffect, useRef } from 'react';
import { SearchResultItem } from '../../types/notebook';
import { searchHandwrittenNotebooks } from '../../engine/ocrScanner';
import { Search, X, ChevronRight, FileText, Sparkles, CornerDownLeft } from 'lucide-react';

interface FindInNotebookModalProps {
  isOpen: boolean;
  notebookId: string;
  currentPageIndex: number;
  onClose: () => void;
  onJumpToPage: (pageIndex: number) => void;
}

export const FindInNotebookModal: React.FC<FindInNotebookModalProps> = ({
  isOpen,
  notebookId,
  currentPageIndex,
  onClose,
  onJumpToPage
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const found = await searchHandwrittenNotebooks(query, notebookId);
        // Exclude title matches since we are searching inside this notebook
        const pageMatches = found.filter(r => r.pageIndex !== undefined);
        setResults(pageMatches);
      } catch (err) {
        console.error('Search in notebook error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, notebookId]);

  if (!isOpen) return null;

  const highlightSnippet = (snippet: string, keyword: string) => {
    if (!keyword.trim()) return snippet;
    const parts = snippet.split(new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === keyword.toLowerCase() ? (
            <mark key={i} className="bg-amber-400/30 text-amber-200 font-bold px-0.5 rounded">
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/60 backdrop-blur-xs"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[75vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Search Header Input */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-900/90">
          <Search className="w-5 h-5 text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'Enter' && results.length > 0 && results[0].pageIndex !== undefined) {
                onJumpToPage(results[0].pageIndex);
                onClose();
              }
            }}
            placeholder="Search handwritten notes on all pages..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Clear query"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs font-semibold text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition"
          >
            Esc
          </button>
        </div>

        {/* Search Results List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {query.trim() === '' ? (
            <div className="py-8 text-center text-xs text-slate-500">
              <Sparkles className="w-6 h-6 text-indigo-400/50 mx-auto mb-2" />
              <p>Type keywords to search strokes, handwritten text, or typed notes.</p>
              <p className="text-[11px] text-slate-600 mt-1">Press Enter to jump to the first match.</p>
            </div>
          ) : isSearching ? (
            <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
              <span>Scanning notebook OCR records...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              <p className="font-semibold text-slate-300">No matches found for &ldquo;{query}&rdquo;</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Make sure the page has been scanned with the OCR tool, or try alternate keywords.
              </p>
            </div>
          ) : (
            results.map((item, idx) => {
              const isCurrent = item.pageIndex === currentPageIndex;
              return (
                <button
                  key={`${item.pageId}_${idx}`}
                  onClick={() => {
                    if (item.pageIndex !== undefined) {
                      onJumpToPage(item.pageIndex);
                      onClose();
                    }
                  }}
                  className={`w-full text-left p-3 rounded-2xl border transition flex items-start justify-between gap-3 ${
                    isCurrent
                      ? 'bg-indigo-600/15 border-indigo-500/40 text-white'
                      : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-slate-700">
                        Page {(item.pageIndex ?? 0) + 1}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        {item.matchType === 'handwriting_ocr' ? (
                          <>
                            <Sparkles className="w-3 h-3 text-indigo-400" />
                            <span>Handwriting OCR</span>
                          </>
                        ) : (
                          <>
                            <FileText className="w-3 h-3 text-emerald-400" />
                            <span>Text Box</span>
                          </>
                        )}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] text-emerald-400 font-semibold ml-auto">
                          Current Page
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {highlightSnippet(item.snippet, query)}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 shrink-0 mt-2" />
                </button>
              );
            })
          )}
        </div>

        {/* Footer info */}
        {results.length > 0 && (
          <div className="p-3 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-[11px] text-slate-400">
            <span>
              Found <strong className="text-white">{results.length}</strong> {results.length === 1 ? 'match' : 'matches'}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-slate-500">
              <span>Press</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[9px] text-slate-300">
                Enter ↵
              </kbd>
              <span>to jump</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
