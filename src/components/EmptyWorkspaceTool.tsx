import { ArrowRight, Compass, FileText, HelpCircle, Plus } from 'lucide-react';
import type { TopicSession } from '../types';
import type { WorkspaceTab } from './Header';

interface EmptyWorkspaceToolProps {
  tab: Extract<WorkspaceTab, 'knowledge' | 'questions' | 'report'>;
  sessions: TopicSession[];
  onSelectSessionForTab: (sessionId: string, tab: WorkspaceTab) => void;
  onNewResearch: () => void;
}

export function EmptyWorkspaceTool({
  tab,
  sessions,
  onSelectSessionForTab,
  onNewResearch,
}: EmptyWorkspaceToolProps) {
  const meta =
    tab === 'knowledge'
      ? {
          title: 'Knowledge Maps',
          desc: 'Select an existing research conversation below to inspect its concept branches and terminology, or start a new topic.',
          Icon: Compass,
        }
      : tab === 'questions'
        ? {
            title: 'Question Studio',
            desc: 'Choose a research topic below to generate scored MCQs, short-answer drills, and analytical prompts.',
            Icon: HelpCircle,
          }
        : {
            title: 'Research Reports',
            desc: 'Select a saved research session below to preview findings and export a formatted PDF or Markdown report.',
            Icon: FileText,
          };

  const Icon = meta.Icon;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 py-10 bg-[#F8FAFC] dark:bg-[#060913]">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/70 dark:border-blue-800/70 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Icon className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-slate-50">
              {meta.title}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {meta.desc}
            </p>
          </div>
          <button
            type="button"
            onClick={onNewResearch}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[40px] text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Start New Research</span>
          </button>
        </div>

        {sessions.length > 0 && (
          <div className="space-y-2.5">
            <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-1">
              Open in Saved Conversations ({sessions.length})
            </h2>
            <div className="space-y-2">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelectSessionForTab(s.id, tab)}
                  className="w-full flex items-center justify-between gap-3 p-4 bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 rounded-xl text-left transition-colors cursor-pointer group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                      {s.topic}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums truncate">
                      {s.knowledgeMap.domain} · {s.knowledgeMap.branches.length} branches ·{' '}
                      {s.messages.length} msgs
                    </p>
                  </div>
                  <ArrowRight
                    className="w-4 h-4 text-slate-400 group-hover:text-blue-500 shrink-0"
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
