import { useState } from 'react';
import { Check, Copy, ExternalLink, Search } from 'lucide-react';
import { SPECIAL_COMMANDS } from '../utils/commands';
import type { GroundingSource, SpecialCommandName } from '../types';

interface SourcesPanelProps {
  topic: string;
  sources: GroundingSource[];
  isBusy: boolean;
  onFetchSources: () => void;
}

export function SourcesPanel({
  topic,
  sources,
  isBusy,
  onFetchSources,
}: SourcesPanelProps) {
  const [query, setQuery] = useState('');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const filteredSources = sources.filter((src) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      src.title.toLowerCase().includes(q) ||
      src.domain.toLowerCase().includes(q) ||
      src.url.toLowerCase().includes(q)
    );
  });

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl((prev) => (prev === url ? null : prev)), 2000);
    } catch {
      // Clipboard blocked in non-HTTPS contexts
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 py-6 sm:py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E5E2DC] dark:border-[#1E293B]">
          <div>
            <h1 className="font-display text-2xl font-semibold text-[#111827] dark:text-[#F8FAFC]">
              Verified References for {topic}
            </h1>
            <p className="text-sm text-[#52525B] dark:text-[#94A3B8] mt-1 tabular-nums">
              {sources.length} grounded {sources.length === 1 ? 'source' : 'sources'} collected in
              this session
            </p>
          </div>
          <button
            type="button"
            disabled={isBusy}
            onClick={onFetchSources}
            className="px-4 py-2 min-h-[40px] text-xs font-semibold text-white bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#2563EB] dark:hover:bg-[#1D4ED8] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            Find Authoritative Sources (/sources)
          </button>
        </div>

        {sources.length > 0 && (
          <div className="relative">
            <Search
              className="w-4 h-4 text-[#71717A] dark:text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter references by title, domain, or URL..."
              aria-label="Filter verified references"
              className="w-full pl-10 pr-4 py-2.5 min-h-[42px] text-sm text-[#111827] dark:text-[#F8FAFC] placeholder:text-[#A1A1AA] dark:placeholder:text-[#64748B] bg-white dark:bg-[#111827] border border-[#E5E2DC] dark:border-[#1E293B] rounded-lg focus:outline-none focus:border-[#1E40AF]"
            />
          </div>
        )}

        {sources.length === 0 ? (
          <div className="bg-white dark:bg-[#111827] border border-[#E5E2DC] dark:border-[#1E293B] rounded-xl p-8 text-center space-y-3">
            <p className="text-base font-medium text-[#111827] dark:text-[#F8FAFC]">
              No external sources gathered yet
            </p>
            <p className="text-sm text-[#52525B] dark:text-[#94A3B8] max-w-md mx-auto">
              Ask a research question or run{' '}
              <span className="font-mono text-[#1E40AF] dark:text-[#60A5FA]">/sources</span> or{' '}
              <span className="font-mono text-[#1E40AF] dark:text-[#60A5FA]">/research</span> with
              Web Search Grounding enabled to collect verified URLs and academic references.
            </p>
          </div>
        ) : filteredSources.length === 0 ? (
          <div className="bg-white dark:bg-[#111827] border border-[#E5E2DC] dark:border-[#1E293B] rounded-xl p-6 text-center text-sm text-[#71717A] dark:text-[#94A3B8]">
            No verified sources match &ldquo;{query}&rdquo;.
          </div>
        ) : (
          <ul className="space-y-3">
            {filteredSources.map((src) => {
              const isCopied = copiedUrl === src.url;
              return (
                <li
                  key={src.url}
                  className="flex items-start justify-between gap-3 p-4 bg-white dark:bg-[#111827] border border-[#E5E2DC] dark:border-[#1E293B] hover:border-[#1E40AF]/50 dark:hover:border-[#3B82F6]/50 rounded-xl transition-colors"
                >
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-0 group space-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[#111827] dark:text-[#F8FAFC] group-hover:text-[#1E40AF] dark:group-hover:text-[#60A5FA] truncate">
                        {src.title}
                      </p>
                      <ExternalLink
                        className="w-3.5 h-3.5 text-[#71717A] dark:text-[#94A3B8] group-hover:text-[#1E40AF] dark:group-hover:text-[#60A5FA] shrink-0"
                        aria-hidden="true"
                      />
                    </div>
                    <p className="text-xs font-medium text-[#52525B] dark:text-[#94A3B8]">
                      {src.domain}
                    </p>
                    <p className="text-xs text-[#71717A] dark:text-[#64748B] break-all">
                      {src.url}
                    </p>
                  </a>

                  <button
                    type="button"
                    onClick={() => handleCopy(src.url)}
                    aria-label={`Copy URL for ${src.title}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] text-xs font-medium text-[#3F3F46] dark:text-[#CBD5E1] bg-[#FAF9F6] dark:bg-[#0B1120] hover:bg-[#F2F0EB] dark:hover:bg-[#1E293B] border border-[#E5E2DC] dark:border-[#1E293B] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {isCopied ? (
                      <>
                        <Check
                          className="w-3.5 h-3.5 text-[#047857] dark:text-[#34D399]"
                          aria-hidden="true"
                        />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

interface CommandsPanelProps {
  topic: string;
  onTriggerCommand: (cmd: SpecialCommandName) => void;
}

export function CommandsPanel({ topic, onTriggerCommand }: CommandsPanelProps) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 py-6 sm:py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="pb-4 border-b border-[#E5E2DC] dark:border-[#1E293B]">
          <h1 className="font-display text-2xl font-semibold text-[#111827] dark:text-[#F8FAFC]">
            Expert Commands for {topic}
          </h1>
          <p className="text-sm text-[#52525B] dark:text-[#94A3B8] mt-1">
            Type any command directly in the prompt bar or click an action below to run it.
          </p>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-[#E5E2DC] dark:border-[#1E293B] rounded-xl overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-[#F4F2EC] dark:bg-[#0B1120] border-b border-[#E5E2DC] dark:border-[#1E293B]">
              <tr>
                <th className="py-3 px-4 font-semibold text-[#111827] dark:text-[#F8FAFC]">
                  Command
                </th>
                <th className="py-3 px-4 font-semibold text-[#111827] dark:text-[#F8FAFC]">
                  Purpose
                </th>
                <th className="py-3 px-4 font-semibold text-[#111827] dark:text-[#F8FAFC] text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFECE6] dark:divide-[#1E293B]">
              {SPECIAL_COMMANDS.map((def) => (
                <tr
                  key={def.command}
                  className="hover:bg-[#FAF9F6] dark:hover:bg-[#1E293B]/60"
                >
                  <td className="py-3 px-4 font-mono text-xs font-semibold text-[#1E40AF] dark:text-[#60A5FA] whitespace-nowrap">
                    {def.command}
                  </td>
                  <td className="py-3 px-4 text-[#3F3F46] dark:text-[#CBD5E1]">
                    {def.shortDesc}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => onTriggerCommand(def.command)}
                      className="px-3 py-1.5 min-h-[34px] text-xs font-medium text-[#1E40AF] dark:text-[#60A5FA] hover:bg-[#EFF6FF] dark:hover:bg-[#1E293B] border border-[#BFDBFE] dark:border-[#3B82F6]/40 rounded-md transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Run {def.label}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
