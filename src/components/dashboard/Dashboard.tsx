import React, { useState, useRef, useEffect } from 'react';
import { Notebook, Folder, SortOption, SortDirection, User, SearchResultItem } from '../../types/notebook';
import { NotebookCard } from './NotebookCard';
import { QuickStudioCard } from './QuickStudioCard';
import { CreateNotebookModal } from './CreateNotebookModal';
import { ShareNotebookModal } from '../modals/ShareNotebookModal';
import { FriendsModal } from '../social/FriendsModal';
import { UserProfileModal } from '../auth/UserProfileModal';
import { NotificationsModal } from '../modals/NotificationsModal';
import { searchHandwrittenNotebooks } from '../../engine/ocrScanner';
import {
  BookOpen,
  Bookmark,
  Clock,
  Trash2,
  Plus,
  Search,
  Folder as FolderIcon,
  Sparkles,
  SlidersHorizontal,
  X,
  Bell,
  ChevronDown,
  Cloud,
  LayoutGrid,
  List,
  ArrowDown,
  ArrowUp,
  FolderPlus,
  Users,
  Share2,
  UserCheck
} from 'lucide-react';

interface DashboardProps {
  notebooks: Notebook[];
  folders: Folder[];
  currentUser: User | null;
  onOpenNotebook: (id: string, initialPageIndex?: number) => void;
  onCreateNotebook: (config: any) => void;
  onFavoriteNotebook: (id: string, isFav: boolean) => void;
  onDeleteNotebook: (id: string) => void;
  onDuplicateNotebook: (id: string) => void;
  onRenameNotebook: (id: string, newTitle: string) => void;
  onCreateFolder: (name: string) => void;
  onRestoreFromTrash: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  onOpenSettings: () => void;
  onOpenAuth: (mode: 'signin' | 'register' | 'recover') => void;
  onSignOut: () => void;
  onUpdateUser: (updatedUser: User) => void;
}

type TabType = 'my_notebooks' | 'shared_with_me' | 'favorites' | 'recent' | 'trash' | 'folder' | 'ocr';

const QUICK_FILTER_PILLS = [
  '#Architecture & Tech',
  'Lecture Notes',
  'Sketches & Ink',
  'PDF Annotations',
  'Cornell Split'
];

export const Dashboard: React.FC<DashboardProps> = ({
  notebooks,
  folders,
  currentUser,
  onOpenNotebook,
  onCreateNotebook,
  onFavoriteNotebook,
  onDeleteNotebook,
  onDuplicateNotebook,
  onRenameNotebook,
  onCreateFolder,
  onOpenSettings,
  onOpenAuth,
  onSignOut,
  onUpdateUser
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('my_notebooks');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [ocrMatches, setOcrMatches] = useState<SearchResultItem[]>([]);
  const [isSearchingOcr, setIsSearchingOcr] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [sortOption, setSortOption] = useState<SortOption>('recent');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedNotebookForShare, setSelectedNotebookForShare] = useState<Notebook | null>(null);

  const [showFolderInput, setShowFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounced search through titles and handwritten stroke OCR
  useEffect(() => {
    if (!searchQuery.trim()) {
      setOcrMatches([]);
      setIsSearchingOcr(false);
      return;
    }

    setIsSearchingOcr(true);
    const timer = setTimeout(async () => {
      try {
        const matches = await searchHandwrittenNotebooks(searchQuery);
        setOcrMatches(matches);
      } catch (err) {
        console.error('Dashboard OCR search error:', err);
      } finally {
        setIsSearchingOcr(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Keyboard shortcut '/' to focus search bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') ||
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter notebooks based on active navigation tab & search query
  const filteredNotebooks = notebooks.filter(nb => {
    // Trash tab filter
    if (activeTab === 'trash') {
      return nb.isDeleted;
    }
    if (nb.isDeleted) return false;

    // My Notebooks vs Shared With Me
    if (activeTab === 'my_notebooks') {
      if (currentUser && nb.ownerId && nb.ownerId !== currentUser.id && nb.isShared) {
        return false;
      }
    } else if (activeTab === 'shared_with_me') {
      if (!nb.isShared || (currentUser && nb.ownerId === currentUser.id)) {
        return false;
      }
    }

    // Classification tag filter
    if (selectedTagFilter) {
      const term = selectedTagFilter.replace('#', '').toLowerCase();
      const tagMatch =
        (nb.tag && nb.tag.toLowerCase().includes(term)) ||
        (nb.subtitle && nb.subtitle.toLowerCase().includes(term)) ||
        nb.title.toLowerCase().includes(term);
      if (!tagMatch) return false;
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const titleMatches =
        nb.title.toLowerCase().includes(q) ||
        (nb.subtitle && nb.subtitle.toLowerCase().includes(q)) ||
        (nb.tag && nb.tag.toLowerCase().includes(q));
      const handwritingMatches = ocrMatches.some(
        m => m.notebookId === nb.id && (m.matchType === 'handwriting_ocr' || m.matchType === 'text_box')
      );
      if (!titleMatches && !handwritingMatches) return false;
    }

    // Tab filters
    if (activeTab === 'favorites') return nb.isFavorite;
    if (activeTab === 'recent') return Date.now() - nb.updatedAt < 7 * 24 * 60 * 60 * 1000;
    if (activeTab === 'folder' && selectedFolderId) return nb.folderId === selectedFolderId;

    return true;
  });

  // Sort filtered notebooks
  const sortedNotebooks = [...filteredNotebooks].sort((a, b) => {
    let comparison = 0;
    if (sortOption === 'recent') {
      comparison = b.updatedAt - a.updatedAt;
    } else if (sortOption === 'alphabetical') {
      comparison = a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
    } else if (sortOption === 'created') {
      comparison = (b.createdAt || 0) - (a.createdAt || 0);
    }
    return sortDirection === 'asc' ? -comparison : comparison;
  });

  const handleOpenShareModal = (nb: Notebook) => {
    setSelectedNotebookForShare(nb);
    setIsShareModalOpen(true);
  };

  const handleFolderCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setShowFolderInput(false);
    }
  };

  const totalFoliosCount = notebooks.filter(n => !n.isDeleted).length;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#080b11] text-slate-100 font-sans select-none">
      {/* Left Sidebar */}
      <aside className="w-64 border-r border-slate-800/80 bg-[#0c1017] flex flex-col justify-between shrink-0 hidden md:flex z-20">
        <div className="flex flex-col flex-1 overflow-y-auto custom-scrollbar">
          {/* Top Brand: INKSPACE */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-amber-400 font-serif text-sm font-black tracking-widest uppercase">
                INKSPACE
              </span>
            </div>
            <button
              onClick={onOpenSettings}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition"
              title="App Settings & Presets"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Navigation Items */}
          <div className="px-3 pt-3">
            <span className="block px-3 text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase mb-2">
              NOTEBOOK ARCHIVE
            </span>
            <nav className="space-y-0.5">
              <button
                onClick={() => {
                  setActiveTab('my_notebooks');
                  setSelectedFolderId(null);
                  setSelectedTagFilter(null);
                }}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  activeTab === 'my_notebooks' && !selectedFolderId && !selectedTagFilter
                    ? 'bg-slate-800/70 border border-slate-700/60 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                }`}
              >
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>My Notebooks</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('shared_with_me');
                  setSelectedFolderId(null);
                  setSelectedTagFilter(null);
                }}
                className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  activeTab === 'shared_with_me'
                    ? 'bg-slate-800/70 border border-slate-700/60 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Share2 className="w-4 h-4 text-indigo-400" />
                  <span>Shared With Me</span>
                </div>
                {notebooks.some(n => n.isShared) && (
                  <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded">
                    {notebooks.filter(n => n.isShared).length}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  setActiveTab('favorites');
                  setSelectedFolderId(null);
                  setSelectedTagFilter(null);
                }}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  activeTab === 'favorites'
                    ? 'bg-slate-800/70 border border-slate-700/60 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                }`}
              >
                <Bookmark className="w-4 h-4" />
                <span>Favorites</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('recent');
                  setSelectedFolderId(null);
                  setSelectedTagFilter(null);
                }}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  activeTab === 'recent'
                    ? 'bg-slate-800/70 border border-slate-700/60 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Recent Activity</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('trash');
                  setSelectedFolderId(null);
                  setSelectedTagFilter(null);
                }}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  activeTab === 'trash'
                    ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                <span>Trash</span>
              </button>
            </nav>
          </div>

          {/* Folders */}
          <div className="px-3 pt-6">
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase">
                VOLUMES & FOLDERS
              </span>
              <button
                onClick={() => setShowFolderInput(true)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800/50 transition"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
            </div>

            {showFolderInput && (
              <form onSubmit={handleFolderCreateSubmit} className="px-2 mb-2">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  placeholder="Folder name..."
                  autoFocus
                  onBlur={() => setShowFolderInput(false)}
                  className="w-full rounded-lg bg-slate-800/80 border border-slate-700 px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </form>
            )}

            <div className="space-y-0.5">
              {folders.map(f => (
                <button
                  key={f.id}
                  onClick={() => {
                    setActiveTab('folder');
                    setSelectedFolderId(f.id);
                    setSelectedTagFilter(null);
                  }}
                  className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition ${
                    activeTab === 'folder' && selectedFolderId === f.id
                      ? 'bg-slate-800/70 text-indigo-300 border border-slate-700/60 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                  }`}
                >
                  <FolderIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{f.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sync Status Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-[#090d14]">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300 font-mono">Real-time WebSocket Sync</span>
            </div>
            <Cloud className="w-3.5 h-3.5 text-slate-500" />
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#080b11]">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-800/80 bg-[#0b0e16] px-6 flex items-center justify-between gap-4 shrink-0 z-30">
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-serif text-lg font-black tracking-wider text-white">
              InkSpace
            </span>
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-2 flex-1 max-w-xl mx-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search notebooks, handwritten OCR, text boxes... (Press /)"
                className="w-full rounded-2xl bg-[#111622] border border-slate-800 pl-10 pr-9 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Top Right Controls */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Friends Button */}
            <button
              onClick={() => setIsFriendsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111622] border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition text-xs font-bold"
              title="Friends & Connections"
            >
              <Users className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Friends</span>
            </button>

            {/* Notification Bell */}
            <button
              onClick={() => setIsNotificationsModalOpen(true)}
              className="relative p-2 rounded-xl bg-[#111622] border border-slate-800 text-slate-300 hover:text-white transition"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-[#0b0e16]" />
            </button>

            {/* + New Notebook Button */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 px-4 py-2 text-xs font-bold text-slate-950 shadow-md transition active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span className="hidden sm:inline">New Notebook</span>
            </button>

            {/* User Profile Avatar */}
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-[#111622] transition"
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-slate-950 shadow-sm"
                  style={{ backgroundColor: currentUser?.avatarColor || '#f59e0b' }}
                >
                  {currentUser?.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-bold text-white leading-tight">
                    {currentUser?.name || 'Collaborator'}
                  </span>
                  <span className="text-[10px] text-slate-400 leading-tight">
                    @{currentUser?.username || 'user'}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Dropdown */}
              {showUserDropdown && (
                <div
                  onMouseLeave={() => setShowUserDropdown(false)}
                  className="absolute right-0 top-11 z-40 w-48 rounded-2xl bg-[#0e131f] border border-slate-800 p-2 shadow-2xl text-xs text-slate-200"
                >
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      setIsProfileModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-800 text-left transition"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>User Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      onOpenSettings();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-800 text-left transition"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Settings</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      onSignOut();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400 text-left transition mt-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-6">
            <div>
              <h1 className="font-serif text-3xl font-bold text-white">
                {activeTab === 'my_notebooks' && 'My Private & Active Notebooks'}
                {activeTab === 'shared_with_me' && 'Notebooks Shared With Me'}
                {activeTab === 'favorites' && 'Favorite Notebooks'}
                {activeTab === 'recent' && 'Recent Notebook Activity'}
                {activeTab === 'trash' && 'Trash / Deleted Manuscripts'}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Real-time multi-user handwriting, PDF annotation, and collaborative ink canvas.
              </p>
            </div>

            {/* Sort controls */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[#0e131f] p-1 rounded-2xl border border-slate-800">
                <button
                  onClick={() => setSortOption('recent')}
                  className={`px-3 py-1 text-xs font-semibold rounded-xl transition ${
                    sortOption === 'recent' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-400'
                  }`}
                >
                  Recent
                </button>
                <button
                  onClick={() => setSortOption('alphabetical')}
                  className={`px-3 py-1 text-xs font-semibold rounded-xl transition ${
                    sortOption === 'alphabetical' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-400'
                  }`}
                >
                  Alphabetical
                </button>
              </div>

              <div className="flex items-center bg-[#0e131f] p-0.5 rounded-xl border border-slate-800">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg ${viewMode === 'grid' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg ${viewMode === 'list' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Notebook Grid */}
          {sortedNotebooks.length === 0 ? (
            <div className="h-64 rounded-3xl bg-[#0e131f] border border-slate-800 flex flex-col items-center justify-center text-center p-6">
              <BookOpen className="w-10 h-10 text-slate-500 mb-3" />
              <h3 className="font-serif text-lg font-bold text-white">No notebooks found in this section</h3>
              <p className="text-xs text-slate-400 mt-1">Create a new notebook or select another filter.</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {activeTab === 'my_notebooks' && !searchQuery && (
                <QuickStudioCard onCreateNotebook={onCreateNotebook} />
              )}
              {sortedNotebooks.map(nb => (
                <div key={nb.id} className="relative group">
                  <NotebookCard
                    notebook={nb}
                    searchQuery={searchQuery}
                    matchedSnippets={ocrMatches.filter(m => m.notebookId === nb.id)}
                    onOpen={onOpenNotebook}
                    onFavorite={onFavoriteNotebook}
                    onDelete={onDeleteNotebook}
                    onDuplicate={onDuplicateNotebook}
                    onRename={onRenameNotebook}
                  />
                  {/* Quick Share Button on card overlay */}
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleOpenShareModal(nb);
                    }}
                    className="absolute top-4 right-12 z-20 p-1.5 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-300 hover:text-white hover:bg-indigo-600 transition"
                    title="Share Notebook"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {sortedNotebooks.map(nb => (
                <div
                  key={nb.id}
                  onClick={() => onOpenNotebook(nb.id)}
                  className="flex items-center justify-between p-4 rounded-2xl bg-[#0e131f] border border-slate-800 hover:border-slate-700 cursor-pointer transition select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-12 rounded-lg shrink-0 border border-white/10 shadow-sm flex items-center justify-center text-white font-serif font-bold text-sm"
                      style={{ backgroundColor: nb.coverColor || '#1e3a8a' }}
                    >
                      {nb.title[0]}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-serif text-base font-bold text-white truncate">{nb.title}</h3>
                      <p className="text-xs text-slate-400 truncate">{nb.subtitle || `${nb.pageCount || 1} Pages`}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleOpenShareModal(nb);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 text-xs font-bold text-indigo-300 hover:bg-indigo-600 hover:text-white transition"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <CreateNotebookModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={onCreateNotebook}
      />

      <FriendsModal
        isOpen={isFriendsModalOpen}
        currentUser={currentUser}
        onClose={() => setIsFriendsModalOpen(false)}
      />

      <UserProfileModal
        isOpen={isProfileModalOpen}
        currentUser={currentUser}
        onClose={() => setIsProfileModalOpen(false)}
        onUpdateUser={onUpdateUser}
      />

      <NotificationsModal
        isOpen={isNotificationsModalOpen}
        currentUser={currentUser}
        onClose={() => setIsNotificationsModalOpen(false)}
        onOpenNotebook={onOpenNotebook}
      />

      <ShareNotebookModal
        isOpen={isShareModalOpen}
        notebook={selectedNotebookForShare}
        currentUser={currentUser}
        onClose={() => setIsShareModalOpen(false)}
        onUpdateNotebook={updated => {
          // Update local state if needed
        }}
      />
    </div>
  );
};
