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
  Clock
} from 'lucide-react';

interface NotificationsModalProps {
  isOpen: boolean;
  currentUser: User | null;
  onClose: () => void;
  onOpenNotebook?: (notebookId: string) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onOpenNotebook
}) => {
  const [notifications, setNotifications] = useState<CollaborationNotification[]>([]);

  useEffect(() => {
    if (isOpen && currentUser) {
      loadNotifications();
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

  if (!isOpen || !currentUser) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md rounded-3xl bg-[#0c1017] border border-slate-800 p-6 shadow-2xl text-slate-100 flex flex-col h-[70vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-base font-bold text-white">Notifications</h2>
              <p className="text-xs text-slate-400">Updates, friend requests, and invites</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleMarkRead()}
              className="p-1.5 text-xs text-indigo-400 hover:text-white transition"
              title="Mark all as read"
            >
              <CheckCheck className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 my-3 pr-1">
          {notifications.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-4">
              <Bell className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-xs font-bold text-slate-400">No new notifications</p>
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                onClick={() => {
                  if (n.notebookId && onOpenNotebook) {
                    onOpenNotebook(n.notebookId);
                    onClose();
                  }
                }}
                className={`p-3 rounded-2xl border transition cursor-pointer ${
                  !n.read
                    ? 'bg-[#111622] border-amber-500/40 shadow-sm'
                    : 'bg-[#0e131f]/60 border-slate-800/80 text-slate-400'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-slate-950 text-xs shrink-0 mt-0.5"
                    style={{ backgroundColor: n.fromUserAvatar || '#f59e0b' }}
                  >
                    {n.fromUserName[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-200 font-medium leading-snug">{n.message}</p>
                    <span className="text-[10px] font-mono text-slate-500 mt-1 block">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
