import { useEffect, useMemo, useState } from "react";
import { db, getAppSettings, seedAppData } from "../db/appDb";
import { SLOW_PLAYBACK_RATE_MULTIPLIER, speakGerman } from "../lib/speech";
import { resolveVocabQuality } from "../lib/vocabQuality";
import type {
  AppSettingsRecord,
  LevelFilter,
  PartOfSpeech,
  StudyState,
  Vocab,
} from "../types";

type PartOfSpeechFilter = PartOfSpeech | "all";

export function VocabularyPage() {
  const [vocabs, setVocabs] = useState<Vocab[]>([]);
  const [studyStates, setStudyStates] = useState<Record<string, StudyState>>(
    {},
  );
  const [settings, setSettings] = useState<AppSettingsRecord | null>(null);
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("A1+A2");
  const [partOfSpeechFilter, setPartOfSpeechFilter] =
    useState<PartOfSpeechFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadVocabs() {
      try {
        await seedAppData();
        const storedVocabs = await db.vocabs.orderBy("display").toArray();
        const storedStudyStates = await db.studyStates.toArray();
        const storedSettings = await getAppSettings();

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
              : "Vocabulary could not be loaded.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadVocabs();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredVocabs = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("de-DE");

    return vocabs.filter((vocab) => {
      const matchesLevel = matchesLevelFilter(vocab, levelFilter);
      const matchesPartOfSpeech =
        partOfSpeechFilter === "all" ||
        vocab.partOfSpeech === partOfSpeechFilter;
      const searchableText = [
        vocab.display,
        vocab.lemma,
        vocab.koreanGloss,
        ...(vocab.koreanGlossAlt ?? []),
        vocab.germanExample,
        vocab.koreanExampleMeaning,
        ...(vocab.tags ?? []),
        ...(vocab.quality?.reviewReasons ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("de-DE");

      return (
        matchesLevel &&
        matchesPartOfSpeech &&
        (!normalizedQuery || searchableText.includes(normalizedQuery))
      );
    });
  }, [levelFilter, partOfSpeechFilter, query, vocabs]);

  function handleSpeak(vocab: Vocab, rateMultiplier = 1) {
    if (settings) {
      speakGerman(vocab, settings.tts, { rateMultiplier });
    }
  }

  return (
    <section className="vocabulary-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Vocabulary</p>
          <h2>A-series words</h2>
        </div>
        <p className="word-count">
          {filteredVocabs.length} / {vocabs.length} words
        </p>
      </div>

      {isLoading && <p className="status">Loading vocabulary...</p>}
      {error && <p className="status error">{error}</p>}

      {!isLoading && !error && (
        <>
          <div className="vocab-toolbar" aria-label="Vocabulary filters">
            <label className="field">
              <span>Search</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tisch, 책상, home"
                type="search"
              />
            </label>
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
              <span>Part</span>
              <select
                value={partOfSpeechFilter}
                onChange={(event) =>
                  setPartOfSpeechFilter(
                    event.target.value as PartOfSpeechFilter,
                  )
                }
              >
                <option value="all">All</option>
                <option value="noun">Noun</option>
                <option value="verb">Verb</option>
                <option value="adjective">Adjective</option>
                <option value="adverb">Adverb</option>
                <option value="phrase">Phrase</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>

          {filteredVocabs.length === 0 ? (
            <p className="status">No matching words.</p>
          ) : (
            <ul className="vocab-list">
              {filteredVocabs.map((vocab) => {
                const studyState = studyStates[vocab.id];
                const quality = resolveVocabQuality(vocab);
                const canSpeak = quality.tts === "ready";

                return (
                  <li className="vocab-row" key={vocab.id}>
                    <div className="vocab-main">
                      <div>
                        <p className="vocab-display">{vocab.display}</p>
                        <p className="vocab-gloss">{vocab.koreanGloss}</p>
                      </div>
                      <div className="row-actions">
                        <button
                          aria-label={`${vocab.lemma} pronunciation`}
                          className="icon-button"
                          disabled={!canSpeak}
                          onClick={() => handleSpeak(vocab)}
                          type="button"
                        >
                          ▶
                        </button>
                        <button
                          aria-label={`${vocab.lemma} pronunciation at half speed`}
                          className="icon-button rate-button"
                          disabled={!canSpeak}
                          onClick={() =>
                            handleSpeak(vocab, SLOW_PLAYBACK_RATE_MULTIPLIER)
                          }
                          type="button"
                        >
                          0.5x
                        </button>
                        <span className="level-pill">{vocab.level}</span>
                      </div>
                    </div>
                    <div className="vocab-meta">
                      {vocab.partOfSpeech && <span>{vocab.partOfSpeech}</span>}
                      {quality.translation === "needs-review" && (
                        <span>translation needed</span>
                      )}
                      {quality.translation === "rule-inferred" && (
                        <span>rule-inferred gloss</span>
                      )}
                      {quality.article === "missing" && (
                        <span>article missing</span>
                      )}
                      {quality.plural === "raw" && <span>raw plural</span>}
                      {quality.tts === "needs-cleanup" && (
                        <span>tts cleanup</span>
                      )}
                      {(quality.entryKind === "bound-form" ||
                        quality.entryKind === "needs-cleanup") && (
                        <span>{quality.entryKind}</span>
                      )}
                      {studyState && (
                        <span>
                          seen {studyState.seenCount} / box {studyState.box}
                        </span>
                      )}
                    </div>
                    {vocab.germanExample && (
                      <p className="example">
                        {vocab.germanExample}
                        {vocab.koreanExampleMeaning
                          ? ` ${vocab.koreanExampleMeaning}`
                          : ""}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function matchesLevelFilter(vocab: Vocab, levelFilter: LevelFilter) {
  return (
    levelFilter === "all" ||
    (levelFilter === "A1+A2" &&
      (vocab.level === "A1" || vocab.level === "A2")) ||
    vocab.level === levelFilter
  );
}
