import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  createInitialStudyState,
  db,
  getAppSettings,
  seedAppData,
} from "../db/appDb";
import {
  checkAnswer,
  type AnswerCheckResult,
  type AnswerType,
} from "../lib/answerChecking";
import {
  applyAnswerToStudyState,
  isDueForReview,
} from "../lib/reviewScheduling";
import { SLOW_PLAYBACK_RATE_MULTIPLIER, speakGerman } from "../lib/speech";
import { isVocabReadyForAnswerType } from "../lib/vocabQuality";
import type {
  AppSettingsRecord,
  LevelFilter,
  StudyState,
  TestMode,
  TestResult,
  TestSession,
  Vocab,
} from "../types";

type Question = {
  vocab: Vocab;
  answerType: AnswerType;
  prompt: string;
  label: string;
  needsAudio: boolean;
};

const TEST_MODES: Array<{ value: TestMode; label: string }> = [
  { value: "de-to-kr", label: "DE -> KR" },
  { value: "kr-to-de", label: "KR -> DE" },
  { value: "listening-spelling", label: "Listening" },
  { value: "article", label: "Article" },
  { value: "mixed", label: "Mixed" },
  { value: "learn-new", label: "New" },
  { value: "review-wrong", label: "Review" },
];

export function TestPage() {
  const [vocabs, setVocabs] = useState<Vocab[]>([]);
  const [studyStates, setStudyStates] = useState<Record<string, StudyState>>(
    {},
  );
  const [settings, setSettings] = useState<AppSettingsRecord | null>(null);
  const [mode, setMode] = useState<TestMode>("de-to-kr");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("A1+A2");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [session, setSession] = useState<TestSession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [checkResult, setCheckResult] = useState<AnswerCheckResult | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadTestData() {
      try {
        await seedAppData();

        const [storedVocabs, storedStudyStates, storedSettings] =
          await Promise.all([
            db.vocabs.orderBy("display").toArray(),
            db.studyStates.toArray(),
            getAppSettings(),
          ]);

        if (isMounted) {
          setVocabs(storedVocabs);
          setStudyStates(
            Object.fromEntries(
              storedStudyStates.map((state) => [state.vocabId, state]),
            ),
          );
          setSettings(storedSettings);
          setLevelFilter(storedSettings.defaultLevel);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Test data could not be loaded.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadTestData();

    return () => {
      isMounted = false;
    };
  }, []);

  const currentQuestion = questions[currentIndex] ?? null;
  const completedCount = session?.results.length ?? 0;
  const correctCount =
    session?.results.filter((result) => result.isCorrect).length ?? 0;
  const isFinished = Boolean(session?.finishedAt);
  const canAdvanceWithEnter = Boolean(
    checkResult && session && currentQuestion,
  );

  const dueCount = useMemo(() => {
    const now = Date.now();

    return Object.values(studyStates).filter((state) =>
      isDueForReview(state, now),
    ).length;
  }, [studyStates]);

  useEffect(() => {
    if (!canAdvanceWithEnter) {
      return;
    }

    function handleEnterToAdvance(event: KeyboardEvent) {
      if (event.key !== "Enter" || event.repeat || event.isComposing) {
        return;
      }

      event.preventDefault();
      handleNextQuestion();
    }

    window.addEventListener("keydown", handleEnterToAdvance);

    return () => {
      window.removeEventListener("keydown", handleEnterToAdvance);
    };
  }, [canAdvanceWithEnter]);

  async function handleStartSession() {
    if (!settings) {
      return;
    }

    const selectedVocabs = selectVocabsForMode(
      vocabs,
      studyStates,
      mode,
      levelFilter,
      settings,
    );

    if (selectedVocabs.length === 0) {
      setError("No words available for this mode.");
      return;
    }

    const startedAt = Date.now();
    const nextQuestions = selectedVocabs.map((vocab, index) =>
      createQuestion(vocab, mode, index),
    );
    const nextSession: TestSession = {
      id: createSessionId(),
      mode,
      levelFilter,
      vocabIds: selectedVocabs.map((vocab) => vocab.id),
      startedAt,
      results: [],
    };

    await db.testSessions.add(nextSession);

    setError(null);
    setQuestions(nextQuestions);
    setSession(nextSession);
    setCurrentIndex(0);
    setAnswer("");
    setCheckResult(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentQuestion || !session || !settings || checkResult) {
      return;
    }

    const trimmedAnswer = answer.trim();

    if (!trimmedAnswer) {
      return;
    }

    setIsSubmitting(true);

    try {
      const answeredAt = Date.now();
      const nextCheckResult = checkAnswer(
        currentQuestion.vocab,
        currentQuestion.answerType,
        trimmedAnswer,
        settings.test,
      );
      const result: TestResult = {
        vocabId: currentQuestion.vocab.id,
        prompt: currentQuestion.prompt,
        expectedAnswer: nextCheckResult.expectedAnswer,
        userAnswer: trimmedAnswer,
        isCorrect: nextCheckResult.isCorrect,
        answerType: currentQuestion.answerType,
        answeredAt,
      };
      const previousState =
        (await db.studyStates.get(currentQuestion.vocab.id)) ??
        createInitialStudyState(currentQuestion.vocab.id);
      const nextStudyState = applyAnswerToStudyState(
        previousState,
        nextCheckResult.isCorrect,
        currentQuestion.answerType,
        answeredAt,
      );
      const nextSession: TestSession = {
        ...session,
        results: [...session.results, result],
        finishedAt:
          currentIndex >= questions.length - 1 ? answeredAt : session.finishedAt,
      };

      await db.transaction(
        "rw",
        db.studyStates,
        db.testSessions,
        async () => {
          await db.studyStates.put(nextStudyState);
          await db.testSessions.put(nextSession);
        },
      );

      setStudyStates((current) => ({
        ...current,
        [nextStudyState.vocabId]: nextStudyState,
      }));
      setSession(nextSession);
      setCheckResult(nextCheckResult);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Answer could not be saved.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleNextQuestion() {
    setCurrentIndex((index) => index + 1);
    setAnswer("");
    setCheckResult(null);
  }

  function handleSpeak(rateMultiplier = 1) {
    if (settings && currentQuestion) {
      speakGerman(currentQuestion.vocab, settings.tts, { rateMultiplier });
    }
  }

  return (
    <section className="test-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Test</p>
          <h2>Practice loop</h2>
        </div>
        <p className="word-count">{dueCount} due</p>
      </div>

      {isLoading && <p className="status">Loading test data...</p>}
      {error && <p className="status error">{error}</p>}

      {!isLoading && !error && !session && (
        <div className="test-setup">
          <div className="mode-grid" aria-label="Test mode">
            {TEST_MODES.map((testMode) => (
              <button
                className={mode === testMode.value ? "mode active" : "mode"}
                key={testMode.value}
                onClick={() => setMode(testMode.value)}
                type="button"
              >
                {testMode.label}
              </button>
            ))}
          </div>

          <div className="vocab-toolbar">
            <label className="field compact">
              <span>Level</span>
              <select
                value={levelFilter}
                onChange={(event) =>
                  setLevelFilter(event.target.value as LevelFilter)
                }
              >
                <option value="all">All</option>
                <option value="A1+A2">A1+A2</option>
                <option value="A1">A1</option>
                <option value="A2">A2</option>
                <option value="B1">B1</option>
                <option value="B2">B2</option>
                <option value="C1">C1</option>
                <option value="C2">C2</option>
              </select>
            </label>
            <button className="primary-button" onClick={handleStartSession}>
              Start
            </button>
          </div>
        </div>
      )}

      {!isLoading && !error && session && currentQuestion && (
        <div className="test-card">
          <div className="test-progress">
            <span>
              {currentIndex + 1} / {questions.length}
            </span>
            <span>
              {correctCount} correct / {completedCount} done
            </span>
          </div>

          <div className="prompt-block">
            <p className="eyebrow">{currentQuestion.label}</p>
            <h3>{currentQuestion.prompt}</h3>
            {currentQuestion.needsAudio && (
              <div className="audio-controls" aria-label="Listening controls">
                <button
                  className="secondary-button"
                  onClick={() => handleSpeak()}
                  type="button"
                >
                  Play
                </button>
                <button
                  className="secondary-button"
                  onClick={() => handleSpeak(SLOW_PLAYBACK_RATE_MULTIPLIER)}
                  type="button"
                >
                  0.5x
                </button>
              </div>
            )}
          </div>

          <form className="answer-form" onSubmit={handleSubmit}>
            {currentQuestion.answerType === "article" ? (
              <div className="answer-options">
                {["der", "die", "das"].map((article) => (
                  <button
                    className={
                      answer === article
                        ? "answer-option active"
                        : "answer-option"
                    }
                    disabled={Boolean(checkResult)}
                    key={article}
                    onClick={() => setAnswer(article)}
                    type="button"
                  >
                    {article}
                  </button>
                ))}
              </div>
            ) : (
              <label className="field">
                <span>Answer</span>
                <input
                  autoComplete="off"
                  autoFocus
                  disabled={Boolean(checkResult)}
                  onChange={(event) => setAnswer(event.target.value)}
                  value={answer}
                />
              </label>
            )}

            {!checkResult ? (
              <button
                className="primary-button"
                disabled={isSubmitting || !answer.trim()}
                type="submit"
              >
                Check
              </button>
            ) : (
              <button
                className="primary-button"
                onClick={handleNextQuestion}
                type="button"
              >
                {isFinished ? "Summary" : "Next"}
              </button>
            )}
          </form>

          {checkResult && (
            <div
              className={
                checkResult.isCorrect ? "result-panel correct" : "result-panel"
              }
            >
              <p>{checkResult.isCorrect ? "Correct" : "Review"}</p>
              <span>Expected: {checkResult.expectedAnswer}</span>
            </div>
          )}
        </div>
      )}

      {!isLoading && !error && session && isFinished && !currentQuestion && (
        <div className="summary-panel">
          <p className="eyebrow">Summary</p>
          <h3>
            {correctCount} / {questions.length} correct
          </h3>
          <button
            className="secondary-button"
            onClick={() => {
              setSession(null);
              setQuestions([]);
              setCurrentIndex(0);
              setAnswer("");
              setCheckResult(null);
            }}
            type="button"
          >
            New session
          </button>
        </div>
      )}
    </section>
  );
}

function selectVocabsForMode(
  vocabs: Vocab[],
  studyStates: Record<string, StudyState>,
  mode: TestMode,
  levelFilter: LevelFilter,
  settings: AppSettingsRecord,
) {
  const now = Date.now();
  const eligibleVocabs = vocabs.filter((vocab) => {
    const state = studyStates[vocab.id];
    const matchesLevel = matchesLevelFilter(vocab, levelFilter);
    const matchesMode = canUseVocabForMode(vocab, mode);

    return matchesLevel && matchesMode && !state?.isIgnored;
  });

  let pool = eligibleVocabs;

  if (mode === "learn-new") {
    pool = eligibleVocabs.filter(
      (vocab) => (studyStates[vocab.id]?.seenCount ?? 0) === 0,
    );
  }

  if (mode === "review-wrong") {
    const wrongVocabs = eligibleVocabs.filter(
      (vocab) => (studyStates[vocab.id]?.wrongCount ?? 0) > 0,
    );
    const dueWrongVocabs = wrongVocabs.filter((vocab) =>
      isDueForReview(studyStates[vocab.id], now),
    );

    pool = dueWrongVocabs.length > 0 ? dueWrongVocabs : wrongVocabs;
  }

  const limit =
    mode === "learn-new"
      ? settings.dailyNewWordCount
      : mode === "review-wrong"
        ? settings.dailyReviewCount
        : 10;

  return pool
    .slice()
    .sort((left, right) => {
      const leftState = studyStates[left.id];
      const rightState = studyStates[right.id];

      if (mode === "review-wrong") {
        return (
          (rightState?.wrongCount ?? 0) - (leftState?.wrongCount ?? 0) ||
          (leftState?.nextReviewAt ?? 0) - (rightState?.nextReviewAt ?? 0)
        );
      }

      return (
        (leftState?.seenCount ?? 0) - (rightState?.seenCount ?? 0) ||
        left.display.localeCompare(right.display, "de-DE")
      );
    })
    .slice(0, limit);
}

function matchesLevelFilter(vocab: Vocab, levelFilter: LevelFilter) {
  return (
    levelFilter === "all" ||
    (levelFilter === "A1+A2" &&
      (vocab.level === "A1" || vocab.level === "A2")) ||
    vocab.level === levelFilter
  );
}

function canUseVocabForMode(vocab: Vocab, mode: TestMode) {
  if (mode === "article") {
    return isVocabReadyForAnswerType(vocab, "article");
  }

  if (mode === "listening-spelling") {
    return isVocabReadyForAnswerType(vocab, "listening");
  }

  if (mode === "kr-to-de") {
    return isVocabReadyForAnswerType(vocab, "spelling");
  }

  if (mode === "mixed") {
    return getReadyAnswerTypes(vocab).length > 0;
  }

  return isVocabReadyForAnswerType(vocab, "meaning");
}

function createQuestion(vocab: Vocab, mode: TestMode, index: number): Question {
  const answerType = getAnswerType(vocab, mode, index);

  if (answerType === "meaning") {
    return {
      vocab,
      answerType,
      prompt: vocab.display,
      label: "Meaning",
      needsAudio: false,
    };
  }

  if (answerType === "article") {
    return {
      vocab,
      answerType,
      prompt: vocab.lemma,
      label: "Article",
      needsAudio: false,
    };
  }

  if (answerType === "listening") {
    return {
      vocab,
      answerType,
      prompt: "Listen",
      label: "Spelling",
      needsAudio: true,
    };
  }

  return {
    vocab,
    answerType,
    prompt: vocab.koreanGloss,
    label: "Spelling",
    needsAudio: false,
  };
}

function getAnswerType(
  vocab: Vocab,
  mode: TestMode,
  index: number,
): AnswerType {
  if (mode === "article") {
    return "article";
  }

  if (mode === "kr-to-de") {
    return "spelling";
  }

  if (mode === "listening-spelling") {
    return "listening";
  }

  if (mode === "mixed") {
    const options = getReadyAnswerTypes(vocab);

    return options[index % options.length];
  }

  return "meaning";
}

function getReadyAnswerTypes(vocab: Vocab): AnswerType[] {
  return (["meaning", "spelling", "article", "listening"] as AnswerType[]).filter(
    (answerType) => isVocabReadyForAnswerType(vocab, answerType),
  );
}

function createSessionId() {
  return globalThis.crypto?.randomUUID?.() ?? `session-${Date.now()}`;
}
