import type { AppSettings, Vocab } from "../types";

type SpeechOptions = Pick<AppSettings["tts"], "enabled" | "lang" | "rate">;
type PlaybackOptions = {
  rateMultiplier?: number;
};

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
