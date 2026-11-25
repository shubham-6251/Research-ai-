import { useState } from 'react';
import { AlertTriangle, Check, Globe, Monitor, Moon, Sun, Trash2, X, Zap } from 'lucide-react';
import { TTS_VOICES, type TtsVoiceName } from '../utils/ttsText';
import type { AppTheme, KnowledgeLevel, ResponseSpeed, UserSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  settings: UserSettings;
  sessionCount: number;
  onClose: () => void;
  onUpdateSettings: (patch: Partial<UserSettings>) => void;
  onClearAllHistory: () => void;
}

const DEPTH_OPTIONS: { id: KnowledgeLevel; label: string }[] = [
  { id: 'adaptive', label: 'Adaptive' },
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
];

export function SettingsModal({
  isOpen,
  settings,
  sessionCount,
  onClose,
  onUpdateSettings,
  onClearAllHistory,
}: SettingsModalProps) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearedFeedback, setClearedFeedback] = useState(false);

  if (!isOpen) return null;

  const themeOptions: { id: AppTheme; label: string; Icon: typeof Moon }[] = [
    { id: 'dark', label: 'Dark', Icon: Moon },
    { id: 'light', label: 'Light', Icon: Sun },
    { id: 'system', label: 'System', Icon: Monitor },
  ];

  const handleConfirmClear = () => {
    onClearAllHistory();
    setConfirmClear(false);
    setClearedFeedback(true);
    setTimeout(() => setClearedFeedback(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Athenaeum settings"
    >
      <div className="w-full max-w-xl max-h-[90dvh] flex flex-col bg-white dark:bg-[#0B1020] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-50">
              Settings &amp; Personalization
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Preferences are saved locally in your browser.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Sections */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Appearance */}
          <section className="space-y-2.5">
            <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Appearance
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map(({ id, label, Icon }) => {
                const active = settings.theme === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onUpdateSettings({ theme: id })}
                    aria-pressed={active}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 min-h-[42px] text-xs font-medium rounded-xl border transition-colors cursor-pointer ${
                      active
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500/60 text-blue-700 dark:text-blue-300'
                        : 'bg-slate-50 dark:bg-[#0F1629] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Response Style & Knowledge Depth */}
          <section className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Response Style &amp; Depth
            </h3>

            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: 'standard', label: 'Standard Synthesis', desc: 'Full structured depth' },
                  { id: 'fast', label: 'Fast Response', desc: 'Low-latency concise replies' },
                ] as { id: ResponseSpeed; label: string; desc: string }[]
              ).map((opt) => {
                const active = settings.defaultResponseSpeed === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onUpdateSettings({ defaultResponseSpeed: opt.id })}
                    aria-pressed={active}
                    className={`p-3 text-left rounded-xl border transition-colors cursor-pointer ${
                      active
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500/60 text-slate-900 dark:text-slate-50'
                        : 'bg-slate-50 dark:bg-[#0F1629] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      {opt.id === 'fast' && <Zap className="w-3.5 h-3.5 text-blue-500" aria-hidden="true" />}
                      <span>{opt.label}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {opt.desc}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="space-y-1.5">
              <span className="block text-xs text-slate-600 dark:text-slate-400">
                Default Explanation Level
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DEPTH_OPTIONS.map((lvl) => {
                  const active = settings.defaultLevel === lvl.id;
                  return (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => onUpdateSettings({ defaultLevel: lvl.id })}
                      aria-pressed={active}
                      className={`py-2 px-2.5 min-h-[38px] text-xs font-medium rounded-xl border transition-colors cursor-pointer ${
                        active
                          ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500/60 text-blue-700 dark:text-blue-300'
                          : 'bg-slate-50 dark:bg-[#0F1629] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {lvl.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Research Preferences */}
          <section className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Research Preferences
            </h3>

            <button
              type="button"
              onClick={() =>
                onUpdateSettings({ defaultSearchGrounding: !settings.defaultSearchGrounding })
              }
              aria-pressed={settings.defaultSearchGrounding}
              className="w-full flex items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#0F1629] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-start gap-2.5">
                <Globe className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Live Web Search Grounding by Default
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Verifies claims with clickable references; falls back gracefully on rate limits.
                  </p>
                </div>
              </div>
              <span
                className={`text-xs font-semibold shrink-0 ${
                  settings.defaultSearchGrounding
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {settings.defaultSearchGrounding ? 'On' : 'Off'}
              </span>
            </button>

            <label className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#0F1629] border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Audio Narrator Voice (TTS)
              </span>
              <select
                value={settings.ttsVoice}
                onChange={(e) =>
                  onUpdateSettings({ ttsVoice: e.target.value as TtsVoiceName })
                }
                aria-label="Default TTS voice"
                className="px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100 bg-white dark:bg-[#060913] border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
              >
                {TTS_VOICES.map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {voice.label}
                  </option>
                ))}
              </select>
            </label>
          </section>

          {/* Conversation Management */}
          <section className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Conversation Management
            </h3>

            {!confirmClear ? (
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#0F1629] border border-slate-200 dark:border-slate-800">
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Clear Saved Research History
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                    {sessionCount} {sessionCount === 1 ? 'conversation' : 'conversations'} stored
                    locally
                  </p>
                </div>

                {clearedFeedback ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    History cleared
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={sessionCount === 0}
                    onClick={() => setConfirmClear(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[36px] text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-950/70 border border-red-200 dark:border-red-800/70 rounded-lg transition-colors cursor-pointer disabled:opacity-45"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Clear History</span>
                  </button>
                )}
              </div>
            ) : (
              <div
                role="alertdialog"
                aria-label="Confirm clearing all research conversations"
                className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 space-y-3"
              >
                <div className="flex items-start gap-2.5 text-xs text-red-900 dark:text-red-200">
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    Delete all {sessionCount} saved research conversations and cached knowledge maps
                    from this browser? This cannot be undone.
                  </span>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="px-3 py-1.5 min-h-[34px] text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmClear}
                    className="px-3 py-1.5 min-h-[34px] text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer"
                  >
                    Delete All History
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Application Information */}
          <section className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Application Information
            </h3>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0F1629] border border-slate-200 dark:border-slate-800 space-y-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  Athenaeum Universal Research Assistant
                </p>
                <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                  Developed by Shubham Verma
                </span>
              </div>
              <p>
                Powered by Gemini SSE streaming, automated Knowledge Map synthesis, live Google Search
                grounding with 429/503 resilience, KaTeX math rendering, assessment generation, Gemini
                TTS narration, and PDF dossier export.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
