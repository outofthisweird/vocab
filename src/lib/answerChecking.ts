import type { AppSettings, TestResult, Vocab } from "../types";

export type AnswerType = TestResult["answerType"];

export type AnswerCheckOptions = AppSettings["test"];

export type AnswerCheckResult = {
  isCorrect: boolean;
  expectedAnswer: string;
  acceptedAnswers: string[];
  normalizedUserAnswer: string;
};

const PUNCTUATION_PATTERN =
  /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~，。！？、؛؛؛؛]/g;

const KOREAN_ANSWER_SPLIT_PATTERN = /[,/;|·]| 또는 | 혹은 |, |，/g;

export function normalizeGermanAnswer(
  value: string,
  options: Pick<AnswerCheckOptions, "strictCase" | "strictUmlaut">,
) {
  let normalized = normalizeBaseText(value);

  if (!options.strictCase) {
    normalized = normalized.toLocaleLowerCase("de-DE");
  }

  if (!options.strictUmlaut) {
    normalized = foldGermanDiacritics(normalized);
  }

  return normalized;
}

export function normalizeMeaningAnswer(value: string) {
  return normalizeBaseText(value).toLocaleLowerCase("ko-KR");
}

export function checkAnswer(
  vocab: Vocab,
  answerType: AnswerType,
  userAnswer: string,
  options: AnswerCheckOptions,
): AnswerCheckResult {
  const acceptedAnswers = getAcceptedAnswers(vocab, answerType, options);
  const normalizer =
    answerType === "meaning"
      ? normalizeMeaningAnswer
      : (value: string) => normalizeGermanAnswer(value, options);
  const normalizedUserAnswer = normalizer(userAnswer);
  const normalizedAcceptedAnswers = acceptedAnswers.map(normalizer);
  const isCorrect = normalizedAcceptedAnswers.some(
    (answer) => answer.length > 0 && answer === normalizedUserAnswer,
  );

  return {
    isCorrect,
    expectedAnswer: acceptedAnswers[0] ?? "",
    acceptedAnswers,
    normalizedUserAnswer,
  };
}

export function getAcceptedAnswers(
  vocab: Vocab,
  answerType: AnswerType,
  options: AnswerCheckOptions,
) {
  if (answerType === "article") {
    return vocab.article ? [vocab.article] : [];
  }

  if (answerType === "meaning") {
    return uniqueAnswers([
      ...splitMeaningAnswers(vocab.koreanGloss),
      ...(vocab.koreanGlossAlt ?? []).flatMap(splitMeaningAnswers),
    ]);
  }

  if (answerType === "spelling" || answerType === "listening") {
    return getGermanSpellingAnswers(vocab, options);
  }

  return [vocab.koreanGloss];
}

function getGermanSpellingAnswers(vocab: Vocab, options: AnswerCheckOptions) {
  const answers = [vocab.lemma];

  if (vocab.article) {
    answers.unshift(`${vocab.article} ${vocab.lemma}`);

    if (!options.allowArticleOmission) {
      return uniqueAnswers(answers.slice(0, 1));
    }
  }

  return uniqueAnswers(answers);
}

function splitMeaningAnswers(value: string) {
  return value
    .split(KOREAN_ANSWER_SPLIT_PATTERN)
    .map((answer) => answer.trim())
    .filter(Boolean);
}

function uniqueAnswers(answers: string[]) {
  return Array.from(new Set(answers.map((answer) => answer.trim()))).filter(
    Boolean,
  );
}

function normalizeBaseText(value: string) {
  return value
    .normalize("NFKC")
    .replace(PUNCTUATION_PATTERN, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function foldGermanDiacritics(value: string) {
  return value
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/Ä/g, "Ae")
    .replace(/Ö/g, "Oe")
    .replace(/Ü/g, "Ue")
    .replace(/ß/g, "ss");
}
