import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeQuestionBank, scoreMcqResponses } from './questions';

test('normalizeQuestionBank validates and bounds MCQ, short-answer, and long-answer items', () => {
  const bank = normalizeQuestionBank(
    {
      mcqs: [
        {
          question: 'Which property ensures Raft never elects two leaders in the same term?',
          options: ['Election Safety', 'Log Matching', 'State Machine Safety', 'Heartbeats'],
          correctIndex: 0,
          explanation: 'At most one leader can win a strict majority in a given term.',
        },
        {
          question: 'Invalid MCQ missing options',
          options: ['Only one'],
          correctIndex: 5,
        },
        {
          question: 'Out of bounds index gets clamped to 0',
          options: ['Option A', 'Option B'],
          correctIndex: 99,
        },
      ],
      shortAnswers: [
        {
          question: 'Explain why randomized election timeouts prevent split votes.',
          modelAnswer: 'They desynchronize candidate start times so one server wins a majority before others become candidates.',
          keyPoints: ['Breaks symmetry', 'Avoids repeated ties'],
        },
      ],
      longAnswers: [
        {
          question: 'Analyze the Figure 8 safety hazard in Raft log commitment.',
          modelAnswer: 'A leader cannot directly commit entries from previous terms by counting replicas alone.',
          rubricPoints: ['Prior-term entry scenario', 'Indirect commitment via currentTerm'],
        },
      ],
    },
    'Leader Election',
    'intermediate'
  );

  assert.equal(bank.focus, 'Leader Election');
  assert.equal(bank.difficulty, 'intermediate');
  assert.equal(bank.mcqs.length, 2);
  assert.equal(bank.mcqs[0].correctIndex, 0);
  assert.equal(bank.mcqs[1].correctIndex, 0);
  assert.equal(bank.shortAnswers.length, 1);
  assert.equal(bank.longAnswers.length, 1);
});

test('scoreMcqResponses computes answered, correct, and percentage accurately', () => {
  const bank = normalizeQuestionBank(
    {
      mcqs: [
        { question: 'Q1', options: ['A', 'B', 'C', 'D'], correctIndex: 1 },
        { question: 'Q2', options: ['A', 'B', 'C', 'D'], correctIndex: 2 },
        { question: 'Q3', options: ['A', 'B', 'C', 'D'], correctIndex: 0 },
      ],
    },
    'Topic',
    'adaptive'
  );

  const score = scoreMcqResponses(bank.mcqs, { 'mcq-1': 1, 'mcq-2': 0 });
  assert.equal(score.answered, 2);
  assert.equal(score.correct, 1);
  assert.equal(score.total, 3);
  assert.equal(score.percentage, 33);
});
