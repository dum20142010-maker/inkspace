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
  onOpen,
  onFavorite,
  onDelete,
  onDuplicate,
  onRename
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(notebook.title);

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
            <span key={i} className="bg-amber-400/30 text-amber-200 font-bold px-0.5 rounded">
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

  // Derive layout badge if not provided
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

  // Derive stats summary if not provided
  const statsSummary =
    notebook.statsSummary ||
    `${notebook.pageCount || 1} Pages • ${notebook.pdfDocId ? 'PDF Annotations' : 'Vector Ink'}`;

  // Derive subtitle
  const subtitle = notebook.subtitle || notebook.title;

  // Derive tag and tag style
  const tag =
    notebook.tag ||
    (notebook.paperType === 'cornell'
      ? '#Architecture'
      : notebook.paperType === 'graph'
      ? '#Physics'
      : notebook.paperType === 'dotted'
      ? '#Private'
      : notebook.paperType === 'blank'
      ? '#Roadmap'
      : '#Onboarding');

  const getTagColorClass = (t: string) => {
    if (t.includes('Arch') || t.includes('Schem')) return 'text-amber-400';
    if (t.includes('Phys') || t.includes('Math')) return 'text-emerald-400';
    if (t.includes('Roadmap') || t.includes('UX')) return 'text-purple-400';
    if (t.includes('Private') || t.includes('Vault')) return 'text-amber-300';
    if (t.includes('Onboarding') || t.includes('Guide')) return 'text-sky-400';
    return 'text-indigo-400';
  };

  // Spine styling
  const spineColor =
    notebook.spineMaterial === 'cobalt'
      ? '#1e3a8a'
      : notebook.spineMaterial === 'emerald'
      ? '#065f46'
      : notebook.spineMaterial === 'violet'
      ? '#581c87'
      : notebook.spineMaterial === 'kraft'
      ? '#78350f'
      : '#090d16';

  const ribbonColor =
    notebook.spineMaterial === 'cobalt' || notebook.coverColor.includes('blue')
      ? '#f59e0b'
      : notebook.spineMaterial === 'emerald'
      ? '#10b981'
      : notebook.spineMaterial === 'violet'
      ? '#c084fc'
      : '#e2e8f0';

  return (
    <div className="group relative flex flex-col rounded-2xl bg-[#0f1420] border border-slate-800/90 hover:border-slate-700 hover:shadow-2xl hover:shadow-black/70 transition-all duration-200 overflow-hidden select-none">
      {/* Folio Book Cover */}
      <div
        onClick={() => onOpen(notebook.id)}
        className="relative h-56 w-full cursor-pointer overflow-hidden flex flex-col justify-between transition-transform duration-300 group-hover:scale-[1.01]"
        style={{
          backgroundColor: notebook.coverColor || '#1e3a8a',
          backgroundImage:
            notebook.paperType === 'graph'
              ? 'radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)'
              : notebook.paperType === 'dotted'
              ? 'radial-gradient(rgba(255, 255, 255, 0.12) 1.5px, transparent 1.5px)'
              : 'none',
          backgroundSize: '16px 16px'
        }}
      >
        {/* Tactile Book Spine on Left */}
        <div
          className="absolute left-0 top-0 bottom-0 w-6 z-20 flex flex-col justify-around items-center border-r border-black/40 shadow-[2px_0_10px_rgba(0,0,0,0.5)]"
          style={{ backgroundColor: spineColor }}
        >
          {/* Subtle spine stitch dashes */}
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="w-1.5 h-3 rounded-full bg-black/40 border-t border-b border-white/10" />
          ))}
        </div>

        {/* Hanging Bookmark Ribbon Flag */}
        <div
          className="absolute top-0 left-7 w-3.5 h-6 z-20 shadow-md"
          style={{
            backgroundColor: ribbonColor,
            clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 75%, 0% 100%)'
          }}
        />

        {/* Top Header Strip inside Cover */}
        <div className="z-10 pl-8 pr-3 pt-2.5 flex items-center justify-between">
          <span className="rounded-md bg-black/40 backdrop-blur-md px-2 py-0.5 text-[10px] font-mono font-bold text-slate-200 tracking-wider">
            {layoutBadge}
          </span>

          <div className="flex items-center gap-1.5">
            {/* Context Badge for specific types */}
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
            {notebook.title.includes('Product Vision') && (
              <span className="rounded-md bg-black/40 px-1.5 py-0.5 text-[9px] font-mono font-bold text-purple-300 flex items-center gap-1">
                <Users className="w-2.5 h-2.5" />
                +3
              </span>
            )}
            {notebook.title.includes('Marginalia') && (
              <span className="rounded-md bg-black/40 p-1 text-amber-400">
                <Lock className="w-3 h-3" />
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

            {/* Context Menu Trigger */}
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="rounded-full p-1 hover:bg-black/40 text-slate-300 hover:text-white transition"
              title="Folio actions"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Center Title & Aesthetic Doodles/Diagrams */}
        <div className="z-10 pl-8 pr-4 py-2 flex flex-col justify-center flex-1">
          <h3 className="font-serif text-lg sm:text-xl font-bold text-white tracking-tight leading-snug line-clamp-2 drop-shadow-md">
            {renderHighlightedText(notebook.title, searchQuery)}
          </h3>

          {/* Graphical Doodle / Schematic / Orbit Accent */}
          <div className="mt-2 flex items-center justify-between">
            {notebook.graphicType === 'schematic' || notebook.title.includes('Pipeline') ? (
              /* Connected rectangular node pipeline diagram */
              <div className="flex items-center gap-1 opacity-70">
                <div className="w-4 h-3 rounded-xs border border-white/70" />
                <div className="w-2 h-[1px] bg-white/70" />
                <div className="w-4 h-3 rounded-xs border border-white/70" />
                <div className="w-2 h-[1px] bg-white/70" />
                <div className="w-4 h-3 rounded-xs border border-white/70" />
              </div>
            ) : notebook.graphicType === 'orbit' || notebook.title.includes('Dynamics') ? (
              /* Wave orbit */
              <svg className="w-16 h-5 opacity-75" viewBox="0 0 60 20">
                <ellipse cx="30" cy="10" rx="25" ry="7" fill="none" stroke="#34d399" strokeWidth="1.5" strokeDasharray="2 2" />
              </svg>
            ) : notebook.graphicType === 'wireframe' || notebook.title.includes('Vision') ? (
              /* Wireframe app layout */
              <div className="w-9 h-5 rounded-xs border border-purple-300/80 p-0.5 flex gap-0.5 opacity-75">
                <div className="w-2.5 h-full bg-purple-300/30 rounded-xs" />
                <div className="flex-1 h-full flex flex-col gap-0.5">
                  <div className="w-full h-1.5 bg-purple-300/30 rounded-xs" />
                  <div className="w-full flex-1 bg-purple-300/20 rounded-xs" />
                </div>
              </div>
            ) : notebook.graphicType === 'lock' || notebook.title.includes('Marginalia') ? (
              /* Dotted keyhole ornament */
              <div className="flex items-center gap-1 opacity-60">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
                <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
                <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
              </div>
            ) : (
              /* Star & Wave handwriting flourish */
              <div className="flex items-center gap-1.5 opacity-80">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <svg className="w-12 h-3" viewBox="0 0 50 10">
                  <path d="M 2 5 Q 12 0, 24 5 T 48 5" fill="none" stroke="#fef08a" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Cover Metadata */}
        <div className="z-10 pl-8 pr-4 pb-2.5 text-[11px] font-mono text-slate-200/90 drop-shadow-sm">
          {statsSummary}
        </div>
      </div>

      {/* Card Info Footer */}
      <div className="p-3.5 flex flex-col gap-1 border-t border-slate-800/80 bg-[#0d1117]">
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
              className="flex items-center gap-1.5 truncate cursor-pointer hover:text-white transition flex-1 min-w-0"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
              <span className="text-xs font-semibold text-slate-200 truncate">
                {renderHighlightedText(subtitle, searchQuery)}
              </span>
            </div>
          )}

          {/* Classification Tag */}
          <span className={`text-[11px] font-mono font-semibold shrink-0 ${getTagColorClass(tag)}`}>
            {tag}
          </span>
        </div>

        {/* Timestamp */}
        <div className="text-[11px] text-slate-400 flex items-center justify-between">
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
          className="absolute right-2 top-10 z-40 w-44 rounded-2xl bg-slate-900 border border-slate-800 p-1.5 shadow-2xl text-xs text-slate-200 animate-in fade-in duration-150"
        >
          <button
            type="button"
            onClick={() => {
              setShowMenu(false);
              onOpen(notebook.id);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-800 text-left transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Open Folio</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsEditingTitle(true);
              setShowMenu(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-800 text-left transition"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-400" />
            <span>Rename Folio</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onDuplicate(notebook.id);
              setShowMenu(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-800 text-left transition"
          >
            <Copy className="w-3.5 h-3.5 text-slate-400" />
            <span>Duplicate Folio</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onFavorite(notebook.id, !notebook.isFavorite);
              setShowMenu(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-800 text-left transition"
          >
            <Star className="w-3.5 h-3.5 text-amber-400" />
            <span>{notebook.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}</span>
          </button>
          <div className="h-[1px] bg-slate-800 my-1" />
          <button
            type="button"
            onClick={() => {
              onDelete(notebook.id);
              setShowMenu(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-rose-500/20 text-rose-400 text-left transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete to Trash</span>
          </button>
        </div>
      )}
    </div>
  );
};
