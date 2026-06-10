import assert from "node:assert/strict";
import { test } from "node:test";
import {
  checkAnswer,
  normalizeGermanAnswer,
  normalizeMeaningAnswer,
} from "../src/lib/answerChecking.ts";
import { aSeriesVocabulary } from "../src/data/aSeriesVocabulary.ts";

const relaxedOptions = {
  strictUmlaut: false,
  strictCase: false,
  allowArticleOmission: true,
};

test("normalizes German case and umlaut transliteration", () => {
  assert.equal(
    normalizeGermanAnswer("MÄDCHEN!", relaxedOptions),
    "maedchen",
  );
  assert.equal(
    normalizeGermanAnswer("Straße", relaxedOptions),
    "strasse",
  );
});

test("normalizes Korean punctuation and spacing", () => {
  assert.equal(normalizeMeaningAnswer("  책상! "), "책상");
});

test("accepts split Korean gloss answers", () => {
  const street = aSeriesVocabulary.find((vocab) => vocab.lemma === "Straße")!;

  assert.equal(checkAnswer(street, "meaning", "도로", relaxedOptions).isCorrect, true);
  assert.equal(checkAnswer(street, "meaning", "거리", relaxedOptions).isCorrect, true);
});

test("allows article omission when the setting is enabled", () => {
  const apple = aSeriesVocabulary.find((vocab) => vocab.lemma === "Apfel")!;

  assert.equal(checkAnswer(apple, "spelling", "Apfel", relaxedOptions).isCorrect, true);
  assert.equal(
    checkAnswer(apple, "spelling", "Apfel", {
      ...relaxedOptions,
      allowArticleOmission: false,
    }).isCorrect,
    false,
  );
});

test("accepts German umlaut transliteration when strict umlaut is disabled", () => {
  const munich = aSeriesVocabulary.find((vocab) => vocab.lemma === "München")!;

  assert.equal(checkAnswer(munich, "spelling", "Muenchen", relaxedOptions).isCorrect, true);
  assert.equal(
    checkAnswer(munich, "spelling", "Muenchen", {
      ...relaxedOptions,
      strictUmlaut: true,
    }).isCorrect,
    false,
  );
});
