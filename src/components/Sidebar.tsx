import { useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Compass,
  FileText,
  Globe,
  HelpCircle,
  MessageSquare,
  PanelLeftClose,
  Plus,
  Search,
  Settings,
  Terminal,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { AthenaeumLogo } from './AthenaeumLogo';
import { computeStudyProgress } from '../utils/knowledgeTree';
import type { TopicSession } from '../types';
import type { WorkspaceTab } from './Header';

interface SidebarProps {
  sessions: TopicSession[];
  activeSession: TopicSession | null;
  activeTab: WorkspaceTab;
  isCollapsed: boolean;
  isMobileOpen: boolean;
  isBusy: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
  onNewResearch: () => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onSelectTab: (tab: WorkspaceTab) => void;
  onQuickPrompt: (prompt: string) => void;
  onOpenSettings: () => void;
}

export function Sidebar({
  sessions,
  activeSession,
  activeTab,
  isCollapsed,
  isMobileOpen,
  isBusy,
  onToggleCollapse,
  onCloseMobile,
  onNewResearch,
  onSelectSession,
  onDeleteSession,
  onSelectTab,
  onQuickPrompt,
  onOpenSettings,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [libraryExpanded, setLibraryExpanded] = useState(true);

  const filteredSessions = sessions.filter((s) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      s.topic.toLowerCase().includes(q) ||
      s.knowledgeMap.domain.toLowerCase().includes(q)
    );
  });

  const totalSourcesCount = activeSession
    ? activeSession.allSources.length
    : sessions.reduce((acc, s) => acc + s.allSources.length, 0);

  const activeProgress = activeSession
    ? computeStudyProgress(activeSession.knowledgeMap, activeSession.exploredItems)
    : null;

  const renderSidebarBody = (mobile: boolean) => (
    <div className="flex flex-col h-full w-full bg-slate-50 dark:bg-[#0A0F1E] border-r border-slate-200 dark:border-slate-800/80 text-slate-900 dark:text-slate-100 select-none">
      {/* Brand Header */}
      <div className="px-3.5 h-14 flex items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800/70 shrink-0">
        <button
          type="button"
          onClick={() => {
            onNewResearch();
            if (mobile) onCloseMobile();
          }}
          className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
        >
          <AthenaeumLogo size="sm" />
          <span className="font-display text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors whitespace-nowrap">
            Athenaeum
          </span>
        </button>

        {mobile ? (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation drawer"
            className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/70 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/70 rounded-lg transition-colors cursor-pointer"
          >
            <PanelLeftClose className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* New Research & Search Conversations */}
      <div className="p-3 space-y-2.5 shrink-0">
        <button
          type="button"
          onClick={() => {
            onNewResearch();
            if (mobile) onCloseMobile();
          }}
          className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 min-h-[42px] text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-xs transition-all duration-150 active:scale-[0.98] cursor-pointer"
        >
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>New Research</span>
          </span>
        </button>

        <div className="relative">
          <Search
            className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations"
            aria-label="Search conversations"
            className="w-full pl-8.5 pr-3 py-2 min-h-[38px] text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-[#0F1629] border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-blue-500 dark:focus:border-blue-500/70 transition-colors"
          />
        </div>
      </div>

      {/* Scrollable Navigation & Conversations */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2.5 pb-3 space-y-5">
        {/* Core Workspace Destinations */}
        <nav aria-label="Research tools" className="space-y-0.5">
          <button
            type="button"
            onClick={() => {
              onSelectTab('knowledge');
              if (mobile) onCloseMobile();
            }}
            className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 min-h-[38px] text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              activeSession && activeTab === 'knowledge'
                ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <span className="inline-flex items-center gap-2.5 truncate">
              <Compass className="w-4 h-4 text-blue-500 shrink-0" aria-hidden="true" />
              <span className="truncate">Knowledge Maps</span>
            </span>
            {activeSession && (
              <span className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums shrink-0">
                {activeProgress?.percentage ?? 0}%
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectTab('sources');
              if (mobile) onCloseMobile();
            }}
            className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 min-h-[38px] text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              activeTab === 'sources'
                ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <span className="inline-flex items-center gap-2.5 truncate">
              <Globe className="w-4 h-4 text-violet-500 shrink-0" aria-hidden="true" />
              <span className="truncate">Saved Sources</span>
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums shrink-0">
              {totalSourcesCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectTab('report');
              if (mobile) onCloseMobile();
            }}
            className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 min-h-[38px] text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              activeSession && activeTab === 'report'
                ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <span className="inline-flex items-center gap-2.5 truncate">
              <FileText className="w-4 h-4 text-indigo-500 shrink-0" aria-hidden="true" />
              <span className="truncate">Reports</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectTab('questions');
              if (mobile) onCloseMobile();
            }}
            className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 min-h-[38px] text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              activeSession && activeTab === 'questions'
                ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <span className="inline-flex items-center gap-2.5 truncate">
              <HelpCircle className="w-4 h-4 text-emerald-500 shrink-0" aria-hidden="true" />
              <span className="truncate">Question Studio</span>
            </span>
          </button>
        </nav>

        {/* Research Library Section */}
        <section aria-label="Research Library" className="space-y-1">
          <button
            type="button"
            aria-expanded={libraryExpanded}
            onClick={() => setLibraryExpanded((prev) => !prev)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
          >
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Research Library</span>
            </span>
            {libraryExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </button>

          {libraryExpanded && (
            <div className="space-y-1 pl-1">
              {activeSession ? (
                <>
                  {activeSession.knowledgeMap.branches.slice(0, 5).map((branch) => (
                    <button
                      key={branch.id}
                      type="button"
                      disabled={isBusy}
                      onClick={() => {
                        onQuickPrompt(`/explain ${branch.title}`);
                        if (mobile) onCloseMobile();
                      }}
                      className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 min-h-[34px] text-left text-xs text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <span className="truncate">{branch.title}</span>
                      <ChevronRight className="w-3 h-3 shrink-0 opacity-60" aria-hidden="true" />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTab('commands');
                      if (mobile) onCloseMobile();
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 min-h-[34px] text-left text-xs rounded-lg transition-colors cursor-pointer ${
                      activeTab === 'commands'
                        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Terminal className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">Slash Commands</span>
                  </button>
                </>
              ) : (
                <p className="px-2.5 py-1.5 text-xs text-slate-500 dark:text-slate-500 leading-relaxed">
                  Start or resume a topic to browse mapped branches and study modules.
                </p>
              )}
            </div>
          )}
        </section>

        {/* Recent Conversations */}
        <section aria-label="Recent conversations" className="space-y-1.5">
          <div className="px-3 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Recent conversations</span>
            <span className="tabular-nums text-[11px]">{sessions.length}</span>
          </div>

          {sessions.length === 0 ? (
            <p className="px-3 py-2 text-xs text-slate-500 dark:text-slate-500 leading-relaxed">
              Your saved research sessions will appear here automatically.
            </p>
          ) : filteredSessions.length === 0 ? (
            <p className="px-3 py-2 text-xs text-slate-500 dark:text-slate-500">
              No matches for &ldquo;{searchQuery}&rdquo;.
            </p>
          ) : (
            <div className="space-y-0.5">
              {filteredSessions.map((session) => {
                const isSelected = activeSession?.id === session.id;
                return (
                  <div
                    key={session.id}
                    className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-white dark:bg-[#131D35] border border-slate-200 dark:border-slate-700/80 shadow-xs'
                        : 'hover:bg-slate-200/55 dark:hover:bg-slate-800/50 border border-transparent'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelectSession(session.id);
                        if (mobile) onCloseMobile();
                      }}
                      className="flex-1 min-w-0 flex items-center gap-2 py-1 text-left cursor-pointer"
                    >
                      <MessageSquare
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isSelected
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-100 truncate">
                          {session.topic}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate tabular-nums">
                          {session.messages.length} msgs · {session.allSources.length} refs
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteSession(session.id)}
                      aria-label={`Delete '${session.topic}' conversation`}
                      className="p-1.5 min-h-[32px] min-w-[32px] flex items-center justify-center text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400 opacity-70 group-hover:opacity-100 focus:opacity-100 rounded-md transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Bottom Settings & Researcher Profile Section */}
      <div className="p-2.5 border-t border-slate-200/80 dark:border-slate-800/70 space-y-1 shrink-0 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => {
            onOpenSettings();
            if (mobile) onCloseMobile();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 min-h-[40px] text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer"
        >
          <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
          <span>Settings</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onOpenSettings();
            if (mobile) onCloseMobile();
          }}
          aria-label="Workspace profile and preferences"
          className="w-full flex items-center gap-2.5 px-3 py-2 min-h-[44px] rounded-xl bg-white/80 dark:bg-[#0F1629] border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer text-left"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white shrink-0">
            <User className="w-3.5 h-3.5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
              Research Workspace
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate tabular-nums">
              By Shubham Verma · {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
            </p>
          </div>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Collapsible Sidebar */}
      {!isCollapsed && (
        <aside className="hidden md:flex w-[272px] lg:w-[288px] shrink-0 h-full min-h-0 overflow-hidden transition-all duration-200">
          {renderSidebarBody(false)}
        </aside>
      )}

      {/* Mobile Navigation Drawer */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden flex bg-black/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label="Athenaeum navigation"
        >
          <div className="w-[84vw] max-w-[320px] h-full shadow-2xl">
            {renderSidebarBody(true)}
          </div>
          <button
            type="button"
            aria-label="Close navigation drawer"
            onClick={onCloseMobile}
            className="flex-1 cursor-pointer"
          />
        </div>
      )}
    </>
  );
}
