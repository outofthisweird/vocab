import assert from "node:assert/strict";
import { test } from "node:test";
import { applyAnswerToStudyState } from "../src/lib/reviewScheduling.ts";
import type { StudyState } from "../src/types.ts";

const initialState: StudyState = {
  vocabId: "word-1",
  seenCount: 0,
  correctCount: 0,
  wrongCount: 0,
  difficulty: 0,
  box: 0,
};

test("moves a correct answer forward and schedules a later review", () => {
  const answeredAt = 1_700_000_000_000;
  const nextState = applyAnswerToStudyState(
    initialState,
    true,
    "article",
    answeredAt,
  );

  assert.equal(nextState.seenCount, 1);
  assert.equal(nextState.correctCount, 1);
  assert.equal(nextState.articleCorrectCount, 1);
  assert.equal(nextState.wrongCount, 0);
  assert.equal(nextState.box, 1);
  assert.equal(nextState.nextReviewAt! > answeredAt, true);
});

test("resets the box and increases difficulty after a wrong answer", () => {
  const answeredAt = 1_700_000_000_000;
  const nextState = applyAnswerToStudyState(
    { ...initialState, box: 3, difficulty: 0.2 },
    false,
    "listening",
    answeredAt,
  );

  assert.equal(nextState.seenCount, 1);
  assert.equal(nextState.correctCount, 0);
  assert.equal(nextState.wrongCount, 1);
  assert.equal(nextState.listeningWrongCount, 1);
  assert.equal(nextState.box, 0);
  assert.equal(nextState.difficulty, 0.38);
});
