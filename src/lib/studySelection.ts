import { isDueForReview } from "./reviewScheduling.ts";
import type { LevelFilter, StudyState, Vocab } from "../types";

export type StudyPool = "new" | "due" | "weak" | "all";

type StudySelectionOptions = {
  now?: number;
  shuffle?: <T>(items: T[]) => T[];
};

export function selectVocabsForStudy(
  vocabs: Vocab[],
  studyStates: Record<string, StudyState>,
  pool: StudyPool,
  levelFilter: LevelFilter,
  limit: number,
  options: StudySelectionOptions = {},
) {
  const now = options.now ?? Date.now();
  const shuffle = options.shuffle ?? shuffleItems;
  const eligibleVocabs = vocabs.filter((vocab) => {
    const state = studyStates[vocab.id];

    return matchesLevelFilter(vocab, levelFilter) && !state?.isIgnored;
  });
  const poolVocabs = filterPool(eligibleVocabs, studyStates, pool, now);
  const prioritizedVocabs = shuffle(poolVocabs).sort((left, right) =>
    compareStudyPriority(left, right, studyStates, pool),
  );

  return shuffle(prioritizedVocabs.slice(0, limit));
}

export function matchesLevelFilter(vocab: Vocab, levelFilter: LevelFilter) {
  return (
    levelFilter === "all" ||
    (levelFilter === "A1+A2" &&
      (vocab.level === "A1" || vocab.level === "A2")) ||
    vocab.level === levelFilter
  );
}

function filterPool(
  vocabs: Vocab[],
  studyStates: Record<string, StudyState>,
  pool: StudyPool,
  now: number,
) {
  if (pool === "new") {
    return vocabs.filter((vocab) => {
      const state = studyStates[vocab.id];

      return (state?.seenCount ?? 0) === 0;
    });
  }

  if (pool === "due") {
    return vocabs.filter((vocab) => {
      const state = studyStates[vocab.id];

      return state ? isDueForReview(state, now) : false;
    });
  }

  return vocabs;
}

function compareStudyPriority(
  left: Vocab,
  right: Vocab,
  studyStates: Record<string, StudyState>,
  pool: StudyPool,
) {
  const leftState = studyStates[left.id];
  const rightState = studyStates[right.id];

  if (pool === "weak") {
    return (
      (rightState?.wrongCount ?? 0) - (leftState?.wrongCount ?? 0) ||
      (rightState?.difficulty ?? 0) - (leftState?.difficulty ?? 0) ||
      (leftState?.box ?? 0) - (rightState?.box ?? 0) ||
      (leftState?.seenCount ?? 0) - (rightState?.seenCount ?? 0)
    );
  }

  if (pool === "due") {
    return (
      (leftState?.nextReviewAt ?? 0) - (rightState?.nextReviewAt ?? 0) ||
      (leftState?.seenCount ?? 0) - (rightState?.seenCount ?? 0)
    );
  }

  return (leftState?.seenCount ?? 0) - (rightState?.seenCount ?? 0);
}

function shuffleItems<T>(items: T[]) {
  const shuffled = items.slice();

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}
