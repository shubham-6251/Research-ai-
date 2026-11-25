import { useState, type FormEvent } from 'react';
import {
  ArrowRight,
  BookOpen,
  FileText,
  Globe,
  HelpCircle,
  Loader2,
  Moon,
  Search,
  Sun,
  Trash2,
} from 'lucide-react';
import { SPECIAL_COMMANDS } from '../utils/commands';
import type { KnowledgeLevel, ResearchMode, TopicSession } from '../types';

interface TopicInitScreenProps {
  isInitializing: boolean;
  error: string | null;
  recentSessions: TopicSession[];
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onInitializeTopic: (
    topic: string,
    level: KnowledgeLevel,
    searchGrounding: boolean,
    mode?: ResearchMode
  ) => Promise<void>;
  onResumeSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
}

const SAMPLE_TOPICS = [
  {
    title: 'Distributed Consensus (Raft & Paxos)',
    domain: 'Distributed Systems',
  },
  {
    title: 'CRISPR-Cas9 Gene Editing',
    domain: 'Molecular Biology',
  },
  {
    title: 'Macroeconomic Monetary Policy',
    domain: 'Economics',
  },
  {
    title: 'Quantum Error Correction',
    domain: 'Quantum Computing',
  },
  {
    title: 'Renaissance Perspective Geometry',
    domain: 'Art & Mathematics',
  },
  {
    title: 'Rust Async Runtime Internals',
    domain: 'Systems Programming',
  },
];

const LEVELS: { id: KnowledgeLevel; label: string }[] = [
  { id: 'adaptive', label: 'Adaptive' },
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
];

const START_MODES: { id: ResearchMode; label: string }[] = [
  { id: 'research', label: 'Research' },
  { id: 'qa', label: 'Q&A' },
  { id: 'learn', label: 'Learn' },
  { id: 'summarize', label: 'Summary' },
];

export function TopicInitScreen({
  isInitializing,
  error,
  recentSessions,
  theme,
  onToggleTheme,
  onInitializeTopic,
  onResumeSession,
  onDeleteSession,
}: TopicInitScreenProps) {
  const [topicInput, setTopicInput] = useState('');
  const [level, setLevel] = useState<KnowledgeLevel>('adaptive');
  const [mode, setMode] = useState<ResearchMode>('research');
  const [searchGrounding, setSearchGrounding] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [historyQuery, setHistoryQuery] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleaned = topicInput.trim();
    if (!cleaned) {
      setValidationError('Please enter a topic, subject, or field to initialize.');
      return;
    }
    setValidationError(null);
    await onInitializeTopic(cleaned, level, searchGrounding, mode);
  };

  const handleSampleClick = async (topicTitle: string) => {
    if (isInitializing) return;
    setTopicInput(topicTitle);
    setValidationError(null);
    await onInitializeTopic(topicTitle, level, searchGrounding, mode);
  };

  const filteredSessions = recentSessions.filter((s) => {
    const q = historyQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      s.topic.toLowerCase().includes(q) ||
      s.knowledgeMap.domain.toLowerCase().includes(q)
    );
  });

  return (
    <main className="max-w-[1160px] mx-auto px-4 sm:px-8 py-10 sm:py-16 space-y-14 sm:space-y-16">
      {/* Hero Initialization Section */}
      <section className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-3">
          <p className="text-sm font-medium text-[#52525B] dark:text-[#94A3B8]">
            Universal AI Research, Learning &amp; Analysis Workstation
          </p>
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-medium text-[#27272A] dark:text-[#E2E8F0] bg-white dark:bg-[#111827] hover:bg-[#F4F2EC] dark:hover:bg-[#1E293B] border border-[#E5E2DC] dark:border-[#1E293B] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-[#FBBF24]" aria-hidden="true" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-[#3F3F46]" aria-hidden="true" />
                <span>Dark</span>
              </>
            )}
          </button>
        </div>

        <h1 className="font-display text-3xl sm:text-5xl font-semibold tracking-tight text-[#111827] dark:text-[#F8FAFC] leading-[1.15] text-balance mb-5">
          Welcome! What topic would you like me to research and master today?
        </h1>
        <p className="text-base sm:text-lg text-[#52525B] dark:text-[#94A3B8] leading-relaxed mb-8 max-w-2xl">
          Enter any subject, academic chapter, scientific field, or engineering domain. I will map
          its branches, verify citations, generate study questions, and export structured PDF
          reports.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="bg-white dark:bg-[#111827] border border-[#E5E2DC] dark:border-[#1E293B] rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
            <div>
              <label
                htmlFor="topic-input"
                className="block text-sm font-medium text-[#27272A] dark:text-[#E2E8F0] mb-2"
              >
                Research Topic or Subject Area
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search
                    className="w-4 h-4 text-[#71717A] dark:text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="topic-input"
                    type="text"
                    value={topicInput}
                    onChange={(e) => {
                      setTopicInput(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder="e.g., Thermodynamics, Byzantine Fault Tolerance, Constitutional Law..."
                    disabled={isInitializing}
                    className="w-full pl-10 pr-4 py-3 min-h-[46px] text-base text-[#111827] dark:text-[#F8FAFC] placeholder:text-[#A1A1AA] dark:placeholder:text-[#64748B] bg-[#FAF9F6] dark:bg-[#0B1120] border border-[#D4D4D8] dark:border-[#334155] rounded-lg focus:outline-none focus:border-[#1E40AF] focus:ring-2 focus:ring-[#1E40AF]/15 disabled:opacity-60"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isInitializing}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[46px] text-sm font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#2563EB] dark:hover:bg-[#1D4ED8] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E40AF]"
                >
                  {isInitializing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      <span>Building Knowledge Map...</span>
                    </>
                  ) : (
                    <>
                      <span>Initialize Research</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </>
                  )}
                </button>
              </div>
              {validationError && (
                <p role="alert" className="mt-2 text-sm text-[#B91C1C] dark:text-[#FCA5A5] font-medium">
                  {validationError}
                </p>
              )}
              {error && (
                <div
                  role="alert"
                  className="mt-3 p-3 rounded-lg bg-[#FEF2F2] dark:bg-[#450A0A]/50 border border-[#FECACA] dark:border-[#991B1B] text-sm text-[#991B1B] dark:text-[#FCA5A5]"
                >
                  {error}
                </div>
              )}
            </div>

            {/* Configuration Row */}
            <div className="pt-3 border-t border-[#EFECE6] dark:border-[#1E293B] flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-[#52525B] dark:text-[#94A3B8]">
                    Mode:
                  </span>
                  <div
                    role="group"
                    aria-label="Starting mode"
                    className="inline-flex items-center p-1 bg-[#F2F0EB] dark:bg-[#0B1120] rounded-lg"
                  >
                    {START_MODES.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMode(m.id)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          mode === m.id
                            ? 'bg-white dark:bg-[#1E293B] text-[#1E40AF] dark:text-[#60A5FA] shadow-xs'
                            : 'text-[#52525B] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F8FAFC]'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-[#52525B] dark:text-[#94A3B8]">
                    Depth:
                  </span>
                  <div
                    role="group"
                    aria-label="Knowledge depth level"
                    className="inline-flex items-center p-1 bg-[#F2F0EB] dark:bg-[#0B1120] rounded-lg"
                  >
                    {LEVELS.map((lvl) => (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => setLevel(lvl.id)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          level === lvl.id
                            ? 'bg-white dark:bg-[#1E293B] text-[#111827] dark:text-[#F8FAFC] shadow-xs'
                            : 'text-[#52525B] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F8FAFC]'
                        }`}
                      >
                        {lvl.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSearchGrounding((prev) => !prev)}
                aria-pressed={searchGrounding}
                className={`inline-flex items-center gap-2 px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  searchGrounding
                    ? 'bg-[#EFF6FF] dark:bg-[#1E293B] border-[#BFDBFE] dark:border-[#3B82F6]/50 text-[#1E40AF] dark:text-[#60A5FA]'
                    : 'bg-[#FAF9F6] dark:bg-[#0B1120] border-[#E5E2DC] dark:border-[#1E293B] text-[#52525B] dark:text-[#94A3B8]'
                }`}
              >
                <Globe className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Web Search Grounding: {searchGrounding ? 'On' : 'Off'}</span>
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Sample Topics Grid */}
      <section id="examples" className="border-t border-[#E5E2DC] dark:border-[#1E293B] pt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-4 mb-6">
          <h2 className="font-display text-2xl font-semibold text-[#111827] dark:text-[#F8FAFC]">
            Explore Across Any Discipline
          </h2>
          <span className="text-sm text-[#71717A] dark:text-[#94A3B8]">
            Click any topic to launch immediately
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SAMPLE_TOPICS.map((sample) => (
            <button
              key={sample.title}
              type="button"
              disabled={isInitializing}
              onClick={() => handleSampleClick(sample.title)}
              className="text-left p-5 bg-white dark:bg-[#111827] border border-[#E5E2DC] dark:border-[#1E293B] hover:border-[#1E40AF]/50 dark:hover:border-[#3B82F6]/60 rounded-xl transition-colors group cursor-pointer disabled:opacity-60"
            >
              <p className="text-xs text-[#71717A] dark:text-[#94A3B8] mb-1.5">
                {sample.domain}
              </p>
              <p className="text-base font-semibold text-[#111827] dark:text-[#F8FAFC] group-hover:text-[#1E40AF] dark:group-hover:text-[#60A5FA] transition-colors">
                {sample.title}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Recent Topic Sessions */}
      <section id="recent-sessions" className="border-t border-[#E5E2DC] dark:border-[#1E293B] pt-12">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="font-display text-2xl font-semibold text-[#111827] dark:text-[#F8FAFC]">
            Recent Research Sessions ({recentSessions.length})
          </h2>
          {recentSessions.length > 0 && (
            <div className="relative w-full sm:w-72">
              <Search
                className="w-4 h-4 text-[#71717A] dark:text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                value={historyQuery}
                onChange={(e) => setHistoryQuery(e.target.value)}
                placeholder="Search saved sessions..."
                aria-label="Search saved research sessions"
                className="w-full pl-9 pr-3 py-2 min-h-[38px] text-sm text-[#111827] dark:text-[#F8FAFC] placeholder:text-[#A1A1AA] dark:placeholder:text-[#64748B] bg-white dark:bg-[#111827] border border-[#E5E2DC] dark:border-[#1E293B] rounded-lg focus:outline-none focus:border-[#1E40AF]"
              />
            </div>
          )}
        </div>

        {recentSessions.length === 0 ? (
          <p className="text-sm text-[#71717A] dark:text-[#94A3B8] bg-white dark:bg-[#111827] border border-[#E5E2DC] dark:border-[#1E293B] rounded-xl p-5">
            No saved topic sessions yet. Initialize a topic above to begin—your sessions will be
            saved here automatically so you can switch and resume anytime.
          </p>
        ) : filteredSessions.length === 0 ? (
          <p className="text-sm text-[#71717A] dark:text-[#94A3B8] bg-white dark:bg-[#111827] border border-[#E5E2DC] dark:border-[#1E293B] rounded-xl p-5">
            No saved sessions match &ldquo;{historyQuery}&rdquo;.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between gap-4 p-4 bg-white dark:bg-[#111827] border border-[#E5E2DC] dark:border-[#1E293B] rounded-xl"
              >
                <button
                  type="button"
                  onClick={() => onResumeSession(session.id)}
                  className="flex-1 min-w-0 text-left cursor-pointer group"
                >
                  <p className="text-base font-semibold text-[#111827] dark:text-[#F8FAFC] group-hover:text-[#1E40AF] dark:group-hover:text-[#60A5FA] transition-colors truncate">
                    {session.topic}
                  </p>
                  <p className="text-xs text-[#71717A] dark:text-[#94A3B8] mt-1 tabular-nums truncate">
                    {session.knowledgeMap.domain} · {session.messages.length} messages ·{' '}
                    {session.allSources.length} sources
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteSession(session.id)}
                  aria-label={`Delete '${session.topic}' session`}
                  className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center text-[#71717A] dark:text-[#94A3B8] hover:text-[#B91C1C] dark:hover:text-[#F87171] hover:bg-[#FEF2F2] dark:hover:bg-[#450A0A]/40 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Core Agent Capabilities */}
      <section id="capabilities" className="border-t border-[#E5E2DC] dark:border-[#1E293B] pt-12">
        <h2 className="font-display text-2xl font-semibold text-[#111827] dark:text-[#F8FAFC] mb-6">
          Research &amp; Learning Suite
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-[#111827] dark:text-[#F8FAFC] flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#1E40AF] dark:text-[#60A5FA]" aria-hidden="true" />
              <span>01. Verified Research</span>
            </h3>
            <p className="text-sm text-[#52525B] dark:text-[#94A3B8] leading-relaxed">
              Cross-checks authoritative documentation, academic papers, and live search grounding
              with clickable source verification.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-[#111827] dark:text-[#F8FAFC] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#1E40AF] dark:text-[#60A5FA]" aria-hidden="true" />
              <span>02. Adaptive Learning</span>
            </h3>
            <p className="text-sm text-[#52525B] dark:text-[#94A3B8] leading-relaxed">
              Progresses smoothly from beginner intuition to formal equations, worked examples, and
              session-wide follow-up memory.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-[#111827] dark:text-[#F8FAFC] flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#1E40AF] dark:text-[#60A5FA]" aria-hidden="true" />
              <span>03. Question Studio</span>
            </h3>
            <p className="text-sm text-[#52525B] dark:text-[#94A3B8] leading-relaxed">
              Generates scored MCQs, short-answer drills, and long-answer prompts with model
              solutions and rubric evaluation.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-[#111827] dark:text-[#F8FAFC] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#1E40AF] dark:text-[#60A5FA]" aria-hidden="true" />
              <span>04. PDF Dossier Export</span>
            </h3>
            <p className="text-sm text-[#52525B] dark:text-[#94A3B8] leading-relaxed">
              Summarizes lengthy findings into clean executive sections and exports formatted PDF
              and Markdown research reports.
            </p>
          </div>
        </div>
      </section>

      {/* Special Slash Commands Reference */}
      <section id="commands" className="border-t border-[#E5E2DC] dark:border-[#1E293B] pt-12">
        <h2 className="font-display text-2xl font-semibold text-[#111827] dark:text-[#F8FAFC] mb-6">
          Special Commands Directory
        </h2>
        <div className="bg-white dark:bg-[#111827] border border-[#E5E2DC] dark:border-[#1E293B] rounded-xl overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-[#F4F2EC] dark:bg-[#0B1120] border-b border-[#E5E2DC] dark:border-[#1E293B]">
              <tr>
                <th className="py-3 px-4 font-semibold text-[#111827] dark:text-[#F8FAFC]">
                  Command
                </th>
                <th className="py-3 px-4 font-semibold text-[#111827] dark:text-[#F8FAFC]">
                  Behavior
                </th>
                <th className="py-3 px-4 font-semibold text-[#111827] dark:text-[#F8FAFC] hidden sm:table-cell">
                  Syntax
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFECE6] dark:divide-[#1E293B]">
              {SPECIAL_COMMANDS.map((cmd) => (
                <tr
                  key={cmd.command}
                  className="hover:bg-[#FAF9F6] dark:hover:bg-[#1E293B]/60"
                >
                  <td className="py-2.5 px-4 font-mono text-xs font-medium text-[#1E40AF] dark:text-[#60A5FA] whitespace-nowrap">
                    {cmd.command}
                  </td>
                  <td className="py-2.5 px-4 text-[#3F3F46] dark:text-[#CBD5E1]">
                    {cmd.shortDesc}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-xs text-[#71717A] dark:text-[#94A3B8] hidden sm:table-cell">
                    {cmd.placeholder}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
