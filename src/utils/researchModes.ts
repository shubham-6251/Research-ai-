import { detectDeveloperIdentitySignal } from './developerIdentity';
import type {
  KnowledgeLevel,
  ResearchMode,
  ResearchModeId,
  ResponseSpeed,
  SpecialCommandName,
} from '../types';

export interface ResearchModeOption {
  id: ResearchModeId;
  label: string;
  shortLabel: string;
  description: string;
  apiMode: ResearchMode;
  commandPrefix?: SpecialCommandName;
  forcedSpeed?: ResponseSpeed;
  preferredLevel?: KnowledgeLevel;
  prefersSearch: boolean;
}

export const RESEARCH_MODES: readonly ResearchModeOption[] = [
  {
    id: 'quick',
    label: 'Quick Answer',
    shortLabel: 'Quick',
    description: 'Direct, low-latency answers for fast lookups and follow-ups.',
    apiMode: 'qa',
    forcedSpeed: 'fast',
    prefersSearch: true,
  },
  {
    id: 'deep',
    label: 'Deep Research',
    shortLabel: 'Deep Research',
    description: 'Systematic investigation with verified web citations and trade-offs.',
    apiMode: 'research',
    commandPrefix: '/research',
    prefersSearch: true,
  },
  {
    id: 'academic',
    label: 'Academic Research',
    shortLabel: 'Academic',
    description: 'Formal definitions, derivations, methodology critique, and primary sources.',
    apiMode: 'research',
    commandPrefix: '/advanced',
    preferredLevel: 'advanced',
    prefersSearch: true,
  },
  {
    id: 'basics',
    label: 'Explain from Basics',
    shortLabel: 'From Basics',
    description: 'Guided beginner-to-advanced walkthrough with intuition and examples.',
    apiMode: 'learn',
    commandPrefix: '/learn',
    preferredLevel: 'beginner',
    prefersSearch: false,
  },
  {
    id: 'compare',
    label: 'Compare Topics',
    shortLabel: 'Compare',
    description: 'Structured side-by-side matrix contrasting mechanisms, pros, and use cases.',
    apiMode: 'analyze',
    commandPrefix: '/compare',
    prefersSearch: true,
  },
  {
    id: 'report',
    label: 'Generate Report',
    shortLabel: 'Report',
    description: 'Comprehensive executive briefing structured for PDF and Markdown export.',
    apiMode: 'research',
    commandPrefix: '/research',
    prefersSearch: true,
  },
] as const;

export function getResearchModeById(id?: ResearchModeId | null): ResearchModeOption {
  return RESEARCH_MODES.find((m) => m.id === id) ?? RESEARCH_MODES[1];
}

export function inferResearchModeId(
  researchModeId?: ResearchModeId,
  activeMode?: ResearchMode,
  responseSpeed?: ResponseSpeed
): ResearchModeId {
  if (researchModeId && RESEARCH_MODES.some((m) => m.id === researchModeId)) {
    return researchModeId;
  }
  if (activeMode === 'learn') return 'basics';
  if (activeMode === 'analyze') return 'compare';
  if (activeMode === 'summarize') return 'report';
  if (activeMode === 'research') return 'deep';
  if (responseSpeed === 'fast' || activeMode === 'qa') return 'quick';
  return 'deep';
}

export function prepareMessageForMode(
  rawText: string,
  modeId: ResearchModeId
): {
  dispatchText: string;
  apiMode: ResearchMode;
  modeLabel: string;
} {
  const trimmed = rawText.trim();
  const mode = getResearchModeById(modeId);

  if (trimmed.startsWith('/')) {
    return {
      dispatchText: trimmed,
      apiMode: mode.apiMode,
      modeLabel: mode.label,
    };
  }

  const devSignal = detectDeveloperIdentitySignal(trimmed);
  if (devSignal.triggered && trimmed.length <= 75) {
    return {
      dispatchText: trimmed,
      apiMode: 'qa',
      modeLabel: 'Developer Recognition',
    };
  }

  if (mode.id === 'report') {
    return {
      dispatchText: `/research Produce a structured research report with executive overview, core findings, evidence, and key takeaways for: ${trimmed}`,
      apiMode: mode.apiMode,
      modeLabel: mode.label,
    };
  }

  if (mode.id === 'academic') {
    return {
      dispatchText: `/advanced Provide an academic research analysis with formal foundations, citations, methodology, and open questions for: ${trimmed}`,
      apiMode: mode.apiMode,
      modeLabel: mode.label,
    };
  }

  if (mode.commandPrefix) {
    return {
      dispatchText: `${mode.commandPrefix} ${trimmed}`,
      apiMode: mode.apiMode,
      modeLabel: mode.label,
    };
  }

  return {
    dispatchText: trimmed,
    apiMode: mode.apiMode,
    modeLabel: mode.label,
  };
}

export interface LandingPromptSuggestion {
  id: string;
  title: string;
  topic: string;
  initialPrompt: string;
  modeId: ResearchModeId;
}

export const LANDING_SUGGESTIONS: readonly LandingPromptSuggestion[] = [
  {
    id: 'science',
    title: 'Explain a complex scientific concept.',
    topic: 'Quantum Entanglement & Bell Inequalities',
    initialPrompt:
      'Explain quantum entanglement and Bell inequalities from intuitive basics up to the mathematical formulation.',
    modeId: 'basics',
  },
  {
    id: 'technology',
    title: 'Research a technology.',
    topic: 'Solid-State Battery Architectures',
    initialPrompt:
      'Research current solid-state battery architectures, electrolyte materials, scaling bottlenecks, and commercial timelines.',
    modeId: 'deep',
  },
  {
    id: 'compare',
    title: 'Compare two competing ideas.',
    topic: 'Transformer Attention vs State Space Models',
    initialPrompt:
      'Compare Transformer self-attention and selective State Space Models (Mamba) across compute complexity, memory, and long-context recall.',
    modeId: 'compare',
  },
  {
    id: 'history',
    title: 'Explore a historical event.',
    topic: 'The Bretton Woods Monetary System',
    initialPrompt:
      'Examine the origins, institutional design, structural tensions, and 1971 collapse of the Bretton Woods system.',
    modeId: 'deep',
  },
  {
    id: 'business',
    title: 'Analyse a business concept.',
    topic: 'Platform Network Effects & Switching Costs',
    initialPrompt:
      'Analyze direct and indirect network effects, multi-homing risk, and defensibility in modern software platforms.',
    modeId: 'compare',
  },
  {
    id: 'report',
    title: 'Generate a structured research report.',
    topic: 'Global Semiconductor Supply Chain Resilience',
    initialPrompt:
      'Global Semiconductor Supply Chain Resilience: lithography dependencies, fabrication concentration, geopolitical risks, and mitigation strategies.',
    modeId: 'report',
  },
] as const;

export function deriveTopicFromInput(rawInput: string): {
  topic: string;
  initialQuestion: string;
} {
  const cleaned = rawInput.trim().replace(/\s+/g, ' ');
  if (!cleaned) {
    return { topic: '', initialQuestion: '' };
  }

  // Strip leading slash command if user typed one directly on the landing bar
  const withoutCmd = cleaned.replace(/^\/[a-z-]+\s*/i, '').trim() || cleaned;

  if (/\bshubham\s+verma\b/i.test(withoutCmd) && withoutCmd.length <= 60) {
    return {
      topic: 'Shubham Verma — Athenaeum Developer',
      initialQuestion: cleaned,
    };
  }

  // Derive a crisp <= 90-char topic title for knowledge-map initialization
  let candidate = withoutCmd
    .replace(/^(what is|what are|how does|how do|explain|research|compare|analyze|analyse|summarize|tell me about)\s+/i, '')
    .replace(/[?.!]+$/, '')
    .trim();

  if (candidate.length < 3) {
    candidate = withoutCmd;
  }
  if (candidate.length > 90) {
    candidate = `${candidate.slice(0, 87).trim()}...`;
  }

  return {
    topic: candidate.charAt(0).toUpperCase() + candidate.slice(1),
    initialQuestion: cleaned,
  };
}
