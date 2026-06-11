import { useEffect, useMemo, useState } from "react";
import {
  createInitialStudyState,
  db,
  getAppSettings,
  seedAppData,
} from "../db/appDb";
import {
  applyAnswerToStudyState,
  isDueForReview,
} from "../lib/reviewScheduling";
import {
  SLOW_PLAYBACK_RATE_MULTIPLIER,
  speakGerman,
} from "../lib/speech";
import {
  selectVocabsForStudy,
  type StudyPool,
} from "../lib/studySelection";
import { resolveVocabQuality } from "../lib/vocabQuality";
import type {
  AppSettingsRecord,
  LevelFilter,
  StudyState,
  Vocab,
} from "../types";

const STUDY_POOLS: Array<{ value: StudyPool; label: string }> = [
  { value: "new", label: "New" },
  { value: "due", label: "Due" },
  { value: "weak", label: "Weak" },
  { value: "all", label: "All" },
];

const CARD_COUNT_OPTIONS = [10, 20, 30] as const;
type CardCountOption = (typeof CARD_COUNT_OPTIONS)[number];

export function StudyPage() {
  const [vocabs, setVocabs] = useState<Vocab[]>([]);
  const [studyStates, setStudyStates] = useState<Record<string, StudyState>>(
    {},
  );
  const [settings, setSettings] = useState<AppSettingsRecord | null>(null);
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("A1+A2");
  const [pool, setPool] = useState<StudyPool>("new");
  const [cardCount, setCardCount] = useState<CardCountOption>(10);
  const [cards, setCards] = useState<Vocab[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [knownCount, setKnownCount] = useState(0);
  const [againCount, setAgainCount] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadStudyData() {
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
              : "Study data could not be loaded.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadStudyData();

    return () => {
      isMounted = false;
    };
  }, []);

  const currentCard = cards[currentIndex] ?? null;
  const currentState = currentCard ? studyStates[currentCard.id] : null;
  const isComplete = cards.length > 0 && currentIndex >= cards.length;
  const dueCount = useMemo(() => {
    const now = Date.now();

    return Object.values(studyStates).filter((state) =>
      isDueForReview(state, now),
    ).length;
  }, [studyStates]);
  const newCount = useMemo(
    () =>
      vocabs.filter((vocab) => (studyStates[vocab.id]?.seenCount ?? 0) === 0)
        .length,
    [studyStates, vocabs],
  );

  function handleStartSession() {
    const selectedVocabs = selectVocabsForStudy(
      vocabs,
      studyStates,
      pool,
      levelFilter,
      cardCount,
    );

    if (selectedVocabs.length === 0) {
      setError("No words available for this study pool.");
      return;
    }

    setError(null);
    setCards(selectedVocabs);
    setCurrentIndex(0);
    setKnownCount(0);
    setAgainCount(0);
    setIsFlipped(false);
  }

  async function handleRate(isKnown: boolean) {
    if (!currentCard || !isFlipped || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const ratedAt = Date.now();
      const previousState =
        (await db.studyStates.get(currentCard.id)) ??
        createInitialStudyState(currentCard.id);
      const nextStudyState = applyAnswerToStudyState(
        previousState,
        isKnown,
        "manual",
        ratedAt,
      );

      await db.studyStates.put(nextStudyState);

      setStudyStates((current) => ({
        ...current,
        [nextStudyState.vocabId]: nextStudyState,
      }));
      setKnownCount((count) => count + (isKnown ? 1 : 0));
      setAgainCount((count) => count + (isKnown ? 0 : 1));
      setCurrentIndex((index) => index + 1);
      setIsFlipped(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Study progress could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleSpeak(rateMultiplier = 1) {
    if (settings && currentCard) {
      speakGerman(currentCard, settings.tts, { rateMultiplier });
    }
  }

  function resetSession() {
    setCards([]);
    setCurrentIndex(0);
    setKnownCount(0);
    setAgainCount(0);
    setIsFlipped(false);
    setError(null);
  }

  return (
    <section className="study-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Study</p>
          <h2>Level cards</h2>
        </div>
        <p className="word-count">
          {newCount} new / {dueCount} due
        </p>
      </div>

      {isLoading && <p className="status">Loading study data...</p>}
      {error && <p className="status error">{error}</p>}

      {!isLoading && cards.length === 0 && (
        <div className="study-setup">
          <div className="pool-grid" aria-label="Study pool">
            {STUDY_POOLS.map((studyPool) => (
              <button
                className={pool === studyPool.value ? "mode active" : "mode"}
                key={studyPool.value}
                onClick={() => setPool(studyPool.value)}
                type="button"
              >
                {studyPool.label}
              </button>
            ))}
          </div>

          <div className="vocab-toolbar study-controls">
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
            <label className="field compact">
              <span>Cards</span>
              <select
                value={cardCount}
                onChange={(event) =>
                  setCardCount(Number(event.target.value) as CardCountOption)
                }
              >
                {CARD_COUNT_OPTIONS.map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </label>
            <button className="primary-button" onClick={handleStartSession}>
              Start
            </button>
          </div>
        </div>
      )}

      {!isLoading && currentCard && (
        <StudyCard
          currentIndex={currentIndex}
          isFlipped={isFlipped}
          isSaving={isSaving}
          knownCount={knownCount}
          onFlip={() => setIsFlipped(true)}
          onRate={handleRate}
          onSpeak={handleSpeak}
          settings={settings}
          state={currentState}
          totalCount={cards.length}
          vocab={currentCard}
        />
      )}

      {!isLoading && isComplete && (
        <div className="summary-panel">
          <p className="eyebrow">Summary</p>
          <h3>
            {knownCount} know / {againCount} again
          </h3>
          <button
            className="secondary-button"
            onClick={resetSession}
            type="button"
          >
            New session
          </button>
        </div>
      )}
    </section>
  );
}

type StudyCardProps = {
  vocab: Vocab;
  state: StudyState | null;
  settings: AppSettingsRecord | null;
  currentIndex: number;
  totalCount: number;
  knownCount: number;
  isFlipped: boolean;
  isSaving: boolean;
  onFlip: () => void;
  onSpeak: (rateMultiplier?: number) => void;
  onRate: (isKnown: boolean) => void;
};

function StudyCard({
  vocab,
  state,
  settings,
  currentIndex,
  totalCount,
  knownCount,
  isFlipped,
  isSaving,
  onFlip,
  onSpeak,
  onRate,
}: StudyCardProps) {
  const quality = resolveVocabQuality(vocab);
  const canSpeak = Boolean(settings) && quality.tts === "ready";
  const showKoreanFirst = settings?.ui.showKoreanFirst ?? false;
  const frontText = showKoreanFirst ? vocab.koreanGloss : vocab.display;
  const backHeading = showKoreanFirst ? vocab.display : vocab.koreanGloss;

  return (
    <div className="study-card">
      <div className="test-progress">
        <span>
          {currentIndex + 1} / {totalCount}
        </span>
        <span>
          {knownCount} know / {currentIndex} done
        </span>
      </div>

      <div className={isFlipped ? "flashcard flipped" : "flashcard"}>
        <div className="flashcard-front">
          <p className="eyebrow">{showKoreanFirst ? "Meaning" : "German"}</p>
          <h3>{frontText}</h3>
          <div className="audio-controls" aria-label="Pronunciation controls">
            <button
              className="secondary-button"
              disabled={!canSpeak}
              onClick={() => onSpeak()}
              type="button"
            >
              Play
            </button>
            <button
              className="secondary-button"
              disabled={!canSpeak}
              onClick={() => onSpeak(SLOW_PLAYBACK_RATE_MULTIPLIER)}
              type="button"
            >
              0.5x
            </button>
          </div>
        </div>

        {isFlipped && (
          <div className="flashcard-back">
            <p className="eyebrow">{showKoreanFirst ? "German" : "Meaning"}</p>
            <h3>{backHeading}</h3>
            {!showKoreanFirst && <p className="study-answer">{vocab.display}</p>}
            {showKoreanFirst && (
              <p className="study-answer">{vocab.koreanGloss}</p>
            )}
            <div className="vocab-meta">
              <span>{vocab.level}</span>
              {vocab.partOfSpeech && <span>{vocab.partOfSpeech}</span>}
              {vocab.article && <span>{vocab.article}</span>}
              {vocab.plural && <span>plural {vocab.plural}</span>}
              <span>seen {state?.seenCount ?? 0}</span>
              <span>box {state?.box ?? 0}</span>
            </div>
            {vocab.germanExample && (
              <p className="example">
                {vocab.germanExample}
                {vocab.koreanExampleMeaning
                  ? ` ${vocab.koreanExampleMeaning}`
                  : ""}
              </p>
            )}
          </div>
        )}
      </div>

      {!isFlipped ? (
        <button
          className="primary-button study-wide-button"
          onClick={onFlip}
          type="button"
        >
          Flip
        </button>
      ) : (
        <div className="study-rating">
          <button
            className="secondary-button"
            disabled={isSaving}
            onClick={() => onRate(false)}
            type="button"
          >
            Again
          </button>
          <button
            className="primary-button"
            disabled={isSaving}
            onClick={() => onRate(true)}
            type="button"
          >
            Know
          </button>
        </div>
      )}
    </div>
  );
}
