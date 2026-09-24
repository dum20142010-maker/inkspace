import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  User,
  Notebook,
  Stroke,
  ShapeObject,
  TextObject,
  ImageObject
} from '../src/types/notebook';
import {
  CollaboratorRole,
  NotebookMember,
  FriendConnection,
  FriendRequest,
  NotebookComment,
  NotebookActivity,
  NotebookVersion,
  CollaborationNotification
} from '../src/types/collaboration';

// Safe password hashing with PBKDF2
export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 32, 'sha256').toString('hex');
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

export interface ServerDatabase {
  users: User[];
  friends: { id: string; user1Id: string; user2Id: string; createdAt: number }[];
  friendRequests: FriendRequest[];
  blockedUserIds: { userId: string; blockedUserId: string }[];
  notebooks: Notebook[];
  notebookMembers: NotebookMember[];
  strokes: Record<string, Stroke[]>; // pageId -> Stroke[]
  shapes: Record<string, ShapeObject[]>; // pageId -> ShapeObject[]
  texts: Record<string, TextObject[]>; // pageId -> TextObject[]
  images: Record<string, ImageObject[]>; // pageId -> ImageObject[]
  comments: Record<string, NotebookComment[]>; // notebookId -> NotebookComment[]
  activities: Record<string, NotebookActivity[]>; // notebookId -> NotebookActivity[]
  versions: Record<string, NotebookVersion[]>; // notebookId -> NotebookVersion[]
  notifications: CollaborationNotification[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'seen_server_db.json');

class StorageManager {
  private data: ServerDatabase;

  constructor() {
    this.data = this.loadInitialData();
  }

  private loadInitialData(): ServerDatabase {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('Could not read existing DB file, re-initializing:', err);
    }
    return this.createDefaultData();
  }

  private save(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist database file:', err);
    }
  }

  private createDefaultData(): ServerDatabase {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    const salt3 = generateSalt();
    const salt4 = generateSalt();

    const now = Date.now();

    // Multi-User Test Scenario accounts (Requirement #46)
    const userA: User = {
      id: 'user_alex',
      name: 'Alex Morgan',
      username: 'alex_ink',
      email: 'alex@seen.app',
      bio: 'Calligrapher & Systems Architect at Atelier Codex',
      workplace: 'Atelier Codex',
      passwordHash: hashPassword('Password123!', salt1),
      salt: salt1,
      securityQuestion: "What was your first pet's name?",
      securityAnswerHash: hashPassword('luna', salt1),
      avatarColor: '#f59e0b',
      emailVisibility: 'public',
      friendRequestPrivacy: 'everyone',
      profileVisibility: 'everyone',
      createdAt: now - 30 * 86400000,
      updatedAt: now
    };

    const userB: User = {
      id: 'user_sarah',
      name: 'Sarah Chen',
      username: 'sarah_arch',
      email: 'sarah@seen.app',
      bio: 'Distributed Systems Engineer & Technical Illustrator',
      workplace: 'Kafka Foundation',
      passwordHash: hashPassword('Password123!', salt2),
      salt: salt2,
      securityQuestion: "What was your first pet's name?",
      securityAnswerHash: hashPassword('milo', salt2),
      avatarColor: '#6366f1',
      emailVisibility: 'connections',
      friendRequestPrivacy: 'everyone',
      profileVisibility: 'everyone',
      createdAt: now - 20 * 86400000,
      updatedAt: now
    };

    const userC: User = {
      id: 'user_daniel',
      name: 'Daniel Vance',
      username: 'daniel_code',
      email: 'daniel@seen.app',
      bio: 'Compiler Researcher & Stylus Hardware Hacker',
      workplace: 'Quantum Lab',
      passwordHash: hashPassword('Password123!', salt3),
      salt: salt3,
      securityQuestion: "What was your first pet's name?",
      securityAnswerHash: hashPassword('sparky', salt3),
      avatarColor: '#10b981',
      emailVisibility: 'private',
      friendRequestPrivacy: 'everyone',
      profileVisibility: 'everyone',
      createdAt: now - 15 * 86400000,
      updatedAt: now
    };

    const userD: User = {
      id: 'user_maya',
      name: 'Maya Lin',
      username: 'maya_sketch',
      email: 'maya@seen.app',
      bio: 'Urban Designer & Spatial UX Researcher',
      workplace: 'Design Institute',
      passwordHash: hashPassword('Password123!', salt4),
      salt: salt4,
      securityQuestion: "What was your first pet's name?",
      securityAnswerHash: hashPassword('bella', salt4),
      avatarColor: '#a855f7',
      emailVisibility: 'public',
      friendRequestPrivacy: 'everyone',
      profileVisibility: 'everyone',
      createdAt: now - 10 * 86400000,
      updatedAt: now
    };

    // Pre-seed shared notebook: Physics Project / Event Pipelines
    const sharedNotebook: Notebook = {
      id: 'notebook_physics_collab',
      title: 'Physics Project & Real-Time Inklings',
      subtitle: 'Collaborative Mechanics & Field Theorems',
      tag: '#Physics',
      coverColor: '#1e3a8a',
      spineMaterial: 'cobalt',
      layoutBadge: 'RULED • 7MM',
      statsSummary: '3 Collaborators • Multi-User Active',
      graphicType: 'sparkles_wave',
      paperType: 'ruled',
      paperColor: '#fefcf0',
      orientation: 'portrait',
      pageSize: 'A4',
      pageCount: 3,
      isFavorite: true,
      isDeleted: false,
      ownerId: 'user_alex',
      ownerName: 'Alex Morgan',
      isShared: true,
      shareToken: 'token_physics_live_789',
      shareLinkAccess: 'editor',
      canEditorsDeleteOthersContent: false, // Default per specification: editors only delete their own
      isLocked: false,
      createdAt: now - 86400000,
      updatedAt: now
    };

    const members: NotebookMember[] = [
      {
        id: 'member_alex',
        notebookId: sharedNotebook.id,
        userId: userA.id,
        username: userA.username,
        displayName: userA.name,
        avatarColor: userA.avatarColor,
        role: 'owner',
        joinedAt: now - 86400000,
        isOnline: true,
        currentPageIndex: 0
      },
      {
        id: 'member_sarah',
        notebookId: sharedNotebook.id,
        userId: userB.id,
        username: userB.username,
        displayName: userB.name,
        avatarColor: userB.avatarColor,
        role: 'editor',
        joinedAt: now - 80000000,
        isOnline: true,
        currentPageIndex: 0
      },
      {
        id: 'member_daniel',
        notebookId: sharedNotebook.id,
        userId: userC.id,
        username: userC.username,
        displayName: userC.name,
        avatarColor: userC.avatarColor,
        role: 'viewer',
        joinedAt: now - 70000000,
        isOnline: false,
        currentPageIndex: 0
      }
    ];

    const initialStrokes: Stroke[] = [
      {
        id: 'stroke_alex_init_1',
        pageId: 'page_notebook_physics_collab_1',
        tool: 'fountain',
        color: '#0f172a',
        width: 3,
        opacity: 1,
        createdBy: userA.id,
        createdByName: userA.name,
        createdAt: now - 5000000,
        timestamp: now - 5000000,
        points: [
          { x: 100, y: 150, pressure: 0.5 },
          { x: 150, y: 148, pressure: 0.6 },
          { x: 220, y: 152, pressure: 0.5 },
          { x: 320, y: 150, pressure: 0.7 }
        ]
      },
      {
        id: 'stroke_sarah_init_2',
        pageId: 'page_notebook_physics_collab_1',
        tool: 'fountain',
        color: '#2563eb',
        width: 3,
        opacity: 1,
        createdBy: userB.id,
        createdByName: userB.name,
        createdAt: now - 4000000,
        timestamp: now - 4000000,
        points: [
          { x: 100, y: 220, pressure: 0.6 },
          { x: 180, y: 218, pressure: 0.7 },
          { x: 260, y: 222, pressure: 0.5 }
        ]
      }
    ];

    const initialTexts: TextObject[] = [
      {
        id: 'text_alex_title',
        pageId: 'page_notebook_physics_collab_1',
        x: 100,
        y: 90,
        width: 400,
        height: 40,
        content: "Newton's Laws & Vector Equations",
        fontSize: 22,
        fontFamily: 'Plus Jakarta Sans',
        color: '#0f172a',
        isBold: true,
        isItalic: false,
        isUnderline: false,
        align: 'left',
        rotation: 0,
        createdBy: userA.id,
        createdByName: userA.name,
        createdAt: now - 6000000
      },
      {
        id: 'text_sarah_formula',
        pageId: 'page_notebook_physics_collab_1',
        x: 100,
        y: 180,
        width: 300,
        height: 35,
        content: 'F = m · a (Second Law Formulation)',
        fontSize: 18,
        fontFamily: 'Plus Jakarta Sans',
        color: '#2563eb',
        isBold: false,
        isItalic: true,
        isUnderline: false,
        align: 'left',
        rotation: 0,
        createdBy: userB.id,
        createdByName: userB.name,
        createdAt: now - 4500000
      }
    ];

    const activities: NotebookActivity[] = [
      {
        id: 'act_1',
        notebookId: sharedNotebook.id,
        userId: userA.id,
        userName: userA.name,
        action: 'joined',
        details: 'Created and launched the shared folio',
        createdAt: now - 86400000
      },
      {
        id: 'act_2',
        notebookId: sharedNotebook.id,
        userId: userA.id,
        userName: userA.name,
        action: 'invited_user',
        details: 'Invited Sarah Chen as Editor',
        createdAt: now - 80000000
      },
      {
        id: 'act_3',
        notebookId: sharedNotebook.id,
        userId: userB.id,
        userName: userB.name,
        action: 'stroke_added',
        details: 'Added vector formulas to Page 1',
        createdAt: now - 4000000
      }
    ];

    const comments: NotebookComment[] = [
      {
        id: 'comm_1',
        notebookId: sharedNotebook.id,
        pageIndex: 0,
        x: 480,
        y: 180,
        userId: userC.id,
        userName: userC.name,
        userAvatarColor: userC.avatarColor,
        content: 'Check dynamic friction tensor for non-inertial frame.',
        resolved: false,
        createdAt: now - 3600000
      }
    ];

    const versions: NotebookVersion[] = [
      {
        id: 'ver_init',
        notebookId: sharedNotebook.id,
        timestamp: now - 86400000,
        authorId: userA.id,
        authorName: userA.name,
        summary: 'Initial Folio Binding & Theorem Outline',
        snapshot: {
          title: sharedNotebook.title,
          pageCount: 3,
          strokesCount: 1,
          shapesCount: 0,
          textsCount: 1
        }
      },
      {
        id: 'ver_collab',
        notebookId: sharedNotebook.id,
        timestamp: now - 3600000,
        authorId: userB.id,
        authorName: userB.name,
        summary: 'Sarah added kinematic derivations and formulas',
        snapshot: {
          title: sharedNotebook.title,
          pageCount: 3,
          strokesCount: 2,
          shapesCount: 0,
          textsCount: 2
        }
      }
    ];

    const initialFriends = [
      { id: 'conn_1', user1Id: userA.id, user2Id: userB.id, createdAt: now - 10000000 },
      { id: 'conn_2', user1Id: userA.id, user2Id: userC.id, createdAt: now - 8000000 },
      { id: 'conn_3', user1Id: userB.id, user2Id: userC.id, createdAt: now - 6000000 }
    ];

    const notifications: CollaborationNotification[] = [
      {
        id: 'notif_1',
        userId: userB.id,
        type: 'notebook_invite',
        fromUserId: userA.id,
        fromUserName: userA.name,
        fromUserAvatar: userA.avatarColor,
        notebookId: sharedNotebook.id,
        notebookTitle: sharedNotebook.title,
        message: 'Alex invited you to collaborate as Editor on "Physics Project & Real-Time Inklings"',
        read: true,
        createdAt: now - 80000000
      },
      {
        id: 'notif_2',
        userId: userA.id,
        type: 'friend_accepted',
        fromUserId: userB.id,
        fromUserName: userB.name,
        fromUserAvatar: userB.avatarColor,
        message: 'Sarah Chen accepted your connection request',
        read: false,
        createdAt: now - 10000000
      }
    ];

    return {
      users: [userA, userB, userC, userD],
      friends: initialFriends,
      friendRequests: [],
      blockedUserIds: [],
      notebooks: [sharedNotebook],
      notebookMembers: members,
      strokes: {
        page_notebook_physics_collab_1: initialStrokes
      },
      shapes: {},
      texts: {
        page_notebook_physics_collab_1: initialTexts
      },
      images: {},
      comments: {
        notebook_physics_collab: comments
      },
      activities: {
        notebook_physics_collab: activities
      },
      versions: {
        notebook_physics_collab: versions
      },
      notifications
    };
  }

  // --- Users & Profiles ---
  public getUsers(): User[] {
    return this.data.users;
  }

  public findUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public findUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public findUserByUsername(username: string): User | undefined {
    const clean = username.replace(/^@/, '').toLowerCase();
    return this.data.users.find(u => u.username.toLowerCase() === clean);
  }

  public createUser(user: User): User {
    this.data.users.push(user);
    this.save();
    return user;
  }

  public updateUser(id: string, updates: Partial<User>): User | undefined {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return undefined;
    this.data.users[idx] = { ...this.data.users[idx], ...updates, updatedAt: Date.now() };
    this.save();
    return this.data.users[idx];
  }

  public searchUsers(query: string, currentUserId?: string): { id: string; name: string; username: string; avatarColor: string; avatarImage?: string; bio?: string; isFriend?: boolean }[] {
    const q = query.trim().toLowerCase().replace(/^@/, '');
    if (!q) return [];
    return this.data.users
      .filter(u => u.id !== currentUserId && (u.username.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)))
      .map(u => ({
        id: u.id,
        name: u.name,
        username: u.username,
        avatarColor: u.avatarColor,
        avatarImage: u.avatarImage,
        bio: u.bio,
        isFriend: currentUserId ? this.areFriends(currentUserId, u.id) : false
      }));
  }

  // --- Friends & Connections ---
  public areFriends(user1Id: string, user2Id: string): boolean {
    return this.data.friends.some(
      f => (f.user1Id === user1Id && f.user2Id === user2Id) || (f.user1Id === user2Id && f.user2Id === user1Id)
    );
  }

  public getFriends(userId: string): FriendConnection[] {
    const connections: FriendConnection[] = [];
    for (const f of this.data.friends) {
      const otherId = f.user1Id === userId ? f.user2Id : f.user2Id === userId ? f.user1Id : null;
      if (otherId) {
        const otherUser = this.findUserById(otherId);
        if (otherUser) {
          const sharedCount = this.data.notebookMembers.filter(
            m => m.userId === otherId && this.data.notebookMembers.some(m2 => m2.userId === userId && m2.notebookId === m.notebookId)
          ).length;
          connections.push({
            id: f.id,
            userId,
            connectedUserId: otherId,
            connectedUser: {
              id: otherUser.id,
              name: otherUser.name,
              username: otherUser.username,
              email: otherUser.emailVisibility === 'public' ? otherUser.email : undefined,
              avatarColor: otherUser.avatarColor,
              avatarImage: otherUser.avatarImage,
              bio: otherUser.bio,
              workplace: otherUser.workplace,
              isOnline: true,
              sharedNotebooksCount: sharedCount
            },
            status: 'accepted',
            createdAt: f.createdAt,
            updatedAt: f.createdAt
          });
        }
      }
    }
    return connections;
  }

  public getFriendRequests(userId: string): { incoming: FriendRequest[]; outgoing: FriendRequest[] } {
    const incoming = this.data.friendRequests.filter(r => r.toUserId === userId && r.status === 'pending');
    const outgoing = this.data.friendRequests.filter(r => r.fromUserId === userId && r.status === 'pending');
    return { incoming, outgoing };
  }

  public sendFriendRequest(fromUserId: string, toUserId: string): { success: boolean; message: string; request?: FriendRequest } {
    if (fromUserId === toUserId) return { success: false, message: 'Cannot connect with yourself' };
    if (this.areFriends(fromUserId, toUserId)) return { success: false, message: 'Already connected' };

    const existing = this.data.friendRequests.find(
      r => ((r.fromUserId === fromUserId && r.toUserId === toUserId) || (r.fromUserId === toUserId && r.toUserId === fromUserId)) && r.status === 'pending'
    );
    if (existing) return { success: false, message: 'Connection request already pending' };

    const fromUser = this.findUserById(fromUserId);
    const toUser = this.findUserById(toUserId);
    if (!fromUser || !toUser) return { success: false, message: 'User not found' };

    const newReq: FriendRequest = {
      id: `freq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      fromUserId,
      fromUser: {
        id: fromUser.id,
        name: fromUser.name,
        username: fromUser.username,
        avatarColor: fromUser.avatarColor,
        avatarImage: fromUser.avatarImage
      },
      toUserId,
      status: 'pending',
      createdAt: Date.now()
    };
    this.data.friendRequests.push(newReq);

    // Create notification for recipient
    this.createNotification({
      userId: toUserId,
      type: 'friend_request',
      fromUserId,
      fromUserName: fromUser.name,
      fromUserAvatar: fromUser.avatarColor,
      message: `${fromUser.name} (@${fromUser.username}) sent you a connection request`,
      read: false
    });

    this.save();
    return { success: true, message: 'Connection request sent', request: newReq };
  }

  public acceptFriendRequest(requestId: string, currentUserId: string): boolean {
    const req = this.data.friendRequests.find(r => r.id === requestId && r.toUserId === currentUserId && r.status === 'pending');
    if (!req) return false;

    req.status = 'accepted';
    this.data.friends.push({
      id: `conn_${Date.now()}`,
      user1Id: req.fromUserId,
      user2Id: req.toUserId,
      createdAt: Date.now()
    });

    const accepter = this.findUserById(currentUserId);
    if (accepter) {
      this.createNotification({
        userId: req.fromUserId,
        type: 'friend_accepted',
        fromUserId: currentUserId,
        fromUserName: accepter.name,
        fromUserAvatar: accepter.avatarColor,
        message: `${accepter.name} accepted your connection request`,
        read: false
      });
    }

    this.save();
    return true;
  }

  public declineFriendRequest(requestId: string, currentUserId: string): boolean {
    const req = this.data.friendRequests.find(r => r.id === requestId && r.toUserId === currentUserId && r.status === 'pending');
    if (!req) return false;
    req.status = 'declined';
    this.save();
    return true;
  }

  public cancelFriendRequest(requestId: string, currentUserId: string): boolean {
    const idx = this.data.friendRequests.findIndex(r => r.id === requestId && r.fromUserId === currentUserId);
    if (idx === -1) return false;
    this.data.friendRequests.splice(idx, 1);
    this.save();
    return true;
  }

  public removeFriend(userId: string, targetUserId: string): boolean {
    const initialLen = this.data.friends.length;
    this.data.friends = this.data.friends.filter(
      f => !(f.user1Id === userId && f.user2Id === targetUserId) && !(f.user1Id === targetUserId && f.user2Id === userId)
    );
    if (this.data.friends.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // --- Notebooks & Permissions ---
  public getNotebook(id: string): Notebook | undefined {
    return this.data.notebooks.find(n => n.id === id);
  }

  public upsertNotebook(notebook: Notebook): void {
    const idx = this.data.notebooks.findIndex(n => n.id === notebook.id);
    if (idx >= 0) {
      this.data.notebooks[idx] = { ...this.data.notebooks[idx], ...notebook, updatedAt: Date.now() };
    } else {
      this.data.notebooks.push(notebook);
    }
    this.save();
  }

  public getNotebookMembers(notebookId: string): NotebookMember[] {
    return this.data.notebookMembers.filter(m => m.notebookId === notebookId);
  }

  public getUserRoleInNotebook(notebookId: string, userId: string): CollaboratorRole | null {
    const nb = this.getNotebook(notebookId);
    if (nb && nb.ownerId === userId) return 'owner';
    const member = this.data.notebookMembers.find(m => m.notebookId === notebookId && m.userId === userId);
    return member ? member.role : null;
  }

  public canUserViewNotebook(notebookId: string, userId: string): boolean {
    const nb = this.getNotebook(notebookId);
    if (!nb) return false;
    if (nb.ownerId === userId) return true;
    if (nb.shareLinkAccess && nb.shareLinkAccess !== 'private') return true;
    return this.data.notebookMembers.some(m => m.notebookId === notebookId && m.userId === userId);
  }

  public canUserWriteInNotebook(notebookId: string, userId: string): boolean {
    const role = this.getUserRoleInNotebook(notebookId, userId);
    if (!role) return false;
    return role === 'owner' || role === 'editor';
  }

  public canUserDeleteObject(notebookId: string, userId: string, objectCreatorId?: string): boolean {
    const role = this.getUserRoleInNotebook(notebookId, userId);
    if (!role) return false;
    if (role === 'viewer' || role === 'commenter') return false;
    if (role === 'owner') return true; // Owner can delete any content
    if (objectCreatorId && objectCreatorId === userId) return true; // User can delete their own

    // If editor, check if notebook owner enabled 'canEditorsDeleteOthersContent'
    const nb = this.getNotebook(notebookId);
    if (role === 'editor' && nb?.canEditorsDeleteOthersContent) {
      return true;
    }
    return false;
  }

  public addNotebookMember(notebookId: string, userId: string, role: CollaboratorRole): NotebookMember | null {
    const user = this.findUserById(userId);
    if (!user) return null;

    const existing = this.data.notebookMembers.find(m => m.notebookId === notebookId && m.userId === userId);
    if (existing) {
      existing.role = role;
      this.save();
      return existing;
    }

    const member: NotebookMember = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      notebookId,
      userId: user.id,
      username: user.username,
      displayName: user.name,
      avatarColor: user.avatarColor,
      avatarImage: user.avatarImage,
      role,
      joinedAt: Date.now(),
      isOnline: true,
      currentPageIndex: 0
    };
    this.data.notebookMembers.push(member);

    const nb = this.getNotebook(notebookId);
    if (nb && !nb.isShared) {
      nb.isShared = true;
    }

    this.logActivity(notebookId, user.id, user.name, 'joined', `Joined the notebook as ${role}`);
    this.save();
    return member;
  }

  public updateMemberRole(notebookId: string, userId: string, newRole: CollaboratorRole): boolean {
    const member = this.data.notebookMembers.find(m => m.notebookId === notebookId && m.userId === userId);
    if (!member) return false;
    member.role = newRole;
    this.logActivity(notebookId, userId, member.displayName, 'role_changed', `Role updated to ${newRole}`);
    this.save();
    return true;
  }

  public removeNotebookMember(notebookId: string, userId: string): boolean {
    const idx = this.data.notebookMembers.findIndex(m => m.notebookId === notebookId && m.userId === userId);
    if (idx === -1) return false;
    const removed = this.data.notebookMembers[idx];
    this.data.notebookMembers.splice(idx, 1);
    this.logActivity(notebookId, userId, removed.displayName, 'removed_user', 'Removed from notebook collaborators');
    this.save();
    return true;
  }

  public getSharedNotebooksForUser(userId: string): Notebook[] {
    const memberNotebookIds = this.data.notebookMembers.filter(m => m.userId === userId).map(m => m.notebookId);
    return this.data.notebooks.filter(n => !n.isDeleted && (memberNotebookIds.includes(n.id) || n.ownerId === userId));
  }

  // --- Strokes & Object Realtime Storage ---
  public getPageStrokes(pageId: string): Stroke[] {
    return (this.data.strokes[pageId] || []).filter(s => !s.deletedAt);
  }

  public addStroke(pageId: string, stroke: Stroke): void {
    if (!this.data.strokes[pageId]) this.data.strokes[pageId] = [];
    // Idempotent check
    const existingIdx = this.data.strokes[pageId].findIndex(s => s.id === stroke.id);
    if (existingIdx >= 0) {
      this.data.strokes[pageId][existingIdx] = stroke;
    } else {
      this.data.strokes[pageId].push(stroke);
    }
    this.save();
  }

  public softDeleteStroke(pageId: string, strokeId: string, deletedBy: string): boolean {
    const list = this.data.strokes[pageId];
    if (!list) return false;
    const item = list.find(s => s.id === strokeId);
    if (!item) return false;
    item.deletedAt = Date.now();
    item.deletedBy = deletedBy;
    this.save();
    return true;
  }

  public getPageShapes(pageId: string): ShapeObject[] {
    return (this.data.shapes[pageId] || []).filter(s => !s.deletedAt);
  }

  public addShape(pageId: string, shape: ShapeObject): void {
    if (!this.data.shapes[pageId]) this.data.shapes[pageId] = [];
    const idx = this.data.shapes[pageId].findIndex(s => s.id === shape.id);
    if (idx >= 0) this.data.shapes[pageId][idx] = shape;
    else this.data.shapes[pageId].push(shape);
    this.save();
  }

  public softDeleteShape(pageId: string, shapeId: string, deletedBy: string): boolean {
    const list = this.data.shapes[pageId];
    if (!list) return false;
    const item = list.find(s => s.id === shapeId);
    if (!item) return false;
    item.deletedAt = Date.now();
    item.deletedBy = deletedBy;
    this.save();
    return true;
  }

  public getPageTexts(pageId: string): TextObject[] {
    return (this.data.texts[pageId] || []).filter(t => !t.deletedAt);
  }

  public addText(pageId: string, text: TextObject): void {
    if (!this.data.texts[pageId]) this.data.texts[pageId] = [];
    const idx = this.data.texts[pageId].findIndex(t => t.id === text.id);
    if (idx >= 0) this.data.texts[pageId][idx] = text;
    else this.data.texts[pageId].push(text);
    this.save();
  }

  public softDeleteText(pageId: string, textId: string, deletedBy: string): boolean {
    const list = this.data.texts[pageId];
    if (!list) return false;
    const item = list.find(t => t.id === textId);
    if (!item) return false;
    item.deletedAt = Date.now();
    item.deletedBy = deletedBy;
    this.save();
    return true;
  }

  // --- Comments & Activity Logs ---
  public getComments(notebookId: string): NotebookComment[] {
    return this.data.comments[notebookId] || [];
  }

  public addComment(notebookId: string, comment: NotebookComment): NotebookComment {
    if (!this.data.comments[notebookId]) this.data.comments[notebookId] = [];
    this.data.comments[notebookId].push(comment);
    this.logActivity(notebookId, comment.userId, comment.userName, 'comment_added', `Comment on Page ${comment.pageIndex + 1}`);
    this.save();
    return comment;
  }

  public resolveComment(notebookId: string, commentId: string, resolved: boolean): boolean {
    const list = this.data.comments[notebookId];
    if (!list) return false;
    const item = list.find(c => c.id === commentId);
    if (!item) return false;
    item.resolved = resolved;
    item.updatedAt = Date.now();
    this.save();
    return true;
  }

  public getActivities(notebookId: string): NotebookActivity[] {
    return this.data.activities[notebookId] || [];
  }

  public logActivity(notebookId: string, userId: string, userName: string, action: NotebookActivity['action'], details: string): void {
    if (!this.data.activities[notebookId]) this.data.activities[notebookId] = [];
    this.data.activities[notebookId].unshift({
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      notebookId,
      userId,
      userName,
      action,
      details,
      createdAt: Date.now()
    });
    // Keep last 100 activities
    if (this.data.activities[notebookId].length > 100) {
      this.data.activities[notebookId] = this.data.activities[notebookId].slice(0, 100);
    }
    this.save();
  }

  // --- Versions ---
  public getVersions(notebookId: string): NotebookVersion[] {
    return this.data.versions[notebookId] || [];
  }

  public createVersion(notebookId: string, authorId: string, authorName: string, summary: string): NotebookVersion {
    if (!this.data.versions[notebookId]) this.data.versions[notebookId] = [];
    const nb = this.getNotebook(notebookId);
    const ver: NotebookVersion = {
      id: `ver_${Date.now()}`,
      notebookId,
      timestamp: Date.now(),
      authorId,
      authorName,
      summary,
      snapshot: {
        title: nb?.title || 'Folio',
        pageCount: nb?.pageCount || 1,
        strokesCount: 10,
        shapesCount: 2,
        textsCount: 3
      }
    };
    this.data.versions[notebookId].unshift(ver);
    this.save();
    return ver;
  }

  // --- Notifications ---
  public getNotifications(userId: string): CollaborationNotification[] {
    return this.data.notifications.filter(n => n.userId === userId).sort((a, b) => b.createdAt - a.createdAt);
  }

  public createNotification(n: Omit<CollaborationNotification, 'id' | 'createdAt'>): CollaborationNotification {
    const notif: CollaborationNotification = {
      ...n,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now()
    };
    this.data.notifications.unshift(notif);
    this.save();
    return notif;
  }

  public markNotificationAsRead(id: string): void {
    const notif = this.data.notifications.find(n => n.id === id);
    if (notif) {
      notif.read = true;
      this.save();
    }
  }

  public markAllNotificationsAsRead(userId: string): void {
    for (const n of this.data.notifications) {
      if (n.userId === userId) n.read = true;
    }
    this.save();
  }
}

export const serverStorage = new StorageManager();
