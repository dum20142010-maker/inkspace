export type PointerInputType = 'pen' | 'touch' | 'mouse';

export type ToolType = 
  | 'select' 
  | 'fountain' 
  | 'ballpoint' 
  | 'pencil' 
  | 'marker' 
  | 'highlighter' 
  | 'brush' 
  | 'eraser' 
  | 'shape' 
  | 'text' 
  | 'image' 
  | 'laser';

export type EraserType = 'stroke' | 'pixel' | 'area';

export type ShapeType = 'line' | 'arrow' | 'rectangle' | 'circle' | 'ellipse' | 'triangle' | 'polygon' | 'star';

export type PaperType = 'blank' | 'ruled' | 'lined' | 'graph' | 'dotted' | 'cornell' | 'music' | 'checklist';

export type PaperOrientation = 'portrait' | 'landscape';

export type PageSize = 'A4' | 'Letter' | 'Infinite';

export interface Point {
  x: number;
  y: number;
  pressure?: number; // 0.0 - 1.0
  tiltX?: number;
  tiltY?: number;
  time?: number;
}

export interface Stroke {
  id: string;
  pageId: string;
  tool: ToolType;
  color: string;
  width: number;
  opacity: number;
  points: Point[];
  timestamp: number;
  createdBy?: string;
  createdByName?: string;
  createdAt?: number;
  updatedAt?: number;
  deletedAt?: number | null;
  deletedBy?: string | null;
}

export interface ShapeObject {
  id: string;
  pageId: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  opacity: number;
  rotation: number; // degrees
  points?: Point[]; // for custom polygon or arrow
  isRecognized?: boolean;
  createdBy?: string;
  createdByName?: string;
  createdAt?: number;
  updatedAt?: number;
  deletedAt?: number | null;
  deletedBy?: string | null;
}

export interface TextObject {
  id: string;
  pageId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  align: 'left' | 'center' | 'right';
  rotation: number;
  createdBy?: string;
  createdByName?: string;
  createdAt?: number;
  updatedAt?: number;
  deletedAt?: number | null;
  deletedBy?: string | null;
}

export interface ImageObject {
  id: string;
  pageId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  dataUrl: string;
  rotation: number;
  aspectRatio: number;
  createdBy?: string;
  createdByName?: string;
  createdAt?: number;
  updatedAt?: number;
  deletedAt?: number | null;
  deletedBy?: string | null;
}

export interface PageBackground {
  type: PaperType;
  color: string; // e.g. #ffffff, #f8fafc, #1e293b, #fef3c7
  lineColor?: string;
  gridSize?: number; // pixels
  pdfPageNum?: number; // if PDF background
}

export interface NotebookPage {
  id: string;
  notebookId: string;
  pageIndex: number;
  width: number;
  height: number;
  orientation: PaperOrientation;
  background: PageBackground;
  createdAt: number;
  updatedAt: number;
  // Bookmark & Table of Contents fields
  isBookmarked?: boolean;
  bookmarkTitle?: string;
  bookmarkColor?: string;
  bookmarkTag?: string;
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

export interface Notebook {
  id: string;
  title: string;
  subtitle?: string; // e.g. "Foundational Guide & Tooling", "Kafka, gRPC, Ring..."
  tag?: string; // e.g. "#Onboarding", "#Architecture", "#Physics", "#Roadmap", "#Private"
  spineMaterial?: 'cobalt' | 'obsidian' | 'kraft' | 'violet' | 'emerald';
  layoutBadge?: string; // e.g. "RULED • 7MM", "CORNELL LAYOUT", "GRAPH • 5MM"
  statsSummary?: string; // e.g. "24 Pages • 3 Revisions", "48 Pages • 14 Schematics"
  graphicType?: 'sparkles_wave' | 'schematic' | 'orbit' | 'wireframe' | 'lock' | 'blank';
  folderId?: string | null;
  coverColor: string;
  coverPattern?: string;
  paperType: PaperType;
  paperColor: string;
  orientation: PaperOrientation;
  pageSize: PageSize;
  pageCount: number;
  isFavorite: boolean;
  isDeleted: boolean;
  pdfDocId?: string;
  createdAt: number;
  updatedAt: number;
  // Collaboration Fields
  ownerId?: string;
  ownerName?: string;
  isShared?: boolean;
  shareToken?: string;
  shareLinkAccess?: 'private' | 'viewer' | 'commenter' | 'editor';
  canEditorsDeleteOthersContent?: boolean;
  isLocked?: boolean;
}

export interface PdfDocument {
  id: string;
  notebookId: string;
  name: string;
  data: ArrayBuffer;
  pageCount: number;
  createdAt: number;
}

export interface SelectionState {
  strokeIds: string[];
  shapeIds: string[];
  textIds: string[];
  imageIds: string[];
  bounds: { x: number; y: number; width: number; height: number } | null;
}

export interface PenPreset {
  id: string;
  name: string;
  color: string;
  opacity: number; // 0.05 to 1.0 (e.g. 1.0 = solid, 0.75 = soft ink, 0.4 = wash)
  strokeWidth: number; // width in pixels
  tool?: ToolType; // 'fountain' | 'pencil' | 'ballpoint' | 'marker' | 'brush'
}

export interface ToolSettings {
  activeTool: ToolType;
  penColor: string;
  penWidth: number;
  penOpacity: number; // 0.05 - 1.0 (defaults to 1.0)
  penPresets: PenPreset[]; // Saved custom writing styles
  activePresetId?: string | null; // Id of currently active preset, or null
  highlighterColor: string;
  highlighterWidth: number;
  eraserType: EraserType;
  eraserSize: number;
  shapeType: ShapeType;
  shapeFill: string;
  shapeStroke: string;
  shapeWidth: number;
  autoShapeRecognition: boolean;
  palmRejection: boolean;
  pressureSensitivity: boolean;
  textColor: string;
  fontSize: number;
  fontFamily: string;
  favoriteColors: string[];
}

export type SortOption = 'recent' | 'alphabetical' | 'created';
export type SortDirection = 'asc' | 'desc';

export interface User {
  id: string;
  name: string; // display name
  username: string; // unique handle e.g. "alex_ink"
  email: string;
  bio?: string;
  workplace?: string;
  passwordHash: string;
  salt: string;
  securityQuestion: string;
  securityAnswerHash: string;
  avatarColor: string;
  avatarImage?: string; // custom avatar
  emailVisibility?: 'public' | 'connections' | 'private';
  friendRequestPrivacy?: 'everyone' | 'connections' | 'nobody';
  profileVisibility?: 'everyone' | 'connections' | 'private';
  createdAt: number;
  updatedAt: number;
}

export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  avatarColor: string;
  loggedInAt: number;
  rememberMe: boolean;
}

export interface PageOcrRecord {
  id: string; // pageId
  pageId: string;
  notebookId: string;
  pageIndex: number;
  recognizedText: string;
  strokeCount: number;
  status: 'idle' | 'scanning' | 'completed' | 'failed';
  scannedAt: number;
  engineUsed: 'gemini' | 'heuristic' | 'manual';
}

export interface SearchResultItem {
  notebookId: string;
  notebookTitle: string;
  coverColor: string;
  pageId?: string;
  pageIndex?: number;
  matchType: 'title' | 'handwriting_ocr' | 'text_box';
  snippet: string;
  matchScore: number;
}
