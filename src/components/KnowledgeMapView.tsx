import { CheckCircle2, Circle } from 'lucide-react';
import { computeStudyProgress } from '../utils/knowledgeTree';
import type { TopicSession } from '../types';

interface KnowledgeMapViewProps {
  session: TopicSession;
  isBusy: boolean;
  onSelectSubtopic: (subtopic: string) => void;
}

export function KnowledgeMapView({
  session,
  isBusy,
  onSelectSubtopic,
}: KnowledgeMapViewProps) {
  const { knowledgeMap } = session;
  const progress = computeStudyProgress(knowledgeMap, session.exploredItems);
  const exploredSet = new Set(session.exploredItems.map((i) => i.toLowerCase()));

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 py-6 sm:py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="pb-5 border-b border-[#E5E2DC] dark:border-[#1E293B] flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs text-[#71717A] dark:text-[#94A3B8] mb-1">
              {knowledgeMap.domain}
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#111827] dark:text-[#F8FAFC]">
              Knowledge Map: {session.topic}
            </h1>
          </div>
          <div className="text-sm text-[#52525B] dark:text-[#94A3B8] tabular-nums">
            {progress.exploredCount} of {progress.totalCount} subtopics explored ({progress.percentage}%)
          </div>
        </div>

        {/* Branches Grid */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-[#52525B] dark:text-[#94A3B8]">
            Major Branches &amp; Subtopics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {knowledgeMap.branches.map((branch, idx) => (
              <div
                key={branch.id}
                className="bg-white dark:bg-[#111827] border border-[#E5E2DC] dark:border-[#1E293B] rounded-xl p-5 space-y-3"
              >
                <div>
                  <h3 className="font-display text-lg font-semibold text-[#111827] dark:text-[#F8FAFC]">
                    0{idx + 1}. {branch.title}
                  </h3>
                  {branch.summary && (
                    <p className="text-sm text-[#52525B] dark:text-[#94A3B8] mt-1 leading-relaxed">
                      {branch.summary}
                    </p>
                  )}
                </div>
                <div className="pt-2 border-t border-[#EFECE6] dark:border-[#1E293B] space-y-1.5">
                  {branch.subtopics.map((sub) => {
                    const explored = exploredSet.has(sub.toLowerCase());
                    return (
                      <button
                        key={sub}
                        type="button"
                        disabled={isBusy}
                        onClick={() => onSelectSubtopic(sub)}
                        className="w-full flex items-center justify-between gap-2 px-2.5 py-2 min-h-[40px] text-left text-sm text-[#27272A] dark:text-[#CBD5E1] hover:text-[#1E40AF] dark:hover:text-[#60A5FA] hover:bg-[#EFF6FF]/60 dark:hover:bg-[#1E293B] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          {explored ? (
                            <CheckCircle2
                              className="w-4 h-4 text-[#047857] dark:text-[#34D399] shrink-0"
                              aria-hidden="true"
                            />
                          ) : (
                            <Circle
                              className="w-4 h-4 text-[#A1A1AA] dark:text-[#475569] shrink-0"
                              aria-hidden="true"
                            />
                          )}
                          <span className="truncate">{sub}</span>
                        </span>
                        <span className="text-xs text-[#71717A] dark:text-[#94A3B8] shrink-0">
                          Explain
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Core Theories & Applications */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#E5E2DC] dark:border-[#1E293B]">
          {knowledgeMap.coreTheories.length > 0 && (
            <section className="space-y-2.5">
              <h2 className="text-sm font-semibold text-[#52525B] dark:text-[#94A3B8]">
                Core Theories &amp; Frameworks
              </h2>
              <ul className="space-y-1.5 text-sm text-[#27272A] dark:text-[#CBD5E1]">
                {knowledgeMap.coreTheories.map((theory) => (
                  <li key={theory} className="flex items-start gap-2">
                    <span className="text-[#A1A1AA] dark:text-[#64748B]" aria-hidden="true">
                      –
                    </span>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => onSelectSubtopic(theory)}
                      className="text-left hover:text-[#1E40AF] dark:hover:text-[#60A5FA] hover:underline cursor-pointer"
                    >
                      {theory}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {knowledgeMap.applications.length > 0 && (
            <section className="space-y-2.5">
              <h2 className="text-sm font-semibold text-[#52525B] dark:text-[#94A3B8]">
                Practical Applications
              </h2>
              <ul className="space-y-1.5 text-sm text-[#27272A] dark:text-[#CBD5E1]">
                {knowledgeMap.applications.map((app) => (
                  <li key={app} className="flex items-start gap-2">
                    <span className="text-[#A1A1AA] dark:text-[#64748B]" aria-hidden="true">
                      –
                    </span>
                    <span>{app}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Terminology Glossary */}
        {knowledgeMap.keyTerms.length > 0 && (
          <section className="space-y-4 pt-4 border-t border-[#E5E2DC] dark:border-[#1E293B]">
            <h2 className="text-sm font-semibold text-[#52525B] dark:text-[#94A3B8]">
              Key Terminology
            </h2>
            <div className="bg-white dark:bg-[#111827] border border-[#E5E2DC] dark:border-[#1E293B] rounded-xl divide-y divide-[#EFECE6] dark:divide-[#1E293B]">
              {knowledgeMap.keyTerms.map((item) => (
                <div
                  key={item.term}
                  className="p-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2"
                >
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-[#111827] dark:text-[#F8FAFC]">
                      {item.term}
                    </h3>
                    <p className="text-sm text-[#52525B] dark:text-[#94A3B8]">
                      {item.definition}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onSelectSubtopic(item.term)}
                    className="text-xs font-medium text-[#1E40AF] dark:text-[#60A5FA] hover:underline whitespace-nowrap shrink-0 self-start sm:self-center cursor-pointer"
                  >
                    Deep Dive
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
