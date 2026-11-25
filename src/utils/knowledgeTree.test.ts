import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeKnowledgeStructure,
  computeStudyProgress,
  detectMentionedItems,
} from './knowledgeTree';
import { buildExpertSystemInstruction } from './expertPrompt';

test('normalizeKnowledgeStructure provides safe defaults for partial payloads', () => {
  const normalized = normalizeKnowledgeStructure(
    {
      domain: 'Distributed Systems',
      branches: [
        {
          title: 'Leader Election',
          summary: 'Term-based voting',
          subtopics: ['Randomized Timeouts', 'Split Votes'],
        },
      ],
      keyTerms: [{ term: 'Quorum', definition: 'Majority of cluster nodes' }],
    },
    'Raft Consensus'
  );

  assert.equal(normalized.topic, 'Raft Consensus');
  assert.equal(normalized.domain, 'Distributed Systems');
  assert.equal(normalized.branches.length, 1);
  assert.equal(normalized.branches[0].id, 'branch-1');
  assert.deepEqual(normalized.branches[0].subtopics, ['Randomized Timeouts', 'Split Votes']);
  assert.equal(normalized.keyTerms[0].term, 'Quorum');
});

test('computeStudyProgress and detectMentionedItems track coverage accurately', () => {
  const structure = normalizeKnowledgeStructure(
    {
      branches: [
        {
          title: 'Core',
          summary: '',
          subtopics: ['Leader Election', 'Log Replication', 'Safety'],
        },
      ],
    },
    'Raft'
  );

  const mentioned = detectMentionedItems(
    'In Raft, Leader Election uses randomized timeouts before Log Replication starts.',
    structure
  );
  assert.deepEqual(mentioned, ['Leader Election', 'Log Replication']);

  const progress = computeStudyProgress(structure, mentioned);
  assert.equal(progress.exploredCount, 2);
  assert.equal(progress.totalCount, 3);
  assert.equal(progress.percentage, 67);
});

test('buildExpertSystemInstruction injects active command and search status', () => {
  const structure = normalizeKnowledgeStructure({}, 'CRISPR');
  const prompt = buildExpertSystemInstruction({
    topic: 'CRISPR',
    level: 'beginner',
    knowledgeMap: structure,
    searchGrounding: true,
    exploredItems: [],
    activeCommand: '/learn',
    isProblemSolving: false,
  });

  assert.match(prompt, /CRISPR/);
  assert.match(prompt, /Teaching Mode/i);
  assert.match(prompt, /Google Search grounding is ACTIVE/);
  assert.match(prompt, /beginner/i);
});

test('buildExpertSystemInstruction includes concise directives when fastMode is enabled', () => {
  const structure = normalizeKnowledgeStructure({}, 'Raft');
  const prompt = buildExpertSystemInstruction({
    topic: 'Raft',
    level: 'intermediate',
    knowledgeMap: structure,
    searchGrounding: false,
    exploredItems: [],
    activeCommand: null,
    isProblemSolving: false,
    fastMode: true,
  });

  assert.match(prompt, /FAST RESPONSE MODE/i);
  assert.match(prompt, /high-signal brevity/i);
});

