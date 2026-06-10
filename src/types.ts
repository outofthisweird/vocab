export type VocabLevel = "A1" | "A2";

export type VocabSource = "goethe-a1" | "goethe-a2" | "manual";

export type PartOfSpeech =
  | "noun"
  | "verb"
  | "adjective"
  | "adverb"
  | "phrase"
  | "other";

export type Article = "der" | "die" | "das";

export type TranslationStatus =
  | "llm-draft"
  | "reviewed"
  | "manual"
  | "needs-review";

export type Vocab = {
  id: string;
  level: VocabLevel;
  source: VocabSource;
  lemma: string;
  display: string;
  koreanGloss: string;
  koreanGlossAlt?: string[];
  partOfSpeech?: PartOfSpeech;
  article?: Article;
  plural?: string;
  germanExample?: string;
  koreanExampleMeaning?: string;
  tags?: string[];
  pronunciation?: {
    lang: "de-DE";
    ttsText?: string;
    ipa?: string;
    slowRate?: number;
  };
  translationStatus: TranslationStatus;
  createdAt: number;
  updatedAt: number;
};

export type StudyState = {
  vocabId: string;
  seenCount: number;
  correctCount: number;
  wrongCount: number;
  articleCorrectCount?: number;
  articleWrongCount?: number;
  spellingCorrectCount?: number;
  spellingWrongCount?: number;
  listeningCorrectCount?: number;
  listeningWrongCount?: number;
  lastStudiedAt?: number;
  nextReviewAt?: number;
  difficulty: number;
  box: number;
  isFavorite?: boolean;
  isIgnored?: boolean;
};

export type TestMode =
  | "learn-new"
  | "de-to-kr"
  | "kr-to-de"
  | "listening-spelling"
  | "article"
  | "mixed"
  | "review-wrong";

export type TestResult = {
  vocabId: string;
  prompt: string;
  expectedAnswer: string;
  userAnswer?: string;
  isCorrect: boolean;
  answerType: "meaning" | "spelling" | "article" | "listening" | "manual";
  answeredAt: number;
};

export type TestSession = {
  id: string;
  mode: TestMode;
  levelFilter?: VocabLevel | "A1+A2";
  vocabIds: string[];
  startedAt: number;
  finishedAt?: number;
  results: TestResult[];
};

export type AppSettings = {
  defaultLevel: VocabLevel | "A1+A2";
  dailyNewWordCount: number;
  dailyReviewCount: number;
  tts: {
    enabled: boolean;
    lang: "de-DE";
    rate: number;
    selectedVoiceName?: string;
    repeatCount: number;
  };
  test: {
    strictUmlaut: boolean;
    strictCase: boolean;
    allowArticleOmission: boolean;
  };
  ui: {
    showKoreanFirst: boolean;
    showExamples: boolean;
  };
};

export type AppSettingsRecord = AppSettings & {
  id: "default";
};

export type DatasetMeta = {
  id: string;
  name: string;
  version: string;
  vocabCount: number;
  installedAt: number;
  updatedAt: number;
};

export type ImportLog = {
  id: string;
  source: string;
  importedAt: number;
  addedCount: number;
  updatedCount: number;
  skippedCount: number;
};
