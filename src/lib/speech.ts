import type { AppSettings, Vocab } from "../types";

type SpeechOptions = Pick<AppSettings["tts"], "enabled" | "lang" | "rate">;
type PlaybackOptions = {
  rateMultiplier?: number;
};
type GermanVoicePreference = "female" | "male";

const SPEECH_RATE_STEP_DOWN = 0.05;
const MIN_SPEECH_RATE = 0.1;
const MAX_SPEECH_RATE = 2;
const GERMAN_FEMALE_VOICE_MATCHERS = [
  /\bfemale\b/,
  /\bfrau\b/,
  /\bwoman\b/,
  /\bamala\b/,
  /\banna\b/,
  /\bflo\b/,
  /\bgrandma\b/,
  /\bhelena\b/,
  /\bhedda\b/,
  /\bkatja\b/,
  /\blouisa\b/,
  /\bmaja\b/,
  /\bmarlene\b/,
  /\bpetra\b/,
  /\bsandy\b/,
  /\bshelley\b/,
  /\btanja\b/,
  /\byvonne\b/,
];
const GERMAN_MALE_VOICE_MATCHERS = [
  /\bmale\b/,
  /\bmann\b/,
  /\bman\b/,
  /\bbernd\b/,
  /\bconrad\b/,
  /\bdaniel\b/,
  /\beddy\b/,
  /\bfelix\b/,
  /\bflorian\b/,
  /\bgrandpa\b/,
  /\bhans\b/,
  /\bkillian\b/,
  /\bklaus\b/,
  /\bmarkus\b/,
  /\bmartin\b/,
  /\bralf\b/,
  /\breed\b/,
  /\bstefan\b/,
  /\bthomas\b/,
  /\byannick\b/,
];

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
  const preference = getGermanVoicePreference(vocab);
  const fallbackVoices = germanVoices.filter(
    (voice) => !doesVoiceMatchGender(voice, getOppositePreference(preference)),
  );

  return (
    findVoiceByGender(germanVoices, preference) ??
    fallbackVoices.find((voice) => voice.default) ??
    fallbackVoices[0] ??
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
  return voices.find((voice) => doesVoiceMatchGender(voice, preference));
}

function doesVoiceMatchGender(
  voice: SpeechSynthesisVoice,
  preference: GermanVoicePreference,
) {
  const name = voice.name.toLocaleLowerCase("de-DE");
  const matchers =
    preference === "female"
      ? GERMAN_FEMALE_VOICE_MATCHERS
      : GERMAN_MALE_VOICE_MATCHERS;

  return matchers.some((matcher) => matcher.test(name));
}

function getOppositePreference(preference: GermanVoicePreference) {
  return preference === "female" ? "male" : "female";
}
