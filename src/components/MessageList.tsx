import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDown,
  BookOpen,
  Check,
  Compass,
  Copy,
  ExternalLink,
  FileDown,
  GraduationCap,
  Info,
  ListChecks,
  Loader2,
  Pause,
  Pencil,
  RotateCcw,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Volume2,
  X,
} from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { AthenaeumLogo } from './AthenaeumLogo';
import type { TtsPlayerState } from './AudioPlayerBar';
import type { MessageFeedback, TopicSession } from '../types';

interface MessageListProps {
  session: TopicSession;
  isStreaming: boolean;
  ttsState: TtsPlayerState;
  onListen: (messageId: string, title: string, text: string) => void;
  onRetryMessage: (failedAssistantId: string) => void;
  onEditAndResend: (userMessageId: string, editedText: string) => void;
  onFeedback: (messageId: string, feedback: MessageFeedback) => void;
  onQuickPrompt: (prompt: string) => void;
  onOpenQuestions: () => void;
  onExportPdf: () => void;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function getModeIcon(modeLabel?: string | null, command?: string | null) {
  const key = `${command || ''} ${modeLabel || ''}`.toLowerCase();
  if (key.includes('research') || key.includes('academic') || key.includes('report')) return Compass;
  if (key.includes('learn') || key.includes('basic') || key.includes('quiz')) return GraduationCap;
  if (key.includes('summar')) return Sparkles;
  return BookOpen;
}

export function MessageList({
  session,
  isStreaming,
  ttsState,
  onListen,
  onRetryMessage,
  onEditAndResend,
  onFeedback,
  onQuickPrompt,
  onOpenQuestions,
  onExportPdf,
}: MessageListProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const prevCountRef = useRef<number>(session.messages.length);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBottom(distanceFromBottom > 180);
  }, []);

  const scrollToLatest = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const isNewMessage = session.messages.length > prevCountRef.current;
    prevCountRef.current = session.messages.length;

    if (isNewMessage) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    } else if (isStreaming) {
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      if (distanceFromBottom < 240) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [session.messages.length, session.messages[session.messages.length - 1]?.content, isStreaming]);

  const handleCopyMessage = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1800);
    } catch {
      // Clipboard unavailable
    }
  };

  const beginEdit = (id: string, currentContent: string) => {
    setEditingMsgId(id);
    setEditDraft(currentContent);
  };

  const submitEdit = (id: string) => {
    const trimmed = editDraft.trim();
    if (!trimmed) return;
    setEditingMsgId(null);
    onEditAndResend(id, trimmed);
  };

  const { knowledgeMap } = session;
  const briefingId = `briefing-${session.id}`;
  const isBriefingActive = ttsState.messageId === briefingId;
  const firstBranch = knowledgeMap.branches[0]?.title;
  const secondBranch = knowledgeMap.branches[1]?.title;

  const starterPrompts = [
    {
      title: 'Explain core intuition & prerequisites',
      prompt: `/learn Explain the core intuition and prerequisites of ${session.topic}`,
    },
    {
      title: firstBranch ? `Explore ${firstBranch}` : 'Walk through core mechanics',
      prompt: firstBranch
        ? `/explain ${firstBranch} in the context of ${session.topic}`
        : `/explain How does ${session.topic} work step by step?`,
    },
    {
      title: 'Practical applications & examples',
      prompt: `/examples Give practical real-world examples of ${session.topic}`,
    },
    {
      title: secondBranch ? `Deep dive into ${secondBranch}` : 'Conduct deep research overview',
      prompt: `/research Conduct a structured deep research overview of ${session.topic}`,
    },
  ];

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto bg-[#F8FAFC] dark:bg-[#060913] px-3.5 sm:px-8 py-5 sm:py-8"
        data-testid="conversation-stream"
      >
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Topic Research Briefing Card */}
          <motion.article
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {knowledgeMap.domain} · {knowledgeMap.branches.length} branches mapped ·{' '}
                  {session.level} depth
                </p>
                <h1 className="font-display text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-50 text-balance tracking-tight">
                  {session.topic}
                </h1>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onExportPdf}
                  aria-label="Export research as PDF"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-lg border bg-slate-50 dark:bg-[#060913] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5 text-blue-500" aria-hidden="true" />
                  <span>PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onListen(
                      briefingId,
                      `${session.topic} Overview`,
                      `${session.topic}. ${knowledgeMap.overview}`
                    )
                  }
                  aria-label={`Listen to overview of ${session.topic}`}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isBriefingActive && ttsState.status !== 'idle'
                      ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                      : 'bg-slate-50 dark:bg-[#060913] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {isBriefingActive && ttsState.status === 'loading' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  ) : isBriefingActive && ttsState.status === 'playing' ? (
                    <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  <span>
                    {isBriefingActive && ttsState.status === 'loading'
                      ? 'Preparing...'
                      : isBriefingActive && ttsState.status === 'playing'
                        ? 'Pause'
                        : isBriefingActive && ttsState.status === 'paused'
                          ? 'Resume'
                          : 'Listen'}
                  </span>
                </button>
              </div>
            </div>

            <p className="text-sm sm:text-[15px] text-slate-700 dark:text-slate-300 leading-relaxed">
              {knowledgeMap.overview}
            </p>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isStreaming}
                onClick={() => onQuickPrompt(`/research ${session.topic}`)}
                className="px-3 py-1.5 min-h-[36px] text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-lg transition-all active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
              >
                Deep Research
              </button>
              <button
                type="button"
                disabled={isStreaming}
                onClick={() => onQuickPrompt(`/learn ${session.topic}`)}
                className="px-3 py-1.5 min-h-[36px] text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#0F1629] hover:bg-slate-200/70 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
              >
                Explain from Basics
              </button>
              <button
                type="button"
                disabled={isStreaming}
                onClick={() => onQuickPrompt(`/summarize ${session.topic}`)}
                className="px-3 py-1.5 min-h-[36px] text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#0F1629] hover:bg-slate-200/70 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
              >
                Summarize
              </button>
              <button
                type="button"
                onClick={onOpenQuestions}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#0F1629] hover:bg-slate-200/70 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ListChecks className="w-3.5 h-3.5 text-violet-500" aria-hidden="true" />
                <span>Question Studio</span>
              </button>
            </div>
          </motion.article>

          {/* Suggested Follow-Ups When Chat is Empty */}
          {session.messages.length === 0 && (
            <section aria-label="Suggested prompts" className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {starterPrompts.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  disabled={isStreaming}
                  onClick={() => onQuickPrompt(item.prompt)}
                  className="text-left px-4 py-3 rounded-xl bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 dark:hover:border-blue-500/50 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {item.title}
                </button>
              ))}
            </section>
          )}

          {/* Conversation Messages */}
          <AnimatePresence initial={false}>
            {session.messages.map((msg) => {
              if (msg.role === 'user') {
                const isEditing = editingMsgId === msg.id;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="group flex flex-col items-end gap-1.5"
                  >
                    {isEditing ? (
                      <div className="w-full max-w-[92%] sm:max-w-[85%] bg-white dark:bg-[#0F1629] border border-blue-500/60 rounded-2xl p-3 space-y-2.5 shadow-sm">
                        <textarea
                          rows={3}
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          aria-label="Edit your message"
                          className="w-full resize-none bg-transparent text-sm sm:text-[15px] text-slate-900 dark:text-slate-100 focus:outline-none leading-relaxed"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingMsgId(null)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 min-h-[34px] text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Cancel</span>
                          </button>
                          <button
                            type="button"
                            disabled={!editDraft.trim() || isStreaming}
                            onClick={() => submitEdit(msg.id)}
                            className="inline-flex items-center gap-1 px-3.5 py-1.5 min-h-[34px] text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg cursor-pointer disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Save &amp; Resend</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="max-w-[90%] sm:max-w-[80%] bg-slate-900 dark:bg-[#17223B] text-white dark:text-slate-100 border border-transparent dark:border-slate-700/70 rounded-2xl rounded-br-sm px-4 py-3 text-[15px] leading-relaxed shadow-xs">
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        <div className="flex items-center gap-2 px-1 text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                          <span>{formatTime(msg.timestamp)}</span>
                          {!isStreaming && (
                            <button
                              type="button"
                              onClick={() => beginEdit(msg.id, msg.content)}
                              aria-label="Edit message"
                              className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 opacity-85 sm:opacity-65 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                            >
                              <Pencil className="w-3 h-3" aria-hidden="true" />
                              <span>Edit</span>
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </motion.div>
                );
              }

              const isMsgActive = ttsState.messageId === msg.id;
              const hasText = msg.content.trim().length > 0;
              const canAct = Boolean(!msg.isStreaming && !msg.error && hasText);
              const trackLabel = `${msg.modeLabel || 'Athenaeum'}${msg.command ? ` (${msg.command})` : ''}`;
              const ModeIcon = getModeIcon(msg.modeLabel, msg.command);
              const isCopied = copiedId === msg.id;

              return (
                <motion.article
                  key={msg.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-3 py-2"
                >
                  {/* Assistant Header Strip */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <AthenaeumLogo size="sm" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100 min-w-0">
                          <span className="shrink-0">Athenaeum</span>
                          <span aria-hidden="true" className="text-slate-400 shrink-0">·</span>
                          <span className="inline-flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400 min-w-0">
                            <ModeIcon className="w-3 h-3 shrink-0" aria-hidden="true" />
                            <span className="truncate">{msg.modeLabel || 'Research Synthesis'}</span>
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate tabular-nums">
                          {msg.responseSpeed === 'fast' ? 'Fast · ' : ''}
                          {msg.searchGrounded
                            ? 'Search Grounded'
                            : msg.groundingNote
                              ? `Internal Knowledge (${msg.groundingNote})`
                              : 'Internal Knowledge'}
                          {' · '}
                          {formatTime(msg.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Notice if Search Fallback Occurred */}
                  {msg.groundingNotice && (
                    <div
                      role="status"
                      className="px-3.5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2 leading-relaxed"
                    >
                      <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                      <span>{msg.groundingNotice}</span>
                    </div>
                  )}

                  {/* Body Content or Animated Skeleton/Typing State */}
                  <div className="pl-0 sm:pl-9.5 space-y-4">
                    {hasText ? (
                      <MarkdownRenderer content={msg.content} />
                    ) : !msg.error ? (
                      <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 py-2">
                        <div className="flex items-center gap-1" aria-hidden="true">
                          {[0, 1, 2].map((dot) => (
                            <motion.span
                              key={dot}
                              className="w-1.5 h-1.5 rounded-full bg-blue-500"
                              animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                              transition={{
                                duration: 0.9,
                                repeat: Infinity,
                                delay: dot * 0.15,
                                ease: 'easeInOut',
                              }}
                            />
                          ))}
                        </div>
                        <span>Synthesizing response...</span>
                      </div>
                    ) : null}

                    {msg.error && (
                      <div
                        role="alert"
                        className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-sm text-red-800 dark:text-red-300 flex flex-wrap items-center justify-between gap-3"
                      >
                        <span>{msg.error}</span>
                        <button
                          type="button"
                          disabled={isStreaming}
                          onClick={() => onRetryMessage(msg.id)}
                          className="px-3 py-1.5 min-h-[34px] text-xs font-semibold text-red-800 dark:text-red-200 bg-white dark:bg-slate-800 border border-red-300 dark:border-red-700 rounded-lg cursor-pointer"
                        >
                          Retry
                        </button>
                      </div>
                    )}

                    {msg.isStreaming && hasText && (
                      <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                        <span className="w-1.5 h-3.5 bg-blue-500 inline-block animate-pulse rounded-xs" />
                        <span>Streaming...</span>
                      </div>
                    )}

                    {/* Verified Grounding Sources */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800/80 space-y-2">
                        <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 tabular-nums">
                          Verified Sources ({msg.sources.length})
                        </h3>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {msg.sources.map((src) => (
                            <li key={src.url}>
                              <a
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 hover:border-blue-500/60 transition-colors group"
                              >
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                                    {src.title}
                                  </p>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                    {src.domain}
                                  </p>
                                </div>
                                <ExternalLink
                                  className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 shrink-0 mt-0.5"
                                  aria-hidden="true"
                                />
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* ChatGPT-Style Response Action Controls */}
                    {canAct && (
                      <div className="flex flex-wrap items-center gap-1 pt-1">
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          aria-label="Copy response"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[32px] text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/70 rounded-lg transition-colors cursor-pointer"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          disabled={isStreaming}
                          onClick={() => onRetryMessage(msg.id)}
                          aria-label="Regenerate response"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[32px] text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/70 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Regenerate</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onListen(msg.id, trackLabel, msg.content)}
                          aria-label={
                            isMsgActive && ttsState.status === 'playing'
                              ? `Pause audio for ${trackLabel}`
                              : `Listen to ${trackLabel}`
                          }
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[32px] text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                            isMsgActive && ttsState.status !== 'idle'
                              ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/70'
                          }`}
                        >
                          {isMsgActive && ttsState.status === 'loading' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                          ) : isMsgActive && ttsState.status === 'playing' ? (
                            <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                          <span>
                            {isMsgActive && ttsState.status === 'playing' ? 'Pause' : 'Listen'}
                          </span>
                        </button>

                        {msg.content.length > 360 && (
                          <button
                            type="button"
                            disabled={isStreaming}
                            onClick={() =>
                              onQuickPrompt(
                                `/summarize Summarize your previous explanation into clear, concise sections:\n\n${msg.content.slice(0, 2600)}`
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[32px] text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/70 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Summarize</span>
                          </button>
                        )}

                        <div className="flex items-center gap-0.5 ml-auto">
                          <button
                            type="button"
                            onClick={() =>
                              onFeedback(msg.id, msg.feedback === 'up' ? null : 'up')
                            }
                            aria-pressed={msg.feedback === 'up'}
                            aria-label="Helpful response"
                            className={`p-1.5 min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                              msg.feedback === 'up'
                                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50'
                                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/70'
                            }`}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onFeedback(msg.id, msg.feedback === 'down' ? null : 'down')
                            }
                            aria-pressed={msg.feedback === 'down'}
                            aria-label="Not helpful response"
                            className={`p-1.5 min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                              msg.feedback === 'down'
                                ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50'
                                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/70'
                            }`}
                          >
                            <ThumbsDown className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Floating Scroll to Bottom Button */}
      <AnimatePresence>
        {showScrollBottom && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.16 }}
            onClick={scrollToLatest}
            aria-label="Scroll to latest message"
            className="absolute bottom-4 right-4 sm:right-8 z-20 inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] text-xs font-semibold text-slate-800 dark:text-slate-100 bg-white/95 dark:bg-[#0F1629]/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-full shadow-md hover:border-blue-500 transition-colors cursor-pointer"
          >
            <ArrowDown className="w-3.5 h-3.5 text-blue-500" aria-hidden="true" />
            <span>Latest</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
