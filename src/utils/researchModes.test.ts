import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveTopicFromInput,
  getResearchModeById,
  inferResearchModeId,
  LANDING_SUGGESTIONS,
  prepareMessageForMode,
  RESEARCH_MODES,
} from './researchModes';

test('defines all 6 requested research modes backed by real API modes', () => {
  const labels = RESEARCH_MODES.map((m) => m.label);
  assert.deepEqual(labels, [
    'Quick Answer',
    'Deep Research',
    'Academic Research',
    'Explain from Basics',
    'Compare Topics',
    'Generate Report',
  ]);
  assert.equal(getResearchModeById('quick').forcedSpeed, 'fast');
  assert.equal(getResearchModeById('basics').apiMode, 'learn');
});

test('prepareMessageForMode maps modes to real backend directives without overriding explicit slash commands', () => {
  const deep = prepareMessageForMode('Consensus protocols', 'deep');
  assert.equal(deep.apiMode, 'research');
  assert.ok(deep.dispatchText.startsWith('/research '));

  const compare = prepareMessageForMode('Raft vs Paxos', 'compare');
  assert.equal(compare.apiMode, 'analyze');
  assert.ok(compare.dispatchText.startsWith('/compare '));

  const explicit = prepareMessageForMode('/quiz Raft leaders', 'deep');
  assert.equal(explicit.dispatchText, '/quiz Raft leaders');
});

test('inferResearchModeId preserves explicit mode id or infers from legacy session fields', () => {
  assert.equal(inferResearchModeId('academic', 'research', 'standard'), 'academic');
  assert.equal(inferResearchModeId(undefined, 'learn', 'standard'), 'basics');
  assert.equal(inferResearchModeId(undefined, 'qa', 'fast'), 'quick');
});

test('deriveTopicFromInput creates concise topic title while keeping full question for chat', () => {
  const res = deriveTopicFromInput('Explain how CRISPR-Cas9 gene editing works?');
  assert.equal(res.topic, 'How CRISPR-Cas9 gene editing works');
  assert.equal(res.initialQuestion, 'Explain how CRISPR-Cas9 gene editing works?');

  const short = deriveTopicFromInput('Distributed Consensus');
  assert.equal(short.topic, 'Distributed Consensus');
  assert.equal(short.initialQuestion, 'Distributed Consensus');
});

test('landing suggestions provide all 6 prompt cards', () => {
  assert.equal(LANDING_SUGGESTIONS.length, 6);
  for (const card of LANDING_SUGGESTIONS) {
    assert.ok(card.topic.length > 0);
    assert.ok(card.initialPrompt.length > 0);
  }
});
