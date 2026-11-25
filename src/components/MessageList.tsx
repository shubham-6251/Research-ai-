import { useEffect, useRef } from 'react';
import {
  ExternalLink,
  FileDown,
  Info,
  ListChecks,
  Loader2,
  Pause,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import type { TtsPlayerState } from './AudioPlayerBar';
import type { TopicSession } from '../types';

interface MessageListProps {
  session: TopicSession;
  isStreaming: boolean;
  ttsState: TtsPlayerState;
  onListen: (messageId: string, title: string, text: string) => void;
  onRetryMessage: (failedAssistantId: string) => void;
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

export function MessageList({
  session,
  isStreaming,
  ttsState,
  onListen,
  onRetryMessage,
  onQuickPrompt,
  onOpenQuestions,
  onExportPdf,
}: MessageListProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const prevCountRef = useRef<number>(session.messages.length);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const isNewOrStreaming =
      session.messages.length > prevCountRef.current || isStreaming;
    prevCountRef.current = session.messages.length;
    if (isNewOrStreaming) {
      container.scrollTop = container.scrollHeight;
    }
  }, [session.messages.length, session.messages[session.messages.length - 1]?.content, isStreaming]);

  const { knowledgeMap } = session;
  const briefingId = `briefing-${session.id}`;
  const isBriefingActive = ttsState.messageId === briefingId;

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 py-6 sm:py-8"
      data-testid="conversation-stream"
    >
      <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8">
        {/* Initial Topic Expert Briefing */}
        <article className="bg-white dark:bg-[#111827] border border-[#E5E2DC] dark:border-[#1E293B] rounded-xl p-5 sm:p-7 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1.5">
              <p className="text-xs text-[#71717A] dark:text-[#94A3B8] tabular-nums">
                Research Workspace · {knowledgeMap.domain} · {knowledgeMap.branches.length} branches mapped
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#111827] dark:text-[#F8FAFC] text-balance">
                {session.topic}
              </h1>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onExportPdf}
                aria-label="Export research as PDF"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-lg border bg-[#FAF9F6] dark:bg-[#0B1120] border-[#E5E2DC] dark:border-[#1E293B] text-[#3F3F46] dark:text-[#CBD5E1] hover:text-[#111827] dark:hover:text-[#F8FAFC] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5" aria-hidden="true" />
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
                    ? 'bg-[#EFF6FF] dark:bg-[#1E293B] border-[#BFDBFE] dark:border-[#3B82F6] text-[#1E40AF] dark:text-[#60A5FA]'
                    : 'bg-[#FAF9F6] dark:bg-[#0B1120] border-[#E5E2DC] dark:border-[#1E293B] text-[#3F3F46] dark:text-[#CBD5E1] hover:text-[#111827] dark:hover:text-[#F8FAFC]'
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

          <p className="text-base text-[#3F3F46] dark:text-[#CBD5E1] leading-relaxed">
            {knowledgeMap.overview}
          </p>

          {/* Compact Structured Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-[#EFECE6] dark:border-[#1E293B]">
            {knowledgeMap.prerequisites.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-[#52525B] dark:text-[#94A3B8] mb-2">
                  Recommended Prerequisites
                </h2>
                <ul className="space-y-1.5 text-sm text-[#27272A] dark:text-[#CBD5E1]">
                  {knowledgeMap.prerequisites.map((pre) => (
                    <li key={pre} className="flex items-start gap-2">
                      <span className="text-[#A1A1AA] dark:text-[#64748B] select-none" aria-hidden="true">
                        –
                      </span>
                      <span>{pre}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {knowledgeMap.applications.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-[#52525B] dark:text-[#94A3B8] mb-2">
                  Real-World Applications
                </h2>
                <ul className="space-y-1.5 text-sm text-[#27272A] dark:text-[#CBD5E1]">
                  {knowledgeMap.applications.map((app) => (
                    <li key={app} className="flex items-start gap-2">
                      <span className="text-[#A1A1AA] dark:text-[#64748B] select-none" aria-hidden="true">
                        –
                      </span>
                      <span>{app}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Suggested Starting Actions */}
          <div className="pt-4 border-t border-[#EFECE6] dark:border-[#1E293B] flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={isStreaming}
              onClick={() => onQuickPrompt(`/research ${session.topic}`)}
              className="px-3.5 py-2 min-h-[40px] text-xs font-medium text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#2563EB] dark:hover:bg-[#1D4ED8] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              Deep Research Report
            </button>
            <button
              type="button"
              disabled={isStreaming}
              onClick={() => onQuickPrompt(`/learn ${session.topic}`)}
              className="px-3.5 py-2 min-h-[40px] text-xs font-medium text-[#111827] dark:text-[#F8FAFC] bg-[#FAF9F6] dark:bg-[#0B1120] hover:bg-[#F2F0EB] dark:hover:bg-[#1E293B] border border-[#E5E2DC] dark:border-[#1E293B] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              Guided Learning (/learn)
            </button>
            <button
              type="button"
              disabled={isStreaming}
              onClick={() => onQuickPrompt(`/summarize ${session.topic}`)}
              className="px-3.5 py-2 min-h-[40px] text-xs font-medium text-[#111827] dark:text-[#F8FAFC] bg-[#FAF9F6] dark:bg-[#0B1120] hover:bg-[#F2F0EB] dark:hover:bg-[#1E293B] border border-[#E5E2DC] dark:border-[#1E293B] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              Summarize Topic
            </button>
            <button
              type="button"
              onClick={onOpenQuestions}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-medium text-[#1E40AF] dark:text-[#60A5FA] bg-[#EFF6FF] dark:bg-[#1E293B] hover:bg-[#DBEAFE] dark:hover:bg-[#334155] border border-[#BFDBFE] dark:border-[#3B82F6]/40 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ListChecks className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Question Studio</span>
            </button>
          </div>
        </article>

        {/* Messages */}
        {session.messages.map((msg) => {
          if (msg.role === 'user') {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[85%] bg-[#F2F0EB] dark:bg-[#1E293B] border border-[#E5E2DC] dark:border-[#334155] rounded-xl px-4 py-3 text-sm sm:text-base text-[#111827] dark:text-[#F8FAFC]">
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              </div>
            );
          }

          const isMsgActive = ttsState.messageId === msg.id;
          const hasText = msg.content.trim().length > 0;
          const canAct = Boolean(!msg.isStreaming && !msg.error && hasText);
          const trackLabel = `${msg.modeLabel || 'Expert Response'}${msg.command ? ` (${msg.command})` : ''}`;

          return (
            <article
              key={msg.id}
              className="bg-white dark:bg-[#111827] border border-[#E5E2DC] dark:border-[#1E293B] rounded-xl p-5 sm:p-7 space-y-4"
            >
              {/* Unboxed Zero-Pill Metadata Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#EFECE6] dark:border-[#1E293B] text-xs text-[#71717A] dark:text-[#94A3B8] tabular-nums">
                <span>
                  {msg.modeLabel || 'Expert Response'}
                  {msg.command ? ` (${msg.command})` : ''}
                  {msg.responseSpeed === 'fast' ? ' · Fast' : ''}
                  {' · '}
                  {msg.searchGrounded
                    ? 'Search Grounded'
                    : msg.groundingNote
                      ? `Internal Knowledge (${msg.groundingNote})`
                      : 'Internal Knowledge'}
                </span>
                <div className="flex items-center gap-2">
                  {canAct && msg.content.length > 360 && (
                    <button
                      type="button"
                      disabled={isStreaming}
                      onClick={() =>
                        onQuickPrompt(
                          `/summarize Summarize your previous explanation into clear, concise sections:\n\n${msg.content.slice(0, 2600)}`
                        )
                      }
                      aria-label="Summarize this response"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border bg-[#FAF9F6] dark:bg-[#0B1120] border-[#E5E2DC] dark:border-[#1E293B] text-[#3F3F46] dark:text-[#CBD5E1] hover:text-[#1E40AF] dark:hover:text-[#60A5FA] transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3 h-3" aria-hidden="true" />
                      <span>Summarize</span>
                    </button>
                  )}

                  {canAct && (
                    <button
                      type="button"
                      onClick={() => onListen(msg.id, trackLabel, msg.content)}
                      aria-label={
                        isMsgActive && ttsState.status === 'playing'
                          ? `Pause audio for ${trackLabel}`
                          : `Listen to ${trackLabel}`
                      }
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap cursor-pointer ${
                        isMsgActive && ttsState.status !== 'idle'
                          ? 'bg-[#EFF6FF] dark:bg-[#1E293B] border-[#BFDBFE] dark:border-[#3B82F6] text-[#1E40AF] dark:text-[#60A5FA]'
                          : 'bg-[#FAF9F6] dark:bg-[#0B1120] border-[#E5E2DC] dark:border-[#1E293B] text-[#3F3F46] dark:text-[#CBD5E1] hover:text-[#111827] dark:hover:text-[#F8FAFC]'
                      }`}
                    >
                      {isMsgActive && ttsState.status === 'loading' ? (
                        <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                      ) : isMsgActive && ttsState.status === 'playing' ? (
                        <Pause className="w-3 h-3" aria-hidden="true" />
                      ) : (
                        <Volume2 className="w-3 h-3" aria-hidden="true" />
                      )}
                      <span>
                        {isMsgActive && ttsState.status === 'loading'
                          ? 'Preparing...'
                          : isMsgActive && ttsState.status === 'playing'
                            ? 'Pause'
                            : isMsgActive && ttsState.status === 'paused'
                              ? 'Resume'
                              : 'Listen'}
                      </span>
                    </button>
                  )}
                  <span>{formatTime(msg.timestamp)}</span>
                </div>
              </div>

              {msg.groundingNotice && (
                <div
                  role="status"
                  className="px-3.5 py-2.5 rounded-lg bg-[#FFFBEB] dark:bg-[#451A03]/40 border border-[#FDE68A] dark:border-[#92400E] text-xs text-[#92400E] dark:text-[#FDE68A] flex items-start gap-2 leading-relaxed"
                >
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#B45309] dark:text-[#FBBF24]" aria-hidden="true" />
                  <span>{msg.groundingNotice}</span>
                </div>
              )}

              {hasText ? (
                <MarkdownRenderer content={msg.content} />
              ) : !msg.error ? (
                <div className="flex items-center gap-2.5 text-sm text-[#52525B] dark:text-[#94A3B8] py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#1E40AF] dark:text-[#60A5FA]" aria-hidden="true" />
                  <span>Researching and synthesizing response...</span>
                </div>
              ) : null}

              {msg.error && (
                <div
                  role="alert"
                  className="p-3.5 rounded-lg bg-[#FEF2F2] dark:bg-[#450A0A]/50 border border-[#FECACA] dark:border-[#991B1B] text-sm text-[#991B1B] dark:text-[#FCA5A5] flex flex-wrap items-center justify-between gap-3"
                >
                  <span>{msg.error}</span>
                  <button
                    type="button"
                    disabled={isStreaming}
                    onClick={() => onRetryMessage(msg.id)}
                    className="px-3 py-1.5 text-xs font-semibold text-[#991B1B] dark:text-[#FCA5A5] bg-white dark:bg-[#1E293B] hover:bg-[#FEE2E2] dark:hover:bg-[#334155] border border-[#FCA5A5] dark:border-[#7F1D1D] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    Retry
                  </button>
                </div>
              )}

              {msg.isStreaming && hasText && (
                <div className="flex items-center gap-2 text-xs text-[#71717A] dark:text-[#94A3B8] pt-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1E40AF] dark:text-[#60A5FA]" aria-hidden="true" />
                  <span>Streaming response...</span>
                </div>
              )}

              {/* Verified Grounding Sources */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="pt-4 border-t border-[#EFECE6] dark:border-[#1E293B] space-y-2.5">
                  <h3 className="text-xs font-semibold text-[#52525B] dark:text-[#94A3B8]">
                    Verified Sources ({msg.sources.length})
                  </h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {msg.sources.map((src) => (
                      <li key={src.url}>
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start justify-between gap-2 p-2.5 rounded-lg bg-[#FAF9F6] dark:bg-[#0B1120] border border-[#E5E2DC] dark:border-[#1E293B] hover:border-[#1E40AF]/50 dark:hover:border-[#3B82F6] transition-colors group"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-[#111827] dark:text-[#F8FAFC] group-hover:text-[#1E40AF] dark:group-hover:text-[#60A5FA] truncate">
                              {src.title}
                            </p>
                            <p className="text-[11px] text-[#71717A] dark:text-[#94A3B8] truncate mt-0.5">
                              {src.domain}
                            </p>
                          </div>
                          <ExternalLink
                            className="w-3.5 h-3.5 text-[#71717A] dark:text-[#94A3B8] group-hover:text-[#1E40AF] dark:group-hover:text-[#60A5FA] shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
