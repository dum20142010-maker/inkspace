import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { CollaborationWebSocketHub } from './server/websocket';
import { serverStorage, hashPassword, generateSalt } from './server/storage';
import { User, Notebook } from './src/types/notebook';

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  const server = createServer(app);
  const wss = new WebSocketServer({ server });
  const hub = new CollaborationWebSocketHub(wss);

  // --- REST API Endpoints ---

  // Auth: Register
  app.post('/api/auth/register', (req, res) => {
    const { name, username, email, password, securityQuestion, securityAnswer, bio, workplace } = req.body;
    if (!name || !username || !email || !password) {
      return res.status(400).json({ error: 'Missing required account fields' });
    }

    const cleanUsername = username.replace(/^@/, '').trim().toLowerCase();
    const existingUser = serverStorage.findUserByEmail(email) || serverStorage.findUserByUsername(cleanUsername);
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already in use' });
    }

    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);
    const securityAnswerHash = hashPassword((securityAnswer || 'luna').trim().toLowerCase(), salt);

    const colors = ['#f59e0b', '#6366f1', '#10b981', '#a855f7', '#ec4899', '#3b82f6', '#14b8a6'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newUser: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      username: cleanUsername,
      email: email.trim().toLowerCase(),
      bio: bio || 'InkSpace Contributor & Digital Note-Taker',
      workplace: workplace || 'InkSpace',
      passwordHash,
      salt,
      securityQuestion: securityQuestion || "What was your first pet's name?",
      securityAnswerHash,
      avatarColor: randomColor,
      emailVisibility: 'public',
      friendRequestPrivacy: 'everyone',
      profileVisibility: 'everyone',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    serverStorage.createUser(newUser);
    return res.json({ success: true, user: newUser });
  });

  // Auth: Login
  app.post('/api/auth/login', (req, res) => {
    const { login, password } = req.body;
    if (!login || !password) {
      return res.status(400).json({ error: 'Username/Email and Password required' });
    }

    const user = serverStorage.findUserByEmail(login) || serverStorage.findUserByUsername(login);
    if (!user) {
      return res.status(401).json({ error: 'Account not found with provided credentials' });
    }

    const inputHash = hashPassword(password, user.salt);
    if (inputHash !== user.passwordHash) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    return res.json({ success: true, user });
  });

  // Auth: Account Recovery / Password Reset
  app.post('/api/auth/recover', (req, res) => {
    const { usernameOrEmail, securityAnswer, newPassword } = req.body;
    if (!usernameOrEmail || !securityAnswer || !newPassword) {
      return res.status(400).json({ error: 'All recovery fields are required' });
    }

    const user = serverStorage.findUserByEmail(usernameOrEmail) || serverStorage.findUserByUsername(usernameOrEmail);
    if (!user) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const inputAnsHash = hashPassword(securityAnswer.trim().toLowerCase(), user.salt);
    if (inputAnsHash !== user.securityAnswerHash) {
      return res.status(401).json({ error: 'Incorrect security question answer' });
    }

    const newSalt = generateSalt();
    const newPasswordHash = hashPassword(newPassword, newSalt);
    const newAnswerHash = hashPassword(securityAnswer.trim().toLowerCase(), newSalt);

    const updated = serverStorage.updateUser(user.id, {
      passwordHash: newPasswordHash,
      salt: newSalt,
      securityAnswerHash: newAnswerHash
    });

    return res.json({ success: true, message: 'Password reset successfully', user: updated });
  });

  // User Profile: Update
  app.put('/api/users/profile', (req, res) => {
    const { userId, name, username, bio, workplace, avatarColor, avatarImage, emailVisibility, friendRequestPrivacy } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const updates: Partial<User> = {};
    if (name) updates.name = name.trim();
    if (username) updates.username = username.replace(/^@/, '').trim().toLowerCase();
    if (bio !== undefined) updates.bio = bio;
    if (workplace !== undefined) updates.workplace = workplace;
    if (avatarColor) updates.avatarColor = avatarColor;
    if (avatarImage !== undefined) updates.avatarImage = avatarImage;
    if (emailVisibility) updates.emailVisibility = emailVisibility;
    if (friendRequestPrivacy) updates.friendRequestPrivacy = friendRequestPrivacy;

    const updated = serverStorage.updateUser(userId, updates);
    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ success: true, user: updated });
  });

  // Users: Search
  app.get('/api/users/search', (req, res) => {
    const query = (req.query.q as string) || '';
    const currentUserId = (req.query.userId as string) || '';
    const results = serverStorage.searchUsers(query, currentUserId);
    return res.json({ results });
  });

  // Friends: Get Connections
  app.get('/api/friends', (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'User ID required' });
    const friends = serverStorage.getFriends(userId);
    return res.json({ friends });
  });

  // Friends: Get Requests
  app.get('/api/friends/requests', (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'User ID required' });
    const requests = serverStorage.getFriendRequests(userId);
    return res.json(requests);
  });

  // Friends: Send Request
  app.post('/api/friends/request', (req, res) => {
    const { fromUserId, toUserId } = req.body;
    if (!fromUserId || !toUserId) return res.status(400).json({ error: 'Missing user parameters' });
    const result = serverStorage.sendFriendRequest(fromUserId, toUserId);
    if (!result.success) return res.status(400).json(result);
    return res.json(result);
  });

  // Friends: Accept Request
  app.post('/api/friends/accept', (req, res) => {
    const { requestId, currentUserId } = req.body;
    const ok = serverStorage.acceptFriendRequest(requestId, currentUserId);
    if (!ok) return res.status(400).json({ error: 'Could not accept friend request' });
    return res.json({ success: true });
  });

  // Friends: Decline Request
  app.post('/api/friends/decline', (req, res) => {
    const { requestId, currentUserId } = req.body;
    const ok = serverStorage.declineFriendRequest(requestId, currentUserId);
    return res.json({ success: ok });
  });

  // Friends: Cancel Request
  app.post('/api/friends/cancel', (req, res) => {
    const { requestId, currentUserId } = req.body;
    const ok = serverStorage.cancelFriendRequest(requestId, currentUserId);
    return res.json({ success: ok });
  });

  // Friends: Remove Friend
  app.delete('/api/friends/:targetUserId', (req, res) => {
    const currentUserId = req.query.userId as string;
    const { targetUserId } = req.params;
    if (!currentUserId) return res.status(400).json({ error: 'User ID required' });
    const ok = serverStorage.removeFriend(currentUserId, targetUserId);
    return res.json({ success: ok });
  });

  // Notebooks: Get All & Shared
  app.get('/api/notebooks', (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'User ID required' });
    const shared = serverStorage.getSharedNotebooksForUser(userId);
    return res.json({ notebooks: shared });
  });

  // Notebooks: Create / Upsert
  app.post('/api/notebooks', (req, res) => {
    const notebook = req.body as Notebook;
    if (!notebook.id || !notebook.title) {
      return res.status(400).json({ error: 'Notebook ID and Title are required' });
    }
    serverStorage.upsertNotebook(notebook);
    return res.json({ success: true, notebook });
  });

  // Notebooks: Get Single
  app.get('/api/notebooks/:id', (req, res) => {
    const { id } = req.params;
    const nb = serverStorage.getNotebook(id);
    if (!nb) return res.status(404).json({ error: 'Notebook not found' });
    const members = serverStorage.getNotebookMembers(id);
    return res.json({ notebook: nb, members });
  });

  // Notebooks: Share / Invite User
  app.post('/api/notebooks/:id/share', (req, res) => {
    const { id } = req.params;
    const { targetUserId, role, ownerUserId } = req.body;
    const nb = serverStorage.getNotebook(id);
    if (!nb) return res.status(404).json({ error: 'Notebook not found' });

    if (nb.ownerId && nb.ownerId !== ownerUserId) {
      return res.status(403).json({ error: 'Only the notebook owner can send share invitations' });
    }

    const member = serverStorage.addNotebookMember(id, targetUserId, role || 'editor');
    if (!member) return res.status(400).json({ error: 'Could not invite user' });

    // Send notification
    const owner = serverStorage.findUserById(ownerUserId || nb.ownerId || '');
    serverStorage.createNotification({
      userId: targetUserId,
      type: 'notebook_invite',
      fromUserId: ownerUserId || nb.ownerId || '',
      fromUserName: owner?.name || 'Notebook Owner',
      fromUserAvatar: owner?.avatarColor || '#f59e0b',
      notebookId: id,
      notebookTitle: nb.title,
      message: `${owner?.name || 'A collaborator'} shared notebook "${nb.title}" with you as ${role.toUpperCase()}`,
      read: false
    });

    return res.json({ success: true, member });
  });

  // Notebooks: Change Member Role
  app.post('/api/notebooks/:id/members/role', (req, res) => {
    const { id } = req.params;
    const { targetUserId, newRole, callerUserId } = req.body;
    const callerRole = serverStorage.getUserRoleInNotebook(id, callerUserId);
    if (callerRole !== 'owner') {
      return res.status(403).json({ error: 'Only notebook owner can modify permissions' });
    }
    const ok = serverStorage.updateMemberRole(id, targetUserId, newRole);
    return res.json({ success: ok });
  });

  // Notebooks: Remove Member
  app.delete('/api/notebooks/:id/members/:targetUserId', (req, res) => {
    const { id, targetUserId } = req.params;
    const callerUserId = req.query.callerUserId as string;
    const callerRole = serverStorage.getUserRoleInNotebook(id, callerUserId);
    if (callerRole !== 'owner' && callerUserId !== targetUserId) {
      return res.status(403).json({ error: 'Permission denied to remove member' });
    }
    const ok = serverStorage.removeNotebookMember(id, targetUserId);
    return res.json({ success: ok });
  });

  // Notebooks: Leave Notebook
  app.post('/api/notebooks/:id/leave', (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;
    const ok = serverStorage.removeNotebookMember(id, userId);
    return res.json({ success: ok });
  });

  // Notifications: Get & Read
  app.get('/api/notifications', (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'User ID required' });
    const notifications = serverStorage.getNotifications(userId);
    return res.json({ notifications });
  });

  app.post('/api/notifications/read', (req, res) => {
    const { notificationId, userId } = req.body;
    if (notificationId) {
      serverStorage.markNotificationAsRead(notificationId);
    } else if (userId) {
      serverStorage.markAllNotificationsAsRead(userId);
    }
    return res.json({ success: true });
  });

  // Activity Log
  app.get('/api/notebooks/:id/activity', (req, res) => {
    const { id } = req.params;
    const activities = serverStorage.getActivities(id);
    return res.json({ activities });
  });

  // Comments
  app.get('/api/notebooks/:id/comments', (req, res) => {
    const { id } = req.params;
    const comments = serverStorage.getComments(id);
    return res.json({ comments });
  });

  app.post('/api/notebooks/:id/comments', (req, res) => {
    const { id } = req.params;
    const comment = req.body;
    const added = serverStorage.addComment(id, comment);
    return res.json({ success: true, comment: added });
  });

  // Global Search API across Notebooks & Server Storage
  app.get('/api/search', (req, res) => {
    const q = ((req.query.q as string) || '').trim().toLowerCase();
    const userId = req.query.userId as string;
    if (!q) return res.json({ results: [] });

    const notebooks = serverStorage.getSharedNotebooksForUser(userId || 'user_alex');
    const matches: any[] = [];

    for (const nb of notebooks) {
      if (nb.title.toLowerCase().includes(q) || (nb.subtitle && nb.subtitle.toLowerCase().includes(q)) || (nb.tag && nb.tag.toLowerCase().includes(q))) {
        matches.push({
          notebookId: nb.id,
          notebookTitle: nb.title,
          coverColor: nb.coverColor,
          matchType: 'title',
          snippet: nb.subtitle || nb.title,
          matchScore: 100
        });
      }
    }

    return res.json({ results: matches });
  });

  // --- Vite Middleware or Static Hosting ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  }

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`InkSpace Full-Stack Server running on http://localhost:${PORT}`);
  });
}

startServer();
