import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isSafeHttpUrl,
  extractDomain,
  extractGroundingSources,
  mergeUniqueSources,
} from './citations';

test('isSafeHttpUrl permits http/https and rejects unsafe schemes', () => {
  assert.equal(isSafeHttpUrl('https://stanford.edu/paper'), true);
  assert.equal(isSafeHttpUrl('http://example.org'), true);
  assert.equal(isSafeHttpUrl('javascript:alert(1)'), false);
  assert.equal(isSafeHttpUrl('data:text/html,hi'), false);
  assert.equal(isSafeHttpUrl('not a url'), false);
});

test('extractDomain strips www prefix cleanly', () => {
  assert.equal(extractDomain('https://www.nature.com/articles/123'), 'nature.com');
  assert.equal(extractDomain('https://arxiv.org/abs/2401.0001'), 'arxiv.org');
});

test('extractGroundingSources extracts, validates, and deduplicates groundingChunks', () => {
  const metadata = {
    groundingChunks: [
      { web: { uri: 'https://arxiv.org/abs/1234', title: 'Attention Paper' } },
      { web: { uri: 'https://arxiv.org/abs/1234', title: 'Duplicate' } },
      { web: { uri: 'javascript:evil()', title: 'Bad Link' } },
      { web: { uri: 'https://www.mit.edu/lecture', title: '' } },
    ],
  };
  const sources = extractGroundingSources(metadata);
  assert.equal(sources.length, 2);
  assert.deepEqual(sources[0], {
    title: 'Attention Paper',
    url: 'https://arxiv.org/abs/1234',
    domain: 'arxiv.org',
  });
  assert.deepEqual(sources[1], {
    title: 'mit.edu',
    url: 'https://www.mit.edu/lecture',
    domain: 'mit.edu',
  });
});

test('mergeUniqueSources merges without duplicates', () => {
  const a = [{ title: 'A', url: 'https://a.edu', domain: 'a.edu' }];
  const b = [
    { title: 'A2', url: 'https://a.edu', domain: 'a.edu' },
    { title: 'B', url: 'https://b.edu', domain: 'b.edu' },
  ];
  const merged = mergeUniqueSources(a, b);
  assert.equal(merged.length, 2);
  assert.equal(merged[1].url, 'https://b.edu');
});
