import React, { useState, useEffect } from 'react';
import { NotebookPage, Stroke } from '../../types/notebook';
import { db } from '../../db/database';
import {
  Plus,
  Trash2,
  Copy,
  X,
  FilePlus,
  Bookmark,
  BookmarkCheck,
  ChevronUp,
  ChevronDown,
  Layers,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

interface PageThumbnailSidebarProps {
  isOpen: boolean;
  pages: NotebookPage[];
  currentPageIndex: number;
  onClose: () => void;
  onSelectPage: (index: number) => void;
  onInsertPage: (index: number) => void;
  onDuplicatePage: (index: number) => void;
  onDeletePage: (index: number) => void;
  onToggleBookmark: (page: NotebookPage) => void;
  onOpenBookmarkModal: (page: NotebookPage, index: number) => void;
}

const PageThumbnailCanvas: React.FC<{ page: NotebookPage; isCurrent: boolean }> = ({ page, isCurrent }) => {
  const [strokes, setStrokes] = useState<Stroke[]>([]);

  useEffect(() => {
    let isMounted = true;
    db.strokes
      .where('pageId')
      .equals(page.id)
      .toArray()
      .then(list => {
        if (isMounted) setStrokes(list.filter(s => !s.deletedAt));
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [page.id]);

  const viewBox = `0 0 ${page.width || 800} ${page.height || 1050}`;

  return (
    <div
      className={`w-full h-36 rounded-xl border relative overflow-hidden flex flex-col justify-between p-2 select-none shadow-inner transition-all ${
        isCurrent ? 'border-amber-400 ring-2 ring-amber-400/50' : 'border-slate-800'
      }`}
      style={{ backgroundColor: page.background?.color || '#fefcf0' }}
    >
      {/* Background Paper Lines & Grids */}
      {page.background?.type === 'ruled' && (
        <div className="absolute inset-0 pointer-events-none opacity-25 bg-[linear-gradient(to_bottom,#2563eb_1px,transparent_1px)] bg-[size:100%_14px]" />
      )}
      {page.background?.type === 'graph' && (
        <div className="absolute inset-0 pointer-events-none opacity-25 bg-[linear-gradient(to_right,#2563eb_1px,transparent_1px),linear-gradient(to_bottom,#2563eb_1px,transparent_1px)] bg-[size:12px_12px]" />
      )}
      {page.background?.type === 'dotted' && (
        <div className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(#2563eb_1px,transparent_1px)] bg-[size:12px_12px]" />
      )}

      {/* SVG Live Rendered Strokes */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={viewBox} preserveAspectRatio="xMidYMid meet">
        {strokes.map(s => {
          if (!s.points || s.points.length === 0) return null;
          const pointsStr = s.points.map(p => `${p.x},${p.y}`).join(' ');
          return (
            <polyline
              key={s.id}
              points={pointsStr}
              fill="none"
              stroke={s.color || '#000000'}
              strokeWidth={Math.max(2, s.width || 3)}
              strokeOpacity={s.opacity ?? 1}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
      </svg>

      {/* Page Index & Bookmark Tags Header */}
      <div className="relative z-10 flex items-center justify-between">
        <span
          className={`text-[10px] font-mono font-black px-2 py-0.5 rounded shadow-sm border ${
            isCurrent
              ? 'bg-amber-400 text-slate-950 border-amber-300'
              : 'bg-slate-900/90 text-slate-200 border-slate-700'
          }`}
        >
          P.{page.pageIndex + 1}
        </span>

        {page.isBookmarked && (
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white shadow-sm truncate max-w-[100px]"
            style={{ backgroundColor: page.bookmarkColor || '#f59e0b' }}
          >
            {page.bookmarkTag || 'Bookmarked'}
          </span>
        )}
      </div>

      {/* Page Layout Badge Footer */}
      <div className="relative z-10 flex items-center justify-between text-[9px] font-bold text-slate-700 bg-white/85 backdrop-blur-sm px-2 py-0.5 rounded border border-slate-300/80">
        <span className="uppercase tracking-wider font-mono">{page.background?.type || 'ruled'}</span>
        <span className="text-slate-600 font-medium">
          {strokes.length} {strokes.length === 1 ? 'stroke' : 'strokes'}
        </span>
      </div>
    </div>
  );
};

export const PageThumbnailSidebar: React.FC<PageThumbnailSidebarProps> = ({
  isOpen,
  pages,
  currentPageIndex,
  onClose,
  onSelectPage,
  onInsertPage,
  onDuplicatePage,
  onDeletePage,
  onToggleBookmark,
  onOpenBookmarkModal
}) => {
  const [activeTab, setActiveTab] = useState<'thumbnails' | 'toc'>('thumbnails');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('All');

  if (!isOpen) return null;

  const bookmarkedPages = pages.filter(p => p.isBookmarked);
  const availableTags = Array.from(
    new Set(bookmarkedPages.map(p => p.bookmarkTag).filter(Boolean))
  ) as string[];

  const filteredBookmarks = bookmarkedPages.filter(p => {
    if (selectedTagFilter === 'All') return true;
    return p.bookmarkTag === selectedTagFilter;
  });

  return (
    <aside className="w-72 border-r border-slate-800 bg-[#0b0f17]/95 backdrop-blur-md flex flex-col h-full z-20 shrink-0 select-none animate-in slide-in-from-left-4">
      {/* Sidebar Header & Tab Switching */}
      <div className="p-3 border-b border-slate-800 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Page Management ({pages.length})</span>
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('thumbnails')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'thumbnails'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Thumbnails</span>
          </button>

          <button
            onClick={() => setActiveTab('toc')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'toc'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>TOC ({bookmarkedPages.length})</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Clickable Page Thumbnails List */}
      {activeTab === 'thumbnails' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
          {pages.map((page, idx) => {
            const isCurrent = idx === currentPageIndex;

            return (
              <div
                key={page.id}
                onClick={() => onSelectPage(idx)}
                className={`group relative rounded-2xl border p-2 cursor-pointer transition ${
                  isCurrent
                    ? 'border-amber-400 bg-amber-500/10 shadow-xl ring-1 ring-amber-400/50'
                    : 'border-slate-800/80 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/40'
                }`}
              >
                {/* Bookmark Button Badge */}
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onOpenBookmarkModal(page, idx);
                  }}
                  className={`absolute top-3 right-3 z-10 p-1.5 rounded-full border shadow-md transition ${
                    page.isBookmarked
                      ? 'bg-amber-400 border-amber-300 text-slate-950 scale-110'
                      : 'bg-slate-900/80 border-slate-700 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-amber-400'
                  }`}
                  title={page.isBookmarked ? 'Edit Bookmark' : 'Bookmark Page'}
                >
                  <Bookmark className="w-3.5 h-3.5 fill-current" />
                </button>

                {/* Live Rendered Canvas Thumbnail */}
                <PageThumbnailCanvas page={page} isCurrent={isCurrent} />

                {/* Page Action Toolbar Bar */}
                <div className="mt-2 flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`text-xs font-bold truncate ${
                        isCurrent ? 'text-amber-300' : 'text-slate-300'
                      }`}
                    >
                      {page.bookmarkTitle || `Page ${idx + 1}`}
                    </span>
                    {isCurrent && (
                      <span className="text-[9px] font-mono font-extrabold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 shrink-0">
                        ACTIVE
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onInsertPage(idx + 1);
                      }}
                      className="rounded p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition"
                      title="Insert Page After"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onDuplicatePage(idx);
                      }}
                      className="rounded p-1 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition"
                      title="Duplicate Page"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {pages.length > 1 && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onDeletePage(idx);
                        }}
                        className="rounded p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                        title="Delete Page"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Table of Contents */}
      {activeTab === 'toc' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar flex flex-col">
          {availableTags.length > 0 && (
            <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-slate-800 custom-scrollbar">
              <button
                onClick={() => setSelectedTagFilter('All')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition ${
                  selectedTagFilter === 'All'
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                All ({bookmarkedPages.length})
              </button>
              {availableTags.map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedTagFilter(t)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition ${
                    selectedTagFilter === t
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          {filteredBookmarks.length > 0 ? (
            <div className="space-y-2 flex-1">
              {filteredBookmarks.map(p => {
                const pIndex = pages.findIndex(pg => pg.id === p.id);
                const isCurrent = pIndex === currentPageIndex;

                return (
                  <div
                    key={p.id}
                    onClick={() => onSelectPage(pIndex)}
                    className={`group relative rounded-xl border p-3 cursor-pointer transition flex items-center justify-between ${
                      isCurrent
                        ? 'border-amber-400 bg-amber-500/10 shadow-md ring-1 ring-amber-400/40'
                        : 'border-slate-800/90 bg-slate-950/60 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className="absolute left-0 top-2 bottom-2 w-1 rounded-r"
                      style={{ backgroundColor: p.bookmarkColor || '#f59e0b' }}
                    />

                    <div className="pl-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded font-mono">
                          P.{pIndex + 1}
                        </span>
                        {p.bookmarkTag && (
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            {p.bookmarkTag}
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-white truncate mt-1">
                        {p.bookmarkTitle || `Page ${pIndex + 1}`}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onOpenBookmarkModal(p, pIndex);
                        }}
                        className="p-1 rounded text-slate-500 hover:text-amber-400 hover:bg-slate-800 transition"
                        title="Edit Bookmark"
                      >
                        <BookmarkCheck className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
              <div className="p-3 rounded-full bg-slate-900 border border-slate-800 text-amber-400 mb-3">
                <Bookmark className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-white mb-1">No Bookmarks Yet</p>
              <p className="text-[11px] text-slate-500 mb-4">
                Bookmark key pages to create a structured Table of Contents for quick navigation.
              </p>
              <button
                onClick={() =>
                  onOpenBookmarkModal(pages[currentPageIndex], currentPageIndex)
                }
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition shadow-lg"
              >
                <Bookmark className="w-3.5 h-3.5 fill-current" />
                <span>Bookmark Page {currentPageIndex + 1}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add New Page Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-900">
        <button
          onClick={() => onInsertPage(pages.length)}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800 border border-slate-700 py-2.5 text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-700 transition"
        >
          <FilePlus className="w-4 h-4 text-amber-400" />
          <span>Add New Page</span>
        </button>
      </div>
    </aside>
  );
};
