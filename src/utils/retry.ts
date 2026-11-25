export function isTransientGeminiError(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();
  return (
    raw.includes('503') ||
    raw.includes('UNAVAILABLE') ||
    lower.includes('high demand') ||
    lower.includes('overloaded') ||
    lower.includes('temporarily unavailable') ||
    raw.includes('"code":500') ||
    raw.includes('INTERNAL') ||
    lower.includes('econnreset') ||
    lower.includes('etimedout') ||
    lower.includes('fetch failed')
  );
}

export function isQuotaOrRateLimitError(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();
  return (
    raw.includes('429') ||
    raw.includes('RESOURCE_EXHAUSTED') ||
    lower.includes('rate limit') ||
    lower.includes('quota')
  );
}

export function isRateLimitOrUnavailableError(err: unknown): boolean {
  return isQuotaOrRateLimitError(err) || isTransientGeminiError(err);
}

export function shouldFallbackFromSearchGrounding(err: unknown): boolean {
  return isRateLimitOrUnavailableError(err);
}

export interface SearchFallbackNotice {
  reason: 'rate_limit' | 'unavailable';
  noteLabel: string;
  streamingMessage: string;
  completedMessage: string;
}

export function buildSearchFallbackNotice(err: unknown): SearchFallbackNotice {
  if (isQuotaOrRateLimitError(err)) {
    return {
      reason: 'rate_limit',
      noteLabel: 'Live search skipped: rate limit',
      streamingMessage:
        'Live web search reached a rate limit for this request. Generating your response without live web search to avoid service interruption...',
      completedMessage:
        'Live web search reached a rate limit for this request, so this response was generated from internal knowledge without live web search to avoid service interruption.',
    };
  }

  return {
    reason: 'unavailable',
    noteLabel: 'Live search skipped: temporary 503',
    streamingMessage:
      'Live web search is temporarily unavailable (503 high demand). Generating your response without live web search to avoid service interruption...',
    completedMessage:
      'Live web search was temporarily unavailable (503 high demand) for this request, so this response was generated from internal knowledge without live web search to avoid service interruption.',
  };
}

export function extractUserFriendlyError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);

  if (raw.includes('GEMINI_API_KEY is not configured')) {
    return { status: 500, message: raw };
  }

  if (raw.includes('PERMISSION_DENIED') || raw.includes('403') || raw.includes('API_KEY_INVALID')) {
    return {
      status: 403,
      message:
        'API key permission denied or invalid. Please check your Gemini API key in Settings > Secrets.',
    };
  }

  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      message:
        'Rate limit or quota reached. Please wait a moment and try again, or check your quota in Settings > Secrets.',
    };
  }

  if (
    raw.includes('503') ||
    raw.includes('UNAVAILABLE') ||
    raw.toLowerCase().includes('high demand')
  ) {
    return {
      status: 503,
      message:
        'The AI model is experiencing a temporary spike in demand. Please wait a few seconds and click Retry.',
    };
  }

  const lower = raw.toLowerCase();
  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    lower.includes('econnrefused') ||
    lower.includes('enotfound') ||
    lower.includes('econnreset') ||
    lower.includes('etimedout')
  ) {
    return {
      status: 503,
      message:
        'Network connection failed while contacting the research server. Please check your connection and click Retry.',
    };
  }

  // Try extracting nested JSON error message if upstream returned raw JSON
  try {
    const jsonStart = raw.indexOf('{');
    if (jsonStart !== -1) {
      const parsed = JSON.parse(raw.slice(jsonStart)) as {
        error?: { code?: number; message?: string };
      };
      if (parsed?.error?.message) {
        return {
          status: parsed.error.code && parsed.error.code >= 400 ? parsed.error.code : 500,
          message: parsed.error.message,
        };
      }
    }
  } catch {
    // Fall through to raw message
  }

  return {
    status: 500,
    message: raw || 'An unexpected error occurred while communicating with the AI engine.',
  };
}

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function runWithRetry<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  const baseDelayMs = options.baseDelayMs ?? 800;
  const sleep = options.sleep ?? defaultSleep;

  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      const isLast = attempt >= maxAttempts - 1;
      if (isLast || !isTransientGeminiError(err)) {
        throw err;
      }
      const jitter = Math.floor(Math.random() * 250);
      const delay = baseDelayMs * Math.pow(2, attempt) + jitter;
      await sleep(delay);
    }
  }

  throw lastError;
}
