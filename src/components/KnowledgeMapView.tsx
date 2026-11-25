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
        <div className="pb-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
              {knowledgeMap.domain}
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-50 tracking-tight">
              Knowledge Map: {session.topic}
            </h1>
          </div>
          <div className="text-sm font-medium text-slate-600 dark:text-slate-400 tabular-nums">
            {progress.exploredCount} of {progress.totalCount} subtopics explored ({progress.percentage}%)
          </div>
        </div>

        {/* Branches Grid */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            Major Branches &amp; Subtopics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {knowledgeMap.branches.map((branch, idx) => (
              <div
                key={branch.id}
                className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 shadow-xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500/40 transition-all"
              >
                <div>
                  <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-50">
                    <span className="font-mono text-xs text-blue-600 dark:text-blue-400 mr-2 tabular-nums">
                      0{idx + 1}
                    </span>
                    {branch.title}
                  </h3>
                  {branch.summary && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                      {branch.summary}
                    </p>
                  )}
                </div>
                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                  {branch.subtopics.map((sub) => {
                    const explored = exploredSet.has(sub.toLowerCase());
                    return (
                      <button
                        key={sub}
                        type="button"
                        disabled={isBusy}
                        onClick={() => onSelectSubtopic(sub)}
                        className="w-full flex items-center justify-between gap-2 px-2.5 py-2 min-h-[40px] text-left text-sm text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/70 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          {explored ? (
                            <CheckCircle2
                              className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0"
                              aria-hidden="true"
                            />
                          ) : (
                            <Circle
                              className="w-4 h-4 text-slate-400 dark:text-slate-600 shrink-0"
                              aria-hidden="true"
                            />
                          )}
                          <span className="truncate">{sub}</span>
                        </span>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200 dark:border-slate-800">
          {knowledgeMap.coreTheories.length > 0 && (
            <section className="space-y-2.5">
              <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                Core Theories &amp; Frameworks
              </h2>
              <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
                {knowledgeMap.coreTheories.map((theory) => (
                  <li key={theory} className="flex items-start gap-2">
                    <span className="text-slate-400 dark:text-slate-600" aria-hidden="true">
                      –
                    </span>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => onSelectSubtopic(theory)}
                      className="text-left hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer"
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
              <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                Practical Applications
              </h2>
              <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
                {knowledgeMap.applications.map((app) => (
                  <li key={app} className="flex items-start gap-2">
                    <span className="text-slate-400 dark:text-slate-600" aria-hidden="true">
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
          <section className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-400">
              Key Terminology
            </h2>
            <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800 shadow-xs">
              {knowledgeMap.keyTerms.map((item) => (
                <div
                  key={item.term}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2"
                >
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                      {item.term}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {item.definition}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onSelectSubtopic(item.term)}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0 self-start sm:self-center cursor-pointer"
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
