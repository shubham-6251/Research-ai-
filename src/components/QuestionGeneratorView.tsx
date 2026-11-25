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
        <section className="bg-white dark:bg-[#111827] border border-[#E5E2DC] dark:border-[#1E293B] rounded-xl p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs text-[#71717A] dark:text-[#94A3B8]">
                Assessment Studio · {session.knowledgeMap.domain}
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#111827] dark:text-[#F8FAFC]">
                Question Generator
              </h1>
              <p className="text-sm text-[#52525B] dark:text-[#94A3B8]">
                Generate grounded MCQs, short-answer drills, and analytical long-answer prompts for{' '}
                {session.topic}.
              </p>
            </div>
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleGenerateClick}
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#2563EB] dark:hover:bg-[#1D4ED8] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 self-start"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#EFECE6] dark:border-[#1E293B]">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-[#52525B] dark:text-[#94A3B8]">
                Focus Area
              </span>
              <select
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                disabled={isGenerating}
                className="w-full min-h-[42px] px-3 py-2 text-sm text-[#111827] dark:text-[#F8FAFC] bg-[#FAF9F6] dark:bg-[#0B1120] border border-[#D4D4D8] dark:border-[#334155] rounded-lg focus:outline-none focus:border-[#1E40AF]"
              >
                {focusOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === session.topic ? `Full Topic: ${opt}` : `Branch: ${opt}`}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-[#52525B] dark:text-[#94A3B8]">
                Difficulty Level
              </span>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as KnowledgeLevel)}
                disabled={isGenerating}
                className="w-full min-h-[42px] px-3 py-2 text-sm text-[#111827] dark:text-[#F8FAFC] bg-[#FAF9F6] dark:bg-[#0B1120] border border-[#D4D4D8] dark:border-[#334155] rounded-lg focus:outline-none focus:border-[#1E40AF]"
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
              className="p-3.5 rounded-lg bg-[#FEF2F2] dark:bg-[#450A0A]/50 border border-[#FECACA] dark:border-[#991B1B] text-sm text-[#991B1B] dark:text-[#FCA5A5] flex flex-wrap items-center justify-between gap-3"
            >
              <span>{error}</span>
              <button
                type="button"
                onClick={handleGenerateClick}
                disabled={isGenerating}
                className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-[#1E293B] border border-[#FCA5A5] dark:border-[#7F1D1D] rounded-md cursor-pointer whitespace-nowrap"
              >
                Retry
              </button>
            </div>
          )}
        </section>

        {!bank && !isGenerating && (
          <div className="bg-white dark:bg-[#111827] border border-[#E5E2DC] dark:border-[#1E293B] rounded-xl p-8 text-center space-y-3">
            <HelpCircle className="w-8 h-8 text-[#1E40AF] dark:text-[#60A5FA] mx-auto" aria-hidden="true" />
            <h2 className="font-display text-lg font-semibold text-[#111827] dark:text-[#F8FAFC]">
              No practice questions generated yet
            </h2>
            <p className="text-sm text-[#52525B] dark:text-[#94A3B8] max-w-md mx-auto">
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
                <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#E5E2DC] dark:border-[#1E293B]">
                  <h2 className="font-display text-xl font-semibold text-[#111827] dark:text-[#F8FAFC]">
                    01. Multiple-Choice Questions ({bank.mcqs.length})
                  </h2>
                  {mcqScore && (
                    <span className="text-xs font-medium text-[#52525B] dark:text-[#94A3B8] tabular-nums">
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
                        className="bg-white dark:bg-[#111827] border border-[#E5E2DC] dark:border-[#1E293B] rounded-xl p-5 space-y-4"
                      >
                        <p className="text-sm sm:text-base font-medium text-[#111827] dark:text-[#F8FAFC] leading-relaxed">
                          <span className="font-mono text-xs text-[#71717A] dark:text-[#94A3B8] mr-2 tabular-nums">
                            Q{idx + 1}.
                          </span>
                          {q.question}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {q.options.map((opt, optIdx) => {
                            const isSelected = selectedIdx === optIdx;
                            const isOptionCorrect = optIdx === q.correctIndex;
                            let styleClass =
                              'bg-[#FAF9F6] dark:bg-[#0B1120] border-[#E5E2DC] dark:border-[#1E293B] text-[#27272A] dark:text-[#E2E8F0] hover:border-[#1E40AF]/60';

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
                                className={`flex items-start gap-2.5 p-3 min-h-[44px] text-left text-sm rounded-lg border transition-colors cursor-pointer ${styleClass}`}
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
                          <div className="pt-3 border-t border-[#EFECE6] dark:border-[#1E293B] flex flex-wrap items-start justify-between gap-3">
                            <p className="text-xs sm:text-sm text-[#3F3F46] dark:text-[#CBD5E1] flex-1 leading-relaxed">
                              <strong className={isCorrect ? 'text-[#047857] dark:text-[#34D399]' : 'text-[#B91C1C] dark:text-[#F87171]'}>
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
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1E40AF] dark:text-[#60A5FA] hover:bg-[#EFF6FF] dark:hover:bg-[#1E293B] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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
                <h2 className="font-display text-xl font-semibold text-[#111827] dark:text-[#F8FAFC] pb-2 border-b border-[#E5E2DC] dark:border-[#1E293B]">
                  02. Short-Answer Questions ({bank.shortAnswers.length})
                </h2>

                <div className="space-y-4">
                  {bank.shortAnswers.map((q, idx) => {
                    const isRevealed = Boolean(revealedAnswers[q.id]);
                    const draft = userShortNotes[q.id] ?? '';
                    return (
                      <article
                        key={q.id}
                        className="bg-white dark:bg-[#111827] border border-[#E5E2DC] dark:border-[#1E293B] rounded-xl p-5 space-y-3.5"
                      >
                        <p className="text-sm sm:text-base font-medium text-[#111827] dark:text-[#F8FAFC] leading-relaxed">
                          <span className="font-mono text-xs text-[#71717A] dark:text-[#94A3B8] mr-2 tabular-nums">
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
                          className="w-full px-3 py-2 text-sm text-[#111827] dark:text-[#F8FAFC] placeholder:text-[#A1A1AA] dark:placeholder:text-[#64748B] bg-[#FAF9F6] dark:bg-[#0B1120] border border-[#E5E2DC] dark:border-[#1E293B] rounded-lg focus:outline-none focus:border-[#1E40AF]"
                        />

                        <div className="flex flex-wrap items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => toggleReveal(q.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-medium text-[#3F3F46] dark:text-[#CBD5E1] bg-[#FAF9F6] dark:bg-[#0B1120] hover:bg-[#F2F0EB] dark:hover:bg-[#1E293B] border border-[#E5E2DC] dark:border-[#1E293B] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
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
                              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-medium text-[#1E40AF] dark:text-[#60A5FA] bg-[#EFF6FF] dark:bg-[#1E293B] hover:bg-[#DBEAFE] dark:hover:bg-[#334155] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                            >
                              <MessageSquarePlus className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Evaluate My Answer</span>
                            </button>
                          )}
                        </div>

                        {isRevealed && (
                          <div className="p-3.5 rounded-lg bg-[#FAF9F6] dark:bg-[#0B1120] border border-[#E5E2DC] dark:border-[#1E293B] space-y-2 text-sm text-[#27272A] dark:text-[#CBD5E1]">
                            <p className="leading-relaxed">{q.modelAnswer}</p>
                            {q.keyPoints.length > 0 && (
                              <p className="text-xs text-[#71717A] dark:text-[#94A3B8]">
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
                <h2 className="font-display text-xl font-semibold text-[#111827] dark:text-[#F8FAFC] pb-2 border-b border-[#E5E2DC] dark:border-[#1E293B]">
                  03. Long-Answer &amp; Research Prompts ({bank.longAnswers.length})
                </h2>

                <div className="space-y-4">
                  {bank.longAnswers.map((q, idx) => {
                    const isRevealed = Boolean(revealedAnswers[q.id]);
                    const draft = userLongNotes[q.id] ?? '';
                    return (
                      <article
                        key={q.id}
                        className="bg-white dark:bg-[#111827] border border-[#E5E2DC] dark:border-[#1E293B] rounded-xl p-5 space-y-3.5"
                      >
                        <p className="text-sm sm:text-base font-medium text-[#111827] dark:text-[#F8FAFC] leading-relaxed">
                          <span className="font-mono text-xs text-[#71717A] dark:text-[#94A3B8] mr-2 tabular-nums">
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
                          className="w-full px-3 py-2 text-sm text-[#111827] dark:text-[#F8FAFC] placeholder:text-[#A1A1AA] dark:placeholder:text-[#64748B] bg-[#FAF9F6] dark:bg-[#0B1120] border border-[#E5E2DC] dark:border-[#1E293B] rounded-lg focus:outline-none focus:border-[#1E40AF]"
                        />

                        <div className="flex flex-wrap items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => toggleReveal(q.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-medium text-[#3F3F46] dark:text-[#CBD5E1] bg-[#FAF9F6] dark:bg-[#0B1120] hover:bg-[#F2F0EB] dark:hover:bg-[#1E293B] border border-[#E5E2DC] dark:border-[#1E293B] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
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
                            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-medium text-[#1E40AF] dark:text-[#60A5FA] bg-[#EFF6FF] dark:bg-[#1E293B] hover:bg-[#DBEAFE] dark:hover:bg-[#334155] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                          >
                            <MessageSquarePlus className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>
                              {draft.trim().length > 0 ? 'Evaluate My Essay' : 'Explore in Chat'}
                            </span>
                          </button>
                        </div>

                        {isRevealed && (
                          <div className="p-4 rounded-lg bg-[#FAF9F6] dark:bg-[#0B1120] border border-[#E5E2DC] dark:border-[#1E293B] space-y-2.5 text-sm text-[#27272A] dark:text-[#CBD5E1]">
                            <p className="leading-relaxed whitespace-pre-wrap">{q.modelAnswer}</p>
                            {q.rubricPoints.length > 0 && (
                              <div className="pt-2 border-t border-[#EFECE6] dark:border-[#1E293B]">
                                <p className="text-xs font-semibold text-[#52525B] dark:text-[#94A3B8] mb-1">
                                  Grading Rubric Points
                                </p>
                                <ul className="space-y-1 text-xs text-[#52525B] dark:text-[#94A3B8]">
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
