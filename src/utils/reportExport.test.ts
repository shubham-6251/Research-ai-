import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMarkdownReport,
  buildResearchReportData,
  slugifyTopicFilename,
  stripMarkdownForPdf,
} from './reportExport';
import { createDemoSession } from './demoSeed';

test('slugifyTopicFilename produces safe pdf and md filenames', () => {
  assert.equal(
    slugifyTopicFilename('Distributed Consensus (Raft & Paxos)', 'pdf'),
    'distributed-consensus-raft-paxos.pdf'
  );
  assert.equal(slugifyTopicFilename('   ', 'md'), 'research-report.md');
});

test('stripMarkdownForPdf cleans headings, links, bold, and math cleanly', () => {
  const cleaned = stripMarkdownForPdf(
    '### Heading\n\nSee **Raft** in [the paper](https://raft.github.io/raft.pdf) where $N > 2$.'
  );
  assert.equal(
    cleaned,
    'Heading\n\nSee Raft in the paper (https://raft.github.io/raft.pdf) where N > 2.'
  );
});

test('buildResearchReportData and buildMarkdownReport extract findings and verified sources', () => {
  const session = createDemoSession();
  const report = buildResearchReportData(session);
  assert.equal(report.title, session.topic);
  assert.equal(report.findings.length, 1);
  assert.equal(report.sources.length, 2);

  const md = buildMarkdownReport(session);
  assert.match(md, /# Distributed Consensus/);
  assert.match(md, /## Verified References/);
  assert.match(md, /https:\/\/raft\.github\.io\/raft\.pdf/);
});
