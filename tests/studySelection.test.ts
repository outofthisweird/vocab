import assert from "node:assert/strict";
import { test } from "node:test";
import {
  matchesLevelFilter,
  selectVocabsForStudy,
} from "../src/lib/studySelection.ts";
import type { StudyState, Vocab } from "../src/types.ts";

const NOW = 1_700_000_000_000;

test("matches CEFR level filters including A1+A2", () => {
  assert.equal(matchesLevelFilter(createVocab("a1", "A1"), "A1+A2"), true);
  assert.equal(matchesLevelFilter(createVocab("a2", "A2"), "A1+A2"), true);
  assert.equal(matchesLevelFilter(createVocab("b1", "B1"), "A1+A2"), false);
  assert.equal(matchesLevelFilter(createVocab("b2", "B2"), "all"), true);
});

test("selects only unseen words for the new pool", () => {
  const vocabs = [
    createVocab("seen", "A1"),
    createVocab("unseen-a1", "A1"),
    createVocab("unseen-a2", "A2"),
  ];
  const states = {
    seen: createState("seen", { seenCount: 2 }),
  };

  const selected = selectVocabsForStudy(
    vocabs,
    states,
    "new",
    "A1+A2",
    10,
    stableOptions(),
  );

  assert.deepEqual(
    selected.map((vocab) => vocab.id),
    ["unseen-a1", "unseen-a2"],
  );
});

test("selects only due and unscheduled words for the due pool", () => {
  const vocabs = [
    createVocab("due", "A1"),
    createVocab("future", "A1"),
    createVocab("unscheduled", "A1"),
  ];
  const states = {
    due: createState("due", { nextReviewAt: NOW - 1_000 }),
    future: createState("future", { nextReviewAt: NOW + 1_000 }),
    unscheduled: createState("unscheduled"),
  };

  const selected = selectVocabsForStudy(
    vocabs,
    states,
    "due",
    "A1",
    10,
    stableOptions(),
  );

  assert.deepEqual(
    selected.map((vocab) => vocab.id),
    ["unscheduled", "due"],
  );
});

test("prioritizes weak words by wrong count, difficulty, then low box", () => {
  const vocabs = [
    createVocab("steady", "A1"),
    createVocab("wrongest", "A1"),
    createVocab("harder", "A1"),
    createVocab("lower-box", "A1"),
  ];
  const states = {
    steady: createState("steady", {
      wrongCount: 0,
      difficulty: 0.7,
      box: 1,
    }),
    wrongest: createState("wrongest", {
      wrongCount: 3,
      difficulty: 0.1,
      box: 6,
    }),
    harder: createState("harder", {
      wrongCount: 1,
      difficulty: 0.9,
      box: 4,
    }),
    "lower-box": createState("lower-box", {
      wrongCount: 1,
      difficulty: 0.9,
      box: 0,
    }),
  };

  const selected = selectVocabsForStudy(
    vocabs,
    states,
    "weak",
    "A1",
    10,
    stableOptions(),
  );

  assert.deepEqual(
    selected.map((vocab) => vocab.id),
    ["wrongest", "lower-box", "harder", "steady"],
  );
});

test("excludes ignored words and respects the result limit", () => {
  const vocabs = [
    createVocab("ignored", "A1"),
    createVocab("keep-a1", "A1"),
    createVocab("keep-a2", "A2"),
    createVocab("skip-b1", "B1"),
  ];
  const states = {
    ignored: createState("ignored", { isIgnored: true }),
    "keep-a1": createState("keep-a1", { seenCount: 4 }),
    "keep-a2": createState("keep-a2", { seenCount: 1 }),
    "skip-b1": createState("skip-b1", { seenCount: 0 }),
  };

  const selected = selectVocabsForStudy(
    vocabs,
    states,
    "all",
    "A1+A2",
    1,
    stableOptions(),
  );

  assert.deepEqual(
    selected.map((vocab) => vocab.id),
    ["keep-a2"],
  );
});

function stableOptions() {
  return {
    now: NOW,
    shuffle: <T>(items: T[]) => items.slice(),
  };
}

function createVocab(id: string, level: Vocab["level"]): Vocab {
  return {
    id,
    level,
    source:
      level === "A1" ? "goethe-a1" : level === "A2" ? "goethe-a2" : "manual",
    lemma: id,
    display: id,
    koreanGloss: `${id} gloss`,
    translationStatus: "manual",
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function createState(
  vocabId: string,
  overrides: Partial<StudyState> = {},
): StudyState {
  return {
    vocabId,
    seenCount: 0,
    correctCount: 0,
    wrongCount: 0,
    difficulty: 0,
    box: 0,
    ...overrides,
  };
}
