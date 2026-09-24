import React, { useState } from 'react';
import { Notebook, SearchResultItem } from '../../types/notebook';
import {
  Star,
  MoreVertical,
  Trash2,
  Copy,
  Edit3,
  Sparkles,
  Lock,
  Check,
  Share2,
  FolderInput,
  Users
} from 'lucide-react';

interface NotebookCardProps {
  notebook: Notebook;
  searchQuery?: string;
  matchedSnippets?: SearchResultItem[];
  currentTheme?: 'dark' | 'light';
  onOpen: (id: string, pageIndex?: number) => void;
  onFavorite: (id: string, isFav: boolean) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
}

export const NotebookCard: React.FC<NotebookCardProps> = ({
  notebook,
  searchQuery = '',
  matchedSnippets = [],
  currentTheme = 'dark',
  onOpen,
  onFavorite,
  onDelete,
  onDuplicate,
  onRename
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(notebook.title);

  const isLight = currentTheme === 'light';

  const formatRelativeTime = (ms: number) => {
    const diff = Date.now() - ms;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `Modified ${mins} mins ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Updated ${hours} hr${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Updated Yesterday';
    if (days < 7) return `Updated ${days} days ago`;
    const d = new Date(ms);
    return `Updated ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const renderHighlightedText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <span key={i} className="bg-amber-400/30 text-amber-300 font-bold px-0.5 rounded">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const handleTitleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (titleInput.trim()) {
      onRename(notebook.id, titleInput.trim());
    }
    setIsEditingTitle(false);
  };

  const layoutBadge =
    notebook.layoutBadge ||
    (notebook.paperType === 'ruled'
      ? 'RULED • 7MM'
      : notebook.paperType === 'cornell'
      ? 'CORNELL LAYOUT'
      : notebook.paperType === 'graph'
      ? 'GRAPH • 5MM'
      : notebook.paperType === 'dotted'
      ? 'DOTTED • 4MM'
      : 'BLANK CANVAS');

  const statsSummary =
    notebook.statsSummary ||
    `${notebook.pageCount || 1} Pages • ${notebook.pdfDocId ? 'PDF Annotations' : 'Vector Ink'}`;

  const subtitle = notebook.subtitle || 'Tap to open handwriting & sketch canvas';
  const tag = notebook.tag || '#Notes';

  const getTagColorClass = (t: string) => {
    switch (t.toLowerCase()) {
      case '#architecture & tech':
        return 'text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md';
      case '#research':
        return 'text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md';
      case '#sketches & ink':
        return 'text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md';
      default:
        return 'text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md';
    }
  };

  return (
    <div
      onClick={() => onOpen(notebook.id)}
      className={`group relative flex flex-col rounded-2xl ${
        isLight
          ? 'bg-white border-slate-200 shadow-md hover:border-slate-300'
          : 'bg-[#0e131f] border-slate-800/90 shadow-xl hover:border-slate-700/80'
      } border overflow-hidden select-none transition cursor-pointer`}
    >
      {/* Notebook Cover / Header Mockup */}
      <div
        className="relative h-44 w-full flex flex-col justify-between p-3.5 overflow-hidden transition-transform group-hover:scale-[1.01]"
        style={{
          backgroundColor: notebook.coverColor || '#1e40af',
          backgroundImage: 'radial-gradient(circle at 90% 10%, rgba(255,255,255,0.15) 0%, transparent 60%)'
        }}
      >
        {/* Spine Binding Effect on Left */}
        <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-black/40 via-black/20 to-transparent flex flex-col justify-around py-3 px-1 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-black/50 shadow-inner" />
          ))}
        </div>

        {/* Top Header Strip inside Cover */}
        <div className="z-10 pl-8 pr-3 pt-2.5 flex items-center justify-between">
          <span className="rounded-md bg-black/40 backdrop-blur-md px-2 py-0.5 text-[10px] font-mono font-bold text-slate-200 tracking-wider">
            {layoutBadge}
          </span>

          <div className="flex items-center gap-1.5">
            {notebook.title.includes('Pipeline') && (
              <span className="rounded-md bg-black/40 px-1.5 py-0.5 text-[9px] font-mono font-bold text-amber-300">
                P99 3.8ms
              </span>
            )}
            {notebook.title.includes('Dynamics') && (
              <span className="rounded-md bg-black/40 px-1.5 py-0.5 text-[9px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Synced
              </span>
            )}

            {/* Favorite Star */}
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onFavorite(notebook.id, !notebook.isFavorite);
              }}
              className="rounded-full p-1 hover:bg-black/40 text-white transition"
              title={notebook.isFavorite ? 'Remove Favorite' : 'Mark Favorite'}
            >
              <Star
                className={`w-3.5 h-3.5 ${
                  notebook.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-slate-300/80 hover:text-white'
                }`}
              />
            </button>

            {/* More Actions Menu Button */}
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="rounded-full p-1 hover:bg-black/40 text-white transition"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Center Title in Cover */}
        <div className="z-10 pl-8 pr-3 my-auto">
          <h3 className="font-serif text-lg font-bold text-white tracking-tight drop-shadow-md line-clamp-2">
            {renderHighlightedText(notebook.title, searchQuery)}
          </h3>

          <div className="mt-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
            <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
            <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
          </div>
        </div>

        {/* Bottom Cover Metadata */}
        <div className="z-10 pl-8 pr-4 pb-2.5 text-[11px] font-mono text-slate-200/90 drop-shadow-sm">
          {statsSummary}
        </div>
      </div>

      {/* Card Info Footer */}
      <div className={`p-3.5 flex flex-col gap-1 border-t ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0d1117] border-slate-800/80'}`}>
        <div className="flex items-center justify-between gap-2">
          {isEditingTitle ? (
            <form onSubmit={handleTitleSubmit} className="flex-1">
              <input
                type="text"
                value={titleInput}
                onChange={e => setTitleInput(e.target.value)}
                onBlur={handleTitleSubmit}
                autoFocus
                className="w-full rounded bg-slate-800 px-2 py-0.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </form>
          ) : (
            <div
              onClick={() => onOpen(notebook.id)}
              className={`flex items-center gap-1.5 truncate cursor-pointer ${isLight ? 'hover:text-slate-900 text-slate-700' : 'hover:text-white text-slate-200'} transition flex-1 min-w-0`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
              <span className={`text-xs font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'} truncate`}>
                {renderHighlightedText(subtitle, searchQuery)}
              </span>
            </div>
          )}

          <span className={`text-[11px] font-mono font-semibold shrink-0 ${getTagColorClass(tag)}`}>
            {tag}
          </span>
        </div>

        {/* Timestamp */}
        <div className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'} flex items-center justify-between`}>
          <span>{formatRelativeTime(notebook.updatedAt)}</span>
        </div>

        {/* Handwritten Search Snippet Match */}
        {matchedSnippets.length > 0 && (
          <div className="mt-1 pt-1.5 border-t border-slate-800/60 flex items-center gap-1 text-[10px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20 truncate">
            <Sparkles className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">"{matchedSnippets[0].snippet}"</span>
          </div>
        )}
      </div>

      {/* Popover Action Menu */}
      {showMenu && (
        <div
          onMouseLeave={() => setShowMenu(false)}
          className={`absolute right-3 top-16 z-30 w-44 rounded-2xl ${
            isLight ? 'bg-white border-slate-200 text-slate-800 shadow-xl' : 'bg-[#0e131f] border-slate-800 text-slate-200 shadow-2xl'
          } border p-2 text-xs space-y-1`}
        >
          <button
            onClick={e => {
              e.stopPropagation();
              setShowMenu(false);
              onOpen(notebook.id);
            }}
            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg ${isLight ? 'hover:bg-slate-100' : 'hover:bg-slate-800'} text-left transition`}
          >
            <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Open & Edit</span>
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              setShowMenu(false);
              setIsEditingTitle(true);
            }}
            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg ${isLight ? 'hover:bg-slate-100' : 'hover:bg-slate-800'} text-left transition`}
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
            <span>Rename Folio</span>
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              setShowMenu(false);
              onDuplicate(notebook.id);
            }}
            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg ${isLight ? 'hover:bg-slate-100' : 'hover:bg-slate-800'} text-left transition`}
          >
            <Copy className="w-3.5 h-3.5 text-emerald-400" />
            <span>Duplicate</span>
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              setShowMenu(false);
              onDelete(notebook.id);
            }}
            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg ${isLight ? 'hover:bg-rose-500/10 text-rose-600' : 'hover:bg-rose-500/20 text-rose-400'} text-left transition`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Move to Trash</span>
          </button>
        </div>
      )}
    </div>
  );
};
