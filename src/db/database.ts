import Dexie, { Table } from 'dexie';
import {
  Notebook,
  Folder,
  NotebookPage,
  Stroke,
  ShapeObject,
  TextObject,
  ImageObject,
  PdfDocument,
  ToolSettings,
  PenPreset,
  User,
  PageOcrRecord
} from '../types/notebook';
import { generateSalt, hashStringWithSalt } from '../utils/crypto';

export const DEFAULT_PEN_PRESETS: PenPreset[] = [
  {
    id: 'preset_calligraphy_black',
    name: 'Calligraphy Black',
    color: '#0f172a',
    opacity: 1.0,
    strokeWidth: 3,
    tool: 'fountain'
  },
  {
    id: 'preset_notebook_blue',
    name: 'Notebook Blue',
    color: '#2563eb',
    opacity: 1.0,
    strokeWidth: 2,
    tool: 'fountain'
  },
  {
    id: 'preset_graphite_sketch',
    name: 'Graphite Sketch',
    color: '#475569',
    opacity: 0.7,
    strokeWidth: 2,
    tool: 'pencil'
  },
  {
    id: 'preset_review_red',
    name: 'Review Red',
    color: '#dc2626',
    opacity: 0.9,
    strokeWidth: 3,
    tool: 'fountain'
  },
  {
    id: 'preset_wash_violet',
    name: 'Wash Violet',
    color: '#9333ea',
    opacity: 0.45,
    strokeWidth: 8,
    tool: 'brush'
  },
  {
    id: 'preset_emerald_fineliner',
    name: 'Emerald Fineliner',
    color: '#059669',
    opacity: 1.0,
    strokeWidth: 1.5,
    tool: 'ballpoint'
  }
];

export class SeenDatabase extends Dexie {
  notebooks!: Table<Notebook>;
  folders!: Table<Folder>;
  pages!: Table<NotebookPage>;
  strokes!: Table<Stroke>;
  shapes!: Table<ShapeObject>;
  texts!: Table<TextObject>;
  images!: Table<ImageObject>;
  pdfDocs!: Table<PdfDocument>;
  settings!: Table<{ id: string; data: ToolSettings }>;
  users!: Table<User>;
  ocrRecords!: Table<PageOcrRecord>;

  constructor() {
    super('seen_notebook_db');

    this.version(1).stores({
      notebooks: 'id, title, folderId, isFavorite, isDeleted, createdAt, updatedAt',
      folders: 'id, name, createdAt',
      pages: 'id, notebookId, pageIndex, [notebookId+pageIndex]',
      strokes: 'id, pageId, timestamp',
      shapes: 'id, pageId',
      texts: 'id, pageId',
      images: 'id, pageId',
      pdfDocs: 'id, notebookId',
      settings: 'id'
    });

    this.version(2).stores({
      users: 'id, email, name, createdAt'
    });

    this.version(3).stores({
      ocrRecords: 'id, pageId, notebookId, status, scannedAt'
    });
  }
}

export const db = new SeenDatabase();

// Utility helpers for bulk Operations & default data initialization
export async function initializeDatabase() {
  const usersCount = await db.users.count();
  if (usersCount === 0) {
    const salt = generateSalt();
    const passwordHash = await hashStringWithSalt('Password123!', salt);
    const securityAnswerHash = await hashStringWithSalt('luna', salt);
    await db.users.add({
      id: 'user_default_demo',
      name: 'Executive Studio',
      username: 'executive_studio',
      email: 'codex@seen.app',
      passwordHash,
      salt,
      securityQuestion: "What was your first pet's name?",
      securityAnswerHash,
      avatarColor: '#d97706',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }

  const foldersCount = await db.folders.count();
  if (foldersCount === 0) {
    await db.folders.bulkAdd([
      { id: 'folder_research', name: 'Research & Treatises', color: '#3b82f6', createdAt: Date.now() },
      { id: 'folder_executive', name: 'Executive Manuscripts', color: '#a855f7', createdAt: Date.now() + 1 },
      { id: 'folder_field', name: 'Field Inklings & Sketches', color: '#10b981', createdAt: Date.now() + 2 }
    ]);
  }

  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    const defaultSettings: ToolSettings = {
      activeTool: 'fountain',
      penColor: '#0f172a',
      penWidth: 3,
      penOpacity: 1.0,
      penPresets: DEFAULT_PEN_PRESETS,
      activePresetId: 'preset_calligraphy_black',
      highlighterColor: '#fde047',
      highlighterWidth: 20,
      eraserType: 'pixel', // Spot / precision eraser is the natural default
      eraserSize: 32,
      shapeType: 'rectangle',
      shapeFill: 'transparent',
      shapeStroke: '#3b82f6',
      shapeWidth: 2,
      autoShapeRecognition: false, // Keep false so freehand handwriting doesn't turn into boxes
      palmRejection: true,
      pressureSensitivity: true,
      textColor: '#0f172a',
      fontSize: 20,
      fontFamily: 'Plus Jakarta Sans',
      favoriteColors: ['#0f172a', '#2563eb', '#dc2626', '#16a34a', '#d97706', '#9333ea', '#db2777']
    };
    await db.settings.put({ id: 'user_settings', data: defaultSettings });
  } else {
    // If existing settings had old stroke eraser or missing penPresets/penOpacity, ensure friendly defaults
    const current = await db.settings.get('user_settings');
    if (current) {
      let updatedData = { ...current.data };
      let changed = false;
      if (updatedData.autoShapeRecognition) {
        updatedData.autoShapeRecognition = false;
        changed = true;
      }
      if (updatedData.penOpacity === undefined) {
        updatedData.penOpacity = 1.0;
        changed = true;
      }
      if (!updatedData.penPresets || updatedData.penPresets.length === 0) {
        updatedData.penPresets = DEFAULT_PEN_PRESETS;
        updatedData.activePresetId = 'preset_calligraphy_black';
        changed = true;
      }
      if (changed) {
        await db.settings.put({
          id: 'user_settings',
          data: updatedData
        });
      }
    }
  }

  const notebooksCount = await db.notebooks.count();
  if (notebooksCount === 0) {
    const now = Date.now();
    const foliosToSeed: Notebook[] = [
      {
        id: 'notebook_welcome_sample',
        title: 'Welcome to SEEN',
        subtitle: 'Foundational Guide & Tooling',
        tag: '#Onboarding',
        coverColor: '#1e40af',
        coverPattern: 'abstract',
        spineMaterial: 'cobalt',
        layoutBadge: 'RULED • 7MM',
        statsSummary: '24 Pages • 3 Revisions',
        graphicType: 'sparkles_wave',
        paperType: 'ruled',
        paperColor: '#fefcf0',
        orientation: 'portrait',
        pageSize: 'A4',
        pageCount: 24,
        isFavorite: true,
        isDeleted: false,
        folderId: 'folder_research',
        createdAt: now - 120000,
        updatedAt: now - 120000
      },
      {
        id: 'notebook_event_pipelines',
        title: 'Event Pipelines',
        subtitle: 'Kafka, gRPC, Ring...',
        tag: '#Architecture',
        coverColor: '#18181b',
        coverPattern: 'minimal',
        spineMaterial: 'obsidian',
        layoutBadge: 'CORNELL LAYOUT',
        statsSummary: '48 Pages • 14 Schematics',
        graphicType: 'schematic',
        paperType: 'cornell',
        paperColor: '#f8fafc',
        orientation: 'portrait',
        pageSize: 'A4',
        pageCount: 48,
        isFavorite: false,
        isDeleted: false,
        folderId: 'folder_executive',
        createdAt: now - 86400000,
        updatedAt: now - 86400000
      },
      {
        id: 'notebook_fluid_dynamics',
        title: 'Fluid Dynamics...',
        subtitle: 'Navier-Stokes & Bound...',
        tag: '#Physics',
        coverColor: '#064e3b',
        coverPattern: 'grid',
        spineMaterial: 'emerald',
        layoutBadge: 'GRAPH • 5MM',
        statsSummary: '86 Pages • 14 PDF Inklings',
        graphicType: 'orbit',
        paperType: 'graph',
        paperColor: '#ffffff',
        orientation: 'portrait',
        pageSize: 'A4',
        pageCount: 86,
        isFavorite: false,
        isDeleted: false,
        folderId: 'folder_field',
        createdAt: now - 172800000,
        updatedAt: now - 172800000
      },
      {
        id: 'notebook_product_vision',
        title: 'Product Vision ...',
        subtitle: 'Spatial UX & Tactile Stylus',
        tag: '#Roadmap',
        coverColor: '#4c1d95',
        coverPattern: 'dots',
        spineMaterial: 'violet',
        layoutBadge: 'BLANK CANVAS',
        statsSummary: '32 Pages • 8 Collaborators',
        graphicType: 'wireframe',
        paperType: 'blank',
        paperColor: '#ffffff',
        orientation: 'portrait',
        pageSize: 'A4',
        pageCount: 32,
        isFavorite: false,
        isDeleted: false,
        folderId: 'folder_executive',
        createdAt: now - 259200000,
        updatedAt: now - 259200000
      },
      {
        id: 'notebook_creative_marginalia',
        title: 'Creative Marginalia',
        subtitle: 'Morning Inks & Private R...',
        tag: '#Private',
        coverColor: '#1c1917',
        coverPattern: 'lines',
        spineMaterial: 'obsidian',
        layoutBadge: 'DOTTED • 4MM',
        statsSummary: '112 Pages • Biometric Key Encrypted',
        graphicType: 'lock',
        paperType: 'dotted',
        paperColor: '#fefcf0',
        orientation: 'portrait',
        pageSize: 'A4',
        pageCount: 112,
        isFavorite: false,
        isDeleted: false,
        folderId: 'folder_research',
        createdAt: now - 345600000,
        updatedAt: now - 345600000
      }
    ];

    await db.notebooks.bulkAdd(foliosToSeed);

    // Add pages for all seeded folios
    const pagesToAdd: NotebookPage[] = [];
    for (const folio of foliosToSeed) {
      pagesToAdd.push({
        id: `page_${folio.id}_1`,
        notebookId: folio.id,
        pageIndex: 0,
        width: 800,
        height: 1132,
        orientation: 'portrait',
        background: { type: folio.paperType, color: folio.paperColor, lineColor: '#cbd5e1' },
        createdAt: folio.createdAt,
        updatedAt: folio.updatedAt
      });
    }
    await db.pages.bulkAdd(pagesToAdd);

    const welcomeId = 'notebook_welcome_sample';
    const pageId1 = 'page_notebook_welcome_sample_1';

    // Add welcome handwritten sample strokes and text
    await db.texts.add({
      id: 'text_welcome_1',
      pageId: pageId1,
      x: 80,
      y: 80,
      width: 640,
      height: 120,
      content: 'SEEN — The Next-Gen Digital Notebook',
      fontSize: 28,
      fontFamily: 'Plus Jakarta Sans',
      color: '#1e293b',
      isBold: true,
      isItalic: false,
      isUnderline: false,
      align: 'left',
      rotation: 0
    });

    await db.texts.add({
      id: 'text_welcome_2',
      pageId: pageId1,
      x: 80,
      y: 200,
      width: 640,
      height: 200,
      content: '• Natural ultra-low latency stylus ink engine with pressure & tilt support.\n• Support for unlimited notebooks, multi-page reordering & PDF annotations.\n• Native shape recognition, lasso selection, text boxes & local IndexedDB autosave.\n• Try drawing below with your stylus, finger, or mouse!',
      fontSize: 16,
      fontFamily: 'Plus Jakarta Sans',
      color: '#475569',
      isBold: false,
      isItalic: false,
      isUnderline: false,
      align: 'left',
      rotation: 0
    });

    // Decorative shape & sample stroke on page 1
    await db.shapes.add({
      id: 'shape_welcome_star',
      pageId: pageId1,
      type: 'rectangle',
      x: 80,
      y: 420,
      width: 640,
      height: 180,
      strokeColor: '#6366f1',
      fillColor: 'rgba(99, 102, 241, 0.05)',
      strokeWidth: 2,
      opacity: 1,
      rotation: 0
    });

    // Sample handwritten stroke "SEEN Notes"
    await db.strokes.add({
      id: 'stroke_welcome_sample_1',
      pageId: pageId1,
      tool: 'fountain',
      color: '#4f46e5',
      width: 4,
      opacity: 1,
      points: [
        { x: 120, y: 480, pressure: 0.5 },
        { x: 140, y: 470, pressure: 0.6 },
        { x: 170, y: 490, pressure: 0.7 },
        { x: 200, y: 465, pressure: 0.5 },
        { x: 240, y: 485, pressure: 0.6 }
      ],
      timestamp: now
    });

    // Seed Initial OCR Record for Welcome Notebook Page 1
    await db.ocrRecords.put({
      id: pageId1,
      pageId: pageId1,
      notebookId: welcomeId,
      pageIndex: 0,
      recognizedText: 'SEEN — The Next-Gen Digital Notebook. Natural ultra-low latency stylus ink engine with pressure & tilt support. Unlimited notebooks, multi-page reordering & PDF annotations. Handwriting OCR search utility and quick page indexing.',
      strokeCount: 5,
      status: 'completed',
      scannedAt: now,
      engineUsed: 'heuristic'
    });
  }

  // Also ensure welcome OCR record exists if database was upgraded from older version
  const ocrCount = await db.ocrRecords.count();
  if (ocrCount === 0) {
    const page1 = await db.pages.get('page_welcome_1');
    if (page1) {
      await db.ocrRecords.put({
        id: 'page_welcome_1',
        pageId: 'page_welcome_1',
        notebookId: page1.notebookId,
        pageIndex: 0,
        recognizedText: 'SEEN — The Next-Gen Digital Notebook. Natural ultra-low latency stylus ink engine with pressure & tilt support. Unlimited notebooks, multi-page reordering & PDF annotations. Handwriting OCR search utility and quick page indexing.',
        strokeCount: 5,
        status: 'completed',
        scannedAt: Date.now(),
        engineUsed: 'heuristic'
      });
    }
  }
}
