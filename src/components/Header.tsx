export type WorkspaceTab =
  | 'conversation'
  | 'knowledge'
  | 'questions'
  | 'sources'
  | 'report'
  | 'commands';

interface HeaderProps {
  inWorkspace: boolean;
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  onNewTopic: () => void;
  onJumpToSection: (sectionId: string) => void;
}

export function Header({
  inWorkspace,
  activeTab,
  onSelectTab,
  onNewTopic,
  onJumpToSection,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-[#FAF9F6]/95 dark:bg-[#0B1120]/95 backdrop-blur-sm border-b border-[#E5E2DC] dark:border-[#1E293B]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 h-14 sm:h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element Brand wordmark */}
        <button
          type="button"
          onClick={onNewTopic}
          className="font-display text-xl font-semibold tracking-tight text-[#111827] dark:text-[#F8FAFC] hover:text-[#1E40AF] dark:hover:text-[#60A5FA] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Athenaeum
        </button>

        {/* Zone 2: 5 concise single-line text nav links */}
        {inWorkspace ? (
          <nav
            aria-label="Workspace views"
            className="hidden md:flex items-center gap-6 text-sm font-medium"
          >
            {(
              [
                { id: 'conversation', label: 'Research Chat' },
                { id: 'knowledge', label: 'Knowledge Map' },
                { id: 'questions', label: 'Questions' },
                { id: 'sources', label: 'Sources' },
                { id: 'report', label: 'Report' },
              ] as const
            ).map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'border-[#1E40AF] dark:border-[#3B82F6] text-[#111827] dark:text-[#F8FAFC]'
                      : 'border-transparent text-[#52525B] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F8FAFC] hover:border-[#D4D4D8] dark:hover:border-[#334155]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        ) : (
          <nav
            aria-label="Overview sections"
            className="hidden md:flex items-center gap-6 text-sm font-medium"
          >
            <button
              type="button"
              onClick={() => onJumpToSection('capabilities')}
              className="py-1 text-[#52525B] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F8FAFC] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Capabilities
            </button>
            <button
              type="button"
              onClick={() => onJumpToSection('commands')}
              className="py-1 text-[#52525B] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F8FAFC] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Commands
            </button>
            <button
              type="button"
              onClick={() => onJumpToSection('examples')}
              className="py-1 text-[#52525B] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F8FAFC] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Topics
            </button>
            <button
              type="button"
              onClick={() => onJumpToSection('recent-sessions')}
              className="py-1 text-[#52525B] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F8FAFC] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              History
            </button>
          </nav>
        )}

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={inWorkspace ? onNewTopic : () => onJumpToSection('topic-input')}
            className="px-4 py-2 text-sm font-medium text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#2563EB] dark:hover:bg-[#1D4ED8] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E40AF]"
          >
            {inWorkspace ? 'New Topic' : 'Start Session'}
          </button>
        </div>
      </div>
    </header>
  );
}
