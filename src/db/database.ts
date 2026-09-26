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
  PageOcrRecord,
  NotebookAccessLog
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
  accessLogs!: Table<NotebookAccessLog>;

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

    this.version(4).stores({
      accessLogs: 'id, notebookId, userId, openedAt'
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
      collabCode: '849201',
      passwordHash,
      salt,
      securityQuestion: "What was your first pet's name?",
      securityAnswerHash,
      avatarColor: '#d97706',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }

  // Ensure no prebuilt default folders exist so users can create their own custom folders
  const prebuiltFolderIds = ['folder_research', 'folder_executive', 'folder_field'];
  for (const pfId of prebuiltFolderIds) {
    const existing = await db.folders.get(pfId);
    if (existing) {
      await db.folders.delete(pfId);
    }
  }

  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    const defaultSettings: ToolSettings = {
      activeTool: 'fountain',
      appTheme: 'dark',
      stylusShortcuts: {
        barrelButton1: 'eraser',
        barrelButton2: 'select',
        eraserSwitch: 'undo'
      },
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

  // Remove prebuilt sample notebooks if present so users create their own notebooks
  const prebuiltIds = [
    'notebook_welcome_sample',
    'notebook_event_pipelines',
    'notebook_fluid_dynamics',
    'notebook_product_vision',
    'notebook_creative_marginalia'
  ];
  for (const prebuiltId of prebuiltIds) {
    const existing = await db.notebooks.get(prebuiltId);
    if (existing) {
      await db.notebooks.delete(prebuiltId);
      await db.pages.where('notebookId').equals(prebuiltId).delete();
    }
  }
}
