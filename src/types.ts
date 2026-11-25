import type { TtsVoiceName } from './utils/ttsText';

export type KnowledgeLevel = 'adaptive' | 'beginner' | 'intermediate' | 'advanced';
export type ResponseSpeed = 'standard' | 'fast';
export type ResearchMode = 'qa' | 'research' | 'learn' | 'summarize' | 'analyze';
export type AppTheme = 'dark' | 'light' | 'system';
export type MessageFeedback = 'up' | 'down' | null;

export type ResearchModeId =
  | 'quick'
  | 'deep'
  | 'academic'
  | 'basics'
  | 'compare'
  | 'report';

export interface UserSettings {
  theme: AppTheme;
  defaultLevel: KnowledgeLevel;
  defaultResponseSpeed: ResponseSpeed;
  defaultSearchGrounding: boolean;
  ttsVoice: TtsVoiceName;
}

export type SpecialCommandName =
  | '/learn'
  | '/research'
  | '/explain'
  | '/analyze'
  | '/compare'
  | '/examples'
  | '/quiz'
  | '/summarize'
  | '/advanced'
  | '/sources'
  | '/change-topic';

export interface CommandDefinition {
  command: SpecialCommandName;
  label: string;
  shortDesc: string;
  placeholder: string;
  modeLabel: string;
  prefersSearch: boolean;
  prefersDeepThinking: boolean;
}

export interface TopicBranch {
  id: string;
  title: string;
  summary: string;
  subtopics: string[];
}

export interface TopicTerm {
  term: string;
  definition: string;
}

export interface TopicKnowledgeStructure {
  topic: string;
  domain: string;
  overview: string;
  prerequisites: string[];
  branches: TopicBranch[];
  keyTerms: TopicTerm[];
  coreTheories: string[];
  applications: string[];
}

export interface GroundingSource {
  title: string;
  url: string;
  domain: string;
}

export interface McqQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ShortAnswerQuestion {
  id: string;
  question: string;
  modelAnswer: string;
  keyPoints: string[];
}

export interface LongAnswerQuestion {
  id: string;
  question: string;
  modelAnswer: string;
  rubricPoints: string[];
}

export interface QuestionBank {
  generatedAt: string;
  focus: string;
  difficulty: KnowledgeLevel;
  mcqs: McqQuestion[];
  shortAnswers: ShortAnswerQuestion[];
  longAnswers: LongAnswerQuestion[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  command?: SpecialCommandName | null;
  modeLabel?: string;
  timestamp: string;
  sources?: GroundingSource[];
  searchGrounded?: boolean;
  groundingNote?: string;
  groundingNotice?: string;
  responseSpeed?: ResponseSpeed;
  feedback?: MessageFeedback;
  isStreaming?: boolean;
  error?: string;
}

export interface TopicSession {
  id: string;
  topic: string;
  level: KnowledgeLevel;
  searchGrounding: boolean;
  responseSpeed?: ResponseSpeed;
  activeMode?: ResearchMode;
  researchModeId?: ResearchModeId;
  knowledgeMap: TopicKnowledgeStructure;
  exploredItems: string[];
  messages: ChatMessage[];
  allSources: GroundingSource[];
  questionBank?: QuestionBank;
  createdAt: string;
  updatedAt: string;
}
