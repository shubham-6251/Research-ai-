import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCommandInput,
  filterCommands,
  detectProblemSolvingIntent,
  SPECIAL_COMMANDS,
} from './commands';

test('SPECIAL_COMMANDS includes all 11 required commands', () => {
  const expected = [
    '/learn',
    '/research',
    '/explain',
    '/analyze',
    '/compare',
    '/examples',
    '/quiz',
    '/summarize',
    '/advanced',
    '/sources',
    '/change-topic',
  ];
  const actual = SPECIAL_COMMANDS.map((c) => c.command);
  assert.deepEqual(actual, expected);
});

test('parseCommandInput parses slash commands with arguments and case insensitivity', () => {
  const parsed = parseCommandInput('  /Research   consensus latency bounds  ');
  assert.equal(parsed.command, '/research');
  assert.equal(parsed.argument, 'consensus latency bounds');
  assert.equal(parsed.isChangeTopic, false);
  assert.equal(parsed.modeLabel, 'Deep Research');
});

test('parseCommandInput handles /change-topic command', () => {
  const parsed = parseCommandInput('/change-topic Quantum Error Correction');
  assert.equal(parsed.command, '/change-topic');
  assert.equal(parsed.argument, 'Quantum Error Correction');
  assert.equal(parsed.isChangeTopic, true);
});

test('parseCommandInput falls back gracefully for unknown slash tokens', () => {
  const parsed = parseCommandInput('/unknown-cmd hello');
  assert.equal(parsed.command, null);
  assert.equal(parsed.argument, '/unknown-cmd hello');
  assert.equal(parsed.modeLabel, 'Expert Q&A');
});

test('parseCommandInput detects problem solving intent in natural language', () => {
  const parsed = parseCommandInput('Solve the differential equation dy/dx = 3x^2');
  assert.equal(parsed.command, null);
  assert.equal(parsed.modeLabel, 'Problem-Solving Mode');
  assert.equal(detectProblemSolvingIntent('Debug this TypeScript async error'), true);
  assert.equal(detectProblemSolvingIntent('What is the history of monetary policy?'), false);
});

test('filterCommands filters by prefix and hides once space is typed', () => {
  const matches = filterCommands('/re');
  assert.deepEqual(
    matches.map((m) => m.command),
    ['/research']
  );
  assert.equal(filterCommands('/learn Raft').length, 0);
  assert.equal(filterCommands('normal text').length, 0);
});
