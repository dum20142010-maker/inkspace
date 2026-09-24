import React, { useState, useEffect } from 'react';
import { Notebook, User } from '../../types/notebook';
import { CollaboratorPresence, NotebookMember, NotebookActivity, CollaboratorRole } from '../../types/collaboration';
import { ActivityFeed } from './ActivityFeed';
import {
  Users,
  X,
  UserPlus,
  Search,
  Check,
  Crown,
  Edit3,
  Eye,
  MessageSquare,
  Activity,
  Send,
  UserCheck,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface CollaborationPanelProps {
  isOpen: boolean;
  notebook: Notebook;
  currentUser: User | null;
  presenceList: CollaboratorPresence[];
  activities: NotebookActivity[];
  onClose: () => void;
  onInviteUser?: (username: string, role: CollaboratorRole) => void;
}

export const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  isOpen,
  notebook,
  currentUser,
  presenceList,
  activities,
  onClose,
  onInviteUser
}) => {
  const [activeTab, setActiveTab] = useState<'people' | 'activity'>('people');
  const [searchUsername, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<
    { id: string; name: string; username: string; avatarColor: string; bio?: string }[]
  >([]);
  const [selectedRole, setSelectedRole] = useState<CollaboratorRole>('editor');
  const [isSearching, setIsSearching] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Search users by handle
  useEffect(() => {
    if (!searchUsername.trim() || !currentUser) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/users/search?q=${encodeURIComponent(searchUsername)}&userId=${currentUser.id}`
        ).then(r => r.json());
        setSearchResults(res.results || []);
      } catch (err) {
        console.error('Search user error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [searchUsername, currentUser]);

  const handleSendInvite = async (targetUsername: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(targetUsername)}`).then(r => r.json());
      const targetUser = res.results?.[0];

      if (!targetUser) {
        setStatusMsg('User not found');
        setTimeout(() => setStatusMsg(null), 2500);
        return;
      }

      const shareRes = await fetch(`/api/notebooks/${notebook.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: targetUser.id,
          role: selectedRole,
          ownerUserId: currentUser.id
        })
      }).then(r => r.json());

      if (shareRes.success) {
        setStatusMsg(`Invited @${targetUser.username} as ${selectedRole.toUpperCase()}!`);
        setTimeout(() => setStatusMsg(null), 2500);
        setSearchQuery('');
        setSearchResults([]);
      } else {
        setStatusMsg(shareRes.error || 'Could not send invitation');
        setTimeout(() => setStatusMsg(null), 2500);
      }
    } catch (err) {
      console.error('Send invite error:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <aside className="w-80 border-l border-slate-800/80 bg-[#0c1017] flex flex-col h-full shrink-0 z-30 shadow-2xl text-slate-100 select-none animate-in slide-in-from-right duration-200">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-serif text-xs font-bold text-white uppercase tracking-wider">
              Collaboration
            </h2>
            <p className="text-[10px] text-slate-400">Live active users & events</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Tab Pills */}
      <div className="flex items-center gap-1 p-1 my-2 mx-3 bg-[#111622] rounded-xl border border-slate-800/80 shrink-0">
        <button
          onClick={() => setActiveTab('people')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition ${
            activeTab === 'people'
              ? 'bg-amber-400 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>People ({presenceList.length || 1})</span>
        </button>

        <button
          onClick={() => setActiveTab('activity')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition ${
            activeTab === 'activity'
              ? 'bg-amber-400 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Activity</span>
        </button>
      </div>

      {statusMsg && (
        <div className="mx-3 mb-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Panel Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'people' ? (
          <div className="p-3 space-y-4">
            {/* Quick Invite by Username Input */}
            <div className="p-3 rounded-2xl bg-[#111622] border border-slate-800/90 space-y-2.5">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                Invite Collaborator
              </span>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  value={searchUsername}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search username handle..."
                  className="w-full rounded-xl bg-[#0c1017] border border-slate-800 pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono transition"
                />
              </div>

              {/* Role selector + Send Button */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value as CollaboratorRole)}
                  className="flex-1 rounded-xl bg-[#0c1017] border border-slate-800 px-2.5 py-1 text-xs font-bold text-amber-300 focus:outline-none"
                >
                  <option value="editor">Editor</option>
                  <option value="commenter">Commenter</option>
                  <option value="viewer">Viewer</option>
                </select>

                <button
                  onClick={() => handleSendInvite(searchUsername)}
                  disabled={!searchUsername.trim()}
                  className="px-3 py-1 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold hover:bg-amber-300 transition disabled:opacity-50"
                >
                  Invite
                </button>
              </div>

              {/* Search Dropdown Results */}
              {searchResults.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-slate-800/80">
                  {searchResults.map(u => (
                    <div
                      key={u.id}
                      onClick={() => handleSendInvite(u.username)}
                      className="p-2 rounded-xl bg-[#0c1017] hover:bg-slate-800/60 cursor-pointer flex items-center justify-between transition"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-950 shrink-0"
                          style={{ backgroundColor: u.avatarColor }}
                        >
                          {u.name[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{u.name}</p>
                          <p className="text-[10px] font-mono text-slate-400 truncate">@{u.username}</p>
                        </div>
                      </div>
                      <Send className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Users in Room */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block px-1">
                Active in Folio ({presenceList.length || 1})
              </span>

              {presenceList.length === 0 && currentUser && (
                <div className="p-3 rounded-2xl bg-[#111622] border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-slate-950 text-xs shrink-0 relative"
                      style={{ backgroundColor: currentUser.avatarColor || '#f59e0b' }}
                    >
                      {currentUser.name[0]?.toUpperCase()}
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#111622]" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">
                        {currentUser.name} <span className="text-[10px] text-amber-400 font-mono">(You)</span>
                      </p>
                      <p className="text-[10px] font-mono text-slate-400">@{currentUser.username}</p>
                    </div>
                  </div>
                  <Crown className="w-4 h-4 text-amber-400" />
                </div>
              )}

              {presenceList.map(p => (
                <div
                  key={p.userId}
                  className="p-3 rounded-2xl bg-[#111622] border border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-slate-950 text-xs shrink-0 relative"
                      style={{ backgroundColor: p.avatarColor }}
                    >
                      {p.displayName[0]?.toUpperCase()}
                      <span
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-[#111622] ${
                          p.isWriting ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'
                        }`}
                      />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{p.displayName}</p>
                      <p className="text-[10px] font-mono text-slate-400">
                        {p.isWriting ? 'Writing with stylus...' : `Page ${p.currentPageIndex + 1}`}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono font-bold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 uppercase">
                    {p.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <ActivityFeed activities={activities} />
        )}
      </div>
    </aside>
  );
};
