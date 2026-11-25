import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Check, Copy } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

function CodeBlock({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const codeText = String(children ?? '').replace(/\n$/, '');

  const isInline = !className && !codeText.includes('\n');
  if (isInline) {
    return <code>{children}</code>;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard unavailable in headless/restricted contexts
    }
  };

  return (
    <div className="my-4 rounded-lg overflow-hidden border border-[#27272A] bg-[#18181B]">
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#222226] border-b border-[#2E2E34] text-xs text-[#A1A1AA]">
        <span className="font-mono">{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs text-[#D4D4D8] hover:text-white hover:bg-[#2E2E34] transition-colors cursor-pointer"
          aria-label="Copy code block"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="!m-0 !border-0 !rounded-none">
        <code className={className}>{codeText}</code>
      </pre>
    </div>
  );
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="expert-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code: ({ className, children }) => (
            <CodeBlock className={className}>{children}</CodeBlock>
          ),
          a: ({ href, children }) => {
            const safeHref =
              href && (href.startsWith('http://') || href.startsWith('https://'))
                ? href
                : undefined;
            if (!safeHref) {
              return <span>{children}</span>;
            }
            return (
              <a href={safeHref} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
