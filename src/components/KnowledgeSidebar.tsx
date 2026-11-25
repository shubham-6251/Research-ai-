import { useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  FileDown,
  Globe,
  History,
  Moon,
  Sun,
  Terminal,
  Zap,
} from 'lucide-react';
import { computeStudyProgress } from '../utils/knowledgeTree';
import type {
  KnowledgeLevel,
  ResearchMode,
  ResponseSpeed,
  TopicSession,
} from '../types';

interface KnowledgeSidebarProps {
  session: TopicSession;
  sessionCount: number;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenHistory: () => void;
  onExportPdf: () => void;
  onOpenCommands: () => void;
  onChangeMode: (mode: ResearchMode) => void;
  onChangeLevel: (level: KnowledgeLevel) => void;
  onChangeResponseSpeed: (speed: ResponseSpeed) => void;
  onToggleSearch: () => void;
  onQuickPrompt: (prompt: string) => void;
  isBusy: boolean;
}

const MODES: { id: ResearchMode; label: string }[] = [
  { id: 'qa', label: 'Q&A' },
  { id: 'research', label: 'Research' },
  { id: 'learn', label: 'Learn' },
  { id: 'summarize', label: 'Summary' },
];

const LEVELS: { id: KnowledgeLevel; label: string }[] = [
  { id: 'adaptive', label: 'Adaptive' },
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Mid' },
  { id: 'advanced', label: 'Advanced' },
];

export function KnowledgeSidebar({
  session,
  sessionCount,
  theme,
  onToggleTheme,
  onOpenHistory,
  onExportPdf,
  onOpenCommands,
  onChangeMode,
  onChangeLevel,
  onChangeResponseSpeed,
  onToggleSearch,
  onQuickPrompt,
  isBusy,
}: KnowledgeSidebarProps) {
  const [expandedBranches, setExpandedBranches] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    session.knowledgeMap.branches.forEach((b, idx) => {
      initial[b.id] = idx < 2;
    });
    return initial;
  });

  const progress = computeStudyProgress(session.knowledgeMap, session.exploredItems);
  const exploredSet = new Set(session.exploredItems.map((i) => i.toLowerCase()));

  const toggleBranch = (id: string) => {
    setExpandedBranches((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const activeMode = session.activeMode ?? 'qa';

  return (
    <div className="flex flex-col h-full bg-[#F4F2EC] dark:bg-[#0F172A] border-r border-[#E5E2DC] dark:border-[#1E293B] overflow-y-auto">
      {/* Workspace Utility Strip */}
      <div className="px-4 py-3 border-b border-[#E5E2DC] dark:border-[#1E293B] flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onOpenHistory}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] text-xs font-medium text-[#27272A] dark:text-[#E2E8F0] bg-white dark:bg-[#1E293B] hover:bg-[#FAF9F6] dark:hover:bg-[#334155] border border-[#E5E2DC] dark:border-[#334155] rounded-lg transition-colors whitespace-nowrap cursor-pointer tabular-nums"
        >
          <History className="w-3.5 h-3.5 text-[#1E40AF] dark:text-[#60A5FA]" aria-hidden="true" />
          <span>History ({sessionCount})</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onExportPdf}
            title="Export PDF report"
            aria-label="Export research PDF"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] text-xs font-medium text-[#27272A] dark:text-[#E2E8F0] bg-white dark:bg-[#1E293B] hover:bg-[#FAF9F6] dark:hover:bg-[#334155] border border-[#E5E2DC] dark:border-[#334155] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5 text-[#1E40AF] dark:text-[#60A5FA]" aria-hidden="true" />
            <span>PDF</span>
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-[#27272A] dark:text-[#E2E8F0] bg-white dark:bg-[#1E293B] hover:bg-[#FAF9F6] dark:hover:bg-[#334155] border border-[#E5E2DC] dark:border-[#334155] rounded-lg transition-colors cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-[#FBBF24]" aria-hidden="true" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-[#3F3F46]" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Topic Header & Controls */}
      <div className="p-5 border-b border-[#E5E2DC] dark:border-[#1E293B] space-y-3.5">
        <div>
          <p className="text-xs text-[#71717A] dark:text-[#94A3B8] mb-1">
            {session.knowledgeMap.domain}
          </p>
          <h2 className="font-display text-lg font-semibold text-[#111827] dark:text-[#F8FAFC] leading-snug">
            {session.topic}
          </h2>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#52525B] dark:text-[#94A3B8] tabular-nums">
            <span>Topic Coverage</span>
            <span>
              {progress.exploredCount}/{progress.totalCount} subtopics ({progress.percentage}%)
            </span>
          </div>
          <div className="h-1.5 w-full bg-[#E5E2DC] dark:bg-[#1E293B] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1E40AF] dark:bg-[#3B82F6] transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>

        {/* Research Mode Switcher */}
        <div className="pt-1 space-y-1.5">
          <span className="block text-xs font-medium text-[#52525B] dark:text-[#94A3B8]">
            Assistant Mode
          </span>
          <div
            role="group"
            aria-label="Assistant mode"
            className="flex items-center gap-0.5 p-1 bg-[#E7E4DC] dark:bg-[#0B1120] rounded-lg"
          >
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onChangeMode(m.id)}
                className={`flex-1 py-1.5 px-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  activeMode === m.id
                    ? 'bg-white dark:bg-[#1E293B] text-[#1E40AF] dark:text-[#60A5FA] shadow-xs'
                    : 'text-[#52525B] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F8FAFC]'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Knowledge Level Switcher */}
        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-[#52525B] dark:text-[#94A3B8]">
            Explanation Depth
          </span>
          <div
            role="group"
            aria-label="Explanation depth"
            className="flex items-center gap-0.5 p-1 bg-[#E7E4DC] dark:bg-[#0B1120] rounded-lg"
          >
            {LEVELS.map((lvl) => (
              <button
                key={lvl.id}
                type="button"
                onClick={() => onChangeLevel(lvl.id)}
                className={`flex-1 py-1.5 px-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  session.level === lvl.id
                    ? 'bg-white dark:bg-[#1E293B] text-[#111827] dark:text-[#F8FAFC] shadow-xs'
                    : 'text-[#52525B] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F8FAFC]'
                }`}
              >
                {lvl.label}
              </button>
            ))}
          </div>
        </div>

        {/* Response Speed Switcher */}
        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-[#52525B] dark:text-[#94A3B8]">
            Response Speed
          </span>
          <div
            role="group"
            aria-label="Response speed"
            className="flex items-center gap-0.5 p-1 bg-[#E7E4DC] dark:bg-[#0B1120] rounded-lg"
          >
            <button
              type="button"
              onClick={() => onChangeResponseSpeed('standard')}
              className={`flex-1 py-1.5 px-2 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                (session.responseSpeed ?? 'standard') === 'standard'
                  ? 'bg-white dark:bg-[#1E293B] text-[#111827] dark:text-[#F8FAFC] shadow-xs'
                  : 'text-[#52525B] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F8FAFC]'
              }`}
            >
              Standard
            </button>
            <button
              type="button"
              onClick={() => onChangeResponseSpeed('fast')}
              className={`flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                session.responseSpeed === 'fast'
                  ? 'bg-white dark:bg-[#1E293B] text-[#1E40AF] dark:text-[#60A5FA] shadow-xs'
                  : 'text-[#52525B] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F8FAFC]'
              }`}
            >
              <Zap className="w-3 h-3" aria-hidden="true" />
              <span>Fast</span>
            </button>
          </div>
        </div>

        {/* Web Search Grounding Toggle */}
        <button
          type="button"
          onClick={onToggleSearch}
          aria-pressed={session.searchGrounding}
          className={`w-full flex items-center justify-between px-3 py-2 min-h-[40px] text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
            session.searchGrounding
              ? 'bg-white dark:bg-[#111827] border-[#BFDBFE] dark:border-[#3B82F6]/60 text-[#1E40AF] dark:text-[#60A5FA]'
              : 'bg-[#FAF9F6] dark:bg-[#0B1120] border-[#E5E2DC] dark:border-[#1E293B] text-[#52525B] dark:text-[#94A3B8]'
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <Globe className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Search Grounding</span>
          </span>
          <span>{session.searchGrounding ? 'Active' : 'Off'}</span>
        </button>

        <button
          type="button"
          onClick={onOpenCommands}
          className="w-full flex items-center justify-between px-3 py-2 min-h-[38px] text-xs font-medium text-[#52525B] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F8FAFC] bg-transparent hover:bg-white/60 dark:hover:bg-[#1E293B]/60 rounded-lg transition-colors cursor-pointer"
        >
          <span className="inline-flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Slash Commands Directory</span>
          </span>
          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* Branches & Subtopics Tree */}
      <div className="p-5 space-y-5 flex-1">
        <div>
          <h3 className="text-xs font-semibold text-[#52525B] dark:text-[#94A3B8] mb-3">
            Knowledge Structure
          </h3>
          <div className="space-y-2">
            {session.knowledgeMap.branches.map((branch, idx) => {
              const isExpanded = Boolean(expandedBranches[branch.id]);
              return (
                <div
                  key={branch.id}
                  className="bg-white dark:bg-[#111827] border border-[#E5E2DC] dark:border-[#1E293B] rounded-lg overflow-hidden"
                >
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    onClick={() => toggleBranch(branch.id)}
                    className="w-full flex items-start justify-between gap-2 px-3 py-2.5 text-left hover:bg-[#FAF9F6] dark:hover:bg-[#1E293B] transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-semibold text-[#111827] dark:text-[#F8FAFC] leading-snug">
                      0{idx + 1}. {branch.title}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-[#71717A] dark:text-[#94A3B8] shrink-0 mt-0.5" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-[#71717A] dark:text-[#94A3B8] shrink-0 mt-0.5" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 border-t border-[#F2EFE9] dark:border-[#1E293B] space-y-1">
                      {branch.summary && (
                        <p className="text-xs text-[#71717A] dark:text-[#94A3B8] leading-relaxed mb-2">
                          {branch.summary}
                        </p>
                      )}
                      {branch.subtopics.map((sub) => {
                        const isExplored = exploredSet.has(sub.toLowerCase());
                        return (
                          <button
                            key={sub}
                            type="button"
                            disabled={isBusy}
                            onClick={() => onQuickPrompt(`/explain ${sub}`)}
                            aria-label={`Explain ${sub}`}
                            className="w-full flex items-center gap-2 px-2 py-1.5 min-h-[36px] text-left text-xs text-[#27272A] dark:text-[#CBD5E1] hover:text-[#1E40AF] dark:hover:text-[#60A5FA] hover:bg-[#EFF6FF]/60 dark:hover:bg-[#1E293B] rounded-md transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {isExplored ? (
                              <CheckCircle2
                                className="w-3.5 h-3.5 text-[#047857] dark:text-[#34D399] shrink-0"
                                aria-hidden="true"
                              />
                            ) : (
                              <Circle
                                className="w-3.5 h-3.5 text-[#A1A1AA] dark:text-[#475569] shrink-0"
                                aria-hidden="true"
                              />
                            )}
                            <span className="truncate">{sub}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Key Terminology */}
        {session.knowledgeMap.keyTerms.length > 0 && (
          <div className="pt-2 border-t border-[#E5E2DC] dark:border-[#1E293B]">
            <h3 className="text-xs font-semibold text-[#52525B] dark:text-[#94A3B8] mb-2.5">
              Key Terminology
            </h3>
            <div className="space-y-2">
              {session.knowledgeMap.keyTerms.map((item) => (
                <button
                  key={item.term}
                  type="button"
                  disabled={isBusy}
                  onClick={() => onQuickPrompt(`/explain ${item.term}`)}
                  className="w-full text-left p-2.5 bg-white dark:bg-[#111827] border border-[#E5E2DC] dark:border-[#1E293B] hover:border-[#1E40AF]/40 dark:hover:border-[#3B82F6]/50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  <p className="text-xs font-semibold text-[#111827] dark:text-[#F8FAFC]">
                    {item.term}
                  </p>
                  <p className="text-xs text-[#52525B] dark:text-[#94A3B8] mt-0.5 line-clamp-2 leading-relaxed">
                    {item.definition}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
