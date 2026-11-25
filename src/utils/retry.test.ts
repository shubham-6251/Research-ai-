import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSearchFallbackNotice,
  extractUserFriendlyError,
  isQuotaOrRateLimitError,
  isRateLimitOrUnavailableError,
  isTransientGeminiError,
  runWithRetry,
  shouldFallbackFromSearchGrounding,
} from './retry';

test('isTransientGeminiError identifies 503 UNAVAILABLE and network spikes', () => {
  assert.equal(
    isTransientGeminiError(
      new Error(
        '{"error":{"code":503,"message":"This model is currently experiencing high demand.","status":"UNAVAILABLE"}}'
      )
    ),
    true
  );
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
  assert.match(rateLimitNotice.streamingMessage, /without live web search/i);
  assert.match(rateLimitNotice.completedMessage, /avoid service interruption/i);

  const unavailableNotice = buildSearchFallbackNotice(new Error('503 UNAVAILABLE'));
  assert.equal(unavailableNotice.reason, 'unavailable');
  assert.match(unavailableNotice.streamingMessage, /without live web search/i);
  assert.match(unavailableNotice.completedMessage, /503/i);
});


