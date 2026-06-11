import type { AppSettings, Vocab } from "../types";

type SpeechOptions = Pick<AppSettings["tts"], "enabled" | "lang" | "rate">;
type PlaybackOptions = {
  rateMultiplier?: number;
};
type GermanVoicePreference = "female" | "male";

const SPEECH_RATE_STEP_DOWN = 0.05;
const MIN_SPEECH_RATE = 0.1;
const MAX_SPEECH_RATE = 2;

export const SLOW_PLAYBACK_RATE_MULTIPLIER = 0.5;

export function speakGerman(
  vocab: Vocab,
  options: SpeechOptions,
  playbackOptions: PlaybackOptions = {},
) {
  if (!options.enabled || !("speechSynthesis" in window)) {
    return false;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(
    vocab.pronunciation?.ttsText ?? vocab.lemma,
  );
  utterance.lang = options.lang;
  utterance.rate = resolveGermanSpeechRate(
    vocab,
    options,
    playbackOptions.rateMultiplier ?? 1,
  );
  const voice = resolveGermanVoice(vocab, window.speechSynthesis.getVoices());

  if (voice) {
    utterance.voice = voice;
  }

  window.speechSynthesis.speak(utterance);

  return true;
}

export function resolveGermanSpeechRate(
  vocab: Vocab,
  options: SpeechOptions,
  rateMultiplier: number,
) {
  const baseRate =
    (vocab.pronunciation?.slowRate ?? options.rate) - SPEECH_RATE_STEP_DOWN;

  return clampSpeechRate(baseRate * rateMultiplier);
}

function clampSpeechRate(rate: number) {
  return Math.min(Math.max(rate, MIN_SPEECH_RATE), MAX_SPEECH_RATE);
}

export function resolveGermanVoice(
  vocab: Vocab,
  voices: SpeechSynthesisVoice[],
) {
  const germanVoices = voices.filter((voice) =>
    voice.lang.toLocaleLowerCase("en-US").startsWith("de"),
  );

  return (
    findVoiceByGender(germanVoices, getGermanVoicePreference(vocab)) ??
    germanVoices.find((voice) => voice.default) ??
    germanVoices[0]
  );
}

function getGermanVoicePreference(vocab: Vocab): GermanVoicePreference {
  return vocab.partOfSpeech === "noun" && vocab.article === "die"
    ? "female"
    : "male";
}

function findVoiceByGender(
  voices: SpeechSynthesisVoice[],
  preference: GermanVoicePreference,
) {
  const nameMatchers =
    preference === "female"
      ? [
          /\bfemale\b/,
          /\bfrau\b/,
          /\bwoman\b/,
          /\banna\b/,
          /\bkatja\b/,
          /\bmarlene\b/,
          /\bpetra\b/,
          /\byvonne\b/,
          /\bhelena\b/,
          /\bsandy\b/,
        ]
      : [
          /\bmale\b/,
          /\bmann\b/,
          /\bman\b/,
          /\bmarkus\b/,
          /\bklaus\b/,
          /\bhans\b/,
          /\bstefan\b/,
          /\bthomas\b/,
          /\bdaniel\b/,
          /\byannick\b/,
        ];

  return voices.find((voice) => {
    const name = voice.name.toLocaleLowerCase("de-DE");

    return nameMatchers.some((matcher) => matcher.test(name));
  });
}
