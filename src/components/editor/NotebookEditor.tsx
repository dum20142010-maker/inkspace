import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Notebook,
  NotebookPage,
  Stroke,
  ShapeObject,
  TextObject,
  ImageObject,
  ToolSettings,
  PenPreset,
  SelectionState,
  User,
  NotebookAccessLog
} from '../../types/notebook';
import { NotebookActivity, CollaboratorPresence } from '../../types/collaboration';
import { db } from '../../db/database';
import { auth } from '../../utils/firebase';
import { Toolbar } from './Toolbar';
import { PageThumbnailSidebar } from './PageThumbnailSidebar';
import { CanvasWorkspace } from './CanvasWorkspace';
import { TextBoxOverlay } from './TextBoxOverlay';
import { SelectionOverlay } from './SelectionOverlay';
import { CollaborationPanel } from './CollaborationPanel';
import { ExportModal } from '../modals/ExportModal';
import { SettingsModal } from '../modals/SettingsModal';
import { SavePenPresetModal } from './SavePenPresetModal';
import { PenPresetManagerModal } from './PenPresetManagerModal';
import { PdfManager } from '../../engine/pdfManager';
import { DrawingEngine } from '../../engine/DrawingEngine';
import { exportNotebookToPDF } from '../../engine/pdfExport';
import { scanPageStrokesOCR } from '../../engine/ocrScanner';
import { FindInNotebookModal } from './FindInNotebookModal';
import { OcrTranscriptModal } from './OcrTranscriptModal';
import { VoiceDictationBar } from './VoiceDictationBar';
import { BookmarkPageModal } from './BookmarkPageModal';
import { StylusShortcutsModal } from '../modals/StylusShortcutsModal';
import { NotebookAnalyticsModal } from '../modals/NotebookAnalyticsModal';
import { AIReaderPanel } from './AIReaderPanel';
import { Check, Loader2 } from 'lucide-react';

interface NotebookEditorProps {
  notebook: Notebook;
  pages: NotebookPage[];
  initialSettings: ToolSettings;
  initialPageIndex?: number;
  currentTheme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  onBackToDashboard: () => void;
  onReloadNotebook: () => void;
}

export const NotebookEditor: React.FC<NotebookEditorProps> = ({
  notebook,
  pages,
  initialSettings,
  initialPageIndex = 0,
  currentTheme = 'dark',
  onToggleTheme,
  onBackToDashboard,
  onReloadNotebook
}) => {
  const [currentPageIndex, setCurrentPageIndex] = useState(initialPageIndex);
  const [settings, setSettings] = useState<ToolSettings>(initialSettings);

  useEffect(() => {
    if (currentTheme) {
      setSettings(prev => ({ ...prev, appTheme: currentTheme }));
    }
  }, [currentTheme]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollabPanelOpen, setIsCollabPanelOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isFindModalOpen, setIsFindModalOpen] = useState(false);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [isSavePresetModalOpen, setIsSavePresetModalOpen] = useState(false);
  const [isManagePresetsModalOpen, setIsManagePresetsModalOpen] = useState(false);
  const [isStylusModalOpen, setIsStylusModalOpen] = useState(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [isAIReaderOpen, setIsAIReaderOpen] = useState(false);
  const [aiReaderPageImage, setAiReaderPageImage] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1.0);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');

  const handleTriggerAIReader = useCallback((pageImage?: string) => {
    if (pageImage) {
      setAiReaderPageImage(pageImage);
    } else {
      const canvases = document.querySelectorAll('canvas');
      if (canvases.length > 0) {
        setAiReaderPageImage(canvases[0].toDataURL('image/png'));
      }
    }
    setIsAIReaderOpen(true);
  }, []);

  // Active User session
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Access Logging & Duration Tracker for Notebook Creator Analytics
  useEffect(() => {
    if (!notebook) return;
    const sessionStart = Date.now();
    const logId = `log_${notebook.id}_${currentUser?.id || 'user'}_${sessionStart}`;

    const createInitialLog = async () => {
      try {
        const initialRecord: NotebookAccessLog = {
          id: logId,
          notebookId: notebook.id,
          userId: currentUser?.id || auth.currentUser?.uid || 'anon',
          userName: currentUser?.name || auth.currentUser?.displayName || 'User',
          userEmail: currentUser?.email || auth.currentUser?.email || 'user@inkspace.app',
          userAvatarColor: currentUser?.avatarColor || '#f59e0b',
          userAvatarImage: currentUser?.avatarImage || auth.currentUser?.photoURL || undefined,
          openedAt: sessionStart,
          lastActiveAt: sessionStart,
          durationSeconds: 0
        };
        await db.accessLogs.put(initialRecord);
      } catch (err) {
        console.error('Failed to log notebook access:', err);
      }
    };

    createInitialLog();

    const interval = setInterval(async () => {
      const now = Date.now();
      const duration = Math.round((now - sessionStart) / 1000);
      try {
        const existing = await db.accessLogs.get(logId);
        if (existing) {
          await db.accessLogs.update(logId, {
            lastActiveAt: now,
            durationSeconds: duration
          });
        }
      } catch (err) {
        console.error('Failed to update notebook access duration:', err);
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      const now = Date.now();
      const finalDuration = Math.round((now - sessionStart) / 1000);
      db.accessLogs.update(logId, {
        lastActiveAt: now,
        durationSeconds: finalDuration
      }).catch(() => {});
    };
  }, [notebook, currentUser]);

  // Collaboration State
  const [presenceList, setPresenceList] = useState<CollaboratorPresence[]>([]);
  const [activities, setActivities] = useState<NotebookActivity[]>([]);

  // Voice-to-Text Dictation State
  const [isDictating, setIsDictating] = useState(false);
  const [dictationTranscript, setDictationTranscript] = useState('');
  const [dictationInterim, setDictationInterim] = useState('');
  const [dictationError, setDictationError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const activeDictationTextIdRef = useRef<string | null>(null);

  // Toggle Voice-to-Text Dictation (English)
  const handleToggleDictation = () => {
    if (isDictating) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsDictating(false);
      activeDictationTextIdRef.current = null;
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setDictationError('Speech recognition is not supported in this browser environment. Try Google Chrome, Edge, or Safari.');
      setIsDictating(true);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US'; // English dictation

      setDictationError(null);
      setDictationTranscript('');
      setDictationInterim('');

      const textId = `text_voice_${Date.now()}`;
      activeDictationTextIdRef.current = textId;

      const initialTextObj: TextObject = {
        id: textId,
        pageId: currentPage.id,
        x: 80,
        y: 120 + (texts.length * 60),
        width: 480,
        height: 120,
        content: '🎙️ [Dictating English speech...]',
        fontSize: settings.fontSize || 20,
        fontFamily: settings.fontFamily || 'Plus Jakarta Sans',
        color: settings.textColor || '#0f172a',
        isBold: false,
        isItalic: false,
        isUnderline: false,
        align: 'left',
        rotation: 0
      };

      recordHistory();
      const updatedTexts = [...texts, initialTextObj];
      setTexts(updatedTexts);
      triggerAutosave(strokes, shapes, updatedTexts, images);

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interim = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }

        setDictationTranscript(prev => {
          const combinedFinal = prev + (finalTranscript ? (prev ? ' ' : '') + finalTranscript : '');
          setDictationInterim(interim);

          const liveContent = (combinedFinal + (interim ? ' ' + interim : '')).trim();

          // Live update text object on canvas
          setTexts(currentTexts => {
            const nextTexts = currentTexts.map(tx => {
              if (tx.id === textId) {
                return { ...tx, content: liveContent || '🎙️ [Listening to English...]' };
              }
              return tx;
            });
            triggerAutosave(strokes, shapes, nextTexts, images);
            return nextTexts;
          });

          return combinedFinal;
        });
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setDictationError('Microphone permission denied. Please allow microphone access in your browser.');
        } else if (event.error !== 'no-speech') {
          setDictationError(`Voice recognition: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsDictating(false);
        logActivity('text_added', `Transcribed voice note to Page ${currentPageIndex + 1}`);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsDictating(true);
      logActivity('text_added', `Started English voice dictation on Page ${currentPageIndex + 1}`);
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setDictationError('Could not initialize microphone speech recognition.');
      setIsDictating(true);
    }
  };
  // Page Content State
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [shapes, setShapes] = useState<ShapeObject[]>([]);
  const [texts, setTexts] = useState<TextObject[]>([]);
  const [images, setImages] = useState<ImageObject[]>([]);
  const [pdfBgCanvas, setPdfBgCanvas] = useState<HTMLCanvasElement | null>(null);

  // Lasso / Selection State
  const [selection, setSelection] = useState<SelectionState>({
    strokeIds: [],
    shapeIds: [],
    textIds: [],
    imageIds: [],
    bounds: null
  });

  // Bookmark & TOC Modal State
  const [bookmarkModalTarget, setBookmarkModalTarget] = useState<{ page: NotebookPage; index: number } | null>(null);

  const handleSaveBookmark = async (updatedPage: NotebookPage) => {
    await db.pages.put(updatedPage);
    logActivity(
      'page_created',
      `${updatedPage.isBookmarked ? 'Bookmarked' : 'Unbookmarked'} Page ${updatedPage.pageIndex + 1}`
    );
    onReloadNotebook();
  };

  const handleToggleBookmarkQuick = async (page: NotebookPage) => {
    const updatedPage: NotebookPage = {
      ...page,
      isBookmarked: !page.isBookmarked,
      bookmarkTitle: !page.isBookmarked ? (page.bookmarkTitle || `Page ${page.pageIndex + 1}`) : undefined,
      bookmarkTag: !page.isBookmarked ? (page.bookmarkTag || 'Key Concept') : undefined,
      bookmarkColor: !page.isBookmarked ? (page.bookmarkColor || '#3b82f6') : undefined,
      updatedAt: Date.now()
    };
    await db.pages.put(updatedPage);
    logActivity(
      'page_created',
      `${updatedPage.isBookmarked ? 'Bookmarked' : 'Unbookmarked'} Page ${page.pageIndex + 1}`
    );
    onReloadNotebook();
  };

  // Undo / Redo History Stack per page
  const [history, setHistory] = useState<{
    past: { strokes: Stroke[]; shapes: ShapeObject[]; texts: TextObject[]; images: ImageObject[] }[];
    future: { strokes: Stroke[]; shapes: ShapeObject[]; texts: TextObject[]; images: ImageObject[] }[];
  }>({ past: [], future: [] });

  const currentPage = pages[currentPageIndex] || pages[0];

  // Load Active User & Initial Activity Log
  useEffect(() => {
    const initUserAndActivities = async () => {
      const activeUserId = localStorage.getItem('seen_active_user_id') || sessionStorage.getItem('seen_active_user_id');
      let user: User | undefined;
      if (activeUserId) {
        user = await db.users.get(activeUserId);
      }
      if (!user) {
        user = await db.users.toCollection().first();
      }
      if (user) {
        setCurrentUser(user);
      }

      // Fetch notebook activities from backend
      try {
        const res = await fetch(`/api/notebooks/${notebook.id}/activity`).then(r => r.json());
        if (res.activities) {
          setActivities(res.activities);
        } else {
          // Pre-seed initial join activity
          const joinAct: NotebookActivity = {
            id: `act_${Date.now()}`,
            notebookId: notebook.id,
            userId: user?.id || 'user_demo',
            userName: user?.name || 'Alex Morgan',
            action: 'joined',
            details: `${user?.name || 'Alex Morgan'} opened and joined the notebook workspace`,
            createdAt: Date.now()
          };
          setActivities([joinAct]);
        }
      } catch (err) {
        console.warn('Could not fetch server activity log, using local feed:', err);
      }
    };

    initUserAndActivities();
  }, [notebook.id]);

  // Log Activity Helper
  const logActivity = useCallback((action: NotebookActivity['action'], details: string) => {
    const userName = currentUser?.name || 'Alex Morgan';
    const userId = currentUser?.id || 'user_demo';

    const newActivity: NotebookActivity = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      notebookId: notebook.id,
      userId,
      userName,
      action,
      details,
      createdAt: Date.now()
    };

    setActivities(prev => [newActivity, ...prev]);
  }, [currentUser, notebook.id]);

  /**
   * Load Page Content from IndexedDB
   */
  const loadPageContent = useCallback(async (pageId: string) => {
    const loadedStrokes = await db.strokes.where('pageId').equals(pageId).toArray();
    const loadedShapes = await db.shapes.where('pageId').equals(pageId).toArray();
    const loadedTexts = await db.texts.where('pageId').equals(pageId).toArray();
    const loadedImages = await db.images.where('pageId').equals(pageId).toArray();

    setStrokes(loadedStrokes);
    setShapes(loadedShapes);
    setTexts(loadedTexts);
    setImages(loadedImages);
    setSelection({ strokeIds: [], shapeIds: [], textIds: [], imageIds: [], bounds: null });
    setHistory({ past: [], future: [] });

    // If page has PDF document background
    if (notebook.pdfDocId) {
      const pdfDoc = await db.pdfDocs.get(notebook.pdfDocId);
      if (pdfDoc) {
        const renderRes = await PdfManager.renderPdfPageToCanvas(
          notebook.pdfDocId,
          pdfDoc.data,
          currentPageIndex + 1
        );
        setPdfBgCanvas(renderRes.canvas);
      }
    } else {
      setPdfBgCanvas(null);
    }
  }, [notebook.pdfDocId, currentPageIndex]);

  useEffect(() => {
    if (currentPage) {
      loadPageContent(currentPage.id);
    }
  }, [currentPage, loadPageContent]);

  // Global keyboard shortcut for Find in Notebook (Cmd/Ctrl + F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsFindModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  /**
   * Record History Snapshot for Undo/Redo
   */
  const recordHistory = () => {
    setHistory(prev => ({
      past: [...prev.past, { strokes, shapes, texts, images }],
      future: []
    }));
  };

  /**
   * Debounced Persistence to IndexedDB
   */
  const saveDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  const triggerAutosave = useCallback((
    newStrokes: Stroke[],
    newShapes: ShapeObject[],
    newTexts: TextObject[],
    newImages: ImageObject[]
  ) => {
    setSaveStatus('saving');
    if (saveDebounceTimer.current) clearTimeout(saveDebounceTimer.current);

    saveDebounceTimer.current = setTimeout(async () => {
      if (!currentPage) return;
      await db.transaction('rw', [db.strokes, db.shapes, db.texts, db.images, db.notebooks], async () => {
        await db.strokes.where('pageId').equals(currentPage.id).delete();
        await db.strokes.bulkAdd(newStrokes);

        await db.shapes.where('pageId').equals(currentPage.id).delete();
        await db.shapes.bulkAdd(newShapes);

        await db.texts.where('pageId').equals(currentPage.id).delete();
        await db.texts.bulkAdd(newTexts);

        await db.images.where('pageId').equals(currentPage.id).delete();
        await db.images.bulkAdd(newImages);

        await db.notebooks.update(notebook.id, { updatedAt: Date.now() });
      });
      setSaveStatus('saved');

      // Soft background OCR indexing of new strokes for real-time search
      setTimeout(() => {
        scanPageStrokesOCR(currentPage, newStrokes, newTexts).catch(err =>
          console.warn('Background OCR scan notice:', err)
        );
      }, 1000);
    }, 400);
  }, [currentPage, notebook.id]);

  // Selection Transformation Handlers
  const handleMoveSelection = (dx: number, dy: number) => {
    recordHistory();
    const { nextStrokes, nextShapes, nextTexts, nextImages } = DrawingEngine.transformSelection(
      strokes,
      shapes,
      texts,
      images,
      selection,
      dx,
      dy
    );
    setStrokes(nextStrokes);
    setShapes(nextShapes);
    setTexts(nextTexts);
    setImages(nextImages);

    const newBounds = DrawingEngine.calculateSelectionBounds(
      nextStrokes,
      nextShapes,
      nextTexts,
      nextImages,
      selection
    );
    setSelection(prev => ({ ...prev, bounds: newBounds }));
    triggerAutosave(nextStrokes, nextShapes, nextTexts, nextImages);
  };

  const handleScaleSelection = (scaleX: number, scaleY: number, pivotX: number, pivotY: number) => {
    recordHistory();
    const { nextStrokes, nextShapes, nextTexts, nextImages } = DrawingEngine.transformSelection(
      strokes,
      shapes,
      texts,
      images,
      selection,
      0,
      0,
      scaleX,
      scaleY,
      pivotX,
      pivotY
    );
    setStrokes(nextStrokes);
    setShapes(nextShapes);
    setTexts(nextTexts);
    setImages(nextImages);

    const newBounds = DrawingEngine.calculateSelectionBounds(
      nextStrokes,
      nextShapes,
      nextTexts,
      nextImages,
      selection
    );
    setSelection(prev => ({ ...prev, bounds: newBounds }));
    triggerAutosave(nextStrokes, nextShapes, nextTexts, nextImages);
  };

  const handleDuplicateSelection = () => {
    recordHistory();
    const { nextStrokes, nextShapes, nextTexts, nextImages, newSelection } =
      DrawingEngine.duplicateSelection(strokes, shapes, texts, images, selection);
    setStrokes(nextStrokes);
    setShapes(nextShapes);
    setTexts(nextTexts);
    setImages(nextImages);
    setSelection(newSelection);
    triggerAutosave(nextStrokes, nextShapes, nextTexts, nextImages);
    logActivity('stroke_added', `Duplicated selected elements on Page ${currentPageIndex + 1}`);
  };

  const handleChangeSelectionColor = (color: string) => {
    recordHistory();
    const nextStrokes = strokes.map(s => (selection.strokeIds.includes(s.id) ? { ...s, color } : s));
    const nextShapes = shapes.map(sh => (selection.shapeIds.includes(sh.id) ? { ...sh, strokeColor: color } : sh));
    const nextTexts = texts.map(t => (selection.textIds.includes(t.id) ? { ...t, color } : t));

    setStrokes(nextStrokes);
    setShapes(nextShapes);
    setTexts(nextTexts);
    triggerAutosave(nextStrokes, nextShapes, nextTexts, images);
  };

  const handleDeleteSelection = () => {
    recordHistory();
    const newStrokes = strokes.filter(s => !selection.strokeIds.includes(s.id));
    const newShapes = shapes.filter(sh => !selection.shapeIds.includes(sh.id));
    const newTexts = texts.filter(tx => !selection.textIds.includes(tx.id));
    const newImages = images.filter(img => !selection.imageIds.includes(img.id));

    setStrokes(newStrokes);
    setShapes(newShapes);
    setTexts(newTexts);
    setImages(newImages);
    setSelection({ strokeIds: [], shapeIds: [], textIds: [], imageIds: [], bounds: null });
    triggerAutosave(newStrokes, newShapes, newTexts, newImages);
    logActivity('stroke_deleted', `Deleted selected grouped elements on Page ${currentPageIndex + 1}`);
  };
  const handleAddStroke = (newStroke: Stroke) => {
    recordHistory();
    const updated = [...strokes, newStroke];
    setStrokes(updated);
    triggerAutosave(updated, shapes, texts, images);
    logActivity('stroke_added', `Added handwriting stroke on Page ${currentPageIndex + 1}`);
  };

  const handleUpdateStrokes = (newStrokes: Stroke[]) => {
    setStrokes(newStrokes);
    triggerAutosave(newStrokes, shapes, texts, images);
  };

  const handleAddShape = (newShape: ShapeObject) => {
    recordHistory();
    const updated = [...shapes, newShape];
    setShapes(updated);
    triggerAutosave(strokes, updated, texts, images);
    logActivity('shape_added', `Added clean ${newShape.type} shape on Page ${currentPageIndex + 1}`);
  };

  const handleAddText = (newText: TextObject) => {
    recordHistory();
    const updated = [...texts, newText];
    setTexts(updated);
    triggerAutosave(strokes, shapes, updated, images);
    logActivity('text_added', `Added text box on Page ${currentPageIndex + 1}`);
  };

  const handleEraseStrokes = (erasedIds: string[]) => {
    recordHistory();
    const updated = strokes.filter(s => !erasedIds.includes(s.id));
    setStrokes(updated);
    triggerAutosave(updated, shapes, texts, images);
    logActivity('stroke_deleted', `Erased handwriting stroke on Page ${currentPageIndex + 1}`);
  };

  /**
   * Insert Image File handler
   */
  const handleInsertImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = event => {
          const dataUrl = event.target?.result as string;
          const imgObj: ImageObject = {
            id: `img_${Date.now()}`,
            pageId: currentPage.id,
            x: 100,
            y: 100,
            width: 300,
            height: 200,
            dataUrl,
            rotation: 0,
            aspectRatio: 1.5
          };
          recordHistory();
          const updated = [...images, imgObj];
          setImages(updated);
          triggerAutosave(strokes, shapes, texts, updated);
          logActivity('image_added', `Inserted image on Page ${currentPageIndex + 1}`);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  // Undo / Redo Execution
  const handleUndo = () => {
    if (history.past.length === 0) return;
    const previous = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, history.past.length - 1);

    setHistory({
      past: newPast,
      future: [{ strokes, shapes, texts, images }, ...history.future]
    });

    setStrokes(previous.strokes);
    setShapes(previous.shapes);
    setTexts(previous.texts);
    setImages(previous.images);
    triggerAutosave(previous.strokes, previous.shapes, previous.texts, previous.images);
  };

  const handleRedo = () => {
    if (history.future.length === 0) return;
    const next = history.future[0];
    const newFuture = history.future.slice(1);

    setHistory({
      past: [...history.past, { strokes, shapes, texts, images }],
      future: newFuture
    });

    setStrokes(next.strokes);
    setShapes(next.shapes);
    setTexts(next.texts);
    setImages(next.images);
    triggerAutosave(next.strokes, next.shapes, next.texts, next.images);
  };

  // Page Navigation
  const handleNextPage = () => {
    if (currentPageIndex < pages.length - 1) {
      setCurrentPageIndex(currentPageIndex + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1);
    }
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  /**
   * Page Management Functions
   */
  const handleInsertPage = async (atIndex: number) => {
    const newPageId = `page_${Date.now()}`;
    const newPage: NotebookPage = {
      id: newPageId,
      notebookId: notebook.id,
      pageIndex: atIndex,
      width: currentPage.width,
      height: currentPage.height,
      orientation: currentPage.orientation,
      background: { ...currentPage.background },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await db.pages.add(newPage);
    await db.notebooks.update(notebook.id, { pageCount: pages.length + 1 });
    logActivity('page_created', `Added Page ${atIndex + 1} to notebook`);
    onReloadNotebook();
    setCurrentPageIndex(atIndex);
  };

  const handleDuplicatePage = async (pageIdx: number) => {
    await handleInsertPage(pageIdx + 1);
  };

  const handleDeletePage = async (pageIdx: number) => {
    if (pages.length <= 1) return;
    const targetPage = pages[pageIdx];
    await db.pages.delete(targetPage.id);
    await db.notebooks.update(notebook.id, { pageCount: pages.length - 1 });
    logActivity('page_deleted', `Deleted Page ${pageIdx + 1}`);
    onReloadNotebook();
    setCurrentPageIndex(Math.max(0, pageIdx - 1));
  };

  // PNG Page Export
  const handleExportPNG = async (pageIndex: number) => {
    const targetPage = pages[pageIndex] || currentPage;
    const canvas = document.createElement('canvas');
    const dpr = 2;
    canvas.width = targetPage.width * dpr;
    canvas.height = targetPage.height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);

    DrawingEngine.renderPageBackground(ctx, targetPage, targetPage.width, targetPage.height, pdfBgCanvas);
    for (const img of images) {
      const imgEl = new Image();
      imgEl.src = img.dataUrl;
      if (imgEl.complete) ctx.drawImage(imgEl, img.x, img.y, img.width, img.height);
    }
    for (const sh of shapes) DrawingEngine.renderShape(ctx, sh);
    for (const st of strokes) DrawingEngine.renderStroke(ctx, st);
    for (const tx of texts) {
      if (!tx.content) continue;
      ctx.save();
      ctx.font = `${tx.isItalic ? 'italic ' : ''}${tx.isBold ? 'bold ' : ''}${tx.fontSize}px "${tx.fontFamily || 'Plus Jakarta Sans'}", sans-serif`;
      ctx.fillStyle = tx.color || '#0f172a';
      ctx.textBaseline = 'top';
      const lines = tx.content.split('\n');
      for (let l = 0; l < lines.length; l++) {
        ctx.fillText(lines[l], tx.x, tx.y + l * tx.fontSize * 1.3);
      }
      ctx.restore();
    }

    const link = document.createElement('a');
    link.download = `${(notebook.title || 'Notebook').replace(/[\\/:*?"<>|]/g, '_')}_Page_${pageIndex + 1}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  /**
   * Tool Settings & Pen Presets Handlers
   */
  const handleSettingChange = (key: keyof ToolSettings, value: any) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'penColor' || key === 'penWidth' || key === 'penOpacity') {
        const activePreset = prev.penPresets?.find(p => p.id === prev.activePresetId);
        if (activePreset) {
          const c = key === 'penColor' ? value : prev.penColor;
          const w = key === 'penWidth' ? value : prev.penWidth;
          const o = key === 'penOpacity' ? value : (prev.penOpacity ?? 1);
          if (
            c.toLowerCase() !== activePreset.color.toLowerCase() ||
            w !== activePreset.strokeWidth ||
            Math.abs(o - (activePreset.opacity ?? 1)) > 0.05
          ) {
            next.activePresetId = null;
          }
        }
      }
      db.settings.put({ id: 'user_settings', data: next }).catch(console.error);
      return next;
    });
  };

  const handleSelectPreset = (preset: PenPreset) => {
    const updated: ToolSettings = {
      ...settings,
      penColor: preset.color,
      penWidth: preset.strokeWidth,
      penOpacity: preset.opacity ?? 1,
      activeTool: preset.tool || (['fountain', 'ballpoint', 'pencil', 'marker', 'brush'].includes(settings.activeTool) ? settings.activeTool : 'fountain'),
      activePresetId: preset.id
    };
    setSettings(updated);
    db.settings.put({ id: 'user_settings', data: updated }).catch(console.error);
  };

  const handleSavePreset = (newPreset: PenPreset) => {
    const existing = settings.penPresets || [];
    const updatedPresets = [...existing, newPreset];
    const updated: ToolSettings = {
      ...settings,
      penColor: newPreset.color,
      penWidth: newPreset.strokeWidth,
      penOpacity: newPreset.opacity ?? 1,
      activeTool: newPreset.tool || (['fountain', 'ballpoint', 'pencil', 'marker', 'brush'].includes(settings.activeTool) ? settings.activeTool : 'fountain'),
      penPresets: updatedPresets,
      activePresetId: newPreset.id
    };
    setSettings(updated);
    db.settings.put({ id: 'user_settings', data: updated }).catch(console.error);
  };

  const handleUpdatePresets = (newPresets: PenPreset[], newActivePresetId?: string | null) => {
    const updated: ToolSettings = {
      ...settings,
      penPresets: newPresets,
      activePresetId: newActivePresetId !== undefined ? newActivePresetId : settings.activePresetId
    };
    setSettings(updated);
    db.settings.put({ id: 'user_settings', data: updated }).catch(console.error);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Toolbar */}
      <Toolbar
        notebookTitle={notebook.title}
        currentPageIndex={currentPageIndex}
        totalPages={pages.length}
        zoomScale={zoomScale}
        settings={settings}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        isDarkPaper={currentPage?.background.color === '#1e293b'}
        isDictating={isDictating}
        onBackToDashboard={onBackToDashboard}
        onToolSelect={tool => setSettings(s => ({ ...s, activeTool: tool }))}
        onSettingChange={handleSettingChange}
        onPageChange={setCurrentPageIndex}
        onAddPage={() => handleInsertPage(pages.length)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onZoomIn={() => setZoomScale(z => Math.min(3.0, z + 0.15))}
        onZoomOut={() => setZoomScale(z => Math.max(0.4, z - 0.15))}
        onResetZoom={() => setZoomScale(1.0)}
        onExport={() => setIsExportModalOpen(true)}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onToggleDarkPaper={async () => {
          const newColor = currentPage.background.color === '#1e293b' ? '#fefcf0' : '#1e293b';
          await db.pages.update(currentPage.id, {
            background: { ...currentPage.background, color: newColor }
          });
          onReloadNotebook();
        }}
        onInsertImageClick={handleInsertImage}
        onOpenFind={() => setIsFindModalOpen(true)}
        onOpenOcr={() => setIsOcrModalOpen(true)}
        onSelectPreset={handleSelectPreset}
        onOpenSavePreset={() => setIsSavePresetModalOpen(true)}
        onOpenManagePresets={() => setIsManagePresetsModalOpen(true)}
        onToggleCollaboration={() => setIsCollabPanelOpen(!isCollabPanelOpen)}
        onToggleDictation={handleToggleDictation}
        onOpenBookmarkModal={() => {
          if (currentPage) {
            setBookmarkModalTarget({ page: currentPage, index: currentPageIndex });
          }
        }}
        isCurrentPageBookmarked={!!currentPage?.isBookmarked}
        onOpenStylusShortcuts={() => setIsStylusModalOpen(true)}
        onOpenAnalytics={() => setIsAnalyticsModalOpen(true)}
        onOpenAIReader={() => handleTriggerAIReader()}
        currentTheme={currentTheme}
        onToggleTheme={onToggleTheme}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Page Thumbnail Sidebar */}
        <PageThumbnailSidebar
          isOpen={isSidebarOpen}
          pages={pages}
          currentPageIndex={currentPageIndex}
          onClose={() => setIsSidebarOpen(false)}
          onSelectPage={setCurrentPageIndex}
          onInsertPage={handleInsertPage}
          onDuplicatePage={handleDuplicatePage}
          onDeletePage={handleDeletePage}
          onToggleBookmark={handleToggleBookmarkQuick}
          onOpenBookmarkModal={(page, index) => setBookmarkModalTarget({ page, index })}
        />

        {/* Canvas Scrollable Workspace */}
        <main className="flex-1 overflow-auto bg-slate-950 flex flex-col items-center justify-center p-8 custom-scrollbar relative">
          {/* Subtle Autosave Indicator */}
          <div className="absolute top-4 right-6 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[10px] font-medium text-slate-400">
            {saveStatus === 'saving' ? (
              <>
                <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />
                <span>Saving to IndexedDB...</span>
              </>
            ) : (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Saved locally</span>
              </>
            )}
          </div>

          {/* Interactive Dual Canvas */}
          {currentPage && (
            <div className="relative">
              <CanvasWorkspace
                page={currentPage}
                strokes={strokes}
                shapes={shapes}
                texts={texts}
                images={images}
                settings={settings}
                pdfBgCanvas={pdfBgCanvas}
                zoomScale={zoomScale}
                selection={selection}
                currentPageIndex={currentPageIndex}
                totalPages={pages.length}
                onAddStroke={handleAddStroke}
                onUpdateStrokes={handleUpdateStrokes}
                onRecordHistory={recordHistory}
                onAddShape={handleAddShape}
                onAddText={handleAddText}
                onEraseStrokes={handleEraseStrokes}
                onUpdateSelection={setSelection}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onNextPage={handleNextPage}
                onPrevPage={handlePrevPage}
                onAIReaderTrigger={handleTriggerAIReader}
              />

              {/* Text Box Overlays */}
              {texts.map(t => (
                <TextBoxOverlay
                  key={t.id}
                  text={t}
                  zoomScale={zoomScale}
                  isSelected={selection.textIds.includes(t.id)}
                  onUpdate={updated => {
                    const newTexts = texts.map(tx => (tx.id === updated.id ? updated : tx));
                    setTexts(newTexts);
                    triggerAutosave(strokes, shapes, newTexts, images);
                  }}
                  onDelete={id => {
                    const newTexts = texts.filter(tx => tx.id !== id);
                    setTexts(newTexts);
                    triggerAutosave(strokes, shapes, newTexts, images);
                  }}
                  onSelect={id => setSelection({ ...selection, textIds: [id] })}
                />
              ))}

              {/* Lasso Selection Transform Overlay */}
              <SelectionOverlay
                selection={selection}
                zoomScale={zoomScale}
                onMove={handleMoveSelection}
                onScale={handleScaleSelection}
                onDelete={handleDeleteSelection}
                onDuplicate={handleDuplicateSelection}
                onChangeColor={handleChangeSelectionColor}
                onDeselect={() =>
                  setSelection({ strokeIds: [], shapeIds: [], textIds: [], imageIds: [], bounds: null })
                }
              />
            </div>
          )}
        </main>

        {/* Real-Time Collaboration & Activity Feed Panel */}
        <CollaborationPanel
          isOpen={isCollabPanelOpen}
          notebook={notebook}
          currentUser={currentUser}
          presenceList={presenceList}
          activities={activities}
          onClose={() => setIsCollabPanelOpen(false)}
        />
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        notebook={notebook}
        currentPageIndex={currentPageIndex}
        totalPages={pages.length}
        onClose={() => setIsExportModalOpen(false)}
        onExportPNG={handleExportPNG}
        onExportPDF={async onProgress => {
          await exportNotebookToPDF(notebook, pages, onProgress);
        }}
        onExportJSON={async () => {
          const dataStr = JSON.stringify({ notebook, pages, strokes, shapes, texts, images });
          const blob = new Blob([dataStr], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${notebook.title}.seen`;
          a.click();
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        settings={settings}
        onClose={() => setIsSettingsModalOpen(false)}
        onUpdateSettings={newSettings => {
          setSettings(newSettings);
          db.settings.put({ id: 'user_settings', data: newSettings }).catch(console.error);
        }}
        onClearStorage={async () => {
          await db.delete();
          window.location.reload();
        }}
      />

      {/* Find in Notebook Search Modal */}
      <FindInNotebookModal
        isOpen={isFindModalOpen}
        notebookId={notebook.id}
        currentPageIndex={currentPageIndex}
        onClose={() => setIsFindModalOpen(false)}
        onJumpToPage={setCurrentPageIndex}
      />

      {/* OCR Handwriting Transcript Modal */}
      {currentPage && (
        <OcrTranscriptModal
          isOpen={isOcrModalOpen}
          notebookId={notebook.id}
          currentPage={currentPage}
          strokes={strokes}
          texts={texts}
          onClose={() => setIsOcrModalOpen(false)}
        />
      )}

      {/* Save Custom Pen Preset Modal */}
      <SavePenPresetModal
        isOpen={isSavePresetModalOpen}
        currentColor={settings.penColor}
        currentWidth={settings.penWidth}
        currentOpacity={settings.penOpacity ?? 1}
        currentTool={settings.activeTool}
        existingPresets={settings.penPresets || []}
        onClose={() => setIsSavePresetModalOpen(false)}
        onSavePreset={handleSavePreset}
      />

      {/* Manage Pen Presets Modal */}
      <PenPresetManagerModal
        isOpen={isManagePresetsModalOpen}
        presets={settings.penPresets || []}
        activePresetId={settings.activePresetId}
        onClose={() => setIsManagePresetsModalOpen(false)}
        onSelectPreset={handleSelectPreset}
        onUpdatePresets={handleUpdatePresets}
        onOpenSaveModal={() => setIsSavePresetModalOpen(true)}
      />

      {/* Stylus Button Shortcuts Modal */}
      <StylusShortcutsModal
        isOpen={isStylusModalOpen}
        settings={settings}
        onClose={() => setIsStylusModalOpen(false)}
        onUpdateSettings={newSettings => {
          setSettings(newSettings);
          db.settings.put({ id: 'user_settings', data: newSettings }).catch(console.error);
        }}
      />

      {/* Bookmark Page Modal */}
      {bookmarkModalTarget && (
        <BookmarkPageModal
          isOpen={!!bookmarkModalTarget}
          page={bookmarkModalTarget.page}
          pageIndex={bookmarkModalTarget.index}
          onClose={() => setBookmarkModalTarget(null)}
          onSaveBookmark={handleSaveBookmark}
        />
      )}

      {/* Floating Voice Dictation Banner */}
      <VoiceDictationBar
        isListening={isDictating}
        transcript={dictationTranscript}
        interimTranscript={dictationInterim}
        errorMessage={dictationError}
        onStop={handleToggleDictation}
        onClear={() => {
          setDictationTranscript('');
          setDictationInterim('');
        }}
      />

      {/* Creator Access Logs & Analytics Modal */}
      <NotebookAnalyticsModal
        isOpen={isAnalyticsModalOpen}
        notebook={notebook}
        onClose={() => setIsAnalyticsModalOpen(false)}
      />

      {/* AI Reader Side Drawer & Handwriting Q&A Chat */}
      <AIReaderPanel
        isOpen={isAIReaderOpen}
        onClose={() => setIsAIReaderOpen(false)}
        pageImage={aiReaderPageImage}
        pageIndex={currentPageIndex}
        onInsertTextToPage={text => {
          if (!currentPage) return;
          const newText: TextObject = {
            id: `text_${Date.now()}`,
            pageId: currentPage.id,
            x: 100,
            y: 120,
            width: 450,
            height: 180,
            content: text,
            fontSize: 18,
            fontFamily: 'Plus Jakarta Sans',
            color: '#0f172a',
            isBold: false,
            isItalic: false,
            isUnderline: false,
            align: 'left',
            rotation: 0
          };
          const newTexts = [...texts, newText];
          setTexts(newTexts);
          triggerAutosave(strokes, shapes, newTexts, images);
        }}
      />
    </div>
  );
};
