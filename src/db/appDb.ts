import Dexie, { type Table } from "dexie";
import { aSeriesVocabulary } from "../data/aSeriesVocabulary";
import type {
  AppSettingsRecord,
  DatasetMeta,
  ImportLog,
  StudyState,
  TestSession,
  Vocab,
} from "../types";

const A_SERIES_DATASET_ID = "goethe-a-series-v1";
const A_SERIES_DATASET_VERSION = "1.1.2";

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
  await seedASeriesVocabulary();
  await seedDefaultSettings();
}

export async function seedASeriesVocabulary() {
  await db.transaction(
    "rw",
    db.vocabs,
    db.studyStates,
    db.datasetMeta,
    async () => {
      const installedDataset = await db.datasetMeta.get(A_SERIES_DATASET_ID);
      const shouldRefreshDataset =
        !installedDataset ||
        installedDataset.version !== A_SERIES_DATASET_VERSION ||
        installedDataset.vocabCount !== aSeriesVocabulary.length;

      if (!shouldRefreshDataset) {
        return;
      }

      const existingStudyStateIds = new Set(
        (await db.studyStates.toCollection().primaryKeys()).map(String),
      );
      const missingStudyStates = aSeriesVocabulary
        .filter((vocab) => !existingStudyStateIds.has(vocab.id))
        .map((vocab) => createInitialStudyState(vocab.id));
      const currentVocabIds = new Set(aSeriesVocabulary.map((vocab) => vocab.id));
      const staleASeriesVocabs = (
        await db.vocabs.where("source").anyOf("goethe-a1", "goethe-a2").toArray()
      ).filter((vocab) => !currentVocabIds.has(vocab.id));
      const staleASeriesVocabIds = staleASeriesVocabs.map((vocab) => vocab.id);

      await db.vocabs.bulkPut(aSeriesVocabulary);

      if (missingStudyStates.length > 0) {
        await db.studyStates.bulkAdd(missingStudyStates);
      }

      if (staleASeriesVocabIds.length > 0) {
        await db.vocabs.bulkDelete(staleASeriesVocabIds);
        await db.studyStates.bulkDelete(staleASeriesVocabIds);
      }

      await db.datasetMeta.put({
        id: A_SERIES_DATASET_ID,
        name: "Goethe A-series vocabulary seed",
        version: A_SERIES_DATASET_VERSION,
        vocabCount: aSeriesVocabulary.length,
        installedAt: installedDataset?.installedAt ?? Date.now(),
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
