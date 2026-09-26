import { Point, Stroke, ShapeObject, TextObject, ImageObject } from './notebook';

export type CollaboratorRole = 'owner' | 'editor' | 'commenter' | 'viewer';

export interface NotebookMember {
  id: string;
  notebookId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarColor: string;
  avatarImage?: string;
  role: CollaboratorRole;
  joinedAt: number;
  lastActiveAt?: number;
  isOnline?: boolean;
  currentPageIndex?: number;
}

export type ConnectionStatus = 'pending' | 'accepted' | 'declined' | 'blocked';

export interface FriendConnection {
  id: string;
  userId: string;
  connectedUserId: string;
  connectedUser: {
    id: string;
    name: string;
    username: string;
    email?: string;
    avatarColor: string;
    avatarImage?: string;
    bio?: string;
    workplace?: string;
    isOnline?: boolean;
    sharedNotebooksCount?: number;
  };
  status: ConnectionStatus;
  createdAt: number;
  updatedAt: number;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUser: {
    id: string;
    name: string;
    username: string;
    avatarColor: string;
    avatarImage?: string;
  };
  toUserId: string;
  status: ConnectionStatus;
  createdAt: number;
}

export interface CollaboratorPresence {
  userId: string;
  displayName: string;
  username: string;
  avatarColor: string;
  avatarImage?: string;
  role: CollaboratorRole;
  currentPageIndex: number;
  isWriting: boolean;
  activeTool?: string;
  cursor?: {
    x: number;
    y: number;
    lastSeen: number;
  };
  connectedAt: number;
}

export interface NotebookComment {
  id: string;
  notebookId: string;
  pageIndex: number;
  x: number;
  y: number;
  userId: string;
  userName: string;
  userAvatarColor: string;
  content: string;
  resolved: boolean;
  createdAt: number;
  updatedAt?: number;
}

export interface NotebookActivity {
  id: string;
  notebookId: string;
  userId: string;
  userName: string;
  action:
    | 'joined'
    | 'left'
    | 'invited_user'
    | 'removed_user'
    | 'role_changed'
    | 'stroke_added'
    | 'stroke_deleted'
    | 'shape_added'
    | 'text_added'
    | 'image_added'
    | 'page_created'
    | 'page_deleted'
    | 'comment_added'
    | 'version_restored'
    | 'renamed';
  details: string;
  createdAt: number;
}

export interface NotebookVersion {
  id: string;
  notebookId: string;
  timestamp: number;
  authorId: string;
  authorName: string;
  summary: string;
  snapshot: {
    title: string;
    pageCount: number;
    strokesCount: number;
    shapesCount: number;
    textsCount: number;
  };
}

export interface CollaborationNotification {
  id: string;
  userId: string;
  type: 'friend_request' | 'friend_accepted' | 'notebook_invite' | 'role_changed' | 'mention' | 'comment';
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar: string;
  fromUserCollabCode?: string;
  notebookId?: string;
  notebookTitle?: string;
  role?: CollaboratorRole;
  inviteStatus?: 'pending' | 'accepted' | 'declined';
  message: string;
  read: boolean;
  createdAt: number;
}

// WebSocket Protocol Messages
export type WSClientAction =
  | { type: 'auth'; token?: string; userId: string; displayName: string; username: string; avatarColor: string }
  | { type: 'join_notebook'; notebookId: string; pageIndex: number }
  | { type: 'leave_notebook'; notebookId: string }
  | { type: 'cursor_move'; notebookId: string; pageIndex: number; x: number; y: number }
  | { type: 'live_writing_status'; notebookId: string; pageIndex: number; isWriting: boolean; tool?: string }
  | { type: 'stroke_stream_points'; notebookId: string; pageIndex: number; strokeId: string; points: Point[]; color: string; width: number; opacity: number; tool: string }
  | { type: 'stroke_create'; notebookId: string; stroke: Stroke }
  | { type: 'stroke_delete'; notebookId: string; strokeId: string; pageId: string }
  | { type: 'shape_create'; notebookId: string; shape: ShapeObject }
  | { type: 'shape_update'; notebookId: string; shape: ShapeObject }
  | { type: 'shape_delete'; notebookId: string; shapeId: string; pageId: string }
  | { type: 'text_create'; notebookId: string; text: TextObject }
  | { type: 'text_update'; notebookId: string; text: TextObject }
  | { type: 'text_delete'; notebookId: string; textId: string; pageId: string }
  | { type: 'image_create'; notebookId: string; image: ImageObject }
  | { type: 'image_delete'; notebookId: string; imageId: string; pageId: string }
  | { type: 'page_create'; notebookId: string; pageIndex: number }
  | { type: 'page_delete'; notebookId: string; pageId: string }
  | { type: 'comment_add'; notebookId: string; comment: NotebookComment }
  | { type: 'comment_resolve'; notebookId: string; commentId: string; resolved: boolean }
  | { type: 'role_change'; notebookId: string; targetUserId: string; newRole: CollaboratorRole }
  | { type: 'ping' };

export type WSServerMessage =
  | { type: 'auth_success'; user: { id: string; name: string; username: string } }
  | { type: 'room_state'; notebookId: string; members: NotebookMember[]; presence: CollaboratorPresence[]; userRole: CollaboratorRole; canDeleteOthers: boolean }
  | { type: 'presence_update'; notebookId: string; presence: CollaboratorPresence[] }
  | { type: 'cursor_moved'; notebookId: string; userId: string; displayName: string; avatarColor: string; pageIndex: number; x: number; y: number }
  | { type: 'live_writing'; notebookId: string; userId: string; displayName: string; pageIndex: number; isWriting: boolean; tool?: string }
  | { type: 'stroke_stream_chunk'; notebookId: string; pageIndex: number; strokeId: string; userId: string; points: Point[]; color: string; width: number; opacity: number; tool: string }
  | { type: 'stroke_created'; notebookId: string; stroke: Stroke }
  | { type: 'stroke_deleted'; notebookId: string; strokeId: string; pageId: string; deletedBy: string }
  | { type: 'shape_created'; notebookId: string; shape: ShapeObject }
  | { type: 'shape_updated'; notebookId: string; shape: ShapeObject }
  | { type: 'shape_deleted'; notebookId: string; shapeId: string; pageId: string; deletedBy: string }
  | { type: 'text_created'; notebookId: string; text: TextObject }
  | { type: 'text_updated'; notebookId: string; text: TextObject }
  | { type: 'text_deleted'; notebookId: string; textId: string; pageId: string; deletedBy: string }
  | { type: 'image_created'; notebookId: string; image: ImageObject }
  | { type: 'image_deleted'; notebookId: string; imageId: string; pageId: string; deletedBy: string }
  | { type: 'page_created'; notebookId: string; pageIndex: number }
  | { type: 'page_deleted'; notebookId: string; pageId: string }
  | { type: 'comment_added'; notebookId: string; comment: NotebookComment }
  | { type: 'comment_resolved'; notebookId: string; commentId: string; resolved: boolean }
  | { type: 'role_changed'; notebookId: string; userId: string; newRole: CollaboratorRole }
  | { type: 'activity_logged'; notebookId: string; activity: NotebookActivity }
  | { type: 'permission_denied'; reason: string; action: string }
  | { type: 'notification'; notification: CollaborationNotification }
  | { type: 'pong' };
