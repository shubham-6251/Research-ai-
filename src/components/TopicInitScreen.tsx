import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { motion } from 'motion/react';
import { ArrowUp, ArrowUpRight, Globe, Loader2, Zap } from 'lucide-react';
import { AthenaeumLogo } from './AthenaeumLogo';
import {
  deriveTopicFromInput,
  getResearchModeById,
  LANDING_SUGGESTIONS,
  RESEARCH_MODES,
  type LandingPromptSuggestion,
} from '../utils/researchModes';
import type { KnowledgeLevel, ResearchModeId, ResponseSpeed } from '../types';

interface TopicInitScreenProps {
  isInitializing: boolean;
  error: string | null;
  selectedModeId: ResearchModeId;
  searchGrounding: boolean;
  responseSpeed: ResponseSpeed;
  defaultLevel: KnowledgeLevel;
  onSelectMode: (modeId: ResearchModeId) => void;
  onToggleSearchGrounding: () => void;
  onToggleResponseSpeed: () => void;
  onStartResearch: (params: {
    topic: string;
    initialQuestion?: string;
    modeId: ResearchModeId;
    level: KnowledgeLevel;
    searchGrounding: boolean;
    responseSpeed: ResponseSpeed;
  }) => Promise<void>;
}

export function TopicInitScreen({
  isInitializing,
  error,
  selectedModeId,
  searchGrounding,
  responseSpeed,
  defaultLevel,
  onSelectMode,
  onToggleSearchGrounding,
  onToggleResponseSpeed,
  onStartResearch,
}: TopicInitScreenProps) {
  const [promptInput, setPromptInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const activeMode = getResearchModeById(selectedModeId);

  const submitPrompt = async () => {
    const cleaned = promptInput.trim();
    if (!cleaned) {
      setValidationError('Enter a topic or question to begin your research session.');
      return;
    }
    setValidationError(null);
    const { topic, initialQuestion } = deriveTopicFromInput(cleaned);
    await onStartResearch({
      topic,
      initialQuestion,
      modeId: selectedModeId,
      level: activeMode.preferredLevel ?? defaultLevel,
      searchGrounding,
      responseSpeed: activeMode.forcedSpeed ?? responseSpeed,
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isInitializing) return;
    await submitPrompt();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isInitializing) {
        submitPrompt();
      }
    }
  };

  const handleSuggestionClick = async (card: LandingPromptSuggestion) => {
    if (isInitializing) return;
    setValidationError(null);
    onSelectMode(card.modeId);
    const modeObj = getResearchModeById(card.modeId);
    await onStartResearch({
      topic: card.topic,
      initialQuestion: card.initialPrompt,
      modeId: card.modeId,
      level: modeObj.preferredLevel ?? defaultLevel,
      searchGrounding: modeObj.prefersSearch,
      responseSpeed: modeObj.forcedSpeed ?? responseSpeed,
    });
  };

  return (
    <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden bg-[#F8FAFC] dark:bg-[#060913]">
      {/* Lightweight Ambient Background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] ambient-glow"
      />

      {/* Scrollable Centered Welcome & Suggestions */}
      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto px-4 sm:px-8">
        <div className="min-h-full max-w-3xl w-full mx-auto py-6 sm:py-10 flex flex-col justify-center gap-6 sm:gap-8">
          {/* Hero Title Block */}
          <motion.div
            initial={{ opacity: 0.92, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-center space-y-2.5 sm:space-y-3"
          >
            <div className="flex justify-center mb-2">
              <AthenaeumLogo size="lg" />
            </div>
            <p className="text-xs font-semibold tracking-[0.22em] text-blue-600 dark:text-blue-400">
              ATHENAEUM
            </p>
            <h1 className="font-display text-2xl sm:text-5xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 text-balance leading-[1.12]">
              Explore anything. Understand everything.
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
              Your intelligent research companion for learning, discovery, and deep understanding.
            </p>
          </motion.div>

          {/* 6 Requested Suggestion Cards */}
          <motion.section
            initial={{ opacity: 0.94, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            aria-label="Research starter suggestions"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          >
            {LANDING_SUGGESTIONS.map((card, idx) => {
              const modeInfo = getResearchModeById(card.modeId);
              return (
                <button
                  key={card.id}
                  type="button"
                  disabled={isInitializing}
                  onClick={() => handleSuggestionClick(card)}
                  className="group text-left p-4 rounded-2xl bg-white/90 dark:bg-[#0B1120]/95 hover:bg-white dark:hover:bg-[#10192E] border border-slate-200/90 dark:border-slate-800/90 hover:border-blue-500/50 dark:hover:border-blue-500/50 shadow-xs hover:-translate-y-0.5 transition-all duration-150 cursor-pointer disabled:opacity-60 flex flex-col justify-between gap-2.5"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{modeInfo.label}</span>
                      <ArrowUpRight
                        className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors shrink-0"
                        aria-hidden="true"
                      />
                    </div>
                    <h2 className="font-sans text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
                      {card.title}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 tabular-nums">
                    0{idx + 1} · {card.topic}
                  </p>
                </button>
              );
            })}
          </motion.section>

          {/* Compact Mode Switcher Strip */}
          <div
            className="flex flex-wrap items-center justify-center gap-1.5"
            role="group"
            aria-label="Research modes"
          >
            {RESEARCH_MODES.map((m) => {
              const active = m.id === selectedModeId;
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={isInitializing}
                  onClick={() => onSelectMode(m.id)}
                  title={m.description}
                  className={`px-3 py-1.5 min-h-[34px] text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-500/60 text-blue-700 dark:text-blue-300'
                      : 'bg-white/70 dark:bg-[#0B1120]/80 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Fixed-Style Bottom Smart Composer */}
      <div className="relative z-10 px-3 sm:px-8 pt-2 pb-[max(0.875rem,env(safe-area-inset-bottom))] shrink-0">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="max-w-3xl mx-auto space-y-2"
        >
          {(validationError || error) && (
            <div
              role="alert"
              className="px-3.5 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs sm:text-sm text-red-700 dark:text-red-300"
            >
              {validationError || error}
            </div>
          )}

          <div className="bg-white/95 dark:bg-[#0D1426]/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 focus-within:border-blue-500 dark:focus-within:border-blue-500/70 focus-within:ring-2 focus-within:ring-blue-500/15 rounded-2xl p-2.5 sm:p-3 shadow-lg shadow-slate-950/5 dark:shadow-black/40 transition-all">
            <label htmlFor="landing-ask-input" className="sr-only">
              Ask Athenaeum anything
            </label>
            <textarea
              id="landing-ask-input"
              rows={2}
              value={promptInput}
              disabled={isInitializing}
              onChange={(e) => {
                setPromptInput(e.target.value);
                if (validationError) setValidationError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask Athenaeum anything..."
              className="w-full resize-none bg-transparent text-[15px] sm:text-base text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none px-2 py-1 max-h-36 leading-relaxed"
            />

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={onToggleSearchGrounding}
                  aria-pressed={searchGrounding}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[34px] text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    searchGrounding
                      ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-700/70 text-blue-700 dark:text-blue-300'
                      : 'bg-slate-50 dark:bg-[#060913] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Web Search: {searchGrounding ? 'On' : 'Off'}</span>
                </button>

                <button
                  type="button"
                  onClick={onToggleResponseSpeed}
                  aria-pressed={responseSpeed === 'fast'}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[34px] text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    responseSpeed === 'fast'
                      ? 'bg-violet-50 dark:bg-violet-950/50 border-violet-200 dark:border-violet-700/70 text-violet-700 dark:text-violet-300'
                      : 'bg-slate-50 dark:bg-[#060913] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Fast</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={isInitializing}
                aria-label="Start research"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[38px] text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-xs transition-all duration-150 active:scale-[0.97] whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
              >
                {isInitializing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>Initializing...</span>
                  </>
                ) : (
                  <>
                    <span>Research</span>
                    <ArrowUp className="w-4 h-4" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          </div>

          <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 hidden sm:block">
            Mode: {activeMode.label} — {activeMode.description}
          </p>
        </form>
      </div>
    </div>
  );
}
