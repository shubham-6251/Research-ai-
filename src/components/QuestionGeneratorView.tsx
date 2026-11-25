import { useState } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  HelpCircle,
  Loader2,
  MessageSquarePlus,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { scoreMcqResponses } from '../utils/questions';
import type { KnowledgeLevel, QuestionBank, TopicSession } from '../types';

interface QuestionGeneratorViewProps {
  session: TopicSession;
  isGenerating: boolean;
  error: string | null;
  onGenerate: (focus: string, difficulty: KnowledgeLevel) => Promise<void>;
  onAskFollowUp: (prompt: string) => void;
}

const DIFFICULTIES: { id: KnowledgeLevel; label: string }[] = [
  { id: 'adaptive', label: 'Mixed / Adaptive' },
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
];

export function QuestionGeneratorView({
  session,
  isGenerating,
  error,
  onGenerate,
  onAskFollowUp,
}: QuestionGeneratorViewProps) {
  const focusOptions = [
    session.topic,
    ...session.knowledgeMap.branches.map((b) => b.title),
  ];

  const [focus, setFocus] = useState<string>(session.questionBank?.focus || session.topic);
  const [difficulty, setDifficulty] = useState<KnowledgeLevel>(
    session.questionBank?.difficulty || session.level
  );
  const [selectedMcqs, setSelectedMcqs] = useState<Record<string, number>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const [userShortNotes, setUserShortNotes] = useState<Record<string, string>>({});
  const [userLongNotes, setUserLongNotes] = useState<Record<string, string>>({});

  const bank: QuestionBank | undefined = session.questionBank;
  const mcqScore = bank ? scoreMcqResponses(bank.mcqs, selectedMcqs) : null;

  const toggleReveal = (id: string) => {
    setRevealedAnswers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleGenerateClick = async () => {
    setSelectedMcqs({});
    setRevealedAnswers({});
    await onGenerate(focus, difficulty);
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 py-6 sm:py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header & Generator Controls */}
        <section className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                Assessment Studio · {session.knowledgeMap.domain}
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-50 tracking-tight">
                Question Generator
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Generate grounded MCQs, short-answer drills, and analytical long-answer prompts for{' '}
                {session.topic}.
              </p>
            </div>
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleGenerateClick}
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 self-start shadow-xs"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Generating Set...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" aria-hidden="true" />
                  <span>{bank ? 'Regenerate Questions' : 'Generate Questions'}</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Focus Area
              </span>
              <select
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                disabled={isGenerating}
                className="w-full min-h-[42px] px-3 py-2 text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-600 dark:focus:border-blue-500"
              >
                {focusOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === session.topic ? `Full Topic: ${opt}` : `Branch: ${opt}`}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Difficulty Level
              </span>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as KnowledgeLevel)}
                disabled={isGenerating}
                className="w-full min-h-[42px] px-3 py-2 text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-600 dark:focus:border-blue-500"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-sm text-red-800 dark:text-red-300 flex flex-wrap items-center justify-between gap-3"
            >
              <span>{error}</span>
              <button
                type="button"
                onClick={handleGenerateClick}
                disabled={isGenerating}
                className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-red-300 dark:border-red-700 rounded-lg cursor-pointer whitespace-nowrap"
              >
                Retry
              </button>
            </div>
          )}
        </section>

        {!bank && !isGenerating && (
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-3 shadow-xs">
            <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200/70 dark:border-blue-500/30 flex items-center justify-center mx-auto">
              <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            </div>
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-50">
              No practice questions generated yet
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              Choose a focus area and difficulty above, then click <strong>Generate Questions</strong>{' '}
              to create MCQs, short-answer prompts, and long-answer research questions.
            </p>
          </div>
        )}

        {bank && (
          <div className="space-y-10">
            {/* 1. Multiple-Choice Questions */}
            {bank.mcqs.length > 0 && (
              <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-slate-200 dark:border-slate-800">
                  <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-50">
                    01. Multiple-Choice Questions ({bank.mcqs.length})
                  </h2>
                  {mcqScore && (
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 tabular-nums">
                      Score: {mcqScore.correct}/{mcqScore.total} correct ({mcqScore.answered} answered ·{' '}
                      {mcqScore.percentage}%)
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  {bank.mcqs.map((q, idx) => {
                    const selectedIdx = selectedMcqs[q.id];
                    const hasAnswered = typeof selectedIdx === 'number';
                    const isCorrect = selectedIdx === q.correctIndex;

                    return (
                      <article
                        key={q.id}
                        className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs"
                      >
                        <p className="text-sm sm:text-base font-medium text-slate-900 dark:text-slate-50 leading-relaxed">
                          <span className="font-mono text-xs text-blue-600 dark:text-blue-400 mr-2 tabular-nums">
                            Q{idx + 1}.
                          </span>
                          {q.question}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {q.options.map((opt, optIdx) => {
                            const isSelected = selectedIdx === optIdx;
                            const isOptionCorrect = optIdx === q.correctIndex;
                            let styleClass =
                              'bg-slate-50 dark:bg-[#0B1220] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-blue-400 dark:hover:border-blue-500/60';

                            if (hasAnswered) {
                              if (isOptionCorrect) {
                                styleClass =
                                  'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500 dark:border-emerald-500 text-emerald-900 dark:text-emerald-200 font-medium';
                              } else if (isSelected) {
                                styleClass =
                                  'bg-red-50 dark:bg-red-950/70 border-red-400 dark:border-red-500 text-red-900 dark:text-red-200';
                              }
                            }

                            return (
                              <button
                                key={optIdx}
                                type="button"
                                onClick={() =>
                                  setSelectedMcqs((prev) => ({ ...prev, [q.id]: optIdx }))
                                }
                                className={`flex items-start gap-2.5 p-3 min-h-[44px] text-left text-sm rounded-xl border transition-colors cursor-pointer ${styleClass}`}
                              >
                                <span className="font-mono text-xs font-semibold shrink-0 mt-0.5">
                                  {String.fromCharCode(65 + optIdx)}.
                                </span>
                                <span className="flex-1">{opt}</span>
                                {hasAnswered && isOptionCorrect && (
                                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                                )}
                                {hasAnswered && isSelected && !isOptionCorrect && (
                                  <XCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {hasAnswered && (
                          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-start justify-between gap-3">
                            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 flex-1 leading-relaxed">
                              <strong className={isCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}>
                                {isCorrect ? 'Correct. ' : 'Incorrect. '}
                              </strong>
                              {q.explanation}
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                onAskFollowUp(
                                  `/explain Why is "${q.options[q.correctIndex]}" the right answer to: "${q.question}"?`
                                )
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              <MessageSquarePlus className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Discuss in Chat</span>
                            </button>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 2. Short-Answer Questions */}
            {bank.shortAnswers.length > 0 && (
              <section className="space-y-4">
                <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-50 pb-2.5 border-b border-slate-200 dark:border-slate-800">
                  02. Short-Answer Questions ({bank.shortAnswers.length})
                </h2>

                <div className="space-y-4">
                  {bank.shortAnswers.map((q, idx) => {
                    const isRevealed = Boolean(revealedAnswers[q.id]);
                    const draft = userShortNotes[q.id] ?? '';
                    return (
                      <article
                        key={q.id}
                        className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3.5 shadow-xs"
                      >
                        <p className="text-sm sm:text-base font-medium text-slate-900 dark:text-slate-50 leading-relaxed">
                          <span className="font-mono text-xs text-blue-600 dark:text-blue-400 mr-2 tabular-nums">
                            S{idx + 1}.
                          </span>
                          {q.question}
                        </p>

                        <textarea
                          rows={2}
                          value={draft}
                          onChange={(e) =>
                            setUserShortNotes((prev) => ({ ...prev, [q.id]: e.target.value }))
                          }
                          placeholder="Draft your 1–3 sentence response here..."
                          aria-label={`Your answer for short question ${idx + 1}`}
                          className="w-full px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-blue-600 dark:focus:border-blue-500"
                        />

                        <div className="flex flex-wrap items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => toggleReveal(q.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#0B1220] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors whitespace-nowrap cursor-pointer"
                          >
                            {isRevealed ? (
                              <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                            )}
                            <span>{isRevealed ? 'Hide Model Answer' : 'Show Model Answer'}</span>
                          </button>

                          {draft.trim().length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                onAskFollowUp(
                                  `/analyze Evaluate my short answer to "${q.question}":\n\nMy answer: ${draft.trim()}`
                                )
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 rounded-xl transition-colors whitespace-nowrap cursor-pointer"
                            >
                              <MessageSquarePlus className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Evaluate My Answer</span>
                            </button>
                          )}
                        </div>

                        {isRevealed && (
                          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                            <p className="leading-relaxed">{q.modelAnswer}</p>
                            {q.keyPoints.length > 0 && (
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Key concepts: {q.keyPoints.join(' · ')}
                              </p>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 3. Long-Answer Questions */}
            {bank.longAnswers.length > 0 && (
              <section className="space-y-4">
                <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-50 pb-2.5 border-b border-slate-200 dark:border-slate-800">
                  03. Long-Answer &amp; Research Prompts ({bank.longAnswers.length})
                </h2>

                <div className="space-y-4">
                  {bank.longAnswers.map((q, idx) => {
                    const isRevealed = Boolean(revealedAnswers[q.id]);
                    const draft = userLongNotes[q.id] ?? '';
                    return (
                      <article
                        key={q.id}
                        className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3.5 shadow-xs"
                      >
                        <p className="text-sm sm:text-base font-medium text-slate-900 dark:text-slate-50 leading-relaxed">
                          <span className="font-mono text-xs text-blue-600 dark:text-blue-400 mr-2 tabular-nums">
                            L{idx + 1}.
                          </span>
                          {q.question}
                        </p>

                        <textarea
                          rows={4}
                          value={draft}
                          onChange={(e) =>
                            setUserLongNotes((prev) => ({ ...prev, [q.id]: e.target.value }))
                          }
                          placeholder="Outline your detailed analytical response here..."
                          aria-label={`Your response for long question ${idx + 1}`}
                          className="w-full px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-blue-600 dark:focus:border-blue-500"
                        />

                        <div className="flex flex-wrap items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => toggleReveal(q.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#0B1220] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors whitespace-nowrap cursor-pointer"
                          >
                            {isRevealed ? (
                              <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                            )}
                            <span>{isRevealed ? 'Hide Model Solution' : 'Show Model Solution & Rubric'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              onAskFollowUp(
                                draft.trim().length > 0
                                  ? `/analyze Grade and improve my long-answer response to "${q.question}":\n\n${draft.trim()}`
                                  : `/advanced ${q.question}`
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 rounded-xl transition-colors whitespace-nowrap cursor-pointer"
                          >
                            <MessageSquarePlus className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>
                              {draft.trim().length > 0 ? 'Evaluate My Essay' : 'Explore in Chat'}
                            </span>
                          </button>
                        </div>

                        {isRevealed && (
                          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 space-y-2.5 text-sm text-slate-700 dark:text-slate-300">
                            <p className="leading-relaxed whitespace-pre-wrap">{q.modelAnswer}</p>
                            {q.rubricPoints.length > 0 && (
                              <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800">
                                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                  Grading Rubric Points
                                </p>
                                <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                                  {q.rubricPoints.map((pt) => (
                                    <li key={pt}>– {pt}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
