import test from 'node:test';
import assert from 'node:assert/strict';
import {
  prepareTextForSpeech,
  isValidTtsVoice,
  formatAudioTime,
} from './ttsText';

test('prepareTextForSpeech strips markdown, tables, code blocks, and cleans LaTeX math', () => {
  const md = `### Direct Answer

In **Raft**, see [the paper](https://raft.github.io/raft.pdf) and \`AppendEntries\`.

$$Q = \\lfloor \\frac{N}{2} \\rfloor + 1$$

| State | Role |
| :--- | :--- |
| Follower | Grants votes |

\`\`\`ts
const x = 1;
\`\`\`
`;

  const spoken = prepareTextForSpeech(md);
  assert.ok(!spoken.includes('###'));
  assert.ok(!spoken.includes('**'));
  assert.ok(!spoken.includes('`'));
  assert.ok(!spoken.includes('$$'));
  assert.ok(!spoken.includes('https://'));
  assert.match(spoken, /Direct Answer/);
  assert.match(spoken, /the paper/);
  assert.match(spoken, /AppendEntries/);
  assert.match(spoken, /N over 2/);
  assert.match(spoken, /Follower: Grants votes/);
  assert.match(spoken, /See the code block/);
});

test('prepareTextForSpeech truncates cleanly at sentence boundaries when exceeding maxChars', () => {
  const text = 'First sentence is clear. Second sentence adds detail. Third sentence is very long and exceeds the limit.';
  const truncated = prepareTextForSpeech(text, 55);
  assert.equal(truncated, 'First sentence is clear. Second sentence adds detail.');
});

test('isValidTtsVoice validates supported prebuilt voices', () => {
  assert.equal(isValidTtsVoice('Kore'), true);
  assert.equal(isValidTtsVoice('Zephyr'), true);
  assert.equal(isValidTtsVoice('InvalidVoice'), false);
});

test('formatAudioTime formats seconds as M:SS', () => {
  assert.equal(formatAudioTime(0), '0:00');
  assert.equal(formatAudioTime(65), '1:05');
  assert.equal(formatAudioTime(Number.NaN), '0:00');
});
