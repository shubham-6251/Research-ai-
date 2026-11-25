import { useCallback, useEffect, useRef, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { Header, type WorkspaceTab } from './components/Header';
import { TopicInitScreen } from './components/TopicInitScreen';
import { KnowledgeSidebar } from './components/KnowledgeSidebar';
import { MessageList } from './components/MessageList';
import { Composer } from './components/Composer';
import { KnowledgeMapView } from './components/KnowledgeMapView';
import { QuestionGeneratorView } from './components/QuestionGeneratorView';
import { ReportView } from './components/ReportView';
import { HistoryDrawer } from './components/HistoryDrawer';
import { CommandsPanel, SourcesPanel } from './components/SourcesAndCommands';
import { AudioPlayerBar, type TtsPlayerState } from './components/AudioPlayerBar';
import { mergeUniqueSources } from './utils/citations';
import { parseCommandInput } from './utils/commands';
import { createDemoSession } from './utils/demoSeed';
import { detectMentionedItems } from './utils/knowledgeTree';
import { generateResearchPdf } from './utils/reportExport';
import { extractUserFriendlyError } from './utils/retry';
import type { TtsVoiceName } from './utils/ttsText';
import type {
  ChatMessage,
  GroundingSource,
  KnowledgeLevel,
  QuestionBank,
  ResearchMode,
  ResponseSpeed,
  SpecialCommandName,
  TopicKnowledgeStructure,
  TopicSession,
} from './types';

const STORAGE_KEY = 'athenaeum_topic_sessions_v1';
const THEME_STORAGE_KEY = 'athenaeum_theme_v1';

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

function loadSavedTheme(): 'light' | 'dark' {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === 'dark' || raw === 'light') return raw;
  } catch {
    // Ignore storage errors
  }
  return 'light';
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
  const [theme, setTheme] = useState<'light' | 'dark'>(() => loadSavedTheme());
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
  const [isInitializing, setIsInitializing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [ttsState, setTtsState] = useState<TtsPlayerState>({
    status: 'idle',
    messageId: null,
    title: '',
    sourceText: '',
    voiceName: 'Kore',
    playbackRate: 1,
    currentTime: 0,
    duration: 0,
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCacheRef = useRef<Map<string, string>>(new Map());

  // Sync Tailwind dark mode class
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

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
    saveSessions(sessions);
  }, [sessions]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;

  const updateActiveSession = useCallback(
    (updater: (session: TopicSession) => TopicSession) => {
      setSessions((prev) =>
        prev.map((s) => (s.id === activeSessionId ? updater(s) : s))
      );
    },
    [activeSessionId]
  );

  const handleInitializeTopic = useCallback(
    async (
      topic: string,
      level: KnowledgeLevel,
      searchGrounding: boolean,
      mode: ResearchMode = 'research'
    ) => {
      setIsInitializing(true);
      setInitError(null);
      try {
        const res = await fetch('/api/topic/initialize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, level }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || 'Failed to initialize topic expert.');
        }

        const knowledgeMap = data.knowledgeMap as TopicKnowledgeStructure;
        const now = new Date().toISOString();
        const newSession: TopicSession = {
          id: `topic-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          topic: knowledgeMap.topic || topic,
          level,
          searchGrounding,
          responseSpeed: 'standard',
          activeMode: mode,
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
      } catch (err) {
        setInitError(extractUserFriendlyError(err).message);
      } finally {
        setIsInitializing(false);
      }
    },
    []
  );

  const handleStopStreaming = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
    updateActiveSession((s) => ({
      ...s,
      messages: s.messages.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m)),
    }));
  }, [updateActiveSession]);

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

  const handleNewTopic = useCallback(() => {
    if (isStreaming) {
      handleStopStreaming();
    }
    closeTtsPlayer();
    setActiveSessionId(null);
    setInitError(null);
    setQuestionsError(null);
    setIsMobileSidebarOpen(false);
    setActiveTab('conversation');
  }, [isStreaming, handleStopStreaming, closeTtsPlayer]);

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      if (isStreaming) {
        handleStopStreaming();
      }
      closeTtsPlayer();
      setActiveSessionId(sessionId);
      setQuestionsError(null);
      setIsMobileSidebarOpen(false);
      setActiveTab('conversation');
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

  const handleSendMessage = useCallback(
    async (rawText: string, replaceIds?: { userMsgId: string; assistantMsgId: string }) => {
      if (!activeSession || isStreaming) return;

      const parsed = parseCommandInput(rawText);

      // Handle /change-topic directly
      if (parsed.isChangeTopic) {
        if (parsed.argument.length > 0) {
          await handleInitializeTopic(
            parsed.argument,
            activeSession.level,
            activeSession.searchGrounding,
            activeSession.activeMode ?? 'research'
          );
        } else {
          handleNewTopic();
        }
        return;
      }

      setActiveTab('conversation');
      setIsMobileSidebarOpen(false);

      const userMsgId = `u-${Date.now()}`;
      const assistantMsgId = `a-${Date.now() + 1}`;
      const now = new Date().toISOString();

      const userMessage: ChatMessage = {
        id: userMsgId,
        role: 'user',
        content: rawText,
        command: parsed.command,
        modeLabel: parsed.modeLabel,
        timestamp: now,
      };

      const requestSpeed: ResponseSpeed = activeSession.responseSpeed ?? 'standard';
      const requestMode: ResearchMode = activeSession.activeMode ?? 'qa';

      const placeholderAssistant: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        command: parsed.command,
        modeLabel: parsed.modeLabel,
        searchGrounded: activeSession.searchGrounding,
        responseSpeed: requestSpeed,
        timestamp: now,
        isStreaming: true,
      };

      const filteredMessages = replaceIds
        ? activeSession.messages.filter(
            (m) => m.id !== replaceIds.userMsgId && m.id !== replaceIds.assistantMsgId
          )
        : activeSession.messages;

      const priorHistory = filteredMessages
        .filter((m) => !m.error && m.content.trim().length > 0)
        .map((m) => ({ role: m.role, content: m.content }));

      const sessionSnapshot = activeSession;

      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionSnapshot.id
            ? {
                ...s,
                updatedAt: now,
                messages: [
                  ...(replaceIds
                    ? s.messages.filter(
                        (m) =>
                          m.id !== replaceIds.userMsgId &&
                          m.id !== replaceIds.assistantMsgId
                      )
                    : s.messages),
                  userMessage,
                  placeholderAssistant,
                ],
              }
            : s
        )
      );

      setIsStreaming(true);
      const controller = new AbortController();
      abortRef.current = controller;

      let accumulatedText = '';
      let finalSources: GroundingSource[] = [];
      let finalSearchGrounded = sessionSnapshot.searchGrounding;
      let finalResponseSpeed: ResponseSpeed = requestSpeed;
      let finalGroundingNote: string | undefined;
      let finalGroundingNotice: string | undefined;

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
              s.id === sessionSnapshot.id
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
          const currentText = accumulatedText;
          setSessions((prev) =>
            prev.map((s) =>
              s.id === sessionSnapshot.id
                ? {
                    ...s,
                    messages: s.messages.map((m) =>
                      m.id === assistantMsgId ? { ...m, content: currentText } : m
                    ),
                  }
                : s
            )
          );
        } else if (event.type === 'done') {
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
            topic: sessionSnapshot.topic,
            level: sessionSnapshot.level,
            searchGrounding: sessionSnapshot.searchGrounding,
            responseSpeed: requestSpeed,
            activeMode: requestMode,
            knowledgeMap: sessionSnapshot.knowledgeMap,
            exploredItems: sessionSnapshot.exploredItems,
            history: priorHistory,
            message: rawText,
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
          sessionSnapshot.knowledgeMap
        );

        setSessions((prev) =>
          prev.map((s) => {
            if (s.id !== sessionSnapshot.id) return s;
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
            s.id === sessionSnapshot.id
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
        abortRef.current = null;
        setIsStreaming(false);
      }
    },
    [activeSession, isStreaming, handleInitializeTopic, handleNewTopic]
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

  const handleJumpToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (sectionId === 'topic-input') {
        el.focus();
      }
    }
  };

  const handleRetryMessage = useCallback(
    async (failedAssistantId: string) => {
      if (!activeSession || isStreaming) return;
      const idx = activeSession.messages.findIndex((m) => m.id === failedAssistantId);
      if (idx <= 0) return;
      const precedingUser = activeSession.messages[idx - 1];
      if (!precedingUser || precedingUser.role !== 'user') return;

      await handleSendMessage(precedingUser.content, {
        userMsgId: precedingUser.id,
        assistantMsgId: failedAssistantId,
      });
    },
    [activeSession, isStreaming, handleSendMessage]
  );

  const handleTriggerCommandFromPanel = (cmd: SpecialCommandName) => {
    if (!activeSession) return;
    if (cmd === '/change-topic') {
      handleNewTopic();
      return;
    }
    handleSendMessage(`${cmd} ${activeSession.topic}`);
  };

  return (
    <div
      className={
        activeSession
          ? 'h-screen overflow-hidden flex flex-col bg-[#FAF9F6] dark:bg-[#0B1120] text-[#18181B] dark:text-[#F8FAFC]'
          : 'min-h-screen flex flex-col bg-[#FAF9F6] dark:bg-[#0B1120] text-[#18181B] dark:text-[#F8FAFC]'
      }
    >
      <Header
        inWorkspace={Boolean(activeSession)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onNewTopic={handleNewTopic}
        onJumpToSection={handleJumpToSection}
      />

      {!activeSession ? (
        <TopicInitScreen
          isInitializing={isInitializing}
          error={initError}
          recentSessions={sessions}
          theme={theme}
          onToggleTheme={toggleTheme}
          onInitializeTopic={handleInitializeTopic}
          onResumeSession={handleSelectSession}
          onDeleteSession={handleDeleteSession}
        />
      ) : (
        <div className="flex-1 min-h-0 flex flex-col md:flex-row max-w-[1440px] w-full mx-auto overflow-hidden">
          {/* Desktop Sidebar */}
          <aside className="hidden md:block w-[300px] lg:w-[320px] shrink-0 h-full min-h-0 overflow-hidden">
            <KnowledgeSidebar
              session={activeSession}
              sessionCount={sessions.length}
              theme={theme}
              onToggleTheme={toggleTheme}
              onOpenHistory={() => setIsHistoryOpen(true)}
              onExportPdf={handleExportPdf}
              onOpenCommands={() => setActiveTab('commands')}
              onChangeMode={(activeMode) =>
                updateActiveSession((s) => ({ ...s, activeMode }))
              }
              onChangeLevel={(level) =>
                updateActiveSession((s) => ({ ...s, level }))
              }
              onChangeResponseSpeed={(responseSpeed) =>
                updateActiveSession((s) => ({ ...s, responseSpeed }))
              }
              onToggleSearch={() =>
                updateActiveSession((s) => ({
                  ...s,
                  searchGrounding: !s.searchGrounding,
                }))
              }
              onQuickPrompt={(prompt) => handleSendMessage(prompt)}
              isBusy={isStreaming}
            />
          </aside>

          {/* Mobile View Switcher (compact single-line strip <= 42px) */}
          <div className="md:hidden flex items-center gap-1 px-3 py-1.5 bg-[#F4F2EC] dark:bg-[#0F172A] border-b border-[#E5E2DC] dark:border-[#1E293B] overflow-x-auto shrink-0">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              aria-label="Open workspace controls and settings"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#1E40AF] dark:text-[#60A5FA] bg-white dark:bg-[#1E293B] border border-[#BFDBFE] dark:border-[#3B82F6]/40 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Controls</span>
            </button>
            {(
              [
                { id: 'conversation', label: 'Chat' },
                { id: 'knowledge', label: 'Map' },
                { id: 'questions', label: 'Quiz' },
                { id: 'sources', label: 'Sources' },
                { id: 'report', label: 'Report' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-[#1E293B] text-[#111827] dark:text-[#F8FAFC] shadow-xs'
                    : 'text-[#52525B] dark:text-[#94A3B8]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Mobile Slide-Over Controls Drawer */}
          {isMobileSidebarOpen && (
            <div
              className="fixed inset-0 z-40 md:hidden flex bg-black/45 backdrop-blur-xs"
              role="dialog"
              aria-modal="true"
              aria-label="Workspace controls and knowledge structure"
            >
              <div className="w-[86vw] max-w-[340px] h-full bg-[#F4F2EC] dark:bg-[#0F172A] flex flex-col shadow-xl">
                <div className="px-4 py-3 border-b border-[#E5E2DC] dark:border-[#1E293B] flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#52525B] dark:text-[#94A3B8]">
                    Workspace Controls &amp; Knowledge Map
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsMobileSidebarOpen(false)}
                    aria-label="Close workspace controls"
                    className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center text-[#52525B] dark:text-[#94A3B8] rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <KnowledgeSidebar
                    session={activeSession}
                    sessionCount={sessions.length}
                    theme={theme}
                    onToggleTheme={toggleTheme}
                    onOpenHistory={() => {
                      setIsMobileSidebarOpen(false);
                      setIsHistoryOpen(true);
                    }}
                    onExportPdf={() => {
                      setIsMobileSidebarOpen(false);
                      handleExportPdf();
                    }}
                    onOpenCommands={() => {
                      setIsMobileSidebarOpen(false);
                      setActiveTab('commands');
                    }}
                    onChangeMode={(activeMode) =>
                      updateActiveSession((s) => ({ ...s, activeMode }))
                    }
                    onChangeLevel={(level) =>
                      updateActiveSession((s) => ({ ...s, level }))
                    }
                    onChangeResponseSpeed={(responseSpeed) =>
                      updateActiveSession((s) => ({ ...s, responseSpeed }))
                    }
                    onToggleSearch={() =>
                      updateActiveSession((s) => ({
                        ...s,
                        searchGrounding: !s.searchGrounding,
                      }))
                    }
                    onQuickPrompt={(prompt) => handleSendMessage(prompt)}
                    isBusy={isStreaming}
                  />
                </div>
              </div>
              <button
                type="button"
                aria-label="Dismiss controls backdrop"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="flex-1 cursor-pointer"
              />
            </div>
          )}

          {/* Main Workspace Area */}
          <main className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
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

            {activeTab === 'conversation' && (
              <>
                <MessageList
                  session={activeSession}
                  isStreaming={isStreaming}
                  ttsState={ttsState}
                  onListen={(id, title, text) => startTtsPlayback(id, title, text)}
                  onRetryMessage={handleRetryMessage}
                  onQuickPrompt={(prompt) => handleSendMessage(prompt)}
                  onOpenQuestions={() => setActiveTab('questions')}
                  onExportPdf={handleExportPdf}
                />
                <Composer
                  topic={activeSession.topic}
                  isStreaming={isStreaming}
                  responseSpeed={activeSession.responseSpeed ?? 'standard'}
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
        </div>
      )}

      <HistoryDrawer
        isOpen={isHistoryOpen}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onClose={() => setIsHistoryOpen(false)}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onNewTopic={handleNewTopic}
      />
    </div>
  );
}
