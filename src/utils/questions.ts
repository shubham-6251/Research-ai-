import type {
  KnowledgeLevel,
  LongAnswerQuestion,
  McqQuestion,
  QuestionBank,
  ShortAnswerQuestion,
} from '../types';

export function normalizeQuestionBank(
  raw: unknown,
  focus: string,
  difficulty: KnowledgeLevel
): QuestionBank {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const rawMcqs = Array.isArray(obj.mcqs) ? obj.mcqs : [];
  const mcqs: McqQuestion[] = rawMcqs
    .map((item, idx): McqQuestion | null => {
      if (!item || typeof item !== 'object') return null;
      const rec = item as Record<string, unknown>;
      const question = typeof rec.question === 'string' ? rec.question.trim() : '';
      const rawOptions = Array.isArray(rec.options) ? rec.options : [];
      const options = rawOptions
        .map((opt) => (typeof opt === 'string' ? opt.trim() : ''))
        .filter(Boolean)
        .slice(0, 4);
      if (!question || options.length < 2) return null;
      const rawIdx = typeof rec.correctIndex === 'number' ? Math.trunc(rec.correctIndex) : 0;
      const correctIndex = rawIdx >= 0 && rawIdx < options.length ? rawIdx : 0;
      const explanation =
        typeof rec.explanation === 'string' && rec.explanation.trim().length > 0
          ? rec.explanation.trim()
          : `Correct answer: ${options[correctIndex]}.`;

      return {
        id: `mcq-${idx + 1}`,
        question,
        options,
        correctIndex,
        explanation,
      };
    })
    .filter((q): q is McqQuestion => q !== null);

  const rawShort = Array.isArray(obj.shortAnswers) ? obj.shortAnswers : [];
  const shortAnswers: ShortAnswerQuestion[] = rawShort
    .map((item, idx): ShortAnswerQuestion | null => {
      if (!item || typeof item !== 'object') return null;
      const rec = item as Record<string, unknown>;
      const question = typeof rec.question === 'string' ? rec.question.trim() : '';
      const modelAnswer =
        typeof rec.modelAnswer === 'string' ? rec.modelAnswer.trim() : '';
      if (!question || !modelAnswer) return null;
      const keyPoints = Array.isArray(rec.keyPoints)
        ? rec.keyPoints
            .map((p) => (typeof p === 'string' ? p.trim() : ''))
            .filter(Boolean)
        : [];
      return {
        id: `short-${idx + 1}`,
        question,
        modelAnswer,
        keyPoints,
      };
    })
    .filter((q): q is ShortAnswerQuestion => q !== null);

  const rawLong = Array.isArray(obj.longAnswers) ? obj.longAnswers : [];
  const longAnswers: LongAnswerQuestion[] = rawLong
    .map((item, idx): LongAnswerQuestion | null => {
      if (!item || typeof item !== 'object') return null;
      const rec = item as Record<string, unknown>;
      const question = typeof rec.question === 'string' ? rec.question.trim() : '';
      const modelAnswer =
        typeof rec.modelAnswer === 'string' ? rec.modelAnswer.trim() : '';
      if (!question || !modelAnswer) return null;
      const rubricPoints = Array.isArray(rec.rubricPoints)
        ? rec.rubricPoints
            .map((p) => (typeof p === 'string' ? p.trim() : ''))
            .filter(Boolean)
        : [];
      return {
        id: `long-${idx + 1}`,
        question,
        modelAnswer,
        rubricPoints,
      };
    })
    .filter((q): q is LongAnswerQuestion => q !== null);

  return {
    generatedAt: new Date().toISOString(),
    focus: focus.trim() || 'Core Topic',
    difficulty,
    mcqs,
    shortAnswers,
    longAnswers,
  };
}

export function scoreMcqResponses(
  mcqs: McqQuestion[],
  selections: Record<string, number>
): { answered: number; correct: number; total: number; percentage: number } {
  const total = mcqs.length;
  let answered = 0;
  let correct = 0;

  for (const q of mcqs) {
    const selected = selections[q.id];
    if (typeof selected === 'number' && selected >= 0 && selected < q.options.length) {
      answered++;
      if (selected === q.correctIndex) {
        correct++;
      }
    }
  }

  return {
    answered,
    correct,
    total,
    percentage: total > 0 ? Math.round((correct / total) * 100) : 0,
  };
}
