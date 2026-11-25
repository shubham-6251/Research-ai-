import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUp, ChevronDown, Globe, Square, Zap } from 'lucide-react';
import { filterCommands, SPECIAL_COMMANDS } from '../utils/commands';
import { getResearchModeById, RESEARCH_MODES } from '../utils/researchModes';
import type { ResearchModeId, ResponseSpeed, SpecialCommandName } from '../types';

interface ComposerProps {
  topic: string;
  isStreaming: boolean;
  responseSpeed: ResponseSpeed;
  searchGrounding: boolean;
  selectedModeId: ResearchModeId;
  onSelectMode: (modeId: ResearchModeId) => void;
  onToggleSearchGrounding: () => void;
  onToggleResponseSpeed: () => void;
  onSend: (text: string) => void;
  onStop: () => void;
}

export function Composer({
  topic,
  isStreaming,
  responseSpeed,
  searchGrounding,
  selectedModeId,
  onSelectMode,
  onToggleSearchGrounding,
  onToggleResponseSpeed,
  onSend,
  onStop,
}: ComposerProps) {
  const [input, setInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showModePicker, setShowModePicker] = useState(false);

  const suggestions = filterCommands(input);
  const showSuggestions = suggestions.length > 0;
  const activeMode = getResearchModeById(selectedModeId);

  const submitText = () => {
    const cleaned = input.trim();
    if (!cleaned) {
      setValidationError('Enter a question or /command before sending.');
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
    <div className="bg-white/90 dark:bg-[#060913]/92 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 px-3 sm:px-8 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] shrink-0">
      <div className="max-w-3xl mx-auto space-y-2 relative">
        {/* Slash-Command Autocomplete Menu */}
        <AnimatePresence>
          {showSuggestions && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.985 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              role="listbox"
              aria-label="Command suggestions"
              className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-[#0F1629] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden z-30 max-h-60 overflow-y-auto"
            >
              {suggestions.map((def, idx) => (
                <button
                  key={def.command}
                  type="button"
                  role="option"
                  aria-selected={idx === selectedIdx}
                  onClick={() => applyCommand(def.command)}
                  className={`w-full flex items-center justify-between gap-4 px-4 py-2.5 min-h-[42px] text-left text-sm transition-colors cursor-pointer ${
                    idx === selectedIdx
                      ? 'bg-blue-50 dark:bg-slate-800'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 shrink-0">
                      {def.command}
                    </span>
                    <span className="text-xs text-slate-600 dark:text-slate-400 truncate">
                      {def.shortDesc}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0 hidden sm:inline">
                    Tab
                  </span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Inline Mode Selector Popover */}
        <AnimatePresence>
          {showModePicker && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-0 mb-2 w-72 sm:w-80 bg-white dark:bg-[#0F1629] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 z-30"
              role="menu"
              aria-label="Composer research modes"
            >
              {RESEARCH_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={m.id === selectedModeId}
                  onClick={() => {
                    onSelectMode(m.id);
                    setShowModePicker(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl transition-colors cursor-pointer ${
                    m.id === selectedModeId
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <p className="text-xs font-semibold">{m.label}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                    {m.description}
                  </p>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-1.5" noValidate>
          <label htmlFor="expert-chat-input" className="sr-only">
            Ask Athenaeum anything about {topic}
          </label>
          <div className="bg-slate-50 dark:bg-[#0D1426] border border-slate-200 dark:border-slate-800 focus-within:bg-white dark:focus-within:bg-[#0F172B] focus-within:border-blue-500 dark:focus-within:border-blue-500/70 focus-within:ring-2 focus-within:ring-blue-500/15 rounded-2xl p-2 sm:p-2.5 shadow-xs transition-all">
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
              placeholder="Ask Athenaeum anything..."
              className="w-full resize-none bg-transparent text-[15px] sm:text-base text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none px-2 py-1 max-h-40 leading-relaxed"
            />

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/80">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setShowModePicker((prev) => !prev)}
                  aria-expanded={showModePicker}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[34px] text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-[#060913] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>{activeMode.shortLabel}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={onToggleSearchGrounding}
                  aria-pressed={searchGrounding}
                  title="Toggle Google Search grounding"
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[34px] text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    searchGrounding
                      ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-700/70 text-blue-700 dark:text-blue-300'
                      : 'bg-white dark:bg-[#060913] border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Search</span>
                </button>

                <button
                  type="button"
                  onClick={onToggleResponseSpeed}
                  aria-pressed={responseSpeed === 'fast'}
                  title="Toggle fast response"
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[34px] text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    responseSpeed === 'fast'
                      ? 'bg-violet-50 dark:bg-violet-950/60 border-violet-200 dark:border-violet-700/70 text-violet-700 dark:text-violet-300'
                      : 'bg-white dark:bg-[#060913] border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Fast</span>
                </button>

                {/* Quick Command Shortcuts */}
                <div className="hidden lg:flex items-center gap-1 pl-1 border-l border-slate-200 dark:border-slate-800">
                  {SPECIAL_COMMANDS.slice(0, 4).map((cmd) => (
                    <button
                      key={cmd.command}
                      type="button"
                      disabled={isStreaming}
                      onClick={() => applyCommand(cmd.command)}
                      title={cmd.shortDesc}
                      className="px-2 py-1 text-[11px] font-mono text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      {cmd.command}
                    </button>
                  ))}
                </div>
              </div>

              {isStreaming ? (
                <button
                  type="button"
                  onClick={onStop}
                  aria-label="Stop generation"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all active:scale-[0.97] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Square className="w-3 h-3 fill-current" aria-hidden="true" />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  type="submit"
                  aria-label="Send message"
                  className="inline-flex items-center justify-center w-9 h-9 sm:w-auto sm:px-3.5 sm:py-2 min-h-[38px] text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-xs transition-all duration-150 active:scale-[0.97] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                >
                  <ArrowUp className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden sm:inline ml-1.5">Send</span>
                </button>
              )}
            </div>
          </div>

          {validationError ? (
            <p role="alert" className="text-xs text-red-600 dark:text-red-400 font-medium px-1">
              {validationError}
            </p>
          ) : (
            <p className="hidden sm:block text-[11px] text-slate-400 dark:text-slate-500 px-1">
              Enter to send · Shift+Enter for new line · Type <span className="font-mono">/</span> for commands
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
