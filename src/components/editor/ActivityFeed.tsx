import React from 'react';
import { NotebookActivity } from '../../types/collaboration';
import {
  Clock,
  UserPlus,
  UserCheck,
  PenTool,
  Trash2,
  FilePlus,
  FileX,
  MessageSquare,
  Sparkles,
  Shield,
  Activity,
  User
} from 'lucide-react';

interface ActivityFeedProps {
  activities: NotebookActivity[];
  onClearActivities?: () => void;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  onClearActivities
}) => {
  const getActionIcon = (action: NotebookActivity['action']) => {
    switch (action) {
      case 'joined':
      case 'left':
        return <UserCheck className="w-3.5 h-3.5 text-emerald-400" />;
      case 'invited_user':
        return <UserPlus className="w-3.5 h-3.5 text-indigo-400" />;
      case 'stroke_added':
      case 'shape_added':
      case 'text_added':
      case 'image_added':
        return <PenTool className="w-3.5 h-3.5 text-amber-400" />;
      case 'stroke_deleted':
      case 'page_deleted':
        return <Trash2 className="w-3.5 h-3.5 text-rose-400" />;
      case 'page_created':
        return <FilePlus className="w-3.5 h-3.5 text-sky-400" />;
      case 'comment_added':
        return <MessageSquare className="w-3.5 h-3.5 text-purple-400" />;
      case 'role_changed':
        return <Shield className="w-3.5 h-3.5 text-teal-400" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const diffSeconds = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSeconds < 60) return 'Just now';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full bg-[#0c1017] text-slate-100 select-none">
      {/* Feed Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-400" />
          <h3 className="font-serif text-xs font-bold text-white uppercase tracking-wider">
            Real-Time Activity Feed
          </h3>
        </div>
        <span className="text-[10px] font-mono text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-full">
          {activities.length} Events
        </span>
      </div>

      {/* Activities List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5">
        {activities.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4">
            <Clock className="w-8 h-8 text-slate-600 mb-2" />
            <p className="text-xs font-bold text-slate-400">No activity logged yet</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
              Actions performed by collaborators (writing, adding pages, invites) will appear here live.
            </p>
          </div>
        ) : (
          activities.map(act => (
            <div
              key={act.id}
              className="p-3 rounded-2xl bg-[#111622] border border-slate-800/90 hover:border-slate-700 transition flex items-start gap-3"
            >
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 shrink-0 mt-0.5">
                {getActionIcon(act.action)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-white truncate">{act.userName}</span>
                  <span className="text-[10px] font-mono text-slate-500 shrink-0">
                    {formatTimestamp(act.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5 leading-snug">{act.details}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
