# GerGer Development Log

Last updated: 2026-06-11 13:24 KST

## Project Summary

GerGer is a local-first German vocabulary learning web app for Goethe vocabulary lists.
The current data priority is to complete A-series vocabulary first, then add B1+ vocabulary in level order.

Current stack:
- Vite
- React
- TypeScript
- IndexedDB
- Dexie.js
- No backend, accounts, cloud sync, cloud TTS, or AI tutor

## Current Implementation Status

Completed from the project phase order:

1. Local data storage
   - Dexie database is defined in `src/db/appDb.ts`.
   - Tables exist for `vocabs`, `studyStates`, `testSessions`, `settings`, `datasetMeta`, and `importLogs`.
   - A-series vocabulary is seeded from `src/data/aSeriesVocabulary.ts`.
   - The seed currently contains 1,852 A1/A2 entries:
     - The original 20 curated sample entries keep their Korean glosses and examples.
     - Generated Goethe A1/A2 headword entries now use draft Korean glosses and `translationStatus: "llm-draft"`.
   - A-series entries now include `quality` metadata for translation, article, plural, TTS, entry kind, and inferred part-of-speech confidence.
   - Default app settings are seeded and loaded through `seedAppData()`, `seedDefaultSettings()`, and `getAppSettings()`.

2. Vocabulary list and search
   - `src/pages/VocabularyPage.tsx` lists stored vocabulary from IndexedDB.
   - Search works across German display text, lemma, Korean glosses, examples, and tags.
   - Level filter supports `All`, `A1+A2`, `A1`, `A2`, `B1`, `B2`, `C1`, and `C2`.
   - Part-of-speech filter supports noun, verb, adjective, adverb, phrase, and other.
   - Rows show quality badges for translation needed, rule-inferred glosses, missing articles, raw plural notation, TTS cleanup, and extracted bound forms.
   - Each row shows level, part of speech, study count, and Leitner-style box.

3. German pronunciation with Web Speech API
   - `src/lib/speech.ts` wraps browser `speechSynthesis`.
   - Vocabulary rows include a pronunciation button.
   - Test listening mode can play the German prompt.
   - Default playback is slightly slower than before, and 0.5x playback is available from the adjusted base speed.
   - Vocabulary rows and listening tests both expose 0.5x playback controls.
   - TTS uses local browser speech synthesis only.

4. Test modes
   - `src/pages/TestPage.tsx` adds a usable practice page.
   - Supported modes:
     - German to Korean meaning
     - Korean to German spelling
     - Listening spelling
     - Article
     - Mixed
     - Learn new
     - Review wrong
   - After checking an answer, pressing Enter advances to the next question or summary.
   - Test sessions are persisted in `testSessions`.
   - Quiz pools now exclude unsafe items by quality:
     - Article mode requires a present article.
     - Listening mode requires `quality.tts === "ready"`.
     - Meaning/spelling modes exclude fallback or suffix-inferred glosses and extracted cleanup fragments.

5. Answer checking
   - `src/lib/answerChecking.ts` implements normalization and answer checks.
   - Korean meaning answers accept split glosses such as `거리, 도로`.
   - German answers support relaxed case and umlaut transliteration when settings allow it.
   - Article omission can be allowed or disallowed through settings.

6. StudyState updates
   - Submitting an answer updates `StudyState` in IndexedDB.
   - Counts are tracked for seen, correct, wrong, article, spelling, and listening results.
   - Vocabulary page reflects persisted study state after refresh.

7. Review scheduling
   - `src/lib/reviewScheduling.ts` updates `box`, `difficulty`, `lastStudiedAt`, and `nextReviewAt`.
   - Wrong answers reset the box to 0.
   - Correct answers advance the box up to 6.
   - Review mode prioritizes wrong and due words.

Not completed yet:
- Import/export
- Human review pass for generated A1/A2 draft Korean glosses
- Committed Goethe PDF import pipeline
- B1+ dataset expansion after A-series translation/review
- UI polish beyond functional layout
- Settings screen for changing TTS/test preferences

## Files Added Or Changed

Added:
- `src/data/aSeriesVocabulary.ts`
- `src/pages/TestPage.tsx`
- `src/lib/answerChecking.ts`
- `src/lib/reviewScheduling.ts`
- `src/lib/speech.ts`
- `src/lib/vocabQuality.ts`
- `tests/aSeriesVocabulary.test.ts`
- `tests/answerChecking.test.ts`
- `tests/reviewScheduling.test.ts`
- `tests/speech.test.ts`

Changed:
- `AGENTS.md`
- `src/types.ts`
- `src/db/appDb.ts`
- `src/pages/VocabularyPage.tsx`
- `src/pages/TestPage.tsx`
- `src/routes/AppRoutes.tsx`
- `src/App.tsx`
- `src/App.css`
- `package.json`
- `tsconfig.app.json`
- `src/data/aSeriesVocabulary.ts`
- `tests/aSeriesVocabulary.test.ts`
- `tests/answerChecking.test.ts`
- `tests/speech.test.ts`

Recent documentation update:
- Added a project instruction that every development session should end by committing meaningful completed changes and pushing the current branch to GitHub.
- Updated project scope so B1+ vocabulary is allowed after the A-series data is completed.

Recent dataset update:
- Added draft Korean gloss generation for generated A1/A2 Goethe entries in `src/data/aSeriesVocabulary.ts`.
- Replaced generated `needs-review` / `needs-translation` placeholders with `llm-draft` / `draft-translation`.
- Added a regression test that fails if A-series seed data ships `translation needed` placeholders again.
- Data check result after the update: 1,852 total entries, 0 `translation needed` placeholders, 0 fallback draft placeholders.

Recent quality metadata update:
- Read `/Users/juna/Downloads/a_series_vocabulary_data_structure_report.md`.
- Added MVP-safe `quality` metadata to `Vocab` instead of doing a full Lexeme/LevelEntry migration.
- Added `src/lib/vocabQuality.ts` to classify missing noun articles, raw plural markers, unsafe TTS text, bound forms, variants, suffix-inferred glosses, and part-of-speech confidence.
- Preserved raw plural notation for inferred nouns even when the article is missing.
- Bumped the A-series dataset version to `1.1.1` and changed seeding to `bulkPut` A-series master vocab records so existing IndexedDB installs receive the new quality metadata without resetting `StudyState`.
- Vocabulary rows now surface quality badges, and unsafe TTS buttons are disabled.
- Test selection now uses quality gates so unsafe listening items and suffix-inferred/fallback glosses are excluded from the relevant quiz pools.
- Quality data check result: `{"total":1852,"qualityMissing":0,"articleMissing":139,"rawPlural":638,"ttsCleanup":102,"boundForm":46,"ruleInferred":17,"translationNeedsReview":0}`.

## Verification Performed

Commands that passed:

```sh
node --experimental-strip-types --test tests/*.test.ts
node_modules/.bin/tsc -b
node_modules/.bin/vite build
```

Latest verification result:

```text
16 tests passed
TypeScript build passed
Vite production build passed
```

Additional data check that passed:

```sh
node --experimental-strip-types -e 'import { aSeriesVocabulary } from "./src/data/aSeriesVocabulary.ts"; const needs=aSeriesVocabulary.filter(v=>v.translationStatus==="needs-review"||v.koreanGloss==="번역 필요"||v.tags?.includes("needs-translation")); const fallbacks=aSeriesVocabulary.filter(v=>v.koreanGloss.endsWith("(초벌 번역)")); console.log(JSON.stringify({total:aSeriesVocabulary.length, translationNeeded:needs.length, draftFallbacks:fallbacks.length}));'
```

Result:

```json
{"total":1852,"translationNeeded":0,"draftFallbacks":0}
```

Browser verification performed at:

```text
http://127.0.0.1:5175/
```

Confirmed in the browser:
- Vocabulary list loads 1,852 A-series words from IndexedDB.
- Vocabulary rows show normal and 0.5x pronunciation controls.
- B1/B2/C1/C2 filter options are visible for future expansion.
- Generated entries marked `needs-review` show `translation needed`.
- The 1,852-word count persists after refresh.
- Browser console had no warnings or errors during the final check.

Browser verification caveat for the 2026-06-11 03:08 KST dataset update:
- Attempted to start `node_modules/.bin/vite --host 127.0.0.1`.
- Sandbox blocked local binding with `listen EPERM`.
- Escalated dev-server approval could not run because the session hit the approval/usage limit.
- Browser refresh/persistence verification was therefore not repeated for this dataset-only change; production build and direct seed-data checks passed.

Browser verification for the 2026-06-11 13:24 KST quality update:
- Started `node_modules/.bin/vite --host 127.0.0.1` with elevated approval after sandbox blocked local binding.
- Opened `http://127.0.0.1:5173/`.
- Confirmed the vocabulary page loads 1,852 / 1,852 words.
- Confirmed quality badges appear for `article missing`, `raw plural`, `rule-inferred gloss`, `tts cleanup`, and `bound-form`.
- Confirmed unsafe TTS buttons are disabled for cleanup items.
- Refreshed the page and confirmed the 1,852-word count and quality badges persisted after refresh.
- Saved a verification screenshot at `/private/tmp/gerger-vocab-quality.png`.

## Environment Notes

- The Codex shell had `node` available at `/Applications/Codex.app/Contents/Resources/node`.
- `npm`, `npx`, `pnpm`, and `yarn` were not available in PATH during the session.
- Use local binaries directly when needed, for example:

```sh
node_modules/.bin/tsc -b
node_modules/.bin/vite build
node_modules/.bin/vite --host 127.0.0.1
```

- Starting the Vite dev server required elevated approval because the sandbox blocked binding to `127.0.0.1`.

## Current Dev Server

No dev server is intentionally left running.
The final browser verification used:

```text
http://127.0.0.1:5175/
```

If a future session starts fresh, check whether a server is already running before starting another one.

## Recommended Next Work

Continue from the next uncompleted project phase:

1. Import/export
   - Add JSON export for `vocabs`, `studyStates`, `testSessions`, `settings`, `datasetMeta`, and `importLogs`.
   - Add JSON import with validation, counters for added/updated/skipped records, and `importLogs` entries.
   - Add simple unit tests for import validation and merge behavior where practical.

2. Settings screen
   - Let the user change default level, daily counts, TTS rate, repeat count, strict umlaut/case, and article omission.
   - Persist changes to the `settings` table.

3. A-series translation/review
   - Human-review generated `llm-draft` Korean glosses for A1/A2 entries.
   - Use `quality.reviewReasons` to prioritize missing articles, raw plural markers, TTS cleanup items, and extracted fragments.
   - Review extracted display forms and part-of-speech guesses where they look rough.
   - Decide whether `llm-draft` entries should stay eligible for meaning/spelling tests or require a stricter reviewed-only filter.

4. Dataset expansion
   - Add B1+ vocabulary only after the A-series translation/review pass is usable.

5. UI polish
   - Improve spacing, empty states, and mobile ergonomics after the learning loop and import/export are stable.

## Known Caveats

- `docs/PROJECT_SPEC.md` was referenced in `AGENTS.md`, but it was not present in the workspace during this session.
- A `.docx` planning document exists at the project root.
- Generated A-series entries now have draft Korean glosses and `llm-draft` status, but they still need human review for nuance and exam-fit.
- Quality metadata identifies unsafe or rough entries, but it is still rule-based and should be treated as triage rather than final lexicographic truth.
- Generated A-series entries use extracted headwords/display forms only; official PDF examples were not copied into the seed.
- Browser verification answers were submitted during testing, so the local browser profile may show increased counts for a few sample words.
