import React, { useState, useEffect } from 'react';
import { User } from '../../types/notebook';
import { FriendConnection, FriendRequest } from '../../types/collaboration';
import {
  X,
  UserPlus,
  Users,
  Search,
  Check,
  UserX,
  ShieldAlert,
  MessageSquare,
  Clock,
  Sparkles,
  ChevronRight,
  Send,
  MoreVertical,
  CheckCircle2
} from 'lucide-react';

interface FriendsModalProps {
  isOpen: boolean;
  currentUser: User | null;
  onClose: () => void;
}

export const FriendsModal: React.FC<FriendsModalProps> = ({
  isOpen,
  currentUser,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'friends' | 'find' | 'requests'>('friends');
  const [friends, setFriends] = useState<FriendConnection[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<
    { id: string; name: string; username: string; avatarColor: string; bio?: string; isFriend?: boolean }[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && currentUser) {
      loadFriendsData();
    }
  }, [isOpen, currentUser]);

  const loadFriendsData = async () => {
    if (!currentUser) return;
    try {
      const [resFriends, resReqs] = await Promise.all([
        fetch(`/api/friends?userId=${currentUser.id}`).then(r => r.json()),
        fetch(`/api/friends/requests?userId=${currentUser.id}`).then(r => r.json())
      ]);

      if (resFriends.friends) setFriends(resFriends.friends);
      if (resReqs.incoming) setIncomingRequests(resReqs.incoming);
      if (resReqs.outgoing) setOutgoingRequests(resReqs.outgoing);
    } catch (err) {
      console.error('Failed to load friends data:', err);
    }
  };

  useEffect(() => {
    if (!searchQuery.trim() || !currentUser) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}&userId=${currentUser.id}`).then(
          r => r.json()
        );
        setSearchResults(res.results || []);
      } catch (err) {
        console.error('Search users error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, currentUser]);

  const handleSendRequest = async (toUserId: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromUserId: currentUser.id, toUserId })
      }).then(r => r.json());

      if (res.success) {
        setActionMessage('Connection request sent!');
        setTimeout(() => setActionMessage(null), 2500);
        loadFriendsData();
      } else {
        setActionMessage(res.message || 'Could not send request');
        setTimeout(() => setActionMessage(null), 2500);
      }
    } catch (err) {
      console.error('Send friend request error:', err);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    if (!currentUser) return;
    try {
      await fetch('/api/friends/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, currentUserId: currentUser.id })
      });
      loadFriendsData();
    } catch (err) {
      console.error('Accept request error:', err);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    if (!currentUser) return;
    try {
      await fetch('/api/friends/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, currentUserId: currentUser.id })
      });
      loadFriendsData();
    } catch (err) {
      console.error('Decline request error:', err);
    }
  };

  const handleRemoveFriend = async (targetUserId: string) => {
    if (!currentUser) return;
    if (!window.confirm('Remove this user from your connections?')) return;
    try {
      await fetch(`/api/friends/${targetUserId}?userId=${currentUser.id}`, { method: 'DELETE' });
      loadFriendsData();
    } catch (err) {
      console.error('Remove friend error:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-[#0c1017] border border-slate-800 p-6 shadow-2xl text-slate-100 flex flex-col h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-white">Friends & Connections</h2>
              <p className="text-xs text-slate-400">Connect with fellow creators to collaborate on shared notebooks</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 my-4 bg-[#111622] p-1 rounded-2xl border border-slate-800 shrink-0">
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'friends'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Friends ({friends.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('find')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'find'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Find People</span>
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition relative ${
              activeTab === 'requests'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Requests</span>
            {incomingRequests.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#0c1017]" />
            )}
          </button>
        </div>

        {/* Action Message Toast */}
        {actionMessage && (
          <div className="mb-3 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-3">
          {/* TAB 1: FRIENDS LIST */}
          {activeTab === 'friends' && (
            <div>
              {friends.length === 0 ? (
                <div className="h-60 rounded-2xl bg-[#111622] border border-slate-800/80 flex flex-col items-center justify-center text-center p-6">
                  <Users className="w-10 h-10 text-slate-500 mb-2" />
                  <p className="text-sm font-bold text-white">No connections yet</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Search for colleagues and creators by handle or display name to send a connection request.
                  </p>
                  <button
                    onClick={() => setActiveTab('find')}
                    className="mt-4 px-4 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold hover:bg-amber-300 transition"
                  >
                    Find Friends
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {friends.map(f => (
                    <div
                      key={f.id}
                      className="p-3.5 rounded-2xl bg-[#111622] border border-slate-800/90 flex items-center justify-between hover:border-slate-700 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-slate-950 text-sm shrink-0 relative"
                          style={{ backgroundColor: f.connectedUser.avatarColor }}
                        >
                          {f.connectedUser.name[0].toUpperCase()}
                          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-[#111622]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{f.connectedUser.name}</p>
                          <p className="text-[11px] font-mono text-slate-400 truncate">@{f.connectedUser.username}</p>
                          {f.connectedUser.bio && (
                            <p className="text-[10px] text-slate-500 truncate mt-0.5">{f.connectedUser.bio}</p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveFriend(f.connectedUserId)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title="Remove Friend"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FIND PEOPLE */}
          {activeTab === 'find' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by username (@alex_ink) or display name..."
                  autoFocus
                  className="w-full rounded-2xl bg-[#111622] border border-slate-800 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                />
              </div>

              {isSearching ? (
                <div className="py-8 text-center text-xs text-slate-400">Searching creators...</div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map(u => (
                    <div
                      key={u.id}
                      className="p-3 rounded-2xl bg-[#111622] border border-slate-800 flex items-center justify-between hover:border-slate-700 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-slate-950 text-xs shrink-0"
                          style={{ backgroundColor: u.avatarColor }}
                        >
                          {u.name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{u.name}</p>
                          <p className="text-[11px] font-mono text-slate-400">@{u.username}</p>
                          {u.bio && <p className="text-[10px] text-slate-500 mt-0.5">{u.bio}</p>}
                        </div>
                      </div>

                      {u.isFriend ? (
                        <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl">
                          Connected
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSendRequest(u.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold hover:bg-amber-300 transition"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Connect</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : searchQuery.trim() ? (
                <div className="py-8 text-center text-xs text-slate-400">No users found matching "{searchQuery}"</div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-500">
                  Type a handle or name above to find collaborators.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: REQUESTS */}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Incoming Requests ({incomingRequests.length})
                </h3>
                {incomingRequests.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 italic">No pending incoming requests</p>
                ) : (
                  <div className="space-y-2">
                    {incomingRequests.map(req => (
                      <div
                        key={req.id}
                        className="p-3 rounded-2xl bg-[#111622] border border-slate-800 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-slate-950 text-xs shrink-0"
                            style={{ backgroundColor: req.fromUser.avatarColor }}
                          >
                            {req.fromUser.name[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">{req.fromUser.name}</p>
                            <p className="text-[11px] font-mono text-slate-400">@{req.fromUser.username}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAcceptRequest(req.id)}
                            className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition text-xs font-bold flex items-center gap-1 px-3"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Accept</span>
                          </button>
                          <button
                            onClick={() => handleDeclineRequest(req.id)}
                            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Sent Requests ({outgoingRequests.length})
                </h3>
                {outgoingRequests.length === 0 ? (
                  <p className="text-xs text-slate-500 py-2 italic">No pending outgoing requests</p>
                ) : (
                  <div className="space-y-2">
                    {outgoingRequests.map(req => (
                      <div
                        key={req.id}
                        className="p-3 rounded-2xl bg-[#111622] border border-slate-800 flex items-center justify-between"
                      >
                        <p className="text-xs text-slate-300">
                          Request sent to <span className="font-bold text-white">@{req.toUserId}</span>
                        </p>
                        <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                          Pending
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
