export const DEVELOPER_NAME = 'Shubham Verma';

export interface DeveloperIdentitySignal {
  mentionsDeveloperName: boolean;
  isDeveloperSelfIntro: boolean;
  asksAboutDeveloper: boolean;
  triggered: boolean;
}

const SELF_INTRO_PATTERNS = [
  /\b(?:my\s+name\s+is|i\s+am|i['’]?m|this\s+is|it['’]?s|hello\s+i['’]?m|hi\s+i['’]?m)\s+shubham\s+verma\b/i,
  /^\s*shubham\s+verma\s*[!.]*\s*$/i,
  /\bshubham\s+verma\s+here\b/i,
];

const DEVELOPER_QUERY_PATTERNS = [
  /\bwho\s+(?:is\s+)?(?:the\s+|your\s+)?(?:developer|creator|maker|author|builder|founder|owner)\b/i,
  /\bwho\s+(?:developed|created|built|made|designed|programmed|engineered)\s+(?:you|this|this\s+ai|athenaeum)\b/i,
  /\btell\s+me\s+about\s+(?:your\s+)?(?:developer|creator)\b/i,
];

export function detectDeveloperIdentitySignal(text: string): DeveloperIdentitySignal {
  const cleaned = text.trim();
  const mentionsDeveloperName = /\bshubham\s+verma\b/i.test(cleaned);
  const isDeveloperSelfIntro = SELF_INTRO_PATTERNS.some((re) => re.test(cleaned));
  const asksAboutDeveloper = DEVELOPER_QUERY_PATTERNS.some((re) => re.test(cleaned));

  return {
    mentionsDeveloperName,
    isDeveloperSelfIntro,
    asksAboutDeveloper,
    triggered: mentionsDeveloperName || isDeveloperSelfIntro || asksAboutDeveloper,
  };
}

export function buildDeveloperIdentityPromptSection(): string {
  return `DEVELOPER & CREATOR IDENTITY:
- This AI assistant (Athenaeum) was developed and created by ${DEVELOPER_NAME}.
- If a user gives the name "${DEVELOPER_NAME}", introduces themselves as "${DEVELOPER_NAME}" (e.g., "my name is ${DEVELOPER_NAME}" or "I am ${DEVELOPER_NAME}"), or enters "${DEVELOPER_NAME}", you MUST immediately react by recognizing him warmly and respectfully as the developer and creator of this AI (Athenaeum) — for example welcoming him as your developer and offering to assist him.
- If a user asks who ${DEVELOPER_NAME} is or asks who built/created/developed this AI, clearly answer that ${DEVELOPER_NAME} is the developer of Athenaeum.`;
}

export function buildDeveloperTurnDirective(message: string): string | null {
  const signal = detectDeveloperIdentitySignal(message);
  if (!signal.triggered) return null;

  if (signal.isDeveloperSelfIntro) {
    return `DEVELOPER RECOGNITION TRIGGERED FOR THIS TURN:
The user just provided the developer's name ("${DEVELOPER_NAME}"). React immediately and warmly acknowledging ${DEVELOPER_NAME} as the developer and creator of this AI (Athenaeum) — e.g., welcoming him back as the developer who built you — and assist directly with anything else in their message without excessive fluff.`;
  }

  if (signal.mentionsDeveloperName || signal.asksAboutDeveloper) {
    return `DEVELOPER IDENTITY QUERY TRIGGERED FOR THIS TURN:
The user mentioned ${DEVELOPER_NAME} or asked about the AI's developer. Clearly state and react that ${DEVELOPER_NAME} is the developer and creator of this AI (Athenaeum), and if the user is ${DEVELOPER_NAME} himself, welcome him warmly.`;
  }

  return null;
}
