import assert from "node:assert/strict";
import { test } from "node:test";
import { aSeriesVocabulary } from "../src/data/aSeriesVocabulary.ts";
import { isVocabReadyForAnswerType } from "../src/lib/vocabQuality.ts";

test("includes the full A-series seed range", () => {
  const a1Count = aSeriesVocabulary.filter((vocab) => vocab.level === "A1").length;
  const a2Count = aSeriesVocabulary.filter((vocab) => vocab.level === "A2").length;

  assert.ok(a1Count >= 600);
  assert.ok(a2Count >= 1200);
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
  const a2Task = aSeriesVocabulary.find(
    (vocab) => vocab.source === "goethe-a2" && vocab.lemma === "Aufgabe",
  )!;

  assert.equal(a2Task.partOfSpeech, "noun");
  assert.equal(a2Task.article, undefined);
  assert.equal(a2Task.plural, "-n");
  assert.equal(a2Task.quality?.article, "missing");
  assert.equal(a2Task.quality?.plural, "raw");
  assert.ok(a2Task.quality?.reviewReasons.includes("article-missing"));
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
