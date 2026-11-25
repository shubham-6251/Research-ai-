export const TTS_VOICES = [
  { id: 'Kore', label: 'Kore (Clear)' },
  { id: 'Zephyr', label: 'Zephyr (Warm)' },
  { id: 'Charon', label: 'Charon (Measured)' },
  { id: 'Puck', label: 'Puck (Bright)' },
  { id: 'Fenrir', label: 'Fenrir (Deep)' },
] as const;

export type TtsVoiceName = (typeof TTS_VOICES)[number]['id'];

export function isValidTtsVoice(value: unknown): value is TtsVoiceName {
  return TTS_VOICES.some((v) => v.id === value);
}

function cleanLatexExpression(expr: string): string {
  return expr
    .replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '$1 over $2')
    .replace(/\\lfloor/g, 'floor of ')
    .replace(/\\rfloor/g, '')
    .replace(/\\lceil/g, 'ceiling of ')
    .replace(/\\rceil/g, '')
    .replace(/\\rightarrow|\\to/g, ' leads to ')
    .replace(/\\leftrightarrow/g, ' if and only if ')
    .replace(/\\times/g, ' times ')
    .replace(/\\cdot/g, ' times ')
    .replace(/\\approx/g, ' approximately ')
    .replace(/\\neq/g, ' not equal to ')
    .replace(/\\leq/g, ' less than or equal to ')
    .replace(/\\geq/g, ' greater than or equal to ')
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function prepareTextForSpeech(markdown: string, maxChars = 4200): string {
  if (!markdown || typeof markdown !== 'string') return '';

  let text = markdown;

  // Replace fenced code blocks with a concise spoken cue
  text = text.replace(/```[\s\S]*?```/g, ' See the code block in the written explanation. ');

  // Convert Markdown links [label](url) -> label
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');

  // Remove table separator rows like | :--- | :--- |
  text = text.replace(/^\s*\|?(?:\s*:?-{2,}:?\s*\|)+\s*:?-{2,}:?\s*\|?\s*$/gm, '');

  // Convert table pipe rows into readable comma-separated clauses
  text = text.replace(/^\s*\|(.+)\|\s*$/gm, (_match, row: string) => {
    const cells = row
      .split('|')
      .map((c) => c.trim())
      .filter(Boolean);
    return cells.length > 0 ? `${cells.join(': ')}. ` : '';
  });

  // Clean block and inline LaTeX math
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_m, expr: string) => ` ${cleanLatexExpression(expr)}. `);
  text = text.replace(/\$([^$\n]+)\$/g, (_m, expr: string) => ` ${cleanLatexExpression(expr)} `);

  // Strip Markdown formatting syntax while keeping sentence structure
  text = text
    .replace(/^#{1,6}\s+(.+)$/gm, '$1. ')
    .replace(/^>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/\r?\n{2,}/g, '. ')
    .replace(/\r?\n/g, ' ')
    .replace(/\.{2,}/g, '.')
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (text.length <= maxChars) {
    return text;
  }

  // Truncate cleanly at the last sentence boundary before maxChars
  const slice = text.slice(0, maxChars);
  const lastBoundary = Math.max(
    slice.lastIndexOf('. '),
    slice.lastIndexOf('! '),
    slice.lastIndexOf('? ')
  );
  if (lastBoundary > maxChars * 0.5) {
    return slice.slice(0, lastBoundary + 1).trim();
  }
  return `${slice.trim()}...`;
}

export function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
