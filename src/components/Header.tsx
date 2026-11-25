import { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  FileDown,
  Globe,
  Menu,
  PanelLeftOpen,
  Settings,
} from 'lucide-react';
import { getResearchModeById, RESEARCH_MODES } from '../utils/researchModes';
import type { ResearchModeId, TopicSession } from '../types';

export type WorkspaceTab =
  | 'conversation'
  | 'knowledge'
  | 'questions'
  | 'sources'
  | 'report'
  | 'commands';

interface HeaderProps {
  activeSession: TopicSession | null;
  activeTab: WorkspaceTab;
  selectedModeId: ResearchModeId;
  searchGrounding: boolean;
  isSidebarCollapsed: boolean;
  isStreaming: boolean;
  isInitializing: boolean;
  onExpandSidebar: () => void;
  onOpenMobileMenu: () => void;
  onSelectMode: (modeId: ResearchModeId) => void;
  onSelectTab: (tab: WorkspaceTab) => void;
  onExportPdf: () => void;
  onOpenSettings: () => void;
}

export function Header({
  activeSession,
  activeTab,
  selectedModeId,
  searchGrounding,
  isSidebarCollapsed,
  isStreaming,
  isInitializing,
  onExpandSidebar,
  onOpenMobileMenu,
  onSelectMode,
  onSelectTab,
  onExportPdf,
  onOpenSettings,
}: HeaderProps) {
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const activeMode = getResearchModeById(selectedModeId);

  useEffect(() => {
    if (!modeMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setModeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [modeMenuOpen]);

  const statusLabel = isInitializing
    ? 'Mapping topic...'
    : isStreaming
      ? 'Generating...'
      : searchGrounding
        ? 'Search Grounded'
        : 'Internal Knowledge';

  return (
    <header className="sticky top-0 z-30 h-14 bg-white/85 dark:bg-[#060913]/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-3 sm:px-6 flex items-center justify-between gap-3 shrink-0">
      {/* Left: Drawer/Sidebar toggle + Mode Selector */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation drawer"
          className="md:hidden p-2 min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
        </button>

        {isSidebarCollapsed && (
          <button
            type="button"
            onClick={onExpandSidebar}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="hidden md:flex p-2 min-h-[38px] min-w-[38px] items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <PanelLeftOpen className="w-4 h-4" aria-hidden="true" />
          </button>
        )}

        {/* Research Mode Selector Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setModeMenuOpen((prev) => !prev)}
            aria-expanded={modeMenuOpen}
            aria-haspopup="menu"
            aria-label={`Research mode: ${activeMode.label}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-sm font-medium text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-[#0F1629] border border-transparent hover:border-slate-200 dark:hover:border-slate-800 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span className="font-semibold">{activeMode.label}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          </button>

          {modeMenuOpen && (
            <div
              role="menu"
              aria-label="Select research mode"
              className="absolute left-0 top-full mt-1.5 w-76 sm:w-84 bg-white dark:bg-[#0F1629] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 z-50"
            >
              {RESEARCH_MODES.map((mode) => {
                const isSelected = mode.id === selectedModeId;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={isSelected}
                    onClick={() => {
                      onSelectMode(mode.id);
                      setModeMenuOpen(false);
                    }}
                    className={`w-full flex items-start justify-between gap-3 px-3 py-2.5 text-left rounded-xl transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/50 text-slate-900 dark:text-slate-50'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold">{mode.label}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        {mode.description}
                      </p>
                    </div>
                    {isSelected && (
                      <Check
                        className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {activeSession && (
          <div className="hidden lg:flex items-center gap-2 min-w-0 pl-2 border-l border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[260px]">
              {activeSession.topic}
            </span>
          </div>
        )}
      </div>

      {/* Right: Clean Research Status + Contextual Action */}
      <div className="flex items-center gap-2.5 shrink-0">
        {activeSession && activeTab !== 'conversation' && (
          <button
            type="button"
            onClick={() => onSelectTab('conversation')}
            className="px-3 py-1.5 min-h-[34px] text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Back to Chat
          </button>
        )}

        <div
          className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap"
          aria-live="polite"
        >
          <Globe
            className={`w-3.5 h-3.5 ${
              searchGrounding
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-slate-400 dark:text-slate-500'
            }`}
            aria-hidden="true"
          />
          <span>{statusLabel}</span>
        </div>

        {activeSession ? (
          <button
            type="button"
            onClick={onExportPdf}
            aria-label="Export PDF report"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#0F1629] hover:bg-slate-200/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <span>Export PDF</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Open Settings"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#0F1629] hover:bg-slate-200/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Preferences</span>
          </button>
        )}
      </div>
    </header>
  );
}
