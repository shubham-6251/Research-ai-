import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSearchFallbackNotice,
  createModelCooldownTracker,
  extractRetryAfterSeconds,
  extractUserFriendlyError,
  isDailyQuotaExceededError,
  isQuotaOrRateLimitError,
  isRateLimitOrUnavailableError,
  isTransientGeminiError,
  preferNonQuotaError,
  runWithRetry,
  shouldFallbackFromSearchGrounding,
} from './retry';

test('isTransientGeminiError identifies 503 UNAVAILABLE, timeouts, and network spikes', () => {
  assert.equal(
    isTransientGeminiError(
      new Error(
        '{"error":{"code":503,"message":"This model is currently experiencing high demand.","status":"UNAVAILABLE"}}'
      )
    ),
    true
  );
  assert.equal(isTransientGeminiError(new Error('TIMEOUT_8500MS')), true);
  assert.equal(isTransientGeminiError(new Error('API_KEY_INVALID')), false);
});

test('extractUserFriendlyError formats 503 spikes without raw JSON', () => {
  const formatted = extractUserFriendlyError(
    new Error(
      '{"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary.","status":"UNAVAILABLE"}}'
    )
  );
  assert.equal(formatted.status, 503);
  assert.ok(!formatted.message.includes('{"error"'));
  assert.match(formatted.message, /temporary spike in demand/i);
});

test('runWithRetry retries transient 503 errors with backoff and succeeds', async () => {
  let calls = 0;
  const delays: number[] = [];

  const result = await runWithRetry(
    async () => {
      calls++;
      if (calls < 3) {
        throw new Error('503 UNAVAILABLE');
      }
      return 'ok';
    },
    {
      maxAttempts: 3,
      baseDelayMs: 100,
      sleep: async (ms) => {
        delays.push(ms);
      },
    }
  );

  assert.equal(result, 'ok');
  assert.equal(calls, 3);
  assert.equal(delays.length, 2);
  assert.ok(delays[0] >= 100 && delays[1] >= 200);
});

test('runWithRetry does not retry non-transient 403 errors', async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      runWithRetry(
        async () => {
          calls++;
          throw new Error('403 PERMISSION_DENIED');
        },
        {
          maxAttempts: 3,
          sleep: async () => {},
        }
      ),
    /PERMISSION_DENIED/
  );
  assert.equal(calls, 1);
});

test('isQuotaOrRateLimitError detects 429 RESOURCE_EXHAUSTED without false positives', () => {
  assert.equal(
    isQuotaOrRateLimitError(
      new Error('{"error":{"code":429,"message":"Resource has been exhausted","status":"RESOURCE_EXHAUSTED"}}')
    ),
    true
  );
  assert.equal(isQuotaOrRateLimitError(new Error('503 UNAVAILABLE')), false);
});

test('isDailyQuotaExceededError distinguishes daily Free Tier exhaustion from per-minute 429', () => {
  const dailyErr = new Error(
    '429 RESOURCE_EXHAUSTED: Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, description: Generate content requests per day limit exceeded on Free Tier.'
  );
  assert.equal(isDailyQuotaExceededError(dailyErr), true);
  assert.equal(isDailyQuotaExceededError(new Error('429 RESOURCE_EXHAUSTED please retry in 12s')), false);
  assert.equal(extractRetryAfterSeconds(new Error('Please retry in 23.4s')), 24);

  const formattedDaily = extractUserFriendlyError(dailyErr);
  assert.equal(formattedDaily.status, 429);
  assert.match(formattedDaily.message, /Daily Free Tier quota/i);
});

test('createModelCooldownTracker skips rate-limited models and prefers recoverable 503 error', () => {
  const tracker = createModelCooldownTracker();
  const t0 = 1_000_000;
  assert.deepEqual(tracker.pickModels('gemini-4-hydrogen', t0), [
    'gemini-4-hydrogen',
    'gemini-3.1-flash-lite',
  ]);

  tracker.markRateLimited(
    'gemini-4-hydrogen',
    new Error('429 RESOURCE_EXHAUSTED requests per day limit exceeded on Free Tier'),
    t0
  );
  assert.equal(tracker.isInCooldown('gemini-4-hydrogen', t0 + 1000), true);
  assert.deepEqual(tracker.pickModels('gemini-4-hydrogen', t0 + 1000), ['gemini-3.1-flash-lite']);
  assert.deepEqual(tracker.pickModels('gemini-4-hydrogen', t0 + 11 * 60_000), [
    'gemini-4-hydrogen',
    'gemini-3.1-flash-lite',
  ]);

  const transient503 = new Error('503 UNAVAILABLE');
  const backup429 = new Error('429 RESOURCE_EXHAUSTED');
  assert.equal(preferNonQuotaError(transient503, backup429), transient503);
});

test('shouldFallbackFromSearchGrounding and isRateLimitOrUnavailableError trigger on 503 and 429 errors only', () => {
  assert.equal(shouldFallbackFromSearchGrounding(new Error('503 UNAVAILABLE')), true);
  assert.equal(shouldFallbackFromSearchGrounding(new Error('429 RESOURCE_EXHAUSTED')), true);
  assert.equal(shouldFallbackFromSearchGrounding(new Error('403 API_KEY_INVALID')), false);
  assert.equal(isRateLimitOrUnavailableError(new Error('429 RESOURCE_EXHAUSTED')), true);
  assert.equal(isRateLimitOrUnavailableError(new Error('403 API_KEY_INVALID')), false);
});

test('buildSearchFallbackNotice produces clear user-facing notices for 429 and 503', () => {
  const rateLimitNotice = buildSearchFallbackNotice(new Error('429 RESOURCE_EXHAUSTED'));
  assert.equal(rateLimitNotice.reason, 'rate_limit');
  assert.match(rateLimitNotice.streamingMessage, /built-in knowledge/i);
  assert.match(rateLimitNotice.completedMessage, /without live web search/i);

  const unavailableNotice = buildSearchFallbackNotice(new Error('503 UNAVAILABLE'));
  assert.equal(unavailableNotice.reason, 'unavailable');
  assert.match(unavailableNotice.streamingMessage, /without live web search/i);
  assert.match(unavailableNotice.completedMessage, /503/i);
});

test('runWithRetry retries 429 RESOURCE_EXHAUSTED when retryOnRateLimit is enabled except daily quota', async () => {
  let calls = 0;
  const result = await runWithRetry(
    async () => {
      calls++;
      if (calls === 1) throw new Error('429 RESOURCE_EXHAUSTED');
      return 'recovered';
    },
    {
      maxAttempts: 2,
      baseDelayMs: 50,
      retryOnRateLimit: true,
      sleep: async () => {},
    }
  );
  assert.equal(result, 'recovered');
  assert.equal(calls, 2);

  let dailyCalls = 0;
  await assert.rejects(
    () =>
      runWithRetry(
        async () => {
          dailyCalls++;
          throw new Error('429 RESOURCE_EXHAUSTED Generate content requests per day limit exceeded on Free Tier');
        },
        {
          maxAttempts: 3,
          baseDelayMs: 10,
          retryOnRateLimit: true,
          sleep: async () => {},
        }
      ),
    /RESOURCE_EXHAUSTED/
  );
  assert.equal(dailyCalls, 1);
});


