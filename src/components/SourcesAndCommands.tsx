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
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-slate-50 tracking-tight">
              Verified References for {topic}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 tabular-nums">
              {sources.length} grounded {sources.length === 1 ? 'source' : 'sources'} collected in
              this session
            </p>
          </div>
          <button
            type="button"
            disabled={isBusy}
            onClick={onFetchSources}
            className="px-4 py-2 min-h-[40px] text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 shadow-xs"
          >
            Find Authoritative Sources (/sources)
          </button>
        </div>

        {sources.length > 0 && (
          <div className="relative">
            <Search
              className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter references by title, domain, or URL..."
              aria-label="Filter verified references"
              className="w-full pl-10 pr-4 py-2.5 min-h-[42px] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-blue-600 dark:focus:border-blue-500"
            />
          </div>
        )}

        {sources.length === 0 ? (
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-3 shadow-xs">
            <p className="text-base font-medium text-slate-900 dark:text-slate-50">
              No external sources gathered yet
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              Ask a research question or run{' '}
              <span className="font-mono text-blue-600 dark:text-blue-400">/sources</span> or{' '}
              <span className="font-mono text-blue-600 dark:text-blue-400">/research</span> with
              Web Search Grounding enabled to collect verified URLs and academic references.
            </p>
          </div>
        ) : filteredSources.length === 0 ? (
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            No verified sources match &ldquo;{query}&rdquo;.
          </div>
        ) : (
          <ul className="space-y-3">
            {filteredSources.map((src) => {
              const isCopied = copiedUrl === src.url;
              return (
                <li
                  key={src.url}
                  className="flex items-start justify-between gap-3 p-4 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500/50 rounded-2xl transition-all shadow-xs"
                >
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-0 group space-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                        {src.title}
                      </p>
                      <ExternalLink
                        className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 shrink-0"
                        aria-hidden="true"
                      />
                    </div>
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {src.domain}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500 break-all">
                      {src.url}
                    </p>
                  </a>

                  <button
                    type="button"
                    onClick={() => handleCopy(src.url)}
                    aria-label={`Copy URL for ${src.title}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#0B1220] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {isCopied ? (
                      <>
                        <Check
                          className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"
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
        <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
          <h1 className="font-display text-2xl font-semibold text-slate-900 dark:text-slate-50 tracking-tight">
            Expert Commands for {topic}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Type any command directly in the prompt bar or click an action below to run it.
          </p>
        </div>

        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto shadow-xs">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-50 dark:bg-[#0B1220] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                  Command
                </th>
                <th className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                  Purpose
                </th>
                <th className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100 text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {SPECIAL_COMMANDS.map((def) => (
                <tr
                  key={def.command}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="py-3 px-4 font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                    {def.command}
                  </td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                    {def.shortDesc}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => onTriggerCommand(def.command)}
                      className="px-3 py-1.5 min-h-[34px] text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 border border-blue-200 dark:border-blue-500/40 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
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
