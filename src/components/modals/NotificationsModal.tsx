import React, { useState, useEffect } from 'react';
import { CollaborationNotification } from '../../types/collaboration';
import { User } from '../../types/notebook';
import {
  X,
  Bell,
  UserPlus,
  BookOpen,
  Check,
  CheckCheck,
  Sparkles,
  Clock,
  UserCheck,
  UserX,
  RefreshCw,
  Hash,
  ArrowRight,
  ShieldAlert,
  Inbox
} from 'lucide-react';

interface NotificationsModalProps {
  isOpen: boolean;
  currentUser: User | null;
  onClose: () => void;
  onOpenNotebook?: (notebookId: string) => void;
  onInviteAccepted?: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onOpenNotebook,
  onInviteAccepted
}) => {
  const [notifications, setNotifications] = useState<CollaborationNotification[]>([]);
  const [activeFilter, setActiveTab] = useState<'all' | 'invites' | 'unread'>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && currentUser) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen, currentUser]);

  const loadNotifications = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/notifications?userId=${currentUser.id}`).then(r => r.json());
      if (res.notifications) setNotifications(res.notifications);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  const handleMarkRead = async (notifId?: string) => {
    if (!currentUser) return;
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: notifId, userId: currentUser.id })
      });
      loadNotifications();
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  const handleRespondInvite = async (notificationId: string, action: 'accept' | 'decline') => {
    if (!currentUser) return;
    setActionLoadingId(notificationId);
    try {
      const res = await fetch('/api/notifications/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId, action, userId: currentUser.id })
      }).then(r => r.json());

      if (res.success) {
        setToastMessage(action === 'accept' ? '🎉 Joined collaborative notebook!' : 'Invite declined.');
        setTimeout(() => setToastMessage(null), 3000);
        await loadNotifications();
        if (action === 'accept' && onInviteAccepted) {
          onInviteAccepted();
        }
      }
    } catch (err) {
      console.error('Respond to invite error:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!isOpen || !currentUser) return null;

  const filtered = notifications.filter(n => {
    if (activeFilter === 'invites') return n.type === 'notebook_invite';
    if (activeFilter === 'unread') return !n.read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const pendingInvitesCount = notifications.filter(
    n => n.type === 'notebook_invite' && (!n.inviteStatus || n.inviteStatus === 'pending')
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-[#0c1017] border border-slate-800 p-6 shadow-2xl text-slate-100 flex flex-col h-[75vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-slate-950 text-[10px] font-extrabold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                <span>Notification Center</span>
                {pendingInvitesCount > 0 && (
                  <span className="text-[10px] font-mono font-extrabold bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full">
                    {pendingInvitesCount} New Invite{pendingInvitesCount > 1 ? 's' : ''}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">Collaborative notebook invites & friend updates</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleMarkRead()}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs text-slate-300 hover:text-white transition flex items-center gap-1"
              title="Mark all as read"
            >
              <CheckCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Mark Read</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Toast */}
        {toastMessage && (
          <div className="my-2.5 px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 my-3 bg-[#111622] p-1 rounded-2xl border border-slate-800 shrink-0">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
              activeFilter === 'all'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setActiveTab('invites')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeFilter === 'invites'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Invites</span>
            {pendingInvitesCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('unread')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
              activeFilter === 'unread'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* Notification Cards List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
          {filtered.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-[#111622]/60 border border-slate-800/80">
              <Inbox className="w-10 h-10 text-slate-600 mb-2" />
              <p className="text-xs font-bold text-slate-300">No notifications in this tab</p>
              <p className="text-[11px] text-slate-500 mt-1">When someone invites you via your 6-digit Friend Code, it will show up here.</p>
            </div>
          ) : (
            filtered.map(n => {
              const isInvite = n.type === 'notebook_invite';
              const isPending = !n.inviteStatus || n.inviteStatus === 'pending';

              return (
                <div
                  key={n.id}
                  className={`p-4 rounded-2xl border transition relative space-y-3 ${
                    !n.read
                      ? 'bg-[#111622] border-amber-500/40 shadow-lg'
                      : 'bg-[#0e131f]/70 border-slate-800/90 text-slate-300'
                  }`}
                >
                  {/* Top Bar: Sender Info & 6-Digit Code */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-slate-950 text-sm shrink-0 shadow-md"
                        style={{ backgroundColor: n.fromUserAvatar || '#f59e0b' }}
                      >
                        {n.fromUserName[0]?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-white">{n.fromUserName}</p>
                          {n.fromUserCollabCode && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-[10px] font-extrabold">
                              #{n.fromUserCollabCode}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400">
                          {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} at{' '}
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    {!n.read && (
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-4 ring-[#111622] shrink-0" />
                    )}
                  </div>

                  {/* Message Content & Notebook Badge */}
                  <div className="p-3 rounded-xl bg-[#080b11] border border-slate-800/80 space-y-1.5">
                    <p className="text-xs text-slate-200 leading-relaxed font-medium">{n.message}</p>
                    {n.notebookTitle && (
                      <div className="flex items-center justify-between pt-1 text-[11px] border-t border-slate-800/60">
                        <span className="font-bold text-amber-300 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>{n.notebookTitle}</span>
                        </span>
                        {n.role && (
                          <span className="font-mono text-[10px] font-bold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                            {n.role.toUpperCase()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Interactive Action Buttons for Collaboration Invites */}
                  {isInvite && (
                    <div className="pt-1 flex items-center justify-between gap-2">
                      {isPending ? (
                        <>
                          <button
                            onClick={() => handleRespondInvite(n.id, 'decline')}
                            disabled={actionLoadingId === n.id}
                            className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                          >
                            <UserX className="w-3.5 h-3.5 text-slate-400" />
                            <span>Decline</span>
                          </button>

                          <button
                            onClick={() => handleRespondInvite(n.id, 'accept')}
                            disabled={actionLoadingId === n.id}
                            className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-md flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                          >
                            {actionLoadingId === n.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            <span>Accept Invite</span>
                          </button>
                        </>
                      ) : n.inviteStatus === 'accepted' ? (
                        <div className="w-full flex items-center justify-between p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold">
                          <span className="flex items-center gap-1.5">
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span>Accepted & Added to Shared Notebooks</span>
                          </span>
                          {n.notebookId && onOpenNotebook && (
                            <button
                              onClick={() => {
                                onOpenNotebook(n.notebookId!);
                                onClose();
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-400 text-slate-950 text-[11px] font-bold hover:bg-emerald-300 transition flex items-center gap-1"
                            >
                              <span>Open</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="w-full p-2 rounded-xl bg-slate-800/40 border border-slate-800 text-slate-500 text-xs font-semibold">
                          Declined Invite
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
