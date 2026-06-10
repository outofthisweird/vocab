import Dexie, { type Table } from "dexie";
import { sampleVocabulary } from "../data/sampleVocabulary";
import type {
  AppSettingsRecord,
  DatasetMeta,
  ImportLog,
  StudyState,
  TestSession,
  Vocab,
} from "../types";

const SAMPLE_DATASET_ID = "sample-vocabulary-v1";

export const DEFAULT_SETTINGS: AppSettingsRecord = {
  id: "default",
  defaultLevel: "A1+A2",
  dailyNewWordCount: 10,
  dailyReviewCount: 20,
  tts: {
    enabled: true,
    lang: "de-DE",
    rate: 0.85,
    repeatCount: 1,
  },
  test: {
    strictUmlaut: false,
    strictCase: false,
    allowArticleOmission: true,
  },
  ui: {
    showKoreanFirst: false,
    showExamples: true,
  },
};

class GerGerDb extends Dexie {
  vocabs!: Table<Vocab, string>;
  studyStates!: Table<StudyState, string>;
  testSessions!: Table<TestSession, string>;
  settings!: Table<AppSettingsRecord, string>;
  datasetMeta!: Table<DatasetMeta, string>;
  importLogs!: Table<ImportLog, string>;

  constructor() {
    super("gerger");

    this.version(1).stores({
      vocabs: "&id, level, source, lemma, display, partOfSpeech, article, translationStatus",
      studyStates:
        "&vocabId, seenCount, wrongCount, nextReviewAt, difficulty, box, isFavorite, isIgnored",
      testSessions: "&id, mode, startedAt, finishedAt, levelFilter",
      settings: "&id",
      datasetMeta: "&id, version, installedAt",
      importLogs: "&id, source, importedAt",
    });
  }
}

export const db = new GerGerDb();

export async function seedAppData() {
  await seedSampleVocabulary();
  await seedDefaultSettings();
}

export async function seedSampleVocabulary() {
  await db.transaction(
    "rw",
    db.vocabs,
    db.studyStates,
    db.datasetMeta,
    async () => {
      const installedDataset = await db.datasetMeta.get(SAMPLE_DATASET_ID);

      if (installedDataset) {
        return;
      }

      const existingIds = new Set(
        (await db.vocabs.toCollection().primaryKeys()).map(String),
      );
      const existingStudyStateIds = new Set(
        (await db.studyStates.toCollection().primaryKeys()).map(String),
      );
      const missingVocabs = sampleVocabulary.filter(
        (vocab) => !existingIds.has(vocab.id),
      );
      const missingStudyStates = sampleVocabulary
        .filter((vocab) => !existingStudyStateIds.has(vocab.id))
        .map((vocab) => createInitialStudyState(vocab.id));

      if (missingVocabs.length > 0) {
        await db.vocabs.bulkAdd(missingVocabs);
      }

      if (missingStudyStates.length > 0) {
        await db.studyStates.bulkAdd(missingStudyStates);
      }

      await db.datasetMeta.put({
        id: SAMPLE_DATASET_ID,
        name: "Phase 1 sample vocabulary",
        version: "1.0.0",
        vocabCount: sampleVocabulary.length,
        installedAt: Date.now(),
        updatedAt: Date.now(),
      });
    },
  );
}

export async function seedDefaultSettings() {
  const storedSettings = await db.settings.get(DEFAULT_SETTINGS.id);

  if (!storedSettings) {
    await db.settings.put({ ...DEFAULT_SETTINGS });
  }
}

export async function getAppSettings() {
  await seedDefaultSettings();

  return (await db.settings.get(DEFAULT_SETTINGS.id)) ?? { ...DEFAULT_SETTINGS };
}

export function createInitialStudyState(vocabId: string): StudyState {
  return {
    vocabId,
    seenCount: 0,
    correctCount: 0,
    wrongCount: 0,
    difficulty: 0,
    box: 0,
    isFavorite: false,
    isIgnored: false,
  };
}
