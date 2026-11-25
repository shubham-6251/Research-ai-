import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { extractGroundingSources } from '../src/utils/citations';
import { parseCommandInput, detectProblemSolvingIntent } from '../src/utils/commands';
import {
  buildDeveloperTurnDirective,
  detectDeveloperIdentitySignal,
  DEVELOPER_NAME,
} from '../src/utils/developerIdentity';
import { buildExpertSystemInstruction } from '../src/utils/expertPrompt';
import { normalizeKnowledgeStructure } from '../src/utils/knowledgeTree';
import {
  buildSearchFallbackNotice,
  extractUserFriendlyError,
  isQuotaOrRateLimitError,
  isRateLimitOrUnavailableError,
  runWithRetry,
  shouldFallbackFromSearchGrounding,
  type SearchFallbackNotice,
} from '../src/utils/retry';
import { isValidTtsVoice, prepareTextForSpeech, type TtsVoiceName } from '../src/utils/ttsText';
import { normalizeQuestionBank } from '../src/utils/questions';
import type {
  GroundingSource,
  KnowledgeLevel,
  QuestionBank,
  ResearchMode,
  ResponseSpeed,
  TopicKnowledgeStructure,
} from '../src/types';

let cachedClient: { apiKey: string; client: GoogleGenAI } | null = null;

function createClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please add your API key in Settings > Secrets.'
    );
  }
  if (cachedClient && cachedClient.apiKey === apiKey) {
    return cachedClient.client;
  }
  const client = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
  cachedClient = { apiKey, client };
  return client;
}

export function formatGeminiError(err: unknown): { status: number; message: string } {
  return extractUserFriendlyError(err);
}

export async function initializeTopicKnowledge(
  topic: string,
  level: KnowledgeLevel
): Promise<TopicKnowledgeStructure> {
  const ai = createClient();
  const devSignal = detectDeveloperIdentitySignal(topic);
  const developerContext = devSignal.triggered
    ? `\nContext: ${DEVELOPER_NAME} is the developer and creator of Athenaeum (this AI research assistant). Frame this knowledge map around ${DEVELOPER_NAME}'s role as the creator/developer of Athenaeum and core AI research assistant architecture.`
    : '';

  const buildRequest = (
    model: 'gemini-3.1-flash-lite' | 'gemini-4-hydrogen',
    thinkingLevel: ThinkingLevel
  ) =>
    ai.models.generateContent({
      model,
      contents: `Analyze the topic "${topic}" and construct a clean internal knowledge structure.
Adapt the depth framing appropriately for a "${level}" learner while capturing major branches, subtopics, key terms, foundational theories, and applications.${developerContext}`,
      config: {
        thinkingConfig: { thinkingLevel },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topic: { type: Type.STRING, description: 'Canonical clean title of the topic' },
            domain: {
              type: Type.STRING,
              description: 'Broad academic, technical, or professional discipline',
            },
            overview: {
              type: Type.STRING,
              description: '2-3 sentence authoritative overview of what the topic encompasses',
            },
            prerequisites: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3-5 helpful prerequisite concepts or foundations',
            },
            branches: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  subtopics: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['title', 'summary', 'subtopics'],
              },
              description: '4-6 major branches of the topic, each with 3-5 subtopics',
            },
            keyTerms: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  term: { type: Type.STRING },
                  definition: {
                    type: Type.STRING,
                    description:
                      'Crisp 1-sentence plain-text definition without LaTeX dollar-sign delimiters',
                  },
                },
                required: ['term', 'definition'],
              },
              description: '6-8 essential terms with crisp 1-sentence definitions',
            },
            coreTheories: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3-6 foundational laws, theories, frameworks, or algorithms',
            },
            applications: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3-6 real-world applications or use cases',
            },
          },
          required: [
            'topic',
            'domain',
            'overview',
            'prerequisites',
            'branches',
            'keyTerms',
            'coreTheories',
            'applications',
          ],
        },
      },
    });

  let response;
  try {
    response = await runWithRetry(
      () => buildRequest('gemini-3.1-flash-lite', ThinkingLevel.MINIMAL),
      {
        maxAttempts: 2,
        baseDelayMs: 400,
      }
    );
  } catch (err) {
    if (!isRateLimitOrUnavailableError(err)) {
      throw err;
    }
    response = await runWithRetry(
      () => buildRequest('gemini-4-hydrogen', ThinkingLevel.LOW),
      {
        maxAttempts: 2,
        baseDelayMs: 600,
      }
    );
  }

  const text = (response.text ?? '{}').trim();
  const parsed = JSON.parse(text);
  return normalizeKnowledgeStructure(parsed, topic);
}

export interface ChatTurnInput {
  role: 'user' | 'assistant';
  content: string;
}

const SEARCH_FIRST_CHUNK_TIMEOUT_MS = 4500;
const SEARCH_COOLDOWN_MS = 90_000;

function raceTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(errorMessage)), ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

let searchRateLimitedUntil = 0;

export async function streamTopicExpertReply(params: {
  topic: string;
  level: KnowledgeLevel;
  searchGrounding: boolean;
  responseSpeed?: ResponseSpeed;
  activeMode?: ResearchMode;
  knowledgeMap: TopicKnowledgeStructure;
  exploredItems: string[];
  history: ChatTurnInput[];
  message: string;
  onChunk: (text: string) => void;
  onFallback?: (notice: SearchFallbackNotice) => void;
}): Promise<{
  sources: GroundingSource[];
  modeLabel: string;
  command: string | null;
  searchGrounded: boolean;
  responseSpeed: ResponseSpeed;
  searchFallback: SearchFallbackNotice | null;
}> {
  const ai = createClient();
  const isFast = params.responseSpeed === 'fast';
  const activeMode: ResearchMode = params.activeMode ?? 'qa';
  const parsed = parseCommandInput(params.message);
  const isProblemSolving =
    parsed.command === null && detectProblemSolvingIntent(params.message);

  const modeLabelMap: Record<ResearchMode, string> = {
    qa: parsed.modeLabel,
    research: 'Deep Research',
    learn: 'Teaching Mode',
    summarize: 'Executive Summary',
    analyze: 'Analytical Mode',
  };
  const resolvedModeLabel = parsed.command ? parsed.modeLabel : modeLabelMap[activeMode];

  const recentHistory = params.history.slice(-12).map((turn) => ({
    role: turn.role === 'assistant' ? ('model' as const) : ('user' as const),
    parts: [{ text: turn.content }],
  }));

  const effectivePrompt =
    parsed.command && parsed.argument.length === 0
      ? `Execute ${parsed.command} for the active topic "${params.topic}".`
      : params.message;

  const contents = [
    ...recentHistory,
    {
      role: 'user' as const,
      parts: [{ text: effectivePrompt }],
    },
  ];

  const developerSignal = detectDeveloperIdentitySignal(params.message);
  const developerDirective = buildDeveloperTurnDirective(params.message);
  // Skip slow web search round-trip for short direct developer greeting/identity turns
  const skipSearchForGreeting =
    developerSignal.triggered && params.message.trim().length <= 75;
  const searchInCooldown = params.searchGrounding && Date.now() < searchRateLimitedUntil;
  const effectiveInitialSearch =
    skipSearchForGreeting || searchInCooldown ? false : params.searchGrounding;

  const useDeepThinking =
    Boolean(parsed.definition?.prefersDeepThinking) ||
    isProblemSolving ||
    activeMode === 'research' ||
    activeMode === 'analyze';

  let collectedSources: GroundingSource[] = [];
  let emittedAnyChunk = false;
  let usedSearchGrounding = effectiveInitialSearch;
  let searchFallback: SearchFallbackNotice | null = null;

  if (searchInCooldown && !skipSearchForGreeting) {
    searchFallback = buildSearchFallbackNotice(new Error('429 RESOURCE_EXHAUSTED'));
    params.onFallback?.(searchFallback);
  }

  const executeStream = async (options: {
    withSearch: boolean;
    extraInstruction?: string;
    maxAttempts?: number;
    baseDelayMs?: number;
  }) => {
    const baseInstruction = buildExpertSystemInstruction({
      topic: params.topic,
      level: params.level,
      knowledgeMap: params.knowledgeMap,
      searchGrounding: options.withSearch,
      exploredItems: params.exploredItems,
      activeCommand: parsed.command,
      activeMode,
      isProblemSolving,
      fastMode: isFast,
    });
    const combinedExtras = [developerDirective, options.extraInstruction]
      .filter((x): x is string => Boolean(x && x.trim().length > 0))
      .join('\n\n');
    const systemInstruction = combinedExtras
      ? `${baseInstruction}\n\n${combinedExtras}`
      : baseInstruction;

    const streamFromModel = async (
      model: 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite',
      thinkingLevel: ThinkingLevel
    ) => {
      const requestPromise = ai.models.generateContentStream({
        model,
        contents,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel },
          ...(options.withSearch ? { tools: [{ googleSearch: {} }] } : {}),
        },
      });

      const stream = options.withSearch
        ? await raceTimeout(
            requestPromise,
            SEARCH_FIRST_CHUNK_TIMEOUT_MS,
            '503 UNAVAILABLE: Search grounding timed out'
          )
        : await requestPromise;

      const iterator = stream[Symbol.asyncIterator]();
      const firstStepPromise = iterator.next();
      let step = options.withSearch
        ? await raceTimeout(
            firstStepPromise,
            SEARCH_FIRST_CHUNK_TIMEOUT_MS,
            '503 UNAVAILABLE: Search grounding first chunk timed out'
          )
        : await firstStepPromise;

      while (!step.done) {
        const chunk = step.value;
        if (chunk.text) {
          emittedAnyChunk = true;
          params.onChunk(chunk.text);
        }
        const meta = chunk.candidates?.[0]?.groundingMetadata;
        if (meta) {
          const extracted = extractGroundingSources(meta);
          if (extracted.length > 0) {
            const seen = new Set(collectedSources.map((s) => s.url));
            for (const src of extracted) {
              if (!seen.has(src.url)) {
                seen.add(src.url);
                collectedSources.push(src);
              }
            }
          }
        }
        step = await iterator.next();
      }
    };

    const primaryModel: 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite' = isFast
      ? 'gemini-3.1-flash-lite'
      : 'gemini-4-hydrogen';
    const primaryThinking = isFast
      ? ThinkingLevel.MINIMAL
      : useDeepThinking
        ? ThinkingLevel.MEDIUM
        : ThinkingLevel.LOW;
    const fallbackModel: 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite' = isFast
      ? 'gemini-4-hydrogen'
      : 'gemini-3.1-flash-lite';
    const fallbackThinking = isFast ? ThinkingLevel.LOW : ThinkingLevel.MINIMAL;

    try {
      await runWithRetry(
        async () => {
          if (!emittedAnyChunk) {
            await streamFromModel(primaryModel, primaryThinking);
          }
        },
        {
          maxAttempts: options.withSearch ? 1 : (options.maxAttempts ?? 1),
          baseDelayMs: options.baseDelayMs ?? 350,
        }
      );
    } catch (err) {
      // Never burn another API call with search still enabled — immediately bubble out so search disables!
      if (options.withSearch) {
        throw err;
      }
      if (!emittedAnyChunk && isRateLimitOrUnavailableError(err)) {
        // Brief pause before trying the alternate model RPM bucket on 429/503
        await new Promise<void>((r) => setTimeout(r, isQuotaOrRateLimitError(err) ? 900 : 350));
        await runWithRetry(
          async () => {
            if (!emittedAnyChunk) {
              await streamFromModel(fallbackModel, fallbackThinking);
            }
          },
          {
            maxAttempts: 2,
            baseDelayMs: 900,
            retryOnRateLimit: true,
          }
        );
      } else {
        throw err;
      }
    }
  };

  try {
    await executeStream({
      withSearch: effectiveInitialSearch,
      maxAttempts: effectiveInitialSearch ? 1 : isFast ? 1 : 2,
      baseDelayMs: 350,
      extraInstruction: searchInCooldown
        ? 'GROUNDING NOTICE: Live web search grounding is temporarily unavailable for this request (rate limit cooldown). Answer thoroughly from established expert knowledge, and clearly distinguish established facts from rapidly changing claims without fabricating URLs.'
        : undefined,
    });
  } catch (err) {
    if (
      effectiveInitialSearch &&
      !emittedAnyChunk &&
      shouldFallbackFromSearchGrounding(err)
    ) {
      searchRateLimitedUntil = Date.now() + SEARCH_COOLDOWN_MS;
      usedSearchGrounding = false;
      searchFallback = buildSearchFallbackNotice(err);
      collectedSources = [];
      params.onFallback?.(searchFallback);

      await executeStream({
        withSearch: false,
        maxAttempts: 2,
        baseDelayMs: 700,
        extraInstruction:
          'GROUNDING NOTICE: Live web search grounding is temporarily unavailable for this request (503/rate limit). Answer thoroughly from established expert knowledge, and explicitly distinguish well-established facts from rapidly changing claims, statistics, or recent developments that the user should verify against primary sources. Never fabricate URLs or pretend web browsing occurred.',
      });
    } else {
      throw err;
    }
  }

  return {
    sources: collectedSources,
    modeLabel: resolvedModeLabel,
    command: parsed.command,
    searchGrounded: usedSearchGrounding,
    responseSpeed: isFast ? 'fast' : 'standard',
    searchFallback,
  };
}

export async function generateQuestionBank(params: {
  topic: string;
  focus: string;
  difficulty: KnowledgeLevel;
  knowledgeMap: TopicKnowledgeStructure;
}): Promise<QuestionBank> {
  const ai = createClient();
  const focusLabel = params.focus.trim() || params.topic;

  const buildRequest = (
    model: 'gemini-3.1-flash-lite' | 'gemini-4-hydrogen',
    thinkingLevel: ThinkingLevel
  ) =>
    ai.models.generateContent({
      model,
      contents: `Generate a rigorous, domain-accurate assessment for the research topic "${params.topic}" focusing on "${focusLabel}" at "${params.difficulty}" difficulty.
Knowledge overview: ${params.knowledgeMap.overview}
Branches: ${params.knowledgeMap.branches.map((b) => `${b.title} (${b.subtopics.join(', ')})`).join('; ')}

Requirements:
- 4 high-quality Multiple-Choice Questions (each with exactly 4 distinct plausible options, accurate 0-based correctIndex, and concise explanation).
- 3 Short-Answer Questions (clear prompt, concise 2-3 sentence modelAnswer, and 2-3 keyPoints).
- 2 Long-Answer Analytical Questions (deep synthesis/design/derivation prompt, thorough modelAnswer, and 3-4 rubricPoints).
- Plain text/readable notation without broken markup.`,
      config: {
        thinkingConfig: { thinkingLevel },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mcqs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING },
                },
                required: ['question', 'options', 'correctIndex', 'explanation'],
              },
            },
            shortAnswers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  modelAnswer: { type: Type.STRING },
                  keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['question', 'modelAnswer', 'keyPoints'],
              },
            },
            longAnswers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  modelAnswer: { type: Type.STRING },
                  rubricPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['question', 'modelAnswer', 'rubricPoints'],
              },
            },
          },
          required: ['mcqs', 'shortAnswers', 'longAnswers'],
        },
      },
    });

  let response;
  try {
    response = await runWithRetry(
      () => buildRequest('gemini-3.1-flash-lite', ThinkingLevel.MINIMAL),
      {
        maxAttempts: 2,
        baseDelayMs: 400,
      }
    );
  } catch (err) {
    if (!isRateLimitOrUnavailableError(err)) {
      throw err;
    }
    response = await runWithRetry(
      () => buildRequest('gemini-4-hydrogen', ThinkingLevel.LOW),
      {
        maxAttempts: 2,
        baseDelayMs: 600,
      }
    );
  }

  const text = (response.text ?? '{}').trim();
  const parsed = JSON.parse(text);
  return normalizeQuestionBank(parsed, focusLabel, params.difficulty);
}

export async function generateSpeechAudio(params: {
  text: string;
  voiceName?: string;
}): Promise<{ audioBase64: string; mimeType: string; spokenText: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please add your API key in Settings > Secrets.'
    );
  }

  const spokenText = prepareTextForSpeech(params.text);
  if (!spokenText) {
    throw new Error('No speakable text found in the selected response.');
  }

  const voice: TtsVoiceName = isValidTtsVoice(params.voiceName) ? params.voiceName : 'Kore';

  const attempts: Array<{ apiVersion?: string; withSpeechMeta: boolean; withSpeechConfig: boolean }> = [
    { apiVersion: undefined, withSpeechMeta: true, withSpeechConfig: true },
    { apiVersion: 'v1alpha', withSpeechMeta: true, withSpeechConfig: true },
    { apiVersion: undefined, withSpeechMeta: false, withSpeechConfig: true },
    { apiVersion: undefined, withSpeechMeta: false, withSpeechConfig: false },
  ];

  let lastError: unknown = null;

  for (const attempt of attempts) {
    const client = new GoogleGenAI({
      apiKey,
      ...(attempt.apiVersion ? { apiVersion: attempt.apiVersion } : {}),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    try {
      const part: Record<string, unknown> = { text: spokenText };
      if (attempt.withSpeechMeta) {
        part.speechMetadata = { style: 'Clear, articulate academic educator' };
      }

      const config: Record<string, unknown> = {
        responseModalities: ['AUDIO'],
      };
      if (attempt.withSpeechConfig) {
        config.speechConfig = {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        };
      }

      const response = await runWithRetry(
        () =>
          client.models.generateContent({
            model: 'gemini-3.8-flash-lite-tts',
            contents: [{ role: 'user', parts: [part] }],
            config,
          }),
        { maxAttempts: 2, baseDelayMs: 700 }
      );

      const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (inlineData?.data) {
        return {
          audioBase64: inlineData.data,
          mimeType: inlineData.mimeType || 'audio/wav',
          spokenText,
        };
      }
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('INVALID_ARGUMENT') && !msg.includes('Unknown name')) {
        throw err;
      }
    }
  }

  if (lastError) {
    throw lastError;
  }
  throw new Error('Speech synthesis returned empty audio data.');
}

