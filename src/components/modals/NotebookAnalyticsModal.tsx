import React, { useState, useEffect } from 'react';
import { Notebook, NotebookAccessLog } from '../../types/notebook';
import { NotebookActivity } from '../../types/collaboration';
import { db } from '../../db/database';
import {
  X,
  Eye,
  Clock,
  Users,
  Activity,
  Calendar,
  ShieldCheck,
  RefreshCw,
  Download,
  CheckCircle2,
  FileText,
  UserCheck
} from 'lucide-react';

interface NotebookAnalyticsModalProps {
  isOpen: boolean;
  notebook: Notebook | null;
  onClose: () => void;
}

export const NotebookAnalyticsModal: React.FC<NotebookAnalyticsModalProps> = ({
  isOpen,
  notebook,
  onClose
}) => {
  const [logs, setLogs] = useState<NotebookAccessLog[]>([]);
  const [activities, setActivities] = useState<NotebookActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'sessions' | 'activities'>('sessions');
  const [exported, setExported] = useState(false);

  useEffect(() => {
    if (isOpen && notebook) {
      loadLogsAndActivities();
    }
  }, [isOpen, notebook]);

  const loadLogsAndActivities = async () => {
    if (!notebook) return;
    setIsLoading(true);
    try {
      // 1. Fetch local Dexie records
      const localRecords = await db.accessLogs
        .where('notebookId')
        .equals(notebook.id)
        .reverse()
        .sortBy('openedAt');

      // 2. Fetch server access logs
      let serverLogs: NotebookAccessLog[] = [];
      try {
        const res = await fetch(`/api/notebooks/${notebook.id}/access-logs`);
        if (res.ok) {
          const data = await res.json();
          serverLogs = data.logs || [];
        }
      } catch (e) {
        console.warn('Server access logs fetch skipped:', e);
      }

      // Merge local and server logs seamlessly by log ID
      const logMap = new Map<string, NotebookAccessLog>();
      for (const log of [...serverLogs, ...localRecords]) {
        const existing = logMap.get(log.id);
        if (!existing || (log.durationSeconds || 0) >= (existing.durationSeconds || 0)) {
          logMap.set(log.id, log);
        }
      }

      const mergedLogs = Array.from(logMap.values()).sort((a, b) => b.openedAt - a.openedAt);
      setLogs(mergedLogs);

      // 3. Fetch activity trail
      try {
        const actRes = await fetch(`/api/notebooks/${notebook.id}/activity`);
        if (actRes.ok) {
          const actData = await actRes.json();
          setActivities(actData.activities || []);
        }
      } catch (e) {
        console.warn('Activities fetch skipped:', e);
      }
    } catch (err) {
      console.error('Failed to load notebook access logs & activities:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!logs.length || !notebook) return;
    const headers = ['Log ID', 'User Name', 'User Email', 'User ID', 'Opened At', 'Last Active At', 'Duration (Seconds)', 'Duration (Formatted)'];
    const rows = logs.map(l => [
      l.id,
      `"${l.userName || 'User'}"`,
      `"${l.userEmail || ''}"`,
      l.userId || 'anon',
      new Date(l.openedAt).toISOString(),
      new Date(l.lastActiveAt).toISOString(),
      l.durationSeconds || 0,
      `"${formatDuration(l.durationSeconds || 0)}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${notebook.title.replace(/\s+/g, '_')}_Access_Logs.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExported(true);
    setTimeout(() => setExported(false), 2500);
  };

  if (!isOpen || !notebook) return null;

  // Aggregate metrics
  const totalViews = logs.length;
  const uniqueUsersCount = new Set(logs.map(l => l.userId || l.userEmail)).size;
  const totalSecondsSpent = logs.reduce((sum, l) => sum + (l.durationSeconds || 0), 0);
  const activeNowCount = logs.filter(l => Date.now() - l.lastActiveAt < 45000).length;

  function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return `${mins}m ${secs}s`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours}h ${remMins}m`;
  }

  function formatDate(timestamp: number): string {
    const d = new Date(timestamp);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-4xl rounded-3xl bg-[#0f172a] border border-slate-800 p-6 md:p-8 shadow-2xl text-slate-100 flex flex-col max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800/80 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20 font-bold text-[10px] tracking-wider uppercase">
                Creator Access & Activity Logs
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Owner Overlay
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Activity className="w-6 h-6 text-amber-400" />
              <span>{notebook.title}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Tracks user activity logs (who accessed, entry timestamp, active time spent, and editing actions).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={logs.length === 0}
              className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-200 hover:text-white border border-slate-700/60 flex items-center gap-1.5 transition disabled:opacity-40"
              title="Export Access Logs as CSV"
            >
              {exported ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-indigo-400" />
                  <span>Export CSV</span>
                </>
              )}
            </button>

            <button
              onClick={loadLogsAndActivities}
              className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Refresh Logs"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Analytics KPI Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4 shrink-0">
          <div className="p-3.5 rounded-2xl bg-[#111622] border border-slate-800/80">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1 font-medium">
              <Eye className="w-4 h-4 text-sky-400" />
              <span>Total Sessions</span>
            </div>
            <p className="text-2xl font-black text-white">{totalViews}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#111622] border border-slate-800/80">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1 font-medium">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Unique Users</span>
            </div>
            <p className="text-2xl font-black text-white">{uniqueUsersCount}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#111622] border border-slate-800/80">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1 font-medium">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Total Time Spent</span>
            </div>
            <p className="text-2xl font-black text-white">{formatDuration(totalSecondsSpent)}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#111622] border border-slate-800/80">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1 font-medium">
              <UserCheck className="w-4 h-4 text-purple-400" />
              <span>Active Now</span>
            </div>
            <p className="text-2xl font-black text-emerald-400 flex items-center gap-2">
              {activeNowCount}
              {activeNowCount > 0 && <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 mb-4 shrink-0">
          <button
            onClick={() => setActiveTab('sessions')}
            className={`pb-2 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'sessions'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            User Access & Duration Logs ({logs.length})
          </button>

          <button
            onClick={() => setActiveTab('activities')}
            className={`pb-2 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'activities'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Activity & Editing Audit Stream ({activities.length})
          </button>
        </div>

        {/* Content Tab Panes */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
          {activeTab === 'sessions' ? (
            logs.length === 0 ? (
              <div className="py-12 text-center rounded-2xl bg-[#111622]/50 border border-slate-800/50 my-2">
                <Activity className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                <p className="text-sm font-bold text-slate-300">No viewer session logs recorded yet</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  When anyone opens or reads this notebook, their user account, entry timestamp, and active duration will appear here.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 overflow-hidden bg-[#111622]">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">User (Who)</th>
                      <th className="px-4 py-3">Opened At (When)</th>
                      <th className="px-4 py-3">Time Spent (How Long)</th>
                      <th className="px-4 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {logs.map(log => {
                      const isActive = Date.now() - log.lastActiveAt < 45000;
                      return (
                        <tr key={log.id} className="hover:bg-slate-800/40 transition">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-slate-950 overflow-hidden shrink-0 shadow-sm"
                                style={{ backgroundColor: log.userAvatarColor || '#f59e0b' }}
                              >
                                {log.userAvatarImage ? (
                                  <img src={log.userAvatarImage} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span>{log.userName?.[0]?.toUpperCase() || 'U'}</span>
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-white leading-tight">
                                  {log.userName || 'Anonymous User'}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono">
                                  {log.userEmail || 'no-email@user'}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="text-slate-200 font-semibold">{formatDate(log.openedAt)}</div>
                            <div className="text-[10px] text-amber-400/90 font-mono mt-0.5">
                              {getRelativeTime(log.openedAt)}
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/80 font-mono font-bold text-amber-300">
                              <Clock className="w-3 h-3 text-amber-400" />
                              {formatDuration(log.durationSeconds || 0)}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-right">
                            {isActive ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                                Active Now
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-[10px] font-medium">
                                Completed
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            /* Activity & Editing Stream Tab */
            activities.length === 0 ? (
              <div className="py-12 text-center rounded-2xl bg-[#111622]/50 border border-slate-800/50 my-2">
                <FileText className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                <p className="text-sm font-bold text-slate-300">No editing activities recorded yet</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  When collaborators draw ink strokes, add typed text, insert comments, or modify pages, their actions will be listed in this audit stream.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {activities.map(act => (
                  <div
                    key={act.id}
                    className="p-3 rounded-xl bg-[#111622] border border-slate-800/80 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5 border border-indigo-500/30">
                        {act.userName?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div className="text-slate-200 font-semibold">
                          <span className="text-white font-bold">{act.userName}</span>{' '}
                          <span className="text-amber-400/90 font-mono text-[11px] font-medium px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/20 ml-1">
                            {act.action}
                          </span>
                        </div>
                        <p className="text-slate-400 text-[11px] mt-0.5">{act.details}</p>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono shrink-0">
                      {formatDate(act.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
