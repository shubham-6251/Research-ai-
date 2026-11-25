import { Loader2, Map, MessageSquare, Pause, Play, Volume2, X } from 'lucide-react';
import { formatAudioTime, TTS_VOICES, type TtsVoiceName } from '../utils/ttsText';
import type { WorkspaceTab } from './Header';

export interface TtsPlayerState {
  status: 'idle' | 'loading' | 'playing' | 'paused' | 'error';
  messageId: string | null;
  title: string;
  sourceText: string;
  voiceName: TtsVoiceName;
  playbackRate: number;
  currentTime: number;
  duration: number;
  error: string | null;
}

interface AudioPlayerBarProps {
  state: TtsPlayerState;
  activeTab: WorkspaceTab;
  onTogglePlayPause: () => void;
  onSeek: (time: number) => void;
  onChangeRate: (rate: number) => void;
  onChangeVoice: (voice: TtsVoiceName) => void;
  onRetry: () => void;
  onClose: () => void;
  onSwitchTab: (tab: WorkspaceTab) => void;
}

const RATES = [0.85, 1, 1.25, 1.5];

export function AudioPlayerBar({
  state,
  activeTab,
  onTogglePlayPause,
  onSeek,
  onChangeRate,
  onChangeVoice,
  onRetry,
  onClose,
  onSwitchTab,
}: AudioPlayerBarProps) {
  if (state.status === 'idle') return null;

  const nextRate = () => {
    const idx = RATES.indexOf(state.playbackRate);
    const next = RATES[(idx + 1) % RATES.length];
    onChangeRate(next);
  };

  const progressMax = state.duration > 0 ? state.duration : 1;

  return (
    <section
      aria-label="Audio explanation player"
      data-testid="audio-player-bar"
      className="bg-white/90 dark:bg-[#0F172A]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-2.5 shrink-0"
    >
      <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Play/Pause + Track Title */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {state.status === 'loading' ? (
            <div
              className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-blue-500/40 flex items-center justify-center shrink-0"
              aria-label="Generating speech audio"
            >
              <Loader2
                className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin"
                aria-hidden="true"
              />
            </div>
          ) : state.status === 'error' ? (
            <div
              className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 flex items-center justify-center shrink-0"
              aria-hidden="true"
            >
              <Volume2 className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
          ) : (
            <button
              type="button"
              onClick={onTogglePlayPause}
              aria-label={state.status === 'playing' ? 'Pause audio' : 'Play audio'}
              className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
            >
              {state.status === 'playing' ? (
                <Pause className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" aria-hidden="true" />
              )}
            </button>
          )}

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-50 truncate">
              {state.status === 'loading'
                ? `Preparing audio: ${state.title}`
                : state.status === 'error'
                  ? `Audio unavailable: ${state.title}`
                  : state.title}
            </p>
            {state.status === 'error' ? (
              <p role="alert" className="text-[11px] text-red-600 dark:text-red-400 truncate">
                {state.error}
              </p>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="range"
                  aria-label="Audio playback position"
                  min={0}
                  max={progressMax}
                  step={0.25}
                  value={Math.min(state.currentTime, progressMax)}
                  disabled={state.status === 'loading' || state.duration <= 0}
                  onChange={(e) => onSeek(Number(e.target.value))}
                  className="w-full max-w-[220px] h-1.5 accent-blue-600 dark:accent-blue-500 cursor-pointer disabled:opacity-50"
                />
                <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap shrink-0">
                  {formatAudioTime(state.currentTime)} / {formatAudioTime(state.duration)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Speed, Voice, Tab Shortcut, Close */}
        <div className="flex items-center gap-2 shrink-0">
          {state.status === 'error' && (
            <button
              type="button"
              onClick={onRetry}
              className="px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              Retry
            </button>
          )}

          <button
            type="button"
            onClick={nextRate}
            aria-label={`Playback speed ${state.playbackRate}x`}
            className="px-2 py-1 text-xs font-mono font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-50 bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 rounded-lg transition-colors whitespace-nowrap tabular-nums cursor-pointer"
          >
            {state.playbackRate}x
          </button>

          <select
            aria-label="Narrator voice"
            value={state.voiceName}
            onChange={(e) => onChangeVoice(e.target.value as TtsVoiceName)}
            className="hidden sm:block py-1 px-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-blue-600 cursor-pointer"
          >
            {TTS_VOICES.map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.label}
              </option>
            ))}
          </select>

          {activeTab !== 'knowledge' ? (
            <button
              type="button"
              onClick={() => onSwitchTab('knowledge')}
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 border border-blue-200 dark:border-blue-500/40 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Map className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Browse Knowledge Map</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onSwitchTab('conversation')}
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Back to Chat</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Close audio player"
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
