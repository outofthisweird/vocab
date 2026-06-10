# GerGer Development Log

Last updated: 2026-06-11 02:56 KST

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
     - Generated Goethe A1/A2 headword entries use `koreanGloss: "번역 필요"` and `translationStatus: "needs-review"` until translated/reviewed.
   - Default app settings are seeded and loaded through `seedAppData()`, `seedDefaultSettings()`, and `getAppSettings()`.

2. Vocabulary list and search
   - `src/pages/VocabularyPage.tsx` lists stored vocabulary from IndexedDB.
   - Search works across German display text, lemma, Korean glosses, examples, and tags.
   - Level filter supports `All`, `A1+A2`, `A1`, `A2`, `B1`, `B2`, `C1`, and `C2`.
   - Part-of-speech filter supports noun, verb, adjective, adverb, phrase, and other.
   - Rows show when a generated entry still needs translation.
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
- Korean translation/review pass for generated A1/A2 entries
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
- `tests/answerChecking.test.ts`
- `tests/speech.test.ts`

Recent documentation update:
- Added a project instruction that every development session should end by committing meaningful completed changes and pushing the current branch to GitHub.
- Updated project scope so B1+ vocabulary is allowed after the A-series data is completed.

## Verification Performed

Commands that passed:

```sh
node --experimental-strip-types --test tests/*.test.ts
node_modules/.bin/tsc -b
node_modules/.bin/vite build
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
   - Fill Korean glosses for generated `needs-review` A1/A2 entries.
   - Review extracted display forms and part-of-speech guesses where they look rough.
   - Keep generated entries out of meaning/spelling tests until their translations are reviewed.

4. Dataset expansion
   - Add B1+ vocabulary only after the A-series translation/review pass is usable.

5. UI polish
   - Improve spacing, empty states, and mobile ergonomics after the learning loop and import/export are stable.

## Known Caveats

- `docs/PROJECT_SPEC.md` was referenced in `AGENTS.md`, but it was not present in the workspace during this session.
- A `.docx` planning document exists at the project root.
- Most generated A-series entries currently have placeholder Korean glosses and `needs-review` status.
- Generated A-series entries use extracted headwords/display forms only; official PDF examples were not copied into the seed.
- Browser verification answers were submitted during testing, so the local browser profile may show increased counts for a few sample words.
