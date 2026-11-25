import type { CommandDefinition, SpecialCommandName } from '../types';

export const SPECIAL_COMMANDS: readonly CommandDefinition[] = [
  {
    command: '/learn',
    label: 'Learn',
    shortDesc: 'Teach from prerequisites and basics to advanced mastery',
    placeholder: '/learn [optional subtopic or focus]',
    modeLabel: 'Teaching Mode',
    prefersSearch: false,
    prefersDeepThinking: false,
  },
  {
    command: '/research',
    label: 'Research',
    shortDesc: 'Conduct systematic deep research with verified sources',
    placeholder: '/research [specific aspect or research question]',
    modeLabel: 'Deep Research',
    prefersSearch: true,
    prefersDeepThinking: true,
  },
  {
    command: '/explain',
    label: 'Explain',
    shortDesc: 'Explain a specific concept clearly with examples',
    placeholder: '/explain [concept or term]',
    modeLabel: 'Concept Explanation',
    prefersSearch: true,
    prefersDeepThinking: false,
  },
  {
    command: '/analyze',
    label: 'Analyze',
    shortDesc: 'Analyze a topic, document, system, or problem step by step',
    placeholder: '/analyze [problem, scenario, or text]',
    modeLabel: 'Analytical Mode',
    prefersSearch: true,
    prefersDeepThinking: true,
  },
  {
    command: '/compare',
    label: 'Compare',
    shortDesc: 'Compare two or more concepts with structured trade-offs',
    placeholder: '/compare [Concept A] vs [Concept B]',
    modeLabel: 'Comparative Analysis',
    prefersSearch: true,
    prefersDeepThinking: false,
  },
  {
    command: '/examples',
    label: 'Examples',
    shortDesc: 'Provide practical examples, derivations, and case studies',
    placeholder: '/examples [concept or use case]',
    modeLabel: 'Applied Examples',
    prefersSearch: true,
    prefersDeepThinking: false,
  },
  {
    command: '/quiz',
    label: 'Quiz',
    shortDesc: 'Generate practice questions and evaluate understanding',
    placeholder: '/quiz [optional subtopic or difficulty]',
    modeLabel: 'Practice Quiz',
    prefersSearch: false,
    prefersDeepThinking: false,
  },
  {
    command: '/summarize',
    label: 'Summarize',
    shortDesc: 'Distill core takeaways and mental models concisely',
    placeholder: '/summarize [topic or subtopic]',
    modeLabel: 'Executive Summary',
    prefersSearch: false,
    prefersDeepThinking: false,
  },
  {
    command: '/advanced',
    label: 'Advanced',
    shortDesc: 'Provide rigorous technical, mathematical, or research depth',
    placeholder: '/advanced [subtopic or mechanism]',
    modeLabel: 'Advanced Technical',
    prefersSearch: true,
    prefersDeepThinking: true,
  },
  {
    command: '/sources',
    label: 'Sources',
    shortDesc: 'List authoritative documentation, papers, and references',
    placeholder: '/sources [optional subtopic]',
    modeLabel: 'Verified References',
    prefersSearch: true,
    prefersDeepThinking: false,
  },
  {
    command: '/change-topic',
    label: 'Change Topic',
    shortDesc: 'Switch to a brand new subject or domain',
    placeholder: '/change-topic [optional new topic]',
    modeLabel: 'Topic Switch',
    prefersSearch: false,
    prefersDeepThinking: false,
  },
] as const;

const COMMAND_MAP = new Map<string, CommandDefinition>(
  SPECIAL_COMMANDS.map((def) => [def.command, def])
);

export interface ParsedCommandInput {
  command: SpecialCommandName | null;
  definition: CommandDefinition | null;
  argument: string;
  isChangeTopic: boolean;
  modeLabel: string;
}

export function parseCommandInput(rawInput: string): ParsedCommandInput {
  const trimmed = rawInput.trim();
  if (!trimmed.startsWith('/')) {
    const isProblem = detectProblemSolvingIntent(trimmed);
    return {
      command: null,
      definition: null,
      argument: trimmed,
      isChangeTopic: false,
      modeLabel: isProblem ? 'Problem-Solving Mode' : 'Expert Q&A',
    };
  }

  const spaceIdx = trimmed.search(/\s/);
  const token = (spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx)).toLowerCase();
  const argument = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx).trim();

  const def = COMMAND_MAP.get(token) ?? null;
  if (!def) {
    return {
      command: null,
      definition: null,
      argument: trimmed,
      isChangeTopic: false,
      modeLabel: 'Expert Q&A',
    };
  }

  return {
    command: def.command,
    definition: def,
    argument,
    isChangeTopic: def.command === '/change-topic',
    modeLabel: def.modeLabel,
  };
}

export function filterCommands(input: string): CommandDefinition[] {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) return [];
  const token = trimmed.split(/\s+/)[0].toLowerCase();
  // Only show autocomplete while typing the command token (no space after it yet)
  if (/\s/.test(trimmed)) return [];
  return SPECIAL_COMMANDS.filter((def) => def.command.startsWith(token));
}

export function detectProblemSolvingIntent(text: string): boolean {
  const lower = text.toLowerCase();
  const patterns = [
    /\bsolve\b/,
    /\bcalculate\b/,
    /\bderive\b/,
    /\bdebug\b/,
    /\bfix this\b/,
    /\bwhy does (my|this|the) code\b/,
    /\berror\b/,
    /\bexception\b/,
    /\btroubleshoot\b/,
    /\bequation\b/,
    /\bproof\b/,
    /\bprove that\b/,
    /\bimplement\b/,
    /```[\s\S]*```/,
  ];
  return patterns.some((rx) => rx.test(lower));
}
