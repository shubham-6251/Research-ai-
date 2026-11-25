export function isTransientGeminiError(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();
  return (
    raw.includes('503') ||
    raw.includes('UNAVAILABLE') ||
    lower.includes('high demand') ||
    lower.includes('overloaded') ||
    lower.includes('temporarily unavailable') ||
    raw.includes('TIMEOUT_') ||
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

export function isDailyQuotaExceededError(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();
  return (
    isQuotaOrRateLimitError(err) &&
    (lower.includes('per day') ||
      lower.includes('perday') ||
      lower.includes('free_tier_requests') ||
      lower.includes('free tier'))
  );
}

export function extractRetryAfterSeconds(err: unknown): number | null {
  const raw = err instanceof Error ? err.message : String(err);
  const match =
    raw.match(/retry in\s+([0-9]+(?:\.[0-9]+)?)\s*s/i) ??
    raw.match(/"retryDelay"\s*:\s*"([0-9]+)s"/i);
  if (!match) return null;
  const secs = Math.ceil(Number(match[1]));
  return Number.isFinite(secs) && secs > 0 ? secs : null;
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
      noteLabel: 'Answered from knowledge base',
      streamingMessage:
        'Live web search is unavailable under the current API quota. Generating your response from built-in knowledge without inventing URLs...',
      completedMessage:
        'Live web search is unavailable under the current API quota, so this response was answered from built-in knowledge without live web search or fabricated URLs.',
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

  if (isDailyQuotaExceededError(err)) {
    return {
      status: 429,
      message:
        'Daily Free Tier quota reached for this Gemini model. Please try again later or select a billing-enabled API key in Settings > Secrets.',
    };
  }

  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    const retryAfter = extractRetryAfterSeconds(err);
    return {
      status: 429,
      message: retryAfter
        ? `Rate limit reached. Please wait ~${retryAfter}s and try again, or check your quota in Settings > Secrets.`
        : 'Rate limit or quota reached. Please wait a moment and try again, or check your quota in Settings > Secrets.',
    };
  }

  if (
    raw.includes('503') ||
    raw.includes('UNAVAILABLE') ||
    raw.includes('TIMEOUT_') ||
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

export type SupportedTextModel = 'gemini-3.1-flash-lite' | 'gemini-4-hydrogen';

export interface ModelCooldownTracker {
  isInCooldown: (model: SupportedTextModel, now?: number) => boolean;
  markRateLimited: (model: SupportedTextModel, err: unknown, now?: number) => void;
  pickModels: (preferredPrimary: SupportedTextModel, now?: number) => SupportedTextModel[];
}

export function createModelCooldownTracker(): ModelCooldownTracker {
  const cooldownUntil: Record<SupportedTextModel, number> = {
    'gemini-3.1-flash-lite': 0,
    'gemini-4-hydrogen': 0,
  };

  const isInCooldown = (model: SupportedTextModel, now = Date.now()) =>
    now < cooldownUntil[model];

  const markRateLimited = (model: SupportedTextModel, err: unknown, now = Date.now()) => {
    if (!isQuotaOrRateLimitError(err)) return;
    const durationMs = isDailyQuotaExceededError(err) ? 10 * 60_000 : 45_000;
    cooldownUntil[model] = Math.max(cooldownUntil[model], now + durationMs);
  };

  const pickModels = (
    preferredPrimary: SupportedTextModel,
    now = Date.now()
  ): SupportedTextModel[] => {
    const secondary: SupportedTextModel =
      preferredPrimary === 'gemini-3.1-flash-lite'
        ? 'gemini-4-hydrogen'
        : 'gemini-3.1-flash-lite';
    const available = [preferredPrimary, secondary].filter((m) => !isInCooldown(m, now));
    if (available.length > 0) {
      return available;
    }
    // If both cooled down, prefer flash-lite first since it recovers faster
    return ['gemini-3.1-flash-lite', 'gemini-4-hydrogen'];
  };

  return { isInCooldown, markRateLimited, pickModels };
}

/**
 * When primary failed with a temporary 503 and a backup model failed with 429 quota,
 * preserve the recoverable 503 from the primary model so callers don't mask a brief spike
 * behind an exhausted backup model's 429.
 */
export function preferNonQuotaError(primaryErr: unknown, fallbackErr: unknown): unknown {
  if (isTransientGeminiError(primaryErr) && isQuotaOrRateLimitError(fallbackErr)) {
    return primaryErr;
  }
  return fallbackErr;
}

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  retryOnRateLimit?: boolean;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function runWithRetry<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  const baseDelayMs = options.baseDelayMs ?? 800;
  const retryOnRateLimit = Boolean(options.retryOnRateLimit);
  const sleep = options.sleep ?? defaultSleep;

  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      const isLast = attempt >= maxAttempts - 1;
      const shouldRetry = retryOnRateLimit
        ? isRateLimitOrUnavailableError(err) && !isDailyQuotaExceededError(err)
        : isTransientGeminiError(err);
      if (isLast || !shouldRetry) {
        throw err;
      }
      const jitter = Math.floor(Math.random() * 250);
      const delay = baseDelayMs * Math.pow(2, attempt) + jitter;
      await sleep(delay);
    }
  }

  throw lastError;
}
