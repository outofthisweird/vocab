import assert from "node:assert/strict";
import { test } from "node:test";
import { aSeriesVocabulary } from "../src/data/aSeriesVocabulary.ts";
import { isVocabReadyForAnswerType } from "../src/lib/vocabQuality.ts";

test("includes the full A-series seed range", () => {
  const a1Count = aSeriesVocabulary.filter((vocab) => vocab.level === "A1").length;
  const a2Count = aSeriesVocabulary.filter((vocab) => vocab.level === "A2").length;

  assert.ok(aSeriesVocabulary.length >= 1300);
  assert.ok(a1Count >= 490);
  assert.ok(a2Count >= 850);
});

test("keeps A-series seed ids and required fields valid", () => {
  const ids = new Set<string>();

  for (const vocab of aSeriesVocabulary) {
    assert.ok(vocab.id);
    assert.ok(vocab.lemma);
    assert.ok(vocab.display);
    assert.ok(vocab.koreanGloss);
    assert.ok(!ids.has(vocab.id), `duplicate vocab id: ${vocab.id}`);
    ids.add(vocab.id);
  }
});

test("deduplicates cross-level entries with the same lemma and part of speech", () => {
  const seen = new Map<string, string>();
  const duplicateKeys: string[] = [];

  for (const vocab of aSeriesVocabulary) {
    const duplicateKey = `${slugGerman(vocab.lemma)}:${vocab.partOfSpeech ?? "unknown"}`;
    const previousLevel = seen.get(duplicateKey);

    if (previousLevel && previousLevel !== vocab.level) {
      duplicateKeys.push(`${duplicateKey} (${previousLevel}/${vocab.level})`);
    }

    seen.set(duplicateKey, vocab.level);
  }

  assert.deepEqual(duplicateKeys, []);
});

test("keeps true homographs when their parts of speech differ", () => {
  assert.ok(
    aSeriesVocabulary.some(
      (vocab) => vocab.lemma === "morgen" && vocab.partOfSpeech === "adverb",
    ),
  );
  assert.ok(
    aSeriesVocabulary.some(
      (vocab) => vocab.lemma === "Morgen" && vocab.partOfSpeech === "noun",
    ),
  );
  assert.ok(
    aSeriesVocabulary.some(
      (vocab) => vocab.lemma === "Arm" && vocab.partOfSpeech === "noun",
    ),
  );
  assert.ok(
    aSeriesVocabulary.some(
      (vocab) => vocab.lemma === "arm" && vocab.partOfSpeech === "other",
    ),
  );
});

test("does not ship generated entries as translation-needed placeholders", () => {
  const translationNeededEntries = aSeriesVocabulary.filter(
    (vocab) =>
      vocab.translationStatus === "needs-review" ||
      vocab.koreanGloss === "번역 필요" ||
      vocab.tags?.includes("needs-translation"),
  );

  assert.deepEqual(translationNeededEntries, []);
});

test("adds quality metadata to every A-series entry", () => {
  for (const vocab of aSeriesVocabulary) {
    assert.ok(vocab.quality, `${vocab.id} is missing quality metadata`);
    assert.ok(Array.isArray(vocab.quality.reviewReasons));
  }
});

test("flags missing articles and raw plural markers", () => {
  const a2Pc = aSeriesVocabulary.find(
    (vocab) => vocab.source === "goethe-a2" && vocab.lemma === "PC",
  )!;

  assert.equal(a2Pc.partOfSpeech, "noun");
  assert.equal(a2Pc.article, undefined);
  assert.equal(a2Pc.plural, "-s");
  assert.equal(a2Pc.quality?.article, "missing");
  assert.equal(a2Pc.quality?.plural, "raw");
  assert.ok(a2Pc.quality?.reviewReasons.includes("article-missing"));
});

test("marks extracted fragments and variants as unsafe for listening", () => {
  const fragment = aSeriesVocabulary.find(
    (vocab) => vocab.display === "Lieblings-",
  )!;
  const blogVariant = aSeriesVocabulary.find(
    (vocab) => vocab.lemma === "der/das Blog",
  )!;

  assert.equal(fragment.quality?.entryKind, "bound-form");
  assert.equal(fragment.quality?.tts, "needs-cleanup");
  assert.equal(
    isVocabReadyForAnswerType(fragment, "meaning"),
    false,
  );
  assert.equal(blogVariant.quality?.entryKind, "variant");
  assert.equal(blogVariant.quality?.tts, "needs-cleanup");
  assert.equal(
    isVocabReadyForAnswerType(blogVariant, "listening"),
    false,
  );
});

test("keeps suffix-inferred glosses out of quiz pools", () => {
  const inferredGlossEntry = aSeriesVocabulary.find(
    (vocab) => vocab.quality?.translation === "rule-inferred",
  )!;

  assert.ok(inferredGlossEntry);
  assert.equal(
    isVocabReadyForAnswerType(inferredGlossEntry, "meaning"),
    false,
  );
});

function slugGerman(value: string) {
  return (
    value
      .toLocaleLowerCase("de-DE")
      .replace(/ä/gu, "ae")
      .replace(/ö/gu, "oe")
      .replace(/ü/gu, "ue")
      .replace(/ß/gu, "ss")
      .replace(/[^a-z0-9]+/gu, "-")
      .replace(/^-|-$/gu, "") || "entry"
  );
}
