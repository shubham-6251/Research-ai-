import { useState } from 'react';
import {
  Check,
  Download,
  ExternalLink,
  FileDown,
  FileText,
  Sparkles,
} from 'lucide-react';
import {
  buildMarkdownReport,
  buildResearchReportData,
  generateResearchPdf,
  slugifyTopicFilename,
} from '../utils/reportExport';
import type { TopicSession } from '../types';

interface ReportViewProps {
  session: TopicSession;
  isBusy: boolean;
  onRunCommand: (prompt: string) => void;
}

export function ReportView({ session, isBusy, onRunCommand }: ReportViewProps) {
  const [pdfFeedback, setPdfFeedback] = useState<string | null>(null);
  const report = buildResearchReportData(session);

  const handleDownloadPdf = () => {
    generateResearchPdf(session);
    setPdfFeedback('PDF exported');
    setTimeout(() => setPdfFeedback(null), 2500);
  };

  const handleDownloadMarkdown = () => {
    const md = buildMarkdownReport(session);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = slugifyTopicFilename(session.topic, 'md');
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 py-6 sm:py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Action Header */}
        <section className="bg-white dark:bg-[#111827] border border-[#E5E2DC] dark:border-[#1E293B] rounded-xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs text-[#71717A] dark:text-[#94A3B8] tabular-nums">
              Research Dossier · {report.findings.length} findings · {report.sources.length}{' '}
              verified references
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#111827] dark:text-[#F8FAFC]">
              Research Report &amp; Export
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={isBusy}
              onClick={() =>
                onRunCommand(
                  `/summarize Summarize all research findings and key takeaways for ${session.topic}`
                )
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[42px] text-xs font-medium text-[#3F3F46] dark:text-[#CBD5E1] bg-[#FAF9F6] dark:bg-[#0B1120] hover:bg-[#F2F0EB] dark:hover:bg-[#1E293B] border border-[#E5E2DC] dark:border-[#1E293B] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Summarize Session</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadMarkdown}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[42px] text-xs font-medium text-[#3F3F46] dark:text-[#CBD5E1] bg-[#FAF9F6] dark:bg-[#0B1120] hover:bg-[#F2F0EB] dark:hover:bg-[#1E293B] border border-[#E5E2DC] dark:border-[#1E293B] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Markdown (.md)</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[42px] text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#2563EB] dark:hover:bg-[#1D4ED8] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {pdfFeedback ? (
                <>
                  <Check className="w-4 h-4" aria-hidden="true" />
                  <span>{pdfFeedback}</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" aria-hidden="true" />
                  <span>Export PDF</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* Report Document Preview */}
        <article className="bg-white dark:bg-[#111827] border border-[#E5E2DC] dark:border-[#1E293B] rounded-xl p-6 sm:p-8 space-y-8">
          <header className="pb-5 border-b border-[#EFECE6] dark:border-[#1E293B] space-y-2">
            <p className="text-xs text-[#71717A] dark:text-[#94A3B8] tabular-nums">
              {report.domain} · {report.levelLabel} Level · {report.generatedAtLabel}
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#111827] dark:text-[#F8FAFC]">
              {report.title}
            </h2>
            <p className="text-sm sm:text-base text-[#3F3F46] dark:text-[#CBD5E1] leading-relaxed pt-1">
              {report.overview}
            </p>
          </header>

          {/* Branches Summary */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-[#52525B] dark:text-[#94A3B8]">
              Research Taxonomy ({report.branches.length} Branches)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {report.branches.map((branch, idx) => (
                <div
                  key={branch.title}
                  className="p-4 rounded-lg bg-[#FAF9F6] dark:bg-[#0B1120] border border-[#EFECE6] dark:border-[#1E293B] space-y-1.5"
                >
                  <p className="text-sm font-semibold text-[#111827] dark:text-[#F8FAFC]">
                    0{idx + 1}. {branch.title}
                  </p>
                  {branch.summary && (
                    <p className="text-xs text-[#52525B] dark:text-[#94A3B8] leading-relaxed">
                      {branch.summary}
                    </p>
                  )}
                  <p className="text-xs text-[#71717A] dark:text-[#64748B]">
                    {branch.subtopics.join(' · ')}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Findings */}
          <section className="space-y-4 pt-4 border-t border-[#EFECE6] dark:border-[#1E293B]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-semibold text-[#52525B] dark:text-[#94A3B8]">
                Research Findings &amp; Session Analysis ({report.findings.length})
              </h3>
              {report.findings.length === 0 && (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => onRunCommand(`/research ${session.topic}`)}
                  className="text-xs font-medium text-[#1E40AF] dark:text-[#60A5FA] hover:underline cursor-pointer"
                >
                  Generate Deep Research Report
                </button>
              )}
            </div>

            {report.findings.length === 0 ? (
              <div className="p-6 rounded-lg bg-[#FAF9F6] dark:bg-[#0B1120] border border-[#EFECE6] dark:border-[#1E293B] text-center space-y-2">
                <FileText className="w-6 h-6 text-[#71717A] mx-auto" aria-hidden="true" />
                <p className="text-sm text-[#52525B] dark:text-[#94A3B8]">
                  Ask research questions or run Deep Research to populate findings in your PDF
                  report.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {report.findings.map((sec, idx) => (
                  <div
                    key={idx}
                    className="pb-5 border-b last:border-b-0 border-[#EFECE6] dark:border-[#1E293B] space-y-2"
                  >
                    <h4 className="font-display text-lg font-semibold text-[#111827] dark:text-[#F8FAFC]">
                      {idx + 1}. {sec.heading}
                    </h4>
                    {sec.meta && (
                      <p className="text-xs text-[#71717A] dark:text-[#94A3B8]">{sec.meta}</p>
                    )}
                    <p className="text-sm text-[#27272A] dark:text-[#CBD5E1] whitespace-pre-wrap leading-relaxed">
                      {sec.body}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Verified Sources */}
          {report.sources.length > 0 && (
            <section className="space-y-3 pt-4 border-t border-[#EFECE6] dark:border-[#1E293B]">
              <h3 className="text-xs font-semibold text-[#52525B] dark:text-[#94A3B8]">
                Verified References ({report.sources.length})
              </h3>
              <ul className="space-y-2">
                {report.sources.map((src, idx) => (
                  <li key={src.url} className="text-sm">
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[#1E40AF] dark:text-[#60A5FA] hover:underline break-all"
                    >
                      <span className="font-mono text-xs text-[#71717A] dark:text-[#94A3B8] shrink-0">
                        [{idx + 1}]
                      </span>
                      <span>{src.title}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>
      </div>
    </div>
  );
}
