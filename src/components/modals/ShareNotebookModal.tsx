import React, { useState, useEffect } from 'react';
import { Notebook, User } from '../../types/notebook';
import { CollaboratorRole, NotebookMember, FriendConnection } from '../../types/collaboration';
import {
  X,
  Share2,
  Users,
  Copy,
  Check,
  Shield,
  UserCheck,
  UserX,
  Lock,
  Globe,
  Sparkles,
  ChevronDown,
  Trash2,
  LogOut
} from 'lucide-react';

interface ShareNotebookModalProps {
  isOpen: boolean;
  notebook: Notebook | null;
  currentUser: User | null;
  onClose: () => void;
  onUpdateNotebook: (updated: Notebook) => void;
  onLeaveNotebook?: (notebookId: string) => void;
}

export const ShareNotebookModal: React.FC<ShareNotebookModalProps> = ({
  isOpen,
  notebook,
  currentUser,
  onClose,
  onUpdateNotebook,
  onLeaveNotebook
}) => {
  if (!isOpen || !notebook || !currentUser) return null;

  const isOwner = notebook.ownerId === currentUser.id || !notebook.ownerId;

  const [members, setMembers] = useState<NotebookMember[]>([]);
  const [friends, setFriends] = useState<FriendConnection[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<CollaboratorRole>('editor');
  const [linkAccess, setLinkAccess] = useState<'private' | 'viewer' | 'commenter' | 'editor'>(
    notebook.shareLinkAccess || 'private'
  );
  const [canEditorsDelete, setCanEditorsDelete] = useState<boolean>(
    !!notebook.canEditorsDeleteOthersContent
  );

  const [copiedLink, setCopiedLink] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (notebook && isOpen) {
      loadMembers();
      loadFriends();
    }
  }, [notebook, isOpen]);

  const loadMembers = async () => {
    try {
      const res = await fetch(`/api/notebooks/${notebook.id}`).then(r => r.json());
      if (res.members) setMembers(res.members);
    } catch (err) {
      console.error('Failed to load members:', err);
    }
  };

  const loadFriends = async () => {
    try {
      const res = await fetch(`/api/friends?userId=${currentUser.id}`).then(r => r.json());
      if (res.friends) setFriends(res.friends);
    } catch (err) {
      console.error('Failed to load friends:', err);
    }
  };

  const [codeOrHandleInput, setCodeOrHandleInput] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const handleInvite = async () => {
    if (!selectedFriendId) return;
    try {
      const res = await fetch(`/api/notebooks/${notebook.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: selectedFriendId,
          role: selectedRole,
          ownerUserId: currentUser.id
        })
      }).then(r => r.json());

      if (res.success) {
        setMessage('Collaborator invited successfully!');
        setTimeout(() => setMessage(null), 2500);
        setSelectedFriendId('');
        loadMembers();

        const updated = { ...notebook, isShared: true };
        onUpdateNotebook(updated);
      } else {
        setMessage(res.error || 'Could not invite collaborator');
        setTimeout(() => setMessage(null), 2500);
      }
    } catch (err) {
      console.error('Invite error:', err);
    }
  };

  const handleInviteByCode = async () => {
    if (!codeOrHandleInput.trim()) return;
    setIsInviting(true);
    try {
      const res = await fetch('/api/collab/invite-by-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderUserId: currentUser.id,
          targetCodeOrUsername: codeOrHandleInput.trim(),
          notebookId: notebook.id,
          role: selectedRole
        })
      }).then(r => r.json());

      if (res.success && res.targetUser) {
        setMessage(`🎉 Sent pending collaboration invite to ${res.targetUser.name} (@${res.targetUser.username})!`);
        setTimeout(() => setMessage(null), 3500);
        setCodeOrHandleInput('');
        loadMembers();
        onUpdateNotebook({ ...notebook, isShared: true });
      } else {
        setMessage(res.error || 'Could not find user matching that 6-digit code or handle.');
        setTimeout(() => setMessage(null), 3500);
      }
    } catch (err) {
      setMessage('Failed to send collaboration invite.');
    } finally {
      setIsInviting(false);
    }
  };

  const handleChangeRole = async (targetUserId: string, newRole: CollaboratorRole) => {
    try {
      const res = await fetch(`/api/notebooks/${notebook.id}/members/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, newRole, callerUserId: currentUser.id })
      }).then(r => r.json());

      if (res.success) {
        loadMembers();
      }
    } catch (err) {
      console.error('Change role error:', err);
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (!window.confirm('Remove collaborator from notebook?')) return;
    try {
      await fetch(`/api/notebooks/${notebook.id}/members/${targetUserId}?callerUserId=${currentUser.id}`, {
        method: 'DELETE'
      });
      loadMembers();
    } catch (err) {
      console.error('Remove member error:', err);
    }
  };

  const handleToggleEditorsDelete = async () => {
    const newVal = !canEditorsDelete;
    setCanEditorsDelete(newVal);
    const updated = { ...notebook, canEditorsDeleteOthersContent: newVal };
    onUpdateNotebook(updated);
    await fetch(`/api/notebooks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/?notebook=${notebook.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleLeave = async () => {
    if (!window.confirm('Are you sure you want to leave this shared notebook?')) return;
    try {
      await fetch(`/api/notebooks/${notebook.id}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });
      if (onLeaveNotebook) onLeaveNotebook(notebook.id);
      onClose();
    } catch (err) {
      console.error('Leave notebook error:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="w-full max-w-lg rounded-3xl bg-[#0c1017] border border-slate-800 p-6 shadow-2xl text-slate-100 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-white">Share "{notebook.title}"</h2>
              <p className="text-xs text-slate-400">Invite friends or copy link with role-based permissions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {message && (
          <div className="my-3 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
            {message}
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-4 my-4">
          {/* Section 1: Invite via 6-Digit Friend Code or Handle */}
          {isOwner && (
            <div className="p-3.5 rounded-2xl bg-[#111622] border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                  Invite via 6-Digit Friend Code
                </h3>
                <span className="text-[10px] text-amber-400 font-semibold">Instant Alert</span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={codeOrHandleInput}
                  onChange={e => setCodeOrHandleInput(e.target.value)}
                  placeholder="Enter 6-digit Code (e.g. 849201) or @username..."
                  className="flex-1 rounded-xl bg-[#0c1017] border border-slate-800 px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />

                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value as CollaboratorRole)}
                  className="rounded-xl bg-[#0c1017] border border-slate-800 px-3 py-2 text-xs font-bold text-amber-300 focus:outline-none"
                >
                  <option value="editor">Editor</option>
                  <option value="commenter">Commenter</option>
                  <option value="viewer">Viewer</option>
                </select>

                <button
                  type="button"
                  onClick={handleInviteByCode}
                  disabled={!codeOrHandleInput.trim() || isInviting}
                  className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-extrabold hover:bg-amber-300 transition disabled:opacity-50"
                >
                  Send Invite
                </button>
              </div>

              {friends.length > 0 && (
                <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 font-medium shrink-0">Or pick connected friend:</span>
                  <select
                    value={selectedFriendId}
                    onChange={e => {
                      setSelectedFriendId(e.target.value);
                      if (e.target.value) handleInvite();
                    }}
                    className="flex-1 rounded-xl bg-[#0c1017] border border-slate-800 px-2.5 py-1 text-xs text-white focus:outline-none"
                  >
                    <option value="">Select connected friend...</option>
                    {friends.map(f => (
                      <option key={f.id} value={f.connectedUserId}>
                        {f.connectedUser.name} (@{f.connectedUser.username})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Section 2: Current Collaborators */}
          <div>
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
              Collaborators & Access ({members.length + 1})
            </h3>
            <div className="space-y-2">
              {/* Owner card */}
              <div className="p-3 rounded-2xl bg-[#111622] border border-slate-800/90 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-slate-950 text-xs shrink-0"
                    style={{ backgroundColor: currentUser.avatarColor }}
                  >
                    {currentUser.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">
                      {currentUser.name} <span className="text-[10px] text-amber-400 font-mono">(You)</span>
                    </p>
                    <p className="text-[10px] font-mono text-slate-400">@{currentUser.username}</p>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-xl border border-amber-500/20">
                  OWNER
                </span>
              </div>

              {/* Members */}
              {members.map(m => (
                <div
                  key={m.id}
                  className="p-3 rounded-2xl bg-[#111622] border border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-slate-950 text-xs shrink-0"
                      style={{ backgroundColor: m.avatarColor }}
                    >
                      {m.displayName[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{m.displayName}</p>
                      <p className="text-[10px] font-mono text-slate-400">@{m.username}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isOwner ? (
                      <>
                        <select
                          value={m.role}
                          onChange={e => handleChangeRole(m.userId, e.target.value as CollaboratorRole)}
                          className="rounded-lg bg-[#0c1017] border border-slate-800 px-2 py-1 text-xs text-indigo-300 font-semibold"
                        >
                          <option value="editor">Editor</option>
                          <option value="commenter">Commenter</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        <button
                          onClick={() => handleRemoveMember(m.userId)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        >
                          <UserX className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <span className="text-[11px] font-mono text-slate-300 uppercase">{m.role}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Owner Deletion Permission Toggle */}
          {isOwner && (
            <div className="p-3.5 rounded-2xl bg-[#111622] border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">Allow Editors to delete others' work</p>
                <p className="text-[10px] text-slate-400">
                  By default, collaborators can only erase/delete their own handwriting and shapes.
                </p>
              </div>
              <input
                type="checkbox"
                checked={canEditorsDelete}
                onChange={handleToggleEditorsDelete}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-0 cursor-pointer"
              />
            </div>
          )}

          {/* Section 4: Share Link & Copy */}
          <div className="p-3.5 rounded-2xl bg-[#111622] border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                <span>Copy Direct Link</span>
              </span>
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 text-xs font-bold text-indigo-300 hover:text-white hover:bg-slate-700 transition"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied Link' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Leave Notebook Option for collaborators */}
          {!isOwner && (
            <div className="pt-2">
              <button
                onClick={handleLeave}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold hover:bg-rose-500/20 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Leave Shared Notebook</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
