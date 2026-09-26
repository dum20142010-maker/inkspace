import React, { useState, useEffect, useCallback } from 'react';
import { Notebook, Folder, NotebookPage, ToolSettings, User } from './types/notebook';
import { db, initializeDatabase } from './db/database';
import { Dashboard } from './components/dashboard/Dashboard';
import { NotebookEditor } from './components/editor/NotebookEditor';
import { SettingsModal } from './components/modals/SettingsModal';
import { AuthModal } from './components/auth/AuthModal';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';
import { PdfManager } from './engine/pdfManager';
import { auth, googleProvider, signInWithPopup, onAuthStateChanged, FirebaseUser } from './utils/firebase';

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [viewState, setViewState] = useState<'dashboard' | 'editor'>('dashboard');
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null);

  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeNotebookPages, setActiveNotebookPages] = useState<NotebookPage[]>([]);
  const [editorInitialPageIndex, setEditorInitialPageIndex] = useState(0);
  const [toolSettings, setToolSettings] = useState<ToolSettings>({
    activeTool: 'fountain',
    appTheme: 'dark',
    penColor: '#0f172a',
    penWidth: 3,
    penOpacity: 1.0,
    penPresets: [],
    activePresetId: null,
    highlighterColor: '#fde047',
    highlighterWidth: 20,
    eraserType: 'pixel',
    eraserSize: 32,
    shapeType: 'rectangle',
    shapeFill: 'transparent',
    shapeStroke: '#3b82f6',
    shapeWidth: 2,
    autoShapeRecognition: false,
    palmRejection: true,
    pressureSensitivity: true,
    textColor: '#0f172a',
    fontSize: 20,
    fontFamily: 'Plus Jakarta Sans',
    favoriteColors: ['#0f172a', '#2563eb', '#dc2626', '#16a34a', '#d97706', '#9333ea', '#db2777']
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'register' | 'recover'>('signin');

  /**
   * Initialize App Data from IndexedDB & Session
   */
  const loadAppData = useCallback(async () => {
    await initializeDatabase();

    const loadedNotebooks = await db.notebooks.orderBy('updatedAt').reverse().toArray();
    const loadedFolders = await db.folders.orderBy('createdAt').toArray();
    const settingsObj = await db.settings.get('user_settings');

    const activeUserId = localStorage.getItem('seen_active_user_id') || sessionStorage.getItem('seen_active_user_id');
    let loadedUser: User | undefined;
    if (activeUserId) {
      loadedUser = await db.users.get(activeUserId);
    }
    if (!loadedUser) {
      loadedUser = await db.users.toCollection().first();
    }
    if (loadedUser) {
      setCurrentUser(loadedUser);
    }

    setNotebooks(loadedNotebooks);
    setFolders(loadedFolders);
    if (settingsObj) setToolSettings(settingsObj.data);
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: FirebaseUser | null) => {
      setFirebaseUser(user);
      setAuthLoading(false);
      if (user) {
        loadAppData();
      }
    });
    return () => unsubscribe();
  }, [loadAppData]);

  const handleFirebaseSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Firebase Google sign-in error:', err);
    }
  };

  /**
   * Auth Handlers
   */
  const handleAuthSuccess = (user: User, rememberMe: boolean) => {
    setCurrentUser(user);
    if (rememberMe) {
      localStorage.setItem('seen_active_user_id', user.id);
      sessionStorage.removeItem('seen_active_user_id');
    } else {
      sessionStorage.setItem('seen_active_user_id', user.id);
      localStorage.removeItem('seen_active_user_id');
    }
    setIsAuthModalOpen(false);
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    localStorage.removeItem('seen_active_user_id');
    sessionStorage.removeItem('seen_active_user_id');
  };

  const handleOpenAuth = (mode: 'signin' | 'register' | 'recover') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleToggleTheme = async () => {
    const nextTheme = (toolSettings.appTheme || 'dark') === 'dark' ? 'light' : 'dark';
    const updated: ToolSettings = {
      ...toolSettings,
      appTheme: nextTheme
    };
    setToolSettings(updated);
    await db.settings.put({ id: 'user_settings', data: updated });
  };

  /**
   * Open Notebook Editor
   */
  const handleOpenNotebook = async (id: string, initialPageIndex: number = 0) => {
    const pages = await db.pages.where('notebookId').equals(id).sortBy('pageIndex');
    setActiveNotebookId(id);
    setActiveNotebookPages(pages);
    setEditorInitialPageIndex(initialPageIndex);
    setViewState('editor');
  };

  /**
   * Create New Notebook (Standard or PDF Import)
   */
  const handleCreateNotebook = async (config: {
    title: string;
    coverColor: string;
    paperType: any;
    paperColor: string;
    orientation: any;
    pageSize: any;
    pdfFile?: File;
    spineMaterial?: any;
    folderId?: string | null;
  }) => {
    const now = Date.now();
    const notebookId = `notebook_${now}`;
    let pdfDocId: string | undefined = undefined;
    let totalPagesCount = 1;

    if (config.pdfFile) {
      const pdfBuffer = await config.pdfFile.arrayBuffer();
      pdfDocId = `pdf_${now}`;

      // Load PDF via PDF.js to get page count
      const pdfProxy = await PdfManager.loadPdfDocument(pdfDocId, pdfBuffer);
      totalPagesCount = pdfProxy.numPages;

      await db.pdfDocs.add({
        id: pdfDocId,
        notebookId,
        name: config.pdfFile.name,
        data: pdfBuffer,
        pageCount: totalPagesCount,
        createdAt: now
      });
    }

    const layoutBadge =
      config.paperType === 'ruled'
        ? 'RULED • 7MM'
        : config.paperType === 'cornell'
        ? 'CORNELL LAYOUT'
        : config.paperType === 'graph'
        ? 'GRAPH • 5MM'
        : config.paperType === 'dotted'
        ? 'DOTTED • 4MM'
        : 'BLANK CANVAS';

    const newNotebook: Notebook = {
      id: notebookId,
      title: config.title,
      subtitle: `${config.title} • Working Manuscript`,
      folderId: config.folderId || null,
      coverColor: config.coverColor,
      paperType: config.paperType,
      paperColor: config.paperColor,
      orientation: config.orientation,
      pageSize: config.pageSize,
      spineMaterial: config.spineMaterial || 'cobalt',
      layoutBadge,
      statsSummary: `${totalPagesCount} Pages • Initialized Folio`,
      pageCount: totalPagesCount,
      isFavorite: false,
      isDeleted: false,
      pdfDocId,
      createdAt: now,
      updatedAt: now
    };

    await db.notebooks.add(newNotebook);

    // Create Initial Pages
    const pagesToAdd: NotebookPage[] = [];
    for (let i = 0; i < totalPagesCount; i++) {
      pagesToAdd.push({
        id: `page_${now}_${i}`,
        notebookId,
        pageIndex: i,
        width: config.orientation === 'landscape' ? 1132 : 800,
        height: config.orientation === 'landscape' ? 800 : 1132,
        orientation: config.orientation,
        background: {
          type: config.paperType,
          color: config.paperColor,
          pdfPageNum: pdfDocId ? i + 1 : undefined
        },
        createdAt: now,
        updatedAt: now
      });
    }

    await db.pages.bulkAdd(pagesToAdd);
    await loadAppData();
    await handleOpenNotebook(notebookId);
  };

  /**
   * Folder Operations
   */
  const handleCreateFolder = async (name: string) => {
    await db.folders.add({
      id: `folder_${Date.now()}`,
      name,
      color: '#6366f1',
      createdAt: Date.now()
    });
    await loadAppData();
  };

  const handleMoveNotebookToFolder = async (notebookId: string, folderId: string | null) => {
    await db.notebooks.update(notebookId, { folderId, updatedAt: Date.now() });
    try {
      const nb = await db.notebooks.get(notebookId);
      if (nb) {
        fetch('/api/notebooks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(nb)
        }).catch(() => {});
      }
    } catch (e) {
      // Ignore sync error
    }
    await loadAppData();
  };

  const handleDeleteFolder = async (folderId: string) => {
    await db.folders.delete(folderId);
    const inFolder = await db.notebooks.where('folderId').equals(folderId).toArray();
    for (const nb of inFolder) {
      await db.notebooks.update(nb.id, { folderId: null });
    }
    await loadAppData();
  };

  /**
   * Notebook Actions (Favorite, Delete, Duplicate, Rename)
   */
  const handleFavoriteNotebook = async (id: string, isFav: boolean) => {
    await db.notebooks.update(id, { isFavorite: isFav, updatedAt: Date.now() });
    await loadAppData();
  };

  const handleDeleteNotebook = async (id: string) => {
    await db.notebooks.update(id, { isDeleted: true, updatedAt: Date.now() });
    await loadAppData();
  };

  const handleDuplicateNotebook = async (id: string) => {
    const orig = await db.notebooks.get(id);
    if (!orig) return;
    const now = Date.now();
    const newId = `notebook_${now}`;

    await db.notebooks.add({
      ...orig,
      id: newId,
      title: `${orig.title} (Copy)`,
      createdAt: now,
      updatedAt: now
    });

    const origPages = await db.pages.where('notebookId').equals(id).toArray();
    for (const p of origPages) {
      await db.pages.add({ ...p, id: `page_${now}_${p.pageIndex}`, notebookId: newId });
    }
    await loadAppData();
  };

  const handleRenameNotebook = async (id: string, newTitle: string) => {
    await db.notebooks.update(id, { title: newTitle, updatedAt: Date.now() });
    await loadAppData();
  };

  const activeNotebook = notebooks.find(n => n.id === activeNotebookId);

  if (authLoading) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100">
        <div className="h-12 w-12 rounded-2xl bg-amber-400 flex items-center justify-center shadow-2xl shadow-amber-500/30 animate-pulse mb-4 text-slate-950 font-black font-serif text-2xl">
          I
        </div>
        <p className="text-sm font-bold text-slate-300">Authenticating with Firebase...</p>
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 p-4">
        <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-8 shadow-2xl text-center">
          <div className="h-16 w-16 mx-auto rounded-3xl bg-amber-400 flex items-center justify-center shadow-2xl shadow-amber-500/30 mb-6 text-slate-950 font-black font-serif text-3xl">
            I
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mb-2">Welcome to InkSpace</h1>
          <p className="text-xs text-slate-400 mb-8 leading-relaxed">
            Please sign in with Firebase (Google) to access your notebooks and cloud workspace. Subsequent visits will log you in automatically.
          </p>
          <button
            onClick={handleFirebaseSignIn}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm shadow-xl transition active:scale-95"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.2v3.15C3.21 21.32 7.27 24 12 24z"/>
              <path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.39-1.49-.39-2.24s.14-1.52.39-2.24V6.6H1.2C.44 8.13 0 9.87 0 12s.44 3.87 1.2 5.4l4.07-3.16z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.27 0 3.21 2.68 1.2 6.6l4.07 3.15c.95-2.85 3.6-4.96 6.73-4.96z"/>
            </svg>
            <span>Sign in with Google</span>
          </button>
        </div>
      </div>
    );
  }

  if (!isInitialized || !toolSettings) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100">
        <div className="h-12 w-12 rounded-2xl bg-amber-400 flex items-center justify-center shadow-2xl shadow-amber-500/30 animate-pulse mb-4 text-slate-950 font-black font-serif text-2xl">
          I
        </div>
        <p className="text-sm font-bold text-slate-300">Loading InkSpace Engine...</p>
      </div>
    );
  }

  const appTheme = toolSettings?.appTheme || 'dark';

  return (
    <div className={`h-screen w-screen font-sans overflow-hidden ${
      appTheme === 'light' ? 'bg-slate-100 text-slate-950' : 'bg-slate-950 text-slate-100'
    }`}>
      {viewState === 'dashboard' ? (
        <Dashboard
          notebooks={notebooks}
          folders={folders}
          currentUser={currentUser}
          currentTheme={appTheme}
          toolSettings={toolSettings}
          onUpdateSettings={async newSettings => {
            setToolSettings(newSettings);
            await db.settings.put({ id: 'user_settings', data: newSettings });
          }}
          onToggleTheme={handleToggleTheme}
          onOpenNotebook={handleOpenNotebook}
          onCreateNotebook={handleCreateNotebook}
          onFavoriteNotebook={handleFavoriteNotebook}
          onDeleteNotebook={handleDeleteNotebook}
          onDuplicateNotebook={handleDuplicateNotebook}
          onRenameNotebook={handleRenameNotebook}
          onCreateFolder={handleCreateFolder}
          onMoveNotebookToFolder={handleMoveNotebookToFolder}
          onDeleteFolder={handleDeleteFolder}
          onRestoreFromTrash={async id => {
            await db.notebooks.update(id, { isDeleted: false });
            await loadAppData();
          }}
          onPermanentDelete={async id => {
            await db.notebooks.delete(id);
            await db.pages.where('notebookId').equals(id).delete();
            await loadAppData();
          }}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenAuth={handleOpenAuth}
          onSignOut={handleSignOut}
          onUpdateUser={updated => {
            setCurrentUser(updated);
            db.users.put(updated);
          }}
        />
      ) : activeNotebook ? (
        <NotebookEditor
          notebook={activeNotebook}
          pages={activeNotebookPages}
          initialSettings={toolSettings}
          initialPageIndex={editorInitialPageIndex}
          currentTheme={appTheme}
          onToggleTheme={handleToggleTheme}
          onBackToDashboard={() => {
            setViewState('dashboard');
            loadAppData();
          }}
          onReloadNotebook={() => handleOpenNotebook(activeNotebook.id, editorInitialPageIndex)}
        />
      ) : null}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        settings={toolSettings}
        onClose={() => setIsSettingsOpen(false)}
        onUpdateSettings={async newSettings => {
          setToolSettings(newSettings);
          await db.settings.put({ id: 'user_settings', data: newSettings });
        }}
        onClearStorage={async () => {
          await db.delete();
          window.location.reload();
        }}
      />

      {/* User Authentication & Password Recovery Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Global Offline Status Indicator */}
      <OfflineIndicator />
    </div>
  );
}
