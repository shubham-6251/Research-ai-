import { jsPDF } from 'jspdf';
import type { TopicSession } from '../types';

export interface ReportSection {
  heading: string;
  meta?: string;
  body: string;
}

export interface ResearchReportDocument {
  title: string;
  domain: string;
  generatedAtLabel: string;
  levelLabel: string;
  overview: string;
  prerequisites: string[];
  branches: { title: string; summary: string; subtopics: string[] }[];
  coreTheories: string[];
  applications: string[];
  findings: ReportSection[];
  sources: { title: string; url: string; domain: string }[];
}

export function slugifyTopicFilename(topic: string, ext: 'pdf' | 'md'): string {
  const slug = topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${slug || 'research-report'}.${ext}`;
}

export function stripMarkdownForPdf(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, (block) => {
      const inner = block.replace(/^```[^\n]*\n?/, '').replace(/\n?```$/, '');
      return `\n[Code]\n${inner.trim()}\n`;
    })
    .replace(/\$\$([\s\S]+?)\$\$/g, (_m, eq: string) => `\n${eq.trim()}\n`)
    .replace(/\$([^$\n]+?)\$/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/^---+\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function buildResearchReportData(session: TopicSession): ResearchReportDocument {
  const { knowledgeMap } = session;
  const assistantFindings: ReportSection[] = [];

  for (let i = 0; i < session.messages.length; i++) {
    const msg = session.messages[i];
    if (msg.role === 'assistant' && !msg.error && msg.content.trim().length > 0) {
      const prevUser = i > 0 && session.messages[i - 1]?.role === 'user'
        ? session.messages[i - 1].content.trim()
        : '';
      assistantFindings.push({
        heading: prevUser || msg.modeLabel || `Research Section ${assistantFindings.length + 1}`,
        meta: [
          msg.modeLabel || 'Expert Analysis',
          msg.searchGrounded ? 'Search Grounded' : 'Internal Knowledge',
        ].join(' · '),
        body: stripMarkdownForPdf(msg.content),
      });
    }
  }

  return {
    title: session.topic,
    domain: knowledgeMap.domain,
    generatedAtLabel: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
    levelLabel: session.level.charAt(0).toUpperCase() + session.level.slice(1),
    overview: knowledgeMap.overview,
    prerequisites: knowledgeMap.prerequisites,
    branches: knowledgeMap.branches.map((b) => ({
      title: b.title,
      summary: b.summary,
      subtopics: b.subtopics,
    })),
    coreTheories: knowledgeMap.coreTheories,
    applications: knowledgeMap.applications,
    findings: assistantFindings,
    sources: session.allSources,
  };
}

export function buildMarkdownReport(session: TopicSession): string {
  const doc = buildResearchReportData(session);
  const lines: string[] = [
    `# ${doc.title}`,
    ``,
    `**Discipline:** ${doc.domain} | **Depth:** ${doc.levelLabel} | **Generated:** ${doc.generatedAtLabel}`,
    ``,
    `## Executive Overview`,
    doc.overview,
    ``,
  ];

  if (doc.branches.length > 0) {
    lines.push(`## Knowledge Structure`);
    doc.branches.forEach((b, idx) => {
      lines.push(`### ${idx + 1}. ${b.title}`);
      if (b.summary) lines.push(b.summary);
      if (b.subtopics.length > 0) {
        lines.push(`- Subtopics: ${b.subtopics.join(', ')}`);
      }
      lines.push(``);
    });
  }

  if (doc.findings.length > 0) {
    lines.push(`## Research & Analysis Findings`);
    doc.findings.forEach((section, idx) => {
      lines.push(`### ${idx + 1}. ${section.heading}`);
      if (section.meta) lines.push(`*${section.meta}*`);
      lines.push(``);
      lines.push(section.body);
      lines.push(``);
    });
  }

  if (doc.sources.length > 0) {
    lines.push(`## Verified References`);
    doc.sources.forEach((src, idx) => {
      lines.push(`${idx + 1}. [${src.title}](${src.url}) (${src.domain})`);
    });
    lines.push(``);
  }

  return lines.join('\n').trim() + '\n';
}

export function generateResearchPdf(session: TopicSession): void {
  const report = buildResearchReportData(session);
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 48;
  const maxWidth = pageWidth - margin * 2;
  let y = 56;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 54) {
      pdf.addPage();
      y = 54;
    }
  };

  const writeWrapped = (
    text: string,
    options: { size: number; bold?: boolean; color?: [number, number, number]; lineHeight?: number; gapAfter?: number }
  ) => {
    const clean = text.trim();
    if (!clean) return;
    pdf.setFont('helvetica', options.bold ? 'bold' : 'normal');
    pdf.setFontSize(options.size);
    const [r, g, b] = options.color ?? [24, 24, 27];
    pdf.setTextColor(r, g, b);
    const lineH = options.lineHeight ?? options.size * 1.45;
    const lines = pdf.splitTextToSize(clean, maxWidth) as string[];
    for (const line of lines) {
      ensureSpace(lineH);
      pdf.text(line, margin, y);
      y += lineH;
    }
    y += options.gapAfter ?? 6;
  };

  // Cover Header
  writeWrapped(`${report.domain} · ${report.levelLabel} · ${report.generatedAtLabel}`, {
    size: 9,
    color: [100, 116, 139],
    gapAfter: 6,
  });
  writeWrapped(report.title, {
    size: 20,
    bold: true,
    color: [15, 23, 42],
    lineHeight: 26,
    gapAfter: 10,
  });

  pdf.setDrawColor(203, 213, 225);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 16;

  // Overview
  writeWrapped('Executive Overview', {
    size: 13,
    bold: true,
    color: [30, 64, 175],
    gapAfter: 4,
  });
  writeWrapped(report.overview, { size: 10.5, gapAfter: 10 });

  if (report.prerequisites.length > 0) {
    writeWrapped(`Prerequisites: ${report.prerequisites.join(', ')}`, {
      size: 9.5,
      color: [71, 85, 105],
      gapAfter: 10,
    });
  }

  // Knowledge Branches
  if (report.branches.length > 0) {
    writeWrapped('Research Taxonomy & Branches', {
      size: 13,
      bold: true,
      color: [30, 64, 175],
      gapAfter: 6,
    });
    report.branches.forEach((branch, idx) => {
      writeWrapped(`${idx + 1}. ${branch.title}`, { size: 11, bold: true, gapAfter: 2 });
      if (branch.summary) {
        writeWrapped(branch.summary, { size: 9.5, color: [71, 85, 105], gapAfter: 2 });
      }
      if (branch.subtopics.length > 0) {
        writeWrapped(`Subtopics: ${branch.subtopics.join(' · ')}`, {
          size: 9,
          color: [100, 116, 139],
          gapAfter: 8,
        });
      }
    });
  }

  // Findings
  if (report.findings.length > 0) {
    y += 4;
    writeWrapped('Research Findings & Explanations', {
      size: 13,
      bold: true,
      color: [30, 64, 175],
      gapAfter: 8,
    });
    report.findings.forEach((sec, idx) => {
      writeWrapped(`${idx + 1}. ${sec.heading}`, {
        size: 11.5,
        bold: true,
        color: [15, 23, 42],
        gapAfter: 2,
      });
      if (sec.meta) {
        writeWrapped(sec.meta, { size: 8.5, color: [100, 116, 139], gapAfter: 4 });
      }
      const paragraphs = sec.body.split(/\n\n+/);
      for (const para of paragraphs) {
        writeWrapped(para, { size: 10, lineHeight: 14.5, gapAfter: 6 });
      }
      y += 6;
    });
  }

  // Verified Sources
  if (report.sources.length > 0) {
    y += 4;
    writeWrapped('Verified References', {
      size: 13,
      bold: true,
      color: [30, 64, 175],
      gapAfter: 6,
    });
    report.sources.forEach((src, idx) => {
      writeWrapped(`${idx + 1}. ${src.title}`, { size: 10, bold: true, gapAfter: 1 });
      writeWrapped(src.url, { size: 8.5, color: [30, 64, 175], gapAfter: 6 });
    });
  }

  // Page numbers
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184);
    pdf.text(
      `${report.title} — Page ${p} of ${totalPages}`,
      margin,
      pageHeight - 24
    );
  }

  pdf.save(slugifyTopicFilename(session.topic, 'pdf'));
}
