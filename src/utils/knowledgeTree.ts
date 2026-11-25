import type { TopicBranch, TopicKnowledgeStructure, TopicTerm } from '../types';

function cleanStringArray(value: unknown, max = 12): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, max);
}

export function normalizeKnowledgeStructure(
  raw: unknown,
  fallbackTopic: string
): TopicKnowledgeStructure {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  const topic =
    typeof obj.topic === 'string' && obj.topic.trim().length > 0
      ? obj.topic.trim()
      : fallbackTopic.trim();

  const domain =
    typeof obj.domain === 'string' && obj.domain.trim().length > 0
      ? obj.domain.trim()
      : 'Interdisciplinary Field';

  const overview =
    typeof obj.overview === 'string' && obj.overview.trim().length > 0
      ? obj.overview.trim()
      : `Comprehensive expert knowledge structure for ${topic}.`;

  const rawBranches = Array.isArray(obj.branches) ? obj.branches : [];
  const branches: TopicBranch[] = rawBranches
    .filter((b): b is Record<string, unknown> => Boolean(b && typeof b === 'object'))
    .map((b, idx) => {
      const title =
        typeof b.title === 'string' && b.title.trim().length > 0
          ? b.title.trim()
          : `Branch ${idx + 1}`;
      const summary =
        typeof b.summary === 'string' && b.summary.trim().length > 0 ? b.summary.trim() : '';
      const subtopics = cleanStringArray(b.subtopics, 8);
      return {
        id: `branch-${idx + 1}`,
        title,
        summary,
        subtopics,
      };
    })
    .slice(0, 8);

  const rawTerms = Array.isArray(obj.keyTerms) ? obj.keyTerms : [];
  const keyTerms: TopicTerm[] = rawTerms
    .filter((t): t is Record<string, unknown> => Boolean(t && typeof t === 'object'))
    .map((t) => ({
      term: typeof t.term === 'string' ? t.term.trim() : '',
      definition: typeof t.definition === 'string' ? t.definition.trim() : '',
    }))
    .filter((t) => t.term.length > 0 && t.definition.length > 0)
    .slice(0, 12);

  return {
    topic,
    domain,
    overview,
    prerequisites: cleanStringArray(obj.prerequisites, 8),
    branches,
    keyTerms,
    coreTheories: cleanStringArray(obj.coreTheories, 8),
    applications: cleanStringArray(obj.applications, 8),
  };
}

export function getAllTrackableItems(structure: TopicKnowledgeStructure): string[] {
  const items = new Set<string>();
  for (const branch of structure.branches) {
    for (const sub of branch.subtopics) {
      items.add(sub);
    }
  }
  return Array.from(items);
}

export function computeStudyProgress(
  structure: TopicKnowledgeStructure,
  exploredItems: string[]
): { exploredCount: number; totalCount: number; percentage: number } {
  const all = getAllTrackableItems(structure);
  const totalCount = all.length;
  if (totalCount === 0) {
    return { exploredCount: 0, totalCount: 0, percentage: 0 };
  }
  const exploredSet = new Set(exploredItems.map((i) => i.toLowerCase()));
  const exploredCount = all.filter((item) => exploredSet.has(item.toLowerCase())).length;
  const percentage = Math.round((exploredCount / totalCount) * 100);
  return { exploredCount, totalCount, percentage };
}

export function detectMentionedItems(
  text: string,
  structure: TopicKnowledgeStructure
): string[] {
  if (!text || text.trim().length === 0) return [];
  const lower = text.toLowerCase();
  const matched: string[] = [];

  for (const item of getAllTrackableItems(structure)) {
    const target = item.toLowerCase();
    if (target.length >= 3 && lower.includes(target)) {
      matched.push(item);
    }
  }

  return matched;
}
