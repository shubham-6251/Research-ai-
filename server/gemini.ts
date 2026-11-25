import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { extractGroundingSources } from '../src/utils/citations';
import { parseCommandInput, detectProblemSolvingIntent } from '../src/utils/commands';
import { buildExpertSystemInstruction } from '../src/utils/expertPrompt';
import { normalizeKnowledgeStructure } from '../src/utils/knowledgeTree';
import {
  buildSearchFallbackNotice,
  extractUserFriendlyError,
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

function createClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please add your API key in Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function formatGeminiError(err: unknown): { status: number; message: string } {
  return extractUserFriendlyError(err);
}

export async function initializeTopicKnowledge(
  topic: string,
  level: KnowledgeLevel
): Promise<TopicKnowledgeStructure> {
  const ai = createClient();

  const buildRequest = (model: 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite') =>
    ai.models.generateContent({
      model,
      contents: `Analyze the topic "${topic}" comprehensively and construct a rigorous internal knowledge structure.
Adapt the depth framing appropriately for a "${level}" learner while still capturing the full breadth of the field (from foundational principles to advanced frontiers).
Do not restrict yourself to a narrow angle—identify all major branches, essential subtopics, key technical terminology, foundational theories/principles, and real-world applications.`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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
    response = await runWithRetry(() => buildRequest('gemini-4-hydrogen'), {
      maxAttempts: 2,
      baseDelayMs: 700,
    });
  } catch (err) {
    if (!isRateLimitOrUnavailableError(err)) {
      throw err;
    }
    response = await runWithRetry(() => buildRequest('gemini-3.1-flash-lite'), {
      maxAttempts: 2,
      baseDelayMs: 700,
    });
  }

  const text = (response.text ?? '{}').trim();
  const parsed = JSON.parse(text);
  return normalizeKnowledgeStructure(parsed, topic);
}

export interface ChatTurnInput {
  role: 'user' | 'assistant';
  content: string;
}

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

  const recentHistory = params.history.slice(-20).map((turn) => ({
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

  const useDeepThinking =
    Boolean(parsed.definition?.prefersDeepThinking) ||
    isProblemSolving ||
    activeMode === 'research' ||
    activeMode === 'analyze';

  let collectedSources: GroundingSource[] = [];
  let emittedAnyChunk = false;
  let usedSearchGrounding = params.searchGrounding;
  let searchFallback: SearchFallbackNotice | null = null;

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
    const systemInstruction = options.extraInstruction
      ? `${baseInstruction}\n\n${options.extraInstruction}`
      : baseInstruction;

    const streamFromModel = async (
      model: 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite',
      thinkingLevel: ThinkingLevel
    ) => {
      const stream = await ai.models.generateContentStream({
        model,
        contents,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel },
          ...(options.withSearch ? { tools: [{ googleSearch: {} }] } : {}),
        },
      });

      for await (const chunk of stream) {
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
      }
    };

    if (isFast) {
      await runWithRetry(
        async () => {
          if (!emittedAnyChunk) {
            await streamFromModel('gemini-3.1-flash-lite', ThinkingLevel.MINIMAL);
          }
        },
        {
          maxAttempts: options.maxAttempts ?? 2,
          baseDelayMs: options.baseDelayMs ?? 400,
        }
      );
      return;
    }

    const primaryThinking = useDeepThinking ? ThinkingLevel.HIGH : ThinkingLevel.MEDIUM;
    try {
      await runWithRetry(
        async () => {
          if (!emittedAnyChunk) {
            await streamFromModel('gemini-4-hydrogen', primaryThinking);
          }
        },
        {
          maxAttempts: options.maxAttempts ?? 2,
          baseDelayMs: options.baseDelayMs ?? 700,
        }
      );
    } catch (err) {
      if (!emittedAnyChunk && isRateLimitOrUnavailableError(err)) {
        await runWithRetry(
          async () => {
            if (!emittedAnyChunk) {
              await streamFromModel('gemini-3.1-flash-lite', ThinkingLevel.LOW);
            }
          },
          {
            maxAttempts: options.maxAttempts ?? 2,
            baseDelayMs: options.baseDelayMs ?? 500,
          }
        );
      } else {
        throw err;
      }
    }
  };

  try {
    await executeStream({
      withSearch: params.searchGrounding,
      maxAttempts: isFast ? 1 : params.searchGrounding ? 2 : 3,
      baseDelayMs: params.searchGrounding ? 500 : 900,
    });
  } catch (err) {
    if (
      params.searchGrounding &&
      !emittedAnyChunk &&
      shouldFallbackFromSearchGrounding(err)
    ) {
      usedSearchGrounding = false;
      searchFallback = buildSearchFallbackNotice(err);
      collectedSources = [];
      params.onFallback?.(searchFallback);

      await executeStream({
        withSearch: false,
        maxAttempts: isFast ? 2 : 3,
        baseDelayMs: isFast ? 400 : 900,
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

  const buildRequest = (model: 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite') =>
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
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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
    response = await runWithRetry(() => buildRequest('gemini-4-hydrogen'), {
      maxAttempts: 2,
      baseDelayMs: 700,
    });
  } catch (err) {
    if (!isRateLimitOrUnavailableError(err)) {
      throw err;
    }
    response = await runWithRetry(() => buildRequest('gemini-3.1-flash-lite'), {
      maxAttempts: 2,
      baseDelayMs: 600,
    });
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

