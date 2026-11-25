import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { Header, type WorkspaceTab } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { TopicInitScreen } from './components/TopicInitScreen';
import { MessageList } from './components/MessageList';
import { Composer } from './components/Composer';
import { KnowledgeMapView } from './components/KnowledgeMapView';
import { QuestionGeneratorView } from './components/QuestionGeneratorView';
import { ReportView } from './components/ReportView';
import { CommandsPanel, SourcesPanel } from './components/SourcesAndCommands';
import { EmptyWorkspaceTool } from './components/EmptyWorkspaceTool';
import { SettingsModal } from './components/SettingsModal';
import { AudioPlayerBar, type TtsPlayerState } from './components/AudioPlayerBar';
import { mergeUniqueSources } from './utils/citations';
import { parseCommandInput } from './utils/commands';
import { createDemoSession } from './utils/demoSeed';
import { detectMentionedItems, normalizeKnowledgeStructure } from './utils/knowledgeTree';
import { generateResearchPdf } from './utils/reportExport';
import {
  getResearchModeById,
  inferResearchModeId,
  prepareMessageForMode,
} from './utils/researchModes';
import { extractUserFriendlyError } from './utils/retry';
import type { TtsVoiceName } from './utils/ttsText';
import type {
  ChatMessage,
  GroundingSource,
  KnowledgeLevel,
  MessageFeedback,
  QuestionBank,
  ResearchModeId,
  ResponseSpeed,
  SpecialCommandName,
  TopicKnowledgeStructure,
  TopicSession,
  UserSettings,
} from './types';

const STORAGE_KEY = 'athenaeum_topic_sessions_v1';
const SETTINGS_STORAGE_KEY = 'athenaeum_settings_v1';
const LEGACY_THEME_KEY = 'athenaeum_theme_v1';

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  defaultLevel: 'adaptive',
  defaultResponseSpeed: 'fast',
  defaultSearchGrounding: true,
  ttsVoice: 'Kore',
};

function isValidSession(item: unknown): item is TopicSession {
  if (!item || typeof item !== 'object') return false;
  const s = item as Partial<TopicSession>;
  return (
    typeof s.id === 'string' &&
    typeof s.topic === 'string' &&
    Boolean(s.knowledgeMap) &&
    Array.isArray(s.messages) &&
    Array.isArray(s.allSources)
  );
}

function loadSavedSessions(): TopicSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidSession).map((s) => ({
      ...s,
      exploredItems: Array.isArray(s.exploredItems) ? s.exploredItems : [],
      messages: s.messages.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m)),
    }));
  } catch {
    return [];
  }
}

function saveSessions(sessions: TopicSession[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, 25)));
  } catch {
    // Ignore storage quota errors
  }
}

function loadSavedSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UserSettings>;
      return {
        theme:
          parsed.theme === 'dark' || parsed.theme === 'light' || parsed.theme === 'system'
            ? parsed.theme
            : DEFAULT_SETTINGS.theme,
        defaultLevel: parsed.defaultLevel ?? DEFAULT_SETTINGS.defaultLevel,
        defaultResponseSpeed:
          parsed.defaultResponseSpeed === 'fast' ? 'fast' : DEFAULT_SETTINGS.defaultResponseSpeed,
        defaultSearchGrounding:
          typeof parsed.defaultSearchGrounding === 'boolean'
            ? parsed.defaultSearchGrounding
            : DEFAULT_SETTINGS.defaultSearchGrounding,
        ttsVoice: parsed.ttsVoice ?? DEFAULT_SETTINGS.ttsVoice,
      };
    }
    const legacyTheme = localStorage.getItem(LEGACY_THEME_KEY);
    if (legacyTheme === 'light' || legacyTheme === 'dark') {
      return { ...DEFAULT_SETTINGS, theme: legacyTheme };
    }
  } catch {
    // Ignore storage errors
  }
  return DEFAULT_SETTINGS;
}

interface SseStreamEvent {
  type: 'chunk' | 'fallback' | 'done' | 'error';
  text?: string;
  sources?: GroundingSource[];
  searchGrounded?: boolean;
  responseSpeed?: ResponseSpeed;
  noteLabel?: string;
  streamingMessage?: string;
  completedMessage?: string;
  searchFallback?: {
    noteLabel: string;
    completedMessage: string;
  } | null;
  error?: string;
}

export default function App() {
  const [settings, setSettings] = useState<UserSettings>(() => loadSavedSettings());
  const [sessions, setSessions] = useState<TopicSession[]>(() => loadSavedSessions());
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        return 'demo-raft-consensus';
      }
    }
    return null;
  });
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('conversation');
  const [draftModeId, setDraftModeId] = useState<ResearchModeId>('quick');
  const [draftSearchGrounding, setDraftSearchGrounding] = useState<boolean>(
    () => loadSavedSettings().defaultSearchGrounding
  );
  const [draftResponseSpeed, setDraftResponseSpeed] = useState<ResponseSpeed>(
    () => loadSavedSettings().defaultResponseSpeed
  );

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [isInitializing, setIsInitializing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);

  const [ttsState, setTtsState] = useState<TtsPlayerState>(() => ({
    status: 'idle',
    messageId: null,
    title: '',
    sourceText: '',
    voiceName: loadSavedSettings().ttsVoice,
    playbackRate: 1,
    currentTime: 0,
    duration: 0,
    error: null,
  }));

  const abortRef = useRef<AbortController | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCacheRef = useRef<Map<string, string>>(new Map());

  // Sync Tailwind dark mode class across dark / light / system
  useEffect(() => {
    const applyTheme = () => {
      if (typeof document === 'undefined') return;
      const prefersDark =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldBeDark =
        settings.theme === 'dark' || (settings.theme === 'system' && prefersDark);
      document.documentElement.classList.toggle('dark', shouldBeDark);
    };

    applyTheme();
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage errors
    }

    if (settings.theme === 'system' && typeof window !== 'undefined') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', applyTheme);
      return () => mq.removeEventListener('change', applyTheme);
    }
  }, [settings]);

  // Seed demo session cleanly if ?autostart=1 is present
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      setSessions((prev) => {
        if (prev.some((s) => s.id === 'demo-raft-consensus')) return prev;
        return [createDemoSession(), ...prev];
      });
    }
  }, []);

  useEffect(() => {
    if (!isStreaming) {
      saveSessions(sessions);
    }
  }, [sessions, isStreaming]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;

  const activeModeId: ResearchModeId = activeSession
    ? inferResearchModeId(
        activeSession.researchModeId,
        activeSession.activeMode,
        activeSession.responseSpeed
      )
    : draftModeId;

  const effectiveSearchGrounding = activeSession
    ? activeSession.searchGrounding
    : draftSearchGrounding;

  const updateActiveSession = useCallback(
    (updater: (session: TopicSession) => TopicSession) => {
      setSessions((prev) =>
        prev.map((s) => (s.id === activeSessionId ? updater(s) : s))
      );
    },
    [activeSessionId]
  );

  const handleUpdateSettings = useCallback((patch: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    if (typeof patch.defaultSearchGrounding === 'boolean') {
      setDraftSearchGrounding(patch.defaultSearchGrounding);
    }
    if (patch.defaultResponseSpeed) {
      setDraftResponseSpeed(patch.defaultResponseSpeed);
    }
    if (patch.ttsVoice) {
      setTtsState((prev) => ({ ...prev, voiceName: patch.ttsVoice! }));
    }
  }, []);

  const handleStopStreaming = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
    updateActiveSession((s) => ({
      ...s,
      messages: s.messages.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m)),
    }));
  }, [updateActiveSession]);

  const streamIntoSession = useCallback(
    async (
      targetSession: TopicSession,
      rawText: string,
      options?: {
        truncateBeforeMessageId?: string;
        overrideModeId?: ResearchModeId;
      }
    ) => {
      if (isStreaming) return;

      const modeId =
        options?.overrideModeId ??
        inferResearchModeId(
          targetSession.researchModeId,
          targetSession.activeMode,
          targetSession.responseSpeed
        );
      const modeOption = getResearchModeById(modeId);
      const prepared = prepareMessageForMode(rawText, modeId);
      const parsed = parseCommandInput(prepared.dispatchText);

      const userMsgId = `u-${Date.now()}`;
      const assistantMsgId = `a-${Date.now() + 1}`;
      const now = new Date().toISOString();

      // Keep clean user-facing text in chat bubble while dispatching mode-enhanced instruction
      const userMessage: ChatMessage = {
        id: userMsgId,
        role: 'user',
        content: rawText.trim(),
        command: parsed.command,
        modeLabel: prepared.modeLabel,
        timestamp: now,
      };

      const requestSpeed: ResponseSpeed =
        modeOption.forcedSpeed ?? targetSession.responseSpeed ?? 'standard';
      const requestMode = prepared.apiMode;

      const placeholderAssistant: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        command: parsed.command,
        modeLabel: parsed.command ? parsed.modeLabel : prepared.modeLabel,
        searchGrounded: targetSession.searchGrounding,
        responseSpeed: requestSpeed,
        timestamp: now,
        isStreaming: true,
      };

      let baseMessages = targetSession.messages;
      if (options?.truncateBeforeMessageId) {
        const idx = baseMessages.findIndex((m) => m.id === options.truncateBeforeMessageId);
        if (idx !== -1) {
          baseMessages = baseMessages.slice(0, idx);
        }
      }

      const priorHistory = baseMessages
        .filter((m) => !m.error && m.content.trim().length > 0)
        .map((m) => ({ role: m.role, content: m.content }));

      setSessions((prev) =>
        prev.map((s) =>
          s.id === targetSession.id
            ? {
                ...s,
                updatedAt: now,
                messages: [...baseMessages, userMessage, placeholderAssistant],
              }
            : s
        )
      );

      setIsStreaming(true);
      const controller = new AbortController();
      abortRef.current = controller;

      let accumulatedText = '';
      let finalSources: GroundingSource[] = [];
      let finalSearchGrounded = targetSession.searchGrounding;
      let finalResponseSpeed: ResponseSpeed = requestSpeed;
      let finalGroundingNote: string | undefined;
      let finalGroundingNotice: string | undefined;
      let pendingRafId: number | null = null;

      const flushStreamText = () => {
        pendingRafId = null;
        const currentText = accumulatedText;
        setSessions((prev) =>
          prev.map((s) =>
            s.id === targetSession.id
              ? {
                  ...s,
                  messages: s.messages.map((m) =>
                    m.id === assistantMsgId ? { ...m, content: currentText } : m
                  ),
                }
              : s
          )
        );
      };

      const scheduleChunkFlush = () => {
        if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
          if (pendingRafId === null) {
            pendingRafId = window.requestAnimationFrame(flushStreamText);
          }
        } else {
          flushStreamText();
        }
      };

      const processSseLine = (line: string) => {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) return;
        const jsonStr = trimmed.slice(5).trim();
        if (!jsonStr) return;

        let event: SseStreamEvent;
        try {
          event = JSON.parse(jsonStr) as SseStreamEvent;
        } catch {
          return;
        }

        if (event.type === 'fallback') {
          finalSearchGrounded = false;
          finalGroundingNote = event.noteLabel;
          finalGroundingNotice = event.completedMessage;
          setSessions((prev) =>
            prev.map((s) =>
              s.id === targetSession.id
                ? {
                    ...s,
                    messages: s.messages.map((m) =>
                      m.id === assistantMsgId
                        ? {
                            ...m,
                            searchGrounded: false,
                            groundingNote: event.noteLabel,
                            groundingNotice: event.streamingMessage,
                          }
                        : m
                    ),
                  }
                : s
            )
          );
        } else if (event.type === 'chunk' && event.text) {
          accumulatedText += event.text;
          scheduleChunkFlush();
        } else if (event.type === 'done') {
          if (pendingRafId !== null && typeof window !== 'undefined') {
            window.cancelAnimationFrame(pendingRafId);
            pendingRafId = null;
          }
          finalSources = Array.isArray(event.sources) ? event.sources : [];
          if (typeof event.searchGrounded === 'boolean') {
            finalSearchGrounded = event.searchGrounded;
          }
          if (event.responseSpeed === 'fast' || event.responseSpeed === 'standard') {
            finalResponseSpeed = event.responseSpeed;
          }
          if (event.searchFallback) {
            finalGroundingNote = event.searchFallback.noteLabel;
            finalGroundingNotice = event.searchFallback.completedMessage;
          }
        } else if (event.type === 'error') {
          throw new Error(event.error || 'Error while generating response.');
        }
      };

      try {
        const res = await fetch('/api/topic/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            topic: targetSession.topic,
            level: targetSession.level,
            searchGrounding: targetSession.searchGrounding,
            responseSpeed: requestSpeed,
            activeMode: requestMode,
            knowledgeMap: targetSession.knowledgeMap,
            exploredItems: targetSession.exploredItems,
            history: priorHistory,
            message: prepared.dispatchText,
          }),
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson?.error || `Request failed with status ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) {
          throw new Error('Streaming response body unavailable.');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            buffer += decoder.decode();
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            processSseLine(line);
          }
        }

        if (buffer.trim()) {
          for (const trailingLine of buffer.split('\n')) {
            processSseLine(trailingLine);
          }
        }

        const newlyMentioned = detectMentionedItems(
          `${rawText}\n${accumulatedText}`,
          targetSession.knowledgeMap
        );

        setSessions((prev) =>
          prev.map((s) => {
            if (s.id !== targetSession.id) return s;
            const mergedExplored = Array.from(
              new Set([...s.exploredItems, ...newlyMentioned])
            );
            return {
              ...s,
              updatedAt: new Date().toISOString(),
              exploredItems: mergedExplored,
              allSources: mergeUniqueSources(s.allSources, finalSources),
              messages: s.messages.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      content: accumulatedText,
                      sources: finalSources,
                      searchGrounded: finalSearchGrounded,
                      responseSpeed: finalResponseSpeed,
                      groundingNote: finalGroundingNote,
                      groundingNotice: finalGroundingNotice,
                      isStreaming: false,
                    }
                  : m
              ),
            };
          })
        );
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') {
          return;
        }
        const errMsg = extractUserFriendlyError(err).message;
        setSessions((prev) =>
          prev.map((s) =>
            s.id === targetSession.id
              ? {
                  ...s,
                  messages: s.messages.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, isStreaming: false, error: errMsg }
                      : m
                  ),
                }
              : s
          )
        );
      } finally {
        if (pendingRafId !== null && typeof window !== 'undefined') {
          window.cancelAnimationFrame(pendingRafId);
          pendingRafId = null;
        }
        abortRef.current = null;
        setIsStreaming(false);
      }
    },
    [isStreaming]
  );

  const handleStartResearch = useCallback(
    async (params: {
      topic: string;
      initialQuestion?: string;
      modeId: ResearchModeId;
      level: KnowledgeLevel;
      searchGrounding: boolean;
      responseSpeed: ResponseSpeed;
    }) => {
      if (isInitializing || isStreaming) return;
      setInitError(null);

      const modeObj = getResearchModeById(params.modeId);
      const hasQuestion = Boolean(params.initialQuestion && params.initialQuestion.trim().length > 0);

      // Fast path: when user asks a question immediately, open session in 0ms and initialize Knowledge Map in parallel
      if (hasQuestion) {
        const now = new Date().toISOString();
        const sessionId = `topic-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const seedMap = normalizeKnowledgeStructure({}, params.topic);
        const newSession: TopicSession = {
          id: sessionId,
          topic: seedMap.topic,
          level: params.level,
          searchGrounding: params.searchGrounding,
          responseSpeed: params.responseSpeed,
          activeMode: modeObj.apiMode,
          researchModeId: params.modeId,
          knowledgeMap: seedMap,
          exploredItems: [],
          messages: [],
          allSources: [],
          createdAt: now,
          updatedAt: now,
        };

        setSessions((prev) => [newSession, ...prev.slice(0, 24)]);
        setActiveSessionId(sessionId);
        setActiveTab('conversation');
        setQuestionsError(null);

        await streamIntoSession(newSession, params.initialQuestion!, {
          overrideModeId: params.modeId,
        });

        // Enrich knowledge map quietly in background AFTER chat stream finishes so it never competes for latency/quota
        if (!/\bshubham\s+verma\b/i.test(params.topic)) {
          void fetch('/api/topic/initialize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic: params.topic, level: params.level }),
          })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              if (data?.knowledgeMap) {
                const richMap = data.knowledgeMap as TopicKnowledgeStructure;
                setSessions((prev) =>
                  prev.map((s) =>
                    s.id === sessionId
                      ? {
                          ...s,
                          topic: richMap.topic || s.topic,
                          knowledgeMap: richMap,
                        }
                      : s
                  )
                );
              }
            })
            .catch(() => {
              // Keep seed knowledge map silently if background enrichment fails
            });
        }
        return;
      }

      setIsInitializing(true);
      try {
        const res = await fetch('/api/topic/initialize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: params.topic, level: params.level }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || 'Failed to initialize research topic.');
        }

        const knowledgeMap = data.knowledgeMap as TopicKnowledgeStructure;
        const now = new Date().toISOString();
        const newSession: TopicSession = {
          id: `topic-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          topic: knowledgeMap.topic || params.topic,
          level: params.level,
          searchGrounding: params.searchGrounding,
          responseSpeed: params.responseSpeed,
          activeMode: modeObj.apiMode,
          researchModeId: params.modeId,
          knowledgeMap,
          exploredItems: [],
          messages: [],
          allSources: [],
          createdAt: now,
          updatedAt: now,
        };

        setSessions((prev) => [newSession, ...prev.slice(0, 24)]);
        setActiveSessionId(newSession.id);
        setActiveTab('conversation');
        setQuestionsError(null);
        setIsInitializing(false);
      } catch (err) {
        setInitError(extractUserFriendlyError(err).message);
        setIsInitializing(false);
      }
    },
    [isInitializing, isStreaming, streamIntoSession]
  );

  // Audio player lifecycle
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setTtsState((prev) => ({ ...prev, currentTime: audio.currentTime || 0 }));
    };
    const handleLoadedMetadata = () => {
      setTtsState((prev) => ({
        ...prev,
        duration: Number.isFinite(audio.duration) ? audio.duration : 0,
      }));
    };
    const handlePlay = () => {
      setTtsState((prev) => ({ ...prev, status: 'playing', error: null }));
    };
    const handlePause = () => {
      setTtsState((prev) =>
        prev.status === 'playing' ? { ...prev, status: 'paused' } : prev
      );
    };
    const handleEnded = () => {
      setTtsState((prev) => ({ ...prev, status: 'paused', currentTime: 0 }));
    };
    const handleError = () => {
      setTtsState((prev) =>
        prev.status === 'idle'
          ? prev
          : { ...prev, status: 'error', error: 'Unable to decode or play generated audio.' }
      );
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.src = '';
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      for (const url of audioCacheRef.current.values()) {
        URL.revokeObjectURL(url);
      }
      audioCacheRef.current.clear();
    };
  }, []);

  const closeTtsPlayer = useCallback(() => {
    ttsAbortRef.current?.abort();
    ttsAbortRef.current = null;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    setTtsState((prev) => ({
      ...prev,
      status: 'idle',
      messageId: null,
      title: '',
      sourceText: '',
      currentTime: 0,
      duration: 0,
      error: null,
    }));
  }, []);

  const startTtsPlayback = useCallback(
    async (
      messageId: string,
      title: string,
      text: string,
      voiceOverride?: TtsVoiceName,
      rateOverride?: number
    ) => {
      const audio = audioRef.current;
      if (!audio) return;

      const voice = voiceOverride ?? ttsState.voiceName;
      const rate = rateOverride ?? ttsState.playbackRate;

      if (
        !voiceOverride &&
        ttsState.messageId === messageId &&
        (ttsState.status === 'playing' || ttsState.status === 'paused') &&
        audio.src
      ) {
        if (ttsState.status === 'playing') {
          audio.pause();
        } else {
          await audio.play().catch(() => {});
        }
        return;
      }

      ttsAbortRef.current?.abort();
      const controller = new AbortController();
      ttsAbortRef.current = controller;

      audio.pause();
      const cacheKey = `${messageId}::${voice}`;
      const cachedUrl = audioCacheRef.current.get(cacheKey);

      if (cachedUrl) {
        setTtsState((prev) => ({
          ...prev,
          status: 'playing',
          messageId,
          title,
          sourceText: text,
          voiceName: voice,
          playbackRate: rate,
          currentTime: 0,
          duration: 0,
          error: null,
        }));
        audio.src = cachedUrl;
        audio.playbackRate = rate;
        await audio.play().catch(() => {});
        return;
      }

      setTtsState((prev) => ({
        ...prev,
        status: 'loading',
        messageId,
        title,
        sourceText: text,
        voiceName: voice,
        playbackRate: rate,
        currentTime: 0,
        duration: 0,
        error: null,
      }));

      try {
        const res = await fetch('/api/topic/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({ text, voiceName: voice }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || 'Failed to generate speech audio.');
        }

        const binaryStr = atob(data.audioBase64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: data.mimeType || 'audio/wav' });
        const objectUrl = URL.createObjectURL(blob);
        audioCacheRef.current.set(cacheKey, objectUrl);

        if (controller.signal.aborted) return;

        audio.src = objectUrl;
        audio.playbackRate = rate;
        await audio.play();
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        setTtsState((prev) => ({
          ...prev,
          status: 'error',
          error: extractUserFriendlyError(err).message,
        }));
      } finally {
        if (ttsAbortRef.current === controller) {
          ttsAbortRef.current = null;
        }
      }
    },
    [ttsState.messageId, ttsState.playbackRate, ttsState.status, ttsState.voiceName]
  );

  const handleToggleTtsPlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    if (ttsState.status === 'playing') {
      audio.pause();
    } else if (ttsState.status === 'paused') {
      audio.play().catch(() => {});
    }
  }, [ttsState.status]);

  const handleSeekTts = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(time)) return;
    audio.currentTime = Math.max(0, time);
    setTtsState((prev) => ({ ...prev, currentTime: audio.currentTime }));
  }, []);

  const handleChangeTtsRate = useCallback((rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
    setTtsState((prev) => ({ ...prev, playbackRate: rate }));
  }, []);

  const handleChangeTtsVoice = useCallback(
    (voice: TtsVoiceName) => {
      if (ttsState.messageId && ttsState.sourceText) {
        startTtsPlayback(
          ttsState.messageId,
          ttsState.title,
          ttsState.sourceText,
          voice,
          ttsState.playbackRate
        );
      } else {
        setTtsState((prev) => ({ ...prev, voiceName: voice }));
      }
    },
    [startTtsPlayback, ttsState.messageId, ttsState.playbackRate, ttsState.sourceText, ttsState.title]
  );

  const handleNewResearch = useCallback(() => {
    if (isStreaming) {
      handleStopStreaming();
    }
    closeTtsPlayer();
    setActiveSessionId(null);
    setInitError(null);
    setQuestionsError(null);
    setIsMobileDrawerOpen(false);
    setActiveTab('conversation');
  }, [isStreaming, handleStopStreaming, closeTtsPlayer]);

  const handleSelectSession = useCallback(
    (sessionId: string, targetTab: WorkspaceTab = 'conversation') => {
      if (isStreaming) {
        handleStopStreaming();
      }
      closeTtsPlayer();
      setActiveSessionId(sessionId);
      setQuestionsError(null);
      setIsMobileDrawerOpen(false);
      setActiveTab(targetTab);
    },
    [isStreaming, handleStopStreaming, closeTtsPlayer]
  );

  const handleDeleteSession = useCallback(
    (sessionId: string) => {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setActiveTab('conversation');
      }
    },
    [activeSessionId]
  );

  const handleClearAllHistory = useCallback(() => {
    if (isStreaming) {
      handleStopStreaming();
    }
    closeTtsPlayer();
    setSessions([]);
    setActiveSessionId(null);
    setActiveTab('conversation');
  }, [isStreaming, handleStopStreaming, closeTtsPlayer]);

  const handleSelectMode = useCallback(
    (modeId: ResearchModeId) => {
      const modeOpt = getResearchModeById(modeId);
      if (activeSession) {
        updateActiveSession((s) => ({
          ...s,
          researchModeId: modeId,
          activeMode: modeOpt.apiMode,
          responseSpeed: modeOpt.forcedSpeed ?? s.responseSpeed ?? 'fast',
        }));
      } else {
        setDraftModeId(modeId);
        if (modeOpt.forcedSpeed) setDraftResponseSpeed(modeOpt.forcedSpeed);
      }
    },
    [activeSession, updateActiveSession]
  );

  const handleSendMessage = useCallback(
    async (rawText: string) => {
      if (!activeSession || isStreaming) return;

      const parsed = parseCommandInput(rawText);
      if (parsed.isChangeTopic) {
        if (parsed.argument.length > 0) {
          await handleStartResearch({
            topic: parsed.argument,
            modeId: activeModeId,
            level: activeSession.level,
            searchGrounding: activeSession.searchGrounding,
            responseSpeed: activeSession.responseSpeed ?? 'standard',
          });
        } else {
          handleNewResearch();
        }
        return;
      }

      setActiveTab('conversation');
      setIsMobileDrawerOpen(false);
      await streamIntoSession(activeSession, rawText);
    },
    [activeSession, isStreaming, activeModeId, handleStartResearch, handleNewResearch, streamIntoSession]
  );

  const handleEditAndResend = useCallback(
    async (userMessageId: string, editedText: string) => {
      if (!activeSession || isStreaming) return;
      await streamIntoSession(activeSession, editedText, {
        truncateBeforeMessageId: userMessageId,
      });
    },
    [activeSession, isStreaming, streamIntoSession]
  );

  const handleRetryMessage = useCallback(
    async (assistantMsgId: string) => {
      if (!activeSession || isStreaming) return;
      const idx = activeSession.messages.findIndex((m) => m.id === assistantMsgId);
      if (idx <= 0) return;
      const precedingUser = activeSession.messages[idx - 1];
      if (!precedingUser || precedingUser.role !== 'user') return;

      await streamIntoSession(activeSession, precedingUser.content, {
        truncateBeforeMessageId: precedingUser.id,
      });
    },
    [activeSession, isStreaming, streamIntoSession]
  );

  const handleFeedback = useCallback(
    (messageId: string, feedback: MessageFeedback) => {
      updateActiveSession((s) => ({
        ...s,
        messages: s.messages.map((m) =>
          m.id === messageId ? { ...m, feedback } : m
        ),
      }));
    },
    [updateActiveSession]
  );

  const handleGenerateQuestions = useCallback(
    async (focus: string, difficulty: KnowledgeLevel) => {
      if (!activeSession || isGeneratingQuestions) return;
      const targetSessionId = activeSession.id;
      setIsGeneratingQuestions(true);
      setQuestionsError(null);

      try {
        const res = await fetch('/api/topic/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: activeSession.topic,
            focus,
            difficulty,
            knowledgeMap: activeSession.knowledgeMap,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || 'Failed to generate question bank.');
        }

        const questionBank = data.questionBank as QuestionBank;
        setSessions((prev) =>
          prev.map((s) =>
            s.id === targetSessionId
              ? {
                  ...s,
                  questionBank,
                  updatedAt: new Date().toISOString(),
                }
              : s
          )
        );
      } catch (err) {
        setQuestionsError(extractUserFriendlyError(err).message);
      } finally {
        setIsGeneratingQuestions(false);
      }
    },
    [activeSession, isGeneratingQuestions]
  );

  const handleExportPdf = useCallback(() => {
    if (!activeSession) return;
    generateResearchPdf(activeSession);
  }, [activeSession]);

  const handleTriggerCommandFromPanel = (cmd: SpecialCommandName) => {
    if (!activeSession) return;
    if (cmd === '/change-topic') {
      handleNewResearch();
      return;
    }
    handleSendMessage(`${cmd} ${activeSession.topic}`);
  };

  // Aggregated sources across all sessions when viewing Saved Sources outside a single session
  const aggregatedSources = useMemo(() => {
    if (activeSession) return activeSession.allSources;
    return sessions.reduce<GroundingSource[]>(
      (acc, s) => mergeUniqueSources(acc, s.allSources),
      []
    );
  }, [activeSession, sessions]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="h-dvh w-full overflow-hidden flex bg-[#F8FAFC] dark:bg-[#060913] text-slate-900 dark:text-slate-50">
        <Sidebar
          sessions={sessions}
          activeSession={activeSession}
          activeTab={activeTab}
          isCollapsed={isSidebarCollapsed}
          isMobileOpen={isMobileDrawerOpen}
          isBusy={isStreaming || isInitializing}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          onCloseMobile={() => setIsMobileDrawerOpen(false)}
          onNewResearch={handleNewResearch}
          onSelectSession={(id) => handleSelectSession(id, 'conversation')}
          onDeleteSession={handleDeleteSession}
          onSelectTab={(tab) => setActiveTab(tab)}
          onQuickPrompt={(prompt) => handleSendMessage(prompt)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
          <Header
            activeSession={activeSession}
            activeTab={activeTab}
            selectedModeId={activeModeId}
            searchGrounding={effectiveSearchGrounding}
            isSidebarCollapsed={isSidebarCollapsed}
            isStreaming={isStreaming}
            isInitializing={isInitializing}
            onExpandSidebar={() => setIsSidebarCollapsed(false)}
            onOpenMobileMenu={() => setIsMobileDrawerOpen(true)}
            onSelectMode={handleSelectMode}
            onSelectTab={setActiveTab}
            onExportPdf={handleExportPdf}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />

          {activeSession && (
            <AudioPlayerBar
              state={ttsState}
              activeTab={activeTab}
              onTogglePlayPause={handleToggleTtsPlayPause}
              onSeek={handleSeekTts}
              onChangeRate={handleChangeTtsRate}
              onChangeVoice={handleChangeTtsVoice}
              onRetry={() => {
                if (ttsState.messageId && ttsState.sourceText) {
                  startTtsPlayback(
                    ttsState.messageId,
                    ttsState.title,
                    ttsState.sourceText,
                    ttsState.voiceName,
                    ttsState.playbackRate
                  );
                }
              }}
              onClose={closeTtsPlayer}
              onSwitchTab={setActiveTab}
            />
          )}

          {!activeSession ? (
            activeTab === 'sources' ? (
              <SourcesPanel
                topic="All Saved Sessions"
                sources={aggregatedSources}
                isBusy={isInitializing}
                onFetchSources={() => setActiveTab('conversation')}
              />
            ) : activeTab === 'knowledge' || activeTab === 'questions' || activeTab === 'report' ? (
              <EmptyWorkspaceTool
                tab={activeTab}
                sessions={sessions}
                onSelectSessionForTab={(id, tab) => handleSelectSession(id, tab)}
                onNewResearch={() => setActiveTab('conversation')}
              />
            ) : (
              <TopicInitScreen
                isInitializing={isInitializing}
                error={initError}
                selectedModeId={activeModeId}
                searchGrounding={draftSearchGrounding}
                responseSpeed={draftResponseSpeed}
                defaultLevel={settings.defaultLevel}
                onSelectMode={handleSelectMode}
                onToggleSearchGrounding={() => setDraftSearchGrounding((prev) => !prev)}
                onToggleResponseSpeed={() =>
                  setDraftResponseSpeed((prev) => (prev === 'fast' ? 'standard' : 'fast'))
                }
                onStartResearch={handleStartResearch}
              />
            )
          ) : (
            <main className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
              {activeTab === 'conversation' && (
                <>
                  <MessageList
                    session={activeSession}
                    isStreaming={isStreaming}
                    ttsState={ttsState}
                    onListen={(id, title, text) => startTtsPlayback(id, title, text)}
                    onRetryMessage={handleRetryMessage}
                    onEditAndResend={handleEditAndResend}
                    onFeedback={handleFeedback}
                    onQuickPrompt={(prompt) => handleSendMessage(prompt)}
                    onOpenQuestions={() => setActiveTab('questions')}
                    onExportPdf={handleExportPdf}
                  />
                  <Composer
                    topic={activeSession.topic}
                    isStreaming={isStreaming}
                    responseSpeed={activeSession.responseSpeed ?? 'standard'}
                    searchGrounding={activeSession.searchGrounding}
                    selectedModeId={activeModeId}
                    onSelectMode={handleSelectMode}
                    onToggleSearchGrounding={() =>
                      updateActiveSession((s) => ({
                        ...s,
                        searchGrounding: !s.searchGrounding,
                      }))
                    }
                    onToggleResponseSpeed={() =>
                      updateActiveSession((s) => ({
                        ...s,
                        responseSpeed:
                          (s.responseSpeed ?? 'standard') === 'fast' ? 'standard' : 'fast',
                      }))
                    }
                    onSend={handleSendMessage}
                    onStop={handleStopStreaming}
                  />
                </>
              )}

              {activeTab === 'knowledge' && (
                <KnowledgeMapView
                  session={activeSession}
                  isBusy={isStreaming}
                  onSelectSubtopic={(sub) => handleSendMessage(`/explain ${sub}`)}
                />
              )}

              {activeTab === 'questions' && (
                <QuestionGeneratorView
                  session={activeSession}
                  isGenerating={isGeneratingQuestions}
                  error={questionsError}
                  onGenerate={handleGenerateQuestions}
                  onAskFollowUp={(prompt) => handleSendMessage(prompt)}
                />
              )}

              {activeTab === 'sources' && (
                <SourcesPanel
                  topic={activeSession.topic}
                  sources={activeSession.allSources}
                  isBusy={isStreaming}
                  onFetchSources={() =>
                    handleSendMessage(`/sources ${activeSession.topic}`)
                  }
                />
              )}

              {activeTab === 'report' && (
                <ReportView
                  session={activeSession}
                  isBusy={isStreaming}
                  onRunCommand={(prompt) => handleSendMessage(prompt)}
                />
              )}

              {activeTab === 'commands' && (
                <CommandsPanel
                  topic={activeSession.topic}
                  onTriggerCommand={handleTriggerCommandFromPanel}
                />
              )}
            </main>
          )}
        </div>

        <SettingsModal
          isOpen={isSettingsOpen}
          settings={settings}
          sessionCount={sessions.length}
          onClose={() => setIsSettingsOpen(false)}
          onUpdateSettings={handleUpdateSettings}
          onClearAllHistory={handleClearAllHistory}
        />
      </div>
    </MotionConfig>
  );
}
