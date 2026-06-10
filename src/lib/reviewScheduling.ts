import type { StudyState, TestResult } from "../types";

type AnswerType = TestResult["answerType"];

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const REVIEW_INTERVAL_BY_BOX = [
  10 * MINUTE,
  4 * HOUR,
  DAY,
  3 * DAY,
  7 * DAY,
  14 * DAY,
  30 * DAY,
] as const;

export function applyAnswerToStudyState(
  state: StudyState,
  isCorrect: boolean,
  answerType: AnswerType,
  answeredAt: number,
): StudyState {
  const nextBox = isCorrect ? Math.min(state.box + 1, 6) : 0;

  return {
    ...state,
    seenCount: state.seenCount + 1,
    correctCount: state.correctCount + (isCorrect ? 1 : 0),
    wrongCount: state.wrongCount + (isCorrect ? 0 : 1),
    articleCorrectCount:
      answerType === "article"
        ? (state.articleCorrectCount ?? 0) + (isCorrect ? 1 : 0)
        : state.articleCorrectCount,
    articleWrongCount:
      answerType === "article"
        ? (state.articleWrongCount ?? 0) + (isCorrect ? 0 : 1)
        : state.articleWrongCount,
    spellingCorrectCount:
      answerType === "spelling"
        ? (state.spellingCorrectCount ?? 0) + (isCorrect ? 1 : 0)
        : state.spellingCorrectCount,
    spellingWrongCount:
      answerType === "spelling"
        ? (state.spellingWrongCount ?? 0) + (isCorrect ? 0 : 1)
        : state.spellingWrongCount,
    listeningCorrectCount:
      answerType === "listening"
        ? (state.listeningCorrectCount ?? 0) + (isCorrect ? 1 : 0)
        : state.listeningCorrectCount,
    listeningWrongCount:
      answerType === "listening"
        ? (state.listeningWrongCount ?? 0) + (isCorrect ? 0 : 1)
        : state.listeningWrongCount,
    lastStudiedAt: answeredAt,
    nextReviewAt: answeredAt + REVIEW_INTERVAL_BY_BOX[nextBox],
    difficulty: clampDifficulty(
      state.difficulty + (isCorrect ? -0.08 : 0.18),
    ),
    box: nextBox,
  };
}

export function isDueForReview(state: StudyState, now: number) {
  return !state.nextReviewAt || state.nextReviewAt <= now;
}

function clampDifficulty(value: number) {
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}
