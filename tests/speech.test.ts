import assert from "node:assert/strict";
import { test } from "node:test";
import { sampleVocabulary } from "../src/data/sampleVocabulary.ts";
import {
  resolveGermanSpeechRate,
  SLOW_PLAYBACK_RATE_MULTIPLIER,
} from "../src/lib/speech.ts";

const ttsOptions = {
  enabled: true,
  lang: "de-DE" as const,
  rate: 0.85,
};

test("lowers the normal German speech rate slightly", () => {
  const table = sampleVocabulary.find((vocab) => vocab.lemma === "Tisch")!;

  assert.equal(resolveGermanSpeechRate(table, ttsOptions, 1), 0.7);
});

test("plays half speed from the adjusted base speech rate", () => {
  const table = sampleVocabulary.find((vocab) => vocab.lemma === "Tisch")!;

  assert.equal(
    resolveGermanSpeechRate(table, ttsOptions, SLOW_PLAYBACK_RATE_MULTIPLIER),
    0.35,
  );
});
