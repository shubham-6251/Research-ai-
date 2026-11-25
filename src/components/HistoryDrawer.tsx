import { useState } from 'react';
import { History, Plus, Search, Trash2, X } from 'lucide-react';
import type { TopicSession } from '../types';

interface HistoryDrawerProps {
  isOpen: boolean;
  sessions: TopicSession[];
  activeSessionId: string | null;
  onClose: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onNewTopic: () => void;
}

export function HistoryDrawer({
  isOpen,
  sessions,
  activeSessionId,
  onClose,
  onSelectSession,
  onDeleteSession,
  onNewTopic,
}: HistoryDrawerProps) {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const filtered = sessions.filter((s) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      s.topic.toLowerCase().includes(q) ||
      s.knowledgeMap.domain.toLowerCase().includes(q)
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Research session history"
    >
      <div className="w-full max-w-md h-full bg-[#FAF9F6] dark:bg-[#0F172A] border-l border-[#E5E2DC] dark:border-[#1E293B] flex flex-col shadow-xl">
        <div className="px-5 py-4 border-b border-[#E5E2DC] dark:border-[#1E293B] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#1E40AF] dark:text-[#60A5FA]" aria-hidden="true" />
            <h2 className="font-display text-lg font-semibold text-[#111827] dark:text-[#F8FAFC]">
              Research History ({sessions.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close history drawer"
            className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center text-[#71717A] hover:text-[#111827] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC] rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-4 border-b border-[#E5E2DC] dark:border-[#1E293B] space-y-3">
          <div className="relative">
            <Search
              className="w-4 h-4 text-[#71717A] dark:text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter saved research topics..."
              aria-label="Filter saved research topics"
              className="w-full pl-9 pr-3 py-2 min-h-[42px] text-sm text-[#111827] dark:text-[#F8FAFC] placeholder:text-[#A1A1AA] dark:placeholder:text-[#64748B] bg-white dark:bg-[#0B1120] border border-[#D4D4D8] dark:border-[#334155] rounded-lg focus:outline-none focus:border-[#1E40AF]"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              onNewTopic();
            }}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#2563EB] dark:hover:bg-[#1D4ED8] rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Start New Research Topic</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filtered.length === 0 ? (
            <p className="text-sm text-[#71717A] dark:text-[#94A3B8] text-center py-8">
              No matching research sessions found.
            </p>
          ) : (
            filtered.map((session) => {
              const isCurrent = session.id === activeSessionId;
              return (
                <div
                  key={session.id}
                  className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border transition-colors ${
                    isCurrent
                      ? 'bg-[#EFF6FF] dark:bg-[#1E293B] border-[#BFDBFE] dark:border-[#3B82F6]/50'
                      : 'bg-white dark:bg-[#111827] border-[#E5E2DC] dark:border-[#1E293B]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSelectSession(session.id);
                      onClose();
                    }}
                    className="flex-1 min-w-0 text-left cursor-pointer"
                  >
                    <p className="text-sm font-semibold text-[#111827] dark:text-[#F8FAFC] truncate">
                      {session.topic}
                    </p>
                    <p className="text-xs text-[#71717A] dark:text-[#94A3B8] mt-1 tabular-nums truncate">
                      {session.knowledgeMap.domain} · {session.messages.length} msgs ·{' '}
                      {session.allSources.length} refs
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteSession(session.id)}
                    aria-label={`Delete session ${session.topic}`}
                    className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center text-[#71717A] hover:text-[#B91C1C] dark:text-[#94A3B8] dark:hover:text-[#F87171] rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
