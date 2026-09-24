import { WebSocketServer, WebSocket } from 'ws';
import { serverStorage } from './storage';
import {
  WSClientAction,
  WSServerMessage,
  CollaboratorPresence,
  CollaboratorRole
} from '../src/types/collaboration';

interface ClientSession {
  ws: WebSocket;
  userId?: string;
  displayName?: string;
  username?: string;
  avatarColor?: string;
  currentNotebookId?: string;
  currentPageIndex?: number;
  lastPing: number;
}

export class CollaborationWebSocketHub {
  private wss: WebSocketServer;
  private clients = new Map<WebSocket, ClientSession>();
  // notebookId -> Set of WebSockets
  private rooms = new Map<string, Set<WebSocket>>();

  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.setupListeners();
  }

  private setupListeners(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      const session: ClientSession = {
        ws,
        lastPing: Date.now()
      };
      this.clients.set(ws, session);

      ws.on('message', (data: string | Buffer) => {
        try {
          const action = JSON.parse(data.toString()) as WSClientAction;
          this.handleAction(ws, session, action);
        } catch (err) {
          console.error('Error handling WebSocket message:', err);
        }
      });

      ws.on('close', () => {
        this.handleDisconnect(ws, session);
      });

      ws.on('error', (err) => {
        console.warn('WebSocket error:', err);
      });
    });

    // Heartbeat ping interval
    setInterval(() => {
      for (const [ws, session] of this.clients.entries()) {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify({ type: 'pong' }));
          } catch {
            // Ignore socket send errors
          }
        }
      }
    }, 30000);
  }

  private handleAction(ws: WebSocket, session: ClientSession, action: WSClientAction): void {
    switch (action.type) {
      case 'auth': {
        session.userId = action.userId;
        session.displayName = action.displayName;
        session.username = action.username;
        session.avatarColor = action.avatarColor;
        this.send(ws, {
          type: 'auth_success',
          user: { id: action.userId, name: action.displayName, username: action.username }
        });
        break;
      }

      case 'join_notebook': {
        const { notebookId, pageIndex } = action;
        const userId = session.userId || 'anonymous';
        const displayName = session.displayName || 'Collaborator';

        // Leave any previous notebook room
        if (session.currentNotebookId && session.currentNotebookId !== notebookId) {
          this.leaveRoom(ws, session.currentNotebookId);
        }

        session.currentNotebookId = notebookId;
        session.currentPageIndex = pageIndex;

        this.joinRoom(ws, notebookId);

        // Ensure user is registered as member or viewer
        let role = serverStorage.getUserRoleInNotebook(notebookId, userId);
        const notebook = serverStorage.getNotebook(notebookId);

        if (!role) {
          if (notebook?.ownerId === userId) {
            role = 'owner';
          } else if (notebook?.shareLinkAccess === 'editor') {
            serverStorage.addNotebookMember(notebookId, userId, 'editor');
            role = 'editor';
          } else if (notebook?.shareLinkAccess === 'commenter') {
            serverStorage.addNotebookMember(notebookId, userId, 'commenter');
            role = 'commenter';
          } else {
            // Default to viewer for open link
            serverStorage.addNotebookMember(notebookId, userId, 'viewer');
            role = 'viewer';
          }
        }

        const members = serverStorage.getNotebookMembers(notebookId);
        const presence = this.getRoomPresence(notebookId);

        // Send room initial state to joining user
        this.send(ws, {
          type: 'room_state',
          notebookId,
          members,
          presence,
          userRole: role,
          canDeleteOthers: !!notebook?.canEditorsDeleteOthersContent
        });

        // Broadcast presence update to entire room
        this.broadcastToRoom(notebookId, {
          type: 'presence_update',
          notebookId,
          presence
        });
        break;
      }

      case 'leave_notebook': {
        if (session.currentNotebookId) {
          const nbId = session.currentNotebookId;
          this.leaveRoom(ws, nbId);
          session.currentNotebookId = undefined;
          this.broadcastToRoom(nbId, {
            type: 'presence_update',
            notebookId: nbId,
            presence: this.getRoomPresence(nbId)
          });
        }
        break;
      }

      case 'cursor_move': {
        if (!session.currentNotebookId || !session.userId) return;
        session.currentPageIndex = action.pageIndex;
        // Broadcast cursor movement to all OTHER clients in the room
        this.broadcastToRoom(
          session.currentNotebookId,
          {
            type: 'cursor_moved',
            notebookId: session.currentNotebookId,
            userId: session.userId,
            displayName: session.displayName || 'Collaborator',
            avatarColor: session.avatarColor || '#6366f1',
            pageIndex: action.pageIndex,
            x: action.x,
            y: action.y
          },
          ws
        );
        break;
      }

      case 'live_writing_status': {
        if (!session.currentNotebookId || !session.userId) return;
        this.broadcastToRoom(
          session.currentNotebookId,
          {
            type: 'live_writing',
            notebookId: session.currentNotebookId,
            userId: session.userId,
            displayName: session.displayName || 'Collaborator',
            pageIndex: action.pageIndex,
            isWriting: action.isWriting,
            tool: action.tool
          },
          ws
        );
        break;
      }

      case 'stroke_stream_points': {
        // Stream chunk of live points for ultra-smooth real-time drawing
        if (!session.currentNotebookId || !session.userId) return;
        this.broadcastToRoom(
          session.currentNotebookId,
          {
            type: 'stroke_stream_chunk',
            notebookId: session.currentNotebookId,
            pageIndex: action.pageIndex,
            strokeId: action.strokeId,
            userId: session.userId,
            points: action.points,
            color: action.color,
            width: action.width,
            opacity: action.opacity,
            tool: action.tool
          },
          ws
        );
        break;
      }

      case 'stroke_create': {
        const { notebookId, stroke } = action;
        const userId = session.userId || 'anonymous';

        // Server-side permission check
        const canWrite = serverStorage.canUserWriteInNotebook(notebookId, userId);
        if (!canWrite) {
          this.send(ws, {
            type: 'permission_denied',
            action: 'stroke_create',
            reason: 'Viewers and commenters cannot draw on shared documents'
          });
          return;
        }

        // Tag stroke with authenticated creator metadata
        const enrichedStroke = {
          ...stroke,
          createdBy: userId,
          createdByName: session.displayName || 'Collaborator',
          createdAt: Date.now()
        };

        // Persist to server store
        serverStorage.addStroke(stroke.pageId, enrichedStroke);

        // Broadcast finalized stroke to all OTHER clients in the room
        this.broadcastToRoom(
          notebookId,
          {
            type: 'stroke_created',
            notebookId,
            stroke: enrichedStroke
          },
          ws
        );
        break;
      }

      case 'stroke_delete': {
        const { notebookId, strokeId, pageId } = action;
        const userId = session.userId || 'anonymous';

        // Find existing stroke to verify creator
        const strokes = serverStorage.getPageStrokes(pageId);
        const targetStroke = strokes.find(s => s.id === strokeId);

        // Server-side permission check (Rule: creator or owner or authorized editor)
        const canDelete = serverStorage.canUserDeleteObject(notebookId, userId, targetStroke?.createdBy);
        if (!canDelete) {
          this.send(ws, {
            type: 'permission_denied',
            action: 'stroke_delete',
            reason: "You cannot delete another collaborator's handwriting"
          });
          return;
        }

        serverStorage.softDeleteStroke(pageId, strokeId, userId);

        // Broadcast deletion to ALL clients in the room (including sender to confirm deletion)
        this.broadcastToRoom(notebookId, {
          type: 'stroke_deleted',
          notebookId,
          strokeId,
          pageId,
          deletedBy: userId
        });
        break;
      }

      case 'shape_create': {
        const { notebookId, shape } = action;
        const userId = session.userId || 'anonymous';
        if (!serverStorage.canUserWriteInNotebook(notebookId, userId)) {
          this.send(ws, { type: 'permission_denied', action: 'shape_create', reason: 'Write permission required' });
          return;
        }
        const enriched = {
          ...shape,
          createdBy: userId,
          createdByName: session.displayName || 'Collaborator',
          createdAt: Date.now()
        };
        serverStorage.addShape(shape.pageId, enriched);
        this.broadcastToRoom(notebookId, { type: 'shape_created', notebookId, shape: enriched }, ws);
        break;
      }

      case 'shape_delete': {
        const { notebookId, shapeId, pageId } = action;
        const userId = session.userId || 'anonymous';
        const shapes = serverStorage.getPageShapes(pageId);
        const target = shapes.find(s => s.id === shapeId);
        if (!serverStorage.canUserDeleteObject(notebookId, userId, target?.createdBy)) {
          this.send(ws, { type: 'permission_denied', action: 'shape_delete', reason: 'Delete permission denied' });
          return;
        }
        serverStorage.softDeleteShape(pageId, shapeId, userId);
        this.broadcastToRoom(notebookId, { type: 'shape_deleted', notebookId, shapeId, pageId, deletedBy: userId });
        break;
      }

      case 'text_create': {
        const { notebookId, text } = action;
        const userId = session.userId || 'anonymous';
        if (!serverStorage.canUserWriteInNotebook(notebookId, userId)) {
          this.send(ws, { type: 'permission_denied', action: 'text_create', reason: 'Write permission required' });
          return;
        }
        const enriched = {
          ...text,
          createdBy: userId,
          createdByName: session.displayName || 'Collaborator',
          createdAt: Date.now()
        };
        serverStorage.addText(text.pageId, enriched);
        this.broadcastToRoom(notebookId, { type: 'text_created', notebookId, text: enriched }, ws);
        break;
      }

      case 'text_update': {
        const { notebookId, text } = action;
        const userId = session.userId || 'anonymous';
        if (!serverStorage.canUserWriteInNotebook(notebookId, userId)) {
          this.send(ws, { type: 'permission_denied', action: 'text_update', reason: 'Write permission required' });
          return;
        }
        serverStorage.addText(text.pageId, text);
        this.broadcastToRoom(notebookId, { type: 'text_updated', notebookId, text }, ws);
        break;
      }

      case 'text_delete': {
        const { notebookId, textId, pageId } = action;
        const userId = session.userId || 'anonymous';
        const texts = serverStorage.getPageTexts(pageId);
        const target = texts.find(t => t.id === textId);
        if (!serverStorage.canUserDeleteObject(notebookId, userId, target?.createdBy)) {
          this.send(ws, { type: 'permission_denied', action: 'text_delete', reason: 'Delete permission denied' });
          return;
        }
        serverStorage.softDeleteText(pageId, textId, userId);
        this.broadcastToRoom(notebookId, { type: 'text_deleted', notebookId, textId, pageId, deletedBy: userId });
        break;
      }

      case 'comment_add': {
        const { notebookId, comment } = action;
        const added = serverStorage.addComment(notebookId, comment);
        this.broadcastToRoom(notebookId, { type: 'comment_added', notebookId, comment: added });
        break;
      }

      case 'comment_resolve': {
        const { notebookId, commentId, resolved } = action;
        serverStorage.resolveComment(notebookId, commentId, resolved);
        this.broadcastToRoom(notebookId, { type: 'comment_resolved', notebookId, commentId, resolved });
        break;
      }

      case 'role_change': {
        const { notebookId, targetUserId, newRole } = action;
        const callerId = session.userId || '';
        const callerRole = serverStorage.getUserRoleInNotebook(notebookId, callerId);
        if (callerRole !== 'owner') {
          this.send(ws, { type: 'permission_denied', action: 'role_change', reason: 'Only the notebook owner can modify member roles' });
          return;
        }
        serverStorage.updateMemberRole(notebookId, targetUserId, newRole);
        this.broadcastToRoom(notebookId, {
          type: 'role_changed',
          notebookId,
          userId: targetUserId,
          newRole
        });
        break;
      }

      case 'ping': {
        this.send(ws, { type: 'pong' });
        break;
      }
    }
  }

  private joinRoom(ws: WebSocket, roomId: string): void {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId)!.add(ws);
  }

  private leaveRoom(ws: WebSocket, roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.delete(ws);
      if (room.size === 0) {
        this.rooms.delete(roomId);
      }
    }
  }

  private getRoomPresence(notebookId: string): CollaboratorPresence[] {
    const room = this.rooms.get(notebookId);
    if (!room) return [];
    const presenceList: CollaboratorPresence[] = [];
    const seenUsers = new Set<string>();

    for (const clientWs of room) {
      const s = this.clients.get(clientWs);
      if (s && s.userId && !seenUsers.has(s.userId)) {
        seenUsers.add(s.userId);
        const role = serverStorage.getUserRoleInNotebook(notebookId, s.userId) || 'viewer';
        presenceList.push({
          userId: s.userId,
          displayName: s.displayName || 'Collaborator',
          username: s.username || 'user',
          avatarColor: s.avatarColor || '#6366f1',
          role,
          currentPageIndex: s.currentPageIndex || 0,
          isWriting: false,
          connectedAt: Date.now()
        });
      }
    }
    return presenceList;
  }

  private broadcastToRoom(notebookId: string, message: WSServerMessage, excludeWs?: WebSocket): void {
    const room = this.rooms.get(notebookId);
    if (!room) return;
    const payload = JSON.stringify(message);
    for (const clientWs of room) {
      if (clientWs !== excludeWs && clientWs.readyState === WebSocket.OPEN) {
        try {
          clientWs.send(payload);
        } catch (err) {
          console.error('Failed to send message to client:', err);
        }
      }
    }
  }

  private send(ws: WebSocket, message: WSServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (err) {
        console.error('Failed to send message to client:', err);
      }
    }
  }

  private handleDisconnect(ws: WebSocket, session: ClientSession): void {
    if (session.currentNotebookId) {
      const nbId = session.currentNotebookId;
      this.leaveRoom(ws, nbId);
      this.broadcastToRoom(nbId, {
        type: 'presence_update',
        notebookId: nbId,
        presence: this.getRoomPresence(nbId)
      });
    }
    this.clients.delete(ws);
  }
}
