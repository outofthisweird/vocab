import type { TestResult, Vocab, VocabQuality } from "../types";

type QualityOptions = {
  translation?: VocabQuality["translation"];
  partOfSpeechSource?: VocabQuality["partOfSpeechSource"];
};

type AnswerType = TestResult["answerType"];

export function withVocabQuality<T extends Vocab>(
  vocab: T,
  options: QualityOptions = {},
): T {
  return {
    ...vocab,
    quality: createVocabQuality(vocab, options),
  };
}

export function resolveVocabQuality(vocab: Vocab): VocabQuality {
  return vocab.quality ?? createVocabQuality(vocab);
}

export function isVocabReadyForAnswerType(
  vocab: Vocab,
  answerType: AnswerType,
) {
  const quality = resolveVocabQuality(vocab);

  if (answerType === "article") {
    return quality.article === "present" && Boolean(vocab.article);
  }

  if (answerType === "listening") {
    return quality.tts === "ready" && isEntryUsableForQuiz(quality);
  }

  if (answerType === "meaning" || answerType === "spelling") {
    return isTranslationReadyForQuiz(quality) && isEntryUsableForQuiz(quality);
  }

  return true;
}

export function createVocabQuality(
  vocab: Pick<
    Vocab,
    | "article"
    | "display"
    | "koreanGloss"
    | "lemma"
    | "partOfSpeech"
    | "plural"
    | "pronunciation"
    | "translationStatus"
  >,
  options: QualityOptions = {},
): VocabQuality {
  const partOfSpeechSource = options.partOfSpeechSource ?? "manual";
  const partOfSpeechConfidence = inferPartOfSpeechConfidence(
    vocab,
    partOfSpeechSource,
  );
  const entryKind = inferEntryKind(vocab);
  const article = inferArticleQuality(vocab);
  const plural = inferPluralQuality(vocab);
  const tts = inferTtsQuality(vocab, entryKind);
  const translation =
    options.translation ?? inferTranslationQuality(vocab);
  const reviewReasons: VocabQuality["reviewReasons"] = [];

  if (translation === "needs-review") {
    reviewReasons.push("translation-needs-review");
  }

  if (article === "missing") {
    reviewReasons.push("article-missing");
  }

  if (plural === "raw") {
    reviewReasons.push("raw-plural");
  }

  if (entryKind === "bound-form" || entryKind === "needs-cleanup") {
    reviewReasons.push("entry-needs-cleanup");
  }

  if (tts === "needs-cleanup") {
    reviewReasons.push("tts-needs-cleanup");
  }

  if (
    partOfSpeechSource === "rule-inferred" &&
    partOfSpeechConfidence === "low"
  ) {
    reviewReasons.push("part-of-speech-inferred");
  }

  return {
    translation,
    article,
    plural,
    tts,
    entryKind,
    partOfSpeechSource,
    partOfSpeechConfidence,
    reviewReasons,
  };
}

function inferTranslationQuality(
  vocab: Pick<Vocab, "koreanGloss" | "translationStatus">,
): VocabQuality["translation"] {
  if (
    vocab.translationStatus === "needs-review" ||
    vocab.koreanGloss === "번역 필요" ||
    vocab.koreanGloss.includes("(초벌 번역)")
  ) {
    return "needs-review";
  }

  if (vocab.translationStatus === "manual") {
    return "manual";
  }

  if (vocab.translationStatus === "reviewed") {
    return "reviewed";
  }

  return "llm-draft";
}

function inferArticleQuality(
  vocab: Pick<Vocab, "article" | "partOfSpeech">,
): VocabQuality["article"] {
  if (vocab.article) {
    return "present";
  }

  if (vocab.partOfSpeech === "noun") {
    return "missing";
  }

  return "not-applicable";
}

function inferPluralQuality(
  vocab: Pick<Vocab, "partOfSpeech" | "plural">,
): VocabQuality["plural"] {
  if (vocab.partOfSpeech !== "noun") {
    return "not-applicable";
  }

  if (!vocab.plural) {
    return "not-applicable";
  }

  if (/[-/,¨]/u.test(vocab.plural)) {
    return "raw";
  }

  return "verified";
}

function inferEntryKind(
  vocab: Pick<Vocab, "display" | "lemma" | "partOfSpeech">,
): VocabQuality["entryKind"] {
  const display = vocab.display.trim();
  const lemma = vocab.lemma.trim();
  const combined = `${display} ${lemma}`;
  const displayHead = display.split(",")[0]?.trim() ?? display;

  if (hasUnbalancedParentheses(combined)) {
    return "needs-cleanup";
  }

  if (displayHead.endsWith("-") || lemma.endsWith("-")) {
    return "bound-form";
  }

  if (/\((Sg|Pl)\)/u.test(combined)) {
    return "grammar-note";
  }

  if (/[()/]/u.test(combined)) {
    return "variant";
  }

  if (vocab.partOfSpeech === "phrase") {
    return "phrase";
  }

  return "word";
}

function inferTtsQuality(
  vocab: Pick<Vocab, "lemma" | "pronunciation">,
  entryKind: VocabQuality["entryKind"],
): VocabQuality["tts"] {
  const ttsText = vocab.pronunciation?.ttsText ?? vocab.lemma;

  if (
    entryKind === "bound-form" ||
    entryKind === "variant" ||
    entryKind === "grammar-note" ||
    entryKind === "needs-cleanup" ||
    ttsText.endsWith("-") ||
    /[()/]/u.test(ttsText)
  ) {
    return "needs-cleanup";
  }

  return "ready";
}

function inferPartOfSpeechConfidence(
  vocab: Pick<Vocab, "article" | "partOfSpeech">,
  source: VocabQuality["partOfSpeechSource"],
): VocabQuality["partOfSpeechConfidence"] {
  if (source === "manual") {
    return "high";
  }

  if (vocab.partOfSpeech === "noun" && vocab.article) {
    return "high";
  }

  if (vocab.partOfSpeech === "noun" || vocab.partOfSpeech === "other") {
    return "low";
  }

  return "medium";
}

function isTranslationReadyForQuiz(quality: VocabQuality) {
  return (
    quality.translation !== "needs-review" &&
    quality.translation !== "rule-inferred"
  );
}

function isEntryUsableForQuiz(quality: VocabQuality) {
  return (
    quality.entryKind !== "bound-form" &&
    quality.entryKind !== "needs-cleanup"
  );
}

function hasUnbalancedParentheses(value: string) {
  const open = [...value.matchAll(/\(/gu)].length;
  const close = [...value.matchAll(/\)/gu)].length;

  return open !== close;
}
