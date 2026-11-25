import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { Send, Square, Zap } from 'lucide-react';
import { filterCommands, SPECIAL_COMMANDS } from '../utils/commands';
import type { ResponseSpeed, SpecialCommandName } from '../types';

interface ComposerProps {
  topic: string;
  isStreaming: boolean;
  responseSpeed: ResponseSpeed;
  onToggleResponseSpeed: () => void;
  onSend: (text: string) => void;
  onStop: () => void;
}

export function Composer({
  topic,
  isStreaming,
  responseSpeed,
  onToggleResponseSpeed,
  onSend,
  onStop,
}: ComposerProps) {
  const [input, setInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const suggestions = filterCommands(input);
  const showSuggestions = suggestions.length > 0;

  const submitText = () => {
    const cleaned = input.trim();
    if (!cleaned) {
      setValidationError('Enter a question, problem, or /command before sending.');
      return;
    }
    setValidationError(null);
    setInput('');
    setSelectedIdx(0);
    onSend(cleaned);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isStreaming) return;
    submitText();
  };

  const applyCommand = (cmd: SpecialCommandName) => {
    if (cmd === '/change-topic') {
      setInput('/change-topic');
      setValidationError(null);
      return;
    }
    setInput(`${cmd} `);
    setValidationError(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx((prev) => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        const chosen = suggestions[selectedIdx] ?? suggestions[0];
        if (chosen) applyCommand(chosen.command);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming) {
        submitText();
      }
    }
  };

  return (
    <div className="bg-[#FAF9F6] dark:bg-[#0B1120] border-t border-[#E5E2DC] dark:border-[#1E293B] px-3 sm:px-8 py-3 sm:py-4 shrink-0">
      <div className="max-w-3xl mx-auto space-y-2 relative">
        {/* Slash-Command Autocomplete Menu */}
        {showSuggestions && (
          <div
            role="listbox"
            aria-label="Command suggestions"
            className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-[#111827] border border-[#E5E2DC] dark:border-[#1E293B] rounded-xl shadow-md overflow-hidden z-20 max-h-64 overflow-y-auto"
          >
            {suggestions.map((def, idx) => (
              <button
                key={def.command}
                type="button"
                role="option"
                aria-selected={idx === selectedIdx}
                onClick={() => applyCommand(def.command)}
                className={`w-full flex items-center justify-between gap-4 px-4 py-2.5 text-left text-sm transition-colors cursor-pointer ${
                  idx === selectedIdx
                    ? 'bg-[#EFF6FF] dark:bg-[#1E293B]'
                    : 'hover:bg-[#FAF9F6] dark:hover:bg-[#1E293B]/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-xs font-semibold text-[#1E40AF] dark:text-[#60A5FA] shrink-0">
                    {def.command}
                  </span>
                  <span className="text-xs text-[#52525B] dark:text-[#94A3B8] truncate">
                    {def.shortDesc}
                  </span>
                </div>
                <span className="text-[11px] text-[#A1A1AA] dark:text-[#64748B] shrink-0 hidden sm:inline">
                  Tab to select
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Quick Command Strip */}
        <div
          className="flex items-center gap-1.5 overflow-x-auto pb-0.5"
          aria-label="Quick expert commands"
        >
          {SPECIAL_COMMANDS.map((cmd) => (
            <button
              key={cmd.command}
              type="button"
              disabled={isStreaming}
              onClick={() => {
                if (cmd.command === '/change-topic') {
                  onSend('/change-topic');
                } else {
                  applyCommand(cmd.command);
                }
              }}
              title={cmd.shortDesc}
              className="px-2.5 py-1 text-xs font-mono font-medium text-[#3F3F46] dark:text-[#CBD5E1] hover:text-[#1E40AF] dark:hover:text-[#60A5FA] bg-white dark:bg-[#111827] hover:bg-[#EFF6FF] dark:hover:bg-[#1E293B] border border-[#E5E2DC] dark:border-[#1E293B] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              {cmd.command}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-1.5" noValidate>
          <label htmlFor="expert-chat-input" className="sr-only">
            Ask a question or enter a command about {topic}
          </label>
          <div className="flex items-end gap-2 bg-white dark:bg-[#111827] border border-[#D4D4D8] dark:border-[#334155] focus-within:border-[#1E40AF] dark:focus-within:border-[#3B82F6] focus-within:ring-2 focus-within:ring-[#1E40AF]/15 rounded-xl p-2 sm:p-2.5">
            <textarea
              id="expert-chat-input"
              rows={2}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setSelectedIdx(0);
                if (validationError) setValidationError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder={`Ask anything about ${topic}, paste a problem, or type /...`}
              className="flex-1 resize-none bg-transparent text-sm sm:text-base text-[#111827] dark:text-[#F8FAFC] placeholder:text-[#A1A1AA] dark:placeholder:text-[#64748B] focus:outline-none px-1.5 py-1 max-h-40"
            />
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={onToggleResponseSpeed}
                aria-pressed={responseSpeed === 'fast'}
                aria-label="Toggle fast response mode"
                title={
                  responseSpeed === 'fast'
                    ? 'Fast Response active: concise, low-latency replies'
                    : 'Switch to Fast Response for concise, low-latency replies'
                }
                className={`inline-flex items-center gap-1 px-2.5 py-2 min-h-[40px] text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  responseSpeed === 'fast'
                    ? 'bg-[#EFF6FF] dark:bg-[#1E293B] border-[#BFDBFE] dark:border-[#3B82F6] text-[#1E40AF] dark:text-[#60A5FA]'
                    : 'bg-[#FAF9F6] dark:bg-[#0B1120] border-[#E5E2DC] dark:border-[#1E293B] text-[#52525B] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F8FAFC]'
                }`}
              >
                <Zap className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Fast</span>
              </button>

              {isStreaming ? (
                <button
                  type="button"
                  onClick={onStop}
                  aria-label="Stop generating"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-semibold text-white bg-[#18181B] dark:bg-[#334155] hover:bg-[#27272A] dark:hover:bg-[#475569] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  type="submit"
                  aria-label="Send message"
                  className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 min-h-[40px] text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#2563EB] dark:hover:bg-[#1D4ED8] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E40AF]"
                >
                  <Send className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Send</span>
                </button>
              )}
            </div>
          </div>
          {validationError && (
            <p role="alert" className="text-xs text-[#B91C1C] dark:text-[#F87171] font-medium px-1">
              {validationError}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
