import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDeveloperIdentityPromptSection,
  buildDeveloperTurnDirective,
  detectDeveloperIdentitySignal,
  DEVELOPER_NAME,
} from './developerIdentity';

test('detectDeveloperIdentitySignal recognizes self-introductions with Shubham Verma', () => {
  const s1 = detectDeveloperIdentitySignal('My name is shubham verma');
  assert.equal(s1.mentionsDeveloperName, true);
  assert.equal(s1.isDeveloperSelfIntro, true);
  assert.equal(s1.triggered, true);

  const s2 = detectDeveloperIdentitySignal('Shubham Verma');
  assert.equal(s2.mentionsDeveloperName, true);
  assert.equal(s2.isDeveloperSelfIntro, true);
  assert.equal(s2.triggered, true);

  const s3 = detectDeveloperIdentitySignal("Hi, I'm Shubham Verma, explain Raft consensus");
  assert.equal(s3.isDeveloperSelfIntro, true);
});

test('detectDeveloperIdentitySignal recognizes questions about who developed the AI', () => {
  const q1 = detectDeveloperIdentitySignal('Who developed this AI?');
  assert.equal(q1.asksAboutDeveloper, true);
  assert.equal(q1.triggered, true);

  const q2 = detectDeveloperIdentitySignal('Who is Shubham Verma?');
  assert.equal(q2.mentionsDeveloperName, true);
  assert.equal(q2.triggered, true);

  const unrelated = detectDeveloperIdentitySignal('Explain quantum entanglement');
  assert.equal(unrelated.triggered, false);
});

test('buildDeveloperTurnDirective produces tailored developer reaction instructions', () => {
  const intro = buildDeveloperTurnDirective('my name is shubham verma');
  assert.ok(intro);
  assert.match(intro, /developer and creator/i);
  assert.match(intro, new RegExp(DEVELOPER_NAME));

  const query = buildDeveloperTurnDirective('Who created you?');
  assert.ok(query);
  assert.match(query, new RegExp(DEVELOPER_NAME));

  assert.equal(buildDeveloperTurnDirective('What is Paxos?'), null);

  const section = buildDeveloperIdentityPromptSection();
  assert.match(section, new RegExp(DEVELOPER_NAME));
});
