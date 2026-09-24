import React, { useState, useEffect } from 'react';
import { NotebookPage } from '../../types/notebook';
import { Bookmark, BookmarkCheck, X, Tag, Palette, Check, Trash2 } from 'lucide-react';

interface BookmarkPageModalProps {
  isOpen: boolean;
  page: NotebookPage;
  pageIndex: number;
  onClose: () => void;
  onSaveBookmark: (updatedPage: NotebookPage) => void;
}

const BOOKMARK_TAGS = [
  'Key Concept',
  'Summary',
  'Formula',
  'Exam Topic',
  'Action Item',
  'Important',
  'Definition',
  'Diagram'
];

const RIBBON_COLORS = [
  { name: 'Cobalt', hex: '#3b82f6' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Violet', hex: '#8b5cf6' },
  { name: 'Cyan', hex: '#06b6d4' }
];

export const BookmarkPageModal: React.FC<BookmarkPageModalProps> = ({
  isOpen,
  page,
  pageIndex,
  onClose,
  onSaveBookmark
}) => {
  const [isBookmarked, setIsBookmarked] = useState<boolean>(!!page.isBookmarked);
  const [title, setTitle] = useState<string>(page.bookmarkTitle || `Page ${pageIndex + 1}`);
  const [tag, setTag] = useState<string>(page.bookmarkTag || 'Key Concept');
  const [color, setColor] = useState<string>(page.bookmarkColor || '#3b82f6');

  useEffect(() => {
    setIsBookmarked(!!page.isBookmarked);
    setTitle(page.bookmarkTitle || `Page ${pageIndex + 1}`);
    setTag(page.bookmarkTag || 'Key Concept');
    setColor(page.bookmarkColor || '#3b82f6');
  }, [page, pageIndex]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveBookmark({
      ...page,
      isBookmarked: true,
      bookmarkTitle: title.trim() || `Page ${pageIndex + 1}`,
      bookmarkTag: tag,
      bookmarkColor: color,
      updatedAt: Date.now()
    });
    onClose();
  };

  const handleRemove = () => {
    onSaveBookmark({
      ...page,
      isBookmarked: false,
      bookmarkTitle: undefined,
      bookmarkTag: undefined,
      bookmarkColor: undefined,
      updatedAt: Date.now()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl bg-[#0c1017] border border-slate-800 shadow-2xl p-6 text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Bookmark className="w-5 h-5 fill-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Bookmark Page {pageIndex + 1}</h3>
              <p className="text-xs text-slate-400">Add to Notebook Table of Contents</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Controls */}
        <div className="mt-5 space-y-4">
          {/* Bookmark Title */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Bookmark Title / Subject
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={`e.g. Chapter 3: Vector Calculus`}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>

          {/* Preset Tag Pill Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Tag Category
            </label>
            <div className="flex flex-wrap gap-1.5">
              {BOOKMARK_TAGS.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTag(t)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition ${
                    tag === t
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Color Ribbon Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Ribbon Color
            </label>
            <div className="flex items-center gap-3">
              {RIBBON_COLORS.map(c => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  className={`w-7 h-7 rounded-full border-2 transition flex items-center justify-center ${
                    color === c.hex ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                >
                  {color === c.hex && <Check className="w-4 h-4 text-white drop-shadow" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
          {page.isBookmarked ? (
            <button
              onClick={handleRemove}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition"
            >
              <Trash2 className="w-4 h-4" />
              <span>Remove Bookmark</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/30"
            >
              <BookmarkCheck className="w-4 h-4" />
              <span>Save Bookmark</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
