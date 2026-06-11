import assert from "node:assert/strict";
import { test } from "node:test";
import { aSeriesVocabulary } from "../src/data/aSeriesVocabulary.ts";
import {
  resolveGermanSpeechRate,
  resolveGermanVoice,
  SLOW_PLAYBACK_RATE_MULTIPLIER,
} from "../src/lib/speech.ts";

const ttsOptions = {
  enabled: true,
  lang: "de-DE" as const,
  rate: 0.85,
};

test("lowers the normal German speech rate slightly", () => {
  const table = aSeriesVocabulary.find((vocab) => vocab.lemma === "Tisch")!;

  assert.equal(resolveGermanSpeechRate(table, ttsOptions, 1), 0.7);
});

test("plays half speed from the adjusted base speech rate", () => {
  const table = aSeriesVocabulary.find((vocab) => vocab.lemma === "Tisch")!;

  assert.equal(
    resolveGermanSpeechRate(table, ttsOptions, SLOW_PLAYBACK_RATE_MULTIPLIER),
    0.35,
  );
});

test("prefers a female German voice for feminine nouns", () => {
  const feminineNoun = aSeriesVocabulary.find(
    (vocab) => vocab.partOfSpeech === "noun" && vocab.article === "die",
  )!;

  assert.equal(
    resolveGermanVoice(feminineNoun, [
      createVoice("Markus", "de-DE"),
      createVoice("Anna", "de-DE"),
    ])?.name,
    "Anna",
  );
});

test("prefers a male German voice for masculine, neuter, and article-less words", () => {
  const articleLessWord = aSeriesVocabulary.find(
    (vocab) => vocab.partOfSpeech !== "noun",
  )!;

  assert.equal(
    resolveGermanVoice(articleLessWord, [
      createVoice("Anna", "de-DE"),
      createVoice("Markus", "de-DE"),
    ])?.name,
    "Markus",
  );
});

test("does not fall back to a known female default voice for masculine nouns", () => {
  const masculineNoun = aSeriesVocabulary.find(
    (vocab) => vocab.partOfSpeech === "noun" && vocab.article === "der",
  )!;

  assert.equal(
    resolveGermanVoice(masculineNoun, [
      createVoice("Anna", "de-DE", true),
      createVoice("German Generic", "de-DE"),
    ])?.name,
    "German Generic",
  );
});

test("does not fall back to a known female default voice for neuter nouns", () => {
  const neuterNoun = aSeriesVocabulary.find(
    (vocab) => vocab.partOfSpeech === "noun" && vocab.article === "das",
  )!;

  assert.equal(
    resolveGermanVoice(neuterNoun, [
      createVoice("Anna", "de-DE", true),
      createVoice("German Generic", "de-DE"),
    ])?.name,
    "German Generic",
  );
});

function createVoice(name: string, lang: string, isDefault = false) {
  return {
    default: isDefault,
    lang,
    localService: true,
    name,
    voiceURI: name,
  } as SpeechSynthesisVoice;
}
